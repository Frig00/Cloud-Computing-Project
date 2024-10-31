// src/server.ts

import Fastify, { FastifyInstance } from 'fastify';
import * as dotenv from 'dotenv';
import swaggerPlugin from './plugins/swagger';
import registerRoutes from './routes';

dotenv.config();

const fastify: FastifyInstance = Fastify({ logger: true });

// Register plugins
fastify.register(swaggerPlugin);

// Register routes
registerRoutes(fastify);

const startServer = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000 });
    console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
    console.log(`Swagger docs available at http://localhost:${process.env.PORT || 3000}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();
