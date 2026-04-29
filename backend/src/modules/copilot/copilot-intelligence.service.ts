// src/modules/copilot/copilot-intelligence.service.ts
// ============================================================================
// COPILOT INTELLIGENCE SERVICE — Hybrid AI Architecture
//
// PRIMARY: Deterministic, template-based intelligence (fast, private, zero-cost)
// SECONDARY: LLM adapter for natural language generation (emails, summaries)
//
// The LLM is ONLY used as a FORMATTER — it never queries the database.
// All data comes from the ContextResolverService → sanitized context.
//
// Intent classification determines which engine handles each request:
//   - Analytical intents → deterministic templates (existing)
//   - Generative intents → LLM with sanitized context (new)
// ============================================================================

import { ResolvedCopilotContext } from './context-resolver.service';
import { TenantAIContext, AIInsight } from '../analytics/ai-context.dto';
import { businessTypeInsightEngine } from '../analytics/business-type-insights';
import { llmAdapterService } from './llm-adapter.service';
import { logger } from '../../common/utils/logger';

// ── Response Types ──────────────────────────────────────────────────────

export interface CopilotResponse {
    answer: string;
    suggestedActions: string[];
    suggestedFollowUps: string[];
}

// ── Intent Classification ───────────────────────────────────────────────

type CopilotIntent = 'generative' | 'analytical';
type GenerativeCategory = 'email' | 'summary' | 'explanation' | 'general';

interface ClassifiedIntent {
    type: CopilotIntent;
    category: GenerativeCategory;
}

/** Keyword-based intent classifier — fast and deterministic */
function classifyIntent(message: string): ClassifiedIntent {
    const lower = message.toLowerCase();

    // Email drafting intents
    if (/\b(draft|write|compose|email|follow[\s-]?up email|message|letter|outreach)\b/.test(lower)) {
        return { type: 'generative', category: 'email' };
    }

    // Summary intents
    if (/\b(summarize|summary|brief|overview|recap|tldr|digest)\b/.test(lower) && lower.length > 20) {
        return { type: 'generative', category: 'summary' };
    }

    // Explanation intents
    if (/\b(explain|why|what does|what is|help me understand|break down|simplify)\b/.test(lower)) {
        return { type: 'generative', category: 'explanation' };
    }

    // General generative (longer conversational messages)
    if (/\b(help me|can you|please|suggest|recommend|advice|how should|how can|what should)\b/.test(lower)) {
        return { type: 'generative', category: 'general' };
    }

    // Default: analytical (deterministic engine)
    return { type: 'analytical', category: 'general' };
}

// ── Context Serializer ──────────────────────────────────────────────────

/** Convert resolved context into a safe string for LLM consumption */
function serializeContextForLLM(ctx: ResolvedCopilotContext): string {
    const parts: string[] = [];

    // Tenant overview
    parts.push(`Business: ${ctx.aiContext.tenantName} (${ctx.aiContext.businessType})`);
    parts.push(`Health: ${ctx.aiContext.businessHealth}`);

    // Key metrics
    parts.push(`Revenue this month: $${ctx.aiContext.revenue.thisMonth.toLocaleString()} (${ctx.aiContext.revenue.growth > 0 ? '+' : ''}${ctx.aiContext.revenue.growth}% MoM)`);
    parts.push(`Pipeline: ${ctx.aiContext.pipeline.totalLeads} leads, ${ctx.aiContext.pipeline.conversionRate}% conversion`);
    parts.push(`Tasks: ${ctx.aiContext.tasks.total} total, ${ctx.aiContext.tasks.overdue} overdue`);

    // Entity data if present
    if (ctx.entityData) {
        parts.push('');
        parts.push(`Current ${ctx.module}:`);
        for (const [key, value] of Object.entries(ctx.entityData)) {
            if (value !== null && value !== undefined && key !== 'type') {
                parts.push(`  ${key}: ${value}`);
            }
        }
    }

    return parts.join('\n');
}

// ── Service ─────────────────────────────────────────────────────────────

class CopilotIntelligenceService {
    private normalizeMessage(message: string): string {
        return message.trim().toLowerCase();
    }

    private isRevenueQuestion(message: string): boolean {
        const lower = this.normalizeMessage(message);
        return /\brevenue\b|\bgrowth\b|\bsales\b|\bclose rate\b|\bconversion\b/.test(lower);
    }

