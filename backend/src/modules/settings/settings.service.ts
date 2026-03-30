import { BadRequestError } from '../../common/errors/HttpErrors';
import { mailerService } from '../../common/services/mailer.service';
import { mailboxRepository } from '../emails/mailbox.repository';
import { settingsManager } from './settings.manager';
import { settingsRepository } from './settings.repository';
import {
  type EmailSettingsResponseDto,
  toBillingResponseDto,
  toCompanyProfileDto,
  toEmailSettingsDto,
  toGeneralSettingsDto,
  toWorkspaceSettingsResponseDto,
  type BillingInvoiceDto,
  type UpdateCompanyProfileDto,
  type UpdateGeneralSettingsDto,
  type UpdateImapSettingsDto,
  type UpdateNotificationSettingsDto,
  type UpdateSecuritySettingsDto,
  type UpdateSettingsDto,
  type UpdateSmtpSettingsDto,
} from './settings.dto';

export class SettingsService {
  private async buildEmailSettingsResponse(tenantId: string, userId: string): Promise<EmailSettingsResponseDto> {
    const settings = await settingsRepository.ensure(tenantId);
    const workspaceEmail = toEmailSettingsDto(settings);
    const mailboxSettings = await mailboxRepository.getMailboxSettings(userId);

    return {
      smtp: {
        host: mailboxSettings.smtp.host,
        port: mailboxSettings.smtp.port,
        username: mailboxSettings.smtp.username,
        passwordMasked: mailboxSettings.smtp.passwordMasked,
        encryption: mailboxSettings.smtp.encryption,
        senderName: mailboxSettings.smtp.senderName,
        senderEmail: mailboxSettings.smtp.senderEmail,
        signature: mailboxSettings.smtp.signature || workspaceEmail.smtp.signature || '',
        configured: mailboxSettings.smtp.configured,
      },
      imap: {
        host: mailboxSettings.imap.host,
        port: mailboxSettings.imap.port,
        username: mailboxSettings.imap.username,
        passwordMasked: mailboxSettings.imap.passwordMasked,
        encryption: mailboxSettings.imap.encryption,
        configured: mailboxSettings.imap.configured,
      },
      mailboxAddress: mailboxSettings.mailboxAddress,
      templates: workspaceEmail.templates,
    };
  }

  async get(tenantId: string) {
    const settings = await settingsRepository.ensure(tenantId);
    return toWorkspaceSettingsResponseDto(settings);
  }

  async update(tenantId: string, data: UpdateSettingsDto) {
    const settings = await settingsRepository.update(tenantId, data);
    return toWorkspaceSettingsResponseDto(settings);
  }

  async getGeneral(tenantId: string) {
    const settings = await settingsRepository.ensure(tenantId);
    return toGeneralSettingsDto(settings);
  }

  async updateGeneral(tenantId: string, data: UpdateGeneralSettingsDto) {
    const settings = await settingsRepository.update(tenantId, { general: data });
    return toGeneralSettingsDto(settings);
  }

  async getCompany(tenantId: string) {
    const settings = await settingsRepository.ensure(tenantId);
    return toCompanyProfileDto(settings);
  }

  async updateCompany(tenantId: string, data: UpdateCompanyProfileDto) {
    const settings = await settingsRepository.update(tenantId, { company: data });
    return toCompanyProfileDto(settings);
  }

  async updateCompanyLogo(tenantId: string, logoPath: string) {
    const settings = await settingsRepository.updateCompanyLogo(tenantId, logoPath);
    return toCompanyProfileDto(settings);
  }

  async getBilling(tenantId: string) {
    const context = await settingsManager.getBillingContext(tenantId);
    return toBillingResponseDto(context);
  }

  async getBillingInvoices(tenantId: string): Promise<BillingInvoiceDto[]> {
    const context = await settingsManager.getBillingContext(tenantId);
    const subscription = context.subscription;

    if (!subscription) {
      return [];
    }

    const monthlyRate = Number(subscription.monthlyRate || 0);
    const invoices: BillingInvoiceDto[] = [];

    if (Number(subscription.totalPaid || 0) > 0 && monthlyRate > 0) {
      invoices.push({
        id: `${subscription.id}-latest-paid`,
        label: `Subscription payment`,
        amount: Number(subscription.totalPaid),
        status: 'PAID',
        billedAt: subscription.startDate,
        dueAt: subscription.startDate,
      });
    }

    if (subscription.nextBillingDate && monthlyRate > 0) {
      invoices.push({
        id: `${subscription.id}-upcoming`,
        label: 'Upcoming renewal',
        amount: monthlyRate,
        status: 'UPCOMING',
        billedAt: null,
        dueAt: subscription.nextBillingDate,
      });
    }

    return invoices;
  }

  async getEmailSettings(tenantId: string, userId: string) {
    return this.buildEmailSettingsResponse(tenantId, userId);
  }

  async updateSmtpSettings(tenantId: string, userId: string, data: UpdateSmtpSettingsDto) {
    await mailboxRepository.updateMailboxSettings(userId, {
      smtp: {
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        encryption: data.encryption,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        signature: data.signature,
      },
    });

    const emailSettings = await this.buildEmailSettingsResponse(tenantId, userId);

    // Test SMTP connection after saving
    const mailbox = await mailboxRepository.getRuntimeConfig(userId);
    let connectionTest: { ok: boolean; error?: string } = { ok: false, error: 'SMTP credentials are incomplete' };
    if (mailbox?.smtp.host && mailbox.smtp.user && mailbox.smtp.pass) {
      connectionTest = await mailerService.testSmtpConnection({
        host: mailbox.smtp.host,
        port: mailbox.smtp.port,
        user: mailbox.smtp.user,
        pass: mailbox.smtp.pass,
        encryption: mailbox.smtp.encryption,
      });
    }

    return { ...emailSettings, connectionTest };
  }

  async updateImapSettings(tenantId: string, userId: string, data: UpdateImapSettingsDto) {
    await mailboxRepository.updateMailboxSettings(userId, {
      imap: {
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        encryption: data.encryption,
      },
    });

    return this.buildEmailSettingsResponse(tenantId, userId);
  }

  async sendTestEmail(userId: string, toEmail: string) {
    const mailbox = await mailboxRepository.getRuntimeConfig(userId);
    const smtp = mailbox?.smtp;

    if (!smtp?.host || !smtp.user || !smtp.pass) {
      throw new BadRequestError('Configure your personal SMTP mailbox before sending a test email');
    }

    const delivery = await mailerService.sendMailWithConfigDetailed(
      {
        host: smtp.host,
        port: smtp.port,
        user: smtp.user,
        pass: smtp.pass,
        encryption: smtp.encryption,
        senderName: smtp.senderName,
        senderEmail: smtp.senderEmail || smtp.user,
      },
      {
        to: toEmail,
        subject: 'Your Soft CRM test email',
        html: `<p>This is a successful SMTP test for your workspace.</p><p>Sent at ${new Date().toISOString()}</p>`,
        text: `This is a successful SMTP test for your workspace. Sent at ${new Date().toISOString()}`,
      }
    );

    if (!delivery.sent) {
      throw new BadRequestError(
        `Unable to send test email with your personal SMTP mailbox. ${delivery.error || 'Check the SMTP username, password, host, and port.'}`,
      );
    }

    return {
      delivered: true,
      recipient: toEmail,
    };
  }

  async getNotifications(tenantId: string) {
    const settings = await settingsRepository.ensure(tenantId);
    return toWorkspaceSettingsResponseDto(settings).notifications;
  }

  async updateNotifications(tenantId: string, data: UpdateNotificationSettingsDto) {
    const settings = await settingsRepository.update(tenantId, { notifications: data });
    return toWorkspaceSettingsResponseDto(settings).notifications;
  }

  async getSecurity(tenantId: string) {
    const settings = await settingsRepository.ensure(tenantId);
    return toWorkspaceSettingsResponseDto(settings).security;
  }

  async updateSecurity(tenantId: string, data: UpdateSecuritySettingsDto) {
    const settings = await settingsRepository.update(tenantId, { security: data });
    return toWorkspaceSettingsResponseDto(settings).security;
  }
}

export const settingsService = new SettingsService();
