import { Application } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './index';

/**
 * Swagger/OpenAPI configuration
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SaaS CRM API',
      version: config.app.apiVersion,
      description: `
# Multi-Tenant SaaS CRM Platform API

## Overview
This is a production-ready, multi-tenant SaaS CRM platform API that provides comprehensive functionality for:
- Customer Relationship Management (Leads, Clients, Contacts)
- Task & Project Management
- Calendar & Scheduling
- File Management
- Invoicing & Expenses
- E-commerce
- Communication (Email, Chat)
- Analytics & Reporting

## Authentication
All protected endpoints require a Bearer token in the Authorization header.

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

Access tokens expire after 15 minutes. Use the refresh token endpoint to obtain a new access token.

## Multi-Tenancy
This API is multi-tenant. Each user belongs to one or more tenants (organizations).
The tenant context is automatically determined from the authenticated user's token.

## Rate Limiting
API requests are rate limited. Check the following headers in responses:
- \`X-RateLimit-Limit\`: Maximum requests per window
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Time when the rate limit resets

## Pagination
List endpoints support pagination with the following query parameters:
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 20, max: 100)
- \`sortBy\`: Field to sort by
- \`sortOrder\`: Sort direction (asc/desc)
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.app.port}/api/${config.app.apiVersion}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { type: 'object' } },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: { email: ['Invalid email format'] },
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Authentication required',
                code: 'UNAUTHORIZED',
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Insufficient permissions',
                code: 'FORBIDDEN',
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Resource not found',
                code: 'NOT_FOUND',
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Too Many Requests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'Rate limit exceeded',
                code: 'TOO_MANY_REQUESTS',
              },
            },
          },
        },
        InternalError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                message: 'An unexpected error occurred',
                code: 'INTERNAL_SERVER_ERROR',
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number',
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Items per page',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        SortByParam: {
          name: 'sortBy',
          in: 'query',
          description: 'Field to sort by',
          schema: { type: 'string' },
        },
        SortOrderParam: {
          name: 'sortOrder',
          in: 'query',
          description: 'Sort order',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
        SearchParam: {
          name: 'search',
          in: 'query',
          description: 'Search term',
          schema: { type: 'string' },
        },
        IdParam: {
          name: 'id',
          in: 'path',
          description: 'Resource ID',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Employees', description: 'Employee management' },
      { name: 'Roles', description: 'Role management' },
      { name: 'Leads', description: 'Lead management' },
      { name: 'Clients', description: 'Client management' },
      { name: 'Contacts', description: 'Contact management' },
      { name: 'Groups', description: 'Client group management' },
      { name: 'Applications', description: 'Application management' },
      { name: 'Tasks', description: 'Task management' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Calendar', description: 'Calendar events' },
      { name: 'Files', description: 'File management' },
      { name: 'Invoices', description: 'Invoice management' },
      { name: 'Expenses', description: 'Expense management' },
      { name: 'Bookings', description: 'Booking management' },
      { name: 'Products', description: 'Product management' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Emails', description: 'Email management' },
      { name: 'Chat', description: 'Chat functionality' },
      { name: 'Notifications', description: 'Notifications' },
      { name: 'Analytics', description: 'Analytics & Reports' },
      { name: 'Settings', description: 'Settings management' },
    ],
  },
  apis: [
    './src/modules/**/**.routes.ts',
    './src/modules/**/**.dto.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger documentation
 */
export function setupSwagger(app: Application): void {
  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'SaaS CRM API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
      },
    })
  );

  // JSON spec endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

export { swaggerSpec };