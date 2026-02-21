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
// DATA
// ============================================

export const analyticsTabs: AnalyticsTabItem[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "sales", label: "Sales Analytics", icon: DollarSign },
    { id: "pipeline", label: "Pipeline", icon: Target },
    { id: "team", label: "Team Performance", icon: Users },
    { id: "forecasting", label: "Forecasting", icon: TrendingUp },
];

export const kpiCards: KpiCard[] = [
    { label: "Total Revenue", value: "$2.4M", change: "+18.2%", trend: "up", icon: DollarSign, color: "#0891B2" },
    { label: "Deals Won", value: "148", change: "+12.5%", trend: "up", icon: Briefcase, color: "#16A34A" },
    { label: "Conversion Rate", value: "32.6%", change: "+4.1%", trend: "up", icon: Target, color: "#7C3AED" },
    { label: "Avg. Deal Size", value: "$16.2K", change: "-2.3%", trend: "down", icon: TrendingUp, color: "#D97706" },
];

export const revenueData: RevenueDataPoint[] = [
    { month: "Jan", revenue: 180000, target: 200000, deals: 12 },
    { month: "Feb", revenue: 220000, target: 200000, deals: 15 },
    { month: "Mar", revenue: 195000, target: 210000, deals: 14 },
    { month: "Apr", revenue: 260000, target: 220000, deals: 18 },
    { month: "May", revenue: 240000, target: 230000, deals: 16 },
    { month: "Jun", revenue: 310000, target: 250000, deals: 22 },
    { month: "Jul", revenue: 285000, target: 260000, deals: 19 },
    { month: "Aug", revenue: 320000, target: 270000, deals: 24 },
    { month: "Sep", revenue: 290000, target: 280000, deals: 20 },
    { month: "Oct", revenue: 350000, target: 300000, deals: 26 },
    { month: "Nov", revenue: 380000, target: 310000, deals: 28 },
    { month: "Dec", revenue: 410000, target: 320000, deals: 30 },
];

export const pipelineStages: PipelineStage[] = [
    { name: "Leads", count: 342, value: "$5.4M", conversion: 100, color: "#94A3B8", avgDays: 0 },
    { name: "Qualified", count: 186, value: "$3.8M", conversion: 54.4, color: "#0891B2", avgDays: 3 },
    { name: "Proposal", count: 94, value: "$2.1M", conversion: 27.5, color: "#7C3AED", avgDays: 7 },
    { name: "Negotiation", count: 52, value: "$1.4M", conversion: 15.2, color: "#D97706", avgDays: 12 },
    { name: "Closed Won", count: 38, value: "$980K", conversion: 11.1, color: "#16A34A", avgDays: 21 },
    { name: "Closed Lost", count: 28, value: "$620K", conversion: 8.2, color: "#DC2626", avgDays: 18 },
];

export const topDeals: TopDeal[] = [
    { id: "d1", name: "Enterprise Platform License", company: "Acme Corp", value: "$420,000", stage: "Negotiation", probability: 85, owner: "Alex Johnson", closeDate: "Mar 15" },
    { id: "d2", name: "Cloud Migration Project", company: "TechFlow Inc", value: "$285,000", stage: "Proposal", probability: 65, owner: "Sarah Chen", closeDate: "Mar 28" },
    { id: "d3", name: "Data Analytics Suite", company: "GlobalTech", value: "$196,000", stage: "Negotiation", probability: 75, owner: "Mike Rodriguez", closeDate: "Apr 5" },
    { id: "d4", name: "Security Compliance Package", company: "SecureBank", value: "$158,000", stage: "Qualified", probability: 45, owner: "Emily Davis", closeDate: "Apr 20" },
    { id: "d5", name: "HR Management System", company: "PeopleFirst Co", value: "$134,000", stage: "Proposal", probability: 60, owner: "Lisa Park", closeDate: "Mar 30" },
];

export const teamPerformance: TeamPerformance[] = [
    { id: "t1", name: "Alex Johnson", avatar: "AJ", dealsWon: 38, dealsClosed: 52, revenue: "$620K", quota: 112, activities: 284, winRate: 73 },
    { id: "t2", name: "Sarah Chen", avatar: "SC", dealsWon: 32, dealsClosed: 48, revenue: "$485K", quota: 97, activities: 312, winRate: 67 },
    { id: "t3", name: "Mike Rodriguez", avatar: "MR", dealsWon: 28, dealsClosed: 42, revenue: "$410K", quota: 89, activities: 256, winRate: 67 },
    { id: "t4", name: "Emily Davis", avatar: "ED", dealsWon: 24, dealsClosed: 38, revenue: "$340K", quota: 78, activities: 198, winRate: 63 },
    { id: "t5", name: "Lisa Park", avatar: "LP", dealsWon: 20, dealsClosed: 35, revenue: "$290K", quota: 68, activities: 224, winRate: 57 },
    { id: "t6", name: "James Wilson", avatar: "JW", dealsWon: 16, dealsClosed: 30, revenue: "$215K", quota: 52, activities: 176, winRate: 53 },
];

export const leadSources: LeadSource[] = [
    { name: "Organic Search", leads: 420, converted: 84, revenue: "$680K", color: "#0891B2" },
    { name: "Paid Advertising", leads: 310, converted: 62, revenue: "$520K", color: "#7C3AED" },
    { name: "Referrals", leads: 185, converted: 56, revenue: "$445K", color: "#16A34A" },
    { name: "Social Media", leads: 210, converted: 38, revenue: "$280K", color: "#D97706" },
    { name: "Email Campaigns", leads: 165, converted: 33, revenue: "$240K", color: "#DC2626" },
    { name: "Events", leads: 95, converted: 24, revenue: "$195K", color: "#EC4899" },
];

export const activityMetrics: ActivityMetric[] = [
    { label: "Calls Made", today: 24, thisWeek: 156, thisMonth: 642, icon: Zap },
    { label: "Emails Sent", today: 48, thisWeek: 312, thisMonth: 1284, icon: Zap },
    { label: "Meetings Held", today: 6, thisWeek: 38, thisMonth: 148, icon: Clock },
    { label: "Proposals Sent", today: 3, thisWeek: 18, thisMonth: 72, icon: Eye },
    { label: "Follow-ups", today: 15, thisWeek: 94, thisMonth: 376, icon: MousePointerClick },
];

export const forecastData: ForecastQuarter[] = [
    { quarter: "Q1 2026", committed: 820000, bestCase: 1050000, pipeline: 1400000, target: 900000 },
    { quarter: "Q2 2026", committed: 540000, bestCase: 880000, pipeline: 1650000, target: 950000 },
    { quarter: "Q3 2026", committed: 280000, bestCase: 620000, pipeline: 1900000, target: 1000000 },
    { quarter: "Q4 2026", committed: 120000, bestCase: 450000, pipeline: 2100000, target: 1050000 },
];
