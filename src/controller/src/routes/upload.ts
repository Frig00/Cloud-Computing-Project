import { FastifyInstance, FastifyRequest } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { UploadService } from '../services/uploadService';
import websocket from '@fastify/websocket'

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

const UploadUrlResponseSchema = Type.Object({
  url: Type.String(),
  videoId: Type.String()
});

const TranscodeVideoRequestSchema = Type.Object({
  videoID: Type.String(),
});

const TranscodeVideoResponseSchema = Type.Object({
  success: Type.String(),
})

type UploadUrlResponse = Static<typeof UploadUrlResponseSchema>;
type TranscodeVideoRequest = Static<typeof TranscodeVideoRequestSchema>;
type ErrorResponse = Static<typeof ErrorResponseSchema>;
type TranscodeVideoResponse = Static<typeof TranscodeVideoResponseSchema>;

export default async function uploadRoutes(app: FastifyInstance) {

  app.get<{ Reply: UploadUrlResponse }>("/upload-url",
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
      return await UploadService.getPresignedUrl();
    });

  app.post<{ Body: TranscodeVideoRequest; Reply: TranscodeVideoResponse | ErrorResponse }>(
    "/transcode-video",
    {
      schema: {
        description: 'Transcode a video',
        tags: ['Upload'],
        summary: 'Transcode video',
        body: TranscodeVideoRequestSchema,
        response: {
          200: TranscodeVideoResponseSchema,
          400: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const videoID = request.body.videoID;

      try {
        await UploadService.transcodeVideo(videoID);
        reply.send({ success: 'Transcoding started' });
      } catch (err) {
        reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
      }

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
      const { videoID } = request.params;
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      reply.raw.flushHeaders();
  
      console.log(`Starting SSE for videoID: ${videoID}`);
  
      await UploadService.consumeMessages(videoID, (message) => {
        const messageString = `data: ${JSON.stringify(message)}\n\n`;
  
        // Log message to terminal and stream to SSE client
        console.log("Message sent to SSE client:", message);
        // await new Promise(() => reply.raw.write(messageString));
        reply.raw.write(messageString);
        
      });
  
      // Handle client disconnection
      request.raw.on("close", () => {
        console.log(`SSE connection closed for videoID: ${videoID}`);
        reply.raw.end();
      });

      reply.raw.end();
    });
  

  app.get<{ Params: TranscodeVideoRequest }>("/ws/:videoID",
    {
      websocket: true,
      schema: {
        description: 'Get transcoding percentage',
        tags: ['Upload'],
        summary: 'Get transcoding percentage',
        params: TranscodeVideoRequestSchema,
      }
    },
    async (connection, request) => {
      const { videoID } = request.params;


      console.log(`Starting SSE for videoID: ${videoID}`);

      connection.on('close', () => {
        console.log(`WebSocket connection closed for videoID: ${videoID}`);
      });

      await UploadService.consumeMessages(videoID, async (message) => {
      
        try {
          console.log(`Sending message to client: ${JSON.stringify(message)}`);
          connection.send(JSON.stringify(message));
          
        }
        catch (err) {
          console.error(`Error sending message to client: ${err}`);
        }
      });
      
   
      await new Promise((resolve) => setTimeout(resolve, 1000));
     
      connection.close();
    });


}