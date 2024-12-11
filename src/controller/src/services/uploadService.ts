import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as amqp from "amqplib";
import * as crypto from "crypto";
import prisma from "../data/prisma";

// UploadService class
export class UploadService {
  /**
   * Initialize RabbitMQ for publishing and consuming.
   */
  static async initRabbitMQ() {
    const connection = await amqp.connect(process.env.RABBITMQ_AMQP!);
    return await connection.createChannel();
  }

  /**
   * Generate a pre-signed URL for video uploads.
   */
  static async getPresignedUrl(userId: string, videoTitle: string, description: string) {
    const s3Client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT, // MinIO endpoint
      forcePathStyle: true, // Needed for MinIO
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });

    console.log("s3 client: ", s3Client);

    const bucketName = process.env.S3_BUCKET_NAME!;
    const expiresIn = 3600; // 1 hour
    try {
      const videoId = this.randomString(16); // Generate unique videoId
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `${videoId}/original.mp4`,
        ContentType: "video/mp4",
      });

      // Generate the pre-signed URL
      const url = await getSignedUrl(s3Client, command, { expiresIn });

      // Add video to database
      await this.uploadVideo(videoId, videoTitle, userId, description, "PROCESSING");

      return { videoId, url };
    } catch (error) {
      console.error("Error generating pre-signed URL:", error);
      throw new Error("Could not generate pre-signed URL " + bucketName);
    }

  }

  /**
   * Generate a random string of the specified length.
   */
  static randomString(length: number): string {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
  }

  /**
   * Publish a video processing message to RabbitMQ.
   */
  static async transcodeVideo(videoId: string) {
    const channel = await this.initRabbitMQ();

    const alreadyTranscoded = await UploadService.isVideoTranscoded(videoId);
    if (alreadyTranscoded) throw new Error("Video already transcoded");

    try {
      const queueName = process.env.TRANSCODE_QUEUE_NAME!;
      const message = {
        videoId,
        bucket: "video",
        path: `${videoId}/original.mp4`,
      };
      await channel.assertQueue(queueName, { durable: true });
      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
        contentType: "application/json",
      });
      channel.close();
      console.log(`Published video processing message for videoId: ${videoId}`);
    } catch (error) {
      console.error(
        "Error publishing video processing message to RabbitMQ:",
        error,
      );
      throw new Error("Could not publish video processing message");
    }
  }

  /**
   * Consume messages from RabbitMQ and filter by videoId.
   */

  static consumeMessages(
    videoId: string,
    callback: (message: unknown) => void,
  ) {
    return new Promise(async (resolve) => {
      try {
        const channel = await this.initRabbitMQ();

        const alreadyTranscoded =
          await UploadService.isVideoTranscoded(videoId);
        if (alreadyTranscoded) {
          const completionMessage = {
            message: "Video already transcoded",
            timestamp: Date.now(),
          };
          callback(completionMessage); // Trigger callback with completion message
          return;
        }

        const queueName = process.env.STATUS_QUEUE_NAME!;

        channel.consume(
          queueName,
          (msg) => {
            if (msg) {
              const content = JSON.parse(msg.content.toString());

              // Filter messages by videoId
              if (content.videoId === videoId) {
                callback(content); // Trigger callback with filtered message
              }

              if (content.status === "COMPLETED" ) {
                this.updateVideoStatus(videoId, "PUBLIC");
              }

              channel.ack(msg); // Acknowledge the message
              if (
                content.status === "COMPLETED" ||
                content.status === "ERROR"
              ) {
                channel.close();
                resolve("Done");
              }
            }
          },
          { noAck: false },
        );
      } catch (error) {
        console.error("Error consuming RabbitMQ messages:", error);
        throw new Error("Could not consume RabbitMQ messages");
      }
    });
  }

  static async isVideoTranscoded(videoID: string): Promise<boolean> {
    const video = await prisma.videos.findUnique({
      where: { id: videoID, status: "PUBLIC" },
    });
    return !!video;
  }

  static async uploadVideo(videoID: string, title: string, user: string, description: string, videoStatus: string) {
    await prisma.videos.create({
      data: {
        id: videoID,
        userId: user,
        title,
        description,
        uploadDate: new Date().getUTCSeconds(),
        status: videoStatus,
      },
    });
  }

  static async updateVideoStatus(videoID: string, status: string) {
    await prisma.videos.update({
      where: { id: videoID },
      data: { status },
    });
  }
}
