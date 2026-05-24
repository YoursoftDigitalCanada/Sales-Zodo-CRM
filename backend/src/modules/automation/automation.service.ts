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
    CalendarEventCompletedEvent,
    QuoteCreatedEvent,
    QuoteStatusChangedEvent,
} from '../../common/events/event-bus';
import { notificationsService } from '../notifications/notifications.service';
import { tasksService } from '../tasks/tasks.service';
import { logger } from '../../common/utils/logger';
import { calendarService } from '../calendar/calendar.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { prisma } from '../../config/database';
import { quotesService } from '../quotes/quotes.service';
import { projectsService } from '../projects/projects.service';
import { invoicesService } from '../invoices/invoices.service';
import { leadsService } from '../leads/leads.service';
import { filesService } from '../files/files.service';
import { analyticsService } from '../analytics/analytics.service';
import { analyticsRepository } from '../analytics/analytics.repository';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { smsService } from '../../common/services/sms.service';
import { foldersService } from '../folders/folders.service';
import { communicationLogService } from '../communication-logs/communication-log.service';
import { LeadStatus, TaskStatus } from '@prisma/client';
import { estimationWorkflowService } from '../leads/estimation-workflow.service';
import { proposalAutomationService } from '../quotes/proposal-automation.service';
import { dealConversionService } from '../leads/deal-conversion.service';
import { leadAutomationService } from '../leads/lead-automation.service';
import { stage3WorkflowService } from '../proposals/stage3-workflow.service';
import { stage4SendWorkflowService } from '../proposals/stage4-send-workflow.service';
import { proposalReminderService } from '../proposals/proposal-reminder.service';
import { quoteSignatureReminderService } from '../quotes/quote-signature-reminder.service';
import { seedProjectStages } from '../projects/seed-project-stages';
import { salesAutomationService } from './sales-automation.service';
import { isLegacyRoofingAutomationEnabled } from './legacy-automation.guard';
import { automationIdempotencyService } from './automation-idempotency.service';

const ENABLE_LEGACY_ROOFING_WORKFLOWS = process.env.ENABLE_LEGACY_ROOFING_WORKFLOWS === 'true';

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
    private renewalMonitorStarted = false;

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

        // === Workflow automation services ===
        if (ENABLE_LEGACY_ROOFING_WORKFLOWS) {
            estimationWorkflowService.initialize();
            dealConversionService.initialize();
        }
        proposalAutomationService.initialize();
        stage3WorkflowService.initialize();
        if (ENABLE_LEGACY_ROOFING_WORKFLOWS) {
            stage4SendWorkflowService.initialize();
            proposalReminderService.initialize();
        } else {
            logger.info('[Automation] Legacy roofing proposal workflows disabled for this deployment');
        }
        quoteSignatureReminderService.initialize();
        salesAutomationService.initialize();
        // Sales CRM uses deal/subscription billing automation instead of legacy roofing project execution workflows.

        // Seed default Kanban stages
        seedProjectStages().catch((err) => logger.error('[Automation] Stage seeder failed', { err: err.message }));
        this.startCustomerRenewalMonitor();

        logger.info('[Automation] Initialized', {
            builtInRules: this.getBuiltInRuleNames(),
            externalHooks: this.hooks.map(h => `${h.event} → ${h.name}`),
            workflowServices: [
                'EstimationWorkflow',
                'ProposalAutomation',
                'DealConversion',
                'Stage3Workflow',
                ...(ENABLE_LEGACY_ROOFING_WORKFLOWS ? ['Stage4SendWorkflow', 'ProposalReminder'] : []),
                'SalesAutomation',
            ],
        });
    }

    private startCustomerRenewalMonitor(): void {
        if (this.renewalMonitorStarted) return;
        this.renewalMonitorStarted = true;

        const run = () => {
            this.processUpcomingCustomerRenewals().catch((err) => {
                logger.error('[Automation] Customer renewal monitor failed', { err });
            });
        };

        run();
        setInterval(run, 24 * 60 * 60 * 1000);
    }

    private async processUpcomingCustomerRenewals(): Promise<void> {
        const now = new Date();
        const horizon = new Date(now);
        horizon.setDate(horizon.getDate() + 30);

        const subscriptions = await prisma.customerSubscription.findMany({
            where: {
                status: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
                renewalDate: { gte: now, lte: horizon },
            },
            include: {
                client: {
                    select: {
                        id: true,
                        clientName: true,
                        assignedOwnerId: true,
                        assignedOwner: { select: { userId: true } },
                    },
                },
                project: { select: { id: true, name: true, leadId: true } },
            },
            take: 200,
        });

        for (const subscription of subscriptions) {
            const referenceDocname = `renewal:${subscription.id}`;
            const existingTask = await prisma.task.findFirst({
                where: {
                    tenantId: subscription.tenantId,
                    referenceDoctype: 'CustomerSubscription',
                    referenceDocname,
                },
            });

            if (!existingTask) {
                const dueDate = new Date(subscription.renewalDate);
                dueDate.setDate(dueDate.getDate() - 14);
                const task = await prisma.task.create({
                    data: {
                        tenantId: subscription.tenantId,
                        title: `Renewal follow-up: ${subscription.client.clientName}`,
                        description: `Customer subscription renews on ${subscription.renewalDate.toISOString().slice(0, 10)}. Review account health and confirm renewal.`,
                        status: 'TODO',
                        priority: 'HIGH',
                        dueDate,
                        assignedToId: subscription.client.assignedOwnerId || null,
                        projectId: subscription.projectId || null,
                        clientId: subscription.clientId,
                        leadId: subscription.project?.leadId || null,
                        referenceDoctype: 'CustomerSubscription',
                        referenceDocname,
                    },
                });

                activityLogger.log({
                    tenantId: subscription.tenantId,
                    entityType: 'Task',
                    entityId: task.id,
                    action: 'CREATE',
                    module: 'renewals',
                    description: `Renewal follow-up task created for ${subscription.client.clientName}`,
                    metadata: {
                        subscriptionId: subscription.id,
                        clientId: subscription.clientId,
                        projectId: subscription.projectId,
                        renewalDate: subscription.renewalDate,
                    },
                });
            }

            const userIds = new Set<string>();
            if (subscription.client.assignedOwner?.userId) {
                userIds.add(subscription.client.assignedOwner.userId);
            }
            const admins = await prisma.employee.findMany({
                where: {
                    tenantId: subscription.tenantId,
                    isActive: true,
                    role: { name: { in: ['Admin', 'Owner'] } },
                },
                select: { userId: true },
            });
            admins.forEach((admin) => admin.userId && userIds.add(admin.userId));

            for (const userId of userIds) {
                const notificationKey = `renewal:${subscription.id}:${userId}`;
                const existingNotification = await prisma.notification.findFirst({
                    where: {
                        tenantId: subscription.tenantId,
                        userId,
                        metadata: { path: ['automationKey'], equals: notificationKey },
                    },
                });
                if (existingNotification) continue;

                await notificationsService.create({
                    tenantId: subscription.tenantId,
                    userId,
                    title: 'Renewal coming up',
                    message: `${subscription.client.clientName} renews on ${subscription.renewalDate.toISOString().slice(0, 10)}.`,
                    type: 'INFO',
                    actionUrl: `/client-list/${subscription.clientId}`,
                    actionLabel: 'View account',
                    metadata: { automationKey: notificationKey, subscriptionId: subscription.id },
                });
            }

            activityLogger.log({
                tenantId: subscription.tenantId,
                entityType: 'CustomerSubscription',
                entityId: subscription.id,
                action: 'UPDATE',
                module: 'renewals',
                description: `Renewal follow-up prepared for ${subscription.client.clientName}`,
                metadata: {
                    renewalDate: subscription.renewalDate,
                    clientId: subscription.clientId,
                    projectId: subscription.projectId,
                },
            });
        }
    }

    private automationKey(tenantId: string, eventName: string, entityType: string, entityId: string, actionType: string) {
        return automationIdempotencyService.buildKey(tenantId, eventName, entityType, entityId, actionType);
    }

    private async runOnce<T>(
        tenantId: string,
        eventName: string,
        entityType: string,
        entityId: string,
        actionType: string,
        fn: () => Promise<T>,
    ) {
        return automationIdempotencyService.runOnce(
            tenantId,
            this.automationKey(tenantId, eventName, entityType, entityId, actionType),
            { eventName, entityType, entityId, actionType },
            fn,
        );
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
        // ── Lead Created — Full Automation Workflow ──
        eventBus.on('lead.created', async (event: LeadCreatedEvent) => {
            if (!(await this.shouldRunLegacyRoofingAutomation(event.tenantId, 'lead.created'))) return;
            const ctx = { leadId: event.leadId, tenantId: event.tenantId };
            const label = event.companyName
                ? `${event.leadName} (${event.companyName})`
                : event.leadName;

            // Fetch tenant name for email/SMS templates
            let tenantName = 'Our Team';
            try {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: event.tenantId },
                    select: { name: true },
                });
                if (tenant?.name) tenantName = tenant.name;
            } catch { /* fallback to default */ }

            const isStormDamage = event.serviceType === 'Storm/Hail Damage'
                || event.serviceType === 'STORM_DAMAGE'
                || (event.serviceType || '').toLowerCase().includes('storm');

            // ─────────────────────────────────────────────────────────────
            // 1️⃣  AUTOMATION — Create follow-up task
            // ─────────────────────────────────────────────────────────────
            try {
                const dueDate = new Date();
                if (isStormDamage) {
                    dueDate.setHours(dueDate.getHours() + 1);   // 1 hour for storm damage
                } else {
                    dueDate.setHours(dueDate.getHours() + 4);   // 4 hours for all others
                }

                await tasksService.create(event.tenantId, {
                    title: `Call ${event.leadName} - New Lead`,
                    description: [
                        `New lead captured${event.source ? ` from ${event.source}` : ''}.`,
                        event.email ? `Email: ${event.email}` : '',
                        event.phone ? `Phone: ${event.phone}` : '',
                        event.serviceType ? `Service: ${event.serviceType}` : '',
                        event.propertyAddress ? `Property: ${event.propertyAddress}` : '',
                        '',
                        'Action items:',
                        '• Call the lead immediately',
                        '• Confirm property address and service needed',
                        '• Schedule inspection if applicable',
                    ].filter(Boolean).join('\n'),
                    priority: isStormDamage ? 'HIGH' : 'MEDIUM',
                    dueDate,
                    assignedToId: event.ownerId || null,
                });
                logger.info('[Automation] lead.created → follow-up task created', {
                    ...ctx, priority: isStormDamage ? 'HIGH' : 'MEDIUM',
                    dueInHours: isStormDamage ? 1 : 4,
                });
            } catch (err) {
                logger.error('[Automation] lead.created → task creation failed', { ...ctx, err });
            }

            // ─────────────────────────────────────────────────────────────
            // 2️⃣  AUTOMATION — Create calendar follow-up event
            // ─────────────────────────────────────────────────────────────
            try {
                const startTime = new Date();
                // If after 4 PM, schedule for tomorrow 9 AM
                if (startTime.getHours() >= 16) {
                    startTime.setDate(startTime.getDate() + 1);
                    startTime.setHours(9, 0, 0, 0);
                } else {
                    // Schedule 2 hours from now
                    startTime.setHours(startTime.getHours() + 2);
                    startTime.setMinutes(0, 0, 0);
                }
                const endTime = new Date(startTime);
                endTime.setMinutes(endTime.getMinutes() + 30);

                await calendarService.create(event.tenantId, {
                    title: `Follow-up: ${event.leadName}`,
                    description: [
                        `Follow-up with new lead "${event.leadName}".`,
                        event.serviceType ? `Service needed: ${event.serviceType}` : '',
                        event.propertyAddress ? `Property: ${event.propertyAddress}` : '',
                        event.phone ? `Phone: ${event.phone}` : '',
                        event.email ? `Email: ${event.email}` : '',
                    ].filter(Boolean).join('\n'),
                    startTime,
                    endTime,
                    eventType: 'MEETING',
                    priority: isStormDamage ? 'HIGH' : 'MEDIUM',
                    reminderMinutes: 15,
                    category: 'lead-follow-up',
                    color: '#22D3EE',
                });
                logger.info('[Automation] lead.created → calendar follow-up created', ctx);
            } catch (err) {
                logger.error('[Automation] lead.created → calendar event creation failed', { ...ctx, err });
            }

            // ─────────────────────────────────────────────────────────────
            // 3️⃣  AUTOMATION — Notify the assigned sales rep
            // ─────────────────────────────────────────────────────────────
            if (event.ownerUserId) {
                try {
                    const assignmentMessage = `New lead assigned: ${event.leadName}`;
                    await notificationsService.create({
                        title: 'New Lead Assigned',
                        message: assignmentMessage,
                        type: 'INFO',
                        userId: event.ownerUserId,
                        tenantId: event.tenantId,
                        actionUrl: `/leads/${event.leadId}`,
                        actionLabel: 'View Lead',
                    });
                    await notificationsService.sendPushNotification(
                        event.ownerUserId,
                        'New Lead Assigned',
                        assignmentMessage,
                        { leadId: event.leadId, tenantId: event.tenantId }
                    );
                    logger.debug('[Automation] lead.created → owner notification sent', ctx);
                } catch (err) {
                    logger.error('[Automation] lead.created → owner notification failed', { ...ctx, err });
                }
            }

            // Notify all admins / owners
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
                    if (admin.userId === event.ownerUserId) continue; // already notified
                    await notificationsService.create({
                        title: '📥 New Lead Captured',
                        message: `"${label}" was added${event.source ? ` via ${event.source}` : ''}. ${event.email ? `Contact: ${event.email}` : ''}`,
                        type: 'INFO',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/leads/${event.leadId}`,
                        actionLabel: 'View Lead',
                    });
                }
                logger.debug('[Automation] lead.created → admin notifications sent', { ...ctx, adminCount: adminEmployees.length });
            } catch (err) {
                logger.error('[Automation] lead.created → admin notifications failed', { ...ctx, err });
            }

            // ─────────────────────────────────────────────────────────────
            // 4️⃣  AUTOMATION — Send auto thank-you email to the lead
            // ─────────────────────────────────────────────────────────────
            if (event.email) {
                try {
                    const firstName = event.leadName.split(' ')[0] || 'there';
                    const subject = 'Thank you for contacting us!';
                    const html = `
                            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                                <div style="background: linear-gradient(135deg, #0891B2, #22D3EE); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                                    <h1 style="color: white; margin: 0; font-size: 24px;">Thank You!</h1>
                                </div>
                                <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                                    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
                                    <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                                        Thank you for contacting <strong>${tenantName}</strong>.
                                        A member of our team will reach out shortly to discuss your project.
                                    </p>
                                    ${event.serviceType ? `<p style="color: #64748b; font-size: 14px;">Service requested: <strong>${event.serviceType}</strong></p>` : ''}
                                    ${event.leadNumber ? `<p style="color: #64748b; font-size: 14px;">Your reference number: <strong>${event.leadNumber}</strong></p>` : ''}
                                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                                    <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                                        Best regards,<br />
                                        <strong>${tenantName}</strong>
                                    </p>
                                </div>
                            </div>
                        `;
                    const text = `Hi ${firstName},\n\nThank you for contacting ${tenantName}. A member of our team will reach out shortly to discuss your project.\n\nBest regards,\n${tenantName}`;

                    const delivery = await tenantMailerService.sendTenantEmail({
                        tenantId: event.tenantId,
                        to: event.email,
                        subject,
                        html,
                        text,
                    });
                    if (!delivery.sent) {
                        throw new Error(delivery.error || 'Tenant mailbox delivery failed');
                    }

                    await communicationLogService.createSafe({
                        tenantId: event.tenantId,
                        leadId: event.leadId,
                        type: 'EMAIL',
                        direction: 'OUTBOUND',
                        subject,
                        content: html,
                        to: event.email,
                    });
                    logger.info('[Automation] lead.created → thank-you email sent', { ...ctx, to: event.email });
                } catch (err) {
                    logger.error('[Automation] lead.created → email send failed', { ...ctx, err });
                }
            }

            // ─────────────────────────────────────────────────────────────
            // 5️⃣  AUTOMATION — Send auto SMS to the lead
            // ─────────────────────────────────────────────────────────────
            if (event.phone) {
                try {
                    const firstName = event.leadName.split(' ')[0] || 'there';
                    const message = `Hi ${firstName}! Thanks for reaching out to ${tenantName}. A team member will call you soon.`;
                    await smsService.sendSms({
                        to: event.phone,
                        message,
                        tenantId: event.tenantId,
                    });

                    await communicationLogService.createSafe({
                        tenantId: event.tenantId,
                        leadId: event.leadId,
                        type: 'SMS',
                        direction: 'OUTBOUND',
                        content: message,
                        to: event.phone,
                    });
                    logger.info('[Automation] lead.created → auto-SMS sent', { ...ctx, to: event.phone });
                } catch (err) {
                    logger.error('[Automation] lead.created → SMS send failed', { ...ctx, err });
                }
            }

            // ─────────────────────────────────────────────────────────────
            // 6️⃣  AUTOMATION — Create document folder
            // ─────────────────────────────────────────────────────────────
            try {
                const leadRef = event.leadNumber || event.leadId.substring(0, 8);
                const folderName = `${leadRef}-${event.leadName.replace(/\s+/g, '-')}`;

                // Find or create the /Leads parent folder
                let leadsParentFolder = await prisma.folder.findFirst({
                    where: { tenantId: event.tenantId, name: 'Leads', parentId: null },
                });
                if (!leadsParentFolder) {
                    leadsParentFolder = await prisma.folder.create({
                        data: { name: 'Leads', tenantId: event.tenantId },
                    });
                }

                // Create the lead-specific subfolder
                await foldersService.create(event.tenantId, {
                    name: folderName,
                    parentId: leadsParentFolder.id,
                });
                logger.info('[Automation] lead.created → document folder created', {
                    ...ctx, folderPath: `/Leads/${folderName}/`,
                });
            } catch (err) {
                logger.error('[Automation] lead.created → folder creation failed', { ...ctx, err });
            }

            // ─────────────────────────────────────────────────────────────
            // 7️⃣  Analytics — enrich audit trail
            // ─────────────────────────────────────────────────────────────
            try {
                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Lead',
                    entityId: event.leadId,
                    action: 'CREATE',
                    module: 'automation',
                    description: `Lead automation triggered for "${label}"`,
                    metadata: {
                        leadName: event.leadName,
                        leadNumber: event.leadNumber,
                        source: event.source || 'Direct',
                        email: event.email,
                        phone: event.phone,
                        serviceType: event.serviceType,
                        companyName: event.companyName,
                        automationActions: ['task', 'calendar', 'notification', 'email', 'sms', 'folder', 'analytics'],
                    },
                });
                logger.debug('[Automation] lead.created → analytics logged', ctx);
            } catch (err) {
                logger.error('[Automation] lead.created → analytics logging failed', { ...ctx, err });
            }
        });

        // ── Lead Converted ──
        eventBus.on('lead.converted', async (event: LeadConvertedEvent) => {
            if (event.ownerUserId) {
                await notificationsService.create({
                    title: '🎉 Lead Converted to Organization',
                    message: `"${event.leadName}" has been converted to a ${event.clientType} organization by a team member.`,
                    type: 'SUCCESS',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/client-list/${event.clientId}`,
                    actionLabel: 'View Organization',
                });
            }
            if (event.convertedByUserId && event.convertedByUserId !== event.ownerUserId) {
                await notificationsService.create({
                    title: '✅ Conversion Complete',
                    message: `"${event.leadName}" is now an organization. You can start creating deals and invoices.`,
                    type: 'SUCCESS',
                    userId: event.convertedByUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/client-list/${event.clientId}`,
                    actionLabel: 'View Organization',
                });
            }
            logger.debug('[Automation] lead.converted → notifications sent', {
                leadId: event.leadId,
                clientId: event.clientId,
            });

            if (!(await this.shouldRunLegacyRoofingAutomation(event.tenantId, 'lead.converted'))) return;

            // ── Auto-create project from lead data ──────────────────────────
            // Always create a project when a lead converts, regardless of
            // whether a quote exists. If `client.created` already bootstrapped
            // a project from an accepted quote, this will skip (idempotent).
            try {
                // Check if a project already exists for this client+lead
                const existingProject = await prisma.project.findFirst({
                    where: {
                        tenantId: event.tenantId,
                        clientId: event.clientId,
                        leadId: event.leadId,
                    },
                    select: { id: true },
                });

                if (existingProject) {
                    logger.debug('[Automation] lead.converted → project already exists, skipping', {
                        leadId: event.leadId,
                        clientId: event.clientId,
                        projectId: existingProject.id,
                    });
                } else {
                    // Fetch lead data for project creation
                    const lead = await prisma.lead.findUnique({
                        where: { id: event.leadId },
                        select: {
                            firstName: true,
                            lastName: true,
                            serviceType: true,
                            propertyAddress: true,
                            city: true,
                            state: true,
                            zipCode: true,
                            potentialValue: true,
                            assignedToId: true,
                            isInsuranceClaim: true,
                            insuranceCompanyName: true,
                            claimNumber: true,
                            notes: true,
                        },
                    });

                    if (lead) {
                        const projectCount = await prisma.project.count({ where: { tenantId: event.tenantId } });
                        const projectNumber = `PRJ-${new Date().getFullYear()}-${String(projectCount + 1).padStart(4, '0')}`;
                        const clientName = event.leadName;

                        const project = await prisma.project.create({
                            data: {
                                tenantId: event.tenantId,
                                name: `${lead.serviceType || 'Roofing'} — ${clientName}`,
                                description: [
                                    `Project auto-created from lead conversion.`,
                                    `Client: ${clientName}`,
                                    lead.propertyAddress ? `Property: ${lead.propertyAddress}` : '',
                                    lead.serviceType ? `Service: ${lead.serviceType}` : '',
                                    lead.potentialValue ? `Estimated value: $${Number(lead.potentialValue).toLocaleString()}` : '',
                                ].filter(Boolean).join('\n'),
                                clientId: event.clientId,
                                leadId: event.leadId,
                                status: 'PLANNING',
                                priority: 'NORMAL',
                                projectNumber,
                                contractValue: lead.potentialValue ? Number(lead.potentialValue) : undefined,
                                salesRepId: lead.assignedToId,
                                jobSiteAddress: lead.propertyAddress || undefined,
                                jobSiteCity: lead.city || undefined,
                                jobSiteState: lead.state || undefined,
                                jobSiteZip: lead.zipCode || undefined,
                                isInsuranceJob: lead.isInsuranceClaim === 'Yes',
                                insuranceCompany: lead.insuranceCompanyName || undefined,
                                claimNumber: lead.claimNumber || undefined,
                            },
                        });

                        logger.info('[Automation] lead.converted → project auto-created', {
                            leadId: event.leadId,
                            clientId: event.clientId,
                            projectId: project.id,
                            projectNumber,
                        });

                        // Emit project.created to trigger downstream automation
                        // (milestone tasks, project folder, notifications, etc.)
                        eventBus.emit('project.created', {
                            tenantId: event.tenantId,
                            projectId: project.id,
                            projectName: project.name,
                            clientId: event.clientId,
                            assignedToUserId: event.ownerUserId,
                        });

                        // Notify the assigned rep
                        if (event.ownerUserId) {
                            await notificationsService.create({
                                title: '📁 Project Auto-Created',
                                message: `A new project "${project.name}" has been created for client "${clientName}".`,
                                type: 'INFO',
                                userId: event.ownerUserId,
                                tenantId: event.tenantId,
                                actionUrl: `/projects/${project.id}`,
                                actionLabel: 'View Project',
                            });
                        }

                        // Audit trail
                        activityLogger.log({
                            tenantId: event.tenantId,
                            entityType: 'Project',
                            entityId: project.id,
                            action: 'CREATE',
                            module: 'automation',
                            description: `Project "${project.name}" auto-created from lead conversion of "${clientName}"`,
                            metadata: {
                                leadId: event.leadId,
                                clientId: event.clientId,
                                projectNumber,
                                trigger: 'lead.converted',
                            },
                        });
                    }
                }
            } catch (err) {
                logger.error('[Automation] lead.converted → project auto-creation failed', {
                    leadId: event.leadId,
                    clientId: event.clientId,
                    tenantId: event.tenantId,
                    err,
                });
            }
        });

        // ── Lead Status Changed (QUALIFIED / WON / LOST) ──
        eventBus.on('lead.statusChanged', async (event: LeadStatusChangedEvent) => {
            const ctx = { leadId: event.leadId, tenantId: event.tenantId, newStatus: event.newStatus };
            const label = event.companyName
                ? `${event.leadName} (${event.companyName})`
                : event.leadName;

            // ── QUALIFIED → Calendar meeting + proposal task + notification ──
            if (event.newStatus === 'QUALIFIED') {
                // 1️⃣  Notify lead owner about qualification
                if (event.ownerUserId) {
                    const ownerUserId = event.ownerUserId;
                    try {
                        await this.runOnce(event.tenantId, 'lead.statusChanged', 'Lead', event.leadId, 'qualified-owner-notification', () => notificationsService.create({
                            title: '🎯 Lead Qualified',
                            message: `"${label}" is now qualified! A qualification meeting and proposal task have been auto-created.`,
                            type: 'SUCCESS',
                            userId: ownerUserId,
                            tenantId: event.tenantId,
                            actionUrl: `/leads/${event.leadId}`,
                            actionLabel: 'View Lead',
                        }));
                        logger.debug('[Automation] lead.statusChanged (QUALIFIED) → owner notification sent', ctx);
                    } catch (err) {
                        logger.error('[Automation] lead.statusChanged (QUALIFIED) → owner notification failed', { ...ctx, err });
                    }
                }

                // 2️⃣  Auto-create Qualification Meeting calendar event (next biz day, 45 min @ 2 PM)
                try {
                    const meetingDate = this.getNextBusinessDay();
                    meetingDate.setHours(14, 0, 0, 0); // 2:00 PM
                    const endTime = new Date(meetingDate);
                    endTime.setMinutes(endTime.getMinutes() + 45);

                    await this.runOnce(event.tenantId, 'lead.statusChanged', 'Lead', event.leadId, 'qualification-meeting', () => calendarService.create(event.tenantId, {
                        title: `Qualification Meeting — ${label}`,
                        description: [
                            `Qualified lead "${event.leadName}" is ready for a deeper conversation.`,
                            event.companyName ? `Company: ${event.companyName}` : '',
                            event.email ? `Contact: ${event.email}` : '',
                            '',
                            'Agenda:',
                            '• Review needs & pain points',
                            '• Present relevant solutions',
                            '• Discuss budget & timeline',
                            '• Agree on next steps / proposal',
                        ].filter(Boolean).join('\n'),
                        startTime: meetingDate,
                        endTime,
                        eventType: 'MEETING',
                        priority: 'HIGH',
                        category: 'lead-qualification',
                        color: '#A855F7', // purple for qualification stage
                    }));
                    logger.info('[Automation] lead.statusChanged (QUALIFIED) → qualification meeting created', ctx);
                } catch (err) {
                    logger.error('[Automation] lead.statusChanged (QUALIFIED) → calendar event failed', { ...ctx, err });
                }

                // 3️⃣  Auto-create "Prepare Proposal" task (due in 3 days)
                try {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 3);

                    await this.runOnce(event.tenantId, 'lead.statusChanged', 'Lead', event.leadId, 'prepare-proposal-task', () => tasksService.create(event.tenantId, {
                        title: `Prepare proposal for: ${label}`,
                        description: [
                            `Lead "${event.leadName}" moved to QUALIFIED.`,
                            event.email ? `Email: ${event.email}` : '',
                            event.companyName ? `Company: ${event.companyName}` : '',
                            '',
                            'Deliverables:',
                            '• Draft proposal / scope of work',
                            '• Prepare pricing options',
                            '• Gather case studies / references',
                            '• Send proposal within 3 days',
                        ].filter(Boolean).join('\n'),
                        priority: 'HIGH',
                        dueDate,
                        assignedToId: event.ownerId || null,
                    }));
                    logger.info('[Automation] lead.statusChanged (QUALIFIED) → proposal task created', ctx);
                } catch (err) {
                    logger.error('[Automation] lead.statusChanged (QUALIFIED) → task creation failed', { ...ctx, err });
                }

                // 4️⃣  Analytics audit
                try {
                    activityLogger.log({
                        tenantId: event.tenantId,
                        entityType: 'Lead',
                        entityId: event.leadId,
                        action: 'STATUS_CHANGE',
                        module: 'automation',
                        description: `Qualified automation triggered for "${label}"`,
                        metadata: {
                            leadName: event.leadName,
                            oldStatus: event.oldStatus,
                            newStatus: event.newStatus,
                            automationActions: ['notification', 'calendar-meeting', 'proposal-task', 'analytics'],
                        },
                    });
                } catch (err) {
                    logger.error('[Automation] lead.statusChanged (QUALIFIED) → analytics failed', { ...ctx, err });
                }
            }

            // ── Terminal / Inactive state notification ──
            const inactiveStatusConfig: Record<string, { emoji: string; label: string; type: 'SUCCESS' | 'WARNING' | 'INFO' }> = {
                WON: { emoji: '🏆', label: 'Won', type: 'SUCCESS' },
                LOST: { emoji: '❌', label: 'Lost', type: 'WARNING' },
                DUPLICATE: { emoji: '📋', label: 'Duplicate', type: 'INFO' },
                UNQUALIFIED: { emoji: '🚫', label: 'Unqualified', type: 'INFO' },
                NO_RESPONSE: { emoji: '📵', label: 'No Response', type: 'WARNING' },
                OUT_OF_SERVICE_AREA: { emoji: '📍', label: 'Out of Service Area', type: 'INFO' },
                FUTURE_FOLLOW_UP: { emoji: '📅', label: 'Future Follow-Up', type: 'INFO' },
                DORMANT_PROPOSAL: { emoji: '💤', label: 'Dormant Proposal', type: 'WARNING' },
            };

            const statusConf = inactiveStatusConfig[event.newStatus];
            if (event.ownerUserId && statusConf) {
                const ownerUserId = event.ownerUserId;
                try {
                    await this.runOnce(event.tenantId, 'lead.statusChanged', 'Lead', event.leadId, `inactive-${event.newStatus}-notification`, () => notificationsService.create({
                        title: `${statusConf.emoji} Lead ${statusConf.label}`,
                        message: `Lead "${event.leadName}" has been marked as ${statusConf.label}.`,
                        type: statusConf.type,
                        userId: ownerUserId,
                        tenantId: event.tenantId,
                        actionUrl: `/leads/${event.leadId}`,
                        actionLabel: 'View Lead',
                    }));
                    logger.debug('[Automation] lead.statusChanged (inactive) → notification sent', ctx);
                } catch (err) {
                    logger.error('[Automation] lead.statusChanged (inactive) → notification failed', { ...ctx, err });
                }
            }
        });

        // ── Client Created ──
        eventBus.on('client.created', async (event: ClientCreatedEvent) => {
            if (event.ownerUserId) {
                await notificationsService.create({
                    title: '🏢 New Organization Created',
                    message: `A new ${event.clientType} organization "${event.clientName}" has been created.`,
                    type: 'INFO',
                    userId: event.ownerUserId,
                    tenantId: event.tenantId,
                    actionUrl: `/client-list/${event.clientId}`,
                    actionLabel: 'View Organization',
                });
                logger.debug('[Automation] client.created → notification sent', { clientId: event.clientId });
            }

            if (!(await this.shouldRunLegacyRoofingAutomation(event.tenantId, 'client.created accepted-quote project bootstrap'))) return;

            // Auto-bootstrap project + milestones from latest accepted quote context
            // when a client was auto-created from a lead conversion.
            try {
                const quoteContext = await this.findLatestAcceptedQuoteForClient(event.tenantId, event.clientId);
                if (!quoteContext) {
                    logger.debug('[Automation] client.created → no accepted quote context found; project bootstrap skipped', {
                        tenantId: event.tenantId,
                        clientId: event.clientId,
                    });
                    return;
                }

                let ownerEmployeeId: string | undefined;
                if (event.ownerUserId) {
                    const ownerEmployee = await prisma.employee.findFirst({
                        where: { tenantId: event.tenantId, userId: event.ownerUserId },
                        select: { id: true },
                    });
                    ownerEmployeeId = ownerEmployee?.id;
                }

                const ensured = await this.ensureProjectFromQuoteData({
                    tenantId: event.tenantId,
                    quoteId: quoteContext.quoteId,
                    quoteNumber: quoteContext.quoteNumber,
                    clientId: event.clientId,
                    clientName: event.clientName,
                    total: quoteContext.total,
                    items: quoteContext.items,
                    ownerEmployeeId,
                    trigger: 'client.created',
                });

                if (ensured.projectId) {
                    logger.info('[Automation] client.created → project + milestones ensured from quote context', {
                        tenantId: event.tenantId,
                        clientId: event.clientId,
                        quoteId: quoteContext.quoteId,
                        quoteNumber: quoteContext.quoteNumber,
                        projectId: ensured.projectId,
                        projectCreated: ensured.created,
                        milestoneTasksCreated: ensured.milestoneTasksCreated,
                    });
                }
            } catch (err) {
                logger.error('[Automation] client.created → quote-based project bootstrap failed', {
                    tenantId: event.tenantId,
                    clientId: event.clientId,
                    err,
                });
            }
        });

        // ══════════════════════════════════════════════════════════════════
        // Rule 5 — Project Created → Execution Layer Automation
        // ══════════════════════════════════════════════════════════════════
        //
        // When a new project is created (manually or auto from quote):
        //   1. Projects   — Create default phase tasks (kanban-ready)
        //   2. Team       — Notify assigned employee + fetch team context
        //   3. Files      — Create project folder record for doc organization
        //   4. Comms      — Notify admin team about new project
        //   5. Audit      — Activity trail
        //
        // Each step is error-isolated.
        // ══════════════════════════════════════════════════════════════════
        eventBus.on('project.created', async (event: ProjectCreatedEvent) => {
            if (!(await this.shouldRunLegacyRoofingAutomation(event.tenantId, 'project.created'))) return;
            const ctx = { projectId: event.projectId, projectName: event.projectName, tenantId: event.tenantId };
            logger.info('[Automation] project.created received', ctx);

            // ── Step 1: Projects — Create default phase tasks ──
            const phaseDefinitions = [
                {
                    title: `📋 Site inspection & estimate — ${event.projectName}`,
                    description: `Initial site assessment:\n• Inspect roof condition & take measurements\n• Identify damage, leaks, or structural issues\n• Take photos & document findings\n• Prepare detailed estimate & scope of work`,
                    priority: 'HIGH' as const,
                    offsetDays: 0,
                },
                {
                    title: `📄 Material ordering & scheduling — ${event.projectName}`,
                    description: `Prepare for project execution:\n• Order shingles, underlayment & supplies\n• Confirm material delivery date\n• Schedule crew & equipment\n• Obtain necessary permits`,
                    priority: 'HIGH' as const,
                    offsetDays: 3,
                },
                {
                    title: `🏗️ Roof installation — ${event.projectName}`,
                    description: `Core roofing work:\n• Tear-off old roofing (if applicable)\n• Install underlayment & flashing\n• Lay new shingles / roofing material\n• Install vents, ridge caps & trim`,
                    priority: 'HIGH' as const,
                    offsetDays: 7,
                },
                {
                    title: `🧹 Cleanup & final inspection — ${event.projectName}`,
                    description: `Post-installation wrap-up:\n• Remove all debris & materials from site\n• Magnetic nail sweep of property\n• Inspect workmanship & ensure code compliance\n• Take completion photos`,
                    priority: 'MEDIUM' as const,
                    offsetDays: 14,
                },
                {
                    title: `✅ Client walkthrough & handover — ${event.projectName}`,
                    description: `Project completion:\n• Walk client through completed work\n• Review warranty information & maintenance tips\n• Collect final sign-off & satisfaction feedback\n• Submit permit close-out (if applicable)`,
                    priority: 'HIGH' as const,
                    offsetDays: 21,
                },
            ];

            for (const phase of phaseDefinitions) {
                try {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + phase.offsetDays);
                    while (dueDate.getDay() === 0 || dueDate.getDay() === 6) {
                        dueDate.setDate(dueDate.getDate() + 1);
                    }

                    await tasksService.create(event.tenantId, {
                        title: phase.title,
                        description: phase.description,
                        priority: phase.priority,
                        projectId: event.projectId,
                        clientId: event.clientId || undefined,
                        dueDate: dueDate.toISOString(),
                    });
                } catch (err) {
                    logger.error('[Automation] Step 1 ✗ Phase task creation failed', { ...ctx, task: phase.title, err });
                }
            }
            logger.info('[Automation] Step 1 ✓ Default phase tasks created', { ...ctx, count: phaseDefinitions.length });

            // ── Step 2: Team — Notify assigned employee ──
            try {
                if (event.assignedToUserId) {
                    await notificationsService.create({
                        title: '📁 New Project Assigned',
                        message: `You have been assigned to project "${event.projectName}".\n\n${phaseDefinitions.length} phase tasks have been auto-created with milestones. Review the project board to get started.`,
                        type: 'INFO',
                        userId: event.assignedToUserId,
                        tenantId: event.tenantId,
                        actionUrl: `/projects/${event.projectId}`,
                        actionLabel: 'View Project Board',
                    });
                    logger.info('[Automation] Step 2 ✓ Assigned employee notified', ctx);
                }
            } catch (err) {
                logger.error('[Automation] Step 2 ✗ Team notification failed', { ...ctx, err });
            }

            // ── Step 3: Files — Create project folder record ──
            try {
                await filesService.create(event.tenantId, {
                    name: `📂 ${event.projectName}`,
                    originalName: `${event.projectName} — Project Documents`,
                    mimeType: 'application/x-directory',
                    size: 0,
                    path: `/projects/${event.projectId}/documents`,
                    projectId: event.projectId,
                });
                logger.info('[Automation] Step 3 ✓ Project folder created', ctx);
            } catch (err) {
                logger.error('[Automation] Step 3 ✗ Project folder creation failed', { ...ctx, err });
            }

            // ── Step 4: Notifications — Admin team ──
            try {
                const admins = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId,
                        isActive: true,
                        role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                    },
                    select: { userId: true, id: true },
                });

                let clientName = '';
                if (event.clientId) {
                    const client = await prisma.client.findUnique({ where: { id: event.clientId }, select: { clientName: true } });
                    clientName = client?.clientName || '';
                }

                for (const admin of admins) {
                    if (admin.userId === event.assignedToUserId) continue;
                    await notificationsService.create({
                        title: '🆕 New Project Created',
                        message: `Project "${event.projectName}"${clientName ? ` for ${clientName}` : ''} has been created. ${phaseDefinitions.length} phase tasks have been auto-generated.`,
                        type: 'INFO',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/projects/${event.projectId}`,
                        actionLabel: 'View Project',
                    });
                }
                logger.info('[Automation] Step 4 ✓ Admin notifications sent', { ...ctx, count: admins.length });
            } catch (err) {
                logger.error('[Automation] Step 4 ✗ Admin notifications failed', { ...ctx, err });
            }

            // ── Step 5: Audit — Activity trail ──
            try {
                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Automation',
                    entityId: event.projectId,
                    action: 'CREATE',
                    module: 'automation',
                    description: `Project "${event.projectName}" created → auto-generated ${phaseDefinitions.length} phase tasks, project folder, and team notifications`,
                    metadata: {
                        trigger: 'project.created',
                        projectId: event.projectId,
                        clientId: event.clientId,
                        phaseTasks: phaseDefinitions.map(p => p.title),
                    },
                });
            } catch (_) { /* non-critical */ }
        });

        // ══════════════════════════════════════════════════════════════════
        // Rule 7a — Invoice Status Changed → Smart Payment Automation
        // ══════════════════════════════════════════════════════════════════
        //
        // OVERDUE: notification + follow-up task + calendar reminder
        // PAID:    fetch context + project budget tracking + revenue log +
        //          thank-you task + notifications + audit
        // ══════════════════════════════════════════════════════════════════
        eventBus.on('invoice.statusChanged', async (event: InvoiceStatusChangedEvent) => {
            const ctx = { invoiceId: event.invoiceId, invoiceNumber: event.invoiceNumber, tenantId: event.tenantId, newStatus: event.newStatus };
            logger.info('[Automation] invoice.statusChanged received', ctx);

            // ── OVERDUE path → notification + follow-up task + calendar ──
            if (event.newStatus === 'OVERDUE') {
                try {
                    // Notify invoice owner
                    if (event.ownerUserId) {
                        await notificationsService.create({
                            title: '⚠️ Invoice Overdue',
                            message: `Invoice #${event.invoiceNumber} is now overdue. Follow up with the client immediately.`,
                            type: 'WARNING',
                            userId: event.ownerUserId,
                            tenantId: event.tenantId,
                            actionUrl: `/invoices/${event.invoiceId}`,
                            actionLabel: 'View Invoice',
                        });
                    }

                    // Create follow-up task
                    await tasksService.create(event.tenantId, {
                        title: `⚠️ Follow up: Overdue invoice #${event.invoiceNumber}`,
                        description: `Invoice #${event.invoiceNumber} is overdue.\n\nActions needed:\n• Contact client about payment status\n• Check if invoice was received\n• Discuss payment plan if needed\n• Escalate to management if unresolved`,
                        priority: 'URGENT',
                        clientId: event.clientId || undefined,
                        dueDate: new Date().toISOString(),
                    });

                    // Schedule reminder
                    const reminderDate = this.getNextBusinessDay();
                    const endDate = new Date(reminderDate);
                    endDate.setMinutes(endDate.getMinutes() + 15);
                    await calendarService.create(event.tenantId, {
                        title: `📞 Collection call: Invoice #${event.invoiceNumber}`,
                        description: `Overdue invoice follow-up. Contact client to discuss payment.`,
                        eventType: 'REMINDER',
                        startTime: reminderDate.toISOString(),
                        endTime: endDate.toISOString(),
                        priority: 'HIGH',
                        category: 'PAYMENT',
                    }, event.ownerUserId ? undefined : undefined);

                    logger.info('[Automation] invoice.statusChanged (OVERDUE) → task + reminder created', ctx);
                } catch (err) {
                    logger.error('[Automation] invoice.statusChanged (OVERDUE) handler failed', { ...ctx, err });
                }
                return;
            }

            // ── PAID path → enterprise billing engine ──
            if (event.newStatus !== 'PAID') return;

            logger.info('[Automation] ▸ PAYMENT ENGINE: Invoice Paid — starting cascade', ctx);

            // Step 1: Fetch full invoice context
            let invoiceTotal = 0;
            let clientName = '';
            let clientId = event.clientId || '';
            let projectId: string | undefined;

            try {
                const invoice = await prisma.invoice.findUnique({
                    where: { id: event.invoiceId },
                    select: {
                        total: true, amountPaid: true, currency: true,
                        client: { select: { clientName: true, id: true } },
                        notes: true,
                    },
                });
                if (invoice) {
                    invoiceTotal = Number(invoice.total);
                    clientName = invoice.client?.clientName || '';
                    clientId = invoice.client?.id || clientId;
                    // Try to extract projectId from notes (set by billing engine)
                    const projectMatch = invoice.notes?.match(/project[\s"]*([a-f0-9-]{36})/i);
                    if (projectMatch) projectId = projectMatch[1];
                }
                logger.info('[Automation] Step 1 ✓ Invoice context fetched', { ...ctx, invoiceTotal, clientName });
            } catch (err) {
                logger.error('[Automation] Step 1 ✗ Invoice context fetch failed', { ...ctx, err });
            }

            // Step 2: Project budget tracking (if project linked)
            if (projectId) {
                try {
                    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { budget: true, name: true } });
                    if (project) {
                        activityLogger.log({
                            tenantId: event.tenantId,
                            entityType: 'Project', entityId: projectId,
                            action: 'UPDATE', module: 'projects',
                            description: `Payment received: $${invoiceTotal.toLocaleString()} for invoice #${event.invoiceNumber}. Project budget: $${Number(project.budget || 0).toLocaleString()}`,
                            metadata: { invoiceId: event.invoiceId, amountPaid: invoiceTotal },
                        });
                    }
                    logger.info('[Automation] Step 2 ✓ Project budget tracking logged', { ...ctx, projectId });
                } catch (err) {
                    logger.error('[Automation] Step 2 ✗ Project tracking failed', { ...ctx, err });
                }
            }

            // Step 3: Revenue analytics activity log
            try {
                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Revenue', entityId: event.invoiceId,
                    action: 'CREATE', module: 'analytics',
                    description: `💰 Revenue recorded: $${invoiceTotal.toLocaleString()} from ${clientName || 'client'} (Invoice #${event.invoiceNumber})`,
                    metadata: {
                        invoiceId: event.invoiceId, invoiceNumber: event.invoiceNumber,
                        clientId, amount: invoiceTotal, type: 'payment_received',
                    },
                });
                logger.info('[Automation] Step 3 ✓ Revenue analytics logged', ctx);
            } catch (_) { /* non-critical */ }

            // Step 4: CRM Timeline — Client payment history
            try {
                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Client', entityId: clientId,
                    action: 'UPDATE', module: 'clients',
                    description: `Payment received: $${invoiceTotal.toLocaleString()} (Invoice #${event.invoiceNumber})`,
                    metadata: { invoiceId: event.invoiceId, amount: invoiceTotal, type: 'payment' },
                });
            } catch (_) { /* non-critical */ }

            // Step 5: Create thank-you follow-up task
            try {
                const followUpDate = new Date();
                followUpDate.setDate(followUpDate.getDate() + 1);
                while (followUpDate.getDay() === 0 || followUpDate.getDay() === 6) {
                    followUpDate.setDate(followUpDate.getDate() + 1);
                }

                await tasksService.create(event.tenantId, {
                    title: `🙏 Send thank-you — ${clientName || `Invoice #${event.invoiceNumber}`}`,
                    description: `Payment of $${invoiceTotal.toLocaleString()} received for invoice #${event.invoiceNumber}.\n\nFollow-up actions:\n• Send payment confirmation/receipt\n• Thank client for prompt payment\n• Ask about upcoming project needs\n• Update client relationship notes`,
                    priority: 'LOW',
                    clientId: clientId || undefined,
                    dueDate: followUpDate.toISOString(),
                });
                logger.info('[Automation] Step 5 ✓ Thank-you task created', ctx);
            } catch (err) {
                logger.error('[Automation] Step 5 ✗ Thank-you task failed', { ...ctx, err });
            }

            // Step 6: Notifications — owner + admin team
            try {
                if (event.ownerUserId) {
                    await notificationsService.create({
                        title: '💰 Payment Received!',
                        message: `Invoice #${event.invoiceNumber} for ${clientName || 'client'} ($${invoiceTotal.toLocaleString()}) has been paid!\n\nAuto-actions completed:\n• Revenue logged in analytics\n• Client timeline updated\n• Thank-you follow-up task created`,
                        type: 'SUCCESS',
                        userId: event.ownerUserId,
                        tenantId: event.tenantId,
                        actionUrl: `/invoices/${event.invoiceId}`,
                        actionLabel: 'View Invoice',
                    });
                }

                // Admin team notification
                const admins = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId, isActive: true,
                        role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                    },
                    select: { userId: true },
                });

                for (const admin of admins) {
                    if (admin.userId === event.ownerUserId) continue;
                    await notificationsService.create({
                        title: '💵 New Payment Received',
                        message: `$${invoiceTotal.toLocaleString()} received from ${clientName || 'client'} (Invoice #${event.invoiceNumber}).`,
                        type: 'INFO',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/invoices/${event.invoiceId}`,
                        actionLabel: 'View Invoice',
                    });
                }
                logger.info('[Automation] Step 6 ✓ Notifications sent', ctx);
            } catch (err) {
                logger.error('[Automation] Step 6 ✗ Notifications failed', { ...ctx, err });
            }

            // ── Step 8: BI — Revenue Dashboard Snapshot ──
            let revenueSnapshot: any = null;
            try {
                const [revenueStats, revenueTrend] = await Promise.all([
                    analyticsRepository.getRevenueStats(event.tenantId),
                    analyticsRepository.getMonthlyRevenueTrend(event.tenantId),
                ]);
                revenueSnapshot = { ...revenueStats, trend: revenueTrend };

                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Analytics', entityId: event.invoiceId,
                    action: 'UPDATE', module: 'analytics',
                    description: `📊 REVENUE UPDATE: Total $${Number(revenueStats.total || 0).toLocaleString()} | This month $${Number(revenueStats.thisMonth || 0).toLocaleString()} | Growth ${revenueStats.growth || 0}% | Outstanding $${Number(revenueStats.outstanding || 0).toLocaleString()}`,
                    metadata: { trigger: 'invoice.paid', revenueStats, trendMonths: revenueTrend.length },
                });
                logger.info('[Automation] Step 8 ✓ Revenue dashboard snapshot computed', { ...ctx, total: revenueStats.total, growth: revenueStats.growth });
            } catch (err) {
                logger.error('[Automation] Step 8 ✗ Revenue snapshot failed', { ...ctx, err });
            }

            // ── Step 9: BI — Conversion Rate + Client Lifetime Value ──
            let biInsights: any = null;
            try {
                const [leadStats, clvData, pipelineHealth] = await Promise.all([
                    analyticsRepository.getLeadStats(event.tenantId, {}),
                    analyticsRepository.getTopClientsByRevenue(event.tenantId),
                    analyticsRepository.getPipelineHealth(event.tenantId),
                ]);

                const wonLeads = leadStats.byStatus?.find((s: any) => s.status === 'WON')?._count || 0;
                const conversionRate = leadStats.total > 0 ? Math.round((wonLeads / leadStats.total) * 100) : 0;

                biInsights = {
                    conversionRate,
                    totalLeads: leadStats.total,
                    wonLeads,
                    averageCLV: clvData.averageCLV,
                    totalRevenue: clvData.totalRevenue,
                    totalClients: clvData.totalClients,
                    pipelineStages: pipelineHealth.stages?.length || 0,
                };

                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Analytics', entityId: 'bi-update',
                    action: 'UPDATE', module: 'analytics',
                    description: `📈 BI UPDATE: Conversion ${conversionRate}% (${wonLeads}/${leadStats.total} leads) | Avg CLV $${clvData.averageCLV.toLocaleString()} | ${clvData.totalClients} clients | Pipeline: ${pipelineHealth.stages?.length || 0} stages`,
                    metadata: { trigger: 'invoice.paid', conversionRate, averageCLV: clvData.averageCLV, totalRevenue: clvData.totalRevenue, pipelineTotal: pipelineHealth.total },
                });
                logger.info('[Automation] Step 9 ✓ Conversion rate + CLV computed', { ...ctx, conversionRate, averageCLV: clvData.averageCLV });
            } catch (err) {
                logger.error('[Automation] Step 9 ✗ BI insights computation failed', { ...ctx, err });
            }

            // ── Step 10: AI Follow-up Prediction (Future Scope Placeholder) ──
            try {
                // Heuristic: next follow-up = 30 days after payment for repeat business
                const nextFollowUp = new Date();
                nextFollowUp.setDate(nextFollowUp.getDate() + 30);

                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'AI', entityId: clientId || event.invoiceId,
                    action: 'CREATE', module: 'analytics',
                    description: `🤖 AI PREDICTION: Next follow-up with ${clientName || 'client'} recommended by ${nextFollowUp.toISOString().split('T')[0]} based on payment pattern analysis`,
                    metadata: {
                        trigger: 'invoice.paid', clientId, nextFollowUp: nextFollowUp.toISOString(),
                        predictionType: 'next_followup', confidence: 0.75,
                        note: 'Heuristic-based — full ML model integration planned for future release',
                    },
                });
                logger.info('[Automation] Step 10 ✓ AI follow-up prediction logged', ctx);
            } catch (_) { /* non-critical */ }

            // Step 7 (updated): Audit trail with BI data
            try {
                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Automation', entityId: event.invoiceId,
                    action: 'CREATE', module: 'automation',
                    description: `PAYMENT ENGINE + BI UPDATE: Invoice #${event.invoiceNumber} paid ($${invoiceTotal.toLocaleString()}) → revenue log, CRM timeline, thank-you task, notifications, revenue snapshot, conversion rate, CLV, AI prediction`,
                    metadata: {
                        trigger: 'invoice.statusChanged', invoiceId: event.invoiceId,
                        invoiceNumber: event.invoiceNumber, clientId, amount: invoiceTotal, projectId,
                        revenueGrowth: revenueSnapshot?.growth, conversionRate: biInsights?.conversionRate,
                        averageCLV: biInsights?.averageCLV,
                    },
                });
            } catch (_) { /* non-critical */ }

            logger.info('[Automation] ▸ PAYMENT ENGINE + BI UPDATE COMPLETE — all modules processed', { ...ctx, clientId, invoiceTotal });
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

        // ══════════════════════════════════════════════════════════════════
        // Rule 7b — Payment Received (Webhook-Driven) → Enterprise SaaS
        // ══════════════════════════════════════════════════════════════════
        //
        // When a payment webhook fires (Stripe/PayPal/manual):
        //   1. Payments    — Record payment confirmation
        //   2. Calendar    — Schedule payment confirmation follow-up
        //   3. CRM         — Client lifecycle reinforcement
        //   4. Analytics   — Payment method tracking
        //   5. Comms       — Notify recorder + admin team
        //   6. Audit       — Activity trail
        //
        // Each step is error-isolated.
        // ══════════════════════════════════════════════════════════════════
        eventBus.on('payment.received', async (event: PaymentReceivedEvent) => {
            const paymentAmount = event.amount ? `$${event.amount}` : 'amount pending';
            const ctx = { invoiceId: event.invoiceId, invoiceNumber: event.invoiceNumber, tenantId: event.tenantId, amount: paymentAmount };
            logger.info('[Automation] payment.received received (webhook-driven)', ctx);

            let clientName = '';

            // Step 1: Fetch client context + reinforce lifecycle
            if (event.clientId) {
                try {
                    const client = await prisma.client.findUnique({ where: { id: event.clientId }, select: { clientName: true } });
                    clientName = client?.clientName || '';
                    await clientLifecycleService.reinforceEngagement(event.clientId, event.tenantId);
                    logger.info('[Automation] Step 1 ✓ Client lifecycle reinforced', { ...ctx, clientName });
                } catch (err) {
                    logger.error('[Automation] Step 1 ✗ Lifecycle reinforcement failed', { ...ctx, err });
                }
            }

            // Step 2: CRM Timeline — payment entry
            try {
                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Payment', entityId: event.invoiceId,
                    action: 'CREATE', module: 'payments',
                    description: `Payment webhook: ${paymentAmount} received for invoice #${event.invoiceNumber} from ${clientName || 'client'}`,
                    metadata: {
                        invoiceId: event.invoiceId, invoiceNumber: event.invoiceNumber,
                        clientId: event.clientId, amount: event.amount, source: 'webhook',
                    },
                });
            } catch (_) { /* non-critical */ }

            // Step 3: Calendar — payment confirmation event
            try {
                const confirmDate = new Date();
                confirmDate.setDate(confirmDate.getDate() + 1);
                while (confirmDate.getDay() === 0 || confirmDate.getDay() === 6) {
                    confirmDate.setDate(confirmDate.getDate() + 1);
                }
                const endDate = new Date(confirmDate);
                endDate.setMinutes(endDate.getMinutes() + 15);

                await this.runOnce(event.tenantId, 'payment.received', 'Invoice', event.invoiceId, 'payment-confirmation-calendar', () => calendarService.create(event.tenantId, {
                    title: `✅ Payment confirmed: ${clientName || `Invoice #${event.invoiceNumber}`}`,
                    description: `Payment of ${paymentAmount} received for invoice #${event.invoiceNumber}.\n\nAction items:\n1. Send payment receipt to client\n2. Update accounting records\n3. Close out invoice`,
                    eventType: 'REMINDER',
                    startTime: confirmDate.toISOString(),
                    endTime: endDate.toISOString(),
                    priority: 'LOW',
                    category: 'PAYMENT',
                    notes: `Client: ${clientName} | Invoice: ${event.invoiceNumber}`,
                }, event.paidByUserId));
                logger.info('[Automation] Step 3 ✓ Payment confirmation event created', ctx);
            } catch (err) {
                logger.error('[Automation] Step 3 ✗ Calendar event failed', { ...ctx, err });
            }

            // Step 4: Notifications — recorder + admin team
            try {
                if (event.paidByUserId) {
                    const paidByUserId = event.paidByUserId;
                    await this.runOnce(event.tenantId, 'payment.received', 'Invoice', event.invoiceId, 'payment-recorder-notification', () => notificationsService.create({
                        title: '💰 Payment Recorded Successfully',
                        message: `Payment of ${paymentAmount} received for invoice #${event.invoiceNumber}${clientName ? ` from ${clientName}` : ''}.\n\nAuto-actions:\n• Client lifecycle updated\n• CRM timeline entry created\n• Payment confirmation scheduled`,
                        type: 'SUCCESS',
                        userId: paidByUserId,
                        tenantId: event.tenantId,
                        actionUrl: `/invoices/${event.invoiceId}`,
                        actionLabel: 'View Invoice',
                    }));
                }

                const admins = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId, isActive: true,
                        role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                    },
                    select: { userId: true },
                });

                for (const admin of admins) {
                    if (admin.userId === event.paidByUserId) continue;
                    await this.runOnce(event.tenantId, 'payment.received', 'Invoice', event.invoiceId, `payment-admin-notification:${admin.userId}`, () => notificationsService.create({
                        title: '💵 Webhook Payment Received',
                        message: `${paymentAmount} received from ${clientName || 'client'} for invoice #${event.invoiceNumber}.`,
                        type: 'INFO',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/invoices/${event.invoiceId}`,
                        actionLabel: 'View Details',
                    }));
                }
                logger.info('[Automation] Step 4 ✓ Notifications sent', ctx);
            } catch (err) {
                logger.error('[Automation] Step 4 ✗ Notifications failed', { ...ctx, err });
            }

            // Step 5: Audit trail
            try {
                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Automation', entityId: event.invoiceId,
                    action: 'CREATE', module: 'automation',
                    description: `WEBHOOK PAYMENT: ${paymentAmount} received for invoice #${event.invoiceNumber} → lifecycle reinforced, CRM timeline, confirmation event, notifications`,
                    metadata: {
                        trigger: 'payment.received', invoiceId: event.invoiceId,
                        invoiceNumber: event.invoiceNumber, clientId: event.clientId,
                        amount: event.amount, source: 'webhook',
                    },
                });
            } catch (_) { /* non-critical */ }

            logger.info('[Automation] ▸ WEBHOOK PAYMENT COMPLETE — all modules processed', { ...ctx, clientName });
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
                    await this.runOnce(event.tenantId, 'expense.created', 'Expense', event.expenseId, `admin-notification:${admin.userId}`, () => notificationsService.create({
                        title: '💸 New Expense Submitted',
                        message: `An expense of $${event.amount || 'N/A'}${event.category ? ` (${event.category})` : ''} needs review.`,
                        type: 'INFO',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/expenses`,
                        actionLabel: 'Review Expense',
                    }));
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
                    await this.runOnce(event.tenantId, 'expense.approved', 'Expense', event.expenseId, `submitter-notification:${event.approvedById}`, () => notificationsService.create({
                        title: '✅ Expense Approved',
                        message: `Your expense of $${event.amount || 'N/A'} has been approved.`,
                        type: 'SUCCESS',
                        userId: event.approvedById,
                        tenantId: event.tenantId,
                        actionUrl: `/expenses`,
                        actionLabel: 'View Expenses',
                    }));
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
                        ONBOARDING: '🆕 Organization Onboarding Started',
                    };

                    for (const admin of adminEmployees) {
                        await notificationsService.create({
                            title: stageLabels[event.newStage] || `Organization Lifecycle: ${event.newStage}`,
                            message: `"${event.clientName || 'Unknown'}" moved from ${event.previousStage} → ${event.newStage}.`,
                            type: event.newStage === 'VIP' ? 'SUCCESS' : 'INFO',
                            userId: admin.userId,
                            tenantId: event.tenantId,
                            actionUrl: `/client-list/${event.clientId}`,
                            actionLabel: 'View Organization',
                        });
                    }
                }
            } catch (err) {
                logger.error('[Automation] client.lifecycleChanged handler failed', { err });
            }
        });

        // ══════════════════════════════════════════════════════════════════
        // Rule 6 — Milestone/Project Completed → Billing Engine Automation
        // ══════════════════════════════════════════════════════════════════
        //
        // When project status = COMPLETED:
        //   1. Projects   — Fetch full context (budget, client, tasks)
        //   2. Finance    — Generate completion invoice from project budget
        //   3. Calendar   — Schedule payment follow-up reminder
        //   4. Tasks      — Post-project review task
        //   5. Comms      — Notify creator + admin + client portal
        //   6. Audit      — Activity trail
        //
        // Also handles ON_HOLD with re-engagement notification.
        // Each step is error-isolated.
        // ══════════════════════════════════════════════════════════════════
        eventBus.on('project.statusChanged', async (event: ProjectStatusChangedEvent) => {
            if (!(await this.shouldRunLegacyRoofingAutomation(event.tenantId, 'project.statusChanged'))) return;
            const ctx = {
                projectId: event.projectId, projectName: event.projectName,
                previousStatus: event.previousStatus, newStatus: event.newStatus,
                tenantId: event.tenantId,
            };
            logger.info('[Automation] project.statusChanged received', ctx);

            // ── ON_HOLD → re-engagement notification ──
            if (event.newStatus === 'ON_HOLD') {
                try {
                    const adminEmployees = await prisma.employee.findMany({
                        where: {
                            tenantId: event.tenantId, isActive: true,
                            role: { name: { in: ['Admin', 'Owner', 'Manager'] }, isSystemRole: true },
                        },
                        select: { userId: true },
                    });
                    for (const admin of adminEmployees) {
                        await notificationsService.create({
                            title: '⏸️ Project On Hold',
                            message: `Project "${event.projectName}" has been put on hold. Review reason and schedule a follow-up.`,
                            type: 'WARNING',
                            userId: admin.userId,
                            tenantId: event.tenantId,
                            actionUrl: `/projects/${event.projectId}`,
                            actionLabel: 'Review Project',
                        });
                    }
                } catch (err) {
                    logger.error('[Automation] project.statusChanged ON_HOLD handler failed', { ...ctx, err });
                }
                return;
            }

            // Only fire the full billing engine for COMPLETED status
            if (event.newStatus !== 'COMPLETED') return;

            logger.info('[Automation] ▸ BILLING ENGINE: Project Completed — starting automation cascade', ctx);

            // ── Step 1: Fetch full project context ──
            let projectBudget = 0;
            let clientId = event.clientId || '';
            let clientName = '';
            let projectCreatorId: string | undefined;
            let completedTaskCount = 0;

            try {
                const project = await prisma.project.findUnique({
                    where: { id: event.projectId },
                    select: {
                        budget: true, clientId: true, client: { select: { clientName: true } },
                        members: { select: { employeeId: true, role: true } },
                        tasks: { select: { id: true, status: true } },
                    },
                });
                if (project) {
                    projectBudget = project.budget ? Number(project.budget) : 0;
                    clientId = project.clientId || clientId;
                    clientName = project.client?.clientName || '';
                    completedTaskCount = project.tasks?.filter(t => (t.status as string) === 'COMPLETED').length || 0;
                    // Find project lead/owner from members
                    const lead = project.members?.find(m => m.role === 'LEAD' || m.role === 'OWNER');
                    projectCreatorId = lead?.employeeId;
                }
                logger.info('[Automation] Step 1 ✓ Project context fetched', { ...ctx, projectBudget, clientName, completedTaskCount });
            } catch (err) {
                logger.error('[Automation] Step 1 ✗ Project context fetch failed', { ...ctx, err });
            }

            // ── Step 2: Finance — Generate completion invoice ──
            let invoiceId: string | undefined;
            let invoiceNumber: string | undefined;
            if (projectBudget > 0 && clientId) {
                try {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 30); // Net 30

                    const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
                    const invoice = await invoicesService.create(event.tenantId, {
                        invoiceNumber: invNum,
                        clientId: clientId,
                        dueDate: dueDate.toISOString(),
                        currency: 'CAD',
                        notes: `Milestone completion invoice for project "${event.projectName}". ${completedTaskCount} tasks completed.`,
                        items: [{
                            description: `Project completion: ${event.projectName}`,
                            quantity: 1,
                            unitPrice: projectBudget,
                            amount: projectBudget,
                            sortOrder: 0,
                        }],
                    });
                    invoiceId = invoice.id;
                    invoiceNumber = (invoice as any).invoiceNumber || invNum;
                    logger.info('[Automation] Step 2 ✓ Completion invoice created', { ...ctx, invoiceId, invoiceNumber, amount: projectBudget });
                } catch (err) {
                    logger.error('[Automation] Step 2 ✗ Invoice creation failed', { ...ctx, err });
                }
            } else {
                logger.info('[Automation] Step 2 ⊘ Skipped — no budget or client', ctx);
            }

            // ── Step 3: Calendar — Payment follow-up reminder ──
            if (invoiceId && clientId) {
                try {
                    const reminderDate = new Date();
                    reminderDate.setDate(reminderDate.getDate() + 14); // 2 weeks out
                    while (reminderDate.getDay() === 0 || reminderDate.getDay() === 6) {
                        reminderDate.setDate(reminderDate.getDate() + 1);
                    }
                    const endDate = new Date(reminderDate);
                    endDate.setMinutes(endDate.getMinutes() + 30);

                    await calendarService.create(event.tenantId, {
                        title: `💳 Payment follow-up: ${event.projectName}`,
                        description: `Follow up on invoice ${invoiceNumber || ''} for completed project "${event.projectName}".\nAmount: $${projectBudget.toLocaleString()} (Net 30).\n\nChecklist:\n1. Confirm invoice received\n2. Address any questions\n3. Confirm payment timeline`,
                        eventType: 'REMINDER',
                        startTime: reminderDate.toISOString(),
                        endTime: endDate.toISOString(),
                        priority: 'HIGH',
                        category: 'PAYMENT',
                        notes: `Invoice: ${invoiceNumber}, Client: ${clientName}`,
                    }, projectCreatorId);
                    logger.info('[Automation] Step 3 ✓ Payment reminder scheduled', { ...ctx, date: reminderDate.toISOString() });
                } catch (err) {
                    logger.error('[Automation] Step 3 ✗ Calendar reminder failed', { ...ctx, err });
                }
            }

            // ── Step 4: Tasks — Post-project review task ──
            try {
                const reviewDate = new Date();
                reviewDate.setDate(reviewDate.getDate() + 5);
                while (reviewDate.getDay() === 0 || reviewDate.getDay() === 6) {
                    reviewDate.setDate(reviewDate.getDate() + 1);
                }

                await tasksService.create(event.tenantId, {
                    title: `📊 Post-project review — ${event.projectName}`,
                    description: `Project "${event.projectName}" has been completed (${completedTaskCount} tasks done).\n\nReview checklist:\n• Client satisfaction survey\n• Internal retrospective\n• Document lessons learned\n• Archive project files\n• Update portfolio/case study\n• Collect testimonial`,
                    priority: 'MEDIUM',
                    projectId: event.projectId,
                    clientId: clientId || undefined,
                    assignedToId: projectCreatorId || undefined,
                    dueDate: reviewDate.toISOString(),
                });
                logger.info('[Automation] Step 4 ✓ Post-project review task created', ctx);
            } catch (err) {
                logger.error('[Automation] Step 4 ✗ Review task creation failed', { ...ctx, err });
            }

            // ── Step 5: Notifications — Creator + Admin + Client awareness ──
            try {
                // Notify admin/management team
                const adminEmployees = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId, isActive: true,
                        role: { name: { in: ['Admin', 'Owner', 'Manager'] }, isSystemRole: true },
                    },
                    select: { userId: true, id: true },
                });

                for (const admin of adminEmployees) {
                    await notificationsService.create({
                        title: '🎉 Project Completed — Invoice Generated',
                        message: `Project "${event.projectName}"${clientName ? ` for ${clientName}` : ''} is complete!\n\n• ${completedTaskCount} tasks finished\n${projectBudget > 0 ? `• Invoice ${invoiceNumber || ''} created ($${projectBudget.toLocaleString()})\n• Payment reminder scheduled (14 days)` : '• No billing (project has no budget)'}\n• Post-project review task created`,
                        type: 'SUCCESS',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: invoiceId ? `/invoices/${invoiceId}` : `/projects/${event.projectId}`,
                        actionLabel: invoiceId ? 'View Invoice' : 'View Project',
                    });
                }

                // Notify project lead if different from admins
                if (projectCreatorId) {
                    const creator = await prisma.employee.findUnique({
                        where: { id: projectCreatorId },
                        select: { userId: true },
                    });
                    if (creator?.userId && !adminEmployees.some(a => a.userId === creator.userId)) {
                        await notificationsService.create({
                            title: '✅ Your Project is Complete',
                            message: `Project "${event.projectName}" has been marked as completed.\n${projectBudget > 0 ? `Invoice ${invoiceNumber} has been auto-generated for $${projectBudget.toLocaleString()}.` : ''}`,
                            type: 'SUCCESS',
                            userId: creator.userId,
                            tenantId: event.tenantId,
                            actionUrl: `/projects/${event.projectId}`,
                            actionLabel: 'View Project',
                        });
                    }
                }

                logger.info('[Automation] Step 5 ✓ Notifications sent', { ...ctx, adminCount: adminEmployees.length });
            } catch (err) {
                logger.error('[Automation] Step 5 ✗ Notifications failed', { ...ctx, err });
            }

            // ── Step 6: Audit — Activity trail ──
            try {
                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Automation',
                    entityId: event.projectId,
                    action: 'CREATE',
                    module: 'automation',
                    description: `BILLING ENGINE: Project "${event.projectName}" completed → invoice${invoiceNumber ? ` ${invoiceNumber}` : ''} ($${projectBudget.toLocaleString()}), payment reminder, and post-project review task`,
                    metadata: {
                        trigger: 'project.statusChanged',
                        projectId: event.projectId,
                        clientId,
                        invoiceId,
                        invoiceNumber,
                        budget: projectBudget,
                        completedTasks: completedTaskCount,
                    },
                });
            } catch (_) { /* non-critical */ }

            logger.info('[Automation] ▸ BILLING ENGINE COMPLETE — project completion cascade finished', {
                ...ctx, clientId, invoiceId, invoiceNumber,
            });
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
                        title: '⚠️ Organization At Risk — Action Required',
                        message: `"${event.clientName}" has had no activity in ${event.inactivityDays}+ days. Consider a re-engagement call, discount offer, or check-in email.`,
                        type: 'WARNING',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: `/client-list/${event.clientId}`,
                        actionLabel: 'View Organization',
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

        // ── Calendar Completed → Auto-create Quote Draft + Notification + Task ──
        eventBus.on('calendar.completed', async (event: CalendarEventCompletedEvent) => {
            if (!(await this.shouldRunLegacyRoofingAutomation(event.tenantId, 'calendar.completed quote draft'))) return;
            const ctx = { eventId: event.eventId, tenantId: event.tenantId, title: event.title };
            logger.info('[Automation] calendar.completed received', ctx);

            // 1️⃣  Auto-create a draft quote
            try {
                const validUntil = new Date();
                validUntil.setDate(validUntil.getDate() + 30); // 30-day validity

                const quote = await quotesService.create(event.tenantId, {
                    clientId: event.clientId || null,
                    leadId: event.leadId || null,
                    validUntil: validUntil.toISOString(),
                    currency: 'CAD',
                    notes: `Auto-generated after completing meeting: "${event.title}"`,
                    sourceEventId: event.eventId,
                    items: [
                        {
                            description: `Services discussed in meeting: "${event.title}"`,
                            quantity: 1,
                            unitPrice: 0,
                            total: 0,
                        },
                    ],
                }, event.createdById);

                logger.info('[Automation] calendar.completed → draft quote created', {
                    ...ctx, quoteId: quote.id, quoteNumber: quote.quoteNumber,
                });

                // 2️⃣  Notify the meeting creator
                if (event.createdByUserId) {
                    try {
                        await notificationsService.create({
                            title: '📋 Quote Draft Created',
                            message: `A draft quote "${quote.quoteNumber}" was auto-created after your meeting "${event.title}" was completed. Please review and update pricing.`,
                            type: 'INFO',
                            userId: event.createdByUserId,
                            tenantId: event.tenantId,
                            actionUrl: `/quotes/${quote.id}`,
                            actionLabel: 'Review Quote',
                        });
                    } catch (err) {
                        logger.error('[Automation] calendar.completed → notification failed', { ...ctx, err });
                    }
                }

                // 3️⃣  Create a task to review the proposal
                try {
                    await tasksService.create(event.tenantId, {
                        title: `Review & finalize quote ${quote.quoteNumber}`,
                        description: `A draft quote was auto-created after meeting "${event.title}" was completed. Please review the line items, update pricing, and send to the client.`,
                        priority: 'HIGH',
                        assignedToId: event.createdById,
                        clientId: event.clientId,
                    });
                } catch (err) {
                    logger.error('[Automation] calendar.completed → review task failed', { ...ctx, err });
                }

                // 4️⃣  Analytics audit
                try {
                    activityLogger.log({
                        tenantId: event.tenantId,
                        entityType: 'Automation',
                        entityId: event.eventId,
                        action: 'CREATE',
                        module: 'automation',
                        description: `Meeting "${event.title}" completed → auto-created draft quote ${quote.quoteNumber}`,
                        metadata: { trigger: 'calendar.completed', quoteId: quote.id, quoteNumber: quote.quoteNumber },
                    });
                } catch (_) { /* non-critical */ }
            } catch (err) {
                logger.error('[Automation] calendar.completed → quote creation failed', { ...ctx, err });
            }
        });

        // ── Quote Created (direct draft) → move proposal task to REVIEW ──
        eventBus.on('quote.created', async (event: QuoteCreatedEvent) => {
            if (!(await this.shouldRunLegacyRoofingAutomation(event.tenantId, 'quote.created'))) return;
            const ctx = {
                quoteId: event.quoteId,
                quoteNumber: event.quoteNumber,
                tenantId: event.tenantId,
                leadId: event.leadId,
                clientId: event.clientId,
            };
            logger.info('[Automation] quote.created received', ctx);

            // Relevant only when quote is tied to a lead/client proposal flow
            if (!event.leadId && !event.clientId) return;

            try {
                const proposalTask = event.leadId
                    ? await this.findProposalTaskForLead(event.tenantId, event.leadId, ['TODO', 'IN_PROGRESS'])
                    : await this.findProposalTaskForClient(event.tenantId, event.clientId as string, ['TODO', 'IN_PROGRESS']);

                if (!proposalTask) {
                    logger.debug('[Automation] quote.created → no matching proposal task found', ctx);
                    return;
                }

                await tasksService.updateStatus(proposalTask.id, event.tenantId, 'REVIEW');
                logger.info('[Automation] quote.created → proposal task moved to REVIEW', {
                    ...ctx,
                    taskId: proposalTask.id,
                    previousStatus: proposalTask.status,
                });

                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Task',
                    entityId: proposalTask.id,
                    action: 'STATUS_CHANGE',
                    module: 'automation',
                    description: `Quote "${event.quoteNumber}" created → proposal task moved to REVIEW`,
                    metadata: {
                        trigger: 'quote.created',
                        quoteId: event.quoteId,
                        quoteNumber: event.quoteNumber,
                        previousTaskStatus: proposalTask.status,
                        newTaskStatus: 'REVIEW',
                    },
                });
            } catch (err) {
                logger.error('[Automation] quote.created → proposal task sync failed', { ...ctx, err });
            }
        });

        // ════════════════════════════════════════════════════════════════════
        // MASTER TRIGGER: Quote Approved → Full System Automation
        // ════════════════════════════════════════════════════════════════════
        //
        // When a quote status changes to ACCEPTED this single handler
        // cascades through EVERY major CRM module:
        //   1. CRM        — Convert lead → client (if applicable)
        //   2. Projects    — Create project from the quote
        //   3. Finance     — Generate invoice from quote line items
        //   4. Calendar    — Schedule kickoff meeting
        //   5. Tasks       — Create onboarding checklist (3 tasks)
        //   6. Comms       — Notify quote creator + admin team
        //   7. Audit       — Activity log for the automation
        //
        // Each step is error-isolated: a failure in one does NOT cascade.
        // ════════════════════════════════════════════════════════════════════
        eventBus.on('quote.statusChanged', async (event: QuoteStatusChangedEvent) => {
            if (!(await this.shouldRunLegacyRoofingAutomation(event.tenantId, 'quote.statusChanged'))) return;
            const ctx = {
                quoteId: event.quoteId, quoteNumber: event.quoteNumber,
                tenantId: event.tenantId, newStatus: event.newStatus,
            };
            logger.info('[Automation] quote.statusChanged received', ctx);

            // ── Quote SENT → complete proposal task + move lead to PROPOSAL ──
            if (event.newStatus === 'SENT') {
                try {
                    const proposalTask = event.leadId
                        ? await this.findProposalTaskForLead(event.tenantId, event.leadId, ['TODO', 'IN_PROGRESS', 'REVIEW'])
                        : (event.clientId
                            ? await this.findProposalTaskForClient(event.tenantId, event.clientId, ['TODO', 'IN_PROGRESS', 'REVIEW'])
                            : null);

                    if (proposalTask) {
                        await tasksService.updateStatus(proposalTask.id, event.tenantId, 'DONE');
                        logger.info('[Automation] quote.statusChanged (SENT) → proposal task moved to DONE', {
                            ...ctx,
                            taskId: proposalTask.id,
                            previousStatus: proposalTask.status,
                        });

                        activityLogger.log({
                            tenantId: event.tenantId,
                            entityType: 'Task',
                            entityId: proposalTask.id,
                            action: 'STATUS_CHANGE',
                            module: 'automation',
                            description: `Quote "${event.quoteNumber}" sent → proposal task completed`,
                            metadata: {
                                trigger: 'quote.statusChanged',
                                quoteId: event.quoteId,
                                quoteNumber: event.quoteNumber,
                                previousTaskStatus: proposalTask.status,
                                newTaskStatus: 'DONE',
                            },
                        });
                    } else {
                        logger.debug('[Automation] quote.statusChanged (SENT) → no matching proposal task found', ctx);
                    }
                } catch (err) {
                    logger.error('[Automation] quote.statusChanged (SENT) → proposal task completion failed', { ...ctx, err });
                }

                if (event.leadId) {
                    try {
                        const leadProgress = await this.moveLeadToProposalStage(event.tenantId, event.leadId);
                        if (leadProgress === 'updated') {
                            logger.info('[Automation] quote.statusChanged (SENT) → lead moved to PROPOSAL', {
                                ...ctx,
                                leadId: event.leadId,
                            });
                        } else {
                            logger.debug('[Automation] quote.statusChanged (SENT) → lead stage unchanged', {
                                ...ctx,
                                leadId: event.leadId,
                                reason: leadProgress,
                            });
                        }
                    } catch (err) {
                        logger.error('[Automation] quote.statusChanged (SENT) → lead stage update failed', {
                            ...ctx,
                            leadId: event.leadId,
                            err,
                        });
                    }
                }
            }

            // Only fire the master automation for ACCEPTED quotes
            if (event.newStatus !== 'ACCEPTED') return;

            logger.info('[Automation] ▸ MASTER TRIGGER: Quote Approved — starting 7-module cascade', ctx);

            let clientId = event.clientId;
            let clientName = '';
            let projectId: string | undefined;
            let invoiceNumber: string | undefined;

            // ── Step 1: CRM — ACCEPTED quote sync (lead WON + client ensured) ──
            if (event.leadId) {
                try {
                    const sync = await this.ensureLeadWonAndClientForAcceptedQuote(
                        event.tenantId,
                        event.leadId,
                        clientId,
                        event.createdById,
                    );
                    clientId = sync.clientId;
                    clientName = sync.clientName;
                    logger.info('[Automation] Step 1 ✓ Lead/client sync complete', {
                        ...ctx,
                        leadId: event.leadId,
                        clientId,
                        clientName,
                        source: sync.source,
                    });
                } catch (err) {
                    logger.error('[Automation] Step 1 ✗ Lead/client sync failed', { ...ctx, leadId: event.leadId, err });
                }
            } else if (clientId) {
                // Existing client — fetch the name
                try {
                    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { clientName: true } });
                    clientName = client?.clientName || '';
                } catch (_) { /* non-critical */ }
            }

            // ── Step 2: Projects — Create project from quote ──
            try {
                const ensured = await this.ensureProjectFromQuoteData({
                    tenantId: event.tenantId,
                    quoteId: event.quoteId,
                    quoteNumber: event.quoteNumber,
                    clientId,
                    clientName,
                    total: event.total,
                    items: event.items,
                    ownerEmployeeId: event.createdById,
                    trigger: 'quote.statusChanged(ACCEPTED)',
                });
                projectId = ensured.projectId;
                logger.info('[Automation] Step 2 ✓ Project + milestones ensured', {
                    ...ctx,
                    projectId,
                    projectCreated: ensured.created,
                    milestoneTasksCreated: ensured.milestoneTasksCreated,
                });
            } catch (err) {
                logger.error('[Automation] Step 2 ✗ Project creation failed', { ...ctx, err });
            }

            // ── Step 3: Finance — Generate invoice from quote items ──
            try {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 30); // Net 30

                const invoiceNum = `INV-${Date.now().toString(36).toUpperCase()}`;
                const invoice = await invoicesService.create(event.tenantId, {
                    invoiceNumber: invoiceNum,
                    clientId: clientId || '',
                    dueDate: dueDate.toISOString(),
                    currency: 'CAD',
                    notes: `Generated from approved quote ${event.quoteNumber}`,
                    items: event.items.map((item, idx) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        amount: item.total,
                        sortOrder: idx,
                    })),
                });
                invoiceNumber = (invoice as any).invoiceNumber || invoiceNum;
                logger.info('[Automation] Step 3 ✓ Invoice created', { ...ctx, invoiceId: invoice.id, invoiceNumber });
            } catch (err) {
                logger.error('[Automation] Step 3 ✗ Invoice creation failed', { ...ctx, err });
            }

            // ── Step 4: Calendar — Schedule kickoff meeting ──
            try {
                const kickoffDate = this.getNextBusinessDay();
                kickoffDate.setDate(kickoffDate.getDate() + 2); // 3 business days out
                // Skip weekends again
                while (kickoffDate.getDay() === 0 || kickoffDate.getDay() === 6) {
                    kickoffDate.setDate(kickoffDate.getDate() + 1);
                }
                const endDate = new Date(kickoffDate);
                endDate.setHours(endDate.getHours() + 1); // 1-hour meeting

                await calendarService.create(event.tenantId, {
                    title: `Kickoff: ${event.quoteNumber} — ${clientName || 'New Organization'}`,
                    description: `Project kickoff meeting for approved quote ${event.quoteNumber}.\nQuote total: $${event.total.toLocaleString()}.\n\nAgenda:\n1. Project scope review\n2. Timeline & milestones\n3. Team introductions\n4. Next steps`,
                    eventType: 'MEETING',
                    startTime: kickoffDate.toISOString(),
                    endTime: endDate.toISOString(),
                    priority: 'HIGH',
                    category: 'CLIENT_MEETING',
                    notes: clientId ? `Linked to client: ${clientName} (${clientId})` : undefined,
                }, event.createdById);
                logger.info('[Automation] Step 4 ✓ Kickoff meeting scheduled', { ...ctx, date: kickoffDate.toISOString() });
            } catch (err) {
                logger.error('[Automation] Step 4 ✗ Kickoff meeting scheduling failed', { ...ctx, err });
            }

            // ── Step 5: Tasks — Create 3 onboarding tasks ──
            const taskDefinitions = [
                {
                    title: `📋 Client onboarding checklist — ${clientName || event.quoteNumber}`,
                    description: `Quote ${event.quoteNumber} has been approved ($${event.total.toLocaleString()}).\n\nOnboarding steps:\n• Send welcome packet\n• Set up client portal access\n• Gather project requirements\n• Schedule kickoff meeting\n• Assign project team`,
                    priority: 'HIGH' as const,
                },
                {
                    title: `📝 Review & sign contract — ${event.quoteNumber}`,
                    description: `Prepare and send engagement letter / SOW for approved quote ${event.quoteNumber}.\n\nContract should cover:\n• Scope of work\n• Payment terms (Net 30)\n• Deliverables & timeline\n• Cancellation policy`,
                    priority: 'HIGH' as const,
                },
                {
                    title: `📞 Welcome call — ${clientName || event.quoteNumber}`,
                    description: `Schedule and complete welcome call with client to discuss:\n• Project expectations\n• Points of contact\n• Communication preferences\n• Immediate next steps`,
                    priority: 'MEDIUM' as const,
                },
            ];

            for (const taskDef of taskDefinitions) {
                try {
                    await tasksService.create(event.tenantId, {
                        title: taskDef.title,
                        description: taskDef.description,
                        priority: taskDef.priority,
                        assignedToId: event.createdById,
                        clientId: clientId || undefined,
                        projectId: projectId || undefined,
                        dueDate: this.getNextBusinessDay().toISOString(),
                    });
                } catch (err) {
                    logger.error('[Automation] Step 5 ✗ Task creation failed', { ...ctx, task: taskDef.title, err });
                }
            }
            logger.info('[Automation] Step 5 ✓ Onboarding tasks created', { ...ctx, count: taskDefinitions.length });

            // ── Step 6: Notifications — Creator + Admin team ──
            try {
                // Notify the quote creator
                if (event.createdById) {
                    const employee = await prisma.employee.findUnique({
                        where: { id: event.createdById },
                        select: { userId: true },
                    });
                    if (employee?.userId) {
                        await notificationsService.create({
                            title: '🎉 Quote Approved — Full Automation Triggered',
                            message: `Quote "${event.quoteNumber}" ($${event.total.toLocaleString()}) has been approved!\n\nAutomatic actions completed:\n• ${clientId && event.leadId ? 'Lead converted to client' : 'Client linked'}\n• Project created${projectId ? '' : ' (pending)'}\n• Invoice generated (${invoiceNumber || 'pending'})\n• Kickoff meeting scheduled\n• Onboarding tasks created`,
                            type: 'SUCCESS',
                            userId: employee.userId,
                            tenantId: event.tenantId,
                            actionUrl: projectId ? `/projects/${projectId}` : `/quotes/${event.quoteId}`,
                            actionLabel: projectId ? 'View Project' : 'View Quote',
                        });
                    }
                }

                // Notify admin team
                const admins = await prisma.employee.findMany({
                    where: {
                        tenantId: event.tenantId,
                        isActive: true,
                        role: { name: { in: ['Admin', 'Owner'] }, isSystemRole: true },
                    },
                    select: { userId: true, id: true },
                });

                for (const admin of admins) {
                    if (admin.id === event.createdById) continue; // Don't double-notify
                    await notificationsService.create({
                        title: '💰 New Deal Closed — Quote Approved',
                        message: `Quote "${event.quoteNumber}" for ${clientName || 'a client'} ($${event.total.toLocaleString()}) has been approved. Project, invoice, and onboarding tasks have been auto-created.`,
                        type: 'INFO',
                        userId: admin.userId,
                        tenantId: event.tenantId,
                        actionUrl: projectId ? `/projects/${projectId}` : `/quotes/${event.quoteId}`,
                        actionLabel: 'View Details',
                    });
                }
                logger.info('[Automation] Step 6 ✓ Notifications sent', { ...ctx, adminCount: admins.length });
            } catch (err) {
                logger.error('[Automation] Step 6 ✗ Notifications failed', { ...ctx, err });
            }

            // ── Step 7: Audit — Activity trail ──
            try {
                activityLogger.log({
                    tenantId: event.tenantId,
                    entityType: 'Automation',
                    entityId: event.quoteId,
                    action: 'CREATE',
                    module: 'automation',
                    description: `MASTER TRIGGER: Quote "${event.quoteNumber}" approved → auto-created project${projectId ? ` (${projectId})` : ''}, invoice${invoiceNumber ? ` (${invoiceNumber})` : ''}, kickoff meeting, and ${taskDefinitions.length} onboarding tasks`,
                    metadata: {
                        trigger: 'quote.statusChanged',
                        quoteId: event.quoteId,
                        quoteNumber: event.quoteNumber,
                        clientId,
                        projectId,
                        invoiceNumber,
                        total: event.total,
                    },
                });
            } catch (_) { /* non-critical */ }

            logger.info('[Automation] ▸ MASTER TRIGGER COMPLETE — 7-module cascade finished', {
                ...ctx, clientId, projectId, invoiceNumber,
            });
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

    // ── Utilities ────────────────────────────────────────────────────────

    /**
     * Find the best matching "Prepare proposal for:" task for a lead.
     * Since Task currently has no leadId column, we score recent open proposal tasks
     * by lead name/company/email presence in title/description.
     */
    private async findProposalTaskForLead(
        tenantId: string,
        leadId: string,
        allowedStatuses: TaskStatus[],
    ): Promise<{ id: string; title: string; status: TaskStatus } | null> {
        const lead = await prisma.lead.findFirst({
            where: { id: leadId, tenantId },
            select: { firstName: true, lastName: true, companyName: true, email: true },
        });
        if (!lead) return null;

        const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim().toLowerCase();
        const companyName = (lead.companyName || '').trim().toLowerCase();
        const email = (lead.email || '').trim().toLowerCase();

        const candidates = await prisma.task.findMany({
            where: {
                tenantId,
                title: { startsWith: 'Prepare proposal for:' },
                status: { in: allowedStatuses },
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                createdAt: true,
            },
        });

        let best: { id: string; title: string; status: TaskStatus; score: number; createdAt: Date } | null = null;

        for (const task of candidates) {
            const haystack = `${task.title}\n${task.description || ''}`.toLowerCase();

            let score = 0;
            if (leadName && haystack.includes(leadName)) score += 8;
            if (companyName && haystack.includes(companyName)) score += 5;
            if (email && haystack.includes(email)) score += 10;
            if (leadName && haystack.includes(`lead "${leadName}" moved to qualified`)) score += 12;

            if (score === 0) continue;

            if (!best || score > best.score || (score === best.score && task.createdAt > best.createdAt)) {
                best = {
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    score,
                    createdAt: task.createdAt,
                };
            }
        }

        if (!best) return null;
        return { id: best.id, title: best.title, status: best.status };
    }

    /**
     * Fallback lookup for client-linked proposal tasks.
     */
    private async findProposalTaskForClient(
        tenantId: string,
        clientId: string,
        allowedStatuses: TaskStatus[],
    ): Promise<{ id: string; title: string; status: TaskStatus } | null> {
        const task = await prisma.task.findFirst({
            where: {
                tenantId,
                clientId,
                title: { startsWith: 'Prepare proposal for:' },
                status: { in: allowedStatuses },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, status: true },
        });
        return task;
    }

    /**
     * Move lead to PROPOSAL stage after quote is sent, but avoid regressing
     * leads that already reached terminal or later pipeline stages.
     */
    private async moveLeadToProposalStage(
        tenantId: string,
        leadId: string,
    ): Promise<'updated' | 'already-proposal-or-later' | 'missing'> {
        const lead = await prisma.lead.findFirst({
            where: { id: leadId, tenantId },
            select: { status: true },
        });
        if (!lead) return 'missing';

        const currentStatus = lead.status as LeadStatus;
        const blocklist: LeadStatus[] = [
            'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST',
            'DUPLICATE', 'UNQUALIFIED', 'NO_RESPONSE',
            'OUT_OF_SERVICE_AREA', 'FUTURE_FOLLOW_UP', 'DORMANT_PROPOSAL',
        ];
        if (blocklist.includes(currentStatus)) return 'already-proposal-or-later';

        await leadsService.updateStatus(leadId, tenantId, 'PROPOSAL');
        return 'updated';
    }

    /**
     * For ACCEPTED quotes tied to leads:
     * 1) ensure a client exists/links to the lead
     * 2) ensure lead status is WON
     */
    private async ensureLeadWonAndClientForAcceptedQuote(
        tenantId: string,
        leadId: string,
        currentClientId?: string,
        actorEmployeeId?: string,
    ): Promise<{ clientId?: string; clientName: string; source: 'event-client' | 'lead-converted' | 'lead-converted-existing' }> {
        const lead = await prisma.lead.findFirst({
            where: { id: leadId, tenantId },
            select: { status: true, convertedToClientId: true },
        });
        if (!lead) {
            throw new Error(`Lead ${leadId} not found for accepted quote automation`);
        }

        let clientId = currentClientId || lead.convertedToClientId || undefined;
        let source: 'event-client' | 'lead-converted' | 'lead-converted-existing' =
            currentClientId ? 'event-client' : (lead.convertedToClientId ? 'lead-converted-existing' : 'lead-converted');

        if (!clientId) {
            try {
                const conversion = await leadsService.convertToClient(
                    leadId,
                    tenantId,
                    { clientType: 'COMPANY', createContact: true },
                    actorEmployeeId,
                );
                clientId = conversion.clientId;
                source = 'lead-converted';
            } catch (err) {
                // Race-safe fallback: conversion may have happened elsewhere between reads
                const refreshedLead = await prisma.lead.findFirst({
                    where: { id: leadId, tenantId },
                    select: { convertedToClientId: true },
                });
                if (refreshedLead?.convertedToClientId) {
                    clientId = refreshedLead.convertedToClientId;
                    source = 'lead-converted-existing';
                } else {
                    throw err;
                }
            }
        }

        // Guarantee pipeline outcome for accepted quote
        if ((lead.status as LeadStatus) !== 'WON') {
            await leadsService.updateStatus(leadId, tenantId, 'WON');
        }

        let clientName = '';
        if (clientId) {
            const client = await prisma.client.findUnique({
                where: { id: clientId },
                select: { clientName: true },
            });
            clientName = client?.clientName || '';
        }

        return { clientId, clientName, source };
    }

    /**
     * Find the most relevant accepted quote for a newly created client.
     * This supports the lead-conversion path where quote may still be linked by leadId.
     */
    private async findLatestAcceptedQuoteForClient(
        tenantId: string,
        clientId: string,
    ): Promise<{
        quoteId: string;
        quoteNumber: string;
        total: number;
        items: { description: string; quantity: number; unitPrice: number; total: number }[];
    } | null> {
        const byClient = await prisma.quote.findFirst({
            where: { tenantId, status: 'ACCEPTED', clientId },
            orderBy: [{ acceptedAt: 'desc' }, { updatedAt: 'desc' }],
            include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
        if (byClient) {
            return {
                quoteId: byClient.id,
                quoteNumber: byClient.quoteNumber,
                total: Number(byClient.total),
                items: (byClient.items || []).map((i) => ({
                    description: i.description,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    total: Number(i.total),
                })),
            };
        }

        const convertedLead = await prisma.lead.findFirst({
            where: { tenantId, convertedToClientId: clientId },
            select: { id: true },
        });
        if (!convertedLead) return null;

        const byLead = await prisma.quote.findFirst({
            where: { tenantId, status: 'ACCEPTED', leadId: convertedLead.id },
            orderBy: [{ acceptedAt: 'desc' }, { updatedAt: 'desc' }],
            include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
        if (!byLead) return null;

        return {
            quoteId: byLead.id,
            quoteNumber: byLead.quoteNumber,
            total: Number(byLead.total),
            items: (byLead.items || []).map((i) => ({
                description: i.description,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice),
                total: Number(i.total),
            })),
        };
    }

    private buildQuoteProjectCode(quoteNumber: string): string {
        const clean = (quoteNumber || '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 30);
        return `Q-${clean || 'QUOTE'}`;
    }

    private async resolveQuoteItemsForAutomation(
        tenantId: string,
        quoteId: string,
        incomingItems: { description: string; quantity: number; unitPrice: number; total: number }[],
    ): Promise<{ description: string; quantity: number; unitPrice: number; total: number }[]> {
        if (incomingItems && incomingItems.length > 0) return incomingItems;

        const quote = await prisma.quote.findFirst({
            where: { id: quoteId, tenantId },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
        if (!quote) return [];

        return (quote.items || []).map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            total: Number(item.total),
        }));
    }

    private async ensureProjectFromQuoteData(params: {
        tenantId: string;
        quoteId: string;
        quoteNumber: string;
        clientId?: string;
        clientName?: string;
        total: number;
        items: { description: string; quantity: number; unitPrice: number; total: number }[];
        ownerEmployeeId?: string;
        trigger: string;
    }): Promise<{ projectId?: string; created: boolean; milestoneTasksCreated: number }> {
        const {
            tenantId,
            quoteId,
            quoteNumber,
            clientId,
            clientName,
            total,
            items,
            ownerEmployeeId,
            trigger,
        } = params;

        if (!clientId) return { created: false, milestoneTasksCreated: 0 };

        const projectCode = this.buildQuoteProjectCode(quoteNumber);
        const resolvedItems = await this.resolveQuoteItemsForAutomation(tenantId, quoteId, items);
        const projectTitle = `${quoteNumber} — ${clientName || 'New Project'}`;
        const lineItemText = resolvedItems.length > 0
            ? resolvedItems.map((i) => `• ${i.description} (${i.quantity} × $${i.unitPrice})`).join('\n')
            : '• Quote items not available in event payload';

        let projectId: string | undefined;
        let created = false;

        const existing = await prisma.project.findFirst({
            where: { tenantId, code: projectCode },
            select: { id: true },
        });

        if (existing) {
            projectId = existing.id;
        } else {
            try {
                const project = await projectsService.create(tenantId, {
                    projectTitle,
                    code: projectCode,
                    description: `Auto-created from approved quote ${quoteNumber}. Total: $${total.toLocaleString()}.\n\nLine items:\n${lineItemText}`,
                    clientId,
                    status: 'PLANNING',
                    startDate: new Date().toISOString(),
                    budget: total,
                }, ownerEmployeeId);
                projectId = project.id;
                created = true;
            } catch (err) {
                // Handle race where another handler created the same quote project first.
                const raced = await prisma.project.findFirst({
                    where: { tenantId, code: projectCode },
                    select: { id: true },
                });
                if (!raced) throw err;
                projectId = raced.id;
            }
        }

        let milestoneTasksCreated = 0;
        if (projectId) {
            milestoneTasksCreated = await this.ensureQuoteMilestoneTasks({
                tenantId,
                projectId,
                clientId,
                quoteNumber,
                items: resolvedItems,
                ownerEmployeeId,
            });
        }

        activityLogger.log({
            tenantId,
            entityType: 'Project',
            entityId: projectId || quoteId,
            action: created ? 'CREATE' : 'UPDATE',
            module: 'automation',
            description: `Quote project ensured from ${trigger} for ${quoteNumber}`,
            metadata: {
                trigger,
                quoteId,
                quoteNumber,
                clientId,
                projectId,
                projectCode,
                projectCreated: created,
                milestoneTasksCreated,
            },
        });

        return { projectId, created, milestoneTasksCreated };
    }

    private async ensureQuoteMilestoneTasks(params: {
        tenantId: string;
        projectId: string;
        clientId: string;
        quoteNumber: string;
        items: { description: string; quantity: number; unitPrice: number; total: number }[];
        ownerEmployeeId?: string;
    }): Promise<number> {
        const { tenantId, projectId, clientId, quoteNumber, items, ownerEmployeeId } = params;

        const existingMilestones = await prisma.task.count({
            where: {
                tenantId,
                projectId,
                title: { startsWith: 'Milestone ' },
                description: { contains: `Quote ${quoteNumber}` },
            },
        });
        if (existingMilestones > 0) return 0;

        const seeds = items.length > 0
            ? items.map((item, idx) => ({
                title: `Milestone ${idx + 1} - ${item.description || `Line Item ${idx + 1}`}`,
                description: `Quote ${quoteNumber}\nDeliverable: ${item.description || `Line Item ${idx + 1}`}\nQuantity: ${item.quantity}\nRate: $${item.unitPrice}\nAmount: $${item.total}`,
                priority: idx === 0 ? 'HIGH' as const : 'MEDIUM' as const,
                offsetDays: idx * 7,
            }))
            : [
                {
                    title: `Milestone 1 - Kickoff (${quoteNumber})`,
                    description: `Quote ${quoteNumber}\nKickoff and implementation planning.`,
                    priority: 'HIGH' as const,
                    offsetDays: 0,
                },
                {
                    title: `Milestone 2 - Midpoint Review (${quoteNumber})`,
                    description: `Quote ${quoteNumber}\nReview progress, quality, and scope alignment.`,
                    priority: 'MEDIUM' as const,
                    offsetDays: 7,
                },
                {
                    title: `Milestone 3 - Final Delivery (${quoteNumber})`,
                    description: `Quote ${quoteNumber}\nFinal delivery, QA sign-off, and handover.`,
                    priority: 'HIGH' as const,
                    offsetDays: 14,
                },
            ];

        let created = 0;
        for (const seed of seeds) {
            try {
                const dueDate = this.getNextBusinessDay();
                dueDate.setDate(dueDate.getDate() + seed.offsetDays);
                while (dueDate.getDay() === 0 || dueDate.getDay() === 6) {
                    dueDate.setDate(dueDate.getDate() + 1);
                }

                await tasksService.create(tenantId, {
                    title: seed.title,
                    description: seed.description,
                    priority: seed.priority,
                    projectId,
                    clientId,
                    assignedToId: ownerEmployeeId || null,
                    dueDate: dueDate.toISOString(),
                });
                created += 1;
            } catch (err) {
                logger.error('[Automation] quote milestone task creation failed', {
                    tenantId,
                    projectId,
                    quoteNumber,
                    title: seed.title,
                    err,
                });
            }
        }

        return created;
    }

    /**
     * Returns the next business day (skips Saturday and Sunday).
     */
    private getNextBusinessDay(): Date {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        // Skip Saturday (6) and Sunday (0)
        while (date.getDay() === 0 || date.getDay() === 6) {
            date.setDate(date.getDate() + 1);
        }
        return date;
    }

    private async shouldRunLegacyRoofingAutomation(tenantId: string, handler: string): Promise<boolean> {
        const enabled = await isLegacyRoofingAutomationEnabled(tenantId);
        if (!enabled) {
            logger.debug('[Automation] Legacy roofing automation skipped for Sales CRM tenant', {
                tenantId,
                handler,
            });
        }
        return enabled;
    }

    // ── Observability ───────────────────────────────────────────────────

    private getBuiltInRuleNames(): string[] {
        return [
            'lead.created → notification + admin broadcast + follow-up task + discovery call + analytics',
            'lead.converted → notification',
            'lead.statusChanged → QUALIFIED (meeting + proposal task + notification) / WON|LOST (notification)',
            'client.created → notification + accepted-quote project bootstrap + milestones',
            'project.created → phase tasks + team notification + project folder + admin notification + audit',
            'invoice.statusChanged (OVERDUE) → task + collection call | (PAID) → PAYMENT + BI ENGINE: 10-step cascade (revenue + conversion + CLV + AI prediction)',
            'task.completed → notification',
            'booking.created → preparation task',
            'booking.confirmed → follow-up task',
            'booking.cancelled → admin notification',
            'payment.received → WEBHOOK ENGINE: lifecycle + CRM timeline + confirmation event + notifications + audit',
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
            'project.statusChanged (COMPLETED) → BILLING ENGINE: invoice + payment reminder + review task + notifications + audit',
            'invoice.sent → observability',
            'calendar.completed → auto-create draft quote + notification + review task',
            'quote.created (direct draft) → proposal task TODO/IN_PROGRESS → REVIEW',
            'quote.statusChanged (SENT) → proposal task REVIEW/DONE sync + lead QUALIFIED/CONTACTED/NEW → PROPOSAL',
            'quote.statusChanged (ACCEPTED) → enforce lead WON + ensure client conversion/link',
            'quote.statusChanged (ACCEPTED) → MASTER TRIGGER: lead→client + project + invoice + kickoff + onboarding tasks + notifications + audit',
        ];
    }
}

export const automationService = new AutomationService();
