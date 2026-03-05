import { logger } from '../../common/utils/logger';
import { leadSourceSyncService } from './lead-source-sync.service';

export class LeadSourceSyncScheduler {
  private intervalRef: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.intervalRef) return;

    const enabled = (process.env.LEAD_SOURCE_SYNC_ENABLED || 'true').toLowerCase() !== 'false';
    if (!enabled) {
      logger.info('[LeadSourceSyncScheduler] Disabled via LEAD_SOURCE_SYNC_ENABLED=false');
      return;
    }

    const intervalMinutes = Number(process.env.LEAD_SOURCE_SYNC_INTERVAL_MINUTES || '5');
    const safeMinutes = Number.isFinite(intervalMinutes) && intervalMinutes > 0 ? intervalMinutes : 5;
    const intervalMs = safeMinutes * 60 * 1000;

    this.intervalRef = setInterval(() => {
      void this.runTick();
    }, intervalMs);

    logger.info('[LeadSourceSyncScheduler] Started', {
      intervalMinutes: safeMinutes,
    });

    // Kick off one sync shortly after startup
    setTimeout(() => {
      void this.runTick();
    }, 5000);
  }

  stop(): void {
    if (!this.intervalRef) return;
    clearInterval(this.intervalRef);
    this.intervalRef = null;
    logger.info('[LeadSourceSyncScheduler] Stopped');
  }

  private async runTick(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const summary = await leadSourceSyncService.syncConnectedSources();
      logger.info('[LeadSourceSyncScheduler] Sync cycle complete', summary);
    } catch (error) {
      logger.error('[LeadSourceSyncScheduler] Sync cycle failed', {
        error: (error as Error)?.message || String(error),
      });
    } finally {
      this.isRunning = false;
    }
  }
}

export const leadSourceSyncScheduler = new LeadSourceSyncScheduler();
