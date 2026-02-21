// src/modules/analytics/business-type-insights.ts
// ============================================================================
// BUSINESS-TYPE INSIGHT ENGINE — Industry-Aware AI Intelligence
//
// Generates contextual AI insights based on tenantʼs businessType
// using the unified TenantAIContext object.
//
// Supported industries:
//   roofing     → pipeline value, project backlog, seasonal revenue
//   clinic      → bookings, patient retention, appointment load
//   salon       → bookings, repeat clients, daily revenue trends
//   agency      → projects, invoices, client acquisition
//   technology  → tasks, projects, pipeline velocity
//   ecommerce   → revenue trends, leads, client acquisition
//   realestate  → pipeline value, client tracking, high-value deals
//   consulting  → projects, revenue, task completion
//   general     → balanced generic CRM insights
//
// Architecture:
//   TenantAIContextService.buildContext()
//     → BusinessTypeInsightEngine.generateInsights(context)
//       → AI-ready insights array
//
// Security: Consumes ONLY TenantAIContext (already tenant-scoped).
//           Never touches DB directly.
// ============================================================================

import { TenantAIContext, AIInsight, InsightSeverity } from './ai-context.dto';

// ── Module → category mapping ────────────────────────────────────────
// Maps insight categories to the module slugs that must be enabled.
// If a category isn't listed here, insights are always included.
const CATEGORY_MODULE_MAP: Record<string, string[]> = {
    revenue: ['finance', 'invoices', 'quotes'],
    expenses: ['finance', 'expenses'],
    bookings: ['bookings', 'calendar'],
    projects: ['projects'],
    tasks: ['tasks'],
};

/** Check if at least one of the required modules is enabled */
function isModuleEnabled(category: string, enabledModules: string[]): boolean {
    const requiredModules = CATEGORY_MODULE_MAP[category];
    if (!requiredModules) return true; // no restriction — always show
    return requiredModules.some(m => enabledModules.includes(m));
}

// ── Engine ───────────────────────────────────────────────────────────

class BusinessTypeInsightEngine {

    /**
     * Generate industry-aware insights from the AI context.
     *
     * Smart personalization (Task 33):
     *   1. Filters out insights whose modules are disabled for the tenant
     *   2. Adjusts tone for new (not-yet-onboarded) tenants
     *
     * @param ctx — Already tenant-scoped, no DB access needed.
     * @returns Ordered array of insights (most critical first).
     */
    generateInsights(ctx: TenantAIContext): AIInsight[] {
        if (ctx.zeroState) {
            return this.zeroStateInsights(ctx);
        }

        // Start with universal insights, then layer industry-specific ones
        let insights: AIInsight[] = [
            ...this.universalInsights(ctx),
            ...this.industryInsights(ctx),
        ];

        // ── Task 33: Module-aware filtering ─────────────────────────────
        // Skip insights for disabled modules (e.g., no booking insights
        // if bookings module isn't enabled for this tenant)
        if (ctx.enabledModules.length > 0) {
            insights = insights.filter(i =>
                isModuleEnabled(i.category, ctx.enabledModules)
            );
        }

        // ── Task 33: Onboarding-aware tone ──────────────────────────────
        // For tenants that haven't completed onboarding, reframe critical
        // alerts with encouraging "setting up" language
        if (!ctx.onboardingCompleted) {
            insights = insights.map(i => {
                if (i.severity === 'critical' || i.severity === 'warning') {
                    return {
                        ...i,
                        severity: 'info' as const,
                        description: `${i.description} (Your workspace is still being set up — this will improve as you add more data.)`,
                    };
                }
                return i;
            });
        }

        // Sort: critical → warning → info → success
        const severityOrder: Record<InsightSeverity, number> = {
            critical: 0, warning: 1, info: 2, success: 3,
        };

        return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }

    // ═════════════════════════════════════════════════════════════════════
    // ZERO-STATE INSIGHTS
    // ═════════════════════════════════════════════════════════════════════

    private zeroStateInsights(ctx: TenantAIContext): AIInsight[] {
        return [
            {
                id: 'zero-welcome',
                title: 'Welcome to your new workspace!',
                description: `Your ${ctx.businessType !== 'general' ? ctx.businessType : ''} CRM is ready. Start by adding your first lead or client to unlock AI-powered insights.`.trim(),
                severity: 'info',
                category: 'growth',
                action: 'Add your first lead to get started',
            },
            {
                id: 'zero-pipeline',
                title: 'Your pipeline is empty',
                description: 'Create leads to start tracking your sales pipeline. AI insights will appear as data flows in.',
                severity: 'info',
                category: 'pipeline',
                action: 'Create your first lead',
            },
        ];
    }

