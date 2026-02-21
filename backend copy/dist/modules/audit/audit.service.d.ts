import { AuditAction } from '@prisma/client';
import { CreateAuditLogDto, AuditLogQueryDto, AuditLogResponseDto } from './audit.dto';
import { Request } from 'express';
export declare class AuditService {
    /**
     * Log an audit event
     */
    log(data: CreateAuditLogDto): Promise<void>;
    /**
     * Log an audit event with context from request
     */
    logWithContext(req: Request, action: AuditAction, module: string, description: string, options?: {
        entityType?: string;
        entityId?: string;
        oldValues?: Record<string, any>;
        newValues?: Record<string, any>;
    }): Promise<void>;
    /**
     * Log entity creation
     */
    logCreate(req: Request, module: string, entityType: string, entityId: string, newValues: Record<string, any>): Promise<void>;
    /**
     * Log entity update
     */
    logUpdate(req: Request, module: string, entityType: string, entityId: string, oldValues: Record<string, any>, newValues: Record<string, any>): Promise<void>;
    /**
     * Log entity deletion
     */
    logDelete(req: Request, module: string, entityType: string, entityId: string, oldValues?: Record<string, any>): Promise<void>;
    /**
     * Log status change
     */
    logStatusChange(req: Request, module: string, entityType: string, entityId: string, oldStatus: string, newStatus: string): Promise<void>;
    /**
     * Log permission change
     */
    logPermissionChange(req: Request, entityType: string, entityId: string, description: string, oldPermissions?: string[], newPermissions?: string[]): Promise<void>;
    /**
     * Get audit logs
     */
    getAuditLogs(tenantId: string, query: AuditLogQueryDto): Promise<{
        data: AuditLogResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Get audit log by ID
     */
    getAuditLogById(id: string, tenantId: string): Promise<AuditLogResponseDto | null>;
    /**
     * Get audit history for an entity
     */
    getEntityHistory(tenantId: string, entityType: string, entityId: string, limit?: number): Promise<AuditLogResponseDto[]>;
    /**
     * Get audit statistics
     */
    getStatistics(tenantId: string, days?: number): Promise<{
        byAction: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.AuditLogGroupByOutputType, "action"[]> & {
            _count: {
                action: number;
            };
        })[];
        byModule: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.AuditLogGroupByOutputType, "module"[]> & {
            _count: {
                module: number;
            };
        })[];
        byUser: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.AuditLogGroupByOutputType, "userId"[]> & {
            _count: {
                userId: number;
            };
        })[];
    }>;
    /**
     * Cleanup old audit logs
     */
    cleanup(tenantId: string, retentionDays?: number): Promise<number>;
    /**
     * Extract audit context from request
     */
    private extractContext;
    /**
     * Get changes between old and new values
     */
    private getChanges;
    /**
     * Sanitize values for logging (remove sensitive data)
     */
    private sanitizeValues;
    /**
     * Convert to response DTO
     */
    private toResponseDto;
}
export declare const auditService: AuditService;
//# sourceMappingURL=audit.service.d.ts.map