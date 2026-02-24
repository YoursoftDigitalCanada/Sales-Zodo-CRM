import nodemailer from 'nodemailer';
import { config } from '../../config';

class MailerService {
    private transporter: nodemailer.Transporter | null = null;
    private ready = false;

    constructor() {
        const { host, port, user, pass } = config.email;
        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port: port || 465,
                secure: (port || 465) === 465,
                auth: { user, pass },
            });
            this.transporter.verify()
                .then(() => {
                    this.ready = true;
                    console.log('✅ Mailer ready —', user);
                })
                .catch((err) => {
                    console.warn('⚠️ Mailer not available:', err.message);
                });
        } else {
            console.warn('⚠️ SMTP not configured — emails will be skipped');
        }
    }

    async sendMail(opts: {
        to: string | string[];
        subject: string;
        html: string;
        text?: string;
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
