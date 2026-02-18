export interface AnalyticsQueryDto {
    startDate?: string;
    endDate?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    groupBy?: 'status' | 'source' | 'assignee' | 'date';
}

export interface DashboardStatsDto {
    leads: { total: number; new: number; converted: number; conversionRate: number };
    clients: { total: number; active: number; new: number };
    tasks: { total: number; completed: number; overdue: number; completionRate: number };
    projects: { total: number; active: number; completed: number };
    revenue: { total: number; thisMonth: number; lastMonth: number; growth: number };
    expenses: { total: number; thisMonth: number; pending: number };
}

export interface ChartDataDto {
    labels: string[];
    datasets: { label: string; data: number[]; backgroundColor?: string }[];
}

export interface ReportDto {
    type: string;
    period: { start: Date; end: Date };
    data: Record<string, unknown>;
    generatedAt: Date;
}
