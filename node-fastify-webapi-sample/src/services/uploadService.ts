import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { spawn } from "child_process";
import * as amqp from "amqplib";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config();

// Enum for video quality
enum VideoQuality {
  LOW = "360p",
  SD = "480p",
  HD = "720p",
  FULL_HD = "1080p",
  QHD = "1440p", // 2K
  UHD = "2160p", // 4K
}

// MinIO Configuration
const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:9000", // MinIO endpoint
  forcePathStyle: true, // Needed for MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

// UploadService class
export class UploadService {
  // Generate a pre-signed URL for file uploads

  // gt5
  // gt5.original.mp4
  static async getPresignedUrl() {
    const bucketName = "video";
    const expiresIn = 3600; // 1 hour

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: this.randomString(16) + ".original.mp4",
      ContentType: "video/mp4",
    });

    // Generate the pre-signed URL
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  }


  // Get video resolution-based quality using ffprobe
  static async getVideoQuality(filePath: string): Promise<VideoQuality | "Unknown quality"> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn("ffprobe", [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        filePath,
      ]);

      let output = "";
      ffprobe.stdout.on("data", (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on("data", (data) => {
        console.error(`Error: ${data}`);
      });

      ffprobe.on("close", (code) => {
        if (code !== 0 || !output.trim()) {
          reject("Failed to get video quality.");
        }

        const [width, height] = output.trim().split(",").map(Number);
        if (height >= 2160) resolve(VideoQuality.UHD);
        else if (height >= 1440) resolve(VideoQuality.QHD);
        else if (height >= 1080) resolve(VideoQuality.FULL_HD);
        else if (height >= 720) resolve(VideoQuality.HD);
        else if (height >= 480) resolve(VideoQuality.SD);
        else if (height >= 360) resolve(VideoQuality.LOW);
        else resolve("Unknown quality");
      });
    });
  }

  // Publish video processing messages to RabbitMQ
  static async publishVideo(videoId: string, videoRes: VideoQuality | "Unknown quality") {
    try {
      const connection = await amqp.connect("amqp://localhost");
      const channel = await connection.createChannel();
      const queueName = "video.transcode";

      for (const quality of Object.values(VideoQuality)) {
        if (quality !== videoRes) {
          const message = { videoId, quality };
          await channel.assertQueue(queueName, { durable: false });
          channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
            contentType: "application/json",
          });
          console.log(`Published video ${videoId} to quality ${message.quality}.`);
        }
      }

      await channel.close();
      await connection.close();
    } catch (error) {
      console.error("Error publishing to RabbitMQ:", error);
    }
  }

  // Generate a random string
  static randomString(length: number): string {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
  }

  // Example workflow combining all methods
/*   static async processVideoWorkflow(filePath: string) {
    const bucketName = "video";
    const videoId = this.randomString(8);
    const objectName = `${videoId}.mp4`;

    await this.uploadFile(filePath, bucketName, objectName);
    const quality = await this.getVideoQuality(filePath);
    await this.publishVideo(videoId, quality);
    return { videoId, quality };
  } */
}
