import { FastifyInstance } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { UploadService } from '../services/uploadService';


const UploadUrlResponseSchema = Type.Object({
  url: Type.String(),
});

type UploadUrlResponse = Static<typeof UploadUrlResponseSchema>;

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
}