import {
    DollarSign, TrendingUp, Receipt, FileText, BarChart3, PieChart,
    Users, Briefcase, Calendar, ArrowUpRight, ArrowDownRight,
    type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export type ReportTab = "sales" | "revenue" | "expenses" | "custom";

export interface ReportTabItem {
    id: ReportTab;
    label: string;
    icon: LucideIcon;
    description: string;
}

export interface SalesRepRow {
    id: string;
    name: string;
    avatar: string;
    deals: number;
    won: number;
    lost: number;
    revenue: string;
    avgDealSize: string;
    winRate: number;
    pipeline: string;
}

export interface RevenueRow {
    month: string;
    newBusiness: number;
    renewals: number;
    upsells: number;
    total: number;
    growth: number;
}

export interface ExpenseRow {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    status: "approved" | "pending" | "rejected";
    submittedBy: string;
}

export interface ExpenseCategory {
    name: string;
    amount: number;
    budget: number;
    color: string;
}

export interface CustomReportTemplate {
    id: string;
    name: string;
    description: string;
    type: string;
    lastRun: string;
    schedule: string;
    icon: LucideIcon;
}

// ============================================
// DATA
// ============================================

export const reportTabs: ReportTabItem[] = [
    { id: "sales", label: "Sales Report", icon: Briefcase, description: "Team performance & deal analytics" },
    { id: "revenue", label: "Revenue Report", icon: DollarSign, description: "Income breakdown & growth trends" },
    { id: "expenses", label: "Expense Report", icon: Receipt, description: "Spending analysis & budget tracking" },
    { id: "custom", label: "Custom Reports", icon: FileText, description: "Build & schedule custom reports" },
];

export const salesReps: SalesRepRow[] = [
    { id: "s1", name: "Alex Johnson", avatar: "AJ", deals: 52, won: 38, lost: 14, revenue: "$620,000", avgDealSize: "$16,316", winRate: 73, pipeline: "$284,000" },
    { id: "s2", name: "Sarah Chen", avatar: "SC", deals: 48, won: 32, lost: 16, revenue: "$485,000", avgDealSize: "$15,156", winRate: 67, pipeline: "$320,000" },
    { id: "s3", name: "Mike Rodriguez", avatar: "MR", deals: 42, won: 28, lost: 14, revenue: "$410,000", avgDealSize: "$14,643", winRate: 67, pipeline: "$198,000" },
    { id: "s4", name: "Emily Davis", avatar: "ED", deals: 38, won: 24, lost: 14, revenue: "$340,000", avgDealSize: "$14,167", winRate: 63, pipeline: "$256,000" },
    { id: "s5", name: "Lisa Park", avatar: "LP", deals: 35, won: 20, lost: 15, revenue: "$290,000", avgDealSize: "$14,500", winRate: 57, pipeline: "$175,000" },
    { id: "s6", name: "James Wilson", avatar: "JW", deals: 30, won: 16, lost: 14, revenue: "$215,000", avgDealSize: "$13,438", winRate: 53, pipeline: "$142,000" },
];

export const salesKpis = [
    { label: "Total Deals", value: "245", change: "+14%", trend: "up" as const },
    { label: "Revenue Generated", value: "$2.36M", change: "+18%", trend: "up" as const },
    { label: "Avg Win Rate", value: "63.3%", change: "+4.1%", trend: "up" as const },
    { label: "Avg Deal Cycle", value: "24 days", change: "-3 days", trend: "up" as const },
];

export const revenueData: RevenueRow[] = [
    { month: "Jan 2026", newBusiness: 120000, renewals: 42000, upsells: 18000, total: 180000, growth: 12.5 },
    { month: "Feb 2026", newBusiness: 148000, renewals: 48000, upsells: 24000, total: 220000, growth: 22.2 },
    { month: "Mar 2026", newBusiness: 125000, renewals: 45000, upsells: 25000, total: 195000, growth: -11.4 },
    { month: "Apr 2026", newBusiness: 172000, renewals: 52000, upsells: 36000, total: 260000, growth: 33.3 },
    { month: "May 2026", newBusiness: 155000, renewals: 50000, upsells: 35000, total: 240000, growth: -7.7 },
    { month: "Jun 2026", newBusiness: 198000, renewals: 62000, upsells: 50000, total: 310000, growth: 29.2 },
    { month: "Jul 2026", newBusiness: 180000, renewals: 58000, upsells: 47000, total: 285000, growth: -8.1 },
    { month: "Aug 2026", newBusiness: 205000, renewals: 65000, upsells: 50000, total: 320000, growth: 12.3 },
    { month: "Sep 2026", newBusiness: 182000, renewals: 60000, upsells: 48000, total: 290000, growth: -9.4 },
    { month: "Oct 2026", newBusiness: 220000, renewals: 72000, upsells: 58000, total: 350000, growth: 20.7 },
    { month: "Nov 2026", newBusiness: 245000, renewals: 78000, upsells: 57000, total: 380000, growth: 8.6 },
    { month: "Dec 2026", newBusiness: 268000, renewals: 82000, upsells: 60000, total: 410000, growth: 7.9 },
];

export const revenueKpis = [
    { label: "Total Revenue", value: "$3.44M", change: "+22.8%", trend: "up" as const },
    { label: "New Business", value: "$2.22M", change: "+19.4%", trend: "up" as const },
    { label: "Renewals", value: "$714K", change: "+28.6%", trend: "up" as const },
    { label: "MRR", value: "$286K", change: "+15.2%", trend: "up" as const },
];

export const expenseRows: ExpenseRow[] = [
    { id: "e1", category: "Marketing", description: "Google Ads Campaign — Q1", amount: 28500, date: "Feb 15, 2026", status: "approved", submittedBy: "Lisa Park" },
    { id: "e2", category: "Software", description: "Annual Salesforce License", amount: 42000, date: "Feb 12, 2026", status: "approved", submittedBy: "Alex Johnson" },
    { id: "e3", category: "Travel", description: "Client Visit — TechFlow NYC", amount: 3450, date: "Feb 10, 2026", status: "approved", submittedBy: "Sarah Chen" },
    { id: "e4", category: "Events", description: "SaaS Connect Conference Sponsorship", amount: 15000, date: "Feb 8, 2026", status: "pending", submittedBy: "Mike Rodriguez" },
    { id: "e5", category: "Office", description: "Office Supplies & Equipment", amount: 4200, date: "Feb 5, 2026", status: "approved", submittedBy: "Emily Davis" },
    { id: "e6", category: "Training", description: "Sales Enablement Workshop", amount: 8500, date: "Feb 3, 2026", status: "approved", submittedBy: "James Wilson" },
    { id: "e7", category: "Marketing", description: "LinkedIn Ad Campaign", amount: 12000, date: "Feb 1, 2026", status: "pending", submittedBy: "Lisa Park" },
    { id: "e8", category: "Software", description: "HubSpot Marketing Hub", amount: 18000, date: "Jan 28, 2026", status: "approved", submittedBy: "Alex Johnson" },
    { id: "e9", category: "Travel", description: "Team Offsite — Vancouver", amount: 9800, date: "Jan 25, 2026", status: "rejected", submittedBy: "Mike Rodriguez" },
    { id: "e10", category: "Recruitment", description: "Job Board Postings — Q1", amount: 5600, date: "Jan 22, 2026", status: "approved", submittedBy: "Emily Davis" },
];

export const expenseCategories: ExpenseCategory[] = [
    { name: "Marketing", amount: 40500, budget: 50000, color: "#0891B2" },
    { name: "Software", amount: 60000, budget: 65000, color: "#7C3AED" },
    { name: "Travel", amount: 13250, budget: 20000, color: "#16A34A" },
    { name: "Events", amount: 15000, budget: 25000, color: "#D97706" },
    { name: "Office", amount: 4200, budget: 8000, color: "#EC4899" },
    { name: "Training", amount: 8500, budget: 12000, color: "#0EA5E9" },
    { name: "Recruitment", amount: 5600, budget: 10000, color: "#F97316" },
];

export const expenseKpis = [
    { label: "Total Spent", value: "$147K", change: "+8.2%", trend: "down" as const },
    { label: "Budget Used", value: "77.4%", change: "+5.1%", trend: "down" as const },
    { label: "Pending Approvals", value: "2", change: "0", trend: "up" as const },
    { label: "Avg per Employee", value: "$24.5K", change: "-2.1%", trend: "up" as const },
];

export const customReportTemplates: CustomReportTemplate[] = [
    { id: "cr1", name: "Pipeline Velocity Report", description: "Track deal movement speed through each stage with bottleneck analysis", type: "Pipeline", lastRun: "2 hours ago", schedule: "Daily", icon: TrendingUp },
    { id: "cr2", name: "Lead Conversion Funnel", description: "Full-funnel analysis from lead capture to closed-won with drop-off rates", type: "Leads", lastRun: "1 day ago", schedule: "Weekly", icon: PieChart },
    { id: "cr3", name: "Customer Lifetime Value", description: "CLV analysis segmented by acquisition channel, plan, and industry", type: "Customers", lastRun: "3 days ago", schedule: "Monthly", icon: Users },
    { id: "cr4", name: "Activity & Engagement Score", description: "Team activity breakdown (calls, emails, meetings) with engagement scoring", type: "Activity", lastRun: "5 hours ago", schedule: "Daily", icon: BarChart3 },
    { id: "cr5", name: "Forecast Accuracy Report", description: "Compare past forecasts against actuals to measure prediction accuracy", type: "Forecasting", lastRun: "1 week ago", schedule: "Quarterly", icon: TrendingUp },
    { id: "cr6", name: "Churn Risk Analysis", description: "AI-powered churn prediction with risk scores and recommended actions", type: "Retention", lastRun: "12 hours ago", schedule: "Weekly", icon: Users },
    { id: "cr7", name: "Revenue by Segment", description: "Revenue breakdown by industry, company size, geography, and product line", type: "Revenue", lastRun: "1 day ago", schedule: "Monthly", icon: DollarSign },
    { id: "cr8", name: "Campaign ROI Analysis", description: "Marketing campaign performance with cost-per-lead and attribution modeling", type: "Marketing", lastRun: "2 days ago", schedule: "Weekly", icon: BarChart3 },
];
