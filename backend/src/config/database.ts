import { PrismaClient } from '@prisma/client';
import { config } from './index';
import { logger } from '../common/utils/logger';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: config.app.isDevelopment 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
    errorFormat: 'pretty',
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (!config.app.isProduction) {
  globalThis.prisma = prisma;
}

// Connection helper
export async function connectDatabase(): Promise<void> {
  const maxAttempts = Math.max(1, config.database.connectRetries);
  const retryDelayMs = Math.max(0, config.database.connectRetryDelayMs);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      logger.info('✅ Database connected successfully');
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      logger.error(`❌ Database connection attempt ${attempt}/${maxAttempts} failed`, { error });

      if (isLastAttempt) {
        logger.error(
          'Database unavailable. Ensure PostgreSQL is running and DATABASE_URL is correct.'
        );
        process.exit(1);
      }

      logger.warn(`Retrying database connection in ${retryDelayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
}

// Disconnection helper
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
