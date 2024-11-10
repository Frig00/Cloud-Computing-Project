import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:9000", // MinIO endpoint
  forcePathStyle: true, // Needed with MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

export class UploadService {
  static async getPresignedUrl() {
    const bucketName = "video";
    const expiresIn = 3600;
    const key = "example.mp4";

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: "video/mp4",
    });

    // Generate the pre-signed URL
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  }
}
