import { FastifyInstance } from 'fastify';
import rootRoute from './root';
import authRoutes from './auth';
import videoRoutes from './video';

export default function registerRoutes(app: FastifyInstance) {
  app.register(rootRoute);
  app.register(authRoutes, { prefix: '/auth' });
  app.register(videoRoutes, { prefix: '/video' });
}