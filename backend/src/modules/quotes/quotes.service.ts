import { quotesRepository } from './quotes.repository';
import { CreateQuoteDto, UpdateQuoteDto, QuoteQueryDto, toQuoteResponseDto } from './quotes.dto';
import { NotFoundError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { mailerService } from '../../common/services/mailer.service';
import { config } from '../../config';
import { prisma } from '../../config/database';
import { createHash, randomUUID } from 'crypto';
import { filesRepository } from '../files/files.repository';
import { notificationsService } from '../notifications/notifications.service';
import { generateQuoteContractPdfBuffer } from './quote-contract-pdf';
import { quoteSignatureReminderService } from './quote-signature-reminder.service';
import { buildQuoteSelect, stripUnsupportedQuoteSignatureFields } from './quote-schema-compat';
import fs from 'fs';
import path from 'path';

type QuoteContractRecord = any;
type QuoteStatusValue = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'SIGNED' | 'REJECTED' | 'EXPIRED';

interface CompanyProfile {
    companyName: string;
    email?: string;
    phone?: string;
    address?: string;
    logoUrl?: string | null;
}

interface RecipientProfile {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
}

export class QuotesService {
    private buildPublicLink(token: string) {
        const frontendUrl = config.frontend.url.replace(/\/$/, '');
        return `${frontendUrl}/estimate/sign/${token}`;
    }

    private formatCurrency(value: number | string, currency = 'CAD') {
        const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
        return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(Number.isFinite(amount) ? amount : 0);
    }

    private joinAddress(parts: Array<string | null | undefined>) {
        return parts.map((part) => String(part || '').trim()).filter(Boolean).join(', ');
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
            companyName: String(integrations.companyName ?? settings?.tenant?.name ?? 'ZODO'),
            email: String(integrations.companyEmail ?? '') || undefined,
            phone: String(integrations.companyPhone ?? '') || undefined,
            address: String(integrations.companyAddress ?? '') || undefined,
            logoUrl: settings?.tenant?.logo || null,
        };
    }

    private resolveRecipientProfile(quote: QuoteContractRecord): RecipientProfile {
        const client = quote.client;
        const lead = quote.lead;
        const leadName = [lead?.firstName, lead?.lastName].filter(Boolean).join(' ').trim();

        return {
            name: client?.clientName || leadName || lead?.companyName || 'Client',
            email: client?.primaryEmail || lead?.email || undefined,
            phone: client?.primaryPhone || lead?.phone || undefined,
            company: client?.companyName || lead?.companyName || undefined,
            address: quote.roofEstimate?.address
                || lead?.propertyAddress
                || this.joinAddress([
                    client?.streetAddress,
                    client?.city,
                    client?.province,
                    client?.postalCode,
                    client?.country,
                ])
                || undefined,
        };
    }

    private buildContractSnapshot(
        quote: QuoteContractRecord,
        company: CompanyProfile,
        recipient: RecipientProfile,
        contractVersion: number,
    ) {
        const issueDate = new Date(quote.issueDate).toISOString();
        const validUntil = new Date(quote.validUntil).toISOString();
        const items = (quote.items || []).map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            total: Number(item.total),
        }));

        return {
            contractVersion,
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            issueDate,
            validUntil,
            currency: quote.currency || 'CAD',
            company,
            client: {
                name: recipient.name,
                email: recipient.email || null,
                phone: recipient.phone || null,
                company: recipient.company || null,
                address: recipient.address || null,
            },
            project: {
                title: quote.quoteNumber,
                address: quote.roofEstimate?.address || recipient.address || null,
                jobType: quote.roofEstimate?.roofType || 'Roofing Service',
                recipientType: quote.leadId ? 'lead' : 'client',
            },
            scopeOfWork: quote.notes || null,
            items,
            subtotal: Number(quote.subtotal),
            taxRate: quote.taxRate ? Number(quote.taxRate) : 0,
            taxAmount: Number(quote.taxAmount),
            discountAmount: Number(quote.discountAmount),
            total: Number(quote.total),
            notes: quote.notes || null,
            terms: quote.terms || null,
        };
    }

    private buildPublicPayload(
        quote: QuoteContractRecord,
        company: CompanyProfile,
        recipient: RecipientProfile,
    ) {
        const snapshot = quote.contractSnapshot && typeof quote.contractSnapshot === 'object'
            ? quote.contractSnapshot as Record<string, any>
            : null;

        const sourceCompany = snapshot?.company ?? company;
        const sourceClient = snapshot?.client ?? {
            name: recipient.name,
            email: recipient.email || null,
            phone: recipient.phone || null,
            company: recipient.company || null,
            address: recipient.address || null,
        };
        const sourceProject = snapshot?.project ?? {
            title: quote.quoteNumber,
            address: quote.roofEstimate?.address || recipient.address || null,
            jobType: quote.roofEstimate?.roofType || 'Roofing Service',
            recipientType: quote.leadId ? 'lead' : 'client',
        };
        const sourceItems = snapshot?.items ?? (quote.items || []).map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            total: Number(item.total),
        }));

        return {
            id: quote.id,
            quoteNumber: snapshot?.quoteNumber || quote.quoteNumber,
            status: quote.status,
            company: sourceCompany,
            client: sourceClient,
            project: sourceProject,
            issueDate: snapshot?.issueDate || quote.issueDate,
            validUntil: snapshot?.validUntil || quote.validUntil,
            currency: snapshot?.currency || quote.currency,
            subtotal: snapshot?.subtotal ?? Number(quote.subtotal),
            taxRate: snapshot?.taxRate ?? (quote.taxRate ? Number(quote.taxRate) : 0),
            taxAmount: snapshot?.taxAmount ?? Number(quote.taxAmount),
            discountAmount: snapshot?.discountAmount ?? Number(quote.discountAmount),
            total: snapshot?.total ?? Number(quote.total),
            scopeOfWork: snapshot?.scopeOfWork ?? quote.notes ?? null,
            notes: snapshot?.notes ?? quote.notes ?? null,
            terms: snapshot?.terms ?? quote.terms ?? null,
            items: sourceItems,
            viewCount: quote.viewCount ?? 0,
            firstViewedAt: quote.firstViewedAt ?? null,
            lastViewedAt: quote.lastViewedAt ?? null,
            signedAt: quote.signedAt ?? quote.acceptedAt ?? null,
            signedBy: quote.signedBy ?? null,
            signatureType: quote.signatureType ?? null,
            isContract: Boolean(quote.isContract),
            contractVersion: quote.contractVersion ?? snapshot?.contractVersion ?? 0,
            signedPdfFileId: quote.signedPdfFileId ?? null,
            canSign: ['SENT', 'VIEWED'].includes(quote.status),
            canReject: ['SENT', 'VIEWED'].includes(quote.status),
        };
    }

    private async loadQuoteContractRecord(where: Record<string, unknown>): Promise<QuoteContractRecord | null> {
        const select = await buildQuoteSelect({
            client: {
                select: {
                    id: true,
                    clientName: true,
                    companyName: true,
                    primaryEmail: true,
                    primaryPhone: true,
                    streetAddress: true,
                    city: true,
                    province: true,
                    postalCode: true,
                    country: true,
                },
            },
            lead: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    companyName: true,
                    email: true,
                    phone: true,
                    propertyAddress: true,
                },
            },
            items: { orderBy: { sortOrder: 'asc' } },
            roofEstimate: {
                select: {
                    id: true,
                    address: true,
                    roofType: true,
                },
            },
            projects: {
                select: { id: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        });

        return prisma.quote.findFirst({
            where,
            select: select as any,
        });
    }

    private async createSignedPdfFile(
        quote: QuoteContractRecord,
        tenantId: string,
        snapshot: Record<string, any>,
        signature: { signedBy: string; signatureType?: string | null; signatureData?: string | null; signedAt: Date },
    ) {
        const { buffer, fileName } = generateQuoteContractPdfBuffer({
            companyName: String(snapshot.company?.companyName || 'ZODO'),
            companyEmail: snapshot.company?.email || undefined,
            companyPhone: snapshot.company?.phone || undefined,
            companyAddress: snapshot.company?.address || undefined,
            quoteNumber: String(snapshot.quoteNumber || quote.quoteNumber),
            issueDate: new Date(snapshot.issueDate || quote.issueDate).toLocaleDateString('en-CA'),
            signedAt: signature.signedAt.toLocaleDateString('en-CA'),
            clientName: String(snapshot.client?.name || 'Client'),
            clientEmail: snapshot.client?.email || undefined,
            clientPhone: snapshot.client?.phone || undefined,
            clientAddress: snapshot.client?.address || undefined,
            propertyAddress: snapshot.project?.address || undefined,
            jobType: snapshot.project?.jobType || undefined,
            scopeOfWork: snapshot.scopeOfWork || undefined,
            currency: String(snapshot.currency || quote.currency || 'CAD'),
            items: Array.isArray(snapshot.items) ? snapshot.items : [],
            subtotal: Number(snapshot.subtotal || quote.subtotal || 0),
            taxRate: Number(snapshot.taxRate || quote.taxRate || 0) || undefined,
            taxAmount: Number(snapshot.taxAmount || quote.taxAmount || 0),
            discountAmount: Number(snapshot.discountAmount || quote.discountAmount || 0),
            total: Number(snapshot.total || quote.total || 0),
            notes: snapshot.notes || undefined,
            terms: snapshot.terms || undefined,
            signedBy: signature.signedBy,
            signatureType: signature.signatureType || undefined,
            signatureData: signature.signatureData || undefined,
        });

        const uploadDir = path.join(process.cwd(), 'uploads', tenantId, 'quotes', 'contracts');
        fs.mkdirSync(uploadDir, { recursive: true });

        const storedName = `${randomUUID()}-${fileName}`;
        const filePath = path.join(uploadDir, storedName);
        fs.writeFileSync(filePath, buffer);

        const savedFile = await filesRepository.create(tenantId, {
            name: fileName,
            originalName: fileName,
            mimeType: 'application/pdf',
            size: buffer.length,
            path: filePath,
            extension: '.pdf',
            quoteId: quote.id,
            clientId: quote.clientId || null,
            leadId: quote.leadId || null,
            checksum: createHash('sha256').update(buffer).digest('hex'),
        });

        return savedFile.id;
    }

    private async notifyQuoteSigner(quote: QuoteContractRecord, signerName: string) {
        if (!quote.createdById) return;
        const owner = await prisma.employee.findUnique({
            where: { id: quote.createdById },
            select: { userId: true },
        });
        if (!owner?.userId) return;

        await notificationsService.create({
            title: 'Estimate Signed',
            message: `${signerName} signed ${quote.quoteNumber}. You can now convert it to a job.`,
            type: 'SUCCESS',
            userId: owner.userId,
            tenantId: quote.tenantId,
            actionUrl: `/quotes`,
            actionLabel: 'View Estimate',
        });
    }

    async create(tenantId: string, data: CreateQuoteDto, createdById?: string) {
        const quote = await quotesRepository.create(tenantId, data, createdById);
        const dto = toQuoteResponseDto(quote);

        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: dto.id,
            action: 'CREATE', module: 'quotes',
            description: `Created quote "${dto.quoteNumber}"`,
            userId: createdById,
            metadata: { quoteNumber: dto.quoteNumber, total: dto.total, clientId: dto.client?.id },
        });

        eventBus.emit('quote.created', {
            tenantId,
            quoteId: dto.id,
            quoteNumber: dto.quoteNumber,
            clientId: dto.client?.id,
            leadId: dto.leadId || undefined,
            total: dto.total,
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const quote = await quotesRepository.findById(id, tenantId);
        if (!quote) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toQuoteResponseDto(quote);
    }

    async getMany(tenantId: string, query: QuoteQueryDto) {
        const { data, total } = await quotesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toQuoteResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateQuoteDto) {
        const existing = await quotesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const existingStatus = String((existing as any).status || '');
        if (['SIGNED', 'ACCEPTED'].includes(existingStatus)) {
            throw new BadRequestError('Signed contracts cannot be edited');
        }
        const quote = await quotesRepository.update(id, tenantId, data);
        const dto = toQuoteResponseDto(quote);

        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: dto.id,
            action: 'UPDATE', module: 'quotes',
            description: `Updated quote "${dto.quoteNumber}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await quotesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: id,
            action: 'DELETE', module: 'quotes',
            description: `Deleted quote "${(existing as any).quoteNumber || id}"`,
        });

        await quotesRepository.delete(id, tenantId);
    }
    async updateStatus(id: string, tenantId: string, status: string, actorEmployeeId?: string) {
        const existing = await quotesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const oldStatus = (existing as any).status;
        if (['SIGNED', 'ACCEPTED'].includes(String(oldStatus)) && status !== oldStatus) {
            throw new BadRequestError('Signed contracts cannot change status');
        }

        // Build update data with semantic timestamps
        const updateData: any = { status };
        if (status === 'SENT' && !(existing as any).sentAt) updateData.sentAt = new Date();
        if (status === 'ACCEPTED' && !(existing as any).acceptedAt) updateData.acceptedAt = new Date();
        if (status === 'SIGNED' && !(existing as any).signedAt) {
            updateData.signedAt = new Date();
            updateData.isContract = true;
        }
        if (status === 'REJECTED' && !(existing as any).rejectedAt) updateData.rejectedAt = new Date();

        const quote = await quotesRepository.update(id, tenantId, updateData);
        const dto = toQuoteResponseDto(quote);

        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: dto.id,
            action: 'STATUS_CHANGE', module: 'quotes',
            description: `Quote "${dto.quoteNumber}" status: ${oldStatus} → ${status}`,
            metadata: { oldStatus, newStatus: status },
        });

        // Emit statusChanged with full payload for the master automation
        eventBus.emit('quote.statusChanged', {
            tenantId,
            quoteId: dto.id,
            quoteNumber: dto.quoteNumber,
            oldStatus,
            newStatus: status,
            clientId: dto.client?.id,
            leadId: dto.leadId || undefined,
            total: dto.total,
            createdById: actorEmployeeId,
            items: dto.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
        });

        return dto;
    }

    // ── Send quote via email / signature link ───────────────────────────────
    async sendQuote(id: string, tenantId: string, actorEmployeeId?: string) {
        const quote = await this.loadQuoteContractRecord({ id, tenantId });
        if (!quote) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const q = quote as QuoteContractRecord;
        if (['SIGNED', 'ACCEPTED'].includes(String(q.status))) {
            throw new BadRequestError('This estimate has already been signed');
        }

        const recipient = this.resolveRecipientProfile(q);
        if (!recipient.email) {
            throw new BadRequestError('No email address found for the recipient');
        }

        const company = await this.getCompanyProfile(tenantId);
        const publicToken = randomUUID();
        const contractVersion = Math.max(Number(q.contractVersion || 0) + 1, 1);
        const sentAt = new Date();
        const contractSnapshot = this.buildContractSnapshot(q, company, recipient, contractVersion);

        const updateData: any = {
            status: 'SENT',
            sentAt,
            publicToken,
            isContract: false,
            contractVersion,
            contractSnapshot,
            viewCount: 0,
            firstViewedAt: null,
            lastViewedAt: null,
            signedAt: null,
            signedBy: null,
            signatureType: null,
            signatureData: null,
            signerIpAddress: null,
            signerUserAgent: null,
            auditTrail: {
                contractVersion,
                sentAt: sentAt.toISOString(),
                publicToken,
            },
            signedPdfFileId: null,
            rejectedAt: null,
            acceptedAt: null,
        };
        const updated = await quotesRepository.update(id, tenantId, updateData);
        const dto = toQuoteResponseDto(updated);

        const publicLink = this.buildPublicLink(publicToken);
        const validDate = new Date(q.validUntil).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

        const itemsHtml = (q.items || []).map((item: any) =>
            `<tr>
                <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#334155;">${item.description}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#334155;text-align:center;">${item.quantity}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#334155;text-align:right;">${this.formatCurrency(Number(item.unitPrice), q.currency || 'CAD')}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#334155;text-align:right;">${this.formatCurrency(Number(item.total), q.currency || 'CAD')}</td>
            </tr>`
        ).join('');

        // ── Generate roof estimate PDF attachment (if linked) ────────────
        const emailAttachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];

        if (q.roofEstimateId) {
            try {
                const estimate = await prisma.roofEstimate.findFirst({
                    where: { id: q.roofEstimateId, tenantId },
                    include: { client: { select: { clientName: true, companyName: true } } },
                });

                if (estimate) {
                    // Get tenant company name from settings
                    const settings = await prisma.roofEstimateSettings.findUnique({
                        where: { tenantId },
                    });

                    const { generateRoofEstimatePdfBuffer } = await import('../roof-estimator/roof-estimate-pdf');
                    const { buffer, fileName } = generateRoofEstimatePdfBuffer({
                        companyName: settings?.companyName || 'Zodo Roofing',
                        recipientName: recipient.name,
                        recipientType: q.leadId ? 'lead' : 'client',
                        recipientCompany: recipient.company,
                        recipientEmail: recipient.email,
                        recipientPhone: recipient.phone,
                        address: estimate.address,
                        latitude: estimate.latitude,
                        longitude: estimate.longitude,
                        roofAreaSqft: estimate.roofAreaSqft,
                        pricePerSqft: estimate.pricePerSqft,
                        manualAdjustment: estimate.manualAdjustment,
                        totalEstimate: estimate.totalEstimate,
                        confidence: estimate.confidence,
                        aiModel: estimate.aiModel,
                        processingTimeSec: estimate.processingTimeSec,
                        snowMode: estimate.snowMode,
                        estimateId: estimate.id,
                        createdAt: estimate.createdAt.toISOString(),
                        notes: estimate.notes || undefined,
                    });

                    emailAttachments.push({
                        filename: fileName,
                        content: buffer,
                        contentType: 'application/pdf',
                    });
                }
            } catch (pdfErr: any) {
                // Log but don't fail the send — quote email is more important
                console.error('⚠️ Failed to generate roof estimate PDF attachment:', pdfErr.message);
            }
        }

        // Send email
        const attachmentNote = emailAttachments.length > 0
            ? `<p style="margin:16px 0 0;font-size:13px;color:#475569;line-height:1.6;">
                📎 <strong>Attached:</strong> Roof Estimate Report (PDF) — AI-powered satellite measurement of the property.
              </p>`
            : '';

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#0891B2,#0E7490);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${company.companyName}</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Estimate Ready for Signature</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <p style="margin:0 0 8px;font-size:16px;color:#0F172A;">Hi ${recipient.name},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Your roofing estimate is ready. Review the scope, totals, and terms, then sign the contract online to approve the work.
    </p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Estimate Number</td>
          <td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${q.quoteNumber}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Valid Until</td>
          <td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${validDate}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Total Amount</td>
          <td style="padding:4px 0;font-size:18px;color:#0891B2;font-weight:700;text-align:right;">${this.formatCurrency(Number(q.total), q.currency || 'CAD')}</td>
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
    <div style="text-align:center;margin:32px 0;">
      <a href="${publicLink}" style="display:inline-block;background:linear-gradient(135deg,#0891B2,#0E7490);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(8,145,178,0.4);">
        Review &amp; Sign Estimate
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.5;">
      This estimate is valid until ${validDate}. If you have any questions, reply to this email and we will help right away.
    </p>
  </div>
  <div style="text-align:center;padding:24px;color:#94A3B8;font-size:12px;">
    <p style="margin:0;">© ${new Date().getFullYear()} ${company.companyName} · All rights reserved</p>
  </div>
</div>
</body>
</html>`;

        await mailerService.sendMail({
            to: recipient.email,
            subject: `Estimate ${q.quoteNumber} ready for signature`,
            html,
            text: `Hi ${recipient.name}, your estimate ${q.quoteNumber} for ${this.formatCurrency(Number(q.total), q.currency || 'CAD')} is ready to review and sign: ${publicLink}`,
            attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });

        quoteSignatureReminderService.cancelReminder(dto.id);
        quoteSignatureReminderService.scheduleReminder({
            tenantId,
            quoteId: dto.id,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            publicLink,
            sentAt,
        });

        // Log activity
        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: dto.id,
            action: 'STATUS_CHANGE', module: 'quotes',
            description: `Estimate "${dto.quoteNumber}" sent for signature to ${recipient.email}${emailAttachments.length > 0 ? ' (with roof estimate PDF)' : ''}`,
            userId: actorEmployeeId,
            metadata: { recipientEmail: recipient.email, publicToken, publicLink, hasRoofEstimatePdf: emailAttachments.length > 0, contractVersion },
        });

        eventBus.emit('quote.statusChanged', {
            tenantId, quoteId: dto.id, quoteNumber: dto.quoteNumber,
            oldStatus: (quote as any).status, newStatus: 'SENT',
            clientId: dto.client?.id, leadId: dto.leadId || undefined,
            total: dto.total, createdById: actorEmployeeId,
            items: dto.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
        });

        return dto;
    }

    // ── Public: get quote by token (tracks views) ───────────────────────────
    async getByPublicToken(token: string) {
        const quote = await this.loadQuoteContractRecord({ publicToken: token });
        if (!quote) throw new NotFoundError('Quote not found or link has expired');

        const now = new Date();
        const nextViewCount = Number((quote as any).viewCount || 0) + 1;
        const isFirstView = !quote.firstViewedAt;
        const nextStatus: QuoteStatusValue = quote.status === 'SENT' ? 'VIEWED' : quote.status;
        const safeViewUpdate = await stripUnsupportedQuoteSignatureFields({
            status: nextStatus,
            viewCount: nextViewCount,
            firstViewedAt: quote.firstViewedAt || now,
            lastViewedAt: now,
            auditTrail: {
                ...(quote.auditTrail && typeof quote.auditTrail === 'object' ? quote.auditTrail as Record<string, unknown> : {}),
                viewCount: nextViewCount,
                firstViewedAt: (quote.firstViewedAt || now).toISOString(),
                lastViewedAt: now.toISOString(),
            } as any,
        });

        const updated = await prisma.quote.update({
            where: { id: quote.id },
            data: safeViewUpdate as any,
            select: {
                id: true,
                status: true,
            },
        }) as { id: string; status: QuoteStatusValue };

        const effectiveQuote = {
            ...quote,
            status: updated.status,
            viewCount: nextViewCount,
            firstViewedAt: quote.firstViewedAt || now,
            lastViewedAt: now,
        };

        if (isFirstView) {
            activityLogger.log({
                tenantId: quote.tenantId,
                entityType: 'Quote',
                entityId: quote.id,
                action: 'STATUS_CHANGE',
                module: 'quotes',
                description: `Estimate "${quote.quoteNumber}" viewed via public link`,
                metadata: { viewCount: nextViewCount },
            });
        }

        const company = await this.getCompanyProfile(quote.tenantId);
        const recipient = this.resolveRecipientProfile(quote);
        return this.buildPublicPayload(effectiveQuote, company, recipient);
    }

    // ── Public: sign or reject quote by token ───────────────────────────────
    async respondToQuote(
        token: string,
        action: 'accept' | 'sign' | 'reject',
        payload?: { signedByName?: string; signatureData?: string; signatureType?: string; ipAddress?: string; userAgent?: string },
    ) {
        const quote = await this.loadQuoteContractRecord({ publicToken: token });
        if (!quote) throw new NotFoundError('Quote not found or link has expired');

        if (!['SENT', 'VIEWED'].includes(String(quote.status))) {
            throw new BadRequestError(`This quote has already been ${quote.status.toLowerCase()}`);
        }

        if (action === 'reject') {
            const rejectedAt = new Date();
            const safeRejectUpdate = await stripUnsupportedQuoteSignatureFields({
                status: 'REJECTED',
                rejectedAt,
                auditTrail: {
                    ...(quote.auditTrail && typeof quote.auditTrail === 'object' ? quote.auditTrail as Record<string, unknown> : {}),
                    rejectedAt: rejectedAt.toISOString(),
                } as any,
            });
            await prisma.quote.update({
                where: { id: quote.id },
                data: safeRejectUpdate as any,
                select: { id: true },
            });

            activityLogger.log({
                tenantId: quote.tenantId,
                entityType: 'Quote',
                entityId: quote.id,
                action: 'STATUS_CHANGE',
                module: 'quotes',
                description: `Estimate "${quote.quoteNumber}" rejected via public link`,
                metadata: { action: 'reject' },
            });

            eventBus.emit('quote.statusChanged', {
                tenantId: quote.tenantId,
                quoteId: quote.id,
                quoteNumber: quote.quoteNumber,
                oldStatus: String(quote.status),
                newStatus: 'REJECTED',
                clientId: quote.clientId || undefined,
                leadId: quote.leadId || undefined,
                total: Number(quote.total),
                items: (quote.items || []).map((item: any) => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    total: Number(item.total),
                })),
            });

            quoteSignatureReminderService.cancelReminder(quote.id);

            return { success: true, status: 'REJECTED', quoteNumber: quote.quoteNumber };
        }

        const signedByName = String(payload?.signedByName || '').trim();
        if (!signedByName) {
            throw new BadRequestError('Full name is required to sign the estimate');
        }

        const signedAt = new Date();
        const company = await this.getCompanyProfile(quote.tenantId);
        const recipient = this.resolveRecipientProfile(quote);
        const contractVersion = Math.max(Number(quote.contractVersion || 0), 1);
        const contractSnapshot = this.buildContractSnapshot(quote, company, recipient, contractVersion);
        const signedPdfFileId = await this.createSignedPdfFile(quote, quote.tenantId, contractSnapshot, {
            signedBy: signedByName,
            signatureType: payload?.signatureType || null,
            signatureData: payload?.signatureData || null,
            signedAt,
        });

        const auditTrail = {
            ...(quote.auditTrail && typeof quote.auditTrail === 'object' ? quote.auditTrail as Record<string, unknown> : {}),
            contractVersion,
            signedBy: signedByName,
            signedAt: signedAt.toISOString(),
            ipAddress: payload?.ipAddress || null,
            userAgent: payload?.userAgent || null,
            viewCount: quote.viewCount || 0,
            firstViewedAt: quote.firstViewedAt ? quote.firstViewedAt.toISOString() : null,
            lastViewedAt: quote.lastViewedAt ? quote.lastViewedAt.toISOString() : null,
            signedPdfFileId,
        };
        const safeSignedUpdate = await stripUnsupportedQuoteSignatureFields({
            status: 'SIGNED',
            isContract: true,
            signedAt,
            acceptedAt: signedAt,
            signedBy: signedByName,
            signatureType: payload?.signatureType || null,
            signatureData: payload?.signatureData || null,
            signerIpAddress: payload?.ipAddress || null,
            signerUserAgent: payload?.userAgent || null,
            contractSnapshot: contractSnapshot as any,
            auditTrail: auditTrail as any,
            signedPdfFileId,
        });

        await prisma.quote.update({
            where: { id: quote.id },
            data: safeSignedUpdate as any,
            select: { id: true },
        });

        activityLogger.log({
            tenantId: quote.tenantId,
            entityType: 'Quote',
            entityId: quote.id,
            action: 'STATUS_CHANGE',
            module: 'quotes',
            description: `Estimate "${quote.quoteNumber}" signed by ${signedByName}`,
            metadata: { action: 'sign', signedByName, signatureType: payload?.signatureType || null, signedPdfFileId },
        });

        eventBus.emit('quote.statusChanged', {
            tenantId: quote.tenantId,
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            oldStatus: String(quote.status),
            newStatus: 'SIGNED',
            clientId: quote.clientId || undefined,
            leadId: quote.leadId || undefined,
            total: Number(quote.total),
            items: (quote.items || []).map((item: any) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                total: Number(item.total),
            })),
        });

        quoteSignatureReminderService.cancelReminder(quote.id);
        await this.notifyQuoteSigner(quote, signedByName);

        return { success: true, status: 'SIGNED', quoteNumber: quote.quoteNumber, signedPdfFileId };
    }
}

