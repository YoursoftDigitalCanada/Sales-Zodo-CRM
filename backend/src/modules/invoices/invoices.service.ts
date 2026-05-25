import { invoicesRepository } from './invoices.repository';
import { toInvoiceResponseDto } from './invoices.dto';
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto, RecordInvoicePaymentDto } from '@contracts/invoice';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { logger } from '../../common/utils/logger';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { communicationLogService } from '../communication-logs/communication-log.service';
import { bookkeepingService } from '../bookkeeping/bookkeeping.service';
import { filesService } from '../files/files.service';
import { documentsService } from '../documents/documents.service';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface CompanyProfile {
    companyName: string;
    email?: string;
    phone?: string;
    address?: string;
    logoUrl?: string | null;
}

interface InvoiceEmailAttachment {
    filename: string;
    content: Buffer;
    contentType?: string;
}

interface InvoiceRoofAttachmentCandidate {
    url: string;
    filenameHint: string;
    contentType?: string | null;
}

export class InvoicesService {
    private static readonly MAX_ROOF_ATTACHMENTS = 6;
    private static readonly MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;
    private static readonly MAX_TOTAL_ROOF_ATTACHMENT_BYTES = 20 * 1024 * 1024;

    private joinAddress(parts: Array<string | null | undefined>) {
        return parts.map((part) => String(part || '').trim()).filter(Boolean).join(', ');
    }

    private formatCurrency(value: number | string, currency = 'CAD') {
        const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency,
        }).format(Number.isFinite(amount) ? amount : 0);
    }

    private escapeHtml(value: string | null | undefined) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private logBookkeepingSyncFailure(tenantId: string, sourceType: string, sourceId: string, error: unknown) {
        logger.warn('[Invoices] Bookkeeping sync failed', {
            tenantId,
            sourceType,
            sourceId,
            error: (error as Error)?.message || String(error),
        });
        activityLogger.log({
            tenantId,
            entityType: sourceType,
            entityId: sourceId,
            action: 'UPDATE',
            module: 'bookkeeping',
            description: `Bookkeeping sync failed for ${sourceType.toLowerCase()}`,
            metadata: { error: (error as Error)?.message || String(error) },
        });
    }

    private async normalizeAndValidateInvoiceLinks(
        tenantId: string,
        data: Record<string, any>,
        existing?: Record<string, any> | null,
    ) {
        const next = { ...data };
        const effectiveClientId = next.clientId !== undefined ? next.clientId : existing?.clientId;

        if (next.contractId) {
            const contract = await prisma.contract.findFirst({
                where: { id: next.contractId, tenantId },
                select: { id: true, clientId: true, contactId: true, quoteId: true, projectId: true },
            });
            if (!contract) throw new BadRequestError('Contract does not belong to this tenant', ErrorCodes.INVALID_INPUT);
            next.clientId = next.clientId || contract.clientId;
            next.contactId = next.contactId || contract.contactId || undefined;
            next.quoteId = next.quoteId || contract.quoteId || undefined;
            next.projectId = next.projectId || contract.projectId || undefined;
        }

        if (next.projectId) {
            const deal = await prisma.project.findFirst({
                where: { id: next.projectId, tenantId },
                select: { id: true, clientId: true, contactId: true },
            });
            if (!deal) throw new BadRequestError('Deal does not belong to this tenant', ErrorCodes.INVALID_INPUT);
            next.clientId = next.clientId || deal.clientId || undefined;
            next.contactId = next.contactId || deal.contactId || undefined;
        }

        if (next.quoteId) {
            const quote = await prisma.quote.findFirst({
                where: { id: next.quoteId, tenantId },
                select: { id: true, clientId: true },
            });
            if (!quote) throw new BadRequestError('Proposal does not belong to this tenant', ErrorCodes.INVALID_INPUT);
            next.clientId = next.clientId || quote.clientId || undefined;
        }

        const clientId = next.clientId !== undefined ? next.clientId : effectiveClientId;
        if (!clientId) throw new BadRequestError('Company is required for invoice billing', ErrorCodes.INVALID_INPUT);
        const client = await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } });
        if (!client) throw new BadRequestError('Company does not belong to this tenant', ErrorCodes.INVALID_INPUT);

        const contactId = next.contactId !== undefined ? next.contactId : existing?.contactId;
        if (contactId) {
            const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId }, select: { id: true, companyId: true } });
            if (!contact) throw new BadRequestError('Contact does not belong to this tenant', ErrorCodes.INVALID_INPUT);
            if (contact.companyId && contact.companyId !== clientId) {
                throw new BadRequestError('Contact does not belong to the selected company', ErrorCodes.INVALID_INPUT);
            }
        }

        return next;
    }

    private async getCompanyProfile(tenantId: string): Promise<CompanyProfile> {
        const settings = await prisma.tenantSettings.findUnique({
            where: { tenantId },
            include: { tenant: { select: { name: true, logo: true } } },
        });

        const integrations = settings?.integrations && typeof settings.integrations === 'object'
            ? (settings.integrations as Record<string, unknown>)
            : {};

        return {
            companyName: String(integrations.companyName ?? settings?.tenant?.name ?? 'ZODO CRM'),
            email: String(integrations.companyEmail ?? '') || undefined,
            phone: String(integrations.companyPhone ?? '') || undefined,
            address: String(integrations.companyAddress ?? '') || undefined,
            logoUrl: settings?.tenant?.logo || null,
        };
    }

    private async loadLogoDataUrl(logoUrl: string | null | undefined): Promise<string | null> {
        const value = String(logoUrl || '').trim();
        if (!value || /^https?:\/\//i.test(value) || value.startsWith('data:image/')) {
            return null;
        }

        const relativePath = value.startsWith('/uploads/')
            ? value.replace(/^\/uploads\/?/, '')
            : value.replace(/^\/+/, '');
        const absolutePath = path.resolve(config.upload.uploadPath, relativePath);
        const extension = path.extname(absolutePath).toLowerCase();
        const mimeType = extension === '.png'
            ? 'image/png'
            : extension === '.jpg' || extension === '.jpeg'
                ? 'image/jpeg'
                : extension === '.webp'
                    ? 'image/webp'
                    : null;

        if (!mimeType) {
            return null;
        }

        try {
            const file = await fs.readFile(absolutePath);
            return `data:${mimeType};base64,${file.toString('base64')}`;
        } catch {
            return null;
        }
    }

    private getPdfImageFormat(dataUrl: string | null): 'PNG' | 'JPEG' | 'WEBP' | null {
        if (!dataUrl) return null;
        if (dataUrl.startsWith('data:image/png')) return 'PNG';
        if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG';
        if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
        return null;
    }

    private sanitizeAttachmentFileName(value: string, fallbackBase: string) {
        const trimmed = String(value || '').trim();
        const safe = trimmed
            .replace(/[/\\?%*:|"<>]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        return safe || fallbackBase;
    }

    private inferImageContentType(fileName: string, fallback?: string | null): string | null {
        if (fallback && /^image\//i.test(fallback)) {
            return fallback;
        }

        const extension = path.extname(fileName).toLowerCase();
        if (extension === '.png') return 'image/png';
        if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
        if (extension === '.webp') return 'image/webp';
        if (extension === '.gif') return 'image/gif';
        if (extension === '.bmp') return 'image/bmp';
        if (extension === '.svg') return 'image/svg+xml';
        return null;
    }

    private ensureAttachmentExtension(fileName: string, contentType?: string | null) {
        if (path.extname(fileName)) {
            return fileName;
        }

        const extension = contentType === 'image/png'
            ? '.png'
            : contentType === 'image/webp'
                ? '.webp'
                : contentType === 'image/gif'
                    ? '.gif'
                    : '.jpg';

        return `${fileName}${extension}`;
    }

    private resolveStoredAttachmentPath(storedPath: string) {
        const relativePath = storedPath.startsWith('/uploads/')
            ? storedPath.replace(/^\/uploads\/?/, '')
            : storedPath.replace(/^\/+/, '');
        return path.resolve(config.upload.uploadPath, relativePath);
    }

    private normalizeRoofPhotoCandidates(photos: unknown): InvoiceRoofAttachmentCandidate[] {
        return (Array.isArray(photos) ? photos : [])
            .map((photo, index) => {
                if (typeof photo === 'string') {
                    const url = photo.trim();
                    if (!url) return null;
                    return {
                        url,
                        filenameHint: `roof-view-${index + 1}`,
                    } satisfies InvoiceRoofAttachmentCandidate;
                }

                if (!photo || typeof photo !== 'object') return null;
                const record = photo as Record<string, unknown>;
                const url = String(record.url || '').trim();
                if (!url) return null;

                const label = String(record.label || '').trim();
                return {
                    url,
                    filenameHint: label || `roof-view-${index + 1}`,
                    contentType: typeof record.mimeType === 'string' ? record.mimeType : null,
                } satisfies InvoiceRoofAttachmentCandidate;
            })
            .filter((candidate): candidate is InvoiceRoofAttachmentCandidate => Boolean(candidate));
    }

    private isAuthenticationError(errorMessage: string) {
        const normalized = errorMessage.toLowerCase();
        return normalized.includes('invalid login')
            || normalized.includes('authentication failed')
            || normalized.includes('535')
            || normalized.includes('username')
            || normalized.includes('password');
    }

    private async readImageAttachment(
        sourceUrl: string,
        fileNameHint: string,
        contentType?: string | null,
    ): Promise<InvoiceEmailAttachment | null> {
        const trimmedUrl = String(sourceUrl || '').trim();
        if (!trimmedUrl) {
            return null;
        }

        if (trimmedUrl.startsWith('data:image/')) {
            const match = trimmedUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (!match) return null;

            const buffer = Buffer.from(match[2], 'base64');
            if (buffer.length > InvoicesService.MAX_ATTACHMENT_BYTES) {
                return null;
            }

            const safeName = this.ensureAttachmentExtension(
                this.sanitizeAttachmentFileName(fileNameHint, 'roof-image'),
                match[1],
            );

            return {
                filename: safeName,
                content: buffer,
                contentType: match[1],
            };
        }

        if (/^https?:\/\//i.test(trimmedUrl)) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 12000);
                const response = await fetch(trimmedUrl, { signal: controller.signal });
                clearTimeout(timeout);

                if (!response.ok) {
                    return null;
                }

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                if (buffer.length === 0 || buffer.length > InvoicesService.MAX_ATTACHMENT_BYTES) {
                    return null;
                }

                const urlPath = (() => {
                    try {
                        return new URL(trimmedUrl).pathname;
                    } catch {
                        return '';
                    }
                })();
                const responseContentType = response.headers.get('content-type');
                const imageContentType = this.inferImageContentType(urlPath || fileNameHint, responseContentType || contentType);
                if (!imageContentType) {
                    return null;
                }

                const remoteFileName = this.ensureAttachmentExtension(
                    this.sanitizeAttachmentFileName(
                        path.basename(urlPath || '') || fileNameHint,
                        this.sanitizeAttachmentFileName(fileNameHint, 'roof-image'),
                    ),
                    imageContentType,
                );

                return {
                    filename: remoteFileName,
                    content: buffer,
                    contentType: imageContentType,
                };
            } catch {
                return null;
            }
        }

        try {
            const filePath = this.resolveStoredAttachmentPath(trimmedUrl);
            const stat = await fs.stat(filePath);
            if (!stat.isFile() || stat.size === 0 || stat.size > InvoicesService.MAX_ATTACHMENT_BYTES) {
                return null;
            }

            const fileName = this.ensureAttachmentExtension(
                this.sanitizeAttachmentFileName(path.basename(filePath) || fileNameHint, 'roof-image'),
                contentType,
            );
            const imageContentType = this.inferImageContentType(fileName, contentType);
            if (!imageContentType) {
                return null;
            }

            const content = await fs.readFile(filePath);
            return {
                filename: fileName,
                content,
                contentType: imageContentType,
            };
        } catch {
            return null;
        }
    }

    private async collectRoofImageAttachments(invoiceRecord: any): Promise<InvoiceEmailAttachment[]> {
        const candidates: InvoiceRoofAttachmentCandidate[] = [];
        const projectPhotos = Array.isArray(invoiceRecord?.project?.projectPhotos)
            ? invoiceRecord.project.projectPhotos
            : [];
        const imageProjectPhotos = projectPhotos.filter((photo: any) => {
            const mimeType = String(photo?.mimeType || '').trim();
            return /^image\//i.test(mimeType) && String(photo?.url || '').trim();
        });
        const preferredProjectPhotos = imageProjectPhotos.filter((photo: any) => Boolean(photo?.visibleToClient));
        const selectedProjectPhotos = (preferredProjectPhotos.length > 0 ? preferredProjectPhotos : imageProjectPhotos)
            .slice(0, InvoicesService.MAX_ROOF_ATTACHMENTS);

        selectedProjectPhotos.forEach((photo: any, index: number) => {
            candidates.push({
                url: String(photo.url),
                filenameHint: photo.filename || `project-roof-photo-${index + 1}`,
                contentType: photo.mimeType || null,
            });
        });

        const roofEstimate = invoiceRecord?.quote?.roofEstimate;
        if (roofEstimate?.satelliteImageUrl) {
            candidates.push({
                url: String(roofEstimate.satelliteImageUrl),
                filenameHint: 'roof-overview',
                contentType: 'image/jpeg',
            });
        }
        candidates.push(...this.normalizeRoofPhotoCandidates(roofEstimate?.photoUrls));

        const attachments: InvoiceEmailAttachment[] = [];
        const seenUrls = new Set<string>();
        let totalBytes = 0;

        for (const candidate of candidates) {
            const normalizedUrl = candidate.url.trim();
            if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
                continue;
            }
            seenUrls.add(normalizedUrl);

            const attachment = await this.readImageAttachment(
                normalizedUrl,
                candidate.filenameHint,
                candidate.contentType,
            );
            if (!attachment) {
                continue;
            }

            if (totalBytes + attachment.content.length > InvoicesService.MAX_TOTAL_ROOF_ATTACHMENT_BYTES) {
                break;
            }

            attachments.push(attachment);
            totalBytes += attachment.content.length;

            if (attachments.length >= InvoicesService.MAX_ROOF_ATTACHMENTS) {
                break;
            }
        }

        return attachments;
    }

    private async resolveInvoiceSender(
        tenantId: string,
        actorUserId?: string,
    ): Promise<{
        senderName: string;
        senderEmail: string;
        send: (options: {
            to: string | string[];
            subject: string;
            html: string;
            text?: string;
            replyTo?: string;
            relatedEntityId?: string;
            attachments?: InvoiceEmailAttachment[];
        }) => Promise<{ sent: boolean; error?: string }>;
    }> {
        const sender = await tenantMailerService.getTenantSender(tenantId, actorUserId);

        return {
            senderName: sender.senderName,
            senderEmail: sender.senderEmail,
            send: async (options) => {
                const delivery = await tenantMailerService.sendTenantEmail({
                    tenantId,
                    preferredUserId: actorUserId,
                    relatedEntityType: 'Invoice',
                    ...options,
                });
                return { sent: delivery.sent, error: delivery.error };
            },
        };
    }

    private async resolvePrivilegedInvoiceSender(
        tenantId: string,
        actorUserId?: string,
    ): Promise<{
        senderName: string;
        senderEmail: string;
        send: (options: {
            to: string | string[];
            subject: string;
            html: string;
            text?: string;
            replyTo?: string;
            relatedEntityId?: string;
            attachments?: InvoiceEmailAttachment[];
        }) => Promise<{ sent: boolean; error?: string }>;
    }> {
        const sender = await tenantMailerService.getPrivilegedTenantSender(tenantId, actorUserId, ['Owner', 'Manager']);

        return {
            senderName: sender.senderName,
            senderEmail: sender.senderEmail,
            send: async (options) => {
                const delivery = await tenantMailerService.sendPrivilegedTenantEmail({
                    tenantId,
                    preferredUserId: actorUserId,
                    roleNames: ['Owner', 'Manager'],
                    relatedEntityType: 'Invoice',
                    ...options,
                });
                return { sent: delivery.sent, error: delivery.error };
            },
        };
    }

    private buildInvoiceEmailContent(params: {
        invoice: any;
        company: CompanyProfile;
        recipientName: string;
        supportingAttachmentCount: number;
    }) {
        const { invoice, company, recipientName, supportingAttachmentCount } = params;
        const invoiceNumber = String(invoice.invoiceNumber || invoice.id);
        const issueDate = new Date(invoice.issueDate).toLocaleDateString();
        const dueDate = new Date(invoice.dueDate).toLocaleDateString();
        const currency = String(invoice.currency || 'CAD');
        const amountDue = this.formatCurrency(Number(invoice.amountDue || 0), currency);
        const total = this.formatCurrency(Number(invoice.total || 0), currency);
        const itemsHtml = Array.isArray(invoice.items)
            ? invoice.items.map((item: any) => `
                <tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;">${this.escapeHtml(item.description || 'Item')}</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:center;">${Number(item.quantity || 0).toFixed(2)}</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:right;">${this.formatCurrency(Number(item.unitPrice || 0), currency)}</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${this.formatCurrency(Number(item.amount || 0), currency)}</td>
                </tr>
              `).join('')
            : '';
        const attachmentNote = supportingAttachmentCount > 0
            ? `<p style="margin:0 0 20px;font-size:13px;color:#0F766E;background:#ECFEFF;border:1px solid #A5F3FC;padding:12px 14px;border-radius:10px;">
                ${supportingAttachmentCount} supporting attachment${supportingAttachmentCount === 1 ? '' : 's'} ${supportingAttachmentCount === 1 ? 'is' : 'are'} included with this invoice for reference.
              </p>`
            : '';

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#115E59);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${this.escapeHtml(company.companyName || 'ZODO CRM')}</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.88);font-size:14px;">Invoice Ready</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <p style="margin:0 0 8px;font-size:16px;color:#0F172A;">Hi ${this.escapeHtml(recipientName)},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Your invoice is attached as a PDF. Please review the summary below and contact us if you need anything clarified.
    </p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Invoice Number</td>
          <td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${this.escapeHtml(invoiceNumber)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Invoice Date</td>
          <td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${this.escapeHtml(issueDate)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Due Date</td>
          <td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${this.escapeHtml(dueDate)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Amount Due</td>
          <td style="padding:4px 0;font-size:18px;color:#0F766E;font-weight:700;text-align:right;">${this.escapeHtml(amountDue)}</td>
        </tr>
      </table>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#F1F5F9;">
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;">Description</th>
          <th style="padding:10px 16px;text-align:center;font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;">Qty</th>
          <th style="padding:10px 16px;text-align:right;font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;">Rate</th>
          <th style="padding:10px 16px;text-align:right;font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    ${attachmentNote}
    <div style="border-top:1px solid #E2E8F0;padding-top:18px;">
      <p style="margin:0 0 8px;font-size:13px;color:#64748B;">Total Invoice</p>
      <p style="margin:0;font-size:22px;color:#0F172A;font-weight:700;">${this.escapeHtml(total)}</p>
    </div>
  </div>
  <div style="text-align:center;padding:24px;color:#94A3B8;font-size:12px;">
    <p style="margin:0;">© ${new Date().getFullYear()} ${this.escapeHtml(company.companyName || 'ZODO CRM')}</p>
  </div>
</div>
</body>
</html>`;

        const text = [
            `Hi ${recipientName},`,
            '',
            `Your invoice ${invoiceNumber} is attached as a PDF.`,
            `Invoice date: ${issueDate}`,
            `Due date: ${dueDate}`,
            `Amount due: ${amountDue}`,
            supportingAttachmentCount > 0 ? `${supportingAttachmentCount} supporting attachment${supportingAttachmentCount === 1 ? '' : 's'} included for reference.` : '',
            '',
            `Total invoice: ${total}`,
        ].filter(Boolean).join('\n');

        return { html, text };
    }

    async create(tenantId: string, data: CreateInvoiceDto) {
        const normalizedData = await this.normalizeAndValidateInvoiceLinks(tenantId, data as any);
        const invoice = await invoicesRepository.create(tenantId, normalizedData as any);
        const dto = toInvoiceResponseDto(invoice);

        eventBus.emit('invoice.created', {
            tenantId,
            invoiceId: dto.id,
            invoiceNumber: (invoice as any).invoiceNumber || '',
            clientId: (invoice as any).clientId,
            contactId: (invoice as any).contactId || undefined,
            projectId: (invoice as any).projectId || undefined,
            proposalId: (invoice as any).quoteId || undefined,
            contractId: (invoice as any).contractId || undefined,
            amount: (invoice as any).totalAmount || (invoice as any).total,
        });

        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: dto.id,
            action: 'CREATE', module: 'invoices',
            description: `Created invoice "${(invoice as any).invoiceNumber || dto.id}"`,
            metadata: { invoiceNumber: (invoice as any).invoiceNumber, clientId: (invoice as any).clientId },
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const invoice = await invoicesRepository.findById(id, tenantId);
        if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const dto = toInvoiceResponseDto(invoice);
        const company = await this.getCompanyProfile(tenantId);
        return {
            ...dto,
            businessName: company.companyName,
            businessEmail: company.email || null,
            businessPhone: company.phone || null,
            businessAddress: company.address ? { address: company.address } : null,
        };
    }

    async generatePdf(id: string, tenantId: string): Promise<{ buffer: Buffer; fileName: string }> {
        const invoice = await invoicesRepository.findById(id, tenantId);
        if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default as any;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;

        const issueDate = new Date((invoice as any).issueDate).toLocaleDateString();
        const dueDate = new Date((invoice as any).dueDate).toLocaleDateString();
        const invoiceNumber = (invoice as any).invoiceNumber || id;
        const client = (invoice as any).client;
        const clientName = client?.clientName || 'Client';
        const currency = (invoice as any).currency || 'CAD';
        const company = await this.getCompanyProfile(tenantId);
        const logoDataUrl = await this.loadLogoDataUrl(company.logoUrl);
        const logoFormat = this.getPdfImageFormat(logoDataUrl);
        const companyTextX = logoDataUrl && logoFormat ? pageWidth - margin - 26 : pageWidth - margin;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(15, 23, 42);
        doc.text('INVOICE', margin, 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text(invoiceNumber, margin, 25);

        if (logoDataUrl && logoFormat) {
            try {
                doc.addImage(logoDataUrl, logoFormat, pageWidth - margin - 22, 10, 22, 22);
            } catch {
                // Ignore logo draw failures so invoice download still succeeds.
            }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text(company.companyName || 'ZODO CRM', companyTextX, 16, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const companyLines = [company.email, company.phone, company.address].filter(Boolean) as string[];
        companyLines.slice(0, 3).forEach((line, index) => {
            doc.text(line, companyTextX, 21 + (index * 4.5), { align: 'right' });
        });

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, 38, pageWidth - margin, 38);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, 44, pageWidth - (margin * 2), 20, 2, 2, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Invoice Date', margin + 4, 49);
        doc.text('Due Date', margin + 68, 49);
        doc.text('Amount Due', margin + 126, 49);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(issueDate, margin + 4, 57);
        doc.text(dueDate, margin + 68, 57);
        doc.text(`${currency} ${Number((invoice as any).amountDue || 0).toFixed(2)}`, margin + 126, 57);

        const fromLines = [
            company.companyName || 'ZODO CRM',
            company.address,
            company.phone,
            company.email,
        ].filter(Boolean) as string[];
        const billToLines = [
            clientName,
            client?.companyName && client?.companyName !== clientName ? client.companyName : null,
            this.joinAddress([client?.streetAddress, client?.city, client?.province, client?.postalCode, client?.country]),
            client?.primaryPhone || null,
            client?.primaryEmail || null,
        ].filter(Boolean) as string[];

        const addressTitleY = 74;
        const leftColumnX = margin;
        const rightColumnX = 110;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('From', leftColumnX, addressTitleY);
        doc.text('Bill To', rightColumnX, addressTitleY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        fromLines.forEach((line, index) => {
            doc.text(line, leftColumnX, addressTitleY + 6 + (index * 5));
        });
        billToLines.forEach((line, index) => {
            doc.text(line, rightColumnX, addressTitleY + 6 + (index * 5));
        });

        const addressBlockHeight = Math.max(fromLines.length, billToLines.length) * 5;

        const items = ((invoice as any).items || []).map((item: any) => [
            item.description || 'Item',
            Number(item.quantity || 0).toFixed(2),
            Number(item.unitPrice || 0).toFixed(2),
            Number(item.amount || 0).toFixed(2),
        ]);

        autoTable(doc, {
            startY: addressTitleY + 12 + addressBlockHeight + 10,
            head: [['Description', 'Qty', 'Rate', 'Amount']],
            body: items,
            theme: 'striped',
            headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3.5, textColor: [51, 65, 85] },
            margin: { left: margin, right: margin },
        });

        const subtotal = Number((invoice as any).subtotal || 0).toFixed(2);
        const taxAmount = Number((invoice as any).taxAmount || 0).toFixed(2);
        const total = Number((invoice as any).total || 0).toFixed(2);
        const amountPaid = Number((invoice as any).amountPaid || 0).toFixed(2);
        const amountDue = Number((invoice as any).amountDue || 0).toFixed(2);
        const finalY = (doc as any).lastAutoTable?.finalY || 120;

        const totalsLabelX = pageWidth - 72;
        const totalsValueX = pageWidth - margin;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('Subtotal', totalsLabelX, finalY + 12);
        doc.text(`${currency} ${subtotal}`, totalsValueX, finalY + 12, { align: 'right' });
        doc.text(`Tax${(invoice as any).taxRate ? ` (${Number((invoice as any).taxRate).toFixed(2)}%)` : ''}`, totalsLabelX, finalY + 19);
        doc.text(`${currency} ${taxAmount}`, totalsValueX, finalY + 19, { align: 'right' });
        doc.text('Paid', totalsLabelX, finalY + 26);
        doc.text(`${currency} ${amountPaid}`, totalsValueX, finalY + 26, { align: 'right' });

        doc.setDrawColor(226, 232, 240);
        doc.line(totalsLabelX, finalY + 30, totalsValueX, finalY + 30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('Amount Due', totalsLabelX, finalY + 37);
        doc.text(`${currency} ${amountDue}`, totalsValueX, finalY + 37, { align: 'right' });

        let notesY = finalY + 52;
        if ((invoice as any).notes) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Notes', margin, notesY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            const noteLines = doc.splitTextToSize(String((invoice as any).notes), pageWidth - (margin * 2));
            doc.text(noteLines, margin, notesY + 6);
            notesY += 12 + (noteLines.length * 4);
        }

        if ((invoice as any).terms) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text('Terms & Conditions', margin, notesY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            const termsLines = doc.splitTextToSize(String((invoice as any).terms), pageWidth - (margin * 2));
            doc.text(termsLines, margin, notesY + 6);
            notesY += 12 + (termsLines.length * 4);
        }

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, Math.max(notesY + 2, finalY + 50), pageWidth - margin, Math.max(notesY + 2, finalY + 50));
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Thank you for your business!', pageWidth / 2, Math.max(notesY + 10, finalY + 58), { align: 'center' });

        const arrayBuffer = doc.output('arraybuffer');
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `invoice-${invoiceNumber}.pdf`;
        return { buffer, fileName };
    }

    async saveInvoicePdfToDocuments(tenantId: string, invoiceId: string, actorUserId?: string) {
        const invoice = await invoicesRepository.findById(invoiceId, tenantId);
        if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const existing = await (prisma as any).file.findFirst({
            where: {
                tenantId,
                deletedAt: null,
                documentMetadata: {
                    is: {
                        linkedEntityType: 'Invoice',
                        linkedEntityId: invoiceId,
                        documentType: 'pdf',
                    },
                },
            },
        });
        if (existing) return documentsService.get(existing.id, tenantId);

        const { buffer, fileName } = await this.generatePdf(invoiceId, tenantId);
        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uploadDir = path.join(process.cwd(), 'uploads', tenantId);
        await fs.mkdir(uploadDir, { recursive: true });
        const storagePath = path.join(uploadDir, `${crypto.randomUUID()}-${safeFileName}`);
        await fs.writeFile(storagePath, buffer);

        const saved = await filesService.create(tenantId, {
            name: fileName,
            originalName: fileName,
            mimeType: 'application/pdf',
            size: buffer.length,
            path: storagePath,
            extension: '.pdf',
            checksum: crypto.createHash('sha256').update(buffer).digest('hex'),
            clientId: (invoice as any).clientId || (invoice as any).client?.id || null,
            projectId: (invoice as any).projectId || null,
            quoteId: (invoice as any).quoteId || null,
        });
        const categories = await documentsService.categories(tenantId);
        const invoicesCategory = categories.find((category: any) => String(category.name).toLowerCase() === 'invoices');
        const document = await documentsService.update(saved.id, tenantId, {
            categoryId: invoicesCategory?.id,
            documentType: 'pdf',
            linkedEntityType: 'Invoice',
            linkedEntityId: invoiceId,
            description: 'Invoice PDF',
            metadata: {
                relatedEntities: {
                    clientId: (invoice as any).clientId || null,
                    contactId: (invoice as any).contactId || null,
                    dealId: (invoice as any).projectId || null,
                    proposalId: (invoice as any).quoteId || null,
                    contractId: (invoice as any).contractId || null,
                },
            },
        });
        activityLogger.log({
            tenantId,
            entityType: 'Invoice',
            entityId: invoiceId,
            action: 'UPDATE',
            module: 'documents',
            description: 'Saved invoice PDF to Documents',
            userId: actorUserId,
            metadata: { fileId: saved.id },
        });
        return document;
    }

    async getMany(tenantId: string, query: InvoiceQueryDto) {
        const { data, total } = await invoicesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toInvoiceResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateInvoiceDto) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const normalizedData = await this.normalizeAndValidateInvoiceLinks(tenantId, data as any, existing as any);
        const invoice = await invoicesRepository.update(id, tenantId, normalizedData as any);
        const dto = toInvoiceResponseDto(invoice);

        eventBus.emit('invoice.updated', {
            tenantId,
            invoiceId: dto.id,
            invoiceNumber: (invoice as any).invoiceNumber || '',
            clientId: (invoice as any).clientId,
            updatedFields: Object.keys(data),
        });

        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: dto.id,
            action: 'UPDATE', module: 'invoices',
            description: `Updated invoice "${(invoice as any).invoiceNumber || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: id,
            action: 'DELETE', module: 'invoices',
            description: `Deleted invoice "${(existing as any).invoiceNumber || id}"`,
        });

        await invoicesRepository.delete(id, tenantId);
    }

    async sendInvoice(id: string, tenantId: string, recipientEmail?: string, actorUserId?: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const invoiceForSend = await prisma.invoice.findFirst({
            where: { id, tenantId },
            select: {
                id: true,
                tenantId: true,
                invoiceNumber: true,
                issueDate: true,
                dueDate: true,
                currency: true,
                total: true,
                amountDue: true,
                notes: true,
                terms: true,
                clientId: true,
                client: {
                    select: {
                        id: true,
                        clientName: true,
                        companyName: true,
                        primaryEmail: true,
                        primaryPhone: true,
                    },
                },
                items: {
                    select: {
                        description: true,
                        quantity: true,
                        unitPrice: true,
                        amount: true,
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        projectNumber: true,
                    },
                },
                quote: {
                    select: {
                        id: true,
                        quoteNumber: true,
                    },
                },
                contract: { select: { id: true, contractNumber: true, title: true } },
                contact: { select: { id: true, contactName: true, email: true } },
            },
        });
        if (!invoiceForSend) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const targetEmail = String(recipientEmail || invoiceForSend.client?.primaryEmail || '').trim();
        if (!targetEmail) {
            throw new BadRequestError('A recipient email is required before sending the invoice', ErrorCodes.INVALID_INPUT);
        }

        const company = await this.getCompanyProfile(tenantId);
        const recipientName = invoiceForSend.client?.clientName
            || invoiceForSend.client?.companyName
            || 'Customer';
        const sender = await this.resolveInvoiceSender(tenantId, actorUserId);
        const { buffer, fileName } = await this.generatePdf(id, tenantId);
        const emailAttachments: InvoiceEmailAttachment[] = [
            {
                filename: fileName,
                content: buffer,
                contentType: 'application/pdf',
            },
        ];
        const emailContent = this.buildInvoiceEmailContent({
            invoice: invoiceForSend,
            company,
            recipientName,
            supportingAttachmentCount: 0,
        });
        const delivery = await sender.send({
            to: targetEmail,
            subject: `Invoice ${invoiceForSend.invoiceNumber} from ${company.companyName}`,
            html: emailContent.html,
            text: emailContent.text,
            relatedEntityId: id,
            attachments: emailAttachments,
        });
        if (!delivery.sent) {
            const errorMessage = delivery.error || 'Check the configured SMTP credentials and try again.';
            if (this.isAuthenticationError(errorMessage)) {
                throw new BadRequestError(
                    `Invoice email delivery failed because the configured SMTP credentials were rejected. ${errorMessage}`,
                    ErrorCodes.INVALID_INPUT,
                );
            }

            throw new ServiceUnavailableError(`Invoice email delivery failed. ${errorMessage}`);
        }

        const invoice = await invoicesRepository.update(id, tenantId, { status: 'SENT', sentAt: new Date() } as any);
        const dto = toInvoiceResponseDto(invoice);

        // Domain event: invoice sent
        eventBus.emit('invoice.sent', {
            tenantId,
            invoiceId: id,
            invoiceNumber: (existing as any).invoiceNumber || '',
            clientId: (existing as any).clientId || (existing as any).client?.id,
            contactId: (existing as any).contactId || undefined,
            projectId: (existing as any).projectId || undefined,
            proposalId: (existing as any).quoteId || undefined,
            contractId: (existing as any).contractId || undefined,
            recipientEmail: targetEmail,
        });

        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: id,
            action: 'STATUS_CHANGE', module: 'invoices',
            description: `Invoice "${(existing as any).invoiceNumber || id}" emailed to ${targetEmail}`,
            userId: actorUserId,
            metadata: {
                newStatus: 'SENT',
                recipientEmail: targetEmail,
                senderEmail: sender.senderEmail,
                attachmentCount: emailAttachments.length,
            },
        });

        return dto;
    }

    async recordPayment(id: string, tenantId: string, data: RecordInvoicePaymentDto, actorUserId?: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const amount = Number(data.amount || 0);
        const amountDue = Number((existing as any).amountDue || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new BadRequestError('Payment amount must be greater than zero', ErrorCodes.INVALID_INPUT);
        }
        if (amount > amountDue) {
            throw new BadRequestError('Payment amount cannot exceed the invoice balance due', ErrorCodes.INVALID_INPUT);
        }

        const invoice = await invoicesRepository.recordPayment(id, tenantId, data);
        const dto = toInvoiceResponseDto(invoice);
        const latestPayment = Array.isArray((invoice as any).payments) ? (invoice as any).payments[0] : null;
        const clientId = (existing as any).clientId || (existing as any).client?.id;
        const newStatus = amount >= amountDue ? 'PAID' : 'PARTIALLY_PAID';

        if (latestPayment?.id) {
            bookkeepingService.syncInvoicePayment(tenantId, latestPayment.id).catch((error) => this.logBookkeepingSyncFailure(tenantId, 'InvoicePayment', latestPayment.id, error));
        }

        if (clientId) {
            await clientLifecycleService.progressTo(clientId, tenantId, 'ACTIVE');
            await clientLifecycleService.reinforceEngagement(clientId, tenantId);
        }

        if (newStatus === 'PAID') {
            try {
                const subscription = await prisma.customerSubscription.findFirst({
                    where: { tenantId, invoiceId: id },
                });

                if (subscription) {
                    await prisma.customerSubscription.update({
                        where: { id: subscription.id },
                        data: {
                            status: 'ACTIVE',
                            activatedAt: subscription.activatedAt || new Date(),
                        },
                    });

                    await prisma.client.update({
                        where: { id: subscription.clientId },
                        data: {
                            status: 'ACTIVE',
                            totalRevenue: { increment: amount },
                        },
                    });

                    activityLogger.log({
                        tenantId,
                        entityType: 'CustomerSubscription',
                        entityId: subscription.id,
                        action: 'STATUS_CHANGE',
                        module: 'payments',
                        description: `Subscription activated after payment for invoice "${(existing as any).invoiceNumber || id}"`,
                        userId: actorUserId,
                        metadata: {
                            invoiceId: id,
                            invoiceNumber: (existing as any).invoiceNumber || '',
                            amount,
                            newStatus: 'ACTIVE',
                        },
                    });
                }
            } catch (err) {
                logger.warn('[InvoicesService] Failed to activate customer subscription after payment', {
                    tenantId,
                    invoiceId: id,
                    err,
                });
            }
        }

        eventBus.emit('invoice.statusChanged', {
            tenantId,
            invoiceId: id,
            invoiceNumber: (existing as any).invoiceNumber || '',
            oldStatus: (existing as any).status || 'DRAFT',
            newStatus,
            clientId,
            contactId: (existing as any).contactId || undefined,
            projectId: (existing as any).projectId || undefined,
            proposalId: (existing as any).quoteId || undefined,
            contractId: (existing as any).contractId || undefined,
            ownerUserId: actorUserId,
        });

        eventBus.emit('payment.received', {
            tenantId,
            paymentId: latestPayment?.id,
            invoiceId: id,
            invoiceNumber: (existing as any).invoiceNumber || '',
            clientId,
            contactId: (existing as any).contactId || undefined,
            projectId: (existing as any).projectId || undefined,
            proposalId: (existing as any).quoteId || undefined,
            contractId: (existing as any).contractId || undefined,
            amount,
            status: newStatus,
            paidByUserId: actorUserId,
        });

        activityLogger.log({
            tenantId,
            entityType: 'Invoice',
            entityId: id,
            action: 'STATUS_CHANGE',
            module: 'invoices',
            description: `Recorded payment of ${amount.toFixed(2)} for invoice "${(existing as any).invoiceNumber || id}"`,
            userId: actorUserId,
            metadata: {
                paymentAmount: amount,
                paymentMethod: data.paymentMethod,
                newStatus,
                clientId,
            },
        });

        const clientEmail = String((existing as any).client?.primaryEmail || '').trim();
        if (clientEmail) {
            try {
                const sender = await this.resolvePrivilegedInvoiceSender(tenantId, actorUserId);
                const clientName = String((existing as any).client?.clientName || 'Customer').trim() || 'Customer';
                const invoiceNumber = String((existing as any).invoiceNumber || id);
                const paidAmount = this.formatCurrency(amount, String((existing as any).currency || 'CAD'));
                const remainingBalanceValue = Number((invoice as any).amountDue || 0);
                const remainingBalance = this.formatCurrency(
                    remainingBalanceValue,
                    String((existing as any).currency || 'CAD'),
                );
                const balanceMessage = remainingBalanceValue > 0
                    ? `Your remaining balance is ${remainingBalance}.`
                    : 'Your invoice is now fully paid.';

                const subject = `Thank you for your payment for invoice ${invoiceNumber}`;
                const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0F172A;line-height:1.6;">
  <h2 style="margin:0 0 12px;">Hi ${this.escapeHtml(clientName)},</h2>
  <p style="margin:0 0 12px;">
    Thank you for your payment of <strong>${this.escapeHtml(paidAmount)}</strong> for invoice
    <strong>${this.escapeHtml(invoiceNumber)}</strong>.
  </p>
  <p style="margin:0 0 12px;">${this.escapeHtml(balanceMessage)}</p>
  <p style="margin:0;">We appreciate your business.</p>
</body>
</html>`;
                const text = [
                    `Hi ${clientName},`,
                    '',
                    `Thank you for your payment of ${paidAmount} for invoice ${invoiceNumber}.`,
                    balanceMessage,
                    '',
                    'We appreciate your business.',
                ].join('\n');

                const delivery = await sender.send({
                    to: clientEmail,
                    subject,
                    html,
                    text,
                });

                if (delivery.sent) {
                    await communicationLogService.createSafe({
                        tenantId,
                        leadId: null,
                        type: 'EMAIL',
                        direction: 'OUTBOUND',
                        subject,
                        content: `payment-thank-you:${id}:${amount} Thank-you email sent for invoice ${invoiceNumber}.`,
                        to: clientEmail,
                    });
                } else {
                    logger.warn('[InvoicePayment] Thank-you email delivery failed', {
                        invoiceId: id,
                        clientEmail,
                        error: delivery.error,
                    });
                }
            } catch (error) {
                logger.warn('[InvoicePayment] Thank-you email skipped', {
                    invoiceId: id,
                    clientEmail,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return dto;
    }

    async updatePaymentStatus(invoiceId: string, paymentId: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
        const payment = await prisma.invoicePayment.findFirst({
            where: { id: paymentId, invoiceId, tenantId },
            include: { invoice: true },
        });
        if (!payment) throw new NotFoundError('Invoice payment not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const status = String(data.status || '').toUpperCase();
        const normalizedStatus = status === 'VOID' ? 'VOIDED' : status === 'CANCELLED' || status === 'CANCELED' ? 'VOIDED' : status;
        const paymentAmount = Number(payment.amount || 0);
        const refundAmount = normalizedStatus === 'PARTIALLY_REFUNDED'
            ? Number(data.refundAmount || 0)
            : normalizedStatus === 'REFUNDED'
                ? paymentAmount
                : 0;

        if (normalizedStatus === 'PARTIALLY_REFUNDED' && (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount >= paymentAmount)) {
            throw new BadRequestError('Partial refund amount must be greater than zero and less than the payment amount', ErrorCodes.INVALID_INPUT);
        }

        const updatedPayment = await prisma.invoicePayment.update({
            where: { id: payment.id },
            data: {
                status: normalizedStatus,
                refundAmount,
                refundedAt: ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(normalizedStatus) ? new Date() : null,
                voidedAt: normalizedStatus === 'VOIDED' ? new Date() : null,
                notes: data.notes ?? payment.notes,
            } as any,
            include: { invoice: true },
        });

        await this.recalculateInvoicePaymentTotals(invoiceId, tenantId);
        await this.applyPaymentBookkeepingLifecycle(tenantId, updatedPayment as any, actorUserId);

        const eventName = this.paymentEventName(normalizedStatus);
        eventBus.emit(eventName as any, {
            tenantId,
            paymentId,
            invoiceId,
            invoiceNumber: (payment.invoice as any)?.invoiceNumber || '',
            clientId: payment.clientId,
            contactId: (payment.invoice as any)?.contactId || undefined,
            projectId: (payment.invoice as any)?.projectId || undefined,
            proposalId: (payment.invoice as any)?.quoteId || undefined,
            contractId: (payment.invoice as any)?.contractId || undefined,
            amount: payment.amount,
            refundAmount,
            status: normalizedStatus,
            paidByUserId: actorUserId,
        });

        activityLogger.log({
            tenantId,
            entityType: 'InvoicePayment',
            entityId: paymentId,
            action: 'STATUS_CHANGE',
            module: 'payments',
            description: `Payment status changed to ${normalizedStatus}`,
            userId: actorUserId,
            metadata: { invoiceId, oldStatus: payment.status, newStatus: normalizedStatus, refundAmount },
        });

        return this.getById(invoiceId, tenantId);
    }

    private async recalculateInvoicePaymentTotals(invoiceId: string, tenantId: string) {
        const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
        if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const payments = await prisma.invoicePayment.findMany({ where: { invoiceId, tenantId } });
        const amountPaid = payments.reduce((sum: number, payment: any) => {
            const status = String(payment.status || '').toUpperCase();
            if (status === 'SUCCESSFUL') return sum + Number(payment.amount || 0);
            if (status === 'PARTIALLY_REFUNDED') return sum + Math.max(Number(payment.amount || 0) - Number(payment.refundAmount || 0), 0);
            return sum;
        }, 0);
        const total = Number((invoice as any).total || 0);
        const amountDue = Math.max(total - amountPaid, 0);
        return prisma.invoice.update({
            where: { id_tenantId: { id: invoiceId, tenantId } },
            data: {
                amountPaid,
                amountDue,
                paidAt: amountDue === 0 ? ((invoice as any).paidAt || new Date()) : null,
                status: amountDue === 0 ? 'PAID' as any : amountPaid > 0 ? 'PARTIALLY_PAID' as any : 'SENT' as any,
            },
        });
    }

    private async applyPaymentBookkeepingLifecycle(tenantId: string, payment: Record<string, any>, actorUserId?: string) {
        const status = String(payment.status || '').toUpperCase();
        if (status === 'SUCCESSFUL') return bookkeepingService.syncInvoicePayment(tenantId, payment.id);
        if (status === 'REFUNDED') return bookkeepingService.createInvoicePaymentReversal(tenantId, payment.id, Number(payment.amount || 0), 'REFUNDED', actorUserId);
        if (status === 'PARTIALLY_REFUNDED') return bookkeepingService.createInvoicePaymentReversal(tenantId, payment.id, Number(payment.refundAmount || 0), 'PARTIALLY_REFUNDED', actorUserId);
        if (['FAILED', 'VOIDED', 'VOID', 'CANCELLED', 'CANCELED'].includes(status)) return bookkeepingService.syncInvoicePayment(tenantId, payment.id);
        return null;
    }

    private paymentEventName(status: string) {
        if (status === 'FAILED') return 'payment.failed';
        if (status === 'REFUNDED') return 'payment.refunded';
        if (status === 'PARTIALLY_REFUNDED') return 'payment.partiallyRefunded';
        if (['VOIDED', 'VOID', 'CANCELLED', 'CANCELED'].includes(status)) return 'payment.voided';
        return 'payment.received';
    }

    async markAsPaid(id: string, tenantId: string, actorUserId?: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const outstandingAmount = Number((existing as any).amountDue || 0);
        if (outstandingAmount <= 0) {
            return toInvoiceResponseDto(existing as any);
        }

        return this.recordPayment(
            id,
            tenantId,
            {
                amount: outstandingAmount,
                paymentMethod: 'OTHER',
            },
            actorUserId,
        );
    }
}

export const invoicesService = new InvoicesService();