    private isFocusQuestion(message: string): boolean {
        const lower = this.normalizeMessage(message);
        return /\bfocus\b|\bpriorit/i.test(lower) || /\bthis week\b/.test(lower) || /\bnext step\b/.test(lower);
    }

    private isPipelineQuestion(message: string): boolean {
        const lower = this.normalizeMessage(message);
        return /\bpipeline\b|\bleads?\b|\bstalled\b|\bproposal\b|\bqualified\b/.test(lower);
    }


    /**
     * Generate a context-aware response based on the user's message
     * and resolved context (module, entity data, AI context).
     *
     * Hybrid architecture:
     *   1. Classify intent (generative vs analytical)
     *   2. If generative + LLM available → delegate to LLM with sanitized context
     *   3. If analytical or LLM unavailable → use deterministic templates
     */
    async generateResponse(
        message: string,
        ctx: ResolvedCopilotContext,
        history?: Array<{ role: 'user' | 'assistant'; content: string }>,
    ): Promise<CopilotResponse> {
        const intent = classifyIntent(message);

        // Try LLM for generative intents
        if (intent.type === 'generative' && llmAdapterService.isAvailable()) {
            const llmResponse = await this.tryLLMGeneration(message, ctx, intent.category, history);
            if (llmResponse) return llmResponse;
            // Fall through to deterministic if LLM fails
            logger.warn('[Copilot] LLM generation failed, falling back to deterministic');
        }

        // Deterministic engine (primary path)
        return this.generateDeterministicResponse(message, ctx);
    }

    /** Attempt LLM-based generation with proper context and fallback */
    private async tryLLMGeneration(
        message: string,
        ctx: ResolvedCopilotContext,
        category: GenerativeCategory,
        history?: Array<{ role: 'user' | 'assistant'; content: string }>,
    ): Promise<CopilotResponse | null> {
        const systemPrompt = llmAdapterService.getSystemPrompt(category);
        const contextSummary = serializeContextForLLM(ctx);

        const result = await llmAdapterService.generate({
            systemPrompt,
            userMessage: message,
            contextSummary,
            history,
            maxTokens: category === 'email' ? 600 : 800,
        });

        if (!result) return null;

        // Build module-appropriate follow-ups
        const followUps = this.getFollowUpsForModule(ctx.module, category);

        return {
            answer: result.text,
            suggestedActions: this.getActionsForCategory(category, ctx),
            suggestedFollowUps: followUps,
        };
    }

    private getFollowUpsForModule(module: string, category: GenerativeCategory): string[] {
        if (category === 'email') {
            return ['Make it more formal', 'Make it shorter', 'Add a meeting request'];
        }
        if (category === 'summary') {
            return ['Go deeper on risks', 'Show me the numbers', 'What should I do next?'];
        }
        return ['Tell me more', 'What should I focus on?', 'Show me the data'];
    }

    private getActionsForCategory(category: GenerativeCategory, ctx: ResolvedCopilotContext): string[] {
        if (category === 'email') return ['Copy to clipboard', 'Send via CRM'];
        if (category === 'summary') return ['Export as PDF', 'Share with team'];
        return ctx.entityData ? ['View full details', 'Edit record'] : ['View dashboard'];
    }

