import { FastifyInstance } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { VideoService } from '../services/videoService';


export const VideoRequestSchema = Type.Object({
    title: Type.String(),
    user: Type.String(),
    videoUrl: Type.String(),
  });

type VideoRequest = Static<typeof VideoRequestSchema>;

export default async function videoRoutes(app: FastifyInstance) {
  app.post<{Body: VideoRequest}>(
    '/',
    {
      schema: {
        description: 'Uploads a new video',
        tags: ['Video'],
        summary: 'Video upload',
        body: VideoRequestSchema,
        response: {
          200: VideoRequestSchema,
        },
      },
    },
    async (request, reply) => {
      await VideoService.uploadVideo(request.body.title, request.body.user, request.body.videoUrl);
    }
  );
}