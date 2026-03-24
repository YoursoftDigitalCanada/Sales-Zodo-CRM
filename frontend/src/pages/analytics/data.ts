import {
    BarChart3, TrendingUp, Users, DollarSign, Target, Briefcase,
    ArrowUpRight, ArrowDownRight, Clock, Zap, Eye, MousePointerClick,
    type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export type AnalyticsTab = "overview" | "sales" | "pipeline" | "team" | "forecasting";

export interface AnalyticsTabItem {
    id: AnalyticsTab;
    label: string;
    icon: LucideIcon;
}

export interface KpiCard {
    label: string;
    value: string;
    change: string;
    trend: "up" | "down";
    icon: LucideIcon;
    color: string;
}

export interface RevenueDataPoint {
    month: string;
    revenue: number;
    target: number;
    deals: number;
}

export interface PipelineStage {
    name: string;
    count: number;
    value: string;
    conversion: number;
    color: string;
    avgDays: number;
}

export interface TopDeal {
    id: string;
    name: string;
    company: string;
    value: string;
    stage: string;
    probability: number;
    owner: string;
    closeDate: string;
}

export interface TeamPerformance {
    id: string;
    name: string;
    avatar: string;
    dealsWon: number;
    dealsClosed: number;
    revenue: string;
    quota: number;
    activities: number;
    winRate: number;
}

export interface LeadSource {
    name: string;
    leads: number;
    converted: number;
    revenue: string;
    color: string;
}

export interface ActivityMetric {
    label: string;
    today: number;
    thisWeek: number;
    thisMonth: number;
    icon: LucideIcon;
}

export interface ForecastQuarter {
    quarter: string;
    committed: number;
    bestCase: number;
    pipeline: number;
    target: number;
}

// ============================================
// TABS (kept — these are structural, not data)
// ============================================

export const analyticsTabs: AnalyticsTabItem[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "sales", label: "Sales Analytics", icon: DollarSign },
    { id: "pipeline", label: "Pipeline", icon: Target },
    { id: "team", label: "Team Performance", icon: Users },
    { id: "forecasting", label: "Forecasting", icon: TrendingUp },
];

// ============================================
// EMPTY DEFAULTS — shown while loading / when no data exists
// ============================================

export const kpiCards: KpiCard[] = [
    { label: "Total Revenue", value: "$0", change: "0%", trend: "up", icon: DollarSign, color: "#0891B2" },
    { label: "Deals Won", value: "0", change: "0%", trend: "up", icon: Briefcase, color: "#16A34A" },
    { label: "Conversion Rate", value: "0%", change: "0%", trend: "up", icon: Target, color: "#7C3AED" },
    { label: "Avg. Deal Size", value: "$0", change: "0%", trend: "up", icon: TrendingUp, color: "#D97706" },
];

export const revenueData: RevenueDataPoint[] = [];

export const pipelineStages: PipelineStage[] = [];

export const topDeals: TopDeal[] = [];

export const teamPerformance: TeamPerformance[] = [];

export const leadSources: LeadSource[] = [];

export const activityMetrics: ActivityMetric[] = [];

export const forecastData: ForecastQuarter[] = [];
