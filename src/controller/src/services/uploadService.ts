import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as amqp from "amqplib";
import * as crypto from "crypto";
import prisma from "../data/prisma";
import { videos_status } from "@prisma/client";

// UploadService class
export class UploadService {
  /**
   * Initialize RabbitMQ for publishing and consuming.
   */
  static async initRabbitMQ(connectionAmqp: string) {
    const connection = await amqp.connect(connectionAmqp);
    return await connection.createChannel();
  }

  /**
   * Generate a pre-signed URL for video uploads.
   * @param userId - ID of the user uploading the video
   * @param videoTitle - Title of the video
   * @param description - Description of the video
   * @returns Object containing videoId and pre-signed URL
   */
  static async getPresignedUrl(userId: string, videoTitle: string, description: string) {
    const s3Client = new S3Client();
    
    
    
    /*const s3Client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT, // MinIO endpoint
      forcePathStyle: true, // Needed for MinIO
      credentials: process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY ? {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      }: undefined,
    });*/

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
   * @param length - Length of the random string
   * @returns Random string
   */
  static randomString(length: number): string {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
  }

  /**
   * Publish a video processing message to RabbitMQ.
   * @param videoId - ID of the video to be transcoded
   */
  static async transcodeVideo(videoId: string) {
    if (!this.isLocal()) { throw new Error("Transcoding is only supported in local environment"); }
    const channel = await this.initRabbitMQ(process.env.RABBITMQ_AMQP!);

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
      console.error("Error publishing video processing message to RabbitMQ:", error);
      throw new Error("Could not publish video processing message");
    }
  }

  /**
   * Consume messages from RabbitMQ and filter by videoId.
   * @param videoId - ID of the video to filter messages
   * @param callback - Callback function to handle the messages
   */

  static consumeMessages(videoId: string, callback: (message: unknown) => void) {

    if (!this.isLocal()) { throw new Error("Consuming messages is only supported in local environment"); }

    return new Promise(async (resolve) => {
      try {
        const channel = await this.initRabbitMQ(process.env.RABBITMQ_AMQP!);

        const alreadyTranscoded = await UploadService.isVideoTranscoded(videoId);
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

              if (content.status === "COMPLETED") {
                this.updateVideoStatus(videoId, "PUBLIC");
              }

              channel.ack(msg); // Acknowledge the message
              if (content.status === "COMPLETED" || content.status === "ERROR") {
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

  /**
   * Check if a video has already been transcoded.
   * @param videoID - ID of the video
   * @returns Boolean indicating if the video is transcoded
   */
  static async isVideoTranscoded(videoID: string): Promise<boolean> {
    const video = await prisma.videos.findUnique({
      where: { id: videoID, status: "PUBLIC" },
    });
    return !!video;
  }

  /**
   * Upload video metadata to the database.
   * @param videoID - ID of the video
   * @param title - Title of the video
   * @param user - ID of the user uploading the video
   * @param description - Description of the video
   * @param videoStatus - Status of the video
   */
  static async uploadVideo(videoID: string, title: string, user: string, description: string, videoStatus: videos_status) {
    await prisma.videos.create({
      data: {
        id: videoID,
        userId: user,
        title,
        description,
        uploadDate: new Date(),
        status: videoStatus,
      },
    });
  }

  static isLocal(): boolean {
    return process.env.IS_LOCAL === 'true';
  }


  /**
   * Update the status of a video in the database.
   * @param videoID - ID of the video
   * @param status - New status of the video
   */
  static async updateVideoStatus(videoID: string, status: videos_status) {
    try {
      await prisma.videos.update({
        where: { id: videoID },
        data: { status },
      });
    } catch {}
  }
}