import { ClientLifecycleStage } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../utils/logger';
import { eventBus } from '../events/event-bus';

/**
 * Forward-only lifecycle progression order.
 * Index determines "rank" — a client can only move forward
 * unless a special transition is explicitly allowed.
 */
const PROGRESSION_ORDER: ClientLifecycleStage[] = [
    'NEW_CUSTOMER',
    'ONBOARDING',
    'ACTIVE',
    'AT_RISK',
    'CHURNED',
    'RE_ENGAGED',
    'VIP',
];

/**
 * Special transitions that bypass forward-only progression.
 * Key = current stage, Value = set of allowed target stages.
 */
const SPECIAL_TRANSITIONS: Partial<Record<ClientLifecycleStage, Set<ClientLifecycleStage>>> = {
    CHURNED: new Set(['RE_ENGAGED']),
    AT_RISK: new Set(['ACTIVE', 'RE_ENGAGED']),
    ACTIVE: new Set(['VIP', 'AT_RISK']),
    VIP: new Set(['AT_RISK', 'CHURNED']),
};

// ── Behavioral Thresholds ────────────────────────────────────────────────

/** Days without any booking/project/invoice before marking AT_RISK */
const INACTIVITY_THRESHOLD_DAYS = 90;

/** Minimum completed engagements (bookings + projects + paid invoices) for VIP */
const VIP_ENGAGEMENT_THRESHOLD = 10;

function stageRank(stage: ClientLifecycleStage): number {
    return PROGRESSION_ORDER.indexOf(stage);
}

/**
 * Centralized, idempotent client lifecycle service.
 *
 * Rules:
 * 1. Forward-only progression by default (rank-based).
 * 2. Same-stage transitions are silent no-ops.
 * 3. Special transitions (e.g. CHURNED → RE_ENGAGED) are allowed explicitly.
 * 4. Non-blocking: failures are logged but never throw to the caller.
 */
class ClientLifecycleService {
    /**
     * Attempt to progress a client to `targetStage`.
     * Idempotent — no-op if client is already at or past the target.
     */
    async progressTo(
        clientId: string,
        tenantId: string,
        targetStage: ClientLifecycleStage,
    ): Promise<void> {
        try {
            const client = await prisma.client.findFirst({
                where: { id: clientId, tenantId },
                select: { id: true, lifecycleStage: true },
            });

            if (!client) {
                logger.warn('[ClientLifecycle] Client not found, skipping', { clientId, tenantId });
                return;
            }

            const currentStage = client.lifecycleStage;

            // Already at target — no-op
            if (currentStage === targetStage) {
                return;
            }

            const currentRank = stageRank(currentStage);
            const targetRank = stageRank(targetStage);

            // Check if this is a special allowed transition
            const isSpecial = SPECIAL_TRANSITIONS[currentStage]?.has(targetStage) ?? false;

            // Block backward progression unless it's a special transition
            if (targetRank <= currentRank && !isSpecial) {
                logger.debug('[ClientLifecycle] Skipping backward transition', {
                    clientId, currentStage, targetStage,
                });
                return;
            }

            // Apply the transition
            const updated = await prisma.client.update({
                where: { id: clientId },
                data: { lifecycleStage: targetStage },
                select: { id: true, clientName: true, lifecycleStage: true },
            });

            // Emit lifecycle changed event for automation workflows
            eventBus.emit('client.lifecycleChanged', {
                tenantId,
                clientId,
                clientName: updated.clientName || undefined,
                previousStage: currentStage,
                newStage: targetStage,
                trigger: 'progressTo',
            });

            logger.info('[ClientLifecycle] Stage updated', {
                clientId, tenantId,
                from: currentStage,
                to: targetStage,
            });
        } catch (err) {
            // Non-blocking: lifecycle updates must never break the calling flow
            logger.error('[ClientLifecycle] Failed to update stage', {
                clientId, tenantId, targetStage, err,
            });
        }
    }

    // ── Behavioral Intelligence ──────────────────────────────────────────

