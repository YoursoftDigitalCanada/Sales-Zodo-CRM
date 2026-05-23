import {
    eventBus,
    ProposalAcceptedEvent,
} from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { smsService } from '../../common/services/sms.service';
import { communicationLogService } from '../communication-logs/communication-log.service';
import { clientsService } from '../clients/clients.service';
import { projectsService } from '../projects/projects.service';
import { invoicesService } from '../invoices/invoices.service';
import { tasksService } from '../tasks/tasks.service';
import { calendarService } from '../calendar/calendar.service';
import { notificationsService } from '../notifications/notifications.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { proposalReminderService } from './proposal-reminder.service';
import { automationIdempotencyService } from '../automation/automation-idempotency.service';

const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL || '';

// ============================================================================
// STAGE 5 — ACCEPT + SIGN = CLIENT CONVERSION
//
// Listens to:
//   proposal.accepted → All 9 automations
//
// Automations:
//   1. Convert Lead → Client
//   2. Generate signed contract PDF (record)
//   3. Create Project from proposal
//   4. Create 33% deposit invoice
//   5. Create 14 project tasks
//   6. Create 5 calendar events
//   7. Create client file folder structure
//   8. Send emails + internal notifications
//   9. Cancel proposal reminder sequence
// ============================================================================

export class Stage5ConversionWorkflowService {

    initialize(): void {
        eventBus.on('proposal.accepted', (event) => {
            this.handleProposalAccepted(event).catch((err) => {
                logger.error('[Stage5] handleProposalAccepted failed', {
                    err: err.message,
                    proposalId: event.proposalId,
                });
            });
        });

        logger.info('[Stage5] Client Conversion Workflow initialized');
    }

    // ── Main handler ────────────────────────────────────────────────────

    private async handleProposalAccepted(event: ProposalAcceptedEvent): Promise<void> {
        logger.info('[Stage5] Processing proposal.accepted', {
            proposalId: event.proposalId,
            leadId: event.leadId,
            leadName: event.leadName,
        });

        // Fetch full lead data for conversion
        const lead = await prisma.lead.findUnique({
            where: { id: event.leadId },
            include: {
                assignedTo: { select: { id: true, userId: true } },
                leadSource: { select: { name: true } },
            },
        });

        if (!lead) {
            logger.error('[Stage5] Lead not found', { leadId: event.leadId });
            return;
        }

        // Fetch proposal with quote items
        const proposal = await (prisma as any).proposal.findUnique({
            where: { id: event.proposalId },
            include: {
                quote: {
                    include: {
                        items: true,
                    },
                },
            },
        });

        // ── Step 1: Convert Lead → Client ───────────────────────────────

        let clientId: string | undefined;
        try {
            clientId = await this.convertLeadToClient(event, lead);
        } catch (err: any) {
            logger.error('[Stage5] Lead → Client conversion failed', { err: err.message, leadId: event.leadId });
        }

        // ── Steps 2–9: Run in parallel (with graceful failures) ─────────

        const results = await Promise.allSettled([
            // Auto 2: Create signed contract record
            this.createContractRecord(event, clientId),

            // Auto 3: Create project
            this.createProject(event, lead, proposal, clientId),

            // Auto 4: Create deposit invoice
            clientId ? this.createDepositInvoice(event, proposal, clientId) : Promise.resolve(),

            // Auto 5: Create project tasks
            this.createProjectTasks(event, lead),

            // Auto 6: Create calendar events
            this.createCalendarEvents(event, lead),

            // Auto 7: Create client folder structure
            clientId ? this.createFileStructure(event, clientId) : Promise.resolve(),

            // Auto 8: Send emails + notifications
            this.sendNotifications(event, lead, clientId),

            // Auto 9: Cancel reminder sequence
            this.cancelReminders(event),
        ]);

        const names = [
            'Contract', 'Project', 'Invoice', 'Tasks',
            'Calendar', 'Folders', 'Notifications', 'CancelReminders',
        ];
        results.forEach((result, idx) => {
            if (result.status === 'rejected') {
                logger.error(`[Stage5] Automation "${names[idx]}" failed`, {
                    proposalId: event.proposalId,
                    error: result.reason?.message || result.reason,
                });
            }
        });

        logger.info('[Stage5] All automations completed', {
            proposalId: event.proposalId,
            clientId,
        });
    }

    // ── Automation 1: Convert Lead → Client ─────────────────────────────

    private async convertLeadToClient(
        event: ProposalAcceptedEvent,
        lead: any,
    ): Promise<string> {
        logger.info('[Stage5] Converting lead → client', { leadId: event.leadId });

        const client = await clientsService.create(event.tenantId, {
            clientName: `${lead.firstName} ${lead.lastName}`,
            primaryEmail: lead.email || '',
            primaryPhone: lead.phone || '',
            clientType: 'INDIVIDUAL',
            streetAddress: lead.propertyAddress || undefined,
            city: lead.city || undefined,
            province: lead.state || undefined,
            postalCode: lead.zipCode || undefined,
            internalNotes: lead.notes || undefined,
            leadSource: lead.leadSource?.name || undefined,
            propertyType: lead.propertyType || undefined,
            serviceType: lead.serviceType || undefined,
            preferredContactMethod: lead.preferredContactMethod || undefined,
            bestTimeToContact: lead.bestTimeToContact || undefined,
            isInsuranceClaim: lead.isInsuranceClaim || undefined,
            insuranceCompanyName: lead.insuranceCompanyName || undefined,
            urgencyLevel: lead.urgencyLevel || undefined,
            isHOA: lead.isHOA || undefined,
            hoaRestrictions: lead.hoaRestrictions || undefined,
            contactName: `${lead.firstName} ${lead.lastName}`,
            assignedOwner: lead.assignedToId || undefined,
        }, event.salesRepId);

        // Mark lead as converted
        await prisma.lead.update({
            where: { id: event.leadId },
            data: {
                convertedAt: new Date(),
                convertedToClientId: client.id,
                lifecycleStage: 'OPPORTUNITY',
            },
        });

        // Link SignedContract to client
        await (prisma as any).signedContract.updateMany({
            where: { proposalId: event.proposalId, tenantId: event.tenantId },
            data: { clientId: client.id },
        });

        activityLogger.log({
            tenantId: event.tenantId,
            entityType: 'Lead',
            entityId: event.leadId,
            action: 'UPDATE',
            module: 'stage5-conversion',
            description: `Lead "${event.leadName}" converted to Client (${client.id})`,
            userId: event.salesRepId,
            metadata: { clientId: client.id, trigger: 'proposal.accepted' },
        });

        logger.info('[Stage5] Lead converted to client', { leadId: event.leadId, clientId: client.id });
        return client.id;
    }

    // ── Automation 2: Signed Contract Record ────────────────────────────

    private async createContractRecord(
        event: ProposalAcceptedEvent,
        clientId?: string,
    ): Promise<void> {
        // The SignedContract was already created in signProposal().
        // If clientId is now available, update it.
        if (clientId) {
            await (prisma as any).signedContract.updateMany({
                where: { proposalId: event.proposalId, tenantId: event.tenantId, clientId: null },
                data: { clientId },
            });
        }

        logger.info('[Stage5] Contract record linked to client', {
            proposalId: event.proposalId,
            clientId,
        });
    }

    // ── Automation 3: Create Project ────────────────────────────────────

    private async createProject(
        event: ProposalAcceptedEvent,
        lead: any,
        proposal: any,
        clientId?: string,
    ): Promise<void> {
        const quoteItems = proposal?.quote?.items || [];
        const projectValue = event.total;

        // Find "CONTRACT SIGNED" stage for Kanban
        const contractSignedStage = await (prisma as any).projectStage.findFirst({
            where: {
                tenantId: event.tenantId,
                name: { contains: 'CONTRACT', mode: 'insensitive' },
            },
        });

        const project = await projectsService.create(event.tenantId, {
            name: `Roofing Project – ${event.leadName}`,
            description: [
                `Project created from proposal ${event.quoteNumber}.`,
                '',
                `Client: ${event.leadName}`,
                `Address: ${lead.propertyAddress || 'N/A'}`,
                `Total Value: $${projectValue.toLocaleString()}`,
                '',
                `Line Items:`,
                ...quoteItems.map((item: any) =>
                    `  • ${item.description} — Qty: ${Number(item.quantity)}, $${Number(item.unitPrice).toLocaleString()}`
                ),
            ].join('\n'),
            clientId: clientId || undefined,
            quoteId: proposal?.quoteId || undefined,
            leadId: event.leadId,
            contractValue: projectValue,
            budget: projectValue,
            status: 'PLANNING',
            priority: 'HIGH',
            projectType: 'REPLACEMENT',
            stageId: contractSignedStage?.id || undefined,
            salesRepId: event.salesRepId || undefined,
            jobSiteAddress: lead.propertyAddress || undefined,
            jobSiteCity: lead.city || undefined,
            jobSiteState: lead.state || undefined,
            jobSiteZip: lead.zipCode || undefined,
            isInsuranceJob: lead.isInsuranceClaim === 'Yes',
            insuranceCompany: lead.insuranceCompanyName || undefined,
            claimNumber: lead.claimNumber || undefined,
        }, event.salesRepId);

        logger.info('[Stage5] Project created', {
            projectId: project.id,
            projectName: project.name,
        });
    }

    // ── Automation 4: Deposit Invoice ───────────────────────────────────

    private async createDepositInvoice(
        event: ProposalAcceptedEvent,
        proposal: any,
        clientId: string,
    ): Promise<void> {
        const depositPercent = 0.33;
        const depositAmount = Math.round(event.total * depositPercent * 100) / 100;

        // Generate invoice number
        const year = new Date().getFullYear();
        const count = await (prisma as any).invoice.count({
            where: { tenantId: event.tenantId },
        });
        const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

        await invoicesService.create(event.tenantId, {
            invoiceNumber,
            clientId,
            dueDate: dueDate.toISOString() as any,
            taxRate: null,
            notes: `Deposit invoice for proposal ${event.quoteNumber}. 33% of total project value ($${event.total.toLocaleString()}).`,
            terms: 'Due upon receipt. Balance will be invoiced upon project completion.',
            items: [{
                description: `Deposit (33%) – Roofing Project for ${event.leadName}`,
                quantity: 1,
                unitPrice: depositAmount,
                amount: depositAmount,
            }],
        });

        logger.info('[Stage5] Deposit invoice created', {
            invoiceNumber,
            depositAmount,
            clientId,
        });
    }

    // ── Automation 5: Project Tasks ─────────────────────────────────────

    private async createProjectTasks(
        event: ProposalAcceptedEvent,
        lead: any,
    ): Promise<void> {
        const tasks = [
            { title: 'Collect deposit', daysOffset: 1, priority: 'URGENT' as const },
            { title: 'Order materials', daysOffset: 3, priority: 'HIGH' as const },
            { title: 'Pull permit', daysOffset: 3, priority: 'HIGH' as const },
            { title: 'Schedule crew', daysOffset: 5, priority: 'HIGH' as const },
            { title: 'Confirm material delivery', daysOffset: 7, priority: 'MEDIUM' as const },
            { title: 'Notify client', daysOffset: 8, priority: 'MEDIUM' as const },
            { title: 'Roof tear-off', daysOffset: 10, priority: 'HIGH' as const },
            { title: 'Roof installation', daysOffset: 11, priority: 'HIGH' as const },
            { title: 'Site cleanup', daysOffset: 13, priority: 'MEDIUM' as const },
            { title: 'Final inspection', daysOffset: 14, priority: 'HIGH' as const },
            { title: 'Client walkthrough', daysOffset: 15, priority: 'HIGH' as const },
            { title: 'Final payment collection', daysOffset: 16, priority: 'URGENT' as const },
            { title: 'Issue warranty', daysOffset: 18, priority: 'MEDIUM' as const },
            { title: 'Request customer review', daysOffset: 20, priority: 'LOW' as const },
        ];

        for (const task of tasks) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + task.daysOffset);

