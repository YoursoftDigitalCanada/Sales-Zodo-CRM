import {
    eventBus,
    CRMEventName,
    CRMEventMap,
    LeadConvertedEvent,
    LeadStatusChangedEvent,
    ClientCreatedEvent,
    ProjectCreatedEvent,
    InvoiceStatusChangedEvent,
    LeadCreatedEvent,
    TaskCompletedEvent,
    InvoiceCreatedEvent,
    InvoiceUpdatedEvent,
    PaymentReceivedEvent,
    BookingCreatedEvent,
    BookingConfirmedEvent,
    BookingCancelledEvent,
    ExpenseCreatedEvent,
    ExpenseApprovedEvent,
    ClientUpdatedEvent,
    ClientDeletedEvent,
    ContactCreatedEvent,
    ContactUpdatedEvent,
    ContactDeletedEvent,
    CalendarEventCreatedEvent,
    EmployeeCreatedEvent,
    ApplicationStatusChangedEvent,
    OrderStatusChangedEvent,
    FileUploadedEvent,
    GroupCreatedEvent,
    GroupUpdatedEvent,
    LifecycleAtRiskEvent,
    ServiceCreatedEvent,
    ServiceUpdatedEvent,
    ServiceDeletedEvent,
    ServiceSelectedEvent,
    ClientLifecycleChangedEvent,
    ProjectStatusChangedEvent,
    InvoiceSentEvent,
} from '../../common/events/event-bus';
import { notificationsService } from '../notifications/notifications.service';
import { tasksService } from '../tasks/tasks.service';
import { logger } from '../../common/utils/logger';
import { activityLogger } from '../../common/services/activity-logger.service';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { prisma } from '../../config/database';

// ── Extensible Hook Types ────────────────────────────────────────────────

/**
 * An automation hook is a named, tenant-aware handler that runs in response
 * to a domain event. Hooks are non-blocking and failure-isolated.
 *
 * Future hook types (task creation, lifecycle triggers, analytics updates,
 * webhook dispatch, etc.) can be added by registering new hooks via
 * `registerHook()` without modifying existing handlers.
 */
export interface AutomationHook<E extends CRMEventName = CRMEventName> {
    /** Unique identifier for debugging and observability */
    name: string;
    /** The domain event this hook responds to */
    event: E;
    /** Hook handler — receives the typed event payload */
    handler: (payload: CRMEventMap[E]) => void | Promise<void>;
}

// ── Automation Service ───────────────────────────────────────────────────

/**
 * Automation Service
 *
 * Registers event listeners on the CRM event bus and executes
 * built-in automation rules. Supports extensible hooks that can be
 * registered at startup for future orchestration needs (task creation,
 * lifecycle triggers, analytics updates, webhooks, etc.).
 *
 * Design Principles:
 * 1. All handlers are tenant-scoped (tenantId flows through every event payload)
 * 2. Hooks are non-blocking — failures are logged, never re-thrown
 * 3. Multiple hooks per event are supported and run independently
 * 4. No complex rule engine — structural readiness only
 */
export class AutomationService {
    private hooks: AutomationHook[] = [];

    // ── Public API ─────────────────────────────────────────────────────

    /**
     * Initialize all built-in automation rules and activate registered hooks.
     * Called once at application startup.
     */
    initialize(): void {
        // === Existing notification handlers (preserved) ===
        this.registerBuiltInNotifications();

        // === New event handlers for recently added events ===
        this.registerNewEventHandlers();

        // === Activate any externally registered hooks ===
        this.activateHooks();

        logger.info('[Automation] Initialized', {
            builtInRules: this.getBuiltInRuleNames(),
            externalHooks: this.hooks.map(h => `${h.event} → ${h.name}`),
        });
    }

