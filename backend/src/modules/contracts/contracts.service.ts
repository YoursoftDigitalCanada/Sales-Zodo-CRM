import { ContractStatus } from '@prisma/client';
import { contractsRepository } from './contracts.repository';
import { CreateContractDto, UpdateContractDto, ContractQueryDto, toContractResponseDto } from './contracts.dto';
import { prisma } from '../../config/database';
import { documentsService } from '../documents/documents.service';
import { filesService } from '../files/files.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { invoicesService } from '../invoices/invoices.service';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const db = prisma as any;

export class ContractsService {
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

    async updateStatus(id: string, tenantId: string, status: ContractStatus, actorUserId?: string) {
        const contract = await contractsRepository.updateStatus(id, tenantId, status);
        if (status === 'SENT') {
            eventBus.emit('contract.sent', {
                tenantId,
                contractId: id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                contactId: (contract as any).contactId || undefined,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                recipientEmail: (contract as any).client?.primaryEmail || undefined,
                ownerUserId: (contract as any).createdBy?.userId || undefined,
            });
        }
        if (status === 'ACTIVE') {
            eventBus.emit('contract.signed', {
                tenantId,
                contractId: id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                contactId: (contract as any).contactId || undefined,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                signedAt: contract.signedAt || undefined,
                recipientEmail: (contract as any).client?.primaryEmail || undefined,
                ownerUserId: (contract as any).createdBy?.userId || undefined,
            });
        }
        if (status === 'CANCELLED') {
            eventBus.emit('contract.declined', {
                tenantId,
                contractId: id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                contactId: (contract as any).contactId || undefined,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                ownerUserId: (contract as any).createdBy?.userId || undefined,
            });
        }
        if (status === 'EXPIRED') {
            eventBus.emit('contract.expired', {
                tenantId,
                contractId: id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                contactId: (contract as any).contactId || undefined,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                expiredAt: new Date(),
                ownerUserId: (contract as any).createdBy?.userId || undefined,
            });
        }
        return toContractResponseDto(contract);
    }

    async send(id: string, tenantId: string, actorUserId?: string) {
        const contract = await this.updateStatus(id, tenantId, 'SENT', actorUserId);
        activityLogger.log({
            tenantId,
            entityType: 'Contract',
            entityId: id,
            action: 'STATUS_CHANGE',
            module: 'contracts',
            description: `Contract "${contract.contractNumber}" sent`,
            userId: actorUserId,
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
        return invoicesService.create(tenantId, {
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

    async delete(id: string, tenantId: string) {
        await contractsRepository.delete(id, tenantId);
    }
}

export const contractsService = new ContractsService();
