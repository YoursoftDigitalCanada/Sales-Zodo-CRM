import { quotesRepository } from './quotes.repository';
import { CreateQuoteDto, UpdateQuoteDto, QuoteQueryDto, toQuoteResponseDto } from './quotes.dto';
import { NotFoundError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { mailerService } from '../../common/services/mailer.service';
import { config } from '../../config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export class QuotesService {
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

        // Build update data with semantic timestamps
        const updateData: any = { status };
        if (status === 'SENT' && !(existing as any).sentAt) updateData.sentAt = new Date();
        if (status === 'ACCEPTED' && !(existing as any).acceptedAt) updateData.acceptedAt = new Date();

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

    // ── Send quote via email ────────────────────────────────────────────────
    async sendQuote(id: string, tenantId: string, actorEmployeeId?: string) {
        const quote = await quotesRepository.findById(id, tenantId);
        if (!quote) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const q = quote as any;

        // Resolve recipient email
        let recipientEmail: string | undefined;
        let recipientName = 'there';

        if (q.leadId) {
            const lead = await prisma.lead.findUnique({ where: { id: q.leadId } });
            if (lead) {
                recipientEmail = lead.email || undefined;
                recipientName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.companyName || 'there';
            }
        } else if (q.clientId) {
            const client = await prisma.client.findUnique({ where: { id: q.clientId } });
            if (client) {
                recipientEmail = client.primaryEmail || undefined;
                recipientName = client.clientName || 'there';
            }
        }

        if (!recipientEmail) {
            throw new BadRequestError('No email address found for the recipient');
        }

        // Generate public token if not already present
        const publicToken = q.publicToken || randomUUID();

        // Update status to SENT
        const updateData: any = { status: 'SENT', sentAt: new Date(), publicToken };
        const updated = await quotesRepository.update(id, tenantId, updateData);
        const dto = toQuoteResponseDto(updated);

        // Build the public link
        const frontendUrl = config.frontend.url.replace(/\/$/, '');
        const publicLink = `${frontendUrl}/quote/${publicToken}`;

        // Format currency helper
        const fmtCurrency = (val: number | string) => {
            const n = typeof val === 'string' ? parseFloat(val) : val;
            return new Intl.NumberFormat('en-CA', { style: 'currency', currency: q.currency || 'CAD' }).format(n);
        };

        // Build items HTML
        const itemsHtml = (q.items || []).map((item: any) =>
            `<tr>
                <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#334155;">${item.description}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#334155;text-align:center;">${item.quantity}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#334155;text-align:right;">${fmtCurrency(item.unitPrice)}</td>
                <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#334155;text-align:right;">${fmtCurrency(item.total)}</td>
            </tr>`
        ).join('');

        const validDate = new Date(q.validUntil).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

        // Send email
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:40px 20px;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0891B2,#0E7490);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">ZODO</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Quote</p>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <p style="margin:0 0 8px;font-size:16px;color:#0F172A;">Hi ${recipientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      You've received a new quote from <strong>ZODO</strong>. Please review the details below and click the button to accept or decline.
    </p>

    <!-- Quote Summary -->
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Quote Number</td>
          <td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${q.quoteNumber}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Valid Until</td>
          <td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${validDate}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#64748B;">Total Amount</td>
          <td style="padding:4px 0;font-size:18px;color:#0891B2;font-weight:700;text-align:right;">${fmtCurrency(q.total)}</td>
        </tr>
      </table>
    </div>

    <!-- Line Items -->
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

    <!-- CTA Button -->
    <div style="text-align:center;margin:32px 0;">
      <a href="${publicLink}" style="display:inline-block;background:linear-gradient(135deg,#0891B2,#0E7490);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(8,145,178,0.4);">
        View &amp; Respond to Quote
      </a>
    </div>

    <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.5;">
      This quote is valid until ${validDate}. If you have any questions, please contact us directly.
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:24px;color:#94A3B8;font-size:12px;">
    <p style="margin:0;">© ${new Date().getFullYear()} ZODO · All rights reserved</p>
  </div>
</div>
</body>
</html>`;

        await mailerService.sendMail({
            to: recipientEmail,
            subject: `Quote ${q.quoteNumber} from ZODO`,
            html,
            text: `Hi ${recipientName}, you've received quote ${q.quoteNumber} for ${fmtCurrency(q.total)}. View and respond: ${publicLink}`,
        });

        // Log activity
        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: dto.id,
            action: 'STATUS_CHANGE', module: 'quotes',
            description: `Quote "${dto.quoteNumber}" sent to ${recipientEmail}`,
            userId: actorEmployeeId,
            metadata: { recipientEmail, publicToken },
        });

        // Emit event
        eventBus.emit('quote.statusChanged', {
            tenantId, quoteId: dto.id, quoteNumber: dto.quoteNumber,
            oldStatus: (quote as any).status, newStatus: 'SENT',
            clientId: dto.client?.id, leadId: dto.leadId || undefined,
            total: dto.total, createdById: actorEmployeeId,
            items: dto.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
        });

        return dto;
    }

    // ── Public: get quote by token (no auth) ────────────────────────────────
    async getByPublicToken(token: string) {
        const quote = await prisma.quote.findUnique({
            where: { publicToken: token },
            include: {
                client: { select: { id: true, clientName: true } },
                items: { orderBy: { sortOrder: 'asc' } },
                tenant: { select: { id: true } },
            },
        });
        if (!quote) throw new NotFoundError('Quote not found or link has expired');

        // Also resolve lead name if present
        let leadName: string | undefined;
        if (quote.leadId) {
            const lead = await prisma.lead.findUnique({ where: { id: quote.leadId } });
            if (lead) {
                leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.companyName || undefined;
            }
        }

        return {
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            status: quote.status,
            clientName: (quote as any).client?.clientName || leadName || 'Unknown',
            recipientType: quote.leadId ? 'lead' : 'client',
            issueDate: quote.issueDate,
            validUntil: quote.validUntil,
            currency: quote.currency,
            subtotal: Number(quote.subtotal),
            taxRate: quote.taxRate ? Number(quote.taxRate) : 0,
            taxAmount: Number(quote.taxAmount),
            discountAmount: Number(quote.discountAmount),
            total: Number(quote.total),
            notes: quote.notes,
            terms: quote.terms,
            items: ((quote as any).items || []).map((i: any) => ({
                description: i.description,
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                total: Number(i.total),
            })),
        };
    }

    // ── Public: accept or reject quote by token ─────────────────────────────
    async respondToQuote(token: string, action: 'accept' | 'reject') {
        const quote = await prisma.quote.findUnique({ where: { publicToken: token } });
        if (!quote) throw new NotFoundError('Quote not found or link has expired');

        if (quote.status !== 'SENT') {
            throw new BadRequestError(`This quote has already been ${quote.status.toLowerCase()}`);
        }

        const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
        const updateData: any = { status: newStatus };
        if (action === 'accept') updateData.acceptedAt = new Date();

        await prisma.quote.update({ where: { id: quote.id }, data: updateData });

        // Log & emit event
        activityLogger.log({
            tenantId: quote.tenantId, entityType: 'Quote', entityId: quote.id,
            action: 'STATUS_CHANGE', module: 'quotes',
            description: `Quote "${quote.quoteNumber}" ${newStatus.toLowerCase()} via public link`,
            metadata: { action, newStatus },
        });

        eventBus.emit('quote.statusChanged', {
            tenantId: quote.tenantId,
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            oldStatus: 'SENT',
            newStatus,
            clientId: quote.clientId || undefined,
            leadId: quote.leadId || undefined,
            total: Number(quote.total),
            items: [],
        });

        return { success: true, status: newStatus, quoteNumber: quote.quoteNumber };
    }
}

export const quotesService = new QuotesService();
