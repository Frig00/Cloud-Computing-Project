import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt, { JWT } from "@fastify/jwt";
import PrismaInstance, { getPrisma } from "../data/prisma";

export interface JWTPayload {
  id: string;
  // Add other properties as needed
}

export default async function authPlugin(fastify: FastifyInstance, jwtSecret: string) {
  fastify.register(fastifyJwt, {
    secret: jwtSecret
  });

  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const jwt = await request.jwtVerify<JWTPayload>();
      const user = await getPrisma().users.findUnique({
        where: { userId: jwt.id },
      });
      if (!user) {
        return reply.status(401).send({ message: "Unauthorized" });
      }
    } catch (err) {
      reply.send(err);
    }
  });
}

declare module "fastify" {
  interface FastifyRequest {
    jwt: JWT;
  }
  export interface FastifyInstance {
    authenticate: any;
  }
}
