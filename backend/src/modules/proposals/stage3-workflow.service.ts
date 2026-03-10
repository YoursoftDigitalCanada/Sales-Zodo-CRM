import {
    eventBus,
    ProposalGeneratedEvent,
} from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { notificationsService } from '../notifications/notifications.service';
import { tasksService } from '../tasks/tasks.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { foldersService } from '../folders/folders.service';

// ============================================================================
// STAGE 3 WORKFLOW SERVICE
//
// Listens to proposal.generated event and executes automations:
//   1. Save proposal PDF → File Manager (/Leads/{LeadID}/Proposals/)
//   2. Create "Review & Send Proposal" task for lead owner
//   3. Notify sales rep that proposal is ready
//   4. Update lead pipeline to PROPOSAL
//   5. Log activity
// ============================================================================

export class Stage3WorkflowService {

    initialize(): void {
        eventBus.on('proposal.generated', (event) => this.handleProposalGenerated(event));
        logger.info('[Stage3Workflow] Initialized — listening for proposal.generated');
    }

    private async handleProposalGenerated(event: ProposalGeneratedEvent): Promise<void> {
        const ctx = {
            proposalId: event.proposalId,
            leadId: event.leadId,
            tenantId: event.tenantId,
        };
        logger.info('[Stage3Workflow] proposal.generated received', ctx);

        // Run all automations in parallel (isolated error handling)
        const results = await Promise.allSettled([
            this.createProposalFolder(event),
            this.createReviewTask(event),
            this.notifySalesRep(event),
            this.updatePipeline(event),
        ]);

        for (const r of results) {
            if (r.status === 'rejected') {
                logger.error('[Stage3Workflow] Automation failed', { ...ctx, err: r.reason });
            }
        }
    }

    // ── 1. Create Proposal Folder in File Manager ─────────────────────────

    private async createProposalFolder(event: ProposalGeneratedEvent): Promise<void> {
        try {
            // Check if folder exists already
            const existingFolder = await prisma.folder.findFirst({
                where: {
                    tenantId: event.tenantId,
                    name: 'Proposals',
                    parentId: null, // TODO: find the Leads/{LeadID} parent
                },
            });

            if (!existingFolder) {
                // Find or create Leads folder
                let leadsFolder = await prisma.folder.findFirst({
                    where: { tenantId: event.tenantId, name: 'Leads', parentId: null },
                });

                if (!leadsFolder) {
                    const created = await foldersService.create(event.tenantId, {
                        name: 'Leads',
                    });
                    leadsFolder = { id: created.id } as any;
                }

                // Find or create lead-specific folder
                let leadFolder = await prisma.folder.findFirst({
                    where: {
                        tenantId: event.tenantId,
                        name: event.leadId,
                        parentId: leadsFolder!.id,
                    },
                });

                if (!leadFolder) {
                    const created = await foldersService.create(event.tenantId, {
                        name: event.leadName || event.leadId,
                        parentId: leadsFolder!.id,
                    });
                    leadFolder = { id: created.id } as any;
                }

                // Create Proposals folder under lead
                await foldersService.create(event.tenantId, {
                    name: 'Proposals',
                    parentId: leadFolder!.id,
                });
            }

            logger.info('[Stage3Workflow] Proposal folder created/verified', {
                leadId: event.leadId,
                tenantId: event.tenantId,
            });
        } catch (err) {
            logger.error('[Stage3Workflow] Folder creation failed', {
                leadId: event.leadId,
                err,
            });
        }
    }

    // ── 2. Create "Review & Send Proposal" Task ─────────────────────────

    private async createReviewTask(event: ProposalGeneratedEvent): Promise<void> {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 2); // Due in 2 business days

        // Skip weekends
        while (dueDate.getDay() === 0 || dueDate.getDay() === 6) {
            dueDate.setDate(dueDate.getDate() + 1);
        }

        await tasksService.create(event.tenantId, {
            title: `📋 Review & Send Proposal for: ${event.leadName}`,
            description: [
                `A proposal has been auto-generated for "${event.leadName}".`,
                '',
                `Proposal: ${event.proposalId}`,
                `Quote: ${event.quoteNumber}`,
                `Total: $${event.total.toLocaleString()}`,
                '',
                'Next steps:',
                '• Review the proposal PDF for accuracy',
                '• Verify pricing and payment terms',
                '• Customize the client message (if needed)',
                '• Send the proposal to the client',
            ].join('\n'),
            priority: 'HIGH',
            dueDate,
            assignedToId: event.ownerId || null,
        });

        logger.info('[Stage3Workflow] Review task created', {
            leadId: event.leadId,
            proposalId: event.proposalId,
        });
    }

    // ── 3. Notify Sales Rep ─────────────────────────────────────────────

    private async notifySalesRep(event: ProposalGeneratedEvent): Promise<void> {
        if (!event.ownerUserId) {
            logger.debug('[Stage3Workflow] No owner — skipping notification', {
                leadId: event.leadId,
            });
            return;
        }

        await notificationsService.create({
            title: '📋 Proposal Generated',
            message: `A proposal has been generated for lead "${event.leadName}" (Quote: ${event.quoteNumber}, Total: $${event.total.toLocaleString()}). Review and send it to the client.`,
            type: 'INFO',
            userId: event.ownerUserId,
            tenantId: event.tenantId,
            actionUrl: `/proposals/${event.proposalId}`,
            actionLabel: 'View Proposal',
        });

        logger.info('[Stage3Workflow] Notification sent to rep', {
            userId: event.ownerUserId,
            proposalId: event.proposalId,
        });
    }

    // ── 4. Update Lead Pipeline to PROPOSAL ─────────────────────────────

    private async updatePipeline(event: ProposalGeneratedEvent): Promise<void> {
        try {
            const lead = await prisma.lead.findUnique({
                where: { id: event.leadId },
                select: { id: true, status: true },
            });

            if (!lead) return;

            // Only transition if currently CONTACTED or QUALIFIED
            if (lead.status === 'CONTACTED' || lead.status === 'QUALIFIED') {
                await prisma.lead.update({
                    where: { id: event.leadId },
                    data: { status: 'PROPOSAL' },
                });

                // Emit lead.statusChanged for downstream automations
                eventBus.emit('lead.statusChanged', {
                    tenantId: event.tenantId,
                    leadId: event.leadId,
                    leadName: event.leadName,
                    oldStatus: lead.status,
                    newStatus: 'PROPOSAL',
                    ownerId: event.ownerId,
                    ownerUserId: event.ownerUserId,
                });

                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Lead',
                    entityId: event.leadId,
                    action: 'STATUS_CHANGE',
                    module: 'proposals',
                    description: `Pipeline: ${lead.status} → PROPOSAL (proposal generated)`,
                    metadata: {
                        oldStatus: lead.status,
                        newStatus: 'PROPOSAL',
                        proposalId: event.proposalId,
                    },
                });

                logger.info('[Stage3Workflow] Pipeline updated to PROPOSAL', {
                    leadId: event.leadId,
                    oldStatus: lead.status,
                });
            } else {
                logger.debug('[Stage3Workflow] Pipeline not updated — lead not in CONTACTED/QUALIFIED', {
                    leadId: event.leadId,
                    currentStatus: lead.status,
                });
            }
        } catch (err) {
            logger.error('[Stage3Workflow] Pipeline update failed', {
                leadId: event.leadId,
                err,
            });
        }
    }
}

export const stage3WorkflowService = new Stage3WorkflowService();