    // ═════════════════════════════════════════════════════════════════════
    // UNIVERSAL INSIGHTS (apply to ALL business types)
    // ═════════════════════════════════════════════════════════════════════

    private universalInsights(ctx: TenantAIContext): AIInsight[] {
        const insights: AIInsight[] = [];

        // ── Pipeline stalled leads ──────────────────────────────────────
        if (ctx.pipeline.stalled > 0) {
            const ratio = ctx.pipeline.totalLeads > 0
                ? Math.round((ctx.pipeline.stalled / ctx.pipeline.totalLeads) * 100)
                : 0;
            insights.push({
                id: 'pipeline-stalled',
                title: `${ctx.pipeline.stalled} leads stalled in pipeline`,
                description: `${ratio}% of your pipeline is stuck in mid-stages. Consider following up to move them forward.`,
                severity: ratio > 50 ? 'warning' : 'info',
                category: 'pipeline',
                action: 'Review stalled leads and schedule follow-ups',
                metric: ctx.pipeline.stalled,
            });
        }

        // ── Low conversion rate ─────────────────────────────────────────
        if (ctx.pipeline.conversionRate < 10 && ctx.pipeline.totalLeads > 5) {
            insights.push({
                id: 'pipeline-conversion-low',
                title: `Conversion rate is ${ctx.pipeline.conversionRate}%`,
                description: 'Your lead-to-won conversion is below the healthy threshold (10%). Review your qualification process.',
                severity: 'warning',
                category: 'pipeline',
                action: 'Audit lead qualification criteria',
                metric: ctx.pipeline.conversionRate,
            });
        }

        // ── Revenue growth ──────────────────────────────────────────────
        if (ctx.revenue.growth > 15) {
            insights.push({
                id: 'revenue-growth-strong',
                title: `Revenue up ${ctx.revenue.growth}% month-over-month`,
                description: 'Strong growth trajectory. Consider reinvesting in lead generation to maintain momentum.',
                severity: 'success',
                category: 'revenue',
                metric: ctx.revenue.growth,
            });
        } else if (ctx.revenue.growth < -10) {
            insights.push({
                id: 'revenue-decline',
                title: `Revenue declined ${Math.abs(ctx.revenue.growth)}% this month`,
                description: 'Revenue is trending down. Review your pipeline and follow up on outstanding invoices.',
                severity: 'critical',
                category: 'revenue',
                action: 'Focus on closing proposals and collecting outstanding payments',
                metric: ctx.revenue.growth,
            });
        }

        // ── Outstanding revenue ─────────────────────────────────────────
        if (ctx.revenue.outstanding > 0 && ctx.revenue.thisMonth > 0) {
            const outstandingRatio = Math.round(
                (ctx.revenue.outstanding / ctx.revenue.thisMonth) * 100
            );
            if (outstandingRatio > 50) {
                insights.push({
                    id: 'revenue-outstanding-high',
                    title: `$${ctx.revenue.outstanding.toLocaleString()} outstanding`,
                    description: `Outstanding invoices represent ${outstandingRatio}% of this month's revenue. Follow up on overdue payments.`,
                    severity: 'warning',
                    category: 'revenue',
                    action: 'Send payment reminders for overdue invoices',
                    metric: ctx.revenue.outstanding,
                });
            }
        }

        // ── Overdue tasks ───────────────────────────────────────────────
        if (ctx.tasks.overdue > 0) {
            insights.push({
                id: 'tasks-overdue',
                title: `${ctx.tasks.overdue} overdue task${ctx.tasks.overdue > 1 ? 's' : ''}`,
                description: 'Overdue tasks can slow down operations and hurt client satisfaction.',
                severity: ctx.tasks.overdue > 5 ? 'critical' : 'warning',
                category: 'tasks',
                action: 'Prioritize and reassign overdue tasks',
                metric: ctx.tasks.overdue,
            });
        }

        // ── Task completion rate ────────────────────────────────────────
        if (ctx.tasks.completionRate > 80) {
            insights.push({
                id: 'tasks-completion-high',
                title: `${ctx.tasks.completionRate}% task completion rate`,
                description: 'Excellent productivity. Your team is consistently delivering on commitments.',
                severity: 'success',
                category: 'tasks',
                metric: ctx.tasks.completionRate,
            });
        }

        // ── Net financial position ──────────────────────────────────────
        if (ctx.growthIndicators.netPosition < 0) {
            insights.push({
                id: 'finance-negative-net',
                title: 'Expenses exceed revenue',
                description: `Net position is -$${Math.abs(ctx.growthIndicators.netPosition).toLocaleString()}. Review expense categories and revenue streams.`,
                severity: 'critical',
                category: 'expenses',
                action: 'Review and optimize spending',
                metric: ctx.growthIndicators.netPosition,
            });
        }

        return insights;
    }