            await automationIdempotencyService.runOnce(
                event.tenantId,
                `${event.tenantId}:proposal.accepted:Proposal:${event.proposalId}:stage5-task:${task.title}`,
                { eventName: 'proposal.accepted', entityType: 'Proposal', entityId: event.proposalId, actionType: `stage5-task:${task.title}` },
                async () => tasksService.create(event.tenantId, {
                    title: `${task.title} – ${event.leadName}`,
                    description: `Project task for ${event.leadName}. Proposal: ${event.quoteNumber}`,
                    priority: task.priority,
                    assignedToId: event.salesRepId || lead.assignedToId || undefined,
                    dueDate: dueDate.toISOString(),
                }),
            );
        }

        logger.info('[Stage5] 14 project tasks created', {
            proposalId: event.proposalId,
            leadName: event.leadName,
        });
    }

    // ── Automation 6: Calendar Events ───────────────────────────────────

    private async createCalendarEvents(
        event: ProposalAcceptedEvent,
        lead: any,
    ): Promise<void> {
        const events = [
            { title: 'Material Delivery', daysOffset: 7, type: 'TASK' as const, duration: 120 },
            { title: 'Project Start', daysOffset: 10, type: 'TASK' as const, duration: 480 },
            { title: 'Project Completion', daysOffset: 14, type: 'TASK' as const, duration: 120 },
            { title: 'Final Inspection', daysOffset: 15, type: 'MEETING' as const, duration: 60 },
            { title: 'Client Follow-up', daysOffset: 20, type: 'CALL' as const, duration: 30 },
        ];

        for (const ev of events) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + ev.daysOffset);
            startDate.setHours(9, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setMinutes(endDate.getMinutes() + ev.duration);

            await calendarService.create(event.tenantId, {
                title: `${ev.title} – ${event.leadName}`,
                description: `Scheduled for roofing project. Proposal: ${event.quoteNumber}`,
                location: lead.propertyAddress || undefined,
                eventType: ev.type,
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
                reminderMinutes: 30,
                priority: 'high',
                attendeeIds: event.salesRepId ? [event.salesRepId] : [],
            });
        }

        logger.info('[Stage5] 5 calendar events created', {
            proposalId: event.proposalId,
        });
    }

    // ── Automation 7: Client File Folder Structure ──────────────────────

    private async createFileStructure(
        event: ProposalAcceptedEvent,
        clientId: string,
    ): Promise<void> {
        const folders = [
            'Contracts',
            'Invoices',
            'Photos/Before',
            'Photos/During',
            'Photos/After',
            'Permits',
            'Warranty',
        ];

        // Create root folder
        const rootFolder = await (prisma as any).fileFolder.create({
            data: {
                name: `Client – ${event.leadName}`,
                tenantId: event.tenantId,
                clientId,
            },
        }).catch(() => null);

        if (!rootFolder) {
            // If FileFolder model doesn't exist, log and skip
            logger.warn('[Stage5] FileFolder model not available, skipping folder creation');
            return;
        }

        for (const folderPath of folders) {
            const parts = folderPath.split('/');
            let parentId = rootFolder.id;

            for (const part of parts) {
                const folder = await (prisma as any).fileFolder.create({
                    data: {
                        name: part,
                        tenantId: event.tenantId,
                        clientId,
                        parentId,
                    },
                });
                parentId = folder.id;
            }
        }

        logger.info('[Stage5] Client file structure created', {
            clientId,
            folderCount: folders.length,
        });
    }

    // ── Automation 8: Emails + Notifications ────────────────────────────

    private async sendNotifications(
        event: ProposalAcceptedEvent,
        lead: any,
        clientId?: string,
    ): Promise<void> {
        const firstName = event.leadName.split(' ')[0];

        // ── Client confirmation email ───────────────────────────────────
        if (event.clientEmail) {
            const html = this.buildConfirmationEmailHtml({ firstName, leadName: event.leadName });

            const delivery = await tenantMailerService.sendTenantEmail({
                tenantId: event.tenantId,
                preferredUserId: event.ownerUserId,
                to: event.clientEmail,
                subject: 'Thank you! Your roofing project is confirmed',
                html,
            });
            if (!delivery.sent) {
                logger.warn('[Stage5] Client confirmation email delivery failed', {
                    tenantId: event.tenantId,
                    to: event.clientEmail,
                    error: delivery.error,
                });
            }

            if (delivery.sent) {
                await communicationLogService.createSafe({
                    tenantId: event.tenantId,
                    leadId: event.leadId,
                    type: 'EMAIL',
                    direction: 'OUTBOUND',
                    subject: 'Thank you! Your roofing project is confirmed',
                    content: `Confirmation email sent after proposal acceptance`,
                    to: event.clientEmail,
                });
            }
        }

        // ── Internal notification: Sales Rep ────────────────────────────
        if (event.ownerUserId) {
            const ownerUserId = event.ownerUserId;
            await automationIdempotencyService.runOnce(
                event.tenantId,
                `${event.tenantId}:proposal.accepted:Proposal:${event.proposalId}:owner-notification`,
                { eventName: 'proposal.accepted', entityType: 'Proposal', entityId: event.proposalId, actionType: 'owner-notification' },
                async () => notificationsService.create({
                    tenantId: event.tenantId,
                    userId: ownerUserId,
                    title: '🎉 Proposal Signed!',
                    message: `${event.leadName} signed the proposal! Client conversion complete.`,
                    type: 'SUCCESS',
                    actionUrl: clientId ? `/clients/${clientId}` : `/leads/${event.leadId}`,
                    actionLabel: clientId ? 'View Client' : 'View Lead',
                }),
            );
        }

        // ── Internal notification: All admins (Project Manager + Accounts) ──
        const admins = await prisma.employee.findMany({
            where: {
                tenantId: event.tenantId,
                role: { name: { in: ['Admin', 'Super Admin', 'ADMIN', 'SUPER_ADMIN'] } },
            },
            select: { userId: true },
        });

        for (const admin of admins) {
            // Project Manager notification
            await automationIdempotencyService.runOnce(
                event.tenantId,
                `${event.tenantId}:proposal.accepted:Proposal:${event.proposalId}:admin-project-notification:${admin.userId}`,
                { eventName: 'proposal.accepted', entityType: 'Proposal', entityId: event.proposalId, actionType: `admin-project-notification:${admin.userId}` },
                async () => notificationsService.create({
                    tenantId: event.tenantId,
                    userId: admin.userId,
                    title: '📋 New Project Created',
                    message: `New roofing project for ${event.leadName}. Contract value: $${event.total.toLocaleString()}.`,
                    type: 'INFO',
                    metadata: { clientId, proposalId: event.proposalId },
                }),
            );

            // Accounts notification
            await automationIdempotencyService.runOnce(
                event.tenantId,
                `${event.tenantId}:proposal.accepted:Proposal:${event.proposalId}:admin-invoice-notification:${admin.userId}`,
                { eventName: 'proposal.accepted', entityType: 'Proposal', entityId: event.proposalId, actionType: `admin-invoice-notification:${admin.userId}` },
                async () => notificationsService.create({
                    tenantId: event.tenantId,
                    userId: admin.userId,
                    title: '💰 Deposit Invoice Ready',
                    message: `Deposit invoice for ${event.leadName} is ready for review. Amount: $${Math.round(event.total * 0.33).toLocaleString()}.`,
                    type: 'INFO',
                    metadata: { clientId, proposalId: event.proposalId },
                }),
            );
        }

        logger.info('[Stage5] Notifications sent', {
            proposalId: event.proposalId,
            clientEmail: event.clientEmail ? 'sent' : 'skipped',
            adminCount: admins.length,
        });
    }

    // ── Automation 9: Cancel Reminder Sequence ──────────────────────────

    private async cancelReminders(event: ProposalAcceptedEvent): Promise<void> {
        proposalReminderService.cancelReminders(event.proposalId);

        logger.info('[Stage5] Reminder sequence cancelled', {
            proposalId: event.proposalId,
        });
    }

    // ── Email HTML Template ─────────────────────────────────────────────

    private buildConfirmationEmailHtml(opts: {
        firstName: string;
        leadName: string;
    }): string {
        return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f7fa;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">🎉 You're All Set!</h1>
            <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">Your roofing project is confirmed</p>
        </div>

        <!-- Body -->
        <div style="padding:40px;">
            <h2 style="color:#1e293b;font-size:20px;margin:0 0 16px;">Hi ${opts.firstName},</h2>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;">
                Thank you for accepting our proposal! Your roofing project is now confirmed and underway.
            </p>

            <div style="background:#f0fdf4;border-left:4px solid #059669;border-radius:4px;padding:16px 20px;margin:0 0 24px;">
                <p style="color:#065f46;font-size:14px;font-weight:600;margin:0 0 8px;">What happens next:</p>
                <ol style="color:#065f46;font-size:14px;line-height:2;margin:0;padding-left:20px;">
                    <li>We'll send your deposit invoice shortly</li>
                    <li>Materials will be ordered within 3 business days</li>
                    <li>Our project manager will contact you to schedule the work</li>
                    <li>You'll receive regular updates throughout the project</li>
                </ol>
            </div>

            <p style="color:#475569;font-size:14px;line-height:1.7;">
                A copy of your signed proposal and deposit invoice will follow in separate emails.
                If you have any questions, please don't hesitate to reach out.
            </p>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} ZODO Roofing. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`.trim();
    }
}

export const stage5ConversionWorkflowService = new Stage5ConversionWorkflowService();
