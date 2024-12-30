import { FastifyInstance } from "fastify";
import rootRoute from "./root";
import authRoutes from "./auth";
import uploadRoutes from "./upload";
import userRoutes from "./user";
import videoRoutes from "./video";

// Function to register all routes with the Fastify instance
export default function registerRoutes(app: FastifyInstance) {
  // Register root route
  app.register(rootRoute);
  
  // Register authentication routes with "/auth" prefix
  app.register(authRoutes, { prefix: "/auth" });
  
  // Register upload routes with "/upload" prefix
  app.register(uploadRoutes, { prefix: "/upload" });
  
  // Register user routes with "/user" prefix
  app.register(userRoutes, { prefix: "/user" });
  
  // Register video routes with "/video" prefix
  app.register(videoRoutes, { prefix: "/video" });
}