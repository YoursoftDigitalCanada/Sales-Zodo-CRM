import {
    eventBus,
    ReportsReadyEvent,
    ProposalAcceptedEvent,
    ProposalDeclinedEvent,
} from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { notificationsService } from '../notifications/notifications.service';
import { tasksService } from '../tasks/tasks.service';
import { activityLogger } from '../../common/services/activity-logger.service';

// ── Proposal Automation Service ─────────────────────────────────────────
//
// Automates the proposal lifecycle:
//   1. reports.ready     → Auto-create a draft quote/proposal
//   2. proposal.accepted → Move lead to WON, trigger deal conversion
//   3. proposal.declined → Move lead to LOST, notify rep
//
// Uses the existing QuotesService for CRUD and the LeadsService for
// status updates. Communication is event-driven to avoid tight coupling.
// ────────────────────────────────────────────────────────────────────────

export class ProposalAutomationService {
    /**
     * Initialize event listeners. Called once at app startup.
     */
    initialize(): void {
        eventBus.on('reports.ready', (event) => this.handleReportsReady(event));
        eventBus.on('proposal.accepted', (event) => this.handleProposalAccepted(event));
        eventBus.on('proposal.declined', (event) => this.handleProposalDeclined(event));

        logger.info('[ProposalAutomation] Initialized — listening for reports.ready, proposal.accepted, proposal.declined');
    }

    // ── Reports Ready → Auto-Create Proposal ────────────────────────────

    private async handleReportsReady(event: ReportsReadyEvent): Promise<void> {
        const ctx = { leadId: event.leadId, tenantId: event.tenantId };
        logger.info('[ProposalAutomation] reports.ready received', ctx);

        try {
            // 1. Gather estimation data for proposal line items
            const lineItems: Array<{
                description: string;
                quantity: number;
                unitPrice: number;
                total: number;
            }> = [];

            let totalEstimate = 0;

            // Pull inspection data if available
            if (event.inspectionId) {
                const inspection = await prisma.leadInspection.findUnique({
                    where: { id: event.inspectionId },
                    select: {
                        totalSquares: true,
                        totalEstimate: true,
                        customerPrice: true,
                        proposedMaterial: true,
                        materialCost: true,
                        laborCost: true,
                        tearOffCost: true,
                    },
                });

                if (inspection) {
                    const estimate = Number(inspection.customerPrice || inspection.totalEstimate || 0);
                    if (estimate > 0) totalEstimate = estimate;

                    if (Number(inspection.materialCost || 0) > 0) {
                        const cost = Number(inspection.materialCost);
                        lineItems.push({
                            description: `Roofing Materials${inspection.proposedMaterial ? ` (${inspection.proposedMaterial})` : ''}`,
                            quantity: 1,
                            unitPrice: cost,
                            total: cost,
                        });
                    }
                    if (Number(inspection.laborCost || 0) > 0) {
                        const cost = Number(inspection.laborCost);
                        lineItems.push({
                            description: 'Labor & Installation',
                            quantity: 1,
                            unitPrice: cost,
                            total: cost,
                        });
                    }
                    if (Number(inspection.tearOffCost || 0) > 0) {
                        const cost = Number(inspection.tearOffCost);
                        lineItems.push({
                            description: 'Tear-Off & Disposal',
                            quantity: 1,
                            unitPrice: cost,
                            total: cost,
                        });
                    }
                }
            }

            // Pull AI estimate data if available
            if (event.estimateId) {
                const roofEstimate = await prisma.roofEstimate.findUnique({
                    where: { id: event.estimateId },
                    select: {
                        roofAreaSqft: true,
                        totalEstimate: true,
                        pricePerSqft: true,
                        roofType: true,
                        pitch: true,
                    },
                });

                if (roofEstimate) {
                    const aiTotal = Number(roofEstimate.totalEstimate || 0);
                    if (aiTotal > 0 && totalEstimate === 0) {
                        totalEstimate = aiTotal;
                    }

                    // Add AI-derived line items if we don't have inspection-based ones
                    if (lineItems.length === 0 && aiTotal > 0) {
                        lineItems.push({
                            description: `Roof Replacement — ${roofEstimate.roofAreaSqft.toFixed(0)} sq ft${roofEstimate.roofType ? ` (${roofEstimate.roofType})` : ''}`,
                            quantity: 1,
                            unitPrice: aiTotal,
                            total: aiTotal,
                        });
                    }
                }
            }

            // Fallback if no line items could be generated
            if (lineItems.length === 0) {
                lineItems.push({
                    description: 'Roofing Service — See attached report for details',
                    quantity: 1,
                    unitPrice: totalEstimate || 0,
                    total: totalEstimate || 0,
                });
            }

            // 2. Get lead data for the quote
            const lead = await prisma.lead.findUnique({
                where: { id: event.leadId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    companyName: true,
                    propertyAddress: true,
                    serviceType: true,
                },
            });

            if (!lead) {
                logger.warn('[ProposalAutomation] Lead not found, skipping proposal creation', ctx);
                return;
            }

            // 3. Generate quote number
            const quoteCount = await prisma.quote.count({ where: { tenantId: event.tenantId } });
            const quoteNumber = `QT-${new Date().getFullYear()}-${String(quoteCount + 1).padStart(4, '0')}`;

            // 4. Create draft quote
            const total = lineItems.reduce((sum, item) => sum + item.total, 0);

            const quote = await prisma.quote.create({
                data: {
                    tenantId: event.tenantId,
                    quoteNumber,
                    leadId: event.leadId,
                    status: 'DRAFT',
                    issueDate: new Date(),
                    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    subtotal: total,
                    taxAmount: 0,
                    discountAmount: 0,
                    total,
                    currency: 'CAD',
                    notes: [
                        `Proposal for ${lead.firstName} ${lead.lastName}`,
                        lead.companyName ? `Company: ${lead.companyName}` : '',
                        lead.propertyAddress ? `Property: ${lead.propertyAddress}` : '',
                        lead.serviceType ? `Service: ${lead.serviceType}` : '',
                        '',
                        `Estimation method: ${event.estimationMethod.replace(/_/g, ' ').toLowerCase()}`,
                    ].filter(Boolean).join('\n'),
                    items: {
                        create: lineItems.map((item, index) => ({
                            tenantId: event.tenantId,
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.total,
                            sortOrder: index,
                        })),
                    },
                },
            });

            logger.info('[ProposalAutomation] Draft proposal created', { ...ctx, quoteId: quote.id, quoteNumber, total });

            // 5. Update lead pipeline to PROPOSAL
            await prisma.lead.update({
                where: { id: event.leadId },
                data: { status: 'PROPOSAL' },
            });

            // 6. Create review task for sales rep
            try {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 1);

                await tasksService.create(event.tenantId, {
                    title: `📄 Review & send proposal for: ${event.leadName}`,
                    description: [
                        `A draft proposal has been auto-generated from estimation reports.`,
                        `Quote #: ${quoteNumber}`,
                        `Total: $${total.toLocaleString()}`,
                        '',
                        'Action items:',
                        '• Review line items and pricing',
                        '• Add scope of work details',
                        '• Customize warranty terms',
                        '• Send to client for approval',
                    ].join('\n'),
                    priority: 'HIGH',
                    dueDate,
                    assignedToId: event.ownerId || null,
                });
            } catch (err) {
                logger.error('[ProposalAutomation] Proposal review task failed', { ...ctx, err });
            }

            // 7. Notify assigned rep
            if (event.ownerUserId) {
                try {
                    await notificationsService.create({
                        title: '📄 Proposal Auto-Generated',
                        message: `A draft proposal (${quoteNumber}) has been created for "${event.leadName}" based on ${event.estimationMethod.replace(/_/g, ' ').toLowerCase()} reports. Total: $${total.toLocaleString()}. Review and send when ready.`,
                        type: 'SUCCESS',
                        userId: event.ownerUserId,
                        tenantId: event.tenantId,
                        actionUrl: `/quotes/${quote.id}`,
                        actionLabel: 'Review Proposal',
                    });
                } catch (err) {
                    logger.error('[ProposalAutomation] Proposal notification failed', { ...ctx, err });
                }
            }

            // 8. Audit trail
            activityLogger.log({
                tenantId: event.tenantId,
                entityType: 'Lead',
                entityId: event.leadId,
                action: 'CREATE',
                module: 'proposal-automation',
                description: `Auto-generated proposal ${quoteNumber} ($${total.toLocaleString()}) from ${event.estimationMethod} reports`,
                metadata: {
                    quoteId: quote.id,
                    quoteNumber,
                    total,
                    estimationMethod: event.estimationMethod,
                    inspectionId: event.inspectionId,
                    estimateId: event.estimateId,
                    lineItemCount: lineItems.length,
                },
            });
        } catch (err) {
            logger.error('[ProposalAutomation] handleReportsReady failed', { ...ctx, err });
        }
    }

    // ── Proposal Accepted → WON ─────────────────────────────────────────

    private async handleProposalAccepted(event: ProposalAcceptedEvent): Promise<void> {
        const ctx = { leadId: event.leadId, tenantId: event.tenantId, quoteId: event.quoteId };
        logger.info('[ProposalAutomation] proposal.accepted received', ctx);

        try {
            // 1. Get lead details
            const lead = await prisma.lead.findUnique({
                where: { id: event.leadId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    status: true,
                    assignedToId: true,
                    assignedTo: { select: { userId: true } },
                },
            });

            if (!lead) {
                logger.warn('[ProposalAutomation] Lead not found for accepted proposal', ctx);
                return;
            }

            // 2. Move lead to WON (if not already)
            if (lead.status !== 'WON') {
                await prisma.lead.update({
                    where: { id: event.leadId },
                    data: { status: 'WON', lifecycleStage: 'OPPORTUNITY' },
                });

                logger.info('[ProposalAutomation] Lead moved to WON', ctx);
            }

            // 3. Emit deal.won event for downstream conversion
            const leadName = `${lead.firstName} ${lead.lastName}`;
            eventBus.emit('deal.won', {
                tenantId: event.tenantId,
                leadId: event.leadId,
                leadName,
                quoteId: event.quoteId,
                total: event.total,
                ownerUserId: lead.assignedTo?.userId,
                ownerId: lead.assignedToId || undefined,
            });

            // 4. Notify sales rep
            if (lead.assignedTo?.userId) {
                await notificationsService.create({
                    title: '🎉 Proposal Accepted!',
                    message: `"${leadName}" has accepted proposal ${event.quoteNumber}! Deal value: $${event.total.toLocaleString()}. Conversion to client is in progress.`,
                    type: 'SUCCESS',
                    userId: lead.assignedTo.userId,
                    tenantId: event.tenantId,
                    actionUrl: `/leads/${event.leadId}`,
                    actionLabel: 'View Lead',
                });
            }

            // 5. Audit trail
            activityLogger.log({
                tenantId: event.tenantId,
                entityType: 'Lead',
                entityId: event.leadId,
                action: 'STATUS_CHANGE',
                module: 'proposal-automation',
                description: `Proposal ${event.quoteNumber} accepted — deal WON ($${event.total.toLocaleString()})`,
                metadata: { quoteId: event.quoteId, quoteNumber: event.quoteNumber, total: event.total },
            });
        } catch (err) {
            logger.error('[ProposalAutomation] handleProposalAccepted failed', { ...ctx, err });
        }
    }

    // ── Proposal Declined → LOST ────────────────────────────────────────

    private async handleProposalDeclined(event: ProposalDeclinedEvent): Promise<void> {
        const ctx = { leadId: event.leadId, tenantId: event.tenantId, quoteId: event.quoteId };
        logger.info('[ProposalAutomation] proposal.declined received', ctx);

        try {
            // 1. Move lead to LOST
            const lead = await prisma.lead.findUnique({
                where: { id: event.leadId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    status: true,
                    assignedTo: { select: { userId: true } },
                },
            });

            if (!lead) return;

            if (lead.status !== 'LOST' && lead.status !== 'WON') {
                await prisma.lead.update({
                    where: { id: event.leadId },
                    data: { status: 'LOST' },
                });
            }

            const leadName = `${lead.firstName} ${lead.lastName}`;

            // 2. Notify sales rep
            if (lead.assignedTo?.userId) {
                await notificationsService.create({
                    title: '❌ Proposal Declined',
                    message: `"${leadName}" has declined proposal ${event.quoteNumber}. Consider following up to understand their concerns or offer alternatives.`,
                    type: 'WARNING',
                    userId: lead.assignedTo.userId,
                    tenantId: event.tenantId,
                    actionUrl: `/leads/${event.leadId}`,
                    actionLabel: 'View Lead',
                });
            }

            // 3. Create follow-up task
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 2);

            await tasksService.create(event.tenantId, {
                title: `📞 Follow up on declined proposal: ${leadName}`,
                description: [
                    `Proposal ${event.quoteNumber} was declined by "${leadName}".`,
                    '',
                    'Recommended actions:',
                    '• Call to understand concerns',
                    '• Offer alternative pricing/scope',
                    '• Consider negotiation if viable',
                    '• Update lead notes with findings',
                ].join('\n'),
                priority: 'HIGH',
                dueDate,
                assignedToId: lead.assignedTo?.userId ? undefined : null,
            });

            // 4. Audit trail
            activityLogger.log({
                tenantId: event.tenantId,
                entityType: 'Lead',
                entityId: event.leadId,
                action: 'STATUS_CHANGE',
                module: 'proposal-automation',
                description: `Proposal ${event.quoteNumber} declined — lead marked LOST`,
                metadata: { quoteId: event.quoteId, quoteNumber: event.quoteNumber },
            });
        } catch (err) {
            logger.error('[ProposalAutomation] handleProposalDeclined failed', { ...ctx, err });
        }
    }
}

export const proposalAutomationService = new ProposalAutomationService();
