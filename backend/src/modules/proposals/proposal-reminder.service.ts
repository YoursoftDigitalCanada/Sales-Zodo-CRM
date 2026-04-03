import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { smsService } from '../../common/services/sms.service';
import { communicationLogService } from '../communication-logs/communication-log.service';
import { CommunicationType } from '@prisma/client';

const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL || '';

// ============================================================================
// PROPOSAL REMINDER SERVICE — Stage 4, Automation 7
//
// Schedules automated reminder emails + SMS at Day 3, 7, 14, 25 after send.
// Stops if proposal is accepted, declined, or expired.
//
// Uses an in-memory scheduler with setInterval checks.
// For production scale, consider replacing with a job queue (Bull, Agenda, etc.)
// ============================================================================

interface ScheduledReminder {
    tenantId: string;
    proposalId: string;
    leadId: string;
    senderUserId?: string;
    leadName: string;
    leadEmail?: string;
    leadPhone?: string;
    proposalLink: string;
    sentAt: Date;
}

interface ReminderSchedule {
    day: number;
    message: string;
    subject: string;
}

const REMINDER_SCHEDULE: ReminderSchedule[] = [
    { day: 3, message: 'Just checking in on the proposal we sent.', subject: 'Following Up on Your Roofing Proposal' },
    { day: 7, message: 'Your proposal expires in 23 days.', subject: 'Your Roofing Proposal – Expiring Soon' },
    { day: 14, message: 'Quick reminder about your roofing proposal.', subject: 'Reminder: Your Roofing Proposal Awaits' },
    { day: 25, message: 'Last chance — proposal expires in 5 days.', subject: 'Last Chance – Proposal Expiring in 5 Days' },
];

class ProposalReminderService {
    private scheduledProposals: Map<string, ScheduledReminder> = new Map();
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

    initialize(): void {
        // Start the periodic checker
        this.checkInterval = setInterval(() => {
            this.processReminders().catch((err) => {
                logger.error('[ProposalReminder] Process reminders failed', { err: err.message });
            });
        }, this.CHECK_INTERVAL_MS);

        logger.info('[ProposalReminder] Reminder service initialized', {
            checkIntervalMs: this.CHECK_INTERVAL_MS,
            schedulePoints: REMINDER_SCHEDULE.map(r => `Day ${r.day}`),
        });
    }

    /**
     * Schedule reminders for a newly sent proposal
     */
    scheduleReminders(data: ScheduledReminder): void {
        this.scheduledProposals.set(data.proposalId, data);

        logger.info('[ProposalReminder] Reminders scheduled', {
            proposalId: data.proposalId,
            leadName: data.leadName,
            sentAt: data.sentAt.toISOString(),
        });
    }

    /**
     * Cancel reminders for a proposal (e.g., on acceptance/decline)
     */
    cancelReminders(proposalId: string): void {
        this.scheduledProposals.delete(proposalId);
        logger.info('[ProposalReminder] Reminders cancelled', { proposalId });
    }

    /**
     * Periodic check: iterate all scheduled proposals and send due reminders
     */
    private async processReminders(): Promise<void> {
        if (this.scheduledProposals.size === 0) return;

        const now = new Date();

        for (const [proposalId, reminder] of this.scheduledProposals.entries()) {
            try {
                await this.processOneProposal(proposalId, reminder, now);
            } catch (err: any) {
                logger.error('[ProposalReminder] Error processing reminder', {
                    proposalId,
                    error: err.message,
                });
            }
        }
    }

