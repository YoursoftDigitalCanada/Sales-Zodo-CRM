import { BadRequestError, ForbiddenError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { logger } from '../../common/utils/logger';
import { config } from '../../config';

export type SignupOtpChannel = 'email' | 'phone';

interface SignupOtpRecord {
  email: string;
  phone?: string;
  channel: SignupOtpChannel;
  otp: string;
  expiresAt: number;
  createdAt: number;
  verifiedAt?: number;
  sendCount: number;
  attempts: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_TTL = 3;
const STATIC_PHONE_OTP = '123456';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone?: string): string | undefined {
  const value = String(phone || '').trim();
  return value || undefined;
}

function buildRecordKey(
  email: string,
  channel: SignupOtpChannel,
  phone?: string
): string {
  return `${normalizeEmail(email)}:${channel}:${normalizePhone(phone) || '-'}`;
}

function maskEmail(email: string): string {
  const [localPart, domain = ''] = email.split('@');
  if (!localPart) return email;
  const visible = localPart.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
}

function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return trimmed;
  return `${trimmed.slice(0, 3)}${'*'.repeat(Math.max(trimmed.length - 7, 3))}${trimmed.slice(-4)}`;
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

class SignupOtpService {
  private readonly records = new Map<string, SignupOtpRecord>();

  sendOtp(params: {
    email: string;
    phone?: string;
    channel: SignupOtpChannel;
  }): {
    channel: SignupOtpChannel;
    expiresIn: number;
    destination: string;
    debugCode?: string;
  } {
    this.cleanupExpiredRecords();

    const email = normalizeEmail(params.email);
    const phone = normalizePhone(params.phone);

    if (params.channel === 'phone' && !phone) {
      throw new BadRequestError('Phone number is required for phone verification');
    }

    const key = buildRecordKey(email, params.channel, phone);
    const now = Date.now();
    const existing = this.records.get(key);

    if (
      existing &&
      existing.expiresAt > now &&
      existing.sendCount >= MAX_SENDS_PER_TTL
    ) {
      throw new ForbiddenError(
        'Too many OTP requests. Please wait a few minutes before trying again.',
        ErrorCodes.AUTH_OTP_RATE_LIMITED
      );
    }

    const otp = params.channel === 'phone' ? STATIC_PHONE_OTP : generateOtp();
    const record: SignupOtpRecord = {
      email,
      phone,
      channel: params.channel,
      otp,
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      sendCount: (existing?.expiresAt || 0) > now ? existing!.sendCount + 1 : 1,
    };

    this.records.set(key, record);

    if (params.channel === 'email') {
      logger.info('[Signup OTP] Simulated email OTP generated', {
        email,
        otp,
        expiresInSeconds: Math.ceil(OTP_TTL_MS / 1000),
      });
    } else {
      logger.info('[Signup OTP] Static phone OTP requested', {
        email,
        phone,
        otp: STATIC_PHONE_OTP,
      });
    }

    return {
      channel: params.channel,
      expiresIn: Math.ceil(OTP_TTL_MS / 1000),
      destination: params.channel === 'email' ? maskEmail(email) : maskPhone(phone!),
      ...(config.app.isDevelopment ? { debugCode: otp } : {}),
    };
  }

  verifyOtp(params: {
    email: string;
    phone?: string;
    channel: SignupOtpChannel;
    otp: string;
  }): { verified: true; expiresIn: number } {
    this.cleanupExpiredRecords();

    const email = normalizeEmail(params.email);
    const phone = normalizePhone(params.phone);
    const key = buildRecordKey(email, params.channel, phone);
    const record = this.records.get(key);

    if (!record) {
      throw new BadRequestError(
        'OTP not found or expired. Please request a new code.',
        ErrorCodes.AUTH_OTP_EXPIRED
      );
    }

    if (record.expiresAt <= Date.now()) {
      this.records.delete(key);
      throw new BadRequestError(
        'OTP has expired. Please request a new code.',
        ErrorCodes.AUTH_OTP_EXPIRED
      );
    }

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      this.records.delete(key);
      throw new ForbiddenError(
        'Too many invalid OTP attempts. Please request a new code.',
        ErrorCodes.AUTH_OTP_RATE_LIMITED
      );
    }

    if (record.otp !== params.otp.trim()) {
      record.attempts += 1;
      this.records.set(key, record);
      throw new BadRequestError('Invalid OTP. Please try again.', ErrorCodes.AUTH_OTP_INVALID);
    }

    record.verifiedAt = Date.now();
    record.attempts = 0;
    this.records.set(key, record);

    return {
      verified: true,
      expiresIn: Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000)),
    };
  }

  assertVerified(email: string, phone?: string): void {
    this.cleanupExpiredRecords();

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const now = Date.now();

    const verifiedRecord = Array.from(this.records.values()).find((record) => {
      if (!record.verifiedAt || record.expiresAt <= now) {
        return false;
      }

      if (record.email !== normalizedEmail) {
        return false;
      }

      if (record.channel === 'phone') {
        return record.phone === normalizedPhone;
      }

      return true;
    });

    if (!verifiedRecord) {
      throw new ForbiddenError(
        'OTP verification is required before creating your account.',
        ErrorCodes.AUTH_OTP_REQUIRED
      );
    }
  }

  consumeVerification(email: string, phone?: string): void {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    for (const [key, record] of this.records.entries()) {
      if (record.email !== normalizedEmail) {
        continue;
      }

      if (record.channel === 'phone' && record.phone !== normalizedPhone) {
        continue;
      }

      this.records.delete(key);
    }
  }

  private cleanupExpiredRecords(): void {
    const now = Date.now();

    for (const [key, record] of this.records.entries()) {
      if (record.expiresAt <= now) {
        this.records.delete(key);
      }
    }
  }
}

export const signupOtpService = new SignupOtpService();
