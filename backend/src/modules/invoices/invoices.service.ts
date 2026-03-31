import { invoicesRepository } from './invoices.repository';
import { toInvoiceResponseDto } from './invoices.dto';
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from '@contracts/invoice';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { prisma } from '../../config/database';
import { config } from '../../config';
import fs from 'fs/promises';
import path from 'path';

interface CompanyProfile {
    companyName: string;
    email?: string;
    phone?: string;
    address?: string;
    logoUrl?: string | null;
}

export class InvoicesService {
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

    async create(tenantId: string, data: CreateInvoiceDto) {
        const invoice = await invoicesRepository.create(tenantId, data);
        const dto = toInvoiceResponseDto(invoice);

        eventBus.emit('invoice.created', {
            tenantId,
            invoiceId: dto.id,
            invoiceNumber: (invoice as any).invoiceNumber || '',
            clientId: (invoice as any).clientId,
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
        return toInvoiceResponseDto(invoice);
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
        const invoice = await invoicesRepository.update(id, tenantId, data);
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

    async sendInvoice(id: string, tenantId: string, recipientEmail?: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);

        // Mark invoice as SENT
        const invoice = await invoicesRepository.update(id, tenantId, { status: 'SENT' } as any);
        const dto = toInvoiceResponseDto(invoice);

        // Domain event: invoice sent
        eventBus.emit('invoice.sent', {
            tenantId,
            invoiceId: id,
            invoiceNumber: (existing as any).invoiceNumber || '',
            clientId: (existing as any).clientId || (existing as any).client?.id,
            recipientEmail,
        });

        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: id,
            action: 'STATUS_CHANGE', module: 'invoices',
            description: `Invoice "${(existing as any).invoiceNumber || id}" sent${recipientEmail ? ` to ${recipientEmail}` : ''}`,
            metadata: { newStatus: 'SENT', recipientEmail },
        });

        return dto;
    }

    async markAsPaid(id: string, tenantId: string, actorUserId?: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const oldStatus = (existing as any).status || 'UNPAID';
        const invoice = await invoicesRepository.markAsPaid(id, tenantId);
        const dto = toInvoiceResponseDto(invoice);

        // Domain event: invoice status changed
        eventBus.emit('invoice.statusChanged', {
            tenantId,
            invoiceId: id,
            invoiceNumber: (existing as any).invoiceNumber || '',
            oldStatus,
            newStatus: 'PAID',
            clientId: (existing as any).clientId || (existing as any).client?.id,
            ownerUserId: actorUserId,
        });

        // Lifecycle: paying client → ACTIVE
        const clientId = (existing as any).clientId || (existing as any).client?.id;
        if (clientId) {
            await clientLifecycleService.progressTo(clientId, tenantId, 'ACTIVE');
            await clientLifecycleService.reinforceEngagement(clientId, tenantId);
        }

        // Domain event: payment received (semantic alias for automation triggers)
        eventBus.emit('payment.received', {
            tenantId,
            invoiceId: id,
            invoiceNumber: (existing as any).invoiceNumber || '',
            clientId,
            amount: (existing as any).totalAmount || (existing as any).total,
            paidByUserId: actorUserId,
        });

        // Timeline: log payment (single entry — avoids duplicate with statusChanged)
        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: id,
            action: 'STATUS_CHANGE', module: 'invoices',
            description: `Invoice "${(existing as any).invoiceNumber || id}" marked as paid`,
            userId: actorUserId,
            metadata: { oldStatus, newStatus: 'PAID', clientId },
        });

        return dto;
    }
}

export const invoicesService = new InvoicesService();
