import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default async function swaggerPlugin(fastify: FastifyInstance) {
  // Register Swagger for JSON specs
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Test swagger',
        description: 'Testing the Fastify swagger API',
        version: '0.1.0'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        }
      ],
      tags: [
        { name: 'user', description: 'User related end-points' },
        { name: 'code', description: 'Code related end-points' }
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'apiKey',
            in: 'header'
          }
        }
      },
      externalDocs: {
        url: 'https://swagger.io',
        description: 'Find more info here'
      }
    }
  })

  // Register Swagger UI for a more user-friendly interface
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });
}
