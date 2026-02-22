// ============================================================================
// Analytics DTOs — Type-safe response shapes for all analytics endpoints
// ============================================================================

export interface AnalyticsQueryDto {
    startDate?: string;
    endDate?: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    groupBy?: 'status' | 'source' | 'assignee' | 'date';
}

// ── Dashboard ─────────────────────────────────────────────────────────

export interface DashboardStatsDto {
    leads: { total: number; new: number; converted: number; conversionRate: number };
    clients: { total: number; active: number; new: number };
    tasks: { total: number; completed: number; inProgress: number; overdue: number; completionRate: number };
    projects: { total: number; active: number; completed: number };
    revenue: { total: number; thisMonth: number; lastMonth: number; outstanding: number; growth: number };
    expenses: { total: number; thisMonth: number; pending: number };
    bookings: { total: number; pending: number; confirmed: number; cancelled: number; upcoming: number };
}

// ── Pipeline ──────────────────────────────────────────────────────────

export interface PipelineStageDto {
    status: string;
    count: number;
    value: number;
    percentage: number;
}

export interface PipelineHealthDto {
    total: number;
    stages: PipelineStageDto[];
}

// ── Lead Sources ──────────────────────────────────────────────────────

export interface LeadSourceStatDto {
    sourceId: string | null;
    sourceName: string;
    count: number;
}

// ── Revenue Trends ────────────────────────────────────────────────────

export interface MonthlyRevenueDto {
    month: string;
    revenue: number;
}

// ── Chart Formatting ──────────────────────────────────────────────────

export interface ChartDataDto {
    labels: string[];
    datasets: { label: string; data: number[]; backgroundColor?: string }[];
}

// ── Report Output ─────────────────────────────────────────────────────

export interface ReportDto {
    type: string;
    period: { start: Date; end: Date };
    data: Record<string, unknown>;
    generatedAt: Date;
}