    // ═════════════════════════════════════════════════════════════════════
    // INDUSTRY-SPECIFIC INSIGHTS
    // ═════════════════════════════════════════════════════════════════════

    private industryInsights(ctx: TenantAIContext): AIInsight[] {
        switch (ctx.businessType) {
            case 'roofing':
            case 'manufacturing':
                return this.roofingInsights(ctx);

            case 'clinic':
            case 'healthcare':
                return this.clinicInsights(ctx);

            case 'salon':
            case 'hospitality':
                return this.salonInsights(ctx);

            case 'agency':
            case 'marketing':
            case 'consulting':
                return this.agencyInsights(ctx);

            case 'technology':
            case 'saas':
                return this.technologyInsights(ctx);

            case 'ecommerce':
            case 'retail':
                return this.ecommerceInsights(ctx);

            case 'realestate':
                return this.realestateInsights(ctx);

            default:
                return this.generalInsights(ctx);
        }
    }

    // ── Roofing / Construction ───────────────────────────────────────

    private roofingInsights(ctx: TenantAIContext): AIInsight[] {
        const insights: AIInsight[] = [];

        // Pipeline value tracking (high-ticket industry)
        const totalPipelineValue = ctx.pipeline.stages.reduce((sum, s) => sum + s.value, 0);
        if (totalPipelineValue > 0) {
            insights.push({
                id: 'roofing-pipeline-value',
                title: `$${totalPipelineValue.toLocaleString()} in active pipeline`,
                description: 'Track estimate-to-close ratios closely. Roofing leads often need multiple site visits before commitment.',
                severity: 'info',
                category: 'pipeline',
                metric: totalPipelineValue,
            });
        }

        // Project backlog
        if (ctx.projects.active > 3) {
            insights.push({
                id: 'roofing-backlog',
                title: `${ctx.projects.active} active projects in backlog`,
                description: 'High project load — ensure crew scheduling and material procurement are on track.',
                severity: ctx.projects.active > 8 ? 'warning' : 'info',
                category: 'projects',
                action: 'Review crew assignments and material orders',
                metric: ctx.projects.active,
            });
        }

        // Seasonal revenue awareness
        if (ctx.revenue.growth < 0) {
            insights.push({
                id: 'roofing-seasonal',
                title: 'Revenue dip — check seasonal patterns',
                description: 'Roofing revenue often follows seasonal trends. Consider storm-damage marketing or off-season maintenance services.',
                severity: 'info',
                category: 'revenue',
                action: 'Plan off-season marketing campaigns',
            });
        }

        return insights;
    }

    // ── Clinic / Healthcare ──────────────────────────────────────────

    private clinicInsights(ctx: TenantAIContext): AIInsight[] {
        const insights: AIInsight[] = [];

        // Appointment load
        if (ctx.bookings.pending > 5) {
            insights.push({
                id: 'clinic-appointments-pending',
                title: `${ctx.bookings.pending} pending appointments`,
                description: 'High pending appointment count. Confirm bookings to reduce no-shows and optimize provider schedules.',
                severity: ctx.bookings.pending > 15 ? 'warning' : 'info',
                category: 'bookings',
                action: 'Send confirmation reminders to pending patients',
                metric: ctx.bookings.pending,
            });
        }

        // Patient retention (clients = patients)
        if (ctx.clients.total > 0 && ctx.clients.newThisMonth === 0) {
            insights.push({
                id: 'clinic-retention',
                title: 'No new patients this month',
                description: 'Patient acquisition has stalled. Consider referral programs or community health events.',
                severity: 'warning',
                category: 'clients',
                action: 'Launch a patient referral incentive program',
            });
        }

        // Booking cancellation rate
        if (ctx.bookings.total > 0) {
            const cancelRate = Math.round((ctx.bookings.cancelled / ctx.bookings.total) * 100);
            if (cancelRate > 15) {
                insights.push({
                    id: 'clinic-cancellation-high',
                    title: `${cancelRate}% appointment cancellation rate`,
                    description: 'High cancellation rate impacts revenue and provider utilization.',
                    severity: 'warning',
                    category: 'bookings',
                    action: 'Implement 24-hour cancellation policy with reminders',
                    metric: cancelRate,
                });
            }
        }

        return insights;
    }

