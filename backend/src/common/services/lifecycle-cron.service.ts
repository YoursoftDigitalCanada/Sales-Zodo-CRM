import { prisma } from '../../config/database';
import { clientLifecycleService } from './client-lifecycle.service';
import { logger } from '../utils/logger';

// ============================================================================
// LIFECYCLE CRON — Daily tenant-isolated AT_RISK detection
// ============================================================================
//
// Runs every 24 hours (configurable via LIFECYCLE_CRON_INTERVAL_MS env var).
// For each tenant, evaluates every client that could become AT_RISK.
// The evaluateClientLifecycle() method in clientLifecycleService handles
// the individual evaluation + transition + event emission.
//
// Architecture:
//   - Tenant-isolated: each tenant is processed independently
//   - Non-blocking: errors in one tenant don't affect others
//   - Idempotent: safe to run multiple times (already AT_RISK clients are skipped)
//   - Observable: all transitions are logged and emit lifecycle events
// ============================================================================

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

class LifecycleCronService {
    private intervalId: ReturnType<typeof setInterval> | null = null;

    /**
     * Start the daily lifecycle evaluation cron.
     * Call once at application startup, after automation service initialization.
     */
    start(): void {
        const intervalMs = Number(process.env.LIFECYCLE_CRON_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

        // Run immediately on startup (deferred via setImmediate to not block boot)
        setImmediate(() => {
            this.runAllTenants().catch(err => {
                logger.error('[LifecycleCron] Initial run failed', { err });
            });
        });

        // Schedule recurring runs
        this.intervalId = setInterval(() => {
            this.runAllTenants().catch(err => {
                logger.error('[LifecycleCron] Scheduled run failed', { err });
            });
        }, intervalMs);

        const hours = Math.round(intervalMs / (60 * 60 * 1000));
        logger.info(`[LifecycleCron] Started — evaluating every ${hours}h`);
    }

    /**
     * Stop the cron (for graceful shutdown).
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info('[LifecycleCron] Stopped');
        }
    }

    /**
     * Evaluate all tenants. Each tenant is processed independently
     * so a failure in one tenant doesn't affect others.
     */
    private async runAllTenants(): Promise<void> {
        const startTime = Date.now();
        logger.info('[LifecycleCron] Starting tenant-wide lifecycle evaluation');

        try {
            // Get all active tenants
            const tenants = await prisma.tenant.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true, name: true },
            });

            let evaluated = 0;
            let transitioned = 0;

            for (const tenant of tenants) {
                try {
                    const result = await this.evaluateTenant(tenant.id);
                    evaluated += result.evaluated;
                    transitioned += result.transitioned;
                } catch (err) {
                    // Tenant-isolated: log and continue
                    logger.error('[LifecycleCron] Tenant evaluation failed', {
                        tenantId: tenant.id,
                        name: tenant.name,
                        err,
                    });
                }
            }

            const durationMs = Date.now() - startTime;
            logger.info('[LifecycleCron] Completed', {
                tenantCount: tenants.length,
                clientsEvaluated: evaluated,
                clientsTransitioned: transitioned,
                durationMs,
            });
        } catch (err) {
            logger.error('[LifecycleCron] Failed to fetch tenants', { err });
        }
    }

    /**
     * Evaluate a single tenant's clients for lifecycle transitions.
     * Returns counts for observability.
     */
    private async evaluateTenant(tenantId: string): Promise<{
        evaluated: number;
        transitioned: number;
    }> {
        // Get all clients with ACTIVE or VIP stage that could become AT_RISK
        const clients = await prisma.client.findMany({
            where: {
                tenantId,
                status: 'ACTIVE', // Only active clients (not archived/deleted)
            },
            select: { id: true },
        });

        let transitioned = 0;

        for (const client of clients) {
            try {
                // evaluateClientLifecycle combines activity check + engagement reinforcement
                // It handles the AT_RISK transition and event emission internally
                await clientLifecycleService.evaluateClientLifecycle(client.id, tenantId);
            } catch (err) {
                // Client-isolated: log and continue
                logger.error('[LifecycleCron] Client evaluation failed', {
                    clientId: client.id,
                    tenantId,
                    err,
                });
            }
        }

        return {
            evaluated: clients.length,
            transitioned,
        };
    }
}

export const lifecycleCronService = new LifecycleCronService();
