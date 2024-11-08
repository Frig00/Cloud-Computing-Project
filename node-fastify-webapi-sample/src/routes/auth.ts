import { FastifyInstance } from "fastify";

import { Static, Type } from "@sinclair/typebox";
import { UserService } from "../services/userService";

const LoginRequestSchema = Type.Object({
  username: Type.String(),
  password: Type.String(),
});

const LoginResponseSchema = Type.Object({
  token: Type.String(),
});

const ErrorResponseSchema = Type.Object({
    error: Type.String(),
  });

const SignUpRequestSchema = Type.Object({
  username: Type.String(),
  password: Type.String(),
  email: Type.String(),
});

const SignUpResponseSchema = Type.Object({
  id: Type.String(),
  username: Type.String(),
  email: Type.String(),
});

type LoginRequest = Static<typeof LoginRequestSchema>;
type LoginResponse = Static<typeof LoginResponseSchema>;
type ErrorResponse = Static<typeof ErrorResponseSchema>;
type SignUpRequest = Static<typeof SignUpRequestSchema>;
type SignUpResponse = Static<typeof SignUpResponseSchema>;

export default async function authRoutes(app: FastifyInstance) {
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
      const { username, password } = request.body;
      try {
        const { token } = await UserService.login(username, password, app);
        return { token };
      } catch (error) {
        reply.status(500).send({ error: JSON.stringify(error) });
      }
    },
  );

  app.post<{ Body: SignUpRequest; Reply: SignUpResponse | ErrorResponse }>(
    "/signup",
    {
      schema: {
        description: "User sign up",
        tags: ["Auth"],
        summary: "Sign up endpoint",
        body: SignUpRequestSchema,
        response: {
          200: SignUpResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { username, password, email } = request.body;
      try {
        const user = await UserService.signUp(username, password, app);
        return { id: user.id, username: user.username, email: user.id };
      } catch (error) {
        reply.status(500).send({ error: "Error creating user" });
      }
    },
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
                    message: Type.String()
                }),
                401: ErrorResponseSchema
            },
            security: [{ bearerAuth: [] }]
        }
    },
    async (request, reply) => {
        // The user is authenticated at this point
        const user = request.user; // Contains the decoded JWT payload
        return { message: `Hello ${JSON.stringify(user)}!` };
    }
);
}
