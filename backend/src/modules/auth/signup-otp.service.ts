import {
  BadRequestError,
  ForbiddenError,
  ServiceUnavailableError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { logger } from '../../common/utils/logger';
import { config } from '../../config';

export type SignupOtpChannel = 'email';

interface SignupOtpRecord {
  email: string;
  channel: SignupOtpChannel;
  otp: string;
  expiresAt: number;
  createdAt: number;
  verifiedAt?: number;
  sendCount: number;
  attempts: number;
}

const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_TTL = 3;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildRecordKey(email: string): string {
  return normalizeEmail(email);
}

function maskEmail(email: string): string {
  const [localPart, domain = ''] = email.split('@');
  if (!localPart) return email;
  const visible = localPart.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

class SignupOtpService {
  private readonly records = new Map<string, SignupOtpRecord>();

  async sendOtp(params: {
    email: string;
    channel?: SignupOtpChannel;
  }): Promise<{
    channel: SignupOtpChannel;
    expiresIn: number;
    destination: string;
    debugCode?: string;
  }> {
    this.cleanupExpiredRecords();

    const email = normalizeEmail(params.email);
    const channel: SignupOtpChannel = 'email';
    const ttlMs = EMAIL_OTP_TTL_MS;
    const key = buildRecordKey(email);
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

    const otp = generateOtp();
    const record: SignupOtpRecord = {
      email,
      channel,
      otp,
      createdAt: now,
      expiresAt: now + ttlMs,
      attempts: 0,
      sendCount: (existing?.expiresAt || 0) > now ? existing!.sendCount + 1 : 1,
    };

    this.records.set(key, record);
    const delivery = await tenantMailerService.sendSignupEmail({
      to: email,
      subject: 'Your Zodo CRM verification code',
      html: this.buildEmailTemplate(otp),
      text: `Your Zodo CRM verification code is ${otp}. It expires in 5 minutes.`,
    });

    if (!delivery.sent) {
      this.records.delete(key);
      logger.error('[Signup OTP] Failed to send email OTP', {
        email,
        senderEmail: delivery.senderEmail,
        senderName: delivery.senderName,
        smtpHost: config.email.host,
        smtpUser: config.email.user,
        error: delivery.error,
      });
      throw new ServiceUnavailableError(
        delivery.error
          ? `OTP email could not be sent from ${delivery.senderEmail} right now. ${delivery.error}`
          : `OTP email could not be sent from ${delivery.senderEmail} right now. Please try again in a moment.`
      );
    }

    logger.info('[Signup OTP] Email OTP delivered', {
      email,
      senderEmail: delivery.senderEmail,
      expiresInSeconds: Math.ceil(EMAIL_OTP_TTL_MS / 1000),
    });

    return {
      channel,
      expiresIn: Math.ceil(ttlMs / 1000),
      destination: maskEmail(email),
      ...(config.app.isDevelopment ? { debugCode: otp } : {}),
    };
  }

  async verifyOtp(params: {
    email: string;
    channel?: SignupOtpChannel;
    otp: string;
  }): Promise<{ verified: true; expiresIn: number }> {
    this.cleanupExpiredRecords();

    const email = normalizeEmail(params.email);
    const key = buildRecordKey(email);
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

    const providedOtp = params.otp.trim();

    if (record.otp !== providedOtp) {
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

  assertVerified(email: string): void {
    this.cleanupExpiredRecords();

    const normalizedEmail = normalizeEmail(email);
    const now = Date.now();

    const verifiedRecord = Array.from(this.records.values()).find((record) => {
      if (!record.verifiedAt || record.expiresAt <= now) {
        return false;
      }

      if (record.email !== normalizedEmail) {
        return false;
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

  consumeVerification(email: string): void {
    const normalizedEmail = normalizeEmail(email);

    for (const [key, record] of this.records.entries()) {
      if (record.email !== normalizedEmail) {
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

  private buildEmailTemplate(otp: string): string {
    return `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 32px;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b;">
            Zodo CRM Signup
          </p>
          <h1 style="margin: 16px 0 12px; font-size: 28px; color: #0f172a;">
            Verify your email
          </h1>
          <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #475569;">
            Use the verification code below to continue creating your workspace. This code expires in 5 minutes.
          </p>
          <div style="margin: 0 0 24px; padding: 18px 20px; border-radius: 16px; background: #0f172a; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 0.35em; text-align: center;">
            ${otp}
          </div>
          <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #64748b;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;
  }
}

export const signupOtpService = new SignupOtpService();
