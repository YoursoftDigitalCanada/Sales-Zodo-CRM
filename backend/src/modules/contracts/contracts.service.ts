import { ContractStatus } from '@prisma/client';
import { contractsRepository } from './contracts.repository';
import { CreateContractDto, UpdateContractDto, ContractQueryDto, toContractResponseDto } from './contracts.dto';
import { prisma } from '../../config/database';
import { documentsService } from '../documents/documents.service';
import { filesService } from '../files/files.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const db = prisma as any;

export class ContractsService {
    async create(tenantId: string, data: CreateContractDto, createdById?: string) {
        const contract = await contractsRepository.create(tenantId, data, createdById);
        eventBus.emit('contract.created', {
            tenantId,
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            clientId: contract.client?.id || (contract as any).clientId || undefined,
            projectId: contract.projectId || undefined,
            quoteId: contract.quoteId || undefined,
            value: contract.value ? Number(contract.value) : undefined,
        });
        return toContractResponseDto(contract);
    }

    async getById(id: string, tenantId: string) {
        const contract = await contractsRepository.findById(id, tenantId);
        if (!contract) throw new Error('Contract not found');
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
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                recipientEmail: (contract as any).client?.primaryEmail || undefined,
            });
        }
        if (status === 'ACTIVE') {
            eventBus.emit('contract.signed', {
                tenantId,
                contractId: id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                signedAt: contract.signedAt || undefined,
                recipientEmail: (contract as any).client?.primaryEmail || undefined,
            });
        }
        if (status === 'CANCELLED') {
            eventBus.emit('contract.declined', {
                tenantId,
                contractId: id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
            });
        }
        if (status === 'EXPIRED') {
            eventBus.emit('contract.expired', {
                tenantId,
                contractId: id,
                contractNumber: contract.contractNumber,
                clientId: contract.client?.id,
                projectId: contract.projectId || undefined,
                quoteId: contract.quoteId || undefined,
                expiredAt: new Date(),
            });
        }
        return toContractResponseDto(contract);
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

    async delete(id: string, tenantId: string) {
        await contractsRepository.delete(id, tenantId);
    }
}

export const contractsService = new ContractsService();
