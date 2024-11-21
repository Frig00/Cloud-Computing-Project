import { FastifyInstance } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { UploadService } from '../services/uploadService';


const UploadUrlResponseSchema = Type.Object({
  url: Type.String(),
});

const TranscodeVideoRequestSchema = Type.Object({
  videoID: Type.String(),
});

type UploadUrlResponse = Static<typeof UploadUrlResponseSchema>;
type TranscodeVideoRequest = Static<typeof TranscodeVideoRequestSchema>;

export default async function videoRoutes(app: FastifyInstance) {

  app.get<{Reply: UploadUrlResponse}>("/upload-url", 
    {
      schema: {
        description: 'Get a pre-signed URL for video uploads',
        tags: ['Video'],
        summary: 'Get pre-signed URL',
        response: {
          200: UploadUrlResponseSchema,
        },
      }
    },
    async (request, reply) => {
       const url = await UploadService.getPresignedUrl();
       return { url: url ?? "not valid" };
  });

  app.post<{Body: TranscodeVideoRequest}>("/transcode-video",
    {
      schema: {
        description: 'Transcode a video',
        tags: ['Video'],
        summary: 'Transcode video',
        body: TranscodeVideoRequestSchema,
      }
    },
    async (request, reply) => {
      const videoID = request.body.videoID;
      const result = await UploadService.transcodeVideo(videoID);
    }
  );
}