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

function smtpPortForEncryption(encryption: unknown, currentPort: unknown): number {
  const normalized = String(encryption || '').toUpperCase();
  const port = Number(currentPort || 587);
  if (normalized === 'SSL/TLS') return 465;
  if (normalized === 'STARTTLS' && port === 465) return 587;
  return port;
}

function imapPortForEncryption(encryption: unknown, currentPort: unknown): number {
  const normalized = String(encryption || '').toUpperCase();
  const port = Number(currentPort || 993);
  if (normalized === 'SSL/TLS') return 993;
  if (normalized === 'STARTTLS' && port === 993) return 143;
  return port;
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
    signature?: string;
    signatureLogoUrl?: string;
    signatureImageUrl?: string;
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
  tenant?: {
    name: string;
  } | null;
  preferences: Prisma.JsonValue;
};

function getDefaultSenderName(user: Pick<MailboxUserRecord, 'firstName' | 'lastName' | 'tenant'>): string {
  return user.tenant?.name?.trim()
    || [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

function toRuntimeConfig(user: MailboxUserRecord): MailboxRuntimeConfig | null {
  if (!user.tenantId) {
    return null;
  }

  const mailbox = getMailboxConfig(user.preferences);
  const smtp = toObject(mailbox.smtp);
  const imap = toObject(mailbox.imap);
  const senderName = String(smtp.senderName ?? getDefaultSenderName(user));
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
      signature: String(smtp.signature ?? ''),
      signatureLogoUrl: String(smtp.signatureLogoUrl ?? ''),
      signatureImageUrl: String(smtp.signatureImageUrl ?? ''),
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
        tenant: {
          select: {
            name: true,
          },
        },
        preferences: true,
      },
    });

    const mailbox = getMailboxConfig(user?.preferences);
    const smtp = toObject(mailbox.smtp);
    const imap = toObject(mailbox.imap);
    const defaultSenderName = user ? getDefaultSenderName(user) : '';

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
        signatureLogoUrl: String(smtp.signatureLogoUrl ?? ''),
        signatureImageUrl: String(smtp.signatureImageUrl ?? ''),
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
      ...(data.smtp?.signatureLogoUrl !== undefined ? { signatureLogoUrl: data.smtp.signatureLogoUrl } : {}),
      ...(data.smtp?.signatureImageUrl !== undefined ? { signatureImageUrl: data.smtp.signatureImageUrl } : {}),
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
      host: String(nextSmtpRaw.host ?? ''),
      port: data.smtp?.encryption !== undefined
        ? smtpPortForEncryption(nextSmtpRaw.encryption, nextSmtpRaw.port)
        : Number(nextSmtpRaw.port ?? 587),
      encryption: String(nextSmtpRaw.encryption ?? 'STARTTLS') as EmailEncryption,
    });
    const nextImapNormalized = normalizeImapTransportConfig({
      host: String(nextImapRaw.host ?? ''),
      port: data.imap?.encryption !== undefined
        ? imapPortForEncryption(nextImapRaw.encryption, nextImapRaw.port)
        : Number(nextImapRaw.port ?? 993),
      encryption: String(nextImapRaw.encryption ?? 'SSL/TLS') as EmailEncryption,
    });

    const nextSmtp: JsonMap = {
      ...nextSmtpRaw,
      host: nextSmtpNormalized.host,
      port: nextSmtpNormalized.port,
      encryption: nextSmtpNormalized.encryption,
    };

    const nextImap: JsonMap = {
      ...nextImapRaw,
      host: nextImapNormalized.host,
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
        tenant: {
          select: {
            name: true,
          },
        },
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
        tenant: {
          select: {
            name: true,
          },
        },
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

  async findConfiguredSmtpForTenantByRoleNames(
    tenantId: string,
    roleNames: string[],
    preferredUserId?: string,
  ): Promise<MailboxRuntimeConfig | null> {
    const normalizedRoleNames = roleNames.map((roleName) => roleName.trim().toLowerCase()).filter(Boolean);

    if (preferredUserId) {
      const preferred = await prisma.user.findUnique({
        where: { id: preferredUserId },
        select: {
          id: true,
          tenantId: true,
          firstName: true,
          lastName: true,
          tenant: {
            select: {
              name: true,
            },
          },
          preferences: true,
          employees: {
            where: {
              tenantId,
              isActive: true,
            },
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
            take: 1,
          },
        },
      });

      const preferredRuntime = preferred ? toRuntimeConfig(preferred) : null;
      const preferredRole = preferred?.employees[0]?.role?.name?.trim().toLowerCase() || '';
      if (
        preferredRuntime?.tenantId === tenantId
        && hasConfiguredSmtp(preferredRuntime)
        && normalizedRoleNames.includes(preferredRole)
      ) {
        return preferredRuntime;
      }
    }

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        employees: {
          some: {
            tenantId,
            isActive: true,
          },
        },
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
        tenant: {
          select: {
            name: true,
          },
        },
        preferences: true,
        employees: {
          where: {
            tenantId,
            isActive: true,
          },
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    for (const user of users) {
      const userRoleNames = user.employees
        .map((employee) => employee.role.name.trim().toLowerCase())
        .filter(Boolean);
      if (!userRoleNames.some((roleName) => normalizedRoleNames.includes(roleName))) {
        continue;
      }

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
        tenant: {
          select: {
            name: true,
          },
        },
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
        senderName: String(smtp.senderName ?? getDefaultSenderName(user)),
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
          signature: String(smtp.signature ?? ''),
          signatureLogoUrl: String(smtp.signatureLogoUrl ?? ''),
          signatureImageUrl: String(smtp.signatureImageUrl ?? ''),
        },
        imap: {
          host: normalizedImap.host,
          port: normalizedImap.port,
          user: normalizedImap.user,
          pass: normalizedImap.pass,
          encryption: normalizedImap.encryption as EmailEncryption,
        },
      } as MailboxRuntimeConfig;
    }));

    return configs.filter((config): config is MailboxRuntimeConfig => Boolean(config));
  }
}

export const mailboxRepository = new MailboxRepository();
