import { ServiceUnavailableError } from '../errors/HttpErrors';
import { mailboxRepository } from '../../modules/emails/mailbox.repository';
import { settingsRepository } from '../../modules/settings/settings.repository';
import { requestContextStore } from './request-context.store';
import { mailerService } from './mailer.service';
import { config } from '../../config';
import { activityLogger } from './activity-logger.service';

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
  replyTo?: string;
  attachments?: TenantEmailAttachment[];
  relatedEntityType?: string;
  relatedEntityId?: string;
}

type TenantSender = {
  senderName: string;
  senderEmail: string;
  send: (options: Omit<TenantEmailOptions, 'tenantId' | 'preferredUserId' | 'relatedEntityType' | 'relatedEntityId'>) => Promise<{ sent: boolean; error?: string; messageId?: string }>;
};

const SIGNUP_FROM_EMAIL = config.email.from || config.email.user || 'security@zodo.ca';
const SIGNUP_FROM_NAME = 'ZODO CRM';

class TenantMailerService {
  private async getTenantDefaultSenderName(tenantId: string): Promise<string> {
    try {
      const workspaceSmtp = await settingsRepository.getSmtpConfig(tenantId);
      return workspaceSmtp.senderName || 'ZODO CRM';
    } catch {
      return 'ZODO CRM';
    }
  }

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
        const senderName = mailbox.smtp.senderName || await this.getTenantDefaultSenderName(tenantId);
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
      const senderName = workspaceSmtp.senderName || await this.getTenantDefaultSenderName(tenantId);
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
      const senderName = fallbackMailbox.smtp.senderName || await this.getTenantDefaultSenderName(tenantId);
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

  async sendTenantEmail(options: TenantEmailOptions): Promise<{ sent: boolean; error?: string; senderEmail: string; senderName: string; messageId?: string }> {
    const sender = await this.getTenantSender(options.tenantId, options.preferredUserId);
    const { tenantId: _tenantId, preferredUserId: _preferredUserId, relatedEntityType, relatedEntityId, ...mailOptions } = options;
    const delivery = await sender.send(mailOptions);
    this.logDelivery(options.tenantId, delivery, {
      subject: options.subject,
      to: options.to,
      senderEmail: sender.senderEmail,
      senderName: sender.senderName,
      preferredUserId: options.preferredUserId,
      relatedEntityType,
      relatedEntityId,
    });

    return {
      ...delivery,
      senderEmail: sender.senderEmail,
      senderName: sender.senderName,
    };
  }

  async getPrivilegedTenantSender(
    tenantId: string,
    preferredUserId?: string,
    roleNames: string[] = ['Owner', 'Admin', 'Manager'],
  ): Promise<TenantSender> {
    const privilegedMailbox = await mailboxRepository.findConfiguredSmtpForTenantByRoleNames(
      tenantId,
      roleNames,
      preferredUserId,
    );

    if (!privilegedMailbox) {
      throw new ServiceUnavailableError(
        'Invoice automation email delivery requires a configured mailbox for a workspace owner, admin, or manager.',
      );
    }

    const senderName = privilegedMailbox.smtp.senderName || await this.getTenantDefaultSenderName(tenantId);
    const senderEmail = privilegedMailbox.smtp.senderEmail || privilegedMailbox.smtp.user;

    return {
      senderName,
      senderEmail,
      send: (options) => mailerService.sendMailWithConfigDetailed(
        {
          host: privilegedMailbox.smtp.host,
          port: privilegedMailbox.smtp.port,
          user: privilegedMailbox.smtp.user,
          pass: privilegedMailbox.smtp.pass,
          encryption: privilegedMailbox.smtp.encryption,
          senderName,
          senderEmail,
        },
        options,
      ),
    };
  }

  async sendPrivilegedTenantEmail(
    options: TenantEmailOptions & { roleNames?: string[] },
  ): Promise<{ sent: boolean; error?: string; senderEmail: string; senderName: string; messageId?: string }> {
    const sender = await this.getPrivilegedTenantSender(
      options.tenantId,
      options.preferredUserId,
      options.roleNames,
    );
    const { tenantId: _tenantId, preferredUserId: _preferredUserId, roleNames: _roleNames, relatedEntityType, relatedEntityId, ...mailOptions } = options;
    const delivery = await sender.send(mailOptions);
    this.logDelivery(options.tenantId, delivery, {
      subject: options.subject,
      to: options.to,
      senderEmail: sender.senderEmail,
      senderName: sender.senderName,
      preferredUserId: options.preferredUserId,
      relatedEntityType,
      relatedEntityId,
      privileged: true,
    });

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

  private logDelivery(
    tenantId: string,
    delivery: { sent: boolean; error?: string; messageId?: string },
    metadata: Record<string, unknown>,
  ) {
    activityLogger.log({
      tenantId,
      entityType: String(metadata.relatedEntityType || 'Email'),
      entityId: String(metadata.relatedEntityId || delivery.messageId || metadata.subject || 'tenant-email'),
      action: delivery.sent ? 'CREATE' : 'UPDATE',
      module: 'emails',
      userId: typeof metadata.preferredUserId === 'string' ? metadata.preferredUserId : undefined,
      description: delivery.sent
        ? `Tenant email sent: ${metadata.subject || '(no subject)'}`
        : `Tenant email failed: ${metadata.subject || '(no subject)'}`,
      metadata: {
        ...metadata,
        messageId: delivery.messageId,
        error: delivery.error,
        sent: delivery.sent,
      },
    });
  }
}

export const tenantMailerService = new TenantMailerService();
