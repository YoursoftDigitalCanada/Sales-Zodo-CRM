import { AuditAction } from '@prisma/client';
import { auditService } from '../../modules/audit/audit.service';
import { requestContextStore } from './request-context.store';
import { logger } from '../utils/logger';

/**
 * Service-layer activity logger.
 *
 * Writes to the AuditLog table (the same table the Timeline service reads)
 * without requiring an HTTP Request context. Designed for service-layer use
 * where there is no `req` object available.
 *
 * Non-blocking: failures are logged but never throw to the caller.
 */
class ActivityLogger {
    /**
     * Log a domain mutation to the unified audit/timeline store.
     */
    async log(params: {
        tenantId: string;
        entityType: string;
        entityId: string;
        action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
        module: string;
        description: string;
        userId?: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        try {
            const context = requestContextStore.get();
            const effectiveUserId = params.userId || context?.userId;
            const effectiveIp = context?.ipAddress;
            const effectiveUserAgent = context?.userAgent;
            await auditService.log({
                tenantId: params.tenantId,
                action: params.action as AuditAction,
                module: params.module,
                description: params.description,
                entityType: params.entityType,
                entityId: params.entityId,
                userId: effectiveUserId,
                ipAddress: effectiveIp,
                userAgent: effectiveUserAgent,
                requestMethod: context?.requestMethod,
                requestPath: context?.requestPath,
                newValues: params.metadata,
            });
        } catch (err) {
            // Non-blocking: timeline logging must never break the calling flow
            logger.error('[ActivityLogger] Failed to log activity', {
                entityType: params.entityType,
                entityId: params.entityId,
                action: params.action,
                err,
            });
        }
    }
}

export const activityLogger = new ActivityLogger();
