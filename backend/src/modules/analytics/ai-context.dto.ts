// src/modules/analytics/ai-context.dto.ts
// ============================================================================
// TENANT AI CONTEXT — Unified Intelligence Layer DTO
//
// The single data object that feeds ALL AI features:
//   - AI Business Overview
//   - Ask Experts
//   - Smart Alerts / Forecasting
//   - Multi-industry insights (roofing, clinic, salon, agency)
//
// Design: AI never queries DB directly. This DTO is the bridge between
// tenant-scoped analytics data and the AI/LLM interpretation layer.
// ============================================================================

// ── Pipeline Summary ─────────────────────────────────────────────────

export interface AIPipelineSummary {
    totalLeads: number;
    newLeads: number;
    qualified: number;
    proposalsSent: number;
    won: number;
    lost: number;
    conversionRate: number;
    /** Leads in non-terminal stages that haven't progressed */
    stalled: number;
    stages: Array<{
        status: string;
        count: number;
        value: number;
        percentage: number;
    }>;
}

// ── Revenue Summary ──────────────────────────────────────────────────

export interface AIRevenueSummary {
    total: number;
    thisMonth: number;
    lastMonth: number;
    outstanding: number;
    /** Month-over-month growth percentage */
    growth: number;
    trend: Array<{ month: string; revenue: number }>;
}

// ── Task Summary ─────────────────────────────────────────────────────

export interface AITaskSummary {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
}

// ── Client Summary ───────────────────────────────────────────────────

export interface AIClientSummary {
    total: number;
    active: number;
    newThisMonth: number;
}

// ── Project Summary ──────────────────────────────────────────────────

export interface AIProjectSummary {
    total: number;
    active: number;
    completed: number;
}

// ── Expense Summary ──────────────────────────────────────────────────

export interface AIExpenseSummary {
    total: number;
    thisMonth: number;
    pending: number;
}

// ── Booking Summary ──────────────────────────────────────────────────

export interface AIBookingSummary {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    upcoming: number;
}

// ── Growth Indicators ────────────────────────────────────────────────

export type BusinessHealthLevel = 'Thriving' | 'Healthy' | 'Moderate' | 'At Risk' | 'Critical' | 'New';

export interface AIGrowthIndicators {
    revenueGrowth: number;
    leadConversion: number;
    taskCompletion: number;
    /** Ratio of new clients this month to total */
    clientAcquisitionRate: number;
    /** Net revenue position (revenue - expenses) */
    netPosition: number;
}

// ── Master AI Context Object ─────────────────────────────────────────

export interface TenantAIContext {
    /** The tenant this context belongs to — strict isolation */
    tenantId: string;

    /** Tenant metadata */
    tenantName: string;
    businessType: string | null;
    onboardingCompleted: boolean;

    /** Is this a zero-state tenant? (newly onboarded, little/no data) */
    zeroState: boolean;

    /** Overall business health assessment */
    businessHealth: BusinessHealthLevel;

    /** Module-level summaries */
    pipeline: AIPipelineSummary;
    revenue: AIRevenueSummary;
    expenses: AIExpenseSummary;
    tasks: AITaskSummary;
    clients: AIClientSummary;
    projects: AIProjectSummary;
    bookings: AIBookingSummary;

    /** Computed growth indicators */
    growthIndicators: AIGrowthIndicators;

    /** Enabled modules for this tenant */
    enabledModules: string[];

    /** Timestamp of context generation */
    generatedAt: string;
}
