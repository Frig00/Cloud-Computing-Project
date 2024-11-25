import { FastifyInstance } from "fastify";

import { Static, Type } from "@sinclair/typebox";
import { UserService } from "../services/userService";
import { UploadService } from "../services/uploadService";
import { VideoService } from "../services/videoService";

const LoginRequestSchema = Type.Object({
  userId: Type.String(),
  password: Type.String(),
});

const LoginResponseSchema = Type.Object({
  token: Type.String(),
});

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

const SignUpRequestSchema = Type.Object({
  userId: Type.String(),
  password: Type.String(),
  name: Type.String(),
});

const SignUpResponseSchema = Type.Object({
  userId: Type.String(),
  name: Type.String(),
  password: Type.String(),
});

const UpdateUserParamsSchema = Type.Object({
  userId: Type.String(),
});

const UpdateUserBodySchema = Type.Object({
  userId: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  password: Type.Optional(Type.String()),
});

const UpdateUserResponseSchema = Type.Object({
  userId: Type.String(),
  name: Type.String(),
  password: Type.String(),
});

type LoginRequest = Static<typeof LoginRequestSchema>;
type LoginResponse = Static<typeof LoginResponseSchema>;
type ErrorResponse = Static<typeof ErrorResponseSchema>;
type SignUpRequest = Static<typeof SignUpRequestSchema>;
type SignUpResponse = Static<typeof SignUpResponseSchema>;
type UpdateUserParams = Static<typeof UpdateUserParamsSchema>;
type UpdateUserBody = Static<typeof UpdateUserBodySchema>;
type UpdateUserResponse = Static<typeof UpdateUserResponseSchema>;

export default async function authRoutes(app: FastifyInstance) {


  //login endpoint
  app.post<{ Body: LoginRequest; Reply: LoginResponse | ErrorResponse }>(
    "/login",
    {
      schema: {
        description: "User login",
        tags: ["Auth"],
        summary: "Login endpoint",
        body: LoginRequestSchema,
        response: {
          200: LoginResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { userId, password } = request.body;
      try {
        const { token } = await UserService.login(userId, password, app);
        return { token };
      } catch (error) {
          reply.status(500).send({ error: "Error logging in (username or password wrong)" });
        }
    },
  );

  //update user profile endpoint
  app.put<{ Body: UpdateUserBody; Params: UpdateUserParams; Reply: { message: string } | Static<typeof ErrorResponseSchema>;}>(
    "/user/:userId",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Update user profile",
        tags: ["User"],
        summary: "Update user profile endpoint",
        body: UpdateUserBodySchema,
        params: UpdateUserParamsSchema,
        response: {
          200: Type.Object({ message: Type.String() }),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { name, password } = request.body;
  
      try {
        const updatedUser = await UserService.updateUserProfile(userId, { name, password }, app);
        reply.status(200).send({ message: "Profile updated" });
        //return { message: "Profile updated" };
      } catch (error) {
        console.error("Error updating user profile:", error);
        if (error instanceof Error && error.message === "User not found") {
          reply.status(404).send({ error: error.message });
        } else if (error instanceof Error && error.message === "Unauthorized") {
          reply.status(401).send({ error: error.message });
        } else {
          reply.status(500).send({ error: "Error updating user profile!!" });
        }
      }
    }
  );
  

  app.post<{ Body: SignUpRequest; Reply: { message: string } | ErrorResponse }>(
    "/signup",
    {
      schema: {
        description: "User sign up",
        tags: ["Auth"],
        summary: "Sign up endpoint",
        body: SignUpRequestSchema,
        response: {
          200: { type: "object", properties: { message: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const { userId, password, name } = request.body;
      try {
        await UserService.signUp(name, userId, password, app);
        return { message: "Account registered correctly!" };
      } catch (error) {
        reply.status(500).send({ error: "Error creating user!" });
      }
    },
  );

  //get user ID endpoint
  app.get<{ Params: { userId: string }; Reply: SignUpResponse | ErrorResponse }>(
    "/user/:userId",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get user by ID",
        tags: ["User"],
        summary: "Get user by ID endpoint",
        params: Type.Object({
          userId: Type.String(),
        }),
        response: {
          200: SignUpResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const loggedInUserId = (request.user as { userId: string }).userId; // Assuming the user ID is stored in the JWT payload

      if (userId !== loggedInUserId) {
        reply.status(401).send({ error: "Unauthorized" });
        return;
      }

      try {
        const user = await UserService.getUserById(userId);
        if (!user) {
          reply.status(404).send({ error: "User not found" });
        } else {
          return { userId: user.userId, name: user.name, password: user.password };
        }
      } catch (error) {
        reply.status(500).send({ error: "Error retrieving user" });
      }
    }
  );


  app.get(
    "/protected",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Protected endpoint",
        tags: ["Auth"],
        summary: "Protected endpoint requiring JWT",
        response: {
          200: Type.Object({
            message: Type.String(),
          }),
          401: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      // The user is authenticated at this point
      const user = request.user; // Contains the decoded JWT payload
      return { message: `Hello ${JSON.stringify(user)}!` };
    },
  );

  //delete user endpoint
  app.delete<{ Params: { userId: string }; Reply: { success: boolean } | ErrorResponse }>(
    "/user/:userId",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Delete user by ID",
        tags: ["User"],
        summary: "Delete user endpoint",
        params: Type.Object({
          userId: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
          }),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      try {
        await UserService.deleteUser(userId);
        return { success: true };
      } catch (error) {
        console.error("Error deleting user:", error);
        if (error instanceof Error && error.message === "User not found") {
          reply.status(404).send({ error: error.message });
        } else if (error instanceof Error && error.message === "Unauthorized") {
          reply.status(401).send({ error: error.message });
        } else {
          reply.status(500).send({ error: "Error deleting user" });
        }
      }
    }
  );

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  //videoService
  app.get("/api/videos", async (request, reply) => {
    const videos = await VideoService.getAllVideos();
    reply.send(videos);
  });

  //video searching by ID endpoint
  app.get("/api/videos/:videoId", async (request, reply) => {
    const { videoId } = request.params as { videoId: string };
    const video = await VideoService.getVideoById(videoId);
    if (!video) {
      reply.status(404).send({ error: "Video not found" });
    } else {
      reply.send(video);
    }
  });

//video search by string endpoint
app.get("/api/videos/title/:title", async (request, reply) => {
  const { title } = request.params as { title: string };

  if (!title.trim()) {
    reply.status(400).send({ error: "Invalid search query" });
    return;
  }

  const searchWords = title.split(/\s+/); // Split input into words
  console.log("Search words:", searchWords);

  try {
    const videos = await VideoService.searchVideos(searchWords); // Pass array of words to the service
    if (videos.length === 0) {
      reply.status(404).send({ error: "No videos found with the given title" });
    } else {
      reply.send(videos);
    }
  } catch (error) {
    console.error("Error searching videos:", error);
    reply.status(500).send({ error: "Internal server error" });
  }
});



  app.post("/api/videos/like/:videoId", async (request, reply) => {
    const { videoId } = request.params as { videoId: string };
    const { userId } = request.body as { userId: string };
    await VideoService.likeVideo(videoId, userId);
    reply.send({ success: true });
  });

  app.post("/api/videos/comment/:videoId", async (request, reply) => {
    const { videoId } = request.params as { videoId: string };
    const { userId, content } = request.body as { userId: string; content: string };
    const comment = await VideoService.addComment(videoId, userId, content);
    reply.send(comment);
  });

}