    /**
     * Register an external hook for future extensibility.
     * Call this BEFORE `initialize()` at application startup.
     *
     * Example use cases:
     * - Auto-create follow-up tasks when a lead is converted
     * - Trigger analytics recalculation on payment received
     * - Send webhook to external systems on client deletion
     * - Progress lifecycle stage on booking confirmation
     */
    registerHook<E extends CRMEventName>(hook: AutomationHook<E>): void {
        this.hooks.push(hook as unknown as AutomationHook);
        logger.debug('[Automation] Hook registered', { name: hook.name, event: hook.event });
    }

    /**
     * Get all registered hooks (for observability / admin endpoints).
     */
    getRegisteredHooks(): { name: string; event: string }[] {
        return this.hooks.map(h => ({ name: h.name, event: h.event }));
    }

    // ── Built-In Notification Handlers (Preserved) ─────────────────────

    private registerBuiltInNotifications(): void {
        // ── Lead Created ──
        eventBus.on('lead.created', async (event: LeadCreatedEvent) => {
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

        // ── Lead Converted ──
        eventBus.on('lead.converted', async (event: LeadConvertedEvent) => {
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

        // ── Lead Status Changed (WON/LOST) ──
        eventBus.on('lead.statusChanged', async (event: LeadStatusChangedEvent) => {
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

        // ── Client Created ──
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

        // ── Project Created ──
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

        // ── Invoice Status Changed (OVERDUE / PAID) ──
        eventBus.on('invoice.statusChanged', async (event: InvoiceStatusChangedEvent) => {
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

        // ── Task Completed ──
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

    // ── New Event Handlers ──────────────────────────────────────────────

    private registerNewEventHandlers(): void {
        // ── Booking Confirmed → Follow-up task + confirmation notification ──
        eventBus.on('booking.confirmed', async (event: BookingConfirmedEvent) => {
            logger.debug('[Automation] booking.confirmed received', { bookingId: event.bookingId });

            // Create a follow-up task 3 days after confirmation
            const followUpDate = new Date();
            followUpDate.setDate(followUpDate.getDate() + 3);

            try {
                await tasksService.create(event.tenantId, {
                    title: `Follow up on confirmed booking #${event.bookingId.slice(0, 8)}`,
                    description: `Client booking was confirmed. Reach out to confirm details, preparation instructions, or upsell additional services.`,
                    priority: 'MEDIUM',
                    dueDate: followUpDate,
                    clientId: event.clientId || null,
                });
                logger.info('[Automation] booking.confirmed → follow-up task created', {
                    bookingId: event.bookingId,
                });
            } catch (err) {
                logger.error('[Automation] booking.confirmed → failed to create task', { err });
            }
        });

        // ── Booking Cancelled → Internal notification ──
        eventBus.on('booking.cancelled', async (event: BookingCancelledEvent) => {
            logger.debug('[Automation] booking.cancelled received', { bookingId: event.bookingId });

            // Notify team about cancellation for potential win-back
            try {
                const adminEmployees = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId,
                        isActive: true,
                        role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                    },
                    select: { userId: true },
                });
                for (const admin of adminEmployees) {
                    await notificationsService.create({
                        title: '❌ Booking Cancelled',
                        message: `Booking #${event.bookingId.slice(0, 8)} has been cancelled. Consider reaching out for rescheduling.`,
                        type: 'WARNING',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/bookings`,
                        actionLabel: 'View Bookings',
                    });
                }
                logger.info('[Automation] booking.cancelled → admin notifications sent', {
                    bookingId: event.bookingId, adminCount: adminEmployees.length,
                });
            } catch (err) {
                logger.error('[Automation] booking.cancelled → notification failed', { err });
            }
        });

        // ── Booking Created → Preparation reminder task ──
        eventBus.on('booking.created', async (event: BookingCreatedEvent) => {
            logger.debug('[Automation] booking.created received', { bookingId: event.bookingId });

            try {
                await tasksService.create(event.tenantId, {
                    title: `Prepare for upcoming booking #${event.bookingId.slice(0, 8)}`,
                    description: `New booking received${event.serviceType ? ` for "${event.serviceType}"` : ''}. Confirm materials, schedule staff, and send client prep instructions.`,
                    priority: 'HIGH',
                    clientId: event.clientId || null,
                });
                logger.info('[Automation] booking.created → preparation task created', {
                    bookingId: event.bookingId,
                });
            } catch (err) {
                logger.error('[Automation] booking.created → task creation failed', { err });
            }
        });

        // ── Payment Received → Thank-you notification + lifecycle evaluation ──
        eventBus.on('payment.received', async (event: PaymentReceivedEvent) => {
            logger.debug('[Automation] payment.received received', { invoiceId: event.invoiceId });

            // Send thank-you notification to the user who recorded the payment
            if (event.paidByUserId) {
                try {
                    await notificationsService.create({
                        title: '💰 Payment Recorded',
                        message: `Payment received for invoice #${event.invoiceNumber}${event.amount ? ` ($${event.amount})` : ''}. Great work!`,
                        type: 'SUCCESS',
                        userId: event.paidByUserId,
                        tenantId: event.tenantId,
                        actionUrl: `/invoices/${event.invoiceId}`,
                        actionLabel: 'View Invoice',
                    });
                } catch (err) {
                    logger.error('[Automation] payment.received → notification failed', { err });
                }
            }

            // Reinforce engagement for VIP evaluation
            if (event.clientId) {
                await clientLifecycleService.reinforceEngagement(event.clientId, event.tenantId);
            }

            logger.info('[Automation] payment.received → processed', {
                invoiceId: event.invoiceId, clientId: event.clientId,
            });
        });

        // ── Expense Created → Manager notification ──
        eventBus.on('expense.created', async (event: ExpenseCreatedEvent) => {
            logger.debug('[Automation] expense.created received', { expenseId: event.expenseId });

            // Notify admins about new expense requiring approval
            try {
                const adminEmployees = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId,
                        isActive: true,
                        role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                    },
                    select: { userId: true },
                });
                for (const admin of adminEmployees) {
                    await notificationsService.create({
                        title: '💸 New Expense Submitted',
                        message: `An expense of $${event.amount || 'N/A'}${event.category ? ` (${event.category})` : ''} needs review.`,
                        type: 'INFO',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/expenses`,
                        actionLabel: 'Review Expense',
                    });
                }
            } catch (err) {
                logger.error('[Automation] expense.created → notification failed', { err });
            }
        });

        // ── Expense Approved → Submitter notification ──
        eventBus.on('expense.approved', async (event: ExpenseApprovedEvent) => {
            logger.debug('[Automation] expense.approved received', { expenseId: event.expenseId });

            if (event.approvedById) {
                try {
                    await notificationsService.create({
                        title: '✅ Expense Approved',
                        message: `Your expense of $${event.amount || 'N/A'} has been approved.`,
                        type: 'SUCCESS',
                        userId: event.approvedById,
                        tenantId: event.tenantId,
                        actionUrl: `/expenses`,
                        actionLabel: 'View Expenses',
                    });
                } catch (err) {
                    logger.error('[Automation] expense.approved → notification failed', { err });
                }
            }
        });

        // ── Invoice Created → Audit enrichment ──
        eventBus.on('invoice.created', async (event: InvoiceCreatedEvent) => {
            logger.debug('[Automation] invoice.created received', { invoiceId: event.invoiceId });
            // Extensibility: auto-sending invoices, payment reminder scheduling.
        });

        // ── Invoice Updated → Audit enrichment ──
        eventBus.on('invoice.updated', async (event: InvoiceUpdatedEvent) => {
            logger.debug('[Automation] invoice.updated received', { invoiceId: event.invoiceId });
            // Extensibility: change notifications, client notifications.
        });

        // ── Client Updated → CRM sync hook ──
        eventBus.on('client.updated', async (event: ClientUpdatedEvent) => {
            logger.debug('[Automation] client.updated received', { clientId: event.clientId });
            // Extensibility: CRM sync, compliance checks.
        });

        // ── Client Deleted → Cleanup notification ──
        eventBus.on('client.deleted', async (event: ClientDeletedEvent) => {
            logger.debug('[Automation] client.deleted received', { clientId: event.clientId });
            // Extensibility: data retention, cascading cleanup.
        });

        // ── Contact Created ──
        eventBus.on('contact.created', async (event: ContactCreatedEvent) => {
            logger.debug('[Automation] contact.created received', {
                contactId: event.contactId, tenantId: event.tenantId,
            });
        });

        // ── Contact Updated ──
        eventBus.on('contact.updated', async (event: ContactUpdatedEvent) => {
            logger.debug('[Automation] contact.updated received', {
                contactId: event.contactId, tenantId: event.tenantId,
            });
        });

        // ── Contact Deleted ──
        eventBus.on('contact.deleted', async (event: ContactDeletedEvent) => {
            logger.debug('[Automation] contact.deleted received', {
                contactId: event.contactId, tenantId: event.tenantId,
            });
        });

        // ── Calendar Event Created ──
        eventBus.on('calendar.created', async (event: CalendarEventCreatedEvent) => {
            logger.debug('[Automation] calendar.created received', {
                eventId: event.eventId, tenantId: event.tenantId,
            });
        });

        // ── Employee Created → Welcome notification ──
        eventBus.on('employee.created', async (event: EmployeeCreatedEvent) => {
            logger.debug('[Automation] employee.created received', {
                employeeId: event.employeeId, tenantId: event.tenantId,
            });
            // Extensibility: trigger onboarding workflow, provision accounts.
        });

        // ── Application Status Changed ──
        eventBus.on('application.statusChanged', async (event: ApplicationStatusChangedEvent) => {
            logger.debug('[Automation] application.statusChanged received', {
                applicationId: event.applicationId, tenantId: event.tenantId,
            });
        });

        // ── Order Status Changed → Fulfillment notification ──
        eventBus.on('order.statusChanged', async (event: OrderStatusChangedEvent) => {
            logger.debug('[Automation] order.statusChanged received', {
                orderId: event.orderId, tenantId: event.tenantId,
            });
        });

        // ── File Uploaded → Enrich audit trail with project metadata ──
        eventBus.on('file.uploaded', async (event: FileUploadedEvent) => {
            logger.debug('[Automation] file.uploaded received', {
                fileId: event.fileId, tenantId: event.tenantId,
            });

            // Enrich audit trail with file context
            activityLogger.log({
                tenantId: event.tenantId,
                entityType: 'File',
                entityId: event.fileId,
                action: 'CREATE',
                module: 'automation',
                description: `File "${event.fileName}" processed by automation pipeline`,
                metadata: { mimeType: event.mimeType, fileName: event.fileName },
            });
        });

        // ── Group Created ──
        eventBus.on('group.created', async (event: GroupCreatedEvent) => {
            logger.debug('[Automation] group.created received', {
                groupId: event.groupId, tenantId: event.tenantId,
            });
        });

        // ── Group Updated ──
        eventBus.on('group.updated', async (event: GroupUpdatedEvent) => {
            logger.debug('[Automation] group.updated received', {
                groupId: event.groupId, tenantId: event.tenantId,
            });
        });

        // ── Service Created ──
        eventBus.on('service.created', async (event: ServiceCreatedEvent) => {
            logger.debug('[Automation] service.created received', {
                serviceId: event.serviceId, tenantId: event.tenantId,
            });
            // Extensibility: auto-attach to default booking types, sync service catalog.
        });

        // ── Service Updated ──
        eventBus.on('service.updated', async (event: ServiceUpdatedEvent) => {
            logger.debug('[Automation] service.updated received', {
                serviceId: event.serviceId, tenantId: event.tenantId,
            });
            // Extensibility: propagate pricing changes to active bookings/invoices.
        });

        // ── Service Deleted ──
        eventBus.on('service.deleted', async (event: ServiceDeletedEvent) => {
            logger.debug('[Automation] service.deleted received', {
                serviceId: event.serviceId, tenantId: event.tenantId,
            });
            // Extensibility: notify assigned bookings, update catalogs.
        });

        // ── Service Selected ──
        eventBus.on('service.selected', async (event: ServiceSelectedEvent) => {
            logger.info('[Automation] service.selected received', {
                serviceId: event.serviceId, serviceName: event.serviceName,
                clientId: event.clientId, bookingId: event.bookingId,
                tenantId: event.tenantId,
            });
            // Extensibility: track popular services, recommend upsells, auto-configure pricing.
        });

        // ── Client Lifecycle Changed ──
        eventBus.on('client.lifecycleChanged', async (event: ClientLifecycleChangedEvent) => {
            logger.info('[Automation] client.lifecycleChanged received', {
                clientId: event.clientId, previousStage: event.previousStage,
                newStage: event.newStage, tenantId: event.tenantId,
            });

            try {
                // Notify admins about significant lifecycle transitions
                const significantTransitions = ['VIP', 'AT_RISK', 'CHURNED', 'ONBOARDING'];
                if (significantTransitions.includes(event.newStage)) {
                    const adminEmployees = await prisma.employee.findMany({
                        where: {
                            tenantId: event.tenantId,
                            isActive: true,
                            role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                        },
                        select: { userId: true },
                    });

                    const stageLabels: Record<string, string> = {
                        VIP: '🌟 Client Promoted to VIP',
                        AT_RISK: '⚠️ Client Moved to At Risk',
                        CHURNED: '🔴 Client Churned',
                        ONBOARDING: '🆕 Client Onboarding Started',
                    };

                    for (const admin of adminEmployees) {
                        await notificationsService.create({
                            title: stageLabels[event.newStage] || `Client Lifecycle: ${event.newStage}`,
                            message: `"${event.clientName || 'Unknown'}" moved from ${event.previousStage} → ${event.newStage}.`,
                            type: event.newStage === 'VIP' ? 'SUCCESS' : 'INFO',
                            userId: admin.userId,
                            tenantId: event.tenantId,
                            actionUrl: `/client-list/${event.clientId}`,
                            actionLabel: 'View Client',
                        });
                    }
                }
            } catch (err) {
                logger.error('[Automation] client.lifecycleChanged handler failed', { err });
            }
        });

        // ── Project Status Changed ──
        eventBus.on('project.statusChanged', async (event: ProjectStatusChangedEvent) => {
            logger.info('[Automation] project.statusChanged received', {
                projectId: event.projectId, projectName: event.projectName,
                previousStatus: event.previousStatus, newStatus: event.newStatus,
                tenantId: event.tenantId,
            });

            try {
                // Notify on project completion
                if (event.newStatus === 'COMPLETED') {
                    const adminEmployees = await prisma.employee.findMany({
                        where: {
                            tenantId: event.tenantId,
                            isActive: true,
                            role: { name: { in: ['Admin', 'Owner', 'Manager'] }, isSystemRole: true },
                        },
                        select: { userId: true },
                    });

                    for (const admin of adminEmployees) {
                        await notificationsService.create({
                            title: '🎉 Project Completed',
                            message: `Project "${event.projectName}" has been marked as completed.`,
                            type: 'SUCCESS',
                            userId: admin.userId,
                            tenantId: event.tenantId,
                            actionUrl: `/projects/${event.projectId}`,
                            actionLabel: 'View Project',
                        });
                    }
                }
            } catch (err) {
                logger.error('[Automation] project.statusChanged handler failed', { err });
            }
        });

        // ── Invoice Sent ──
        eventBus.on('invoice.sent', async (event: InvoiceSentEvent) => {
            logger.info('[Automation] invoice.sent received', {
                invoiceId: event.invoiceId, invoiceNumber: event.invoiceNumber,
                clientId: event.clientId, tenantId: event.tenantId,
            });
            // Extensibility: schedule payment reminders, update analytics, track collection pipeline.
        });

        // ── Lifecycle: AT_RISK → Re-engagement notification to admin team ──
        eventBus.on('lifecycle.atRisk', async (event: LifecycleAtRiskEvent) => {
            logger.info('[Automation] lifecycle.atRisk received', {
                clientId: event.clientId, clientName: event.clientName,
                tenantId: event.tenantId, inactivityDays: event.inactivityDays,
            });

            try {
                const adminEmployees = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId,
                        isActive: true,
                        role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                    },
                    select: { userId: true },
                });

                for (const admin of adminEmployees) {
                    await notificationsService.create({
                        title: '⚠️ Client At Risk — Action Required',
                        message: `"${event.clientName}" has had no activity in ${event.inactivityDays}+ days. Consider a re-engagement call, discount offer, or check-in email.`,
                        type: 'WARNING',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/client-list/${event.clientId}`,
                        actionLabel: 'View Client',
                    });
                }

                // Also create a follow-up task for the team
                await tasksService.create(event.tenantId, {
                    title: `Re-engage "${event.clientName}" — ${event.inactivityDays}d inactive`,
                    description: `Client "${event.clientName}" was previously ${event.previousStage} but has been inactive for ${event.inactivityDays}+ days. Actions: phone call, personalized email, discount/promo offer, or schedule follow-up.`,
                    priority: 'HIGH',
                    clientId: event.clientId,
                });

                logger.info('[Automation] lifecycle.atRisk → re-engagement notifications + task created', {
                    clientId: event.clientId, adminCount: adminEmployees.length,
                });
            } catch (err) {
                logger.error('[Automation] lifecycle.atRisk → re-engagement failed', { err });
            }
        });
    }

    // ── Hook Activation ─────────────────────────────────────────────────

    /**
     * Activate all externally registered hooks by subscribing them
     * to the event bus. Each hook is wrapped in error isolation.
     */
    private activateHooks(): void {
        for (const hook of this.hooks) {
            eventBus.on(hook.event, async (payload: any) => {
                try {
                    await hook.handler(payload);
                    logger.debug(`[Automation] Hook "${hook.name}" executed`, { event: hook.event });
                } catch (err) {
                    logger.error(`[Automation] Hook "${hook.name}" failed`, { event: hook.event, err });
                }
            });
        }
    }

    // ── Observability ───────────────────────────────────────────────────

    private getBuiltInRuleNames(): string[] {
        return [
            'lead.created → notification',
            'lead.converted → notification',
            'lead.statusChanged → notification (WON/LOST)',
            'client.created → notification',
            'project.created → notification',
            'invoice.statusChanged → notification (OVERDUE/PAID)',
            'task.completed → notification',
            'booking.created → preparation task',
            'booking.confirmed → follow-up task',
            'booking.cancelled → admin notification',
            'payment.received → notification + lifecycle eval',
            'expense.created → admin notification',
            'expense.approved → submitter notification',
            'invoice.created → observability',
            'invoice.updated → observability',
            'client.updated → observability',
            'client.deleted → observability',
            'contact.created → observability',
            'contact.updated → observability',
            'contact.deleted → observability',
            'calendar.created → observability',
            'employee.created → observability',
            'application.statusChanged → observability',
            'order.statusChanged → observability',
            'file.uploaded → audit enrichment',
            'group.created → observability',
            'group.updated → observability',
            'service.created → observability',
            'service.updated → observability',
            'service.deleted → observability',
            'lifecycle.atRisk → re-engagement notification + task',
            'service.selected → observability',
            'client.lifecycleChanged → admin notification (VIP/AT_RISK/CHURNED/ONBOARDING)',
            'project.statusChanged → completion notification',
            'invoice.sent → observability',
        ];
    }
}

export const automationService = new AutomationService();
