import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';

interface ScheduledReminder {
    tenantId: string;
    quoteId: string;
    senderUserId?: string;
    recipientName: string;
    recipientEmail: string;
    publicLink: string;
    sentAt: Date;
}

interface ReminderSchedule {
    day: number;
    subject: string;
    message: string;
}

const REMINDER_SCHEDULE: ReminderSchedule[] = [
    { day: 3, subject: 'Quick reminder to review and sign your proposal', message: 'Just checking in on the proposal we sent over.' },
    { day: 7, subject: 'Your proposal is still waiting for signature', message: 'Your proposal is still open and ready whenever you are.' },
    { day: 14, subject: 'Friendly follow-up on your proposal', message: 'We wanted to make sure the proposal did not get buried in your inbox.' },
];

class QuoteSignatureReminderService {
    private readonly reminders = new Map<string, ScheduledReminder>();
    private readonly sentKeys = new Set<string>();
    private interval: ReturnType<typeof setInterval> | null = null;
    private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000;

    initialize() {
        if (this.interval) return;
        this.interval = setInterval(() => {
            this.processReminders().catch((error) => {
                logger.error('[QuoteReminder] Failed to process reminders', { error: error instanceof Error ? error.message : String(error) });
            });
        }, this.CHECK_INTERVAL_MS);
        logger.info('[QuoteReminder] Reminder service initialized', { checkIntervalMs: this.CHECK_INTERVAL_MS });
    }

    scheduleReminder(data: ScheduledReminder) {
        this.reminders.set(data.quoteId, data);
    }

    cancelReminder(quoteId: string) {
        this.reminders.delete(quoteId);
    }

    private async processReminders() {
        if (this.reminders.size === 0) return;
        const now = new Date();

        for (const [quoteId, reminder] of this.reminders.entries()) {
            const quote = await prisma.quote.findFirst({
                where: { id: quoteId, tenantId: reminder.tenantId },
                select: { status: true },
            });

            if (!quote) {
                this.cancelReminder(quoteId);
                continue;
            }

            if (['SIGNED', 'ACCEPTED', 'REJECTED', 'EXPIRED'].includes(String(quote.status))) {
                this.cancelReminder(quoteId);
                continue;
            }

            const daysSinceSent = Math.floor((now.getTime() - reminder.sentAt.getTime()) / (1000 * 60 * 60 * 24));

            for (const schedule of REMINDER_SCHEDULE) {
                if (daysSinceSent < schedule.day || daysSinceSent >= schedule.day + 1) {
                    continue;
                }

                const sentKey = `${quoteId}:${schedule.day}`;
                if (this.sentKeys.has(sentKey)) {
                    continue;
                }

                const delivery = await tenantMailerService.sendTenantEmail({
                    tenantId: reminder.tenantId,
                    preferredUserId: reminder.senderUserId,
                    to: reminder.recipientEmail,
                    subject: schedule.subject,
                    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:32px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#0F172A;">Hi ${reminder.recipientName},</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">${schedule.message}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">You can open the proposal and sign it online using the secure link below.</p>
    <a href="${reminder.publicLink}" style="display:inline-block;background:#0891B2;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">Review &amp; Sign Proposal</a>
  </div>
</div>`,
                    text: `${schedule.message} Review and sign your proposal here: ${reminder.publicLink}`,
                    relatedEntityType: 'Proposal',
                    relatedEntityId: quoteId,
                });
                if (!delivery.sent) {
                    logger.warn('[QuoteReminder] Email reminder delivery failed', {
                        quoteId,
                        day: schedule.day,
                        recipientEmail: reminder.recipientEmail,
                        error: delivery.error,
                    });
                    continue;
                }

                this.sentKeys.add(sentKey);
            }

            if (daysSinceSent > 21) {
                this.cancelReminder(quoteId);
            }
        }
    }
}

export const quoteSignatureReminderService = new QuoteSignatureReminderService();
