import twilio, { Twilio } from 'twilio';
import { logger } from '../utils/logger';
import { config } from '../../config';

function sanitizePhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';

  const hasPlusPrefix = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly;
}

class TwilioVerifyService {
  private client: Twilio | null = null;

  isConfigured(): boolean {
    return Boolean(
      config.twilio.accountSid &&
      config.twilio.authToken &&
      config.twilio.verifyServiceSid
    );
  }

  private getClient(): Twilio {
    if (!this.isConfigured()) {
      throw new Error('Twilio Verify is not configured');
    }

    if (!this.client) {
      this.client = twilio(
        config.twilio.accountSid as string,
        config.twilio.authToken as string
      );
    }

    return this.client;
  }

  async sendVerification(to: string): Promise<{ sid: string; status: string }> {
    const sanitizedPhone = sanitizePhoneNumber(to);
    const verification = await this.getClient().verify.v2
      .services(config.twilio.verifyServiceSid as string)
      .verifications.create({
        to: sanitizedPhone,
        channel: config.twilio.verifyChannel,
      });

    logger.info('[Twilio Verify] Verification started', {
      to: sanitizedPhone,
      sid: verification.sid,
      status: verification.status,
      channel: config.twilio.verifyChannel,
    });

    return {
      sid: verification.sid,
      status: verification.status,
    };
  }

  async checkVerification(to: string, code: string): Promise<{ approved: boolean; status: string }> {
    const sanitizedPhone = sanitizePhoneNumber(to);
    const verificationCheck = await this.getClient().verify.v2
      .services(config.twilio.verifyServiceSid as string)
      .verificationChecks.create({
        to: sanitizedPhone,
        code: code.trim(),
      });

    logger.info('[Twilio Verify] Verification checked', {
      to: sanitizedPhone,
      status: verificationCheck.status,
      sid: verificationCheck.sid,
    });

    return {
      approved: verificationCheck.status === 'approved',
      status: verificationCheck.status,
    };
  }

  normalizePhone(phone: string): string {
    return sanitizePhoneNumber(phone);
  }
}

export const twilioVerifyService = new TwilioVerifyService();