export const quotesService = new QuotesService();

// ── Stage 3B: Create Quote from AI Estimate ─────────────────────────────

/**
 * Auto-populate a quote from an AI roof estimate.
 * Loads the estimate + takeoff data and populates line items.
 */
export async function createQuoteFromEstimate(
    tenantId: string,
    estimateId: string,
    overrides?: {
        leadId?: string;
        clientId?: string;
        taxRate?: number;
        paymentScheduleType?: string;
        warrantySelected?: string;
        validDays?: number;
        notes?: string;
    },
    createdById?: string,
) {
    // 1. Load the AI estimate
    const estimate = await prisma.roofEstimate.findFirst({
        where: { id: estimateId, tenantId },
    });

    if (!estimate) {
        throw new BadRequestError('AI estimate not found. Cannot create quote without a completed estimate.');
    }

    if (estimate.roofAreaSqft <= 0) {
        throw new BadRequestError('AI estimate has no roof area. Please run the AI estimator first.');
    }

    // 2. Load material takeoffs (if available)
    const takeoffs = await prisma.roofTakeoff.findMany({
        where: { estimateId, tenantId },
        orderBy: { createdAt: 'desc' },
        take: 1,
    });

    const takeoffData = takeoffs.length > 0 ? (takeoffs[0] as any) : null;

    // 3. Build line items from takeoff or estimate data
    const items: Array<{ description: string; quantity: number; unitPrice: number; total: number; sortOrder: number }> = [];

    if (takeoffData?.items && Array.isArray(takeoffData.items)) {
        // Use detailed takeoff data
        (takeoffData.items as any[]).forEach((item: any, idx: number) => {
            items.push({
                description: item.description || 'Material',
                quantity: Number(item.totalQuantity || item.quantity || 1),
                unitPrice: Number(item.unitPrice || 0),
                total: Number(item.totalPrice || item.total || 0),
                sortOrder: idx,
            });
        });
    } else {
        // Fallback: create basic line items from estimate data
        const roofArea = estimate.roofAreaSqft;
        const pricePerSqft = estimate.pricePerSqft || 5.50;
        const materialCost = roofArea * pricePerSqft * 0.45; // ~45% materials
        const laborCost = roofArea * pricePerSqft * 0.40;    // ~40% labor
        const overheadCost = roofArea * pricePerSqft * 0.10; // ~10% overhead
        const permitCost = 350;                               // flat permit fee

        items.push(
            { description: 'Roofing Materials (Shingles, Underlayment, Flashing)', quantity: 1, unitPrice: Math.round(materialCost * 100) / 100, total: Math.round(materialCost * 100) / 100, sortOrder: 0 },
            { description: 'Labor — Roof Installation', quantity: 1, unitPrice: Math.round(laborCost * 100) / 100, total: Math.round(laborCost * 100) / 100, sortOrder: 1 },
            { description: 'Tear-off & Disposal', quantity: 1, unitPrice: Math.round(overheadCost * 100) / 100, total: Math.round(overheadCost * 100) / 100, sortOrder: 2 },
            { description: 'Permits & Inspection', quantity: 1, unitPrice: permitCost, total: permitCost, sortOrder: 3 },
        );
    }

    // 4. Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = overrides?.taxRate ?? 13; // default 13% HST
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = subtotal + taxAmount;

    // 5. Calculate valid until date
    const validDays = overrides?.validDays ?? 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    // 6. Create the quote
    return quotesService.create(
        tenantId,
        {
            leadId: overrides?.leadId || estimate.leadId || null,
            clientId: overrides?.clientId || estimate.clientId || null,
            validUntil: validUntil.toISOString(),
            taxRate,
            roofEstimateId: estimateId,
            paymentScheduleType: overrides?.paymentScheduleType || null,
            warrantySelected: overrides?.warrantySelected || null,
            validDays,
            notes: overrides?.notes || `Auto-generated from AI Estimate (${estimate.address}). Roof area: ${estimate.roofAreaSqft.toLocaleString()} sq ft.`,
            items,
        },
        createdById,
    );
}
