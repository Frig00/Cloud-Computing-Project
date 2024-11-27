import { FastifyInstance } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { UploadService } from '../services/uploadService';


const UploadUrlResponseSchema = Type.Object({
  url: Type.String(),
  videoId: Type.String()
});

const TranscodeVideoRequestSchema = Type.Object({
  videoID: Type.String(),
});

const SSEDemoResponseSchema = Type.Object({
  message: Type.String(),
  timestamp: Type.Optional(Type.Number()),
});

type UploadUrlResponse = Static<typeof UploadUrlResponseSchema>;
type TranscodeVideoRequest = Static<typeof TranscodeVideoRequestSchema>;
type SSEDemoResponse = Static<typeof SSEDemoResponseSchema>;

export default async function uploadRoutes(app: FastifyInstance) {

  app.get<{Reply: UploadUrlResponse}>("/upload-url", 
    {
      schema: {
        description: 'Get a pre-signed URL for video uploads',
        tags: ['Upload'],
        summary: 'Get pre-signed URL',
        response: {
          200: UploadUrlResponseSchema,
        },
      }
    },
    async (request, reply) => {
       const uploadInfo = await UploadService.getPresignedUrl();
       return uploadInfo;
  });

  app.post<{Body: TranscodeVideoRequest}>("/transcode-video",
    {
      schema: {
        description: 'Transcode a video',
        tags: ['Upload'],
        summary: 'Transcode video',
        body: TranscodeVideoRequestSchema,
      }
    },
    async (request, reply) => {
      const videoID = request.body.videoID;
      const result = await UploadService.transcodeVideo(videoID);
    }
  );

  app.get<{ Params: TranscodeVideoRequest }>("/sse/:videoID",
    {
      schema: {
        description: 'Get transcoding percentage',
        tags: ['Upload'],
        summary: 'Get transcoding percentage',
        params: TranscodeVideoRequestSchema,
      }
    },
    async (request, reply) => {
    // Set the headers to keep the connection open and indicate SSE
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const { videoID } = request.params;
    console.log(`Starting SSE for videoID: ${videoID}`);

    UploadService.consumeMessages(videoID, (message) => {
      const messageString = `data: ${JSON.stringify(message)}\n\n`;

      // Log message to terminal and stream to SSE client
      console.log("Message sent to SSE client:", message);
      reply.raw.write(messageString);
    });

    // Handle client disconnection
    request.raw.on("close", () => {
      console.log(`SSE connection closed for videoID: ${videoID}`);
      reply.raw.end();
    });
  });
}