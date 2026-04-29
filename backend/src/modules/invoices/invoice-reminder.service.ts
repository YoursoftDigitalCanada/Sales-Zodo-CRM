import { InvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { logger } from '../../common/utils/logger';
import { communicationLogService } from '../communication-logs/communication-log.service';

const DAY_MS = 24 * 60 * 60 * 1000;

class InvoiceReminderService {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000;

  start(): void {
    if (this.checkInterval) {
      return;
    }

    void this.processDueReminders();
    this.checkInterval = setInterval(() => {
      void this.processDueReminders();
    }, this.CHECK_INTERVAL_MS);

    logger.info('[InvoiceReminder] Reminder service started', {
      checkIntervalMs: this.CHECK_INTERVAL_MS,
    });
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async processDueReminders(): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dueThrough = new Date(todayStart.getTime() + (2 * DAY_MS) + (DAY_MS - 1));

    const invoices = await prisma.invoice.findMany({
      where: {
        sentAt: { not: null },
        dueDate: {
          gte: todayStart,
          lte: dueThrough,
        },
        status: {
          in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
        },
        amountDue: {
          gt: 0,
        },
      },
      select: {
        id: true,
        tenantId: true,
        invoiceNumber: true,
        dueDate: true,
        currency: true,
        total: true,
        amountDue: true,
        client: {
          select: {
            id: true,
            clientName: true,
            primaryEmail: true,
          },
        },
      },
    });

    for (const invoice of invoices) {
      try {
        await this.processOneInvoice(invoice, todayStart);
      } catch (error) {
        logger.error('[InvoiceReminder] Failed to process invoice reminder', {
          invoiceId: invoice.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async processOneInvoice(
    invoice: {
      id: string;
      tenantId: string;
      invoiceNumber: string;
      dueDate: Date;
      currency: string;
      total: unknown;
      amountDue: unknown;
      client: {
        id: string;
        clientName: string;
        primaryEmail: string | null;
      };
    },
    todayStart: Date,
  ): Promise<void> {
    const recipientEmail = String(invoice.client?.primaryEmail || '').trim();
    if (!recipientEmail) {
      return;
    }

    const dueDateStart = new Date(invoice.dueDate);
    dueDateStart.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.round((dueDateStart.getTime() - todayStart.getTime()) / DAY_MS);
    if (daysUntilDue < 0 || daysUntilDue > 2) {
      return;
    }

    const subject = `Reminder: Invoice ${invoice.invoiceNumber} is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`}`;
    const marker = `invoice-reminder:${invoice.id}:day-${daysUntilDue}`;

    const alreadySentToday = await prisma.communicationLog.findFirst({
      where: {
        tenantId: invoice.tenantId,
        type: 'EMAIL',
        direction: 'OUTBOUND',
        to: recipientEmail,
        subject,
        content: {
          contains: marker,
        },
        createdAt: {
          gte: todayStart,
        },
      },
      select: { id: true },
    });

    if (alreadySentToday) {
      return;
    }

    const dueDateLabel = invoice.dueDate.toLocaleDateString();
    const clientName = invoice.client.clientName || 'Customer';
    const amountDue = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: invoice.currency || 'CAD',
    }).format(Number(invoice.amountDue || 0));

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0F172A;line-height:1.6;">
        <h2 style="margin:0 0 12px;">Hi ${clientName},</h2>
        <p style="margin:0 0 12px;">
          This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> is due
          <strong>${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`}</strong>.
        </p>
        <p style="margin:0 0 12px;">
          Due date: <strong>${dueDateLabel}</strong><br />
          Amount due: <strong>${amountDue}</strong>
        </p>
        <p style="margin:0;">
          If you have already arranged payment, thank you and please disregard this reminder.
        </p>
      </div>
    `;

    const text = [
      `Hi ${clientName},`,
      '',
      `This is a friendly reminder that invoice ${invoice.invoiceNumber} is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`}.`,
      `Due date: ${dueDateLabel}`,
      `Amount due: ${amountDue}`,
      '',
      'If you have already arranged payment, thank you and please disregard this reminder.',
    ].join('\n');

    const delivery = await tenantMailerService.sendPrivilegedTenantEmail({
      tenantId: invoice.tenantId,
      to: recipientEmail,
      subject,
      html,
      text,
    });

    if (!delivery.sent) {
      logger.warn('[InvoiceReminder] Reminder email delivery failed', {
        invoiceId: invoice.id,
        recipientEmail,
        error: delivery.error,
      });
      return;
    }

    await communicationLogService.createSafe({
      tenantId: invoice.tenantId,
      leadId: null,
      type: 'EMAIL',
      direction: 'OUTBOUND',
      subject,
      content: `${marker} Reminder sent for invoice ${invoice.invoiceNumber} due on ${dueDateLabel}.`,
      to: recipientEmail,
    });
  }
}

export const invoiceReminderService = new InvoiceReminderService();
