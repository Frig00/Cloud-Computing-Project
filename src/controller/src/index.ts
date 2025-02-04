// src/server.ts

import Fastify, { FastifyInstance } from "fastify";
import * as dotenv from "dotenv";
import swaggerPlugin from "./plugins/swagger";
import authPlugin from "./plugins/auth";
import registerRoutes from "./routes";
import corsPlugin from "./plugins/cors";
import websocket from "@fastify/websocket";
import cookie from "@fastify/cookie";

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import PrismaInstance from "./data/prisma";

const env = dotenv.config();
console.log(env);
const fastify: FastifyInstance = Fastify({ logger: true });

const secretClient = new SecretsManagerClient({
  region: process.env.AWS_REGION
})

const startServer = async () => {
  try {
    let connectionString = process.env.DB_CONNECTION;
    const secretDbData = await secretClient.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET, VersionStage: "AWSCURRENT" }));
    if (secretDbData.SecretString) {
      const secretDb = JSON.parse(secretDbData.SecretString);
      connectionString = "mysql://" + secretDb.username + ":" + secretDb.password + "@" + process.env.DB_HOST + "/" + process.env.DB_NAME;
    }
    const jwtSecretData = await secretClient.send(new GetSecretValueCommand({ SecretId: process.env.JWT_SECRET, VersionStage: "AWSCURRENT" }));

    PrismaInstance.getInstance().initialize(connectionString);







    // Register plugins
    await swaggerPlugin(fastify);
    await authPlugin(fastify, jwtSecretData.SecretString || process.env.JWT_SECRET!);
    await corsPlugin(fastify);
    await fastify.register(websocket);
    fastify.register(cookie, {
      parseOptions: {}
    });


    // Register routes
    registerRoutes(fastify);

    await fastify.listen({
      port: Number(process.env.PORT) || 3000,
      host: "0.0.0.0",
    });
    console.log(`Server running at port: ${process.env.PORT || 3000}`);
    console.log(`Swagger docs available at port: ${process.env.PORT || 3000}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();
