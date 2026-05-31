import { ContractStatus } from '@prisma/client';
import { contractsRepository } from './contracts.repository';
import { CreateContractDto, UpdateContractDto, ContractQueryDto, toContractResponseDto } from './contracts.dto';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { documentsService } from '../documents/documents.service';
import { filesService } from '../files/files.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { eventBus } from '../../common/events/event-bus';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { invoicesService } from '../invoices/invoices.service';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const db = prisma as any;

export class ContractsService {
    private escapeHtml(value: string | null | undefined) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private formatCurrency(value: number | string, currency = 'CAD') {
        const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
        return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(Number.isFinite(amount) ? amount : 0);
    }

    private async getCompanyProfile(tenantId: string) {
        const settings = await prisma.tenantSettings.findUnique({
            where: { tenantId },
            include: { tenant: { select: { name: true, logo: true } } },
        });
        const integrations = settings?.integrations && typeof settings.integrations === 'object'
            ? settings.integrations as Record<string, unknown>
            : {};
        return {
            companyName: String(integrations.companyName ?? settings?.tenant?.name ?? 'ZODO CRM'),
            email: String(integrations.companyEmail ?? '') || undefined,
            phone: String(integrations.companyPhone ?? '') || undefined,
            logoUrl: settings?.tenant?.logo || null,
        };
    }

    private async loadLogoEmailAttachment(logoUrl: string | null | undefined) {
        const value = String(logoUrl || '').trim();
        if (!value || /^https?:\/\//i.test(value) || value.startsWith('data:image/')) {
            return null;
        }

        const relativePath = value.startsWith('/uploads/')
            ? value.replace(/^\/uploads\/?/, '')
            : value.replace(/^\/+/, '');
        const absolutePath = path.resolve(config.upload.uploadPath, relativePath);
        const extension = path.extname(absolutePath).toLowerCase();
        const contentType = extension === '.png'
            ? 'image/png'
            : extension === '.jpg' || extension === '.jpeg'
                ? 'image/jpeg'
                : extension === '.webp'
                    ? 'image/webp'
                    : null;
        if (!contentType) return null;

        try {
            return {
                filename: `company-logo${extension}`,
                content: await fs.readFile(absolutePath),
                contentType,
                cid: 'tenant-company-logo',
                contentDisposition: 'inline' as const,
            };
        } catch {
            return null;
        }
    }

    private isAuthenticationError(errorMessage: string) {
        const normalized = errorMessage.toLowerCase();
        return normalized.includes('invalid login')
            || normalized.includes('authentication failed')
            || normalized.includes('535')
            || normalized.includes('username')
            || normalized.includes('password');
    }

