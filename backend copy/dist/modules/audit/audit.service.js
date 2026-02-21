"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const client_1 = require("@prisma/client");
const audit_repository_1 = require("./audit.repository");
const logger_1 = require("../../common/utils/logger");
class AuditService {
    /**
     * Log an audit event
     */
    async log(data) {
        try {
            await audit_repository_1.auditRepository.create(data);
        }
        catch (error) {
            // Don't throw - audit logging should not break main flow
            logger_1.logger.error('Failed to create audit log', { error, data });
        }
    }
    /**
     * Log an audit event with context from request
     */
    async logWithContext(req, action, module, description, options = {}) {
        const context = this.extractContext(req);
        if (!context.tenantId) {
            logger_1.logger.warn('Cannot create audit log without tenant context');
            return;
        }
        await this.log({
            action,
            module,
            description,
            entityType: options.entityType,
            entityId: options.entityId,
            oldValues: options.oldValues,
            newValues: options.newValues,
            userId: context.userId,
            tenantId: context.tenantId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            requestMethod: context.requestMethod,
            requestPath: context.requestPath,
        });
    }
    /**
     * Log entity creation
     */
    async logCreate(req, module, entityType, entityId, newValues) {
        await this.logWithContext(req, client_1.AuditAction.CREATE, module, `Created ${entityType}`, {
            entityType,
            entityId,
            newValues: this.sanitizeValues(newValues),
        });
    }
    /**
     * Log entity update
     */
    async logUpdate(req, module, entityType, entityId, oldValues, newValues) {
        const changes = this.getChanges(oldValues, newValues);
        if (Object.keys(changes.old).length === 0) {
            return; // No changes to log
        }
        await this.logWithContext(req, client_1.AuditAction.UPDATE, module, `Updated ${entityType}`, {
            entityType,
            entityId,
            oldValues: this.sanitizeValues(changes.old),
            newValues: this.sanitizeValues(changes.new),
        });
    }
    /**
     * Log entity deletion
     */
    async logDelete(req, module, entityType, entityId, oldValues) {
        await this.logWithContext(req, client_1.AuditAction.DELETE, module, `Deleted ${entityType}`, {
            entityType,
            entityId,
            oldValues: oldValues ? this.sanitizeValues(oldValues) : undefined,
        });
    }
    /**
     * Log status change
     */
    async logStatusChange(req, module, entityType, entityId, oldStatus, newStatus) {
        await this.logWithContext(req, client_1.AuditAction.STATUS_CHANGE, module, `${entityType} status changed from ${oldStatus} to ${newStatus}`, {
            entityType,
            entityId,
            oldValues: { status: oldStatus },
            newValues: { status: newStatus },
        });
    }
    /**
     * Log permission change
     */
    async logPermissionChange(req, entityType, entityId, description, oldPermissions, newPermissions) {
        await this.logWithContext(req, client_1.AuditAction.PERMISSION_CHANGE, 'permissions', description, {
            entityType,
            entityId,
            oldValues: oldPermissions ? { permissions: oldPermissions } : undefined,
            newValues: newPermissions ? { permissions: newPermissions } : undefined,
        });
    }
    /**
     * Get audit logs
     */
    async getAuditLogs(tenantId, query) {
        const { data, total } = await audit_repository_1.auditRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        return {
            data: data.map((log) => this.toResponseDto(log)),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get audit log by ID
     */
    async getAuditLogById(id, tenantId) {
        const log = await audit_repository_1.auditRepository.findById(id, tenantId);
        return log ? this.toResponseDto(log) : null;
    }
    /**
     * Get audit history for an entity
     */
    async getEntityHistory(tenantId, entityType, entityId, limit = 50) {
        const logs = await audit_repository_1.auditRepository.findByEntity(tenantId, entityType, entityId, limit);
        return logs.map((log) => this.toResponseDto(log));
    }
    /**
     * Get audit statistics
     */
    async getStatistics(tenantId, days = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return audit_repository_1.auditRepository.getStatistics(tenantId, startDate, endDate);
    }
    /**
     * Cleanup old audit logs
     */
    async cleanup(tenantId, retentionDays = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const result = await audit_repository_1.auditRepository.deleteOlderThan(tenantId, cutoffDate);
        logger_1.logger.info(`Cleaned up ${result.count} audit logs`, { tenantId, retentionDays });
        return result.count;
    }
    /**
     * Extract audit context from request
     */
    extractContext(req) {
        return {
            userId: req.user?.userId,
            tenantId: req.user?.tenantId || '',
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.path,
        };
    }
    /**
     * Get changes between old and new values
     */
    getChanges(oldValues, newValues) {
        const old = {};
        const _new = {};
        for (const key of Object.keys(newValues)) {
            if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
                old[key] = oldValues[key];
                _new[key] = newValues[key];
            }
        }
        return { old, new: _new };
    }
    /**
     * Sanitize values for logging (remove sensitive data)
     */
    sanitizeValues(values) {
        const sensitiveFields = [
            'password',
            'passwordHash',
            'token',
            'refreshToken',
            'accessToken',
            'secret',
            'apiKey',
            'creditCard',
            'ssn',
        ];
        const sanitized = {};
        for (const [key, value] of Object.entries(values)) {
            if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeValues(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Convert to response DTO
     */
    toResponseDto(log) {
        return {
            id: log.id,
            action: log.action,
            module: log.module,
            description: log.description,
            entityType: log.entityType || undefined,
            entityId: log.entityId || undefined,
            oldValues: log.oldValues || undefined,
            newValues: log.newValues || undefined,
            ipAddress: log.ipAddress || undefined,
            userAgent: log.userAgent || undefined,
            requestMethod: log.requestMethod || undefined,
            requestPath: log.requestPath || undefined,
            user: log.user
                ? {
                    id: log.user.id,
                    email: log.user.email,
                    firstName: log.user.firstName,
                    lastName: log.user.lastName,
                }
                : undefined,
            createdAt: log.createdAt,
        };
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
//# sourceMappingURL=audit.service.js.map