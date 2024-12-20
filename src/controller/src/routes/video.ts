import { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { VideoService } from "../services/videoService";
import { JWTPayload } from "../plugins/auth";

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

const FindVideoSchema = Type.Array(
  Type.Object({
    id: Type.String(),
    userId: Type.String(),
    title: Type.String(),
    uploadDate: Type.String({ format: "date-time" }),
  }),
);

const AllInfosVideoSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  title: Type.String(),
  description: Type.String(),
  uploadDate: Type.String({ format: "date-time" }),
  likes: Type.Number(),
  userHasLiked: Type.Boolean(),
  views: Type.Number(),
});

const VideoCommentSchema = Type.Object({
  comment: Type.String(),
});

const CommentSchema = Type.Object({
  id: Type.String(),
  user: Type.Object({
    userId: Type.String(),
    profilePictureUrl: Type.Union([Type.String(), Type.Null()]),
  }),
  text: Type.String(),
  timeStamp: Type.String({ format: "date-time" }),
});

const CommentsResponseSchema = Type.Object({
  comments: Type.Array(
    Type.Object({
      id: Type.String(),
      user: Type.Object({
        userId: Type.String(),
        profilePictureUrl: Type.Union([Type.String(), Type.Null()]),
      }),
      text: Type.String(),
      timeStamp: Type.String({ format: "date-time" }),
    })
  ),
});

const PaginatedCommentsQuerySchema = Type.Object({
  skip: Type.Integer({ minimum: 0 }),
  take: Type.Integer({ minimum: 1, maximum: 100 }),
});

const PaginatedAllVideoQuerySchema = Type.Object({
  skip: Type.Integer({ minimum: 0 }),
  take: Type.Integer({ minimum: 1, maximum: 100 }),
});

const IdVideoSchema = Type.Object({
  videoId: Type.String(),
});

const IdUserSchema = Type.Object({
  userId: Type.String(),
});

const LikesResponseSchema = Type.Object({
  likes: Type.Number(),
});

const IsLikingSchema = Type.Object({ isLiking: Type.Boolean() });
const TitleVideoSchema = Type.Object({ q: Type.String() });

const IsUserSubscribedSchema = Type.Object({ isUserSubscribed: Type.Boolean() });
const SubscriptionResponseSchema = Type.Object({ subscriptionStatus: Type.Boolean() });
type ErrorResponse = Static<typeof ErrorResponseSchema>;
type IsLiking = Static<typeof IsLikingSchema>;
type IdVideo = Static<typeof IdVideoSchema>;
type IdUser = Static<typeof IdUserSchema>;
type AllInfosVideo = Static<typeof AllInfosVideoSchema>;
type FindVideo = Static<typeof FindVideoSchema>;
type VideoComment = Static<typeof VideoCommentSchema>;
type Comment = Static<typeof CommentSchema>;
type LikesResponse = Static<typeof LikesResponseSchema>;
type CommentsResponse = Static<typeof CommentsResponseSchema>;
type PaginatedCommentsQuery = Static<typeof PaginatedCommentsQuerySchema>;
type IsUserSubscribed = Static<typeof IsUserSubscribedSchema>;
type SubscriptionResponse = Static<typeof SubscriptionResponseSchema>;
type PaginatedAllVideoQuery = Static<typeof PaginatedAllVideoQuerySchema>;

export default async function videoRoutes(app: FastifyInstance) {
  //videoService endpoint
  app.get<{ Querystring: PaginatedAllVideoQuery, Reply: FindVideo | ErrorResponse }>(
    "/all-videos",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["Video"],
        querystring: PaginatedAllVideoQuerySchema,
        response: {
          200: FindVideoSchema,
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { skip, take } = request.query;
        const videos = await VideoService.getAllVideos(skip, take);
        reply.send(
          videos.map(({ id, userId, title, uploadDate }) => ({
            id,
            userId,
            title,
            uploadDate: uploadDate.toISOString(),
          })),
        );
      } catch {
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  //video subscription endpoint
  app.get<{ Querystring: PaginatedAllVideoQuery, Params: { subscriberId: string }, Reply: FindVideo | ErrorResponse }>(
    "/subscriptions/:subscriberId",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["Video"],
        querystring: PaginatedAllVideoQuerySchema,
        response: {
          200: FindVideoSchema,
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { skip, take } = request.query;
        const { subscriberId } = request.params;
        const videos = await VideoService.getSubscriptionVideos(subscriberId, skip, take);
        reply.send(
          videos.map(({ id, userId, title, uploadDate }) => ({
            id,
            userId,
            title,
            uploadDate: uploadDate.toISOString(),
          })),
        );
      } catch {
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
        tags: ["Video"],
        params: IdVideoSchema,
        response: {
          200: AllInfosVideoSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },

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
            description: video.description ?? "",
            uploadDate: video.uploadDate.toISOString(),
            likes: video.totalLikes,
            userHasLiked: video.userHasLiked,
            views: video.totalViews
          });
        }
      } catch (error) {
        reply.status(500).send({ error: "Internal server error " + JSON.stringify(error) });
      }
    },
  );

  // Video search by user endpoint
  app.get<{ Params: IdUser; Reply: FindVideo | ErrorResponse }>(
    "/user/:userId/videos",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["Video"],
        params: IdUserSchema,
        response: {
          200: FindVideoSchema,
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      try {
        const videos = await VideoService.getVideosByUserId(userId);
        reply.send(videos.map(video => ({
          id: video.id,
          userId: video.userId,
          title: video.title,
          uploadDate: video.uploadDate.toISOString(),
        })));
      } catch (error) {
        console.error("Error retrieving videos:", error);
        reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  //video search by string endpoint
  app.post<{ Reply: FindVideo | ErrorResponse }>(
    "/search",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["Video"],
        querystring: TitleVideoSchema,
        response: {
          200: FindVideoSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
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
          reply.status(404).send({ error: "No videos found with the given title" });
        } else {
          reply.send(
            videos.map(({ id, userId, title, uploadDate }) => ({
              id,
              userId,
              title,
              uploadDate: uploadDate.toString(),
            })),
          );
        }
      } catch (error) {
        console.error("Error searching videos:", error);
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  //video like endpoint
  app.post<{ Params: IdVideo; Body: IsLiking; Reply: LikesResponse | ErrorResponse }>(
    "/:videoId/like",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["Video"],
        params: IdVideoSchema,
        body: IsLikingSchema,
        response: {
          200: LikesResponseSchema,
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { videoId } = request.params;
      const { isLiking } = request.body;
      const jwt = await request.jwtVerify<JWTPayload>();
      const userId = jwt.id;
      try {
        const updatedLikesCount = await VideoService.likeVideo(videoId, userId, isLiking);
        reply.send({ likes: updatedLikesCount });
      } catch (error) {
        console.error("Error updating likes:", error);
        reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // Endpoint to add a comment to a video
  app.post<{ Body: VideoComment; Reply: ErrorResponse; Params: IdVideo }>(
    "/:videoId/comment",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["Video"],
        body: VideoCommentSchema,
        params: IdVideoSchema,
        response: {
          200: {},
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { videoId } = request.params;
      const { comment } = request.body;
      const jwt = await request.jwtVerify<JWTPayload>();
      const userId = jwt.id;
      try {
        await VideoService.addComment(videoId, userId, comment);
        reply.status(200);
      } catch {
        reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

// Endpoint to get paginated comments for a video
app.get<{ Params: IdVideo; Querystring: PaginatedCommentsQuery; Reply: CommentsResponse | ErrorResponse }>(
  "/:videoId/comments",
  {
    onRequest: [app.authenticate],
    schema: {
      tags: ["Video"],
      params: IdVideoSchema,
      querystring: PaginatedCommentsQuerySchema,
      response: {
        200: CommentsResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
  },
  async (request, reply) => {
    const { videoId } = request.params;
    const { skip, take } = request.query;
    try {
      const comments = await VideoService.getComments(videoId, skip, take);
      reply.send({ comments });
    } catch (error) {
      console.error("Error retrieving paginated comments:", error);
      reply.status(500).send({ error: "Internal server error" });
    }
  }
);

//video subscribe endpoint
app.post<{ Params: IdVideo; Body: IsUserSubscribed; Reply: SubscriptionResponse | ErrorResponse }>(
  "/:videoId/subscribe",
  {
    onRequest: [app.authenticate],
    schema: {
      tags: ["Video"],
      params: IdVideoSchema,
      body: IsUserSubscribedSchema,
      response: {
        200: SubscriptionResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
  },
  async (request, reply) => {
    const { videoId } = request.params;
    const { isUserSubscribed } = request.body;
    const jwt = await request.jwtVerify<JWTPayload>();
    const userId = jwt.id;
    try {
      const updatedSubscriptionStatus = await VideoService.subscribeVideo(videoId, userId, isUserSubscribed);
      reply.send({ subscriptionStatus: updatedSubscriptionStatus });
    } catch (error) {
      console.error("Error updating subscription status:", error);
      reply.status(500).send({ error: "Internal server error" });
    }
  }
);
 
}
  