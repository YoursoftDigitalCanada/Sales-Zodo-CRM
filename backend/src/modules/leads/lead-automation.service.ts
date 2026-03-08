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
    propertyAddress?: string | null;
    city?: string | null;
    zipCode?: string | null;
    budgetRange?: string | null;
    urgencyLevel?: string | null;
    isHomeowner?: string | null;
    isDecisionMaker?: string | null;
    serviceType?: string | null;
    companyName?: string | null;
    potentialValue?: any;
}

export class LeadAutomationService {
    /**
     * Calculate lead score (1-10) based on data completeness and qualification signals.
     *
     * Scoring breakdown:
     *   Contact info:   email (+1), phone (+1)
     *   Property data:  address (+1), city+zip (+1)
     *   Budget signal:  mapped by range (0-2)
     *   Urgency signal: mapped by level (0-2)
     *   Ownership:      homeowner (+1), decision maker (+1)
     *
     * Max theoretical score = 10
     */
    calculateLeadScore(lead: LeadScoreInput): number {
        let score = 0;

        // Contact completeness
        if (lead.email) score += 1;
        if (lead.phone) score += 1;

        // Property data completeness
        if (lead.propertyAddress) score += 1;
        if (lead.city && lead.zipCode) score += 1;

        // Budget signal
        const budgetMap: Record<string, number> = {
            'Under $5k': 0,
            '$5-10k': 1,
            '$10-20k': 1,
            '$20k+': 2,
            'Insurance': 2,
        };
        if (lead.budgetRange && budgetMap[lead.budgetRange] !== undefined) {
            score += budgetMap[lead.budgetRange];
        }

        // Urgency signal
        const urgencyMap: Record<string, number> = {
            'Planning': 0,
            'Within weeks': 1,
            'ASAP': 2,
            'Emergency': 2,
        };
        if (lead.urgencyLevel && urgencyMap[lead.urgencyLevel] !== undefined) {
            score += urgencyMap[lead.urgencyLevel];
        }

        // Ownership qualification
        if (lead.isHomeowner === 'Yes') score += 1;
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
                    propertyAddress: true,
                    city: true,
                    zipCode: true,
                    budgetRange: true,
                    urgencyLevel: true,
                    isHomeowner: true,
                    isDecisionMaker: true,
                    serviceType: true,
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