    // ── Salon / Hospitality ──────────────────────────────────────────

    private salonInsights(ctx: TenantAIContext): AIInsight[] {
        const insights: AIInsight[] = [];

        // Repeat client rate
        if (ctx.clients.total > 0) {
            const repeatRate = ctx.clients.total > 0
                ? Math.round(((ctx.clients.total - ctx.clients.newThisMonth) / ctx.clients.total) * 100)
                : 0;
            if (repeatRate < 60) {
                insights.push({
                    id: 'salon-repeat-low',
                    title: `Repeat client rate: ${repeatRate}%`,
                    description: 'Salon revenue depends heavily on repeat clients. Consider loyalty programs or rebooking incentives.',
                    severity: 'warning',
                    category: 'clients',
                    action: 'Create a loyalty/rewards program',
                    metric: repeatRate,
                });
            }
        }

        // Upcoming bookings
        if (ctx.bookings.upcoming < 3) {
            insights.push({
                id: 'salon-bookings-low',
                title: `Only ${ctx.bookings.upcoming} upcoming bookings`,
                description: 'Low booking volume ahead. Promote availability on social media or send reminders to inactive clients.',
                severity: 'warning',
                category: 'bookings',
                action: 'Run a limited-time promotion for open slots',
                metric: ctx.bookings.upcoming,
            });
        }

        // Daily revenue trend
        if (ctx.revenue.thisMonth > 0 && ctx.revenue.growth > 0) {
            insights.push({
                id: 'salon-revenue-positive',
                title: 'Revenue is trending up',
                description: `Up ${ctx.revenue.growth}% from last month. Consider expanding services or adding staff.`,
                severity: 'success',
                category: 'revenue',
                metric: ctx.revenue.growth,
            });
        }

        return insights;
    }

    // ── Agency / Marketing / Consulting ──────────────────────────────

    private agencyInsights(ctx: TenantAIContext): AIInsight[] {
        const insights: AIInsight[] = [];

        // Project delivery health
        if (ctx.projects.active > 0 && ctx.tasks.overdue > 0) {
            const riskRatio = Math.round((ctx.tasks.overdue / ctx.tasks.total) * 100);
            insights.push({
                id: 'agency-delivery-risk',
                title: `${ctx.projects.active} active projects — ${ctx.tasks.overdue} overdue tasks`,
                description: `${riskRatio}% of tasks are overdue. This may impact client deliverables and renewal rates.`,
                severity: riskRatio > 20 ? 'critical' : 'warning',
                category: 'projects',
                action: 'Reallocate resources to at-risk deliverables',
                metric: riskRatio,
            });
        }

        // Client acquisition
        if (ctx.growthIndicators.clientAcquisitionRate > 15) {
            insights.push({
                id: 'agency-acquisition-strong',
                title: `${ctx.growthIndicators.clientAcquisitionRate}% new client acquisition rate`,
                description: 'Strong client acquisition. Ensure onboarding processes can scale with growth.',
                severity: 'success',
                category: 'clients',
                metric: ctx.growthIndicators.clientAcquisitionRate,
            });
        }

        // Revenue concentration warning
        if (ctx.revenue.outstanding > ctx.revenue.thisMonth * 0.7) {
            insights.push({
                id: 'agency-cashflow-risk',
                title: 'Cash flow risk — high outstanding invoices',
                description: 'Outstanding invoices exceed 70% of monthly revenue. Agency operations depend on timely collections.',
                severity: 'critical',
                category: 'revenue',
                action: 'Escalate payment follow-ups with finance team',
            });
        }

        return insights;
    }

    // ── Technology / SaaS ────────────────────────────────────────────

