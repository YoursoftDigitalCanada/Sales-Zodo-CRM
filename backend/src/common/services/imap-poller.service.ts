import { imapService } from './imap.service';
import { mailboxRepository } from '../../modules/emails/mailbox.repository';

class ImapPollerService {
    private interval: ReturnType<typeof setInterval> | null = null;
    private polling = false;

    /**
     * Start the background IMAP poller. Runs every `intervalMs` milliseconds.
     */
    start(intervalMs: number = 2 * 60 * 1000) {
        if (this.interval) return;
        console.log(`📬 IMAP poller started — checking every ${intervalMs / 1000}s`);
        // Run once immediately, then on interval
        this._pollAll();
        this.interval = setInterval(() => this._pollAll(), intervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('📬 IMAP poller stopped');
        }
    }

    /**
     * Poll all user mailboxes that have IMAP configured.
     */
    private async _pollAll() {
        if (this.polling) return; // Prevent concurrent polls
        this.polling = true;

        try {
            const mailboxes = await mailboxRepository.listUsersWithImapConfigured();

            for (const mailbox of mailboxes) {
                try {
                    await imapService.fetchNewEmails(mailbox.tenantId, mailbox.userId, {
                        host: mailbox.imap.host,
                        port: mailbox.imap.port || 993,
                        user: mailbox.imap.user,
                        pass: mailbox.imap.pass,
                        encryption: mailbox.imap.encryption,
                    });
                } catch (err: any) {
                    console.error(`⚠️ IMAP poll failed for user ${mailbox.userId}:`, err.message);
                }
            }
        } catch (err: any) {
            console.error('❌ IMAP poll cycle error:', err.message);
        } finally {
            this.polling = false;
        }
    }

    /**
     * Trigger an immediate fetch for the current user's mailbox.
     */
    async fetchForUser(userId: string) {
        const mailbox = await mailboxRepository.getRuntimeConfig(userId);

        if (!mailbox?.imap.host || !mailbox.imap.user || !mailbox.imap.pass) {
            return { fetched: 0, error: 'IMAP not configured' };
        }

        try {
            const fetched = await imapService.fetchNewEmails(mailbox.tenantId, mailbox.userId, {
                host: mailbox.imap.host,
                port: mailbox.imap.port || 993,
                user: mailbox.imap.user,
                pass: mailbox.imap.pass,
                encryption: mailbox.imap.encryption,
            });
            return { fetched, error: null };
        } catch (err: any) {
            return { fetched: 0, error: err.message };
        }
    }
}

export const imapPoller = new ImapPollerService();
