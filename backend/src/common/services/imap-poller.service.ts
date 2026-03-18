import { PrismaClient } from '@prisma/client';
import { imapService } from './imap.service';

const prisma = new PrismaClient();

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
     * Poll all tenants that have IMAP configured.
     */
    private async _pollAll() {
        if (this.polling) return; // Prevent concurrent polls
        this.polling = true;

        try {
            // Find all tenant settings with IMAP configured
            const allSettings = await prisma.tenantSettings.findMany({
                select: { tenantId: true, integrations: true },
            });

            for (const settings of allSettings) {
                const integrations = (settings.integrations as Record<string, any>) || {};
                const imapHost = integrations.imapHost;
                const imapUser = integrations.imapUser;
                const imapPass = integrations.imapPass;

                if (imapHost && imapUser && imapPass) {
                    try {
                        await imapService.fetchNewEmails(settings.tenantId, {
                            host: imapHost,
                            port: integrations.imapPort || 993,
                            user: imapUser,
                            pass: imapPass,
                        });
                    } catch (err: any) {
                        console.error(`⚠️ IMAP poll failed for tenant ${settings.tenantId}:`, err.message);
                    }
                }
            }
        } catch (err: any) {
            console.error('❌ IMAP poll cycle error:', err.message);
        } finally {
            this.polling = false;
        }
    }

    /**
     * Trigger an immediate fetch for a specific tenant.
     */
    async fetchForTenant(tenantId: string) {
        const settings = await prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: { integrations: true },
        });

        if (!settings) return { fetched: 0, error: 'No settings found' };

        const integrations = (settings.integrations as Record<string, any>) || {};
        const imapHost = integrations.imapHost;
        const imapUser = integrations.imapUser;
        const imapPass = integrations.imapPass;

        if (!imapHost || !imapUser || !imapPass) {
            return { fetched: 0, error: 'IMAP not configured' };
        }

        try {
            const fetched = await imapService.fetchNewEmails(tenantId, {
                host: imapHost,
                port: integrations.imapPort || 993,
                user: imapUser,
                pass: imapPass,
            });
            return { fetched, error: null };
        } catch (err: any) {
            return { fetched: 0, error: err.message };
        }
    }
}

export const imapPoller = new ImapPollerService();
