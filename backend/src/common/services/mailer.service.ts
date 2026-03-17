import { config } from '../../config';

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
        smtpConfig: { host: string; port: number; user: string; pass: string; senderName?: string; senderEmail?: string },
        opts: { to: string | string[]; subject: string; html: string; text?: string; attachments?: Array<{ filename: string; content: Buffer; contentType?: string }> }
    ): Promise<boolean> {
        if (!nodemailer) {
            console.warn('⚠️ Skipping email — nodemailer not available');
            return false;
        }
        try {
            // Create a one-off transport for this tenant's SMTP config
            const transport = nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port || 587,
                secure: (smtpConfig.port || 587) === 465,
                auth: { user: smtpConfig.user, pass: smtpConfig.pass },
            });

            const fromName = smtpConfig.senderName || 'ZODO CRM';
            const fromEmail = smtpConfig.senderEmail || smtpConfig.user;

            const info = await transport.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
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
            return true;
        } catch (err: any) {
            console.error('❌ Email send failed:', err.message);
            return false;
        }
    }

    get isReady(): boolean {
        return this.ready;
    }

    async sendMail(opts: {
        to: string | string[];
        subject: string;
        html: string;
        text?: string;
        attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
    }): Promise<boolean> {
        if (!this.transporter) {
            console.warn('⚠️ Skipping email — SMTP not configured');
            return false;
        }
        try {
            const info = await this.transporter.sendMail({
                from: `"ZODO CRM" <${config.email.from || config.email.user}>`,
                to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
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
            return true;
        } catch (err: any) {
            console.error('❌ Email send failed:', err.message);
            return false;
        }
    }
}

export const mailerService = new MailerService();
