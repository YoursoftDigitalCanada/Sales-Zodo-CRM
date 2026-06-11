import { prisma } from '../../../config/database';
import { accountingCache } from '../cache/accounting-cache.service';
import { logger } from '../../../common/utils/logger';

export class AccountingQueryDispatcher {
  
  /**
   * Query: Get Dashboard Metrics
   * Fetches instantly from Redis cache or Read Model database.
   */
  async getDashboard(tenantId: string): Promise<any> {
    // 1. Try Cache
    const cached = await accountingCache.getDashboardData(tenantId);
    if (cached) {
      return { source: 'cache', data: cached };
    }

    // 2. Try Projection Table (Fast Read)
    const projection = await prisma.dashboardProjection.findUnique({
      where: { tenantId }
    });

    if (projection) {
      // Warm up the cache for next time
      await accountingCache.setDashboardData(tenantId, projection.data);
      return { source: 'projection', data: projection.data };
    }

    // 3. Fallback (Projection is building)
    return { source: 'building', data: null, message: 'Dashboard is currently computing.' };
  }

  /**
   * Query: Get Ledger by Account
   */
  async getLedgerForAccount(tenantId: string, accountId: string, month: string): Promise<any> {
    const ledger = await prisma.ledgerProjection.findUnique({
      where: { tenantId_accountId_month: { tenantId, accountId, month } }
    });
    return ledger || { balance: 0, totalDebits: 0, totalCredits: 0 };
  }

  /**
   * Query: Full Explanation Timeline
   * Uses Event Sourcing strictly to reconstruct *why* the transaction looks the way it does.
   */
  async getTransactionExplainabilityTimeline(tenantId: string, transactionId: string): Promise<any[]> {
    const events = await prisma.accountingEvent.findMany({
      where: { tenantId, aggregateId: transactionId },
      orderBy: { aggregateVersion: 'asc' }
    });

    return events.map(e => ({
      version: e.aggregateVersion,
      event: e.eventType,
      timestamp: e.createdAt,
      details: e.payload,
    }));
  }
}

export const accountingQueries = new AccountingQueryDispatcher();
