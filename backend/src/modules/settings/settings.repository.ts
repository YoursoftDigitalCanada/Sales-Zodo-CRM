import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { normalizeImapTransportConfig, normalizeSmtpTransportConfig } from '../../common/utils/email-transport';
import { decryptSecret, encryptSecret, isMaskedSecret } from '../../common/utils/secret-crypto';
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SECURITY_SETTINGS,
  type EmailEncryption,
} from './settings.constants';
import {
  type UpdateSettingsDto,
  type WorkspaceSettingsRecord,
} from './settings.dto';

type JsonMap = Record<string, unknown>;

function toObject(value: unknown): JsonMap {
  return typeof value === 'object' && value !== null ? (value as JsonMap) : {};
}

function withJson(value: JsonMap): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mergeSecret(existingValue: unknown, nextValue: string | undefined): string {
  if (nextValue === undefined || isMaskedSecret(nextValue)) {
    return typeof existingValue === 'string' ? existingValue : '';
  }

  if (nextValue === '') {
    return '';
  }

  return encryptSecret(nextValue);
}

export class SettingsRepository {
  async findByTenantId(tenantId: string): Promise<WorkspaceSettingsRecord | null> {
    return prisma.tenantSettings.findUnique({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
            logo: true,
            fileStorageQuota: true,
            fileStorageUsed: true,
          },
        },
      },
    });
  }

  async ensure(tenantId: string): Promise<WorkspaceSettingsRecord> {
    let settings = await this.findByTenantId(tenantId);

    if (!settings) {
      await prisma.tenantSettings.create({
        data: {
          tenantId,
          notificationSettings: withJson(DEFAULT_NOTIFICATION_SETTINGS),
          integrations: withJson({
            securitySettings: DEFAULT_SECURITY_SETTINGS,
            emailTemplates: DEFAULT_EMAIL_TEMPLATES,
            workspaceTheme: 'light',
            darkMode: false,
          }),
        },
      });

      settings = await this.findByTenantId(tenantId);
    }

    if (!settings) {
      throw new Error('Failed to initialize tenant settings');
    }

    return settings;
  }

  async update(tenantId: string, data: UpdateSettingsDto): Promise<WorkspaceSettingsRecord> {
    const existing = await this.ensure(tenantId);
    const existingIntegrations = toObject(existing.integrations);
    const existingSecuritySettings = toObject(existingIntegrations.securitySettings);
    const existingEmailTemplates = toObject(existingIntegrations.emailTemplates);
    const existingNotificationSettings = toObject(existing.notificationSettings);

    const nextIntegrations: JsonMap = {
      ...existingIntegrations,
      securitySettings: {
        ...DEFAULT_SECURITY_SETTINGS,
        ...existingSecuritySettings,
      },
      emailTemplates: {
        ...DEFAULT_EMAIL_TEMPLATES,
        ...existingEmailTemplates,
      },
    };

    if (data.general) {
      if (data.general.organizationName !== undefined) {
        nextIntegrations.organizationName = data.general.organizationName;
      }
      if (data.general.theme !== undefined) {
        nextIntegrations.workspaceTheme = data.general.theme;
        nextIntegrations.darkMode = data.general.theme === 'dark';
      }
    }

    if (data.company) {
      if (data.company.companyName !== undefined) {
        nextIntegrations.companyName = data.company.companyName;
      }
      if (data.company.domain !== undefined) {
        nextIntegrations.companyDomain = data.company.domain;
      }
      if (data.company.email !== undefined) {
        nextIntegrations.companyEmail = data.company.email;
      }
      if (data.company.phone !== undefined) {
        nextIntegrations.companyPhone = data.company.phone;
      }
      if (data.company.address !== undefined) {
        nextIntegrations.companyAddress = data.company.address;
      }
      if (data.company.taxId !== undefined) {
        nextIntegrations.taxId = data.company.taxId;
      }
    }

    if (data.security) {
      nextIntegrations.securitySettings = {
        ...DEFAULT_SECURITY_SETTINGS,
        ...existingSecuritySettings,
        ...data.security,
      };
    }

    if (data.smtp) {
      if (data.smtp.host !== undefined) nextIntegrations.smtpHost = data.smtp.host;
      if (data.smtp.port !== undefined) nextIntegrations.smtpPort = data.smtp.port;
      if (data.smtp.encryption !== undefined) nextIntegrations.smtpEncryption = data.smtp.encryption;
      if (data.smtp.senderName !== undefined) nextIntegrations.senderName = data.smtp.senderName;
      if (data.smtp.senderEmail !== undefined) nextIntegrations.senderEmail = data.smtp.senderEmail;
      if (data.smtp.username !== undefined) {
        nextIntegrations.smtpUser = mergeSecret(existingIntegrations.smtpUser, data.smtp.username);
      }
      if (data.smtp.password !== undefined) {
        nextIntegrations.smtpPass = mergeSecret(existingIntegrations.smtpPass, data.smtp.password);
      }
    }

    if (data.imap) {
      if (data.imap.host !== undefined) nextIntegrations.imapHost = data.imap.host;
      if (data.imap.port !== undefined) nextIntegrations.imapPort = data.imap.port;
      if (data.imap.encryption !== undefined) nextIntegrations.imapEncryption = data.imap.encryption;
      if (data.imap.username !== undefined) {
        nextIntegrations.imapUser = mergeSecret(existingIntegrations.imapUser, data.imap.username);
      }
      if (data.imap.password !== undefined) {
        nextIntegrations.imapPass = mergeSecret(existingIntegrations.imapPass, data.imap.password);
      }
    }

    if (data.templates && data.templates.length > 0) {
      const currentTemplates = toObject(nextIntegrations.emailTemplates);
      const mergedTemplates: JsonMap = { ...currentTemplates };

      for (const template of data.templates) {
        mergedTemplates[template.id] = {
          ...toObject(currentTemplates[template.id]),
          ...(template.subject !== undefined ? { subject: template.subject } : {}),
          ...(template.bodyHtml !== undefined ? { bodyHtml: template.bodyHtml } : {}),
          ...(template.bodyText !== undefined ? { bodyText: template.bodyText } : {}),
        };
      }

      nextIntegrations.emailTemplates = mergedTemplates;
    }

    const nextNotificationSettings = data.notifications
      ? {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...existingNotificationSettings,
          ...data.notifications,
        }
      : existingNotificationSettings;

    await prisma.$transaction(async (tx) => {
      await tx.tenantSettings.update({
        where: { tenantId },
        data: {
          ...(data.general?.timezone !== undefined ? { timezone: data.general.timezone } : {}),
          ...(data.general?.dateFormat !== undefined ? { dateFormat: data.general.dateFormat } : {}),
          ...(data.general?.currency !== undefined ? { currency: data.general.currency } : {}),
          ...(data.general?.language !== undefined ? { language: data.general.language } : {}),
          ...(data.smtp?.signature !== undefined ? { emailSignature: data.smtp.signature } : {}),
          notificationSettings: withJson(nextNotificationSettings),
          integrations: withJson(nextIntegrations),
        },
      });

      const tenantName = data.company?.companyName ?? data.general?.organizationName;
      const tenantDomain = data.company?.domain;

      if (tenantName !== undefined || tenantDomain !== undefined) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            ...(tenantName !== undefined ? { name: tenantName } : {}),
            ...(tenantDomain !== undefined ? { domain: tenantDomain || null } : {}),
          },
        });
      }
    });

    return this.ensure(tenantId);
  }

  async updateCompanyLogo(tenantId: string, logoPath: string): Promise<WorkspaceSettingsRecord> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { logo: logoPath },
    });

    return this.ensure(tenantId);
  }

  async getSmtpConfig(tenantId: string) {
    const settings = await this.ensure(tenantId);
    const integrations = toObject(settings.integrations);
    const normalized = normalizeSmtpTransportConfig({
      host: String(integrations.smtpHost ?? ''),
      port: Number(integrations.smtpPort ?? 587),
      user: decryptSecret(String(integrations.smtpUser ?? '')),
      pass: decryptSecret(String(integrations.smtpPass ?? '')),
      encryption: String(integrations.smtpEncryption ?? 'STARTTLS') as EmailEncryption,
      senderName: String(integrations.senderName ?? ''),
      senderEmail: String(integrations.senderEmail ?? ''),
    });

    return {
      host: normalized.host,
      port: normalized.port,
      user: normalized.user,
      pass: normalized.pass,
      encryption: normalized.encryption as EmailEncryption,
      senderName: normalized.senderName,
      senderEmail: normalized.senderEmail,
      signature: settings.emailSignature || '',
    };
  }

  async getImapConfig(tenantId: string) {
    const settings = await this.ensure(tenantId);
    const integrations = toObject(settings.integrations);
    const normalized = normalizeImapTransportConfig({
      host: String(integrations.imapHost ?? ''),
      port: Number(integrations.imapPort ?? 993),
      user: decryptSecret(String(integrations.imapUser ?? '')),
      pass: decryptSecret(String(integrations.imapPass ?? '')),
      encryption: String(integrations.imapEncryption ?? 'SSL/TLS') as EmailEncryption,
    });

    return {
      host: normalized.host,
      port: normalized.port,
      user: normalized.user,
      pass: normalized.pass,
      encryption: normalized.encryption as EmailEncryption,
    };
  }

  async getEmailConfigStatus(tenantId: string) {
    const [smtp, imap] = await Promise.all([
      this.getSmtpConfig(tenantId),
      this.getImapConfig(tenantId),
    ]);

    return {
      smtpConfigured: Boolean(smtp.host && smtp.user && smtp.pass),
      imapConfigured: Boolean(imap.host && imap.user && imap.pass),
    };
  }
}

export const settingsRepository = new SettingsRepository();
