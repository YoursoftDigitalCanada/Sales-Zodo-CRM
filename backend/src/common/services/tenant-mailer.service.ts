import { ServiceUnavailableError } from '../errors/HttpErrors';
import { mailboxRepository } from '../../modules/emails/mailbox.repository';
import { settingsRepository } from '../../modules/settings/settings.repository';
import { requestContextStore } from './request-context.store';
import { mailerService } from './mailer.service';
import { config } from '../../config';

export interface TenantEmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface TenantEmailOptions {
  tenantId: string;
  preferredUserId?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: TenantEmailAttachment[];
}

type TenantSender = {
  senderName: string;
  senderEmail: string;
  send: (options: Omit<TenantEmailOptions, 'tenantId' | 'preferredUserId'>) => Promise<{ sent: boolean; error?: string }>;
};

const SIGNUP_FROM_EMAIL = config.email.from || config.email.user || 'security@zodo.ca';
const SIGNUP_FROM_NAME = 'ZODO CRM';

class TenantMailerService {
  async getTenantSender(tenantId: string, preferredUserId?: string): Promise<TenantSender> {
    const requestContext = requestContextStore.get();
    const candidateUserIds = [preferredUserId, requestContext?.userId].filter(
      (value, index, all): value is string => Boolean(value) && all.indexOf(value) === index,
    );

    for (const userId of candidateUserIds) {
      const mailbox = await mailboxRepository.getRuntimeConfig(userId);
      if (
        mailbox
        && mailbox.tenantId === tenantId
        && mailbox.smtp.host
        && mailbox.smtp.user
        && mailbox.smtp.pass
      ) {
        const senderName = mailbox.smtp.senderName || 'ZODO CRM';
        const senderEmail = mailbox.smtp.senderEmail || mailbox.smtp.user;
        return {
          senderName,
          senderEmail,
          send: (options) => mailerService.sendMailWithConfigDetailed(
            {
              host: mailbox.smtp.host,
              port: mailbox.smtp.port,
              user: mailbox.smtp.user,
              pass: mailbox.smtp.pass,
              encryption: mailbox.smtp.encryption,
              senderName,
              senderEmail,
            },
            options,
          ),
        };
      }
    }

    const workspaceSmtp = await settingsRepository.getSmtpConfig(tenantId);
    if (workspaceSmtp.host && workspaceSmtp.user && workspaceSmtp.pass) {
      const senderName = workspaceSmtp.senderName || 'ZODO CRM';
      const senderEmail = workspaceSmtp.senderEmail || workspaceSmtp.user;
      return {
        senderName,
        senderEmail,
        send: (options) => mailerService.sendMailWithConfigDetailed(
          {
            host: workspaceSmtp.host,
            port: workspaceSmtp.port,
            user: workspaceSmtp.user,
            pass: workspaceSmtp.pass,
            encryption: workspaceSmtp.encryption,
            senderName,
            senderEmail,
          },
          options,
        ),
      };
    }

    const fallbackMailbox = await mailboxRepository.findConfiguredSmtpForTenant(tenantId);
    if (fallbackMailbox) {
      const senderName = fallbackMailbox.smtp.senderName || 'ZODO CRM';
      const senderEmail = fallbackMailbox.smtp.senderEmail || fallbackMailbox.smtp.user;
      return {
        senderName,
        senderEmail,
        send: (options) => mailerService.sendMailWithConfigDetailed(
          {
            host: fallbackMailbox.smtp.host,
            port: fallbackMailbox.smtp.port,
            user: fallbackMailbox.smtp.user,
            pass: fallbackMailbox.smtp.pass,
            encryption: fallbackMailbox.smtp.encryption,
            senderName,
            senderEmail,
          },
          options,
        ),
      };
    }

    throw new ServiceUnavailableError(
      'Business email delivery requires a configured mailbox in Settings > Email for this workspace.',
    );
  }

  async sendTenantEmail(options: TenantEmailOptions): Promise<{ sent: boolean; error?: string; senderEmail: string; senderName: string }> {
    const sender = await this.getTenantSender(options.tenantId, options.preferredUserId);
    const { tenantId: _tenantId, preferredUserId: _preferredUserId, ...mailOptions } = options;
    const delivery = await sender.send(mailOptions);

    return {
      ...delivery,
      senderEmail: sender.senderEmail,
      senderName: sender.senderName,
    };
  }

  async sendSignupEmail(options: Omit<TenantEmailOptions, 'tenantId' | 'preferredUserId'>): Promise<{ sent: boolean; error?: string; senderEmail: string; senderName: string }> {
    const delivery = await mailerService.sendGlobalMailDetailed({
      ...options,
      fromName: SIGNUP_FROM_NAME,
      fromEmail: SIGNUP_FROM_EMAIL,
    });

    return {
      ...delivery,
      senderEmail: SIGNUP_FROM_EMAIL,
      senderName: SIGNUP_FROM_NAME,
    };
  }
}

export const tenantMailerService = new TenantMailerService();
