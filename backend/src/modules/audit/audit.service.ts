import { AuditAction } from '@prisma/client';
import { auditRepository } from './audit.repository';
import { 
  CreateAuditLogDto, 
  AuditLogQueryDto, 
  AuditContext,
  AuditLogResponseDto,
} from './audit.dto';
import { logger } from '../../common/utils/logger';
import { Request } from 'express';
import { getPaginationMeta } from '../../common/utils/pagination';

export class AuditService {
  /**
   * Log an audit event
   */
  async log(data: CreateAuditLogDto): Promise<void> {
    try {
      await auditRepository.create(data);
    } catch (error) {
      // Don't throw - audit logging should not break main flow
      logger.error('Failed to create audit log', { error, data });
    }
  }

  /**
   * Log an audit event with context from request
   */
  async logWithContext(
    req: Request,
    action: AuditAction,
    module: string,
    description: string,
    options: {
      entityType?: string;
      entityId?: string;
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const context = this.extractContext(req);

    if (!context.tenantId) {
      logger.warn('Cannot create audit log without tenant context');
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
  async logCreate(
    req: Request,
    module: string,
    entityType: string,
    entityId: string,
    newValues: Record<string, any>
  ): Promise<void> {
    await this.logWithContext(req, AuditAction.CREATE, module, `Created ${entityType}`, {
      entityType,
      entityId,
      newValues: this.sanitizeValues(newValues),
    });
  }

  /**
   * Log entity update
   */
  async logUpdate(
    req: Request,
    module: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): Promise<void> {
    const changes = this.getChanges(oldValues, newValues);
    
    if (Object.keys(changes.old).length === 0) {
      return; // No changes to log
    }

    await this.logWithContext(req, AuditAction.UPDATE, module, `Updated ${entityType}`, {
      entityType,
      entityId,
      oldValues: this.sanitizeValues(changes.old),
      newValues: this.sanitizeValues(changes.new),
    });
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    req: Request,
    module: string,
    entityType: string,
    entityId: string,
    oldValues?: Record<string, any>
  ): Promise<void> {
    await this.logWithContext(req, AuditAction.DELETE, module, `Deleted ${entityType}`, {
      entityType,
      entityId,
      oldValues: oldValues ? this.sanitizeValues(oldValues) : undefined,
    });
  }

  /**
   * Log status change
   */
  async logStatusChange(
    req: Request,
    module: string,
    entityType: string,
    entityId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    await this.logWithContext(
      req,
      AuditAction.STATUS_CHANGE,
      module,
      `${entityType} status changed from ${oldStatus} to ${newStatus}`,
      {
        entityType,
        entityId,
        oldValues: { status: oldStatus },
        newValues: { status: newStatus },
      }
    );
  }

  /**
   * Log permission change
   */
  async logPermissionChange(
    req: Request,
    entityType: string,
    entityId: string,
    description: string,
    oldPermissions?: string[],
    newPermissions?: string[]
  ): Promise<void> {
    await this.logWithContext(
      req,
      AuditAction.PERMISSION_CHANGE,
      'permissions',
      description,
      {
        entityType,
        entityId,
        oldValues: oldPermissions ? { permissions: oldPermissions } : undefined,
        newValues: newPermissions ? { permissions: newPermissions } : undefined,
      }
    );
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(tenantId: string, query: AuditLogQueryDto) {
    const { data, total } = await auditRepository.findMany(tenantId, query);
    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      data: data.map((log) => this.toResponseDto(log)),
      meta: getPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(id: string, tenantId: string) {
    const log = await auditRepository.findById(id, tenantId);
    return log ? this.toResponseDto(log) : null;
  }

  /**
   * Get audit history for an entity
   */
  async getEntityHistory(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit: number = 50
  ) {
    const logs = await auditRepository.findByEntity(
      tenantId,
      entityType,
      entityId,
      limit
    );
    return logs.map((log) => this.toResponseDto(log));
  }

  /**
   * Get audit statistics
   */
  async getStatistics(tenantId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return auditRepository.getStatistics(tenantId, startDate, endDate);
  }

  /**
   * Cleanup old audit logs
   */
  async cleanup(tenantId: string, retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await auditRepository.deleteOlderThan(tenantId, cutoffDate);
    
    logger.info(`Cleaned up ${result.count} audit logs`, { tenantId, retentionDays });
    
    return result.count;
  }

  /**
   * Extract audit context from request
   */
  private extractContext(req: Request): AuditContext {
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
  private getChanges(
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): { old: Record<string, any>; new: Record<string, any> } {
    const old: Record<string, any> = {};
    const _new: Record<string, any> = {};

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
  private sanitizeValues(values: Record<string, any>): Record<string, any> {
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

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(values)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeValues(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Convert to response DTO
   */
  private toResponseDto(log: any): AuditLogResponseDto {
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

export const auditService = new AuditService();