    private async processOneProposal(
        proposalId: string,
        reminder: ScheduledReminder,
        now: Date,
    ): Promise<void> {
        // Check if proposal is still in a state that needs reminders
        const proposal = await (prisma as any).proposal.findFirst({
            where: { id: proposalId, tenantId: reminder.tenantId },
            select: { status: true },
        });

        if (!proposal) {
            this.cancelReminders(proposalId);
            return;
        }

        // Stop reminders if proposal is no longer pending
        const stopStatuses = ['ACCEPTED', 'DECLINED', 'EXPIRED'];
        if (stopStatuses.includes(proposal.status)) {
            this.cancelReminders(proposalId);
            return;
        }

        // Calculate days since sent
        const daysSinceSent = Math.floor((now.getTime() - reminder.sentAt.getTime()) / (1000 * 60 * 60 * 24));

        // Find the appropriate reminder to send
        for (const schedule of REMINDER_SCHEDULE) {
            if (daysSinceSent >= schedule.day && daysSinceSent < schedule.day + 1) {
                // Check if already sent for this day (use a simple key check)
                const sentKey = `${proposalId}_day${schedule.day}`;
                if (this.sentReminders.has(sentKey)) continue;

                await this.sendReminder(reminder, schedule);
                this.sentReminders.add(sentKey);
            }
        }

        // Clean up after last reminder (day 25 + buffer)
        if (daysSinceSent > 30) {
            this.cancelReminders(proposalId);
        }
    }

    // Track which reminders have already been sent
    private sentReminders: Set<string> = new Set();

    private async sendReminder(reminder: ScheduledReminder, schedule: ReminderSchedule): Promise<void> {
        const firstName = reminder.leadName.split(' ')[0];
        const proposalUrl = `${APP_BASE_URL}${reminder.proposalLink}`;

        logger.info('[ProposalReminder] Sending reminder', {
            proposalId: reminder.proposalId,
            day: schedule.day,
            leadName: reminder.leadName,
        });

        // Send email reminder
        if (reminder.leadEmail) {
            const html = this.buildReminderEmailHtml({
                firstName,
                message: schedule.message,
                proposalLink: proposalUrl,
            });

            const delivery = await tenantMailerService.sendTenantEmail({
                tenantId: reminder.tenantId,
                preferredUserId: reminder.senderUserId,
                to: reminder.leadEmail,
                subject: schedule.subject,
                html,
            });
            if (!delivery.sent) {
                logger.warn('[ProposalReminder] Email reminder delivery failed', {
                    proposalId: reminder.proposalId,
                    leadEmail: reminder.leadEmail,
                    error: delivery.error,
                });
                return;
            }

            await communicationLogService.createSafe({
                tenantId: reminder.tenantId,
                leadId: reminder.leadId,
                type: 'EMAIL',
                direction: 'OUTBOUND',
                subject: schedule.subject,
                content: `Reminder (Day ${schedule.day}): ${schedule.message}`,
                to: reminder.leadEmail,
            });
        }

        // Send SMS reminder
        if (reminder.leadPhone) {
            const smsMessage = `Hi ${firstName}, ${schedule.message} View your proposal: ${proposalUrl}`;

            await smsService.sendSms({
                to: reminder.leadPhone,
                message: smsMessage,
                tenantId: reminder.tenantId,
            });

            await communicationLogService.createSafe({
                tenantId: reminder.tenantId,
                leadId: reminder.leadId,
                type: 'SMS' as CommunicationType,
                direction: 'OUTBOUND',
                subject: `Proposal Reminder Day ${schedule.day}`,
                content: smsMessage,
                to: reminder.leadPhone,
            });
        }
    }

    private buildReminderEmailHtml(opts: {
        firstName: string;
        message: string;
        proposalLink: string;
    }): string {
        return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f7fa;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:28px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">ZODO Roofing</h1>
        </div>
        <div style="padding:36px 40px;">
            <h2 style="color:#1e293b;font-size:18px;margin:0 0 16px;">Hi ${opts.firstName},</h2>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                ${opts.message}
            </p>
            <div style="text-align:center;margin:0 0 24px;">
                <a href="${opts.proposalLink}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:12px 36px;border-radius:8px;font-size:15px;font-weight:600;">
                    View Your Proposal
                </a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center;">
                If you have any questions, simply reply to this email.
            </p>
        </div>
        <div style="background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} ZODO Roofing</p>
        </div>
    </div>
</body>
</html>`.trim();
    }
}

export const proposalReminderService = new ProposalReminderService();
