import { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

export default async function corsPlugin(fastify: FastifyInstance) {
  fastify.register(cors, {
    origin: (origin, callback) => {
      callback(null, true);
      //   // Allow all origins in development
      //   if (!origin || origin === 'http://localhost:3000') {
      //     callback(null, true);
      //     return;
      //   }

      //   // Allow specific origins or block others
      //   callback(new Error('Not allowed by CORS'), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Include credentials in CORS requests
  });
}
