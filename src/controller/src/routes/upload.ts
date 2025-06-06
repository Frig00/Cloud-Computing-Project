import { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { UploadService } from "../services/uploadService";
import { JWTPayload } from "../plugins/auth";

// Schema for error responses
const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

// Schema for the response of the upload URL endpoint
const UploadUrlResponseSchema = Type.Object({
  url: Type.String(),
  videoId: Type.String(),
});

// Schema for the request body of the upload URL endpoint
const UploadUrlRequestSchema = Type.Object({
  title: Type.String(),
  description: Type.String(),
});

// Schema for the request body of the transcode video endpoint
const TranscodeVideoRequestSchema = Type.Object({
  videoID: Type.String(),
});

// Schema for the response of the transcode video endpoint
const TranscodeVideoResponseSchema = Type.Object({
  success: Type.String(),
});

// Type definitions for the schemas
type UploadUrlResponse = Static<typeof UploadUrlResponseSchema>;
type TranscodeVideoRequest = Static<typeof TranscodeVideoRequestSchema>;
type ErrorResponse = Static<typeof ErrorResponseSchema>;
type TranscodeVideoResponse = Static<typeof TranscodeVideoResponseSchema>;
type UploadUrlRequest = Static<typeof UploadUrlRequestSchema>;

export default async function uploadRoutes(app: FastifyInstance) {
  // Endpoint to get a pre-signed URL for video uploads
  app.post<{
    Body: UploadUrlRequest;
    Reply: UploadUrlResponse;
  }>(
    "/upload-url",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get a pre-signed URL for video uploads",
        tags: ["Upload"],
        summary: "Get pre-signed URL",
        body: UploadUrlRequestSchema,
        response: {
          200: UploadUrlResponseSchema,
          401: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const { title, description } = request.body;
      const jwt = await request.jwtVerify<JWTPayload>();
      const userId = jwt.id;

      return await UploadService.getPresignedUrl(userId, title, description);
    },
  );

  // Endpoint to transcode a video
  app.post<{
    Body: TranscodeVideoRequest;
    Reply: TranscodeVideoResponse | ErrorResponse;
  }>(
    "/transcode-video",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Transcode a video",
        tags: ["Upload"],
        summary: "Transcode video",
        body: TranscodeVideoRequestSchema,
        response: {
          200: TranscodeVideoResponseSchema,
          400: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const videoID = request.body.videoID;

      try {
        await UploadService.transcodeVideo(videoID);
        reply.send({ success: "Transcoding started" });
      } catch (err) {
        reply.status(400).send({
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // Endpoint to get transcoding percentage via Server-Sent Events (SSE)
  app.get<{ Params: TranscodeVideoRequest }>(
    "/sse/:videoID",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get transcoding percentage",
        tags: ["Upload"],
        summary: "Get transcoding percentage",
        params: TranscodeVideoRequestSchema,
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { videoID } = request.params;
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      reply.raw.flushHeaders();

      console.log(`Starting SSE for videoID: ${videoID}`);

      await UploadService.consumeMessages(videoID, (message) => {
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

      reply.raw.end();
    },
  );

  // Endpoint to get transcoding percentage via WebSocket
  app.get<{ Params: TranscodeVideoRequest }>(
    "/ws/:videoID",
    {
      websocket: true,
      onRequest: [app.authenticate],
      schema: {
        description: "Get transcoding percentage",
        tags: ["Upload"],
        summary: "Get transcoding percentage",
        params: TranscodeVideoRequestSchema,
        security: [{ bearerAuth: [] }],
      },
    },
    async (connection, request) => {
      const { videoID } = request.params;

      console.log(`Starting WebSocket for videoID: ${videoID}`);

      connection.on("close", () => {
        console.log(`WebSocket connection closed for videoID: ${videoID}`);
      });

      await UploadService.consumeMessages(videoID, async (message) => {
        try {
          console.log(`Sending message to client: ${JSON.stringify(message)}`);
          connection.send(JSON.stringify(message));
        } catch (err) {
          console.error(`Error sending message to client: ${err}`);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      connection.close();
    },
  );
}