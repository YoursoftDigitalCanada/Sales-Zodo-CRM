import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { decryptSecret, encryptSecret, isMaskedSecret } from '../../common/utils/secret-crypto';
import { normalizeImapTransportConfig, normalizeSmtpTransportConfig } from '../../common/utils/email-transport';
import {
  EmailEncryption,
  MailboxConfigStatusDto,
  MailboxSettingsResponseDto,
  UpdateMailboxSettingsDto,
} from './emails.dto';

type JsonMap = Record<string, unknown>;

const MASKED_SECRET = '••••••••';
const MAILBOX_PREF_KEY = 'letterBoxMailbox';

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

function getMailboxConfig(preferences: unknown): JsonMap {
  const prefs = toObject(preferences);
  return toObject(prefs[MAILBOX_PREF_KEY]);
}

function getMailboxAddress(mailbox: JsonMap): string | null {
  const smtp = toObject(mailbox.smtp);
  const imap = toObject(mailbox.imap);
  const address = String(smtp.senderEmail ?? smtp.username ?? imap.username ?? '').trim();
  return address || null;
}

function toMaskedSecret(value: string): string {
  return value ? MASKED_SECRET : '';
}

export interface MailboxRuntimeConfig {
  tenantId: string;
  userId: string;
  mailboxAddress: string | null;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    encryption: EmailEncryption;
    senderName: string;
    senderEmail: string;
  };
  imap: {
    host: string;
    port: number;
    user: string;
    pass: string;
    encryption: EmailEncryption;
  };
}

type MailboxUserRecord = {
  id: string;
  tenantId: string | null;
  firstName: string;
  lastName: string;
  preferences: Prisma.JsonValue;
};

function toRuntimeConfig(user: MailboxUserRecord): MailboxRuntimeConfig | null {
  if (!user.tenantId) {
    return null;
  }

  const mailbox = getMailboxConfig(user.preferences);
  const smtp = toObject(mailbox.smtp);
  const imap = toObject(mailbox.imap);
  const senderName = String(smtp.senderName ?? [user.firstName, user.lastName].filter(Boolean).join(' ').trim());
  const normalizedSmtp = normalizeSmtpTransportConfig({
    host: String(smtp.host ?? ''),
    port: Number(smtp.port ?? 587),
    user: decryptSecret(String(smtp.username ?? '')),
    pass: decryptSecret(String(smtp.password ?? '')),
    encryption: String(smtp.encryption ?? 'STARTTLS') as EmailEncryption,
    senderName,
    senderEmail: String(smtp.senderEmail ?? ''),
  });
  const normalizedImap = normalizeImapTransportConfig({
    host: String(imap.host ?? ''),
    port: Number(imap.port ?? 993),
    user: decryptSecret(String(imap.username ?? '')),
    pass: decryptSecret(String(imap.password ?? '')),
    encryption: String(imap.encryption ?? 'SSL/TLS') as EmailEncryption,
  });

  return {
    tenantId: user.tenantId,
    userId: user.id,
    mailboxAddress: getMailboxAddress(mailbox),
    smtp: {
      host: normalizedSmtp.host,
      port: normalizedSmtp.port,
      user: normalizedSmtp.user,
      pass: normalizedSmtp.pass,
      encryption: normalizedSmtp.encryption as EmailEncryption,
      senderName: normalizedSmtp.senderName,
      senderEmail: normalizedSmtp.senderEmail,
    },
    imap: {
      host: normalizedImap.host,
      port: normalizedImap.port,
      user: normalizedImap.user,
      pass: normalizedImap.pass,
      encryption: normalizedImap.encryption as EmailEncryption,
    },
  };
}

function hasConfiguredSmtp(config: MailboxRuntimeConfig | null): config is MailboxRuntimeConfig {
  return Boolean(
    config
    && config.smtp.host
    && config.smtp.user
    && config.smtp.pass
  );
}

