import { FastifyInstance } from 'fastify';
import { HelloResponseSchema } from '../schemas/hello';
import { Static } from '@sinclair/typebox';

type HelloResponse = Static<typeof HelloResponseSchema>;

export default async function rootRoute(app: FastifyInstance) {
  app.get<{ Reply: HelloResponse }>(
    '/',
    {
      schema: {
        description: 'Returns a welcome message',
        tags: ['Root'],
        summary: 'Welcome endpoint',
        response: {
          200: HelloResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return { message: `Hello, Fastify with TypeScript! ${process.env.DOTENV_EXAMPLE}` };
    }
  );
}