import { logger } from '../utils/logger';

/**
 * SMS Service — stub implementation.
 *
 * Logs SMS to console. Wire a real provider (Twilio, Vonage, etc.)
 * by replacing the sendSms body.
 */
class SmsService {
    private ready = false;

    constructor() {
        // TODO: Initialize real SMS provider here
        logger.info('📱 SMS service initialized (stub mode — messages will be logged only)');
    }

    /**
     * Send an SMS message.
     * Currently logs the message; replace with real provider integration.
     */
    async sendSms(opts: {
        to: string;
        message: string;
        tenantId?: string;
    }): Promise<boolean> {
        try {
            // Strip non-numeric from phone for validation
            const cleanPhone = opts.to.replace(/[^+\d]/g, '');
            if (!cleanPhone || cleanPhone.length < 7) {
                logger.warn('[SMS] Invalid phone number, skipping', { to: opts.to });
                return false;
            }

            // TODO: Replace with real provider call
            // e.g. await twilio.messages.create({ to: cleanPhone, body: opts.message, from: TWILIO_NUMBER });
            logger.info(`📱 SMS sent (stub): to=${cleanPhone}`, {
                to: cleanPhone,
                messageLength: opts.message.length,
                tenantId: opts.tenantId,
                preview: opts.message.substring(0, 80),
            });

            return true;
        } catch (err: any) {
            logger.error('[SMS] Send failed:', { to: opts.to, error: err.message });
            return false;
        }
    }
}

export const smsService = new SmsService();
