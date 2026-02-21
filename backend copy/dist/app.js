"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const config_1 = require("./config");
// Middleware imports
const middleware_1 = require("./common/middleware");
// Route imports
const routes_1 = require("./routes");
// Swagger
const swagger_1 = require("./config/swagger");
/**
 * Create and configure Express application
 */
function createApp() {
    const app = (0, express_1.default)();
    // =========================================================================
    // SECURITY MIDDLEWARE
    // =========================================================================
    // Helmet for security headers
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: config_1.config.app.isProduction ? undefined : false,
        crossOriginEmbedderPolicy: false,
    }));
    // CORS
    app.use(middleware_1.corsMiddleware);
    app.use(middleware_1.corsErrorHandler);
    // =========================================================================
    // PARSING MIDDLEWARE
    // =========================================================================
    // Body parsing
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Compression
    app.use((0, compression_1.default)());
    // =========================================================================
    // REQUEST TRACKING MIDDLEWARE
    // =========================================================================
    // Request ID
    app.use(middleware_1.requestId);
    // Request timing
    app.use(middleware_1.requestTiming);
    // Request logging
    app.use(middleware_1.requestLogger);
    // =========================================================================
    // RATE LIMITING
    // =========================================================================
    // Apply default rate limiter to all routes
    app.use(middleware_1.defaultRateLimiter);
    // =========================================================================
    // HEALTH CHECK (before auth)
    // =========================================================================
    app.get('/health', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'OK',
            timestamp: new Date().toISOString(),
            environment: config_1.config.app.env,
        });
    });
    app.get('/api/health', async (req, res) => {
        try {
            // Check database connection
            const { checkDatabaseHealth } = await Promise.resolve().then(() => __importStar(require('./config/database')));
            const dbHealthy = await checkDatabaseHealth();
            res.status(dbHealthy ? 200 : 503).json({
                success: dbHealthy,
                message: dbHealthy ? 'All systems operational' : 'Database connection failed',
                timestamp: new Date().toISOString(),
                environment: config_1.config.app.env,
                version: process.env.npm_package_version || '1.0.0',
                services: {
                    database: dbHealthy ? 'healthy' : 'unhealthy',
                },
            });
        }
        catch (error) {
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
    if (!config_1.config.app.isProduction) {
        (0, swagger_1.setupSwagger)(app);
    }
    // =========================================================================
    // API ROUTES
    // =========================================================================
    (0, routes_1.registerRoutes)(app);
    // =========================================================================
    // ERROR HANDLING
    // =========================================================================
    // 404 handler
    app.use(middleware_1.notFoundHandler);
    // Global error handler
    app.use(middleware_1.errorHandler);
    return app;
}
// Export configured app
exports.app = createApp();
//# sourceMappingURL=app.js.map