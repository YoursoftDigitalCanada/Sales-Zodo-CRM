import { AnalyticsQueryDto, DashboardStatsDto } from './analytics.dto';
export declare class AnalyticsService {
    getDashboardStats(tenantId: string): Promise<DashboardStatsDto>;
    getLeadsReport(tenantId: string, query: AnalyticsQueryDto): Promise<{
        total: number;
        byStatus: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.LeadGroupByOutputType, "status"[]> & {
            _count: number;
        })[];
    }>;
    getRevenueReport(tenantId: string): Promise<{
        total: number;
        thisMonth: number;
        lastMonth: number;
        growth: number;
    }>;
}
export declare const analyticsService: AnalyticsService;
//# sourceMappingURL=analytics.service.d.ts.map