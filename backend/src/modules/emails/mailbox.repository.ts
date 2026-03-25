import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { decryptSecret, encryptSecret, isMaskedSecret } from '../../common/utils/secret-crypto';
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

    return {
      smtp: {
        host: String(smtp.host ?? ''),
        port: Number(smtp.port ?? 587),
        username: smtpUser,
        passwordMasked: toMaskedSecret(smtpPass),
        encryption: String(smtp.encryption ?? 'STARTTLS') as EmailEncryption,
        senderName: String(smtp.senderName ?? defaultSenderName),
        senderEmail: String(smtp.senderEmail ?? ''),
        configured: Boolean(smtp.host && smtpUser && smtpPass),
      },
      imap: {
        host: String(imap.host ?? ''),
        port: Number(imap.port ?? 993),
        username: imapUser,
        passwordMasked: toMaskedSecret(imapPass),
        encryption: String(imap.encryption ?? 'SSL/TLS') as EmailEncryption,
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

    const nextSmtp: JsonMap = {
      ...existingSmtp,
      ...(data.smtp?.host !== undefined ? { host: data.smtp.host } : {}),
      ...(data.smtp?.port !== undefined ? { port: data.smtp.port } : {}),
      ...(data.smtp?.encryption !== undefined ? { encryption: data.smtp.encryption } : {}),
      ...(data.smtp?.senderName !== undefined ? { senderName: data.smtp.senderName } : {}),
      ...(data.smtp?.senderEmail !== undefined ? { senderEmail: data.smtp.senderEmail } : {}),
      ...(data.smtp ? { username: mergeSecret(existingSmtp.username, data.smtp.username) } : {}),
      ...(data.smtp ? { password: mergeSecret(existingSmtp.password, data.smtp.password) } : {}),
    };

    const nextImap: JsonMap = {
      ...existingImap,
      ...(data.imap?.host !== undefined ? { host: data.imap.host } : {}),
      ...(data.imap?.port !== undefined ? { port: data.imap.port } : {}),
      ...(data.imap?.encryption !== undefined ? { encryption: data.imap.encryption } : {}),
      ...(data.imap ? { username: mergeSecret(existingImap.username, data.imap.username) } : {}),
      ...(data.imap ? { password: mergeSecret(existingImap.password, data.imap.password) } : {}),
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

    if (!user?.tenantId) {
      return null;
    }

    const mailbox = getMailboxConfig(user.preferences);
    const smtp = toObject(mailbox.smtp);
    const imap = toObject(mailbox.imap);
    const senderName = String(smtp.senderName ?? [user.firstName, user.lastName].filter(Boolean).join(' ').trim());
    const runtime: MailboxRuntimeConfig = {
      tenantId: user.tenantId,
      userId: user.id,
      mailboxAddress: getMailboxAddress(mailbox),
      smtp: {
        host: String(smtp.host ?? ''),
        port: Number(smtp.port ?? 587),
        user: decryptSecret(String(smtp.username ?? '')),
        pass: decryptSecret(String(smtp.password ?? '')),
        encryption: String(smtp.encryption ?? 'STARTTLS') as EmailEncryption,
        senderName,
        senderEmail: String(smtp.senderEmail ?? ''),
      },
      imap: {
        host: String(imap.host ?? ''),
        port: Number(imap.port ?? 993),
        user: decryptSecret(String(imap.username ?? '')),
        pass: decryptSecret(String(imap.password ?? '')),
        encryption: String(imap.encryption ?? 'SSL/TLS') as EmailEncryption,
      },
    };

    return runtime;
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
      return {
        tenantId: user.tenantId,
        userId: user.id,
        mailboxAddress: getMailboxAddress(mailbox),
        smtp: {
          host: String(smtp.host ?? ''),
          port: Number(smtp.port ?? 587),
          user: decryptSecret(String(smtp.username ?? '')),
          pass: decryptSecret(String(smtp.password ?? '')),
          encryption: String(smtp.encryption ?? 'STARTTLS') as EmailEncryption,
          senderName: String(smtp.senderName ?? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()),
          senderEmail: String(smtp.senderEmail ?? ''),
        },
        imap: {
          host: String(imap.host ?? ''),
          port: Number(imap.port ?? 993),
          user: imapUser,
          pass: imapPass,
          encryption: String(imap.encryption ?? 'SSL/TLS') as EmailEncryption,
        },
      } satisfies MailboxRuntimeConfig;
    }));

    return configs.filter((config): config is MailboxRuntimeConfig => Boolean(config));
  }
}

export const mailboxRepository = new MailboxRepository();
