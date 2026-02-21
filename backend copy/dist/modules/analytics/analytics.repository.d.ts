import { AnalyticsQueryDto } from './analytics.dto';
export declare class AnalyticsRepository {
    getLeadStats(tenantId: string, query: AnalyticsQueryDto): Promise<{
        total: number;
        byStatus: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.LeadGroupByOutputType, "status"[]> & {
            _count: number;
        })[];
    }>;
    getClientStats(tenantId: string): Promise<{
        total: number;
        active: number;
    }>;
    getTaskStats(tenantId: string): Promise<{
        total: number;
        completed: number;
        overdue: number;
        completionRate: number;
    }>;
    getProjectStats(tenantId: string): Promise<{
        total: number;
        active: number;
        completed: number;
    }>;
    getRevenueStats(tenantId: string): Promise<{
        total: number;
        thisMonth: number;
        lastMonth: number;
        growth: number;
    }>;
    getExpenseStats(tenantId: string): Promise<{
        total: number;
        thisMonth: number;
        pending: number;
    }>;
}
export declare const analyticsRepository: AnalyticsRepository;
//# sourceMappingURL=analytics.repository.d.ts.map