import {
    eventBus,
    LeadConvertedEvent,
    LeadStatusChangedEvent,
    ClientCreatedEvent,
    ProjectCreatedEvent,
    InvoiceStatusChangedEvent,
    LeadCreatedEvent,
    TaskCompletedEvent,
} from '../../common/events/event-bus';
import { notificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/utils/logger';

/**
 * Automation Service
 *
 * Registers event listeners on the CRM event bus and executes
 * built-in automation rules. Each rule is self-contained, idempotent,
 * and logged for observability.
 */
export class AutomationService {
    /**
     * Initialize all automation rules.
     * Called once at application startup.
     */
    initialize(): void {
        this.registerLeadCreatedRules();
        this.registerLeadConvertedRules();
        this.registerLeadStatusChangedRules();
        this.registerClientCreatedRules();
        this.registerProjectCreatedRules();
        this.registerInvoiceStatusChangedRules();
        this.registerTaskCompletedRules();

        logger.info('[Automation] All automation rules registered', {
            rules: [
                'lead.created → notification',
                'lead.converted → notification',
                'lead.statusChanged → notification (WON/LOST)',
                'client.created → notification',
                'project.created → notification',
                'invoice.statusChanged → notification (OVERDUE/PAID)',
                'task.completed → notification',
            ],
        });
    }

    // ── Lead Created ──────────────────────────────────────────────────────

    private registerLeadCreatedRules(): void {
        eventBus.on('lead.created', async (event: LeadCreatedEvent) => {
            // Notify lead owner (if assigned)
            if (event.ownerUserId) {
                await notificationsService.create({
                    title: '🆕 New Lead Assigned',
                    message: `A new lead "${event.leadName}" has been assigned to you${event.source ? ` from ${event.source}` : ''}.`,
                    type: 'INFO',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/leads/${event.leadId}`,
                    actionLabel: 'View Lead',
                });
                logger.debug('[Automation] lead.created → notification sent', { leadId: event.leadId });
            }
        });
    }

    // ── Lead Converted ────────────────────────────────────────────────────

    private registerLeadConvertedRules(): void {
        eventBus.on('lead.converted', async (event: LeadConvertedEvent) => {
            // Notify the lead owner about successful conversion
            if (event.ownerUserId) {
                await notificationsService.create({
                    title: '🎉 Lead Converted to Client',
                    message: `"${event.leadName}" has been converted to a ${event.clientType} client by a team member.`,
                    type: 'SUCCESS',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/client-list/${event.clientId}`,
                    actionLabel: 'View Client',
                });
            }

            // Also notify the user who performed the conversion (if different from owner)
            if (event.convertedByUserId && event.convertedByUserId !== event.ownerUserId) {
                await notificationsService.create({
                    title: '✅ Conversion Complete',
                    message: `"${event.leadName}" is now a client. You can start creating projects and invoices.`,
                    type: 'SUCCESS',
                    userId: event.convertedByUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/client-list/${event.clientId}`,
                    actionLabel: 'View Client',
                });
            }

            logger.debug('[Automation] lead.converted → notifications sent', {
                leadId: event.leadId,
                clientId: event.clientId,
            });
        });
    }

    // ── Lead Status Changed ───────────────────────────────────────────────

    private registerLeadStatusChangedRules(): void {
        eventBus.on('lead.statusChanged', async (event: LeadStatusChangedEvent) => {
            // Notify owner when a lead moves to WON or LOST
            if (event.ownerUserId && (event.newStatus === 'WON' || event.newStatus === 'LOST')) {
                const emoji = event.newStatus === 'WON' ? '🏆' : '❌';
                await notificationsService.create({
                    title: `${emoji} Lead ${event.newStatus === 'WON' ? 'Won' : 'Lost'}`,
                    message: `Lead "${event.leadName}" has been marked as ${event.newStatus}.`,
                    type: event.newStatus === 'WON' ? 'SUCCESS' : 'WARNING',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/leads/${event.leadId}`,
                    actionLabel: 'View Lead',
                });
                logger.debug('[Automation] lead.statusChanged (terminal) → notification sent', {
                    leadId: event.leadId,
                    newStatus: event.newStatus,
                });
            }
        });
    }

    // ── Client Created ────────────────────────────────────────────────────

    private registerClientCreatedRules(): void {
        eventBus.on('client.created', async (event: ClientCreatedEvent) => {
            if (event.ownerUserId) {
                await notificationsService.create({
                    title: '🏢 New Client Created',
                    message: `A new ${event.clientType} client "${event.clientName}" has been created.`,
                    type: 'INFO',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/client-list/${event.clientId}`,
                    actionLabel: 'View Client',
                });
                logger.debug('[Automation] client.created → notification sent', { clientId: event.clientId });
            }
        });
    }

    // ── Project Created ───────────────────────────────────────────────────

    private registerProjectCreatedRules(): void {
        eventBus.on('project.created', async (event: ProjectCreatedEvent) => {
            if (event.assignedToUserId) {
                await notificationsService.create({
                    title: '📁 New Project Assigned',
                    message: `You have been assigned to project "${event.projectName}".`,
                    type: 'INFO',
                    userId: event.assignedToUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/projects/${event.projectId}`,
                    actionLabel: 'View Project',
                });
                logger.debug('[Automation] project.created → notification sent', {
                    projectId: event.projectId,
                });
            }
        });
    }

    // ── Invoice Status Changed ────────────────────────────────────────────

    private registerInvoiceStatusChangedRules(): void {
        eventBus.on('invoice.statusChanged', async (event: InvoiceStatusChangedEvent) => {
            // OVERDUE notification
            if (event.newStatus === 'OVERDUE' && event.ownerUserId) {
                await notificationsService.create({
                    title: '⚠️ Invoice Overdue',
                    message: `Invoice #${event.invoiceNumber} is now overdue. Follow up with the client.`,
                    type: 'WARNING',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/invoices/${event.invoiceId}`,
                    actionLabel: 'View Invoice',
                });
                logger.debug('[Automation] invoice.statusChanged (OVERDUE) → notification sent', {
                    invoiceId: event.invoiceId,
                });
            }

            // PAID notification
            if (event.newStatus === 'PAID' && event.ownerUserId) {
                await notificationsService.create({
                    title: '💰 Payment Received',
                    message: `Invoice #${event.invoiceNumber} has been marked as paid.`,
                    type: 'SUCCESS',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/invoices/${event.invoiceId}`,
                    actionLabel: 'View Invoice',
                });
                logger.debug('[Automation] invoice.statusChanged (PAID) → notification sent', {
                    invoiceId: event.invoiceId,
                });
            }
        });
    }

    // ── Task Completed ────────────────────────────────────────────────────

    private registerTaskCompletedRules(): void {
        eventBus.on('task.completed', async (event: TaskCompletedEvent) => {
            if (event.completedByUserId) {
                await notificationsService.create({
                    title: '✅ Task Completed',
                    message: `Task "${event.taskTitle}" has been marked as done.`,
                    type: 'SUCCESS',
                    userId: event.completedByUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/tasks`,
                    actionLabel: 'View Tasks',
                });
                logger.debug('[Automation] task.completed → notification sent', {
                    taskId: event.taskId,
                });
            }
        });
    }
}

export const automationService = new AutomationService();
