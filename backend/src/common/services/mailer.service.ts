import { config } from '../../config';
import { getSmtpTransportGuidance, normalizeSmtpTransportConfig } from '../utils/email-transport';

// Dynamic import to prevent crash if nodemailer is not installed
let nodemailer: any;
try {
    nodemailer = require('nodemailer');
} catch {
    console.warn('⚠️ nodemailer not installed — emails will be skipped');
}

class MailerService {
    private transporter: any = null;
    private ready = false;

    constructor() {
        if (!nodemailer) return;
        const { host, port, user, pass } = config.email;
        if (host && user && pass) {
            this._createTransport(host, port || 465, user, pass);
        } else {
            console.warn('⚠️ SMTP not configured via env — will use tenant settings when available');
        }
    }

    private _createTransport(host: string, port: number, user: string, pass: string) {
        if (!nodemailer) return;
        this.ready = false;
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
        this.transporter.verify()
            .then(() => {
                this.ready = true;
                console.log('✅ Mailer ready —', user);
            })
            .catch((err: any) => {
                this.ready = false;
                console.warn('⚠️ Mailer not available:', err.message);
            });
    }

    private formatErrorMessage(error: any): string {
        const smtpResponse = typeof error?.response === 'string' ? error.response : '';
        const errorCode = typeof error?.code === 'string' ? `${error.code}: ` : '';
        return smtpResponse || `${errorCode}${error?.message || 'Unknown mailer error'}`;
    }

    private getGlobalSmtpConfig(overrides?: { senderName?: string; senderEmail?: string }) {
        return {
            host: config.email.host || '',
            port: config.email.port || 587,
            user: config.email.user || '',
            pass: config.email.pass || '',
            senderName: overrides?.senderName || 'ZODO CRM',
            senderEmail: overrides?.senderEmail || config.email.from || config.email.user || 'no-reply@zodo.ca',
        };
    }

    /**
     * Reconfigure SMTP transport at runtime (called when tenant updates SMTP settings).
     */
    reconfigure(smtpConfig: { host: string; port: number; user: string; pass: string }): void {
        if (!nodemailer) return;
        if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
            this._createTransport(smtpConfig.host, smtpConfig.port || 587, smtpConfig.user, smtpConfig.pass);
            console.log('🔄 Mailer reconfigured —', smtpConfig.user);
        }
    }

    /**
     * Send email using a specific SMTP config (per-tenant), falling back to default transporter.
     */
    async sendMailWithConfig(
        smtpConfig: { host: string; port: number; user: string; pass: string; encryption?: string; senderName?: string; senderEmail?: string },
        opts: {
            to: string | string[];
            cc?: string | string[];
            bcc?: string | string[];
            subject: string;
            html: string;
            text?: string;
            attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
        }
    ): Promise<boolean> {
        const result = await this.sendMailWithConfigDetailed(smtpConfig, opts);
        return result.sent;
    }

    async sendMailWithConfigDetailed(
        smtpConfig: { host: string; port: number; user: string; pass: string; encryption?: string; senderName?: string; senderEmail?: string },
        opts: {
            to: string | string[];
            cc?: string | string[];
            bcc?: string | string[];
            subject: string;
            html: string;
            text?: string;
            attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
        }
    ): Promise<{ sent: boolean; error?: string; messageId?: string }> {
        if (!nodemailer) {
            console.warn('⚠️ Skipping email — nodemailer not available');
            return { sent: false, error: 'nodemailer is not installed' };
        }

        // Diagnostic logging (never log actual credentials)
        if (!smtpConfig.host) console.warn('⚠️ SMTP send attempt with empty host');
        if (!smtpConfig.user) console.warn('⚠️ SMTP send attempt with empty username — possible decryption failure');
        if (!smtpConfig.pass) console.warn('⚠️ SMTP send attempt with empty password — possible decryption failure');

        try {
            const normalizedConfig = normalizeSmtpTransportConfig(smtpConfig);
            const encryption = normalizedConfig.encryption;
            const transport = nodemailer.createTransport({
                host: normalizedConfig.host,
                port: normalizedConfig.port || 587,
                secure: encryption === 'SSL/TLS',
                requireTLS: encryption === 'STARTTLS',
                ignoreTLS: encryption === 'NONE',
                auth: { user: normalizedConfig.user, pass: normalizedConfig.pass },
                connectionTimeout: 30000,
                greetingTimeout: 30000,
                dnsTimeout: 30000,
                tls: {
                    servername: normalizedConfig.host,
                },
            });

            const fromName = normalizedConfig.senderName || 'ZODO CRM';
            const fromEmail = normalizedConfig.senderEmail || normalizedConfig.user;

            const info = await transport.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
                cc: Array.isArray(opts.cc) ? opts.cc.join(', ') : opts.cc,
                bcc: Array.isArray(opts.bcc) ? opts.bcc.join(', ') : opts.bcc,
                subject: opts.subject,
                html: opts.html,
                text: opts.text,
                attachments: opts.attachments?.map((a) => ({
                    filename: a.filename,
                    content: a.content,
                    contentType: a.contentType || 'application/pdf',
                })),
            });
            console.log('📧 Email sent:', info.messageId, '→', opts.to);
            return {
                sent: true,
                messageId: typeof info?.messageId === 'string' ? info.messageId : undefined,
            };
        } catch (err: any) {
            const errorMessage = this.formatErrorMessage(err);
            const guidance = getSmtpTransportGuidance(normalizeSmtpTransportConfig(smtpConfig).port || 587);
            console.error('❌ Email send failed:', errorMessage);
            if (/greeting never received|etimedout/i.test(errorMessage)) {
                return { sent: false, error: `${errorMessage}. ${guidance}` };
            }
            return { sent: false, error: errorMessage };
        }
    }

    /**
     * Test SMTP connection by verifying transport without sending an email.
     * Returns { ok: true } on success, or { ok: false, error: '...' } on failure.
     */
    async testSmtpConnection(
        smtpConfig: { host: string; port: number; user: string; pass: string; encryption?: string }
    ): Promise<{ ok: boolean; error?: string }> {
        if (!nodemailer) {
            return { ok: false, error: 'nodemailer is not installed' };
        }
        if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
            const missing = [
                !smtpConfig.host && 'host',
                !smtpConfig.user && 'username',
                !smtpConfig.pass && 'password',
            ].filter(Boolean).join(', ');
            return { ok: false, error: `Missing SMTP credentials: ${missing}. If you just entered a password, please re-enter it and save again.` };
        }
        try {
            const normalizedConfig = normalizeSmtpTransportConfig(smtpConfig);
            const encryption = normalizedConfig.encryption;
            const transport = nodemailer.createTransport({
                host: normalizedConfig.host,
                port: normalizedConfig.port || 587,
                secure: encryption === 'SSL/TLS',
                requireTLS: encryption === 'STARTTLS',
                ignoreTLS: encryption === 'NONE',
                auth: { user: normalizedConfig.user, pass: normalizedConfig.pass },
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                dnsTimeout: 10000,
                tls: { servername: normalizedConfig.host },
            });
            await transport.verify();
            console.log('✅ SMTP connection test passed —', smtpConfig.user);
            return { ok: true };
        } catch (err: any) {
            const errorMessage = this.formatErrorMessage(err);
            const guidance = getSmtpTransportGuidance(normalizeSmtpTransportConfig(smtpConfig).port || 587);
            console.warn('❌ SMTP connection test failed:', errorMessage);
            if (/greeting never received|etimedout/i.test(errorMessage)) {
                return { ok: false, error: `${errorMessage}. ${guidance}` };
            }
            if (/authentication|535|invalid login|username|password/i.test(errorMessage)) {
                return { ok: false, error: `${errorMessage}. Tip: If you use Gmail with 2FA, you need an App Password instead of your regular password.` };
            }
            return { ok: false, error: errorMessage };
        }
    }

    get isReady(): boolean {
        return this.ready;
    }

    async sendMail(opts: {
        to: string | string[];
        cc?: string | string[];
        bcc?: string | string[];
        subject: string;
        html: string;
        text?: string;
        attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
        fromName?: string;
        fromEmail?: string;
    }): Promise<boolean> {
        const result = await this.sendGlobalMailDetailed(opts);
        return result.sent;
    }

    async sendGlobalMailDetailed(opts: {
        to: string | string[];
        cc?: string | string[];
        bcc?: string | string[];
        subject: string;
        html: string;
        text?: string;
        attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
        fromName?: string;
        fromEmail?: string;
    }): Promise<{ sent: boolean; error?: string }> {
        const smtpConfig = this.getGlobalSmtpConfig({
            senderName: opts.fromName,
            senderEmail: opts.fromEmail,
        });

        if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
            console.warn('⚠️ Global SMTP not configured for mail delivery');
            return {
                sent: false,
                error: 'The global signup email service is not configured on the server.',
            };
        }

        return this.sendMailWithConfigDetailed(smtpConfig, {
            to: opts.to,
            cc: opts.cc,
            bcc: opts.bcc,
            subject: opts.subject,
            html: opts.html,
            text: opts.text,
            attachments: opts.attachments,
        });
    }
}

export const mailerService = new MailerService();
