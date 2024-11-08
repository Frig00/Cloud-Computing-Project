import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt, { JWT } from '@fastify/jwt';

export default async function authPlugin(fastify: FastifyInstance) {
    fastify.register(fastifyJwt, {
        secret: 'your_jwt_secret_here', //TODO: Read from env
      });
      
      fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.send(err);
        }
      });
  
}

declare module 'fastify' {
    interface FastifyRequest {
      jwt: JWT
    }
    export interface FastifyInstance {
      authenticate: any
    }
  }