    /**
     * Evaluate a client's activity level and transition to AT_RISK
     * if no recent engagements (bookings, projects, paid invoices)
     * within the inactivity threshold.
     *
     * Should be called periodically (e.g. via cron or scheduled job)
     * for all ACTIVE / VIP clients in a tenant.
     *
     * Idempotent and non-blocking.
     */
    async evaluateActivity(clientId: string, tenantId: string): Promise<void> {
        try {
            const client = await prisma.client.findFirst({
                where: { id: clientId, tenantId },
                select: { id: true, lifecycleStage: true, clientName: true },
            });

            if (!client) return;

            // Only evaluate ACTIVE or VIP clients for inactivity
            if (client.lifecycleStage !== 'ACTIVE' && client.lifecycleStage !== 'VIP') {
                return;
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_THRESHOLD_DAYS);

            // Count recent engagements across bookings, projects, and invoices
            const [recentBookings, recentProjects, recentInvoices] = await Promise.all([
                prisma.booking.count({
                    where: { clientId, tenantId, createdAt: { gte: cutoffDate } },
                }),
                prisma.project.count({
                    where: { clientId, tenantId, createdAt: { gte: cutoffDate } },
                }),
                prisma.invoice.count({
                    where: { clientId, tenantId, createdAt: { gte: cutoffDate } },
                }),
            ]);

            const totalRecent = recentBookings + recentProjects + recentInvoices;

            if (totalRecent === 0) {
                const previousStage = client.lifecycleStage;
                await this.progressTo(clientId, tenantId, 'AT_RISK');

                // Emit lifecycle event for automation workflows
                eventBus.emit('lifecycle.atRisk', {
                    tenantId,
                    clientId,
                    clientName: client.clientName,
                    previousStage,
                    inactivityDays: INACTIVITY_THRESHOLD_DAYS,
                });

                logger.info('[ClientLifecycle] Client marked AT_RISK due to inactivity', {
                    clientId,
                    tenantId,
                    previousStage,
                    inactivityDays: INACTIVITY_THRESHOLD_DAYS,
                });
            }
        } catch (err) {
            logger.error('[ClientLifecycle] evaluateActivity failed', { clientId, tenantId, err });
        }
    }

    /**
     * Reinforce engagement signals for a client. Call this after
     * any positive engagement event (booking confirmed, project created,
     * invoice paid) to:
     *
     * 1. Re-activate AT_RISK → ACTIVE (immediate recovery)
     * 2. Promote ACTIVE → VIP when engagement threshold is met
     *
     * Idempotent and non-blocking.
     */
    async reinforceEngagement(clientId: string, tenantId: string): Promise<void> {
        try {
            const client = await prisma.client.findFirst({
                where: { id: clientId, tenantId },
                select: { id: true, lifecycleStage: true },
            });

            if (!client) return;

            // AT_RISK client just engaged → recover to ACTIVE
            if (client.lifecycleStage === 'AT_RISK') {
                await this.progressTo(clientId, tenantId, 'ACTIVE');
                logger.info('[ClientLifecycle] AT_RISK client re-activated', { clientId, tenantId });
                return;
            }

            // RE_ENGAGED client engaging again → promote to ACTIVE
            if (client.lifecycleStage === 'RE_ENGAGED') {
                await this.progressTo(clientId, tenantId, 'ACTIVE');
                logger.info('[ClientLifecycle] RE_ENGAGED client promoted to ACTIVE', { clientId, tenantId });
                return;
            }

            // ACTIVE client → evaluate for VIP promotion
            if (client.lifecycleStage === 'ACTIVE') {
                const [bookingCount, projectCount, invoiceCount] = await Promise.all([
                    prisma.booking.count({ where: { clientId, tenantId } }),
                    prisma.project.count({ where: { clientId, tenantId } }),
                    prisma.invoice.count({
                        where: { clientId, tenantId, status: 'PAID' },
                    }),
                ]);

                const totalEngagements = bookingCount + projectCount + invoiceCount;

                if (totalEngagements >= VIP_ENGAGEMENT_THRESHOLD) {
                    await this.progressTo(clientId, tenantId, 'VIP');
                    logger.info('[ClientLifecycle] Client promoted to VIP', {
                        clientId,
                        tenantId,
                        totalEngagements,
                        threshold: VIP_ENGAGEMENT_THRESHOLD,
                    });
                }
            }
        } catch (err) {
            logger.error('[ClientLifecycle] reinforceEngagement failed', { clientId, tenantId, err });
        }
    }

    /**
     * Full lifecycle evaluation for a single client.
     * Combines inactivity detection and engagement reinforcement.
     * Intended for batch/cron execution.
     */
    async evaluateClientLifecycle(clientId: string, tenantId: string): Promise<void> {
        await this.evaluateActivity(clientId, tenantId);
        await this.reinforceEngagement(clientId, tenantId);
    }
}

export const clientLifecycleService = new ClientLifecycleService();
