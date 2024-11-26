import { FastifyInstance } from 'fastify';
import rootRoute from './root';
import authRoutes from './auth';
import uploadRoutes from './upload';
import userRoutes from './user';
import videoRoutes from './video';



export default function registerRoutes(app: FastifyInstance) {
  app.register(rootRoute);
  app.register(authRoutes, { prefix: '/auth' });
  app.register(uploadRoutes, { prefix: '/upload' });
  app.register(userRoutes, { prefix: '/user' });
  app.register(videoRoutes, { prefix: '/video' });
}