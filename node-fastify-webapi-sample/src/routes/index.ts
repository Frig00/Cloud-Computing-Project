import { FastifyInstance } from 'fastify';
import rootRoute from './root';

export default function registerRoutes(app: FastifyInstance) {
  app.register(rootRoute, { prefix: '/' });
}