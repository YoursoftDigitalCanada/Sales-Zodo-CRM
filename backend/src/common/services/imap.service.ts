import { ImapFlow } from 'imapflow';
const { simpleParser } = require('mailparser');
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const INITIAL_SYNC_MAX_MESSAGES = 250;
const INCREMENTAL_UNSEEN_LOOKBACK_DAYS = 7;
const INCREMENTAL_SEEN_LOOKBACK_DAYS = 3;

export interface ImapConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    tls?: boolean;
}

class ImapService {
    /**
     * Fetch new (unseen) emails from IMAP server and store them in DB.
     * Uses messageId for deduplication.
     */
    async fetchNewEmails(tenantId: string, config: ImapConfig): Promise<number> {
        if (!config.host || !config.user || !config.pass) {
            return 0;
        }

        const client = new ImapFlow({
            host: config.host,
            port: config.port || 993,
            secure: config.tls !== false, // default true for port 993
            auth: { user: config.user, pass: config.pass },
            logger: false as any,
        });

        let fetched = 0;

        try {
            const existingEmailCount = await prisma.email.count({
                where: { tenantId, deletedAt: null },
            });

            await client.connect();
            const lock = await client.getMailboxLock('INBOX');

            try {
                // On the first sync, backfill the latest mailbox history instead of only
                // looking at the last few days. This prevents an apparently empty inbox
                // when the user connects an existing mailbox that already has older mail.
                if (existingEmailCount === 0) {
                    fetched += await this._backfillInitialHistory(client, tenantId, config.user);
                } else {
                    fetched += await this._fetchIncrementalHistory(client, tenantId, config.user);
                }
            } finally {
                lock.release();
            }

            await client.logout();
        } catch (err: any) {
            console.error(`❌ IMAP fetch failed for tenant ${tenantId}:`, err.message);
            try { await client.logout(); } catch {}
        }

        if (fetched > 0) {
            console.log(`📬 Fetched ${fetched} new emails for tenant ${tenantId}`);
        }

        return fetched;
    }

    private async _backfillInitialHistory(client: ImapFlow, tenantId: string, imapUser: string): Promise<number> {
        const uidList = await client.search({ all: true }, { uid: true });

        if (!uidList || uidList.length === 0) {
            return 0;
        }

        const latestUids = [...uidList].sort((a, b) => a - b).slice(-INITIAL_SYNC_MAX_MESSAGES);
        let fetched = 0;

        for await (const msg of client.fetch(latestUids, { source: true, envelope: true, uid: true }, { uid: true })) {
            try {
                const parsed = await simpleParser(msg.source);
                fetched += await this._storeEmail(tenantId, parsed, imapUser);
            } catch (parseErr: any) {
                console.error(`⚠️ Failed to parse initial-sync email UID ${msg.uid}:`, parseErr.message);
            }
        }

        return fetched;
    }

    private async _fetchIncrementalHistory(client: ImapFlow, tenantId: string, imapUser: string): Promise<number> {
        let fetched = 0;

        const unseenSince = new Date();
        unseenSince.setDate(unseenSince.getDate() - INCREMENTAL_UNSEEN_LOOKBACK_DAYS);

        const unseenMessages = client.fetch(
            { since: unseenSince, seen: false },
            { source: true, envelope: true, uid: true }
        );

        for await (const msg of unseenMessages) {
            try {
                const parsed = await simpleParser(msg.source);
                fetched += await this._storeEmail(tenantId, parsed, imapUser);
            } catch (parseErr: any) {
                console.error(`⚠️ Failed to parse email UID ${msg.uid}:`, parseErr.message);
            }
        }

        const seenSince = new Date();
        seenSince.setDate(seenSince.getDate() - INCREMENTAL_SEEN_LOOKBACK_DAYS);

        const seenMessages = client.fetch(
            { since: seenSince, seen: true },
            { source: true, envelope: true, uid: true }
        );

        for await (const msg of seenMessages) {
            try {
                const parsed = await simpleParser(msg.source);
                fetched += await this._storeEmail(tenantId, parsed, imapUser);
            } catch (parseErr: any) {
                console.error(`⚠️ Failed to parse seen email UID ${msg.uid}:`, parseErr.message);
            }
        }

        return fetched;
    }

    /**
     * Store a parsed email in the database, deduplicating by messageId.
     * Returns 1 if stored, 0 if skipped (duplicate).
     */
    private async _storeEmail(tenantId: string, parsed: any, imapUser: string): Promise<number> {
        const messageId = parsed.messageId || null;

        // Deduplicate by messageId
        if (messageId) {
            const existing = await prisma.email.findUnique({
                where: { messageId },
            });
            if (existing) return 0; // Already stored
        }

        // Extract addresses
        const fromAddr = parsed.from?.value?.[0];
        const toAddresses = (parsed.to
            ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).flatMap((addr: any) => addr.value || [])
            : []
        ).map((a: any) => ({ email: a.address || '', name: a.name || '' }));

        const ccAddresses = (parsed.cc
            ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]).flatMap((addr: any) => addr.value || [])
            : []
        ).map((a: any) => ({ email: a.address || '', name: a.name || '' }));

        // Determine if this is a sent email (from the IMAP user) or received
        const isSent = fromAddr?.address?.toLowerCase() === imapUser.toLowerCase();

        await prisma.email.create({
            data: {
                tenantId,
                messageId: messageId || undefined,
                threadId: parsed.inReplyTo || undefined,
                fromAddress: fromAddr?.address || '',
                fromName: fromAddr?.name || null,
                toAddresses: toAddresses as any,
                ccAddresses: ccAddresses.length > 0 ? ccAddresses as any : undefined,
                replyTo: parsed.replyTo?.value?.[0]?.address || undefined,
                subject: parsed.subject || '(No Subject)',
                bodyText: parsed.text || null,
                bodyHtml: parsed.html || null,
                folder: isSent ? 'SENT' : 'INBOX',
                status: isSent ? 'SENT' : 'RECEIVED',
                isRead: isSent, // Sent emails are read by default
                hasAttachments: (parsed.attachments?.length || 0) > 0,
                size: BigInt(parsed.html?.length || parsed.text?.length || 0),
                receivedAt: parsed.date || new Date(),
                sentAt: isSent ? (parsed.date || new Date()) : null,
            },
        });

        return 1;
    }
}

export const imapService = new ImapService();
