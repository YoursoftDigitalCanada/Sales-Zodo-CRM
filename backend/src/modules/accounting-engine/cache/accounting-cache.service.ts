import { getRedisClient } from '../../../config/redis';
import { logger } from '../../../common/utils/logger';

/**
 * Provides isolated namespaces and typed access for Accounting Engine Redis keys.
 */
export class AccountingCacheService {
  private redis = getRedisClient();

  // Namespaces defined in architecture
  private readonly PREFIX = 'accounting:';
  private readonly NS_MERCHANT = `${this.PREFIX}merchant:`;
  private readonly NS_KNOWLEDGE = `${this.PREFIX}knowledge:`;
  private readonly NS_OPENAI = `${this.PREFIX}openai:`;
  private readonly NS_PROJECTION = `${this.PREFIX}projection:`;
  private readonly NS_DASHBOARD = `${this.PREFIX}dashboard:`;

  private isConnected(): boolean {
    return this.redis !== null;
  }

  // --- Merchant Intelligence Cache ---
  async getMerchantRule(tenantId: string, ruleHash: string): Promise<any | null> {
    if (!this.isConnected()) return null;
    try {
      const key = `${this.NS_MERCHANT}${tenantId}:${ruleHash}`;
      const data = await this.redis!.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      logger.warn(`Failed to get merchant rule from cache: ${e}`);
      return null;
    }
  }

  async setMerchantRule(tenantId: string, ruleHash: string, data: any, ttlSeconds: number = 86400): Promise<void> {
    if (!this.isConnected()) return;
    try {
      const key = `${this.NS_MERCHANT}${tenantId}:${ruleHash}`;
      await this.redis!.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (e) {
      logger.warn(`Failed to set merchant rule in cache: ${e}`);
    }
  }

  // --- OpenAI Deduplication Cache ---
  async getOpenAICall(hash: string): Promise<any | null> {
    if (!this.isConnected()) return null;
    try {
      const key = `${this.NS_OPENAI}${hash}`;
      const data = await this.redis!.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  async setOpenAICall(hash: string, data: any, ttlSeconds: number = 2592000): Promise<void> { // 30 days
    if (!this.isConnected()) return;
    try {
      const key = `${this.NS_OPENAI}${hash}`;
      await this.redis!.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (e) {}
  }

  // --- Projection / Dashboard Caches ---
  async invalidateProjections(tenantId: string): Promise<void> {
    if (!this.isConnected()) return;
    try {
      const keys = await this.redis!.keys(`${this.NS_PROJECTION}${tenantId}:*`);
      const dashKeys = await this.redis!.keys(`${this.NS_DASHBOARD}${tenantId}:*`);
      const allKeys = [...keys, ...dashKeys];
      
      if (allKeys.length > 0) {
        await this.redis!.del(...allKeys);
      }
    } catch (e) {
      logger.warn(`Failed to invalidate projections: ${e}`);
    }
  }

  async getDashboardData(tenantId: string): Promise<any | null> {
    if (!this.isConnected()) return null;
    try {
      const key = `${this.NS_DASHBOARD}${tenantId}`;
      const data = await this.redis!.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  async setDashboardData(tenantId: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.isConnected()) return;
    try {
      const key = `${this.NS_DASHBOARD}${tenantId}`;
      await this.redis!.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (e) {}
  }
}

export const accountingCache = new AccountingCacheService();