    /**
     * Deterministic response routing — the original intelligence engine.
     * Routes to module-specific strategy based on context.
     */
    private generateDeterministicResponse(
        message: string,
        ctx: ResolvedCopilotContext,
    ): CopilotResponse {
        // Route to module-specific strategy
        switch (ctx.module) {
            case 'leads':
                return ctx.entityData
                    ? this.leadDetailResponse(message, ctx)
                    : this.leadListResponse(message, ctx);

            case 'clients':
                return ctx.entityData
                    ? this.clientDetailResponse(message, ctx)
                    : this.clientListResponse(message, ctx);

            case 'projects':
                return ctx.entityData
                    ? this.projectDetailResponse(message, ctx)
                    : this.projectListResponse(message, ctx);

            case 'dashboard':
            case 'analytics':
                return this.dashboardResponse(message, ctx);

            case 'tasks':
                return this.taskResponse(message, ctx);

            case 'finance':
                return this.financeResponse(message, ctx);

            case 'bookings':
                return this.bookingsResponse(message, ctx);

            default:
                return this.generalResponse(message, ctx);
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // MODULE STRATEGIES
    // ═════════════════════════════════════════════════════════════════════

    // ── LEAD DETAIL ─────────────────────────────────────────────────────
    private leadDetailResponse(_msg: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const lead = ctx.entityData!;
        const ai = ctx.aiContext;

        const statusEmoji: Record<string, string> = {
            NEW: '🆕', CONTACTED: '📞', QUALIFIED: '✅', PROPOSAL: '📄',
            NEGOTIATION: '🤝', WON: '🏆', LOST: '❌',
        };

        const tempEmoji: Record<string, string> = {
            HOT: '🔥', WARM: '🌡️', COLD: '❄️',
        };

        const emoji = statusEmoji[lead.status] || '📋';
        const temp = tempEmoji[lead.temperature] || '';

        // Build analysis
        const lines: string[] = [
            `**${emoji} Lead Analysis: ${lead.name}**`,
            '',
        ];

        // Core info
        lines.push(`• **Status:** ${lead.status} ${temp ? `(${lead.temperature} ${temp})` : ''}`);
        lines.push(`• **Company:** ${lead.company || 'Not specified'}`);
        lines.push(`• **Value:** $${(lead.value || 0).toLocaleString()}`);
        lines.push(`• **Source:** ${lead.source || 'Unknown'}`);
        lines.push(`• **Assigned to:** ${lead.assignedTo}`);
        lines.push('');

        // Stage-specific advice
        const actions: string[] = [];
        const followUps: string[] = [];

        if (lead.status === 'NEW') {
            lines.push('💡 **Insight:** This lead is brand new. First contact within 24h dramatically increases conversion rates.');
            actions.push('Make initial contact within 24 hours');
            actions.push('Research their company before reaching out');
            followUps.push('What\'s the best outreach strategy for this lead?');
            followUps.push('Draft an introduction email for this lead');
        } else if (lead.status === 'CONTACTED') {
            lines.push('💡 **Insight:** Lead has been contacted. Focus on qualification — learn their needs and budget.');
            actions.push('Schedule a discovery call');
            actions.push('Send qualifying questions via email');
            followUps.push('What qualifying questions should I ask?');
            followUps.push('How does this lead compare to others?');
        } else if (lead.status === 'QUALIFIED') {
            lines.push('💡 **Insight:** This lead is qualified. Time to move toward a proposal.');
            actions.push('Prepare a tailored proposal');
            actions.push('Review similar won deals for pricing guidance');
            followUps.push('What proposal approach should I use?');
            followUps.push('Show me similar leads that were won');
        } else if (lead.status === 'PROPOSAL' || lead.status === 'NEGOTIATION') {
            lines.push('💡 **Insight:** Lead is in the closing stages. Maintain momentum and address objections proactively.');
            actions.push('Follow up on the proposal within 48h');
            actions.push('Prepare responses to common objections');
            followUps.push('What are common deal blockers at this stage?');
        } else if (lead.status === 'WON') {
            lines.push('🏆 **Insight:** Congratulations! This lead was converted. Focus on onboarding and relationship building.');
            actions.push('Start client onboarding');
            actions.push('Schedule a kickoff call');
            followUps.push('What onboarding steps should I follow?');
        } else if (lead.status === 'LOST') {
            lines.push('📝 **Insight:** This lead was lost. Understanding why helps improve future conversion rates.');
            actions.push('Document the reason for loss');
            actions.push('Schedule a follow-up in 90 days');
            followUps.push('What are the common reasons leads are lost?');
        }

        // Pipeline context
        lines.push('');
        lines.push(`📊 **Pipeline Context:** ${ai.pipeline.totalLeads} total leads, ${ai.pipeline.conversionRate}% conversion rate`);

        if (lead.temperature === 'COLD' && lead.status !== 'LOST') {
            lines.push('');
            lines.push('⚠️ **Risk:** This lead is cold. Consider a re-engagement campaign before it goes stale.');
            actions.push('Send a re-engagement email or special offer');
        }

        return {
            answer: lines.join('\n'),
            suggestedActions: actions,
            suggestedFollowUps: followUps.length > 0 ? followUps : [
                'How does this lead compare to pipeline averages?',
                'What should my next action be?',
            ],
        };
    }

    // ── LEAD LIST ───────────────────────────────────────────────────────
    private leadListResponse(_msg: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const ai = ctx.aiContext;
        const p = ai.pipeline;

        const lines: string[] = [
            '**📊 Pipeline Overview**',
            '',
            `Your pipeline has **${p.totalLeads} leads** with a **${p.conversionRate}% conversion rate**.`,
            '',
            `• 🆕 **New:** ${p.newLeads}`,
            `• ✅ **Qualified:** ${p.qualified}`,
            `• 📄 **Proposals Sent:** ${p.proposalsSent}`,
            `• 🏆 **Won:** ${p.won}`,
            `• ❌ **Lost:** ${p.lost}`,
            '',
        ];

        const actions: string[] = [];

        if (p.stalled > 0) {
            lines.push(`⚠️ **${p.stalled} leads are stalled** in mid-pipeline stages. Consider following up.`);
            actions.push(`Follow up on ${p.stalled} stalled leads`);
        }

        if (p.newLeads > 5) {
            lines.push(`💡 **${p.newLeads} new leads** await first contact. Prioritize high-value ones.`);
            actions.push('Prioritize and contact new leads');
        }

        if (p.conversionRate < 10 && p.totalLeads > 10) {
            lines.push('⚠️ **Conversion rate is below 10%.** Review your qualification criteria and follow-up cadence.');
            actions.push('Review lead qualification process');
        } else if (p.conversionRate > 25) {
            lines.push('🎉 **Excellent conversion rate!** Your pipeline is performing well.');
        }

        // Add relevant insights
        const leadInsights = ai.insights.filter(i => i.category === 'pipeline').slice(0, 2);
        if (leadInsights.length > 0) {
            lines.push('');
            lines.push('**🧠 AI Insights:**');
            leadInsights.forEach(i => lines.push(`• ${i.title}: ${i.description}`));
        }

        return {
            answer: lines.join('\n'),
            suggestedActions: actions,
            suggestedFollowUps: [
                'Which leads should I focus on this week?',
                'How can I improve my conversion rate?',
                'Show me pipeline trends over time',
            ],
        };
    }

    // ── CLIENT DETAIL ───────────────────────────────────────────────────
    private clientDetailResponse(_msg: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const client = ctx.entityData!;
        const ai = ctx.aiContext;

        const lines: string[] = [
            `**👤 Client Intelligence: ${client.name}**`,
            '',
            `• **Company:** ${client.company || 'Individual'}`,
            `• **Email:** ${client.email || 'Not provided'}`,
            `• **Phone:** ${client.phone || 'Not provided'}`,
            `• **Status:** ${client.status || 'Active'}`,
            '',
            `📊 **Business Context:** ${ai.clients.total} total clients, ${ai.clients.newThisMonth} new this month`,
        ];

        const actions: string[] = [
            'Review recent interactions with this client',
            'Check for upcoming project milestones',
        ];

        return {
            answer: lines.join('\n'),
            suggestedActions: actions,
            suggestedFollowUps: [
                'How is this client\'s project progressing?',
                'When was the last interaction with this client?',
                'What\'s the revenue from this client?',
            ],
        };
    }

    // ── CLIENT LIST ─────────────────────────────────────────────────────
    private clientListResponse(_msg: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const ai = ctx.aiContext;
        const c = ai.clients;

        const lines: string[] = [
            '**👥 Client Portfolio Overview**',
            '',
            `You have **${c.total} clients** (${c.active} active, ${c.newThisMonth} new this month).`,
            '',
        ];

        if (c.newThisMonth > 0) {
            lines.push(`🎉 **${c.newThisMonth} new clients** this month! Great acquisition momentum.`);
        }

        if (ai.growthIndicators.clientAcquisitionRate > 10) {
            lines.push(`📈 **Client acquisition rate:** ${ai.growthIndicators.clientAcquisitionRate}% — strong growth.`);
        }

        return {
            answer: lines.join('\n'),
            suggestedActions: [
                'Identify clients who may need follow-up',
                'Review client satisfaction scores',
            ],
            suggestedFollowUps: [
                'Which clients need attention this week?',
                'How is my client retention?',
                'Show me client acquisition trends',
            ],
        };
    }

    // ── PROJECT DETAIL ──────────────────────────────────────────────────
    private projectDetailResponse(_msg: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const project = ctx.entityData!;
        const ai = ctx.aiContext;

        const lines: string[] = [
            `**📁 Project Analysis: ${project.name}**`,
            '',
            `• **Status:** ${project.status}`,
            `• **Budget:** ${project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}`,
        ];

        if (project.endDate) {
            const deadline = new Date(project.endDate);
            const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            lines.push(`• **Deadline:** ${deadline.toLocaleDateString()} (${daysLeft > 0 ? `${daysLeft} days left` : '⚠️ Overdue!'})`);
        }

        lines.push('');
        lines.push(`📊 **Overall:** ${ai.projects.active} active projects, ${ai.tasks.overdue} overdue tasks`);

        const actions: string[] = [];

        if (ai.tasks.overdue > 0) {
            lines.push(`\n⚠️ **${ai.tasks.overdue} tasks are overdue** across your projects. Review priorities.`);
            actions.push('Address overdue tasks');
        }

        actions.push('Review project milestones');

        return {
            answer: lines.join('\n'),
            suggestedActions: actions,
            suggestedFollowUps: [
                'What tasks are blocking this project?',
                'Is this project at risk of missing its deadline?',
                'How does this project compare to budget?',
            ],
        };
    }

    // ── PROJECT LIST ────────────────────────────────────────────────────
    private projectListResponse(_msg: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const ai = ctx.aiContext;
        const p = ai.projects;

        return {
            answer: [
                '**📁 Projects Overview**',
                '',
                `• **Active:** ${p.active}`,
                `• **Completed:** ${p.completed}`,
                `• **Total:** ${p.total}`,
                '',
                `📋 **Tasks:** ${ai.tasks.total} total (${ai.tasks.completed} done, ${ai.tasks.overdue} overdue)`,
                `✅ **Completion Rate:** ${ai.tasks.completionRate}%`,
                ai.tasks.overdue > 3 ? `\n⚠️ **High overdue count.** Review task assignments and priorities.` : '',
            ].join('\n'),
            suggestedActions: [
                'Review overdue tasks',
                'Check project deadlines this week',
            ],
            suggestedFollowUps: [
                'Which projects are at risk?',
                'How is team capacity looking?',
                'What projects should I prioritize?',
            ],
        };
    }

    // ── DASHBOARD ───────────────────────────────────────────────────────
    private dashboardResponse(message: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const ai = ctx.aiContext;

        if (this.isRevenueQuestion(message)) {
            const actions: string[] = [];
            const followUps: string[] = [];
            const activePipelineValue = ai.pipeline.stages.reduce((sum, stage) => sum + stage.value, 0);
            const lines: string[] = [
                `**📈 Revenue Growth Plan — ${ai.tenantName}**`,
                '',
                `• **This month revenue:** $${ai.revenue.thisMonth.toLocaleString()} (${ai.revenue.growth > 0 ? '+' : ''}${ai.revenue.growth}% MoM)`,
                `• **Active pipeline:** $${activePipelineValue.toLocaleString()}`,
                `• **Conversion rate:** ${ai.pipeline.conversionRate}%`,
                `• **Outstanding revenue:** $${ai.revenue.outstanding.toLocaleString()}`,
                '',
            ];

            if (ai.pipeline.stalled > 0) {
                lines.push(`1. Move the **${ai.pipeline.stalled} stalled leads** forward first. That is the fastest near-term revenue unlock.`);
                actions.push('Review stalled leads and schedule follow-ups');
            }

            if (ai.tasks.overdue > 0) {
                lines.push(`2. Clear the **${ai.tasks.overdue} overdue tasks** blocking sales or operations so estimates and follow-ups do not slip.`);
                actions.push('Prioritize and reassign overdue tasks');
            }

            if (ai.revenue.outstanding > 0) {
                lines.push(`3. Follow up on **$${ai.revenue.outstanding.toLocaleString()} outstanding** to improve cash collection.`);
                actions.push(`Follow up on $${ai.revenue.outstanding.toLocaleString()} outstanding`);
            }

            lines.push('4. Track estimate-to-close speed and make sure every qualified lead has a next action this week.');

            followUps.push('Show me pipeline details', 'Which leads should I close first?', 'What is blocking revenue this month?');

            return {
                answer: lines.join('\n'),
                suggestedActions: actions,
                suggestedFollowUps: followUps,
            };
        }

        if (this.isFocusQuestion(message)) {
            const actions: string[] = [];
            const lines: string[] = [
                `**🎯 Focus for This Week — ${ai.tenantName}**`,
                '',
                'Here is the highest-leverage order:',
                '',
            ];

            if (ai.tasks.overdue > 0) {
                lines.push(`1. Resolve the **${ai.tasks.overdue} overdue tasks** affecting delivery and follow-up discipline.`);
                actions.push('Prioritize and reassign overdue tasks');
            }

            if (ai.pipeline.stalled > 0) {
                lines.push(`2. Re-engage the **${ai.pipeline.stalled} stalled leads** in the pipeline.`);
                actions.push('Review stalled leads and schedule follow-ups');
            }

            if (ai.pipeline.newLeads > 0) {
                lines.push(`3. Make first contact on the **${ai.pipeline.newLeads} new leads** so they do not cool off.`);
                actions.push('Contact new leads');
            }

            if (ai.revenue.outstanding > 0) {
                lines.push(`4. Follow up on **$${ai.revenue.outstanding.toLocaleString()} outstanding invoices** for faster cash flow.`);
                actions.push(`Follow up on $${ai.revenue.outstanding.toLocaleString()} outstanding`);
            }

            return {
                answer: lines.join('\n'),
                suggestedActions: actions,
                suggestedFollowUps: [
                    'Show me pipeline details',
                    'How can I improve my revenue growth?',
                    'Which tasks are hurting progress most?',
                ],
            };
        }

        if (this.isPipelineQuestion(message)) {
            return this.leadListResponse(message, ctx);
        }

        const lines: string[] = [
            `**📊 Business Overview** — ${ai.tenantName}`,
            '',
            `🏥 **Health:** ${ai.businessHealth}`,
            `🏢 **Industry:** ${ai.businessType}`,
            '',
            '**Key Metrics:**',
            `• 💰 Revenue this month: $${ai.revenue.thisMonth.toLocaleString()} (${ai.revenue.growth > 0 ? '+' : ''}${ai.revenue.growth}% MoM)`,
            `• 📊 Pipeline: ${ai.pipeline.totalLeads} leads (${ai.pipeline.conversionRate}% conversion)`,
            `• ✅ Tasks: ${ai.tasks.completionRate}% completion rate (${ai.tasks.overdue} overdue)`,
            `• 👥 Clients: ${ai.clients.total} total (${ai.clients.newThisMonth} new)`,
            `• 📁 Projects: ${ai.projects.active} active`,
            '',
        ];

        // Top insights from BusinessTypeInsightEngine
        const topInsights = ai.insights.slice(0, 3);
        if (topInsights.length > 0) {
            lines.push('**🧠 AI Insights:**');
            topInsights.forEach(i => {
                const icon = i.severity === 'critical' ? '🚨' : i.severity === 'warning' ? '⚠️' : i.severity === 'success' ? '✅' : '💡';
                lines.push(`${icon} ${i.title}: ${i.description}`);
            });
        }

        const actions = ai.insights
            .filter(i => i.action)
            .slice(0, 3)
            .map(i => i.action!);

        return {
            answer: lines.join('\n'),
            suggestedActions: actions.length > 0 ? actions : ['Review your pipeline', 'Check overdue tasks'],
            suggestedFollowUps: [
                'How can I improve my revenue growth?',
                'What should I focus on this week?',
                'Show me pipeline details',
            ],
        };
    }

    // ── TASKS ───────────────────────────────────────────────────────────
    private taskResponse(_msg: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const ai = ctx.aiContext;
        const t = ai.tasks;

        return {
            answer: [
                '**📋 Task Intelligence**',
                '',
                `• **Total:** ${t.total}`,
                `• **Completed:** ${t.completed}`,
                `• **In Progress:** ${t.inProgress}`,
                `• **Overdue:** ${t.overdue}`,
                `• **Completion Rate:** ${t.completionRate}%`,
                '',
                t.overdue > 0
                    ? `⚠️ **${t.overdue} tasks are overdue.** Prioritize these to maintain project timelines.`
                    : '✅ **No overdue tasks!** Great job staying on track.',
            ].join('\n'),
            suggestedActions: t.overdue > 0
                ? ['Review and prioritize overdue tasks', 'Reassign tasks if team is overloaded']
                : ['Review upcoming deadlines', 'Check team workload distribution'],
            suggestedFollowUps: [
                'Which tasks should I prioritize today?',
                'How is the team workload balanced?',
                'Are any projects blocked by tasks?',
            ],
        };
    }

    // ── FINANCE ─────────────────────────────────────────────────────────
    private financeResponse(_msg: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const ai = ctx.aiContext;

        return {
            answer: [
                '**💰 Financial Overview**',
                '',
                `• **Revenue (Total):** $${ai.revenue.total.toLocaleString()}`,
                `• **Revenue (This Month):** $${ai.revenue.thisMonth.toLocaleString()}`,
                `• **Revenue Growth:** ${ai.revenue.growth > 0 ? '+' : ''}${ai.revenue.growth}% MoM`,
                `• **Outstanding:** $${ai.revenue.outstanding.toLocaleString()}`,
                '',
                `• **Expenses (Total):** $${ai.expenses.total.toLocaleString()}`,
                `• **Expenses (This Month):** $${ai.expenses.thisMonth.toLocaleString()}`,
                `• **Pending Approvals:** ${ai.expenses.pending}`,
                '',
                `📈 **Net Position:** $${ai.growthIndicators.netPosition.toLocaleString()}`,
                ai.revenue.growth < 0 ? '\n⚠️ **Revenue is declining.** Review lead pipeline and client retention.' : '',
            ].join('\n'),
            suggestedActions: [
                ai.revenue.outstanding > 0 ? `Follow up on $${ai.revenue.outstanding.toLocaleString()} outstanding` : 'Review revenue targets',
                ai.expenses.pending > 0 ? `Approve ${ai.expenses.pending} pending expenses` : 'Review expense trends',
            ],
            suggestedFollowUps: [
                'How can I reduce outstanding invoices?',
                'What\'s my revenue forecast?',
                'Show me expense trends',
            ],
        };
    }

    // ── BOOKINGS ────────────────────────────────────────────────────────
    private bookingsResponse(_msg: string, ctx: ResolvedCopilotContext): CopilotResponse {
        const ai = ctx.aiContext;
        const b = ai.bookings;

        return {
            answer: [
                '**📅 Bookings Intelligence**',
                '',
                `• **Total:** ${b.total}`,
                `• **Pending:** ${b.pending}`,
                `• **Confirmed:** ${b.confirmed}`,
                `• **Upcoming:** ${b.upcoming}`,
                `• **Cancelled:** ${b.cancelled}`,
                '',
                b.pending > 3
                    ? `⚠️ **${b.pending} bookings pending confirmation.** Confirm these to avoid no-shows.`
                    : '✅ Bookings are looking healthy.',
            ].join('\n'),
            suggestedActions: b.pending > 0
                ? [`Confirm ${b.pending} pending bookings`, 'Send reminders for upcoming bookings']
                : ['Review upcoming bookings', 'Check booking availability'],
            suggestedFollowUps: [
                'What bookings do I have today?',
                'How is my booking utilization?',
                'Are there any scheduling conflicts?',
            ],
        };
    }

    // ── GENERAL (Fallback) ──────────────────────────────────────────────
    private generalResponse(message: string, ctx: ResolvedCopilotContext): CopilotResponse {
        if (this.isRevenueQuestion(message) || this.isFocusQuestion(message) || this.isPipelineQuestion(message)) {
            return this.dashboardResponse(message, ctx);
        }

        const ai = ctx.aiContext;

        const lines: string[] = [
            `**🧠 AI Assistant** — ${ai.tenantName}`,
            '',
            'Here\'s a quick snapshot of your business:',
            '',
            `• 📊 **Pipeline:** ${ai.pipeline.totalLeads} leads (${ai.pipeline.conversionRate}% conversion)`,
            `• 💰 **Revenue:** $${ai.revenue.thisMonth.toLocaleString()} this month (${ai.revenue.growth > 0 ? '+' : ''}${ai.revenue.growth}%)`,
            `• ✅ **Tasks:** ${ai.tasks.completionRate}% completion (${ai.tasks.overdue} overdue)`,
            `• 👥 **Clients:** ${ai.clients.total} total`,
            `• 📁 **Projects:** ${ai.projects.active} active`,
            '',
            '💡 Navigate to a specific page (Leads, Clients, Projects) for deeper, context-aware insights.',
        ];

        // Include top insight
        const topInsight = ai.insights[0];
        if (topInsight) {
            lines.push('');
            lines.push(`**Top Insight:** ${topInsight.title} — ${topInsight.description}`);
        }

        return {
            answer: lines.join('\n'),
            suggestedActions: ai.insights.filter(i => i.action).slice(0, 3).map(i => i.action!),
            suggestedFollowUps: [
                'How is my business doing overall?',
                'What should I focus on this week?',
                'Show me my pipeline summary',
                'Revenue analysis',
            ],
        };
    }
}

export const copilotIntelligenceService = new CopilotIntelligenceService();