    private technologyInsights(ctx: TenantAIContext): AIInsight[] {
        const insights: AIInsight[] = [];

        // Pipeline velocity (tech sales cycles)
        if (ctx.pipeline.newLeads > 0 && ctx.pipeline.proposalsSent === 0) {
            insights.push({
                id: 'tech-pipeline-velocity',
                title: `${ctx.pipeline.newLeads} new leads but no proposals sent`,
                description: 'Leads are entering but not progressing to proposal stage. Review qualification and demo processes.',
                severity: 'warning',
                category: 'pipeline',
                action: 'Schedule demos or discovery calls with qualified leads',
            });
        }

        // Sprint/task health
        if (ctx.tasks.inProgress > ctx.tasks.completed && ctx.tasks.total > 5) {
            insights.push({
                id: 'tech-wip-high',
                title: 'Work-in-progress exceeds completed tasks',
                description: 'High WIP count suggests context switching or blocked work. Consider limiting work in progress.',
                severity: 'info',
                category: 'tasks',
                action: 'Review blocked tasks and enforce WIP limits',
            });
        }

        return insights;
    }

    // ── E-commerce / Retail ──────────────────────────────────────────

    private ecommerceInsights(ctx: TenantAIContext): AIInsight[] {
        const insights: AIInsight[] = [];

        // Lead-to-client conversion
        if (ctx.pipeline.totalLeads > 10 && ctx.pipeline.conversionRate < 15) {
            insights.push({
                id: 'ecom-conversion',
                title: `${ctx.pipeline.conversionRate}% lead conversion — below retail average`,
                description: 'Retail/e-commerce typically converts at 15-25%. Review your lead nurturing and follow-up cadence.',
                severity: 'warning',
                category: 'pipeline',
                action: 'Implement automated follow-up sequences',
                metric: ctx.pipeline.conversionRate,
            });
        }

        // Revenue momentum
        if (ctx.revenue.growth > 20) {
            insights.push({
                id: 'ecom-momentum',
                title: `${ctx.revenue.growth}% revenue growth — strong momentum`,
                description: 'Capitalize on growth by expanding product lines or scaling marketing spend.',
                severity: 'success',
                category: 'revenue',
                metric: ctx.revenue.growth,
            });
        }

        return insights;
    }

    // ── Real Estate ──────────────────────────────────────────────────

    private realestateInsights(ctx: TenantAIContext): AIInsight[] {
        const insights: AIInsight[] = [];

        // High-value pipeline
        const proposalValue = ctx.pipeline.stages.find(s => s.status === 'PROPOSAL')?.value || 0;
        const negotiationValue = ctx.pipeline.stages.find(s => s.status === 'NEGOTIATION')?.value || 0;
        const closingValue = proposalValue + negotiationValue;

        if (closingValue > 0) {
            insights.push({
                id: 'realestate-closing-pipeline',
                title: `$${closingValue.toLocaleString()} in closing pipeline`,
                description: 'High-value deals in proposal/negotiation stages. Prioritize personal follow-ups — real estate is relationship-driven.',
                severity: 'info',
                category: 'pipeline',
                action: 'Schedule personal meetings with decision-makers',
                metric: closingValue,
            });
        }

        // Client tracking
        if (ctx.clients.newThisMonth > 0) {
            insights.push({
                id: 'realestate-new-clients',
                title: `${ctx.clients.newThisMonth} new client${ctx.clients.newThisMonth > 1 ? 's' : ''} this month`,
                description: 'New clients in real estate often come from referrals. Track referral sources to double down on whatʼs working.',
                severity: 'success',
                category: 'clients',
                metric: ctx.clients.newThisMonth,
            });
        }

        return insights;
    }

    // ── General / Fallback ───────────────────────────────────────────

    private generalInsights(ctx: TenantAIContext): AIInsight[] {
        const insights: AIInsight[] = [];

        // Business health summary
        if (ctx.businessHealth === 'Thriving') {
            insights.push({
                id: 'general-thriving',
                title: 'Your business is thriving',
                description: 'All key metrics are trending positively. Keep up the great work!',
                severity: 'success',
                category: 'growth',
            });
        } else if (ctx.businessHealth === 'At Risk' || ctx.businessHealth === 'Critical') {
            insights.push({
                id: 'general-at-risk',
                title: `Business health: ${ctx.businessHealth}`,
                description: 'Multiple metrics are trending negatively. Review your pipeline, revenue, and task completion to identify the root cause.',
                severity: 'critical',
                category: 'growth',
                action: 'Schedule a team review to address declining metrics',
            });
        }

        return insights;
    }
}

export const businessTypeInsightEngine = new BusinessTypeInsightEngine();
