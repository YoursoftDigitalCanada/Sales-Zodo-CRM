import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';

// Middleware imports
import {
  corsMiddleware,
  corsErrorHandler,
  requestId,
  requestLogger,
  requestTiming,
  defaultRateLimiter,
  errorHandler,
  notFoundHandler,
} from './common/middleware';

// Route imports
import { registerRoutes } from './routes';

// Swagger
import { setupSwagger } from './config/swagger';

// Automation engine
import { automationService } from './modules/automation/automation.service';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // =========================================================================
  // TRUST PROXY (required for correct client IP behind Nginx/reverse proxy)
  // Without this, req.ip returns the proxy's IP → rate limiting blocks ALL users
  // =========================================================================
  app.set('trust proxy', 1);

  // =========================================================================
  // SECURITY MIDDLEWARE
  // =========================================================================

  // Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: config.app.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS
  app.use(corsMiddleware);
  app.use(corsErrorHandler);

  // =========================================================================
  // PARSING MIDDLEWARE
  // =========================================================================

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // =========================================================================
  // REQUEST TRACKING MIDDLEWARE
  // =========================================================================

  // Request ID
  app.use(requestId);

  // Request timing
  app.use(requestTiming);

  // Request logging
  app.use(requestLogger);

  // =========================================================================
  // RATE LIMITING
  // =========================================================================

  // Apply default rate limiter to all routes
  app.use(defaultRateLimiter);

  // =========================================================================
  // HEALTH CHECK (before auth)
  // =========================================================================

  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'OK',
      timestamp: new Date().toISOString(),
      environment: config.app.env,
    });
  });

  app.get('/api/health', async (req: Request, res: Response) => {
    try {
      // Check database connection
      const { checkDatabaseHealth } = await import('./config/database');
      const dbHealthy = await checkDatabaseHealth();

      res.status(dbHealthy ? 200 : 503).json({
        success: dbHealthy,
        message: dbHealthy ? 'All systems operational' : 'Database connection failed',
        timestamp: new Date().toISOString(),
        environment: config.app.env,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
        },
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // =========================================================================
  // API DOCUMENTATION
  // =========================================================================

  if (!config.app.isProduction) {
    setupSwagger(app);
  }

  // =========================================================================
  // AUTOMATION ENGINE (must initialize before routes)
  // =========================================================================

  automationService.initialize();

  // =========================================================================
  // LIFECYCLE CRON (daily AT_RISK evaluation per tenant)
  // =========================================================================

  const { lifecycleCronService } = require('./common/services/lifecycle-cron.service');
  lifecycleCronService.start();

  // =========================================================================
  // API ROUTES
  // =========================================================================

  registerRoutes(app);

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

// Export configured app
export const app = createApp();