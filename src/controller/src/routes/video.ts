import { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { VideoService } from "../services/videoService";
import { JWTPayload } from "../plugins/auth";

// Error Schema and Type
const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});
type ErrorResponse = Static<typeof ErrorResponseSchema>;

// Find Video Schema and Type
type FindVideo = Static<typeof FindVideoSchema>;
const FindVideoSchema = Type.Array(
  Type.Object({
    id: Type.String(),
    userId: Type.String(),
    title: Type.String(),
    uploadDate: Type.String({ format: "date-time" }),
  }),
);

// All Video Info Schema and Type
type AllInfosVideo = Static<typeof AllInfosVideoSchema>;
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

// Video Comment Schema and Type
type VideoComment = Static<typeof VideoCommentSchema>;
const VideoCommentSchema = Type.Object({
  comment: Type.String(),
});

// Comment Schema and Type
const CommentSchema = Type.Object({
  id: Type.String(),
  user: Type.Object({
    userId: Type.String(),
    profilePictureUrl: Type.Union([Type.String(), Type.Null()]),
  }),
  text: Type.String(),
  timeStamp: Type.String({ format: "date-time" }),
});

// Comments Response Schema and Type
type CommentsResponse = Static<typeof CommentsResponseSchema>;
const CommentsResponseSchema = Type.Object({
  comments: Type.Array(CommentSchema),
});

// Paginated Comments Query Schema and Type
type PaginatedCommentsQuery = Static<typeof PaginatedCommentsQuerySchema>;
const PaginatedCommentsQuerySchema = Type.Object({
  skip: Type.Integer({ minimum: 0 }),
  take: Type.Integer({ minimum: 1, maximum: 100 }),
});

// Paginated All Video Query Schema and Type
type PaginatedAllVideoQuery = Static<typeof PaginatedAllVideoQuerySchema>;
const PaginatedAllVideoQuerySchema = Type.Object({
  skip: Type.Integer({ minimum: 0 }),
  take: Type.Integer({ minimum: 1, maximum: 100 }),
});

// Video ID Schema and Type
type IdVideo = Static<typeof IdVideoSchema>;
const IdVideoSchema = Type.Object({
  videoId: Type.String(),
});

// User ID Schema and Type
type IdUser = Static<typeof IdUserSchema>;
const IdUserSchema = Type.Object({
  userId: Type.String(),
});

// Likes Response Schema and Type
type LikesResponse = Static<typeof LikesResponseSchema>;
const LikesResponseSchema = Type.Object({
  likes: Type.Number(),
});

// Is Liking Schema and Type
type IsLiking = Static<typeof IsLikingSchema>;
const IsLikingSchema = Type.Object({ isLiking: Type.Boolean() });

// Title Video Schema
type TitleVideo = Static<typeof TitleVideoSchema>;
const TitleVideoSchema = Type.Object({ q: Type.String() });

export default async function videoRoutes(app: FastifyInstance) {
  // Endpoint to get all public videos with pagination
  app.get<{ Querystring: PaginatedAllVideoQuery, Reply: FindVideo | ErrorResponse }>(
    "/all-videos",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get all public videos with pagination",
        summary: "Retrieves a paginated list of all public videos",
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

  // Endpoint to get subscription videos for a user with pagination
  app.get<{ Querystring: PaginatedAllVideoQuery, Reply: FindVideo | ErrorResponse }>(
    "/subscriptions",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get subscription videos for a user",
        summary: "Retrieves a paginated list of videos from channels the user is subscribed to",
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
        const jwt = await request.jwtVerify<JWTPayload>();
        const videos = await VideoService.getSubscriptionVideos(jwt.id, skip, take);
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

  // Endpoint to get video details by ID
  app.get<{ Reply: AllInfosVideo | ErrorResponse }>(
    "/:videoId",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get detailed information about a specific video",
        summary: "Retrieves comprehensive details of a video including likes and view count",
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

  // Endpoint to get videos by user ID
  app.get<{ Params: IdUser; Reply: FindVideo | ErrorResponse }>(
    "/user/:userId/videos",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get all videos from a specific user",
        summary: "Retrieves a list of videos uploaded by a particular user",
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

  // Endpoint to search videos by title
  app.post<{ Querystring: TitleVideo, Reply: FindVideo | ErrorResponse }>(
    "/search",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Search for videos by title",
        summary: "Searches for videos matching the provided search terms",
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
      const { q } = request.query;

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

  // Endpoint to like or unlike a video
  app.post<{ Params: IdVideo; Body: IsLiking; Reply: LikesResponse | ErrorResponse }>(
    "/:videoId/like",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Like or unlike a video",
        summary: "Toggles the like status of a video for the current user",
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
        description: "Add a comment to a video",
        summary: "Posts a new comment on a specific video",
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
        description: "Get paginated comments for a video",
        summary: "Retrieves a paginated list of comments for a specific video",
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
}