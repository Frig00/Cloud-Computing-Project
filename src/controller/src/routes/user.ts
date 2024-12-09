import { FastifyInstance } from "fastify";

import { Static, Type } from "@sinclair/typebox";
import { UserService } from "../services/userService";
import { JWTPayload } from "../plugins/auth";

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

const SignUpResponseSchema = Type.Object({
  userId: Type.String(),
  name: Type.String(),
});

const UpdateUserBodySchema = Type.Object({
  name: Type.Optional(Type.String()),
  password: Type.Optional(Type.String()),
});

type ErrorResponse = Static<typeof ErrorResponseSchema>;
type SignUpResponse = Static<typeof SignUpResponseSchema>;
type UpdateUserBody = Static<typeof UpdateUserBodySchema>;

export default async function userRoutes(app: FastifyInstance) {
  //update user profile endpoint
  app.put<{ Body: UpdateUserBody; Reply: ErrorResponse }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Update user profile",
        tags: ["User"],
        summary: "Update user profile endpoint",
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
        //return { message: "Profile updated" };
      } catch (err) {
        reply.status(400).send({
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  //get user ID endpoint
  app.get<{ Reply: SignUpResponse | ErrorResponse }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Get currrent user",
        tags: ["User"],
        summary: "Get current user",
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

  //delete user endpoint
  app.delete<{ Reply: ErrorResponse }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Delete current user",
        tags: ["User"],
        summary: "Delete current user",
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
}
