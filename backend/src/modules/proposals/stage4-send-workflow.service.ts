import {
    eventBus,
    ProposalSentEvent,
    ProposalViewedEvent,
} from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { smsService } from '../../common/services/sms.service';
import { communicationLogService } from '../communication-logs/communication-log.service';
import { tasksService } from '../tasks/tasks.service';
import { calendarService } from '../calendar/calendar.service';
import { notificationsService } from '../notifications/notifications.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { proposalsService } from './proposals.service';
import { proposalReminderService } from './proposal-reminder.service';
import { LeadStatus, CommunicationType } from '@prisma/client';
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL || '';

// ============================================================================
// STAGE 4 — SEND PROPOSAL WORKFLOW
//
// Listens to:
//   proposal.sent    → Automations 1–5,7
//   proposal.viewed  → Automation 6
//
// Automations:
//   1. Email proposal (with PDF + AI report attachments)
//   2. SMS proposal link
//   3. Update pipeline: CONTACTED → PROPOSAL
//   4. Create follow-up task (3 days)
//   5. Create calendar event (3 days, 15-min reminder)
//   6. Notify sales rep on proposal view
//   7. Schedule reminder sequence
// ============================================================================

export class Stage4SendWorkflowService {

    initialize(): void {
        eventBus.on('proposal.sent', (event) => {
            this.handleProposalSent(event).catch((err) => {
                logger.error('[Stage4] handleProposalSent failed', { err: err.message, proposalId: event.proposalId });
            });
        });

        eventBus.on('proposal.viewed', (event) => {
            this.handleProposalViewed(event).catch((err) => {
                logger.error('[Stage4] handleProposalViewed failed', { err: err.message, proposalId: event.proposalId });
            });
        });

        logger.info('[Stage4] Send Proposal Workflow initialized');
    }

    // ── Main handler for proposal.sent ──────────────────────────────────

    private async handleProposalSent(event: ProposalSentEvent): Promise<void> {
        logger.info('[Stage4] Processing proposal.sent', {
            proposalId: event.proposalId,
            deliveryMethod: event.deliveryMethod,
            leadName: event.leadName,
        });

        const results = await Promise.allSettled([
            // Automation 1: Email proposal (if email delivery selected)
            (event.deliveryMethod === 'email' || event.deliveryMethod === 'email_sms')
                ? this.sendProposalEmail(event)
                : Promise.resolve(),

            // Automation 2: SMS proposal link (if SMS delivery selected)
            (event.deliveryMethod === 'sms' || event.deliveryMethod === 'email_sms')
                ? this.sendProposalSms(event)
                : Promise.resolve(),

            // Automation 3: Pipeline update
            this.updatePipeline(event),

            // Automation 4: Follow-up task
            this.createFollowUpTask(event),

            // Automation 5: Calendar event
            this.createCalendarEvent(event),

            // Automation 7: Schedule reminder sequence
            this.scheduleReminders(event),
        ]);

        results.forEach((result, idx) => {
            if (result.status === 'rejected') {
                const names = ['Email', 'SMS', 'Pipeline', 'Task', 'Calendar', 'Reminders'];
                logger.error(`[Stage4] Automation "${names[idx]}" failed`, {
                    proposalId: event.proposalId,
                    error: result.reason?.message || result.reason,
                });
            }
        });
    }

    // ── Automation 1: Email Proposal ────────────────────────────────────

    private async sendProposalEmail(event: ProposalSentEvent): Promise<void> {
        if (!event.leadEmail) return;

        // Build tracking pixel URL
        const trackPixelUrl = `${APP_BASE_URL}/api/v1/public/proposals/${event.publicToken}/track`;

        const html = this.buildProposalEmailHtml({
            leadName: event.leadName,
            proposalLink: `${APP_BASE_URL}${event.proposalLink}`,
            total: event.total,
            quoteNumber: event.quoteNumber,
            trackPixelUrl,
        });

        // Prepare attachments
        const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];

        // Generate proposal PDF for attachment
        try {
            const proposal = await (prisma as any).proposal.findFirst({
                where: { id: event.proposalId },
            });
            if (proposal) {
                const { buffer, fileName } = await proposalsService.generatePdf(event.proposalId, event.tenantId);
                attachments.push({
                    filename: fileName,
                    content: buffer,
                    contentType: 'application/pdf',
                });
            }
        } catch (err: any) {
            logger.warn('[Stage4] Could not attach proposal PDF', { err: err.message });
        }

