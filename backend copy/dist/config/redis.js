"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.closeRedisConnection = closeRedisConnection;
const ioredis_1 = __importDefault(require("ioredis"));
const index_1 = require("./index");
const logger_1 = require("../common/utils/logger");
let redis = null;
function getRedisClient() {
    if (!index_1.config.redis.url) {
        logger_1.logger.warn('Redis URL not configured, some features may be limited');
        return null;
    }
    if (!redis) {
        redis = new ioredis_1.default(index_1.config.redis.url, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    logger_1.logger.error('Redis connection failed after 3 retries');
                    return null;
                }
                return Math.min(times * 200, 1000);
            },
        });
        redis.on('connect', () => {
            logger_1.logger.info('✅ Redis connected successfully');
        });
        redis.on('error', (error) => {
            logger_1.logger.error('❌ Redis error:', error);
        });
    }
    return redis;
}
async function closeRedisConnection() {
    if (redis) {
        await redis.quit();
        redis = null;
        logger_1.logger.info('Redis connection closed');
    }
}
//# sourceMappingURL=redis.js.map