import { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { VideoService } from "../services/videoService";

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

const FindVideoSchema = Type.Array(
  Type.Object({
    id: Type.String(),
    userId: Type.String(),
    title: Type.String(),
    uploadDate: Type.Number(),
    status: Type.String(),
  }),
);

const AllInfosVideoSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  title: Type.String(),
  uploadDate: Type.Number(),
  status: Type.String(),
  //aggiumgere commenti like views
});

const IdVideoSchema = Type.Object({ videoId: Type.String() });
const TitleVideoSchema = Type.Object({ q: Type.String() });

type ErrorResponse = Static<typeof ErrorResponseSchema>;
type AllInfosVideo = Static<typeof AllInfosVideoSchema>;
type FindVideo = Static<typeof FindVideoSchema>;

export default async function videoRoutes(app: FastifyInstance) {
  //videoService
  app.get<{ Reply: FindVideo | ErrorResponse }>(
    "/all-videos",
    {
      schema: {
        tags: ["Video"],
        response: {
          200: FindVideoSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (_, reply) => {
      try {
        const videos = await VideoService.getAllVideos();
        reply.send(videos);
      } catch (error) {
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  //video searching by ID endpoint
  app.get<{ Reply: AllInfosVideo | ErrorResponse }>(
    "/:videoId",
    {
      schema: {
        params: IdVideoSchema,
        response: {
          200: AllInfosVideoSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
        tags: ["Video"],
      },
    },
    async (request, reply) => {
      const { videoId } = request.params as { videoId: string };
      try {
        const video = await VideoService.getVideoById(videoId);
        if (!video) {
          reply.status(404).send({ error: "Video not found" });
        } else {
          reply.send(video);
        }
      } catch (error) {
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  //video search by string endpoint
  app.post<{ Reply: FindVideo | ErrorResponse }>(
    "/search",
    {
      schema: {
        querystring: TitleVideoSchema,
        response: {
          200: FindVideoSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
        tags: ["Video"],
      },
    },
    async (request, reply) => {
      const { q } = request.query as { q: string };

      if (!q.trim()) {
        reply.status(400).send({ error: "Invalid search query" });
        return;
      }

      const searchWords = q.split(/\s+/); // Split input into words
      console.log("Search words:", searchWords);

      try {
        const videos = await VideoService.searchVideos(searchWords); // Pass array of words to the service
        if (videos.length === 0) {
          reply
            .status(404)
            .send({ error: "No videos found with the given title" });
        } else {
          reply.send(videos);
        }
      } catch (error) {
        console.error("Error searching videos:", error);
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/:videoId/like",
    {
      schema: {
        params: IdVideoSchema,
        response: {
          200: {},
          500: ErrorResponseSchema,
        },
        tags: ["Video"],
      },
    },
    async (request, reply) => {
      const { videoId } = request.params as { videoId: string };
      const { userId } = request.body as { userId: string };
      try {
        await VideoService.likeVideo(videoId, userId);
        reply.send({ success: true });
      } catch (error) {
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/:videoId/commit",
    {
      schema: {
        params: IdVideoSchema,
        response: {
          200: {},
          500: ErrorResponseSchema,
        },
        tags: ["Video"],
      },
    },
    async (request, reply) => {
      const { videoId } = request.params as { videoId: string };
      const { userId, content } = request.body as {
        userId: string;
        content: string;
      };
      try {
        const comment = await VideoService.addComment(videoId, userId, content);
        reply.send(comment);
      } catch (error) {
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
}
