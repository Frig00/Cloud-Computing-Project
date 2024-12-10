import { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { VideoService } from "../services/videoService";
import { JWTPayload } from "../plugins/auth";
import { json } from "stream/consumers";

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
  totalLikes: Type.Number(),
  userHasLiked: Type.Boolean(),
  totalViews: Type.Number(),
  comments: Type.Array(
    Type.Object({
      author: Type.String(),
      text: Type.String(),
    }),
  ),
});

const VideoCommentSchema = Type.Object({
  comment: Type.String(),
})


const IdVideoSchema = Type.Object({ 
  videoId: Type.String()
});

const IsLikingSchema = Type.Object({ isLiking: Type.Boolean() });
const TitleVideoSchema = Type.Object({ q: Type.String() });

type ErrorResponse = Static<typeof ErrorResponseSchema>;
type IsLiking = Static<typeof IsLikingSchema>;
type IdVideo = Static<typeof IdVideoSchema>;
type AllInfosVideo = Static<typeof AllInfosVideoSchema>;
type FindVideo = Static<typeof FindVideoSchema>;
type VideoComment = Static<typeof VideoCommentSchema>;

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
      onRequest: [app.authenticate],
      schema: {
        params: IdVideoSchema,
        response: {
          200: AllInfosVideoSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
        tags: ["Video"],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { videoId } = request.params as { videoId: string };
      try {
        const jwt = await request.jwtVerify<JWTPayload>();
        const userId = jwt.id;
        await VideoService.incrementViewCount(videoId, userId);
        const video = await VideoService.getVideoById(videoId, userId);
        if (!video) {
          reply.status(404).send({ error: "Video not found" });
        } else {
          // Send the enriched video details
          reply.send({
            id: video.id,
            userId: video.userId,
            title: video.title,
            uploadDate: video.uploadDate,
            status: video.status,
            totalLikes: video.totalLikes,
            userHasLiked: video.userHasLiked,
            totalViews: video.totalViews,
            comments: video.comments,
          });
        }
      } catch (error) {
        reply.status(500).send({ error: "Internal server error " + JSON.stringify(error) });
      }
    },
  );

  //video search by string endpoint
  app.post<{ Reply: FindVideo | ErrorResponse }>(
    "/search",
    {
      onRequest: [app.authenticate],
      schema: {
        querystring: TitleVideoSchema,
        response: {
          200: FindVideoSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
        tags: ["Video"],
        security: [{ bearerAuth: [] }],
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

  app.get<{Params: IdVideo; Query: IsLiking }>(
    "/:videoId/like",
    {
      onRequest: [app.authenticate],
      schema: {
        querystring: IsLikingSchema,
        params: IdVideoSchema,
        response: {
          200: {},
          500: ErrorResponseSchema,
        },
        tags: ["Video"],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { videoId } = request.params;
      const { isLiking } = request.query as IsLiking;
      const jwt = await request.jwtVerify<JWTPayload>();
      const userId = jwt.id;
      try {
        await VideoService.likeVideo(videoId, userId, isLiking);
        reply.status(200).send();
      } catch (error) {
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  app.post<{ Body: VideoComment; Reply: ErrorResponse; Params: IdVideo }>(
    "/:videoId/comment",
    {
      onRequest: [app.authenticate],
      schema: {
        body: VideoCommentSchema,
        params: IdVideoSchema,
        response: {
          200: {},
          500: ErrorResponseSchema,
        },
        tags: ["Video"],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { videoId } = request.params
      const { comment } = request.body
      const jwt = await request.jwtVerify<JWTPayload>();
      const userId = jwt.id;
      try {
        await VideoService.addComment(videoId, userId, comment);
        reply.status(200);
      } catch (error) {
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
}
