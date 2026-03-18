import { app } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { closeRedisConnection } from './config/redis';
import { logger } from './common/utils/logger';
import { imapPoller } from './common/services/imap-poller.service';

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    const server = app.listen(config.app.port, () => {
      logger.info(`🚀 Server started successfully`, {
        port: config.app.port,
        environment: config.app.env,
        apiVersion: config.app.apiVersion,
        nodeVersion: process.version,
      });

      if (!config.app.isProduction) {
        logger.info(`📚 API Documentation: http://localhost:${config.app.port}/api-docs`);
        logger.info(`❤️  Health Check: http://localhost:${config.app.port}/health`);
      }

      // Start IMAP poller (check for incoming emails every 2 minutes)
      imapPoller.start(2 * 60 * 1000);
    });

    // ========================================================================
    // GRACEFUL SHUTDOWN
    // ========================================================================

    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Stop IMAP poller
      imapPoller.stop();

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connection
          await disconnectDatabase();
          logger.info('Database connection closed');

          // Close Redis connection
          await closeRedisConnection();
          logger.info('Redis connection closed');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000); // 30 seconds timeout
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // ========================================================================
    // UNHANDLED ERRORS
    // ========================================================================

    process.on('unhandledRejection', (reason: Error) => {
      logger.error('Unhandled Promise Rejection', {
        error: reason.message,
        stack: reason.stack,
      });
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });

      // Exit with failure - let process manager restart
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
startServer();