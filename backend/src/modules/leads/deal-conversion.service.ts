import {
    eventBus,
    DealWonEvent,
} from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { notificationsService } from '../notifications/notifications.service';
import { activityLogger } from '../../common/services/activity-logger.service';

// ── Deal Conversion Service ─────────────────────────────────────────────
//
// When a deal is WON (proposal accepted), automatically converts the
// lead into a full client record with associated project and contract.
//
// Conversion flow:
//   1. Create Client from lead data
//   2. Create Project linked to the new client
//   3. Create Contract linked to the project
//   4. Mark lead as converted
//   5. Emit client.created + project.created (triggers existing automation)
//
// All writes are atomic via Prisma transaction.
// ────────────────────────────────────────────────────────────────────────

export class DealConversionService {
    /**
     * Initialize event listeners. Called once at app startup.
     */
    initialize(): void {
        eventBus.on('deal.won', (event) => this.handleDealWon(event));
        logger.info('[DealConversion] Initialized — listening for deal.won');
    }

    // ── Deal Won → Full Conversion ──────────────────────────────────────

    private async handleDealWon(event: DealWonEvent): Promise<void> {
        const ctx = { leadId: event.leadId, tenantId: event.tenantId };
        logger.info('[DealConversion] deal.won received', ctx);

        if (!event.leadId) {
            logger.debug('[DealConversion] deal.won has no leadId; skipping lead conversion workflow', {
                tenantId: event.tenantId,
                dealId: event.dealId || event.projectId,
            });
            return;
        }

        try {
            // ── Pre-flight checks ──────────────────────────────────────────
            const lead = await prisma.lead.findUnique({
                where: { id: event.leadId },
                include: {
                    leadSource: true,
                    assignedTo: { include: { user: true } },
                },
            });

            if (!lead) {
                logger.warn('[DealConversion] Lead not found', ctx);
                return;
            }

            // Skip if already converted
            if (lead.convertedToClientId) {
                logger.info('[DealConversion] Lead already converted, skipping', {
                    ...ctx,
                    existingClientId: lead.convertedToClientId,
                });
                return;
            }

            // ── Atomic conversion transaction ──────────────────────────────
            const result = await prisma.$transaction(async (tx) => {
                // 1. Create Client
                const clientName = lead.companyName
                    ? lead.companyName
                    : `${lead.firstName} ${lead.lastName}`;

                const client = await tx.client.create({
                    data: {
                        tenantId: event.tenantId,
                        clientType: lead.companyName ? 'BUSINESS' : 'INDIVIDUAL',
                        clientName,
                        companyName: lead.companyName || null,
                        primaryEmail: lead.email || '',
                        primaryPhone: lead.phone || '',
                        status: 'ACTIVE',
                        assignedOwnerId: lead.assignedToId,
                        internalNotes: lead.notes,
                        streetAddress: lead.propertyAddress || null,
                        city: lead.city || null,
                        province: lead.state || null,
                        postalCode: lead.zipCode || null,
                        leadSource: lead.leadSource?.name || lead.leadSourceUTM || null,
                        propertyType: lead.propertyType || null,
                        numberOfStories: lead.numberOfStories || null,
                        serviceType: lead.serviceType || null,
                        preferredContactMethod: lead.preferredContactMethod || null,
                        bestTimeToContact: lead.bestTimeToContact || null,
                        currentRoofMaterial: lead.currentRoofMaterial || null,
                        roofAge: lead.roofAge || null,
                        insuranceCompanyName: lead.insuranceCompanyName || null,
                        isInsuranceClaim: lead.isInsuranceClaim || null,
                        isHomeowner: lead.isHomeowner || null,
                        isHOA: lead.isHOA || null,
                        hoaRestrictions: lead.hoaRestrictions || null,
                        secondaryPhone: lead.secondaryPhone || null,
                        spouseCoOwnerName: lead.spouseCoOwnerName || null,
                    },
                });

                // 2. Create Project
                const projectCount = await tx.project.count({ where: { tenantId: event.tenantId } });
                const projectNumber = `PRJ-${new Date().getFullYear()}-${String(projectCount + 1).padStart(4, '0')}`;

                const project = await tx.project.create({
                    data: {
                        tenantId: event.tenantId,
                        name: `${lead.serviceType || 'Roofing'} — ${clientName}`,
                        description: [
                            `Project auto-created from deal conversion.`,
                            `Lead: ${lead.firstName} ${lead.lastName}`,
                            lead.propertyAddress ? `Property: ${lead.propertyAddress}` : '',
                            lead.serviceType ? `Service: ${lead.serviceType}` : '',
                            event.total ? `Deal value: $${event.total.toLocaleString()}` : '',
                        ].filter(Boolean).join('\n'),
                        clientId: client.id,
                        leadId: lead.id,
                        status: 'PLANNING',
                        priority: 'HIGH',
                        projectNumber,
                        contractValue: event.total || 0,
                        salesRepId: lead.assignedToId,
                    },
                });

                // 3. Create Contract
                const contractCount = await tx.contract.count({ where: { tenantId: event.tenantId } });
                const contractNumber = `CTR-${new Date().getFullYear()}-${String(contractCount + 1).padStart(4, '0')}`;

                const contract = await tx.contract.create({
                    data: {
                        tenantId: event.tenantId,
                        clientId: client.id,
                        projectId: project.id,
                        title: `${lead.serviceType || 'Roofing'} Contract — ${clientName}`,
                        contractNumber,
                        status: 'DRAFT',
                        startDate: new Date(),
                        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
                        value: event.total || 0,
                        description: [
                            `Contract for ${lead.serviceType || 'roofing services'}.`,
                            `Client: ${clientName}`,
                            lead.propertyAddress ? `Property: ${lead.propertyAddress}` : '',
                        ].filter(Boolean).join('\n'),
                    },
                });

                // 4. Mark lead as converted
                await tx.lead.update({
                    where: { id: event.leadId },
                    data: {
                        status: 'WON',
                        convertedAt: new Date(),
                        convertedToClientId: client.id,
                    },
                });

                return { client, project, contract };
            });

            logger.info('[DealConversion] Lead converted successfully', {
                ...ctx,
                clientId: result.client.id,
                projectId: result.project.id,
                contractId: result.contract.id,
            });

            // ── Post-commit side effects ───────────────────────────────────

            // Emit client.created (triggers lifecycle, notifications, project bootstrap)
            eventBus.emit('client.created', {
                tenantId: event.tenantId,
                clientId: result.client.id,
                clientName: result.client.clientName,
                clientType: result.client.clientType,
                ownerUserId: event.ownerUserId,
            });

            // Emit project.created (triggers phase tasks, folder, notifications)
            eventBus.emit('project.created', {
                tenantId: event.tenantId,
                projectId: result.project.id,
                projectName: result.project.name,
                clientId: result.client.id,
                assignedToUserId: event.ownerUserId,
            });

            // Notify sales rep
            if (event.ownerUserId) {
                try {
                    await notificationsService.create({
                        title: '🏆 Deal Converted!',
                        message: `"${event.leadName}" has been converted to:\n• Customer: ${result.client.clientName}\n• Deal: ${result.project.name}\n• Contract: ${(result.contract as any).contractNumber || result.contract.title}\n\nDeal value: $${(event.total || 0).toLocaleString()}`,
                        type: 'SUCCESS',
                        userId: event.ownerUserId,
                        tenantId: event.tenantId,
                        actionUrl: `/client-list/${result.client.id}`,
                        actionLabel: 'View Client',
                    });
                } catch (err) {
                    logger.error('[DealConversion] Notification failed', { ...ctx, err });
                }
            }

            // Notify admin team
            try {
                const admins = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId,
                        isActive: true,
                        role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                    },
                    select: { userId: true },
                });

                for (const admin of admins) {
                    if (admin.userId === event.ownerUserId) continue;
                    await notificationsService.create({
                        title: '🎉 New Deal Closed',
                        message: `"${event.leadName}" converted to customer and deal.${event.total ? ` Value: $${event.total.toLocaleString()}` : ''}`,
                        type: 'SUCCESS',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/deals?dealId=${encodeURIComponent(result.project.id)}`,
                        actionLabel: 'View Deal',
                    });
                }
            } catch (err) {
                logger.error('[DealConversion] Admin notifications failed', { ...ctx, err });
            }

            // Comprehensive audit trail
            activityLogger.log({
                tenantId: event.tenantId,
                entityType: 'Lead',
                entityId: event.leadId,
                action: 'STATUS_CHANGE',
                module: 'deal-conversion',
                description: `Deal won → Lead converted to Client + Project + Contract ($${(event.total || 0).toLocaleString()})`,
                metadata: {
                    leadId: event.leadId,
                    clientId: result.client.id,
                    projectId: result.project.id,
                    contractId: result.contract.id,
                    quoteId: event.quoteId,
                    total: event.total,
                },
            });
        } catch (err) {
            logger.error('[DealConversion] handleDealWon CRITICAL — conversion failed', { ...ctx, err });

            // Alert admin about conversion failure
            try {
                const admins = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId,
                        isActive: true,
                        role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                    },
                    select: { userId: true },
                });

                for (const admin of admins) {
                    await notificationsService.create({
                        title: '⚠️ Deal Conversion Failed',
                        message: `Automatic conversion for "${event.leadName}" failed. Please convert manually.`,
                        type: 'ERROR',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/leads/${event.leadId}`,
                        actionLabel: 'View Lead',
                    });
                }
            } catch (_) { /* non-critical */ }
        }
    }
}

export const dealConversionService = new DealConversionService();
