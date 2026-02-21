"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.checkDatabaseHealth = checkDatabaseHealth;
const client_1 = require("@prisma/client");
const index_1 = require("./index");
const logger_1 = require("../common/utils/logger");
const prismaClientSingleton = () => {
    return new client_1.PrismaClient({
        log: index_1.config.app.isDevelopment
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
        errorFormat: 'pretty',
    });
};
exports.prisma = globalThis.prisma ?? prismaClientSingleton();
if (!index_1.config.app.isProduction) {
    globalThis.prisma = exports.prisma;
}
// Connection helper
async function connectDatabase() {
    const maxAttempts = Math.max(1, index_1.config.database.connectRetries);
    const retryDelayMs = Math.max(0, index_1.config.database.connectRetryDelayMs);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await exports.prisma.$connect();
            logger_1.logger.info('✅ Database connected successfully');
            return;
        }
        catch (error) {
            const isLastAttempt = attempt === maxAttempts;
            logger_1.logger.error(`❌ Database connection attempt ${attempt}/${maxAttempts} failed`, { error });
            if (isLastAttempt) {
                logger_1.logger.error('Database unavailable. Ensure PostgreSQL is running and DATABASE_URL is correct.');
                process.exit(1);
            }
            logger_1.logger.warn(`Retrying database connection in ${retryDelayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
    }
}
// Disconnection helper
async function disconnectDatabase() {
    await exports.prisma.$disconnect();
    logger_1.logger.info('Database disconnected');
}
// Health check
async function checkDatabaseHealth() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=database.js.map