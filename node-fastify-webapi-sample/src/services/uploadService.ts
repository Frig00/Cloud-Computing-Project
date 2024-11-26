import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import * as fs from "fs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { spawn } from "child_process";
import * as amqp from "amqplib";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config();

// MinIO Configuration
const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT, // MinIO endpoint
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

    const videoId = this.randomString(16)
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: videoId + ".original.mp4",
      ContentType: "video/mp4",
    });

    // Generate the pre-signed URL
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return {videoId, url};
  }

  // Generate a random string
  static randomString(length: number): string {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
  }

  // Publish video processing messages to RabbitMQ
  static async transcodeVideo(videoId: string) {
    try {
      const connection = await amqp.connect("amqp://localhost");
      const channel = await connection.createChannel();
      const queueName = "video.transcode";
      const message = {videoId: videoId};

      await channel.assertQueue(queueName, { durable: true });
      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
        contentType: "application/json",
      });
      console.log(`Published video ${videoId}.`);

      await channel.close();
      await connection.close();
    } catch (error) {
      console.error("Error publishing to RabbitMQ:", error);
    }
  }
}
