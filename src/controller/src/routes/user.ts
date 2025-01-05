import { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { UserService } from "../services/userService";
import { JWTPayload } from "../plugins/auth";

// Error handling schemas
type ErrorResponse = Static<typeof ErrorResponseSchema>;
const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

// User authentication and management schemas
type UserId = Static<typeof UserIdSchema>;
const UserIdSchema = Type.Object({
  userId: Type.String(),
});

type SignUpResponse = Static<typeof SignUpResponseSchema>;
const SignUpResponseSchema = Type.Object({
  userId: Type.String(),
  name: Type.String(),
});

type UpdateUserBody = Static<typeof UpdateUserBodySchema>;
const UpdateUserBodySchema = Type.Object({
  name: Type.Optional(Type.String()),
  password: Type.Optional(Type.String()),
});

// Subscription related schemas
type SubscriptionResponse = Static<typeof SubscriptionResponseSchema>;
const SubscriptionResponseSchema = Type.Object({ 
  subscriptionStatus: Type.Boolean() 
});

type IsUserSubscribed = Static<typeof IsUserSubscribedSchema>;
const IsUserSubscribedSchema = Type.Object({ 
  isUserSubscribed: Type.Boolean() 
});

export default async function userRoutes(app: FastifyInstance) {
  // Endpoint to update user profile
  app.put<{ Body: UpdateUserBody; Reply: ErrorResponse }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Update user profile",
        summary: "Updates the current user's profile information",
        tags: ["User"],
        body: UpdateUserBodySchema,
        response: {
          200: {},
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const jwt = await request.jwtVerify<JWTPayload>();
      const userId = jwt.id;

      try {
        await UserService.updateUserProfile(userId, request.body, app);
        reply.status(200).send();
      } catch (err) {
        reply.status(400).send({
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  // Endpoint to get current user
  app.get<{ Reply: SignUpResponse | ErrorResponse }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get current user",
        summary: "Retrieves the profile information of the currently authenticated user",
        tags: ["User"],
        response: {
          200: SignUpResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const jwt = await request.jwtVerify<JWTPayload>();
      const userId = jwt.id;
      try {
        const user = await UserService.getUserById(userId);
        if (!user) {
          reply.status(404).send({ error: "User not found" });
        } else {
          return { userId: user.userId, name: user.name };
        }
      } catch {
        reply.status(500).send({ error: "Error retrieving user" });
      }
    },
  );

  // Endpoint to delete current user
  app.delete<{ Reply: ErrorResponse }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Delete current user",
        summary: "Permanently removes the current user's account",
        tags: ["User"],
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
      const jwt = await request.jwtVerify<JWTPayload>();
      const userId = jwt.id;
      try {
        await UserService.deleteUser(userId);
        reply.status(200).send();
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
    },
  );

   // Endpoint to subscribe or unsubscribe from a video
   app.post<{ Params: UserId; Body: IsUserSubscribed; Reply: SubscriptionResponse | ErrorResponse }>(
    "/:userId/subscribe",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Subscribe or unsubscribe from a user",
        summary: "Toggles the subscription status to another user's channel",
        tags: ["User"],
        params: UserIdSchema,
        body: IsUserSubscribedSchema,
        response: {
          200: SubscriptionResponseSchema,
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { isUserSubscribed } = request.body;
      const jwt = await request.jwtVerify<JWTPayload>();
      const selfUserId = jwt.id;
      try {
        const updatedSubscriptionStatus = await UserService.subscribe(selfUserId, userId, isUserSubscribed);
        reply.send({ subscriptionStatus: updatedSubscriptionStatus });
      } catch (error) {
        console.error("Error updating subscription status:", error);
        reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // Endpoint to check if the user is subscribed to the uploader of the video
  app.get<{ Params: UserId; Reply: SubscriptionResponse | ErrorResponse }>(
    "/:userId/subscribe",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Check subscription status",
        summary: "Checks if the current user is subscribed to a specific channel",
        tags: ["User"],
        params: UserIdSchema,
        response: {
          200: SubscriptionResponseSchema,
          500: ErrorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const jwt = await request.jwtVerify<JWTPayload>();
      const selfUserId = jwt.id;
      try {
        const isSubscribed = await UserService.isUserSubscribed(selfUserId, userId);
        reply.send({ subscriptionStatus: isSubscribed });
      } catch (error) {
        console.error("Error checking subscription status:", error);
        reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
}