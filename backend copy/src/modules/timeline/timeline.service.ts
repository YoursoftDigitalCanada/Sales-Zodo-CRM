import { auditRepository } from '../audit/audit.repository';
import { prisma } from '../../config/database';
import { TimelineEventDto, TimelineQueryDto, TimelineResponseDto } from './timeline.dto';
import { logger } from '../../common/utils/logger';

// ── Human-readable title mappings ────────────────────────────────────────

const ACTION_TITLES: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    STATUS_CHANGE: 'Status Changed',
    LOGIN: 'Logged In',
    LOGOUT: 'Logged Out',
    EXPORT: 'Exported',
    IMPORT: 'Imported',
    PERMISSION_CHANGE: 'Permissions Changed',
    PASSWORD_CHANGE: 'Password Changed',
};

const ACTION_ICONS: Record<string, string> = {
    CREATE: 'plus-circle',
    UPDATE: 'edit',
    DELETE: 'trash',
    STATUS_CHANGE: 'arrow-right-left',
    LOGIN: 'log-in',
    LOGOUT: 'log-out',
    EXPORT: 'download',
    IMPORT: 'upload',
    PERMISSION_CHANGE: 'shield',
    PASSWORD_CHANGE: 'key',
};

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
    STATUS_CHANGE: 'amber',
    LOGIN: 'cyan',
    LOGOUT: 'gray',
    EXPORT: 'violet',
    IMPORT: 'violet',
    PERMISSION_CHANGE: 'orange',
    PASSWORD_CHANGE: 'orange',
};

/**
 * Timeline Service
 *
 * Aggregates AuditLog entries into a chronological, human-readable timeline.
 * Supports single-entity and cross-entity (related) timelines.
 */
export class TimelineService {
    /**
     * Get timeline for a single entity.
     * Queries AuditLog by entityType + entityId.
     */
    async getEntityTimeline(
        tenantId: string,
        entityType: string,
        entityId: string,
        query: TimelineQueryDto = {},
    ): Promise<TimelineResponseDto> {
        const page = query.page || 1;
        const limit = query.limit || 30;

        const where: any = {
            tenantId,
            entityType,
            entityId,
            ...(query.action && { action: query.action }),
            ...(query.module && { module: query.module }),
        };

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        const events = logs.map((log) => this.toTimelineEvent(log));

        return {
            data: events,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
    }

    /**
     * Get related timeline — aggregates events across linked entities.
     * For Lead: also fetch Client events if converted.
     * For Client: also fetch linked Lead, Project, and Invoice events.
     */
    async getRelatedTimeline(
        tenantId: string,
        entityType: string,
        entityId: string,
        query: TimelineQueryDto = {},
    ): Promise<TimelineResponseDto> {
        const page = query.page || 1;
        const limit = query.limit || 50;

        // Build list of entity filters to query
        const entityFilters: Array<{ entityType: string; entityId: string }> = [
            { entityType, entityId },
        ];

        try {
            if (entityType === 'Lead') {
                // If lead was converted, also get client events
                const lead = await prisma.lead.findFirst({
                    where: { id: entityId, tenantId },
                    select: { convertedToClientId: true },
                });
                if (lead?.convertedToClientId) {
                    entityFilters.push({ entityType: 'Client', entityId: lead.convertedToClientId });
                }
            } else if (entityType === 'Client') {
                // Get lead that was converted to this client
                const lead = await prisma.lead.findFirst({
                    where: { convertedToClientId: entityId, tenantId },
                    select: { id: true },
                });
                if (lead) {
                    entityFilters.push({ entityType: 'Lead', entityId: lead.id });
                }

                // Get related projects
                const projects = await prisma.project.findMany({
                    where: { clientId: entityId, tenantId },
                    select: { id: true },
                });
                projects.forEach((p) => entityFilters.push({ entityType: 'Project', entityId: p.id }));

                // Get related invoices
                const invoices = await prisma.invoice.findMany({
                    where: { clientId: entityId, tenantId },
                    select: { id: true },
                });
                invoices.forEach((inv) => entityFilters.push({ entityType: 'Invoice', entityId: inv.id }));
            }
        } catch (err) {
            logger.warn('Failed to resolve related entities for timeline', { entityType, entityId, err });
        }

        const where: any = {
            tenantId,
            OR: entityFilters.map((f) => ({
                entityType: f.entityType,
                entityId: f.entityId,
            })),
            ...(query.action && { action: query.action }),
        };

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        const events = logs.map((log) => this.toTimelineEvent(log));

        return {
            data: events,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
    }

    /**
     * Transform a raw AuditLog record into a TimelineEventDto.
     */
    private toTimelineEvent(log: any): TimelineEventDto {
        const action = log.action as string;
        const entityType = log.entityType || 'Unknown';
        const verb = ACTION_TITLES[action] || action;

        // Build human-readable title
        let title = `${entityType} ${verb}`;

        // Build description with change details
        let description = log.description || '';
        const changes: string[] = [];

        if (action === 'STATUS_CHANGE' && log.oldValues && log.newValues) {
            const oldStatus = (log.oldValues as any)?.status || (log.oldValues as any)?.oldStatus || '?';
            const newStatus = (log.newValues as any)?.status || (log.newValues as any)?.newStatus || '?';
            description = `Status changed from "${oldStatus}" to "${newStatus}"`;
            changes.push(`${oldStatus} → ${newStatus}`);
        } else if (action === 'UPDATE' && log.oldValues && log.newValues) {
            const oldVals = log.oldValues as Record<string, any>;
            const newVals = log.newValues as Record<string, any>;
            const changedKeys = Object.keys(newVals).filter(
                (k) => JSON.stringify(oldVals[k]) !== JSON.stringify(newVals[k]),
            );
            if (changedKeys.length > 0 && changedKeys.length <= 5) {
                changes.push(...changedKeys.map((k) => `${k}: "${oldVals[k] ?? '—'}" → "${newVals[k]}"`));
                description = `Updated ${changedKeys.join(', ')}`;
            } else if (changedKeys.length > 5) {
                description = `Updated ${changedKeys.length} fields`;
            }
        } else if (action === 'CREATE') {
            const newVals = log.newValues as Record<string, any>;
            const name = newVals?.name || newVals?.clientName || newVals?.title || newVals?.firstName;
            if (name) {
                title = `${entityType} Created: ${name}`;
            }
        } else if (action === 'DELETE') {
            const oldVals = log.oldValues as Record<string, any>;
            const name = oldVals?.name || oldVals?.clientName || oldVals?.title || oldVals?.firstName;
            if (name) {
                title = `${entityType} Deleted: ${name}`;
            }
        }

        return {
            id: log.id,
            action,
            title,
            description,
            icon: ACTION_ICONS[action] || 'activity',
            color: ACTION_COLORS[action] || 'gray',
            entityType,
            entityId: log.entityId || '',
            module: log.module,
            user: log.user
                ? {
                    id: log.user.id,
                    name: `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email,
                    email: log.user.email,
                }
                : null,
            metadata:
                log.oldValues || log.newValues
                    ? {
                        oldValues: log.oldValues as Record<string, any> | undefined,
                        newValues: log.newValues as Record<string, any> | undefined,
                        changes: changes.length > 0 ? changes : undefined,
                    }
                    : null,
            createdAt: log.createdAt,
        };
    }
}

export const timelineService = new TimelineService();
