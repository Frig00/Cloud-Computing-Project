import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as amqp from "amqplib";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
import { FastifyInstance } from "fastify";
import prisma from "../data/prisma";

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
  private static rabbitMQChannel: amqp.Channel;

  /**
   * Initialize RabbitMQ for publishing and consuming.
   */
  static async initRabbitMQ() {
    const connection = await amqp.connect(process.env.RABBITMQ_AMQP!);
    this.rabbitMQChannel = await connection.createChannel();
    console.log("RabbitMQ initialized.");
  }

  /**
   * Generate a pre-signed URL for video uploads.
   */
  static async getPresignedUrl() {
    try {
      const bucketName = process.env.S3_BUCKET_NAME!;
      const expiresIn = 3600; // 1 hour

      const videoId = this.randomString(16); // Generate unique videoId
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `${videoId}.original.mp4`,
        ContentType: "video/mp4",
      });

      // Generate the pre-signed URL
      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return { videoId, url };
    } catch (error) {
      console.error("Error generating pre-signed URL:", error);
      throw new Error("Could not generate pre-signed URL");
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
    if (!this.rabbitMQChannel) {
      await this.initRabbitMQ();
    }
    
    const alreadyTranscoded = await UploadService.isVideoTranscoded(videoId);
    if (alreadyTranscoded) throw new Error("Video already transcoded") 
      
      
      try {
      const queueName = process.env.TRANSCODE_QUEUE_NAME!;
      const message = { 
        videoId,
        bucket: "video",
        path: `${videoId}.original.mp4`,
       };
      await this.rabbitMQChannel.assertQueue(queueName, { durable: true });
      this.rabbitMQChannel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify(message)),
        { contentType: "application/json" }
      );
  
      console.log(`Published video processing message for videoId: ${videoId}`);
    } catch (error) {
      console.error("Error publishing video processing message to RabbitMQ:", error);
      throw new Error("Could not publish video processing message");
    }
  }
  

  /**
   * Consume messages from RabbitMQ and filter by videoId.
   */
  static async consumeMessages(videoId: string, callback: (message: any) => void) {
    try {

      if (!this.rabbitMQChannel) {
        await this.initRabbitMQ();
      }

      const alreadyTranscoded = await UploadService.isVideoTranscoded(videoId);
      if (alreadyTranscoded) {
        const completionMessage = {
          message: 'Video already transcoded',
          timestamp: Date.now(),
        };
        callback(completionMessage); // Trigger callback with completion message
        return;
      }

      const queueName = process.env.STATUS_QUEUE_NAME!;

      this.rabbitMQChannel.consume(
        queueName,
        (msg) => {
          if (msg) {
            const content = JSON.parse(msg.content.toString());

            // Filter messages by videoId
            if (content.videoId === videoId) {
              console.log(`Received message for videoId: ${videoId}`, content);
              callback(content); // Trigger callback with filtered message
            }

            this.rabbitMQChannel.ack(msg); // Acknowledge the message
          }
        },
        { noAck: false }
      );
    } catch (error) {
      console.error("Error consuming RabbitMQ messages:", error);
      throw new Error("Could not consume RabbitMQ messages");
    }
  }

  static async isVideoTranscoded(videoID: string): Promise<boolean> {
    const video = await prisma.videos.findUnique({
      where: { id: videoID },
    });
    return !!video; 
  }
}