        const delivery = await tenantMailerService.sendTenantEmail({
            tenantId: event.tenantId,
            preferredUserId: event.ownerUserId || event.salesRepId,
            to: event.leadEmail,
            subject: 'Your Roofing Proposal – Review & Accept Online',
            html,
            attachments: attachments.length > 0 ? attachments : undefined,
        });
        const sent = delivery.sent;

        // Log in CommunicationLog
        if (sent) {
            await communicationLogService.createSafe({
                tenantId: event.tenantId,
                leadId: event.leadId,
                type: 'EMAIL',
                direction: 'OUTBOUND',
                subject: 'Your Roofing Proposal – Review & Accept Online',
                content: `Proposal ${event.quoteNumber} sent to ${event.leadName} via email`,
                to: event.leadEmail,
            });
        }

        logger.info('[Stage4] Proposal email sent', {
            proposalId: event.proposalId,
            to: event.leadEmail,
            success: sent,
            error: delivery.error,
        });
    }

    // ── Automation 2: SMS Proposal Link ─────────────────────────────────

    private async sendProposalSms(event: ProposalSentEvent): Promise<void> {
        if (!event.leadPhone) return;

        const proposalUrl = `${APP_BASE_URL}${event.proposalLink}`;
        const message = `Hi ${event.leadName.split(' ')[0]}, your roofing proposal is ready. View & accept here: ${proposalUrl}`;

        const sent = await smsService.sendSms({
            to: event.leadPhone,
            message,
            tenantId: event.tenantId,
        });

        // Log in CommunicationLog
        await communicationLogService.createSafe({
            tenantId: event.tenantId,
            leadId: event.leadId,
            type: 'SMS' as CommunicationType,
            direction: 'OUTBOUND',
            subject: 'Proposal Link',
            content: message,
            to: event.leadPhone,
        });

        logger.info('[Stage4] Proposal SMS sent', {
            proposalId: event.proposalId,
            to: event.leadPhone,
            success: sent,
        });
    }

    // ── Automation 3: Pipeline Update ───────────────────────────────────

    private async updatePipeline(event: ProposalSentEvent): Promise<void> {
        const lead = await prisma.lead.findFirst({
            where: { id: event.leadId, tenantId: event.tenantId },
            select: { status: true },
        });
        if (!lead) return;

        // Only update if not already past "PROPOSAL" (preserve forward pipeline)
        if (lead.status === 'NEW' || lead.status === 'CONTACTED') {
            await prisma.lead.update({
                where: { id: event.leadId },
                data: { status: 'PROPOSAL' as LeadStatus },
            });

            eventBus.emit('lead.statusChanged', {
                tenantId: event.tenantId,
                leadId: event.leadId,
                leadName: event.leadName,
                oldStatus: lead.status,
                newStatus: 'PROPOSAL',
                ownerUserId: event.salesRepId,
            });

            activityLogger.log({
                tenantId: event.tenantId,
                entityType: 'Lead',
                entityId: event.leadId,
                action: 'STATUS_CHANGE',
                module: 'leads',
                description: `Pipeline updated to PROPOSAL — proposal sent to ${event.leadName}`,
                userId: event.salesRepId,
                metadata: { oldStatus: lead.status, newStatus: 'PROPOSAL', trigger: 'proposal.sent' },
            });
        }

        logger.info('[Stage4] Pipeline updated', { leadId: event.leadId });
    }

    // ── Automation 4: Follow-up Task ────────────────────────────────────

    private async createFollowUpTask(event: ProposalSentEvent): Promise<void> {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);

        await tasksService.create(event.tenantId, {
            title: `Follow up on Proposal – ${event.leadName}`,
            description: [
                `Follow up on proposal ${event.quoteNumber} sent to ${event.leadName}.`,
                '',
                `Delivery method: ${event.deliveryMethod}`,
                `Proposal link: ${event.proposalLink}`,
                '',
                'Action: Contact the lead to answer any questions and close the deal.',
            ].join('\n'),
            priority: 'HIGH',
            assignedToId: event.salesRepId,
            dueDate: dueDate.toISOString(),
        });

        logger.info('[Stage4] Follow-up task created', {
            proposalId: event.proposalId,
            dueDate: dueDate.toISOString(),
        });
    }

    // ── Automation 5: Calendar Event ────────────────────────────────────

    private async createCalendarEvent(event: ProposalSentEvent): Promise<void> {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 3);
        eventDate.setHours(10, 0, 0, 0); // 10 AM default

        const endDate = new Date(eventDate);
        endDate.setMinutes(endDate.getMinutes() + 30);

        await calendarService.create(event.tenantId, {
            title: `Proposal Follow-up – ${event.leadName}`,
            description: [
                `Follow up on proposal ${event.quoteNumber} sent to ${event.leadName}.`,
                '',
                `Proposal value: $${event.total.toLocaleString()}`,
                `Delivery: ${event.deliveryMethod}`,
            ].join('\n'),
            startTime: eventDate.toISOString(),
            endTime: endDate.toISOString(),
            reminderMinutes: 15,
            eventType: 'REMINDER',
            priority: 'high',
            attendeeIds: [event.salesRepId],
        });

        logger.info('[Stage4] Calendar event created', {
            proposalId: event.proposalId,
            eventDate: eventDate.toISOString(),
        });
    }

    // ── Automation 6: Proposal View Notification ────────────────────────

    private async handleProposalViewed(event: ProposalViewedEvent): Promise<void> {
        logger.info('[Stage4] Proposal viewed', {
            proposalId: event.proposalId,
            leadName: event.leadName,
            viewCount: event.viewCount,
        });

        // Notify the sales rep
        if (event.ownerUserId) {
            await notificationsService.create({
                tenantId: event.tenantId,
                userId: event.ownerUserId,
                title: 'Proposal Viewed',
                message: `${event.leadName} viewed your proposal!`,
                type: 'INFO',
                metadata: { proposalId: event.proposalId, relatedType: 'proposal' },
            });
        }

        activityLogger.log({
            tenantId: event.tenantId,
            entityType: 'Proposal',
            entityId: event.proposalId,
            action: 'UPDATE',
            module: 'proposals',
            description: `${event.leadName} viewed the proposal (view #${event.viewCount})`,
            metadata: { viewCount: event.viewCount },
        });
    }

    // ── Automation 7: Schedule Reminder Sequence ────────────────────────

    private async scheduleReminders(event: ProposalSentEvent): Promise<void> {
        proposalReminderService.scheduleReminders({
            tenantId: event.tenantId,
            proposalId: event.proposalId,
            leadId: event.leadId,
            senderUserId: event.ownerUserId || event.salesRepId,
            leadName: event.leadName,
            leadEmail: event.leadEmail,
            leadPhone: event.leadPhone,
            proposalLink: event.proposalLink,
            sentAt: new Date(),
        });

        logger.info('[Stage4] Reminder sequence scheduled', {
            proposalId: event.proposalId,
        });
    }

    // ── Email HTML Template ─────────────────────────────────────────────

    private buildProposalEmailHtml(opts: {
        leadName: string;
        proposalLink: string;
        total: number;
        quoteNumber: string;
        trackPixelUrl: string;
    }): string {
        const firstName = opts.leadName.split(' ')[0];

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f7fa;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;">ZODO Roofing</h1>
            <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">Your Roofing Proposal</p>
        </div>

        <!-- Body -->
        <div style="padding:40px;">
            <h2 style="color:#1e293b;font-size:20px;margin:0 0 16px;">Hi ${firstName},</h2>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Thank you for your interest in our roofing services. We've prepared a detailed proposal for your project.
                Please review it at your convenience.
            </p>

            <!-- Proposal Summary Card -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:0 0 28px;">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="color:#64748b;font-size:13px;padding:4px 0;">Proposal #</td>
                        <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;">${opts.quoteNumber}</td>
                    </tr>
                    <tr>
                        <td style="color:#64748b;font-size:13px;padding:4px 0;">Estimated Total</td>
                        <td style="color:#1e293b;font-size:15px;font-weight:700;text-align:right;">$${opts.total.toLocaleString()}</td>
                    </tr>
                </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin:0 0 32px;">
                <a href="${opts.proposalLink}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                    View &amp; Accept Proposal
                </a>
            </div>

            <p style="color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
                This proposal is valid for 30 days. If you have any questions, simply reply to this email or call us directly.
            </p>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">
                © ${new Date().getFullYear()} ZODO Roofing. All rights reserved.
            </p>
        </div>
    </div>

    <!-- Tracking Pixel -->
    <img src="${opts.trackPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>`.trim();
    }
}

export const stage4SendWorkflowService = new Stage4SendWorkflowService();