    private buildContractEmailContent(params: {
        contract: any;
        company: { companyName: string; email?: string; phone?: string };
        recipientName: string;
        logoCid?: string | null;
    }) {
        const { contract, company, recipientName, logoCid } = params;
        const contractNumber = String(contract.contractNumber || contract.id);
        const value = this.formatCurrency(Number(contract.value || 0), contract.currency || 'CAD');
        const startDate = contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '-';
        const endDate = contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '-';
        const logoHtml = logoCid
            ? `<img src="cid:${logoCid}" alt="${this.escapeHtml(company.companyName || 'Company')} logo" style="display:block;margin:0 auto 14px;max-width:150px;max-height:64px;width:auto;height:auto;border:0;outline:none;text-decoration:none;" />`
            : '';
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#115E59);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    ${logoHtml}
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">${this.escapeHtml(company.companyName || 'ZODO CRM')}</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.88);font-size:14px;">Contract Ready</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <p style="margin:0 0 8px;font-size:16px;color:#0F172A;">Hi ${this.escapeHtml(recipientName)},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Your contract is attached as a PDF. Please review it and contact us if you need any changes before signing.
    </p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-size:13px;color:#64748B;">Contract Number</td><td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${this.escapeHtml(contractNumber)}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#64748B;">Title</td><td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${this.escapeHtml(contract.title || 'Sales Contract')}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#64748B;">Start Date</td><td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${this.escapeHtml(startDate)}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#64748B;">End Date</td><td style="padding:4px 0;font-size:13px;color:#0F172A;font-weight:600;text-align:right;">${this.escapeHtml(endDate)}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#64748B;">Value</td><td style="padding:4px 0;font-size:18px;color:#0F766E;font-weight:700;text-align:right;">${this.escapeHtml(value)}</td></tr>
      </table>
    </div>
    <p style="margin:0;font-size:13px;color:#64748B;">Thank you,<br>${this.escapeHtml(company.companyName || 'ZODO CRM')}</p>
  </div>
</div>
</body>
</html>`;
        const text = [
            `Hi ${recipientName},`,
            '',
            `Your contract ${contractNumber} is attached as a PDF.`,
            `Title: ${contract.title || 'Sales Contract'}`,
            `Start date: ${startDate}`,
            `End date: ${endDate}`,
            `Value: ${value}`,
            '',
            `Thank you,`,
            company.companyName || 'ZODO CRM',
        ].join('\n');
        return { html, text };
    }

    private emitStatusEvent(contract: any, tenantId: string, status: ContractStatus, overrides: Record<string, unknown> = {}) {
        if (status === 'SENT') {
            eventBus.emit('contract.sent', {
                tenantId,
                contractId: contract.id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                contactId: contract.contactId || undefined,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                recipientEmail: overrides.recipientEmail || contract.contact?.email || contract.client?.primaryEmail || undefined,
                ownerUserId: contract.createdBy?.userId || undefined,
                ...overrides,
            });
        }
        if (status === 'ACTIVE') {
            eventBus.emit('contract.signed', {
                tenantId,
                contractId: contract.id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                contactId: contract.contactId || undefined,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                signedAt: contract.signedAt || undefined,
                recipientEmail: contract.contact?.email || contract.client?.primaryEmail || undefined,
                ownerUserId: contract.createdBy?.userId || undefined,
            });
        }
        if (status === 'CANCELLED') {
            eventBus.emit('contract.declined', {
                tenantId,
                contractId: contract.id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                contactId: contract.contactId || undefined,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                ownerUserId: contract.createdBy?.userId || undefined,
            });
        }
        if (status === 'EXPIRED') {
            eventBus.emit('contract.expired', {
                tenantId,
                contractId: contract.id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                contactId: contract.contactId || undefined,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                expiredAt: new Date(),
                ownerUserId: contract.createdBy?.userId || undefined,
            });
        }
    }

    private async validateContractLinks(tenantId: string, data: Partial<CreateContractDto | UpdateContractDto>) {
        if (data.clientId) {
            const client = await prisma.client.findFirst({ where: { id: data.clientId, tenantId }, select: { id: true } });
            if (!client) throw new BadRequestError('Client does not exist for this tenant.');
        }
        if ((data as any).contactId) {
            const contact = await prisma.contact.findFirst({ where: { id: (data as any).contactId, tenantId }, select: { id: true, companyId: true } });
            if (!contact) throw new BadRequestError('Contact does not exist for this tenant.');
            if (data.clientId && contact.companyId && contact.companyId !== data.clientId) {
                throw new BadRequestError('Contact does not belong to the selected company.');
            }
        }
        if (data.quoteId) {
            const quote = await prisma.quote.findFirst({ where: { id: data.quoteId, tenantId }, select: { id: true } });
            if (!quote) throw new BadRequestError('Proposal does not exist for this tenant.');
        }
        if (data.projectId) {
            const deal = await prisma.project.findFirst({ where: { id: data.projectId, tenantId }, select: { id: true } });
            if (!deal) throw new BadRequestError('Deal does not exist for this tenant.');
        }
    }

    async create(tenantId: string, data: CreateContractDto, createdById?: string) {
        await this.validateContractLinks(tenantId, data);
        const contract = await contractsRepository.create(tenantId, data, createdById);
        eventBus.emit('contract.created', {
            tenantId,
            contractId: contract.id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id || (contract as any).clientId || undefined,
                contactId: (contract as any).contactId || undefined,
                projectId: contract.projectId || undefined,
            quoteId: contract.quoteId || undefined,
            value: contract.value ? Number(contract.value) : undefined,
        });
        return toContractResponseDto(contract);
    }

    async getById(id: string, tenantId: string) {
        const contract = await contractsRepository.findById(id, tenantId);
        if (!contract) throw new NotFoundError('Contract not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toContractResponseDto(contract);
    }

    async getMany(tenantId: string, query: ContractQueryDto) {
        const { data, total } = await contractsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        return {
            data: data.map(toContractResponseDto),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async update(id: string, tenantId: string, data: UpdateContractDto) {
        await this.validateContractLinks(tenantId, data);
        const contract = await contractsRepository.update(id, tenantId, data);
        return toContractResponseDto(contract);
    }

    async updateStatus(id: string, tenantId: string, status: ContractStatus, actorUserId?: string, eventOverrides: Record<string, unknown> = {}) {
        const contract = await contractsRepository.updateStatus(id, tenantId, status);
        this.emitStatusEvent(contract, tenantId, status, eventOverrides);
        return toContractResponseDto(contract);
    }

    async send(id: string, tenantId: string, actorUserId?: string) {
        const existing = await contractsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Contract not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const recipientEmail = String((existing as any).contact?.email || (existing as any).client?.primaryEmail || '').trim();
        if (!recipientEmail) {
            throw new BadRequestError('A recipient email is required before sending the contract.', ErrorCodes.INVALID_INPUT);
        }

        const company = await this.getCompanyProfile(tenantId);
        const recipientName = (existing as any).contact?.contactName || (existing as any).client?.clientName || 'Customer';
        const { buffer, fileName } = await this.generatePdf(id, tenantId);
        const logoAttachment = await this.loadLogoEmailAttachment(company.logoUrl);
        const emailContent = this.buildContractEmailContent({ contract: existing, company, recipientName, logoCid: logoAttachment?.cid || null });
        const attachments = [
            { filename: fileName, content: buffer, contentType: 'application/pdf' },
            ...(logoAttachment ? [logoAttachment] : []),
        ];
        const delivery = await tenantMailerService.sendTenantEmail({
            tenantId,
            preferredUserId: actorUserId,
            to: recipientEmail,
            subject: `Contract ${existing.contractNumber} from ${company.companyName}`,
            html: emailContent.html,
            text: emailContent.text,
            relatedEntityType: 'Contract',
            relatedEntityId: id,
            attachments,
        });
        if (!delivery.sent) {
            const errorMessage = delivery.error || 'Check the configured SMTP credentials and try again.';
            if (this.isAuthenticationError(errorMessage)) {
                throw new BadRequestError(`Contract email delivery failed because the configured SMTP credentials were rejected. ${errorMessage}`, ErrorCodes.INVALID_INPUT);
            }
            throw new ServiceUnavailableError(`Contract email delivery failed. ${errorMessage}`);
        }

        const contract = await this.updateStatus(id, tenantId, 'SENT', actorUserId, {
            emailAlreadySent: true,
            recipientEmail,
        });
        activityLogger.log({
            tenantId,
            entityType: 'Contract',
            entityId: id,
            action: 'STATUS_CHANGE',
            module: 'contracts',
            description: `Contract "${contract.contractNumber}" emailed to ${recipientEmail}`,
            userId: actorUserId,
            metadata: { recipientEmail, senderEmail: delivery.senderEmail },
        });
        return contract;
    }

    async sign(id: string, tenantId: string, actorUserId?: string) {
        const contract = await this.updateStatus(id, tenantId, 'ACTIVE', actorUserId);
        activityLogger.log({
            tenantId,
            entityType: 'Contract',
            entityId: id,
            action: 'STATUS_CHANGE',
            module: 'contracts',
            description: `Contract "${contract.contractNumber}" signed`,
            userId: actorUserId,
        });
        return contract;
    }

    async decline(id: string, tenantId: string, actorUserId?: string, reason?: string) {
        const contract = await this.updateStatus(id, tenantId, 'CANCELLED', actorUserId);
        activityLogger.log({
            tenantId,
            entityType: 'Contract',
            entityId: id,
            action: 'STATUS_CHANGE',
            module: 'contracts',
            description: `Contract "${contract.contractNumber}" declined${reason ? `: ${reason}` : ''}`,
            userId: actorUserId,
            metadata: reason ? { reason } : undefined,
        });
        return contract;
    }

    async generatePdf(id: string, tenantId: string): Promise<{ buffer: Buffer; fileName: string }> {
        const contract = await contractsRepository.findById(id, tenantId);
        if (!contract) throw new Error('Contract not found');

        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
        const margin = 18;
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 24;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Contract', margin, y);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text((contract as any).contractNumber || id, pageWidth - margin, y, { align: 'right' });
        y += 14;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text((contract as any).title || 'Sales Contract', margin, y);
        y += 8;

        const rows = [
            ['Client', (contract as any).client?.clientName || ''],
            ['Status', String((contract as any).status || '')],
            ['Value', `${(contract as any).currency || 'CAD'} ${Number((contract as any).value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Start Date', new Date((contract as any).startDate).toLocaleDateString()],
            ['End Date', new Date((contract as any).endDate).toLocaleDateString()],
            ['Signed At', (contract as any).signedAt ? new Date((contract as any).signedAt).toLocaleString() : 'Not signed'],
        ];

        doc.setFontSize(10);
        rows.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value || '-'), margin + 34, y);
            y += 7;
        });

        const addSection = (title: string, content?: string | null) => {
            if (!content) return;
            y += 4;
            if (y > 250) {
                doc.addPage();
                y = 24;
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(title, margin, y);
            y += 7;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const lines = doc.splitTextToSize(String(content), pageWidth - margin * 2);
            doc.text(lines, margin, y);
            y += lines.length * 5;
        };

        addSection('Description', (contract as any).description);
        addSection('Terms', (contract as any).terms);
        addSection('Notes', (contract as any).notes);

        const buffer = Buffer.from(doc.output('arraybuffer'));
        const contractNumber = String((contract as any).contractNumber || id).replace(/[^a-zA-Z0-9._-]/g, '_');
        return { buffer, fileName: `contract-${contractNumber}.pdf` };
    }

    async saveContractPdfToDocuments(
        tenantId: string,
        contractId: string,
        actorUserId?: string,
        variant: 'sent' | 'signed' = 'sent',
    ) {
        const contract = await contractsRepository.findById(contractId, tenantId);
        if (!contract) throw new Error('Contract not found');

        const description = variant === 'signed' ? 'Signed contract PDF' : 'Contract PDF';
        const existing = await db.file.findFirst({
            where: {
                tenantId,
                deletedAt: null,
                documentMetadata: {
                    is: {
                        linkedEntityType: 'Contract',
                        linkedEntityId: contractId,
                        documentType: 'pdf',
                        description,
                    },
                },
            },
        });
        if (existing) return documentsService.get(existing.id, tenantId);

        const { buffer, fileName } = await this.generatePdf(contractId, tenantId);
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
            clientId: (contract as any).client?.id || (contract as any).clientId || null,
            projectId: (contract as any).projectId || null,
            quoteId: (contract as any).quoteId || null,
        });
        const categories = await documentsService.categories(tenantId);
        const contractsCategory = categories.find((category: any) => String(category.name).toLowerCase() === 'contracts');
        const document = await documentsService.update(saved.id, tenantId, {
            categoryId: contractsCategory?.id,
            documentType: 'pdf',
            linkedEntityType: 'Contract',
            linkedEntityId: contractId,
            description,
        });
        await db.documentMetadata.updateMany({
            where: { tenantId, fileId: saved.id },
            data: {
                metadata: {
                    variant,
                    relatedEntities: {
                        contractId,
                        dealId: (contract as any).projectId || null,
                        projectId: (contract as any).projectId || null,
                        quoteId: (contract as any).quoteId || null,
                        clientId: (contract as any).client?.id || (contract as any).clientId || null,
                        contactId: (contract as any).contactId || null,
                    },
                },
            },
        }).catch(() => null);
        activityLogger.log({
            tenantId,
            entityType: 'Contract',
            entityId: contractId,
            action: 'UPDATE',
            module: 'documents',
            description: `Saved ${variant === 'signed' ? 'signed ' : ''}contract PDF to Documents`,
            userId: actorUserId,
            metadata: { fileId: saved.id, variant },
        });
        return document;
    }

    async createInvoiceFromContract(contractId: string, tenantId: string) {
        const contract = await contractsRepository.findById(contractId, tenantId);
        if (!contract) throw new NotFoundError('Contract not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const existing = await prisma.invoice.findFirst({
            where: {
                tenantId,
                clientId: (contract as any).clientId,
                ...(contract.quoteId ? { quoteId: contract.quoteId } : {}),
                ...(contract.projectId ? { projectId: contract.projectId } : {}),
                notes: { contains: `Contract: ${contract.contractNumber}` },
            },
            include: { client: true, items: true, payments: true },
        });
        if (existing) return existing;

        const quoteItems = Array.isArray((contract as any).quote?.items) ? (contract as any).quote.items : [];
        const items = quoteItems.length > 0
            ? quoteItems.map((item: any, index: number) => ({
                description: item.description || `Contract item ${index + 1}`,
                quantity: Number(item.quantity || 1),
                unitPrice: Number(item.unitPrice || item.rate || 0),
                amount: Number(item.total || item.amount || (Number(item.quantity || 1) * Number(item.unitPrice || item.rate || 0))),
                sortOrder: index,
            }))
            : [{
                description: (contract as any).title || `Contract ${contract.contractNumber}`,
                quantity: 1,
                unitPrice: Number((contract as any).value || 0),
                amount: Number((contract as any).value || 0),
                sortOrder: 0,
            }];

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const invoiceNumber = await this.generateInvoiceNumber(tenantId);
        return invoicesService.create(tenantId, {
            invoiceNumber,
            clientId: (contract as any).clientId,
            contactId: (contract as any).contactId || undefined,
            quoteId: (contract as any).quoteId || undefined,
            projectId: (contract as any).projectId || undefined,
            contractId,
            issueDate: new Date().toISOString(),
            dueDate: dueDate.toISOString(),
            currency: (contract as any).currency || 'CAD',
            taxRate: 0,
            discountAmount: 0,
            notes: `Contract: ${contract.contractNumber}`,
            terms: (contract as any).terms || undefined,
            items,
        } as any);
    }

    private async generateInvoiceNumber(tenantId: string): Promise<string> {
        const count = await prisma.invoice.count({ where: { tenantId } });
        let next = count + 1;
        while (true) {
            const candidate = `INV-${String(next).padStart(5, '0')}`;
            const existing = await prisma.invoice.findFirst({ where: { tenantId, invoiceNumber: candidate }, select: { id: true } });
            if (!existing) return candidate;
            next += 1;
        }
    }

    async delete(id: string, tenantId: string) {
        await contractsRepository.delete(id, tenantId);
    }
}

export const contractsService = new ContractsService();
