import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';

// ── Lead Score Calculation ──────────────────────────────────────────────
//
// Calculates a 1-10 score based on lead completeness, qualification
// signals, and engagement indicators. Called automatically on lead
// creation and available for manual recalculation.
// ────────────────────────────────────────────────────────────────────────

interface LeadScoreInput {
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    city?: string | null;
    zipCode?: string | null;
    budgetRange?: string | null;
    urgencyLevel?: string | null;
    isDecisionMaker?: string | null;
    productInterest?: string | null;
    companyName?: string | null;
    potentialValue?: any;
}

export class LeadAutomationService {
    /**
     * Calculate lead score (1-10) based on data completeness and qualification signals.
     *
     * Scoring breakdown:
     *   Contact info:   email (+1), phone (+1)
     *   Company data:   company/location (+1), city+zip (+1)
     *   Budget signal:  mapped by range (0-2)
     *   Urgency signal: mapped by level (0-2)
     *   Authority:      product interest (+1), decision maker (+1)
     *
     * Max theoretical score = 10
     */
    calculateLeadScore(lead: LeadScoreInput): number {
        let score = 0;

        // Contact completeness
        if (lead.email) score += 1;
        if (lead.phone) score += 1;

        // Company data completeness
        if (lead.companyName || lead.location) score += 1;
        if (lead.city && lead.zipCode) score += 1;

        // Budget signal
        const budgetMap: Record<string, number> = {
            'Under $500/mo': 0,
            '$500 - $1,500/mo': 1,
            '$1,500 - $5,000/mo': 1,
            '$5,000+/mo': 2,
            'Annual budget approved': 2,
        };
        if (lead.budgetRange && budgetMap[lead.budgetRange] !== undefined) {
            score += budgetMap[lead.budgetRange];
        }

        // Urgency signal
        const urgencyMap: Record<string, number> = {
            'Just researching': 0,
            'Next quarter': 1,
            'This quarter': 1,
            'Urgent - this month': 2,
        };
        if (lead.urgencyLevel && urgencyMap[lead.urgencyLevel] !== undefined) {
            score += urgencyMap[lead.urgencyLevel];
        }

        // Buying authority and fit
        if (lead.productInterest) score += 1;
        if (lead.isDecisionMaker === 'Yes') score += 1;

        // Clamp to 1-10 range
        return Math.max(1, Math.min(10, score));
    }

    /**
     * Calculate and persist lead score to the database.
     * Non-blocking — failures are logged but never thrown.
     */
    async scoreAndSave(tenantId: string, leadId: string): Promise<void> {
        try {
            const lead = await prisma.lead.findUnique({
                where: { id: leadId },
                select: {
                    email: true,
                    phone: true,
                    location: true,
                    city: true,
                    zipCode: true,
                    budgetRange: true,
                    urgencyLevel: true,
                    isDecisionMaker: true,
                    productInterest: true,
                    companyName: true,
                    potentialValue: true,
                    tenantId: true,
                },
            });

            if (!lead || lead.tenantId !== tenantId) return;

            const score = this.calculateLeadScore(lead);

            await prisma.lead.update({
                where: { id: leadId },
                data: { leadScore: score },
            });

            logger.info('[LeadAutomation] Lead scored', {
                leadId,
                tenantId,
                score,
            });
        } catch (err) {
            logger.error('[LeadAutomation] Lead scoring failed', {
                leadId,
                tenantId,
                err,
            });
        }
    }
}

export const leadAutomationService = new LeadAutomationService();
