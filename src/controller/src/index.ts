// src/server.ts

import Fastify, { FastifyInstance } from "fastify";
import * as dotenv from "dotenv";
import swaggerPlugin from "./plugins/swagger";
import authPlugin from "./plugins/auth";
import registerRoutes from "./routes";
import corsPlugin from "./plugins/cors";
import websocket from "@fastify/websocket";

const env = dotenv.config({ path: "..\\..\\.env" });
console.log(env);
const fastify: FastifyInstance = Fastify({ logger: true });

const startServer = async () => {
  try {
    // Register plugins
    await swaggerPlugin(fastify);
    await authPlugin(fastify);
    await corsPlugin(fastify);
    await fastify.register(websocket);

    // Register routes
    registerRoutes(fastify);

    await fastify.listen({
      port: Number(process.env.PORT) || 3000,
      host: "0.0.0.0",
    });
    console.log(
      `Server running at http://localhost:${process.env.PORT || 3000}`,
    );
    console.log(
      `Swagger docs available at http://localhost:${
        process.env.PORT || 3000
      }/docs`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();
