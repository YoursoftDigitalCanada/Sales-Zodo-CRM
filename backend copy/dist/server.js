"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const logger_1 = require("./common/utils/logger");
// ============================================================================
// SERVER STARTUP
// ============================================================================
async function startServer() {
    try {
        // Connect to database
        await (0, database_1.connectDatabase)();
        // Start HTTP server
        const server = app_1.app.listen(config_1.config.app.port, () => {
            logger_1.logger.info(`🚀 Server started successfully`, {
                port: config_1.config.app.port,
                environment: config_1.config.app.env,
                apiVersion: config_1.config.app.apiVersion,
                nodeVersion: process.version,
            });
            if (!config_1.config.app.isProduction) {
                logger_1.logger.info(`📚 API Documentation: http://localhost:${config_1.config.app.port}/api-docs`);
                logger_1.logger.info(`❤️  Health Check: http://localhost:${config_1.config.app.port}/health`);
            }
        });
        // ========================================================================
        // GRACEFUL SHUTDOWN
        // ========================================================================
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`${signal} received. Starting graceful shutdown...`);
            // Stop accepting new connections
            server.close(async () => {
                logger_1.logger.info('HTTP server closed');
                try {
                    // Close database connection
                    await (0, database_1.disconnectDatabase)();
                    logger_1.logger.info('Database connection closed');
                    // Close Redis connection
                    await (0, redis_1.closeRedisConnection)();
                    logger_1.logger.info('Redis connection closed');
                    logger_1.logger.info('Graceful shutdown completed');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.logger.error('Error during graceful shutdown', { error });
                    process.exit(1);
                }
            });
            // Force shutdown after timeout
            setTimeout(() => {
                logger_1.logger.error('Forced shutdown due to timeout');
                process.exit(1);
            }, 30000); // 30 seconds timeout
        };
        // Listen for shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // ========================================================================
        // UNHANDLED ERRORS
        // ========================================================================
        process.on('unhandledRejection', (reason) => {
            logger_1.logger.error('Unhandled Promise Rejection', {
                error: reason.message,
                stack: reason.stack,
            });
        });
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception', {
                error: error.message,
                stack: error.stack,
            });
            // Exit with failure - let process manager restart
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', { error });
        process.exit(1);
    }
}
// Start the server
startServer();
//# sourceMappingURL=server.js.map