export class MailboxRepository {
  async getMailboxSettings(userId: string): Promise<MailboxSettingsResponseDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        preferences: true,
      },
    });

    const mailbox = getMailboxConfig(user?.preferences);
    const smtp = toObject(mailbox.smtp);
    const imap = toObject(mailbox.imap);
    const defaultSenderName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

    const smtpUser = decryptSecret(String(smtp.username ?? ''));
    const smtpPass = decryptSecret(String(smtp.password ?? ''));
    const imapUser = decryptSecret(String(imap.username ?? ''));
    const imapPass = decryptSecret(String(imap.password ?? ''));
    const normalizedSmtp = normalizeSmtpTransportConfig({
      host: String(smtp.host ?? ''),
      port: Number(smtp.port ?? 587),
      encryption: String(smtp.encryption ?? 'STARTTLS') as EmailEncryption,
      username: smtpUser,
      senderName: String(smtp.senderName ?? defaultSenderName),
      senderEmail: String(smtp.senderEmail ?? ''),
    });
    const normalizedImap = normalizeImapTransportConfig({
      host: String(imap.host ?? ''),
      port: Number(imap.port ?? 993),
      encryption: String(imap.encryption ?? 'SSL/TLS') as EmailEncryption,
      username: imapUser,
    });

    return {
      smtp: {
        host: normalizedSmtp.host,
        port: normalizedSmtp.port,
        username: normalizedSmtp.username,
        passwordMasked: toMaskedSecret(smtpPass),
        encryption: normalizedSmtp.encryption as EmailEncryption,
        senderName: normalizedSmtp.senderName,
        senderEmail: normalizedSmtp.senderEmail,
        signature: String(smtp.signature ?? ''),
        configured: Boolean(smtp.host && smtpUser && smtpPass),
      },
      imap: {
        host: normalizedImap.host,
        port: normalizedImap.port,
        username: normalizedImap.username,
        passwordMasked: toMaskedSecret(imapPass),
        encryption: normalizedImap.encryption as EmailEncryption,
        configured: Boolean(imap.host && imapUser && imapPass),
      },
      mailboxAddress: getMailboxAddress(mailbox),
    };
  }

  async updateMailboxSettings(userId: string, data: UpdateMailboxSettingsDto): Promise<MailboxSettingsResponseDto> {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const preferences = toObject(existingUser?.preferences);
    const mailbox = getMailboxConfig(existingUser?.preferences);
    const existingSmtp = toObject(mailbox.smtp);
    const existingImap = toObject(mailbox.imap);

    const nextSmtpRaw: JsonMap = {
      ...existingSmtp,
      ...(data.smtp?.host !== undefined ? { host: data.smtp.host } : {}),
      ...(data.smtp?.port !== undefined ? { port: data.smtp.port } : {}),
      ...(data.smtp?.encryption !== undefined ? { encryption: data.smtp.encryption } : {}),
      ...(data.smtp?.senderName !== undefined ? { senderName: data.smtp.senderName } : {}),
      ...(data.smtp?.senderEmail !== undefined ? { senderEmail: data.smtp.senderEmail } : {}),
      ...(data.smtp?.signature !== undefined ? { signature: data.smtp.signature } : {}),
      ...(data.smtp ? { username: mergeSecret(existingSmtp.username, data.smtp.username) } : {}),
      ...(data.smtp ? { password: mergeSecret(existingSmtp.password, data.smtp.password) } : {}),
    };

    const nextImapRaw: JsonMap = {
      ...existingImap,
      ...(data.imap?.host !== undefined ? { host: data.imap.host } : {}),
      ...(data.imap?.port !== undefined ? { port: data.imap.port } : {}),
      ...(data.imap?.encryption !== undefined ? { encryption: data.imap.encryption } : {}),
      ...(data.imap ? { username: mergeSecret(existingImap.username, data.imap.username) } : {}),
      ...(data.imap ? { password: mergeSecret(existingImap.password, data.imap.password) } : {}),
    };

    const nextSmtpNormalized = normalizeSmtpTransportConfig({
      port: Number(nextSmtpRaw.port ?? 587),
      encryption: String(nextSmtpRaw.encryption ?? 'STARTTLS') as EmailEncryption,
    });
    const nextImapNormalized = normalizeImapTransportConfig({
      port: Number(nextImapRaw.port ?? 993),
      encryption: String(nextImapRaw.encryption ?? 'SSL/TLS') as EmailEncryption,
    });

    const nextSmtp: JsonMap = {
      ...nextSmtpRaw,
      port: nextSmtpNormalized.port,
      encryption: nextSmtpNormalized.encryption,
    };

    const nextImap: JsonMap = {
      ...nextImapRaw,
      port: nextImapNormalized.port,
      encryption: nextImapNormalized.encryption,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: withJson({
          ...preferences,
          [MAILBOX_PREF_KEY]: {
            ...mailbox,
            smtp: nextSmtp,
            imap: nextImap,
          },
        }),
      },
    });

    return this.getMailboxSettings(userId);
  }

  async getConfigStatus(userId: string): Promise<MailboxConfigStatusDto> {
    const settings = await this.getMailboxSettings(userId);
    return {
      smtpConfigured: settings.smtp.configured,
      imapConfigured: settings.imap.configured,
      mailboxAddress: settings.mailboxAddress,
    };
  }

  async getRuntimeConfig(userId: string): Promise<MailboxRuntimeConfig | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
        preferences: true,
      },
    });

    return user ? toRuntimeConfig(user) : null;
  }

  async findConfiguredSmtpForTenant(tenantId: string, preferredUserId?: string): Promise<MailboxRuntimeConfig | null> {
    if (preferredUserId) {
      const preferred = await this.getRuntimeConfig(preferredUserId);
      if (preferred?.tenantId === tenantId && hasConfiguredSmtp(preferred)) {
        return preferred;
      }
    }

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
        preferences: true,
      },
    });

    for (const user of users) {
      const runtime = toRuntimeConfig(user);
      if (hasConfiguredSmtp(runtime)) {
        return runtime;
      }
    }

    return null;
  }

  async listUsersWithImapConfigured(): Promise<MailboxRuntimeConfig[]> {
    const users = await prisma.user.findMany({
      where: {
        tenantId: { not: null },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
        preferences: true,
      },
    });

    const configs = await Promise.all(users.map(async (user) => {
      const mailbox = getMailboxConfig(user.preferences);
      const imap = toObject(mailbox.imap);
      const imapUser = decryptSecret(String(imap.username ?? ''));
      const imapPass = decryptSecret(String(imap.password ?? ''));

      if (!user.tenantId || !imap.host || !imapUser || !imapPass) {
        return null;
      }

      const smtp = toObject(mailbox.smtp);
      const normalizedSmtp = normalizeSmtpTransportConfig({
        host: String(smtp.host ?? ''),
        port: Number(smtp.port ?? 587),
        user: decryptSecret(String(smtp.username ?? '')),
        pass: decryptSecret(String(smtp.password ?? '')),
        encryption: String(smtp.encryption ?? 'STARTTLS') as EmailEncryption,
        senderName: String(smtp.senderName ?? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()),
        senderEmail: String(smtp.senderEmail ?? ''),
      });
      const normalizedImap = normalizeImapTransportConfig({
        host: String(imap.host ?? ''),
        port: Number(imap.port ?? 993),
        user: imapUser,
        pass: imapPass,
        encryption: String(imap.encryption ?? 'SSL/TLS') as EmailEncryption,
      });
      return {
        tenantId: user.tenantId,
        userId: user.id,
        mailboxAddress: getMailboxAddress(mailbox),
        smtp: {
          host: normalizedSmtp.host,
          port: normalizedSmtp.port,
          user: normalizedSmtp.user,
          pass: normalizedSmtp.pass,
          encryption: normalizedSmtp.encryption as EmailEncryption,
          senderName: normalizedSmtp.senderName,
          senderEmail: normalizedSmtp.senderEmail,
        },
        imap: {
          host: normalizedImap.host,
          port: normalizedImap.port,
          user: normalizedImap.user,
          pass: normalizedImap.pass,
          encryption: normalizedImap.encryption as EmailEncryption,
        },
      } satisfies MailboxRuntimeConfig;
    }));

    return configs.filter((config): config is MailboxRuntimeConfig => Boolean(config));
  }
}

export const mailboxRepository = new MailboxRepository();
