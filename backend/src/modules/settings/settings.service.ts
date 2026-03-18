import { BadRequestError } from '../../common/errors/HttpErrors';
import { mailerService } from '../../common/services/mailer.service';
import { settingsManager } from './settings.manager';
import { settingsRepository } from './settings.repository';
import {
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

  async getEmailSettings(tenantId: string) {
    const settings = await settingsRepository.ensure(tenantId);
    return toEmailSettingsDto(settings);
  }

  async updateSmtpSettings(tenantId: string, data: UpdateSmtpSettingsDto) {
    const settings = await settingsRepository.update(tenantId, { smtp: data });
    return toEmailSettingsDto(settings);
  }

  async updateImapSettings(tenantId: string, data: UpdateImapSettingsDto) {
    const settings = await settingsRepository.update(tenantId, { imap: data });
    return toEmailSettingsDto(settings);
  }

  async sendTestEmail(tenantId: string, toEmail: string) {
    const smtp = await settingsRepository.getSmtpConfig(tenantId);

    if (!smtp.host || !smtp.user || !smtp.pass) {
      throw new BadRequestError('SMTP must be configured before sending a test email');
    }

    const delivered = await mailerService.sendMailWithConfig(
      {
        host: smtp.host,
        port: smtp.port,
        user: smtp.user,
        pass: smtp.pass,
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

    if (!delivered) {
      throw new BadRequestError('Unable to send test email with the configured SMTP server');
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
