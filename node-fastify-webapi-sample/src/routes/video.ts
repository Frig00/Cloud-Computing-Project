import { FastifyInstance } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { UploadService } from '../services/uploadService';


const UploadUrlResponseSchema = Type.Object({
  url: Type.String(),
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

  app.get("/sse",
    {
      schema: {
        description: 'Get transcoding percentage',
        tags: ['Video'],
        summary: 'Get transcoding percentage',
      }
    },
    async (request, reply) => {
    // Set the headers to keep the connection open and indicate SSE
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    // Function to send data to the client
    const sendSSE = (data: SSEDemoResponse) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send an initial message
    sendSSE({ message: "Connected to SSE!" });

    let messageCount = 0; // Initialize message counter
    const maxMessages = 3; // Close connection after 3 messages

    // Send messages at intervals
    const interval = setInterval(() => {
      messageCount += 1;
      sendSSE({
        message: `Message ${messageCount} from the server!`,
        timestamp: Date.now(),
      });

      // Check if we've sent the maximum number of messages
      if (messageCount >= maxMessages) {
        clearInterval(interval);
        reply.raw.end();
      }
    }, 2000);

    // Cleanup when the client disconnects
    request.raw.on("close", () => {
      clearInterval(interval);
      reply.raw.end();
    });

    return reply;
  });
}