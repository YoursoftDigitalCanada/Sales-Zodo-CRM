import { ImapFlow } from 'imapflow';
const { simpleParser } = require('mailparser');
import { EmailFolder, PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../../config';
import { notificationsService } from '../../modules/notifications/notifications.service';

const prisma = new PrismaClient();
const INITIAL_SYNC_MAX_MESSAGES = Number(process.env.IMAP_INITIAL_SYNC_MAX_MESSAGES || 5000);
const INCREMENTAL_UNSEEN_LOOKBACK_DAYS = 7;
const INCREMENTAL_SEEN_LOOKBACK_DAYS = 3;
const INCREMENTAL_SENT_LOOKBACK_DAYS = 14;

interface MailboxSyncTarget {
    path: string;
    folder: EmailFolder;
    initialSync: boolean;
}

export interface ImapConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    encryption?: 'SSL/TLS' | 'STARTTLS' | 'NONE';
}

class ImapService {
    private getMessageDate(parsedDate: unknown, fallbackDate?: unknown): Date {
        const candidates = [parsedDate, fallbackDate];
        for (const candidate of candidates) {
            if (!candidate) continue;
            const date = candidate instanceof Date ? candidate : new Date(candidate as any);
            if (!Number.isNaN(date.getTime())) {
                return date;
            }
        }
        return new Date();
    }

    private isSeenMessage(flags: unknown): boolean {
        if (!flags) return false;
        if (flags instanceof Set) {
            return flags.has('\\Seen');
        }
        if (Array.isArray(flags)) {
            return flags.some((flag) => String(flag).toLowerCase() === '\\seen');
        }
        return false;
    }

    private async storeAttachments(tenantId: string, parsedAttachments: any[] = []) {
        if (!Array.isArray(parsedAttachments) || parsedAttachments.length === 0) {
            return [];
        }

        const uploadDir = path.resolve(config.upload.uploadPath, tenantId, 'emails');
        await fs.mkdir(uploadDir, { recursive: true });

        return Promise.all(parsedAttachments.map(async (attachment: any) => {
            const originalName = typeof attachment?.filename === 'string' && attachment.filename.trim()
                ? attachment.filename.trim()
                : 'attachment';
            const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100) || 'attachment';
            const storedName = `${randomUUID()}-${safeName}`;
            const targetPath = path.join(uploadDir, storedName);
            const content = Buffer.isBuffer(attachment?.content) ? attachment.content : Buffer.from(attachment?.content || '');

            await fs.writeFile(targetPath, content);

            return {
                filename: originalName,
                mimeType: attachment?.contentType || 'application/octet-stream',
                size: BigInt(Number(attachment?.size || content.length || 0)),
                path: path.posix.join('/uploads', tenantId, 'emails', storedName),
            };
        }));
    }

    /**
     * Fetch new (unseen) emails from IMAP server and store them in DB.
     * Uses messageId for deduplication.
     */
    async fetchNewEmails(tenantId: string, mailboxOwnerUserId: string, config: ImapConfig): Promise<number> {
        if (!config.host || !config.user || !config.pass) {
            return 0;
        }

        const client = new ImapFlow({
            host: config.host,
            port: config.port || 993,
            secure: config.encryption !== 'STARTTLS' && config.encryption !== 'NONE',
            doSTARTTLS: config.encryption === 'STARTTLS',
            auth: { user: config.user, pass: config.pass },
            logger: false as any,
        });

        let fetched = 0;

        try {
            const [existingInboxCount, existingSentCount] = await Promise.all([
                prisma.email.count({
                    where: { tenantId, mailboxOwnerUserId, folder: 'INBOX', deletedAt: null },
                }),
                prisma.email.count({
                    where: { tenantId, mailboxOwnerUserId, folder: 'SENT', deletedAt: null },
                }),
            ]);

            await client.connect();

            const syncTargets = await this._resolveSyncTargets(client, {
                hasInboxHistory: existingInboxCount > 0,
                hasSentHistory: existingSentCount > 0,
            });

            for (const target of syncTargets) {
                const lock = await client.getMailboxLock(target.path);
                try {
                    // Backfill the latest history per mailbox the first time we see that
                    // folder, then switch to incremental syncs for later polls.
                    if (target.initialSync) {
                        fetched += await this._backfillInitialHistory(
                            client,
                            tenantId,
                            mailboxOwnerUserId,
                            target.folder,
                        );
                    } else {
                        fetched += await this._fetchIncrementalHistory(
                            client,
                            tenantId,
                            mailboxOwnerUserId,
                            target.folder,
                        );
                    }
                } finally {
                    lock.release();
                }
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

    private _isSelectableMailbox(mailbox: { flags?: Set<string> }) {
        return !mailbox.flags?.has('\\Noselect') && !mailbox.flags?.has('\\NonExistent');
    }

    private async _resolveSyncTargets(
        client: ImapFlow,
        history: { hasInboxHistory: boolean; hasSentHistory: boolean },
    ): Promise<MailboxSyncTarget[]> {
        const mailboxes = await client.list();
        const inboxMailbox = mailboxes.find((mailbox) =>
            this._isSelectableMailbox(mailbox)
            && (mailbox.specialUse === '\\Inbox' || mailbox.path.toUpperCase() === 'INBOX')
        );
        const sentMailbox = mailboxes.find((mailbox) =>
            this._isSelectableMailbox(mailbox)
            && (
                mailbox.specialUse === '\\Sent'
                || /\bsent\b|\bsent items\b|\bsent mail\b/i.test(mailbox.name || mailbox.path)
            )
        );

        const targets: MailboxSyncTarget[] = [];

        targets.push({
            path: inboxMailbox?.path || 'INBOX',
            folder: 'INBOX',
            initialSync: !history.hasInboxHistory,
        });

        if (sentMailbox?.path && sentMailbox.path !== (inboxMailbox?.path || 'INBOX')) {
            targets.push({
                path: sentMailbox.path,
                folder: 'SENT',
                initialSync: !history.hasSentHistory,
            });
        }

        return targets;
    }

    private async _backfillInitialHistory(
        client: ImapFlow,
        tenantId: string,
        mailboxOwnerUserId: string,
        folder: EmailFolder,
    ): Promise<number> {
        const uidList = await client.search({ all: true }, { uid: true });

        if (!uidList || uidList.length === 0) {
            return 0;
        }

        const sortedUids = [...uidList].sort((a, b) => a - b);
        const latestUids = INITIAL_SYNC_MAX_MESSAGES > 0
            ? sortedUids.slice(-INITIAL_SYNC_MAX_MESSAGES)
            : sortedUids;
        let fetched = 0;

        for await (const msg of client.fetch(latestUids, { source: true, envelope: true, uid: true, flags: true, internalDate: true }, { uid: true })) {
            try {
                const parsed = await simpleParser(msg.source);
                fetched += await this._storeEmail(tenantId, mailboxOwnerUserId, parsed, folder, {
                    fallbackDate: msg.envelope?.date || msg.internalDate,
                    isRead: this.isSeenMessage(msg.flags),
                    notifyIncoming: false,
                });
            } catch (parseErr: any) {
                console.error(`⚠️ Failed to parse initial-sync email UID ${msg.uid}:`, parseErr.message);
            }
        }

        return fetched;
    }

    private async _fetchIncrementalHistory(
        client: ImapFlow,
        tenantId: string,
        mailboxOwnerUserId: string,
        folder: EmailFolder,
    ): Promise<number> {
        let fetched = 0;

        if (folder === 'SENT') {
            const sentSince = new Date();
            sentSince.setDate(sentSince.getDate() - INCREMENTAL_SENT_LOOKBACK_DAYS);

            const sentMessages = client.fetch(
                { since: sentSince },
                { source: true, envelope: true, uid: true, flags: true, internalDate: true },
            );

            for await (const msg of sentMessages) {
                try {
                    const parsed = await simpleParser(msg.source);
                    fetched += await this._storeEmail(tenantId, mailboxOwnerUserId, parsed, folder, {
                        fallbackDate: msg.envelope?.date || msg.internalDate,
                        isRead: this.isSeenMessage(msg.flags),
                    });
                } catch (parseErr: any) {
                    console.error(`⚠️ Failed to parse sent email UID ${msg.uid}:`, parseErr.message);
                }
            }

            return fetched;
        }

        const unseenSince = new Date();
        unseenSince.setDate(unseenSince.getDate() - INCREMENTAL_UNSEEN_LOOKBACK_DAYS);

        const unseenMessages = client.fetch(
            { since: unseenSince, seen: false },
            { source: true, envelope: true, uid: true, flags: true, internalDate: true }
        );

        for await (const msg of unseenMessages) {
            try {
                const parsed = await simpleParser(msg.source);
                fetched += await this._storeEmail(tenantId, mailboxOwnerUserId, parsed, folder, {
                    fallbackDate: msg.envelope?.date || msg.internalDate,
                    isRead: this.isSeenMessage(msg.flags),
                });
            } catch (parseErr: any) {
                console.error(`⚠️ Failed to parse email UID ${msg.uid}:`, parseErr.message);
            }
        }

        const seenSince = new Date();
        seenSince.setDate(seenSince.getDate() - INCREMENTAL_SEEN_LOOKBACK_DAYS);

        const seenMessages = client.fetch(
            { since: seenSince, seen: true },
            { source: true, envelope: true, uid: true, flags: true, internalDate: true }
        );

        for await (const msg of seenMessages) {
            try {
                const parsed = await simpleParser(msg.source);
                fetched += await this._storeEmail(tenantId, mailboxOwnerUserId, parsed, folder, {
                    fallbackDate: msg.envelope?.date || msg.internalDate,
                    isRead: this.isSeenMessage(msg.flags),
                });
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
    private async _storeEmail(
        tenantId: string,
        mailboxOwnerUserId: string,
        parsed: any,
        folder: EmailFolder,
        options: { fallbackDate?: unknown; isRead?: boolean; notifyIncoming?: boolean } = {},
    ): Promise<number> {
        const messageId = parsed.messageId || null;

        // Deduplicate by messageId
        if (messageId) {
            const existing = await prisma.email.findFirst({
                where: { tenantId, mailboxOwnerUserId, messageId },
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

        const isSent = folder === 'SENT';
        const timestamp = this.getMessageDate(parsed.date, options.fallbackDate);

        const storedAttachments = await this.storeAttachments(tenantId, parsed.attachments || []);

        await prisma.email.create({
            data: {
                tenantId,
                mailboxOwnerUserId,
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
                folder,
                status: isSent ? 'SENT' : 'RECEIVED',
                isRead: isSent || options.isRead === true,
                hasAttachments: storedAttachments.length > 0,
                attachments: storedAttachments.length > 0
                    ? {
                        create: storedAttachments,
                    }
                    : undefined,
                size: BigInt(parsed.html?.length || parsed.text?.length || 0),
                receivedAt: timestamp,
                sentAt: isSent ? timestamp : null,
            },
        });

        // Trigger notification bell for incoming emails
        if (!isSent && options.notifyIncoming !== false) {
            const senderLabel = fromAddr?.name || fromAddr?.address || 'Unknown sender';
            const subjectLabel = parsed.subject || '(No Subject)';
            try {
                await notificationsService.create({
                    userId: mailboxOwnerUserId,
                    tenantId,
                    title: `New email from ${senderLabel}`,
                    message: subjectLabel,
                    type: 'INFO',
                    actionUrl: '/letterbox',
                    actionLabel: 'Open Zodo Mail',
                    metadata: { emailFrom: fromAddr?.address, emailSubject: subjectLabel },
                });
            } catch (notifErr: any) {
                // Never let notification failure break email ingestion
                console.warn('⚠️ Failed to create email notification:', notifErr.message);
            }
        }

        return 1;
    }
}

export const imapService = new ImapService();
