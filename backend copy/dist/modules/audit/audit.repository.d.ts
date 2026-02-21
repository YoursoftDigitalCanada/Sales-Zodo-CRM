import { Prisma } from '@prisma/client';
import { CreateAuditLogDto, AuditLogQueryDto } from './audit.dto';
export declare class AuditRepository {
    /**
     * Create audit log entry
     */
    create(data: CreateAuditLogDto): Promise<{
        userId: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        description: string;
        module: string;
        action: import(".prisma/client").$Enums.AuditAction;
        userAgent: string | null;
        ipAddress: string | null;
        entityType: string | null;
        entityId: string | null;
        oldValues: Prisma.JsonValue | null;
        newValues: Prisma.JsonValue | null;
        requestMethod: string | null;
        requestPath: string | null;
    }>;
    /**
     * Create multiple audit log entries
     */
    createMany(logs: CreateAuditLogDto[]): Promise<Prisma.BatchPayload>;
    /**
     * Find audit logs with filters
     */
    findMany(tenantId: string, query: AuditLogQueryDto): Promise<{
        data: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            userId: string | null;
            tenantId: string;
            id: string;
            createdAt: Date;
            description: string;
            module: string;
            action: import(".prisma/client").$Enums.AuditAction;
            userAgent: string | null;
            ipAddress: string | null;
            entityType: string | null;
            entityId: string | null;
            oldValues: Prisma.JsonValue | null;
            newValues: Prisma.JsonValue | null;
            requestMethod: string | null;
            requestPath: string | null;
        })[];
        total: number;
    }>;
    /**
     * Find audit log by ID
     */
    findById(id: string, tenantId: string): Promise<({
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        userId: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        description: string;
        module: string;
        action: import(".prisma/client").$Enums.AuditAction;
        userAgent: string | null;
        ipAddress: string | null;
        entityType: string | null;
        entityId: string | null;
        oldValues: Prisma.JsonValue | null;
        newValues: Prisma.JsonValue | null;
        requestMethod: string | null;
        requestPath: string | null;
    }) | null>;
    /**
     * Find audit logs for a specific entity
     */
    findByEntity(tenantId: string, entityType: string, entityId: string, limit?: number): Promise<({
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        userId: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        description: string;
        module: string;
        action: import(".prisma/client").$Enums.AuditAction;
        userAgent: string | null;
        ipAddress: string | null;
        entityType: string | null;
        entityId: string | null;
        oldValues: Prisma.JsonValue | null;
        newValues: Prisma.JsonValue | null;
        requestMethod: string | null;
        requestPath: string | null;
    })[]>;
    /**
     * Delete old audit logs (for cleanup job)
     */
    deleteOlderThan(tenantId: string, date: Date): Promise<Prisma.BatchPayload>;
    /**
     * Get audit statistics
     */
    getStatistics(tenantId: string, startDate: Date, endDate: Date): Promise<{
        byAction: (Prisma.PickEnumerable<Prisma.AuditLogGroupByOutputType, "action"[]> & {
            _count: {
                action: number;
            };
        })[];
        byModule: (Prisma.PickEnumerable<Prisma.AuditLogGroupByOutputType, "module"[]> & {
            _count: {
                module: number;
            };
        })[];
        byUser: (Prisma.PickEnumerable<Prisma.AuditLogGroupByOutputType, "userId"[]> & {
            _count: {
                userId: number;
            };
        })[];
    }>;
}
export declare const auditRepository: AuditRepository;
//# sourceMappingURL=audit.repository.d.ts.map