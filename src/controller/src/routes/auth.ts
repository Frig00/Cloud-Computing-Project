import { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { UserService } from "../services/userService";

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

type LoginRequest = Static<typeof LoginRequestSchema>;
type LoginResponse = Static<typeof LoginResponseSchema>;
type ErrorResponse = Static<typeof ErrorResponseSchema>;
type SignUpRequest = Static<typeof SignUpRequestSchema>;

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
        const token = await UserService.login(userId, password, app);
        return { token };
      } catch (error) {
          reply.status(500).send({ error: "Error logging in (username or password wrong)" });
        }
    },
  );

  //signup endpoint
  app.post<{ Body: SignUpRequest; Reply: ErrorResponse }>(
    "/signup",
    {
      schema: {
        description: "User sign up",
        tags: ["Auth"],
        summary: "Sign up endpoint",
        body: SignUpRequestSchema,
        response: {
          200: {},
          500: ErrorResponseSchema
        },
      },
    },
    async (request, reply) => {
      const { userId, password, name } = request.body;
      try {
        await UserService.signUp(name, userId, password, app);
        reply.status(200).send();
      } catch (error) {
        reply.status(500).send({ error: "Error creating user!" });
      }
    },
  );

  //Protected endpoint requiring JWT
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
}
