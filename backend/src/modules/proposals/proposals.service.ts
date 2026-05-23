import { proposalsRepository } from './proposals.repository';
import { toProposalResponseDto } from './proposals.dto';
import type { CreateProposalDto, UpdateProposalDto, ProposalQueryDto } from '@contracts/proposal';
import { NotFoundError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { buildGenericProposalScope, generateProposalPdfBuffer } from './proposal-pdf';
import { documentsService } from '../documents/documents.service';
import { filesService } from '../files/files.service';
import { PrismaClient } from '@prisma/client';
import crypto, { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../common/utils/logger';
import { config } from '../../config';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// ============================================================================
// PROPOSALS SERVICE — Stage 3C
//
// Orchestrates proposal creation from a quote + AI estimate.
// Enforces the validation chain: estimate → quote → proposal.
// ============================================================================

export class ProposalsService {

    // ── Create Proposal from Quote ──────────────────────────────────────

    async create(tenantId: string, data: CreateProposalDto, createdById?: string) {
        // 1. Validate: quote must exist and belong to this tenant
        const quote = await prisma.quote.findFirst({
            where: { id: data.quoteId, tenantId },
            include: {
                items: { orderBy: { sortOrder: 'asc' } },
                lead: { select: { id: true, firstName: true, lastName: true, propertyAddress: true } },
            },
        });
        if (!quote) {
            throw new BadRequestError('Quote not found. A proposal cannot be created without a quote.');
        }

        // 2. Validate: quote must be linked to a lead
        if (!quote.leadId || quote.leadId !== data.leadId) {
            throw new BadRequestError('Lead ID mismatch. The quote must be linked to the same lead.');
        }

        // 3. Validate: quote should have a linked AI estimate (soft check — warn but allow)
        let roofEstimateId = data.roofEstimateId || quote.roofEstimateId || null;
        if (!roofEstimateId) {
            logger.warn('[ProposalsService] Creating proposal without AI estimate link', {
                quoteId: data.quoteId,
                leadId: data.leadId,
            });
        }

        // 4. Generate proposal number: PR-YYYY-NNNN
        const year = new Date().getFullYear();
        const count = await proposalsRepository.count(tenantId);
        const proposalNumber = `PR-${year}-${String(count + 1).padStart(4, '0')}`;

        // 5. Generate default scope of work
        const leadName = quote.lead
            ? `${quote.lead.firstName} ${quote.lead.lastName}`.trim()
            : 'the client';
        const defaultScope = buildGenericProposalScope(leadName);

        // 6. Create the proposal
        const proposal = await proposalsRepository.create(
            tenantId,
            {
                ...data,
                roofEstimateId,
                proposalNumber,
                scopeOfWork: data.scopeOfWork || defaultScope,
            },
            createdById,
        );
        const dto = toProposalResponseDto(proposal);

        activityLogger.log({
            tenantId,
            entityType: 'Proposal',
            entityId: dto.id,
            action: 'CREATE',
            module: 'proposals',
            description: `Created proposal "${proposalNumber}" for lead "${dto.leadName}"`,
            userId: createdById,
            metadata: { proposalNumber, quoteId: data.quoteId, leadId: data.leadId },
        });

        const linkedDeal = await (prisma as any).project.findFirst({
            where: { tenantId, OR: [{ quoteId: data.quoteId }, { leadId: data.leadId }] },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, clientId: true, contactId: true, dealOwnerId: true, salesRepId: true },
        });
        eventBus.emit('proposal.created', {
            tenantId,
            proposalId: dto.id,
            proposalNumber,
            leadId: data.leadId,
            quoteId: data.quoteId,
            dealId: linkedDeal?.id,
            projectId: linkedDeal?.id,
            clientId: linkedDeal?.clientId || (quote as any).clientId || undefined,
            contactId: linkedDeal?.contactId || undefined,
            total: Number((quote as any).total || 0),
            ownerId: linkedDeal?.dealOwnerId || linkedDeal?.salesRepId || undefined,
        });

        return dto;
    }

    // ── Get by ID ───────────────────────────────────────────────────────

    async getById(id: string, tenantId: string) {
        const proposal = await proposalsRepository.findById(id, tenantId);
        if (!proposal) throw new NotFoundError('Proposal not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toProposalResponseDto(proposal);
    }

    // ── Get many ────────────────────────────────────────────────────────

    async getMany(tenantId: string, query: ProposalQueryDto) {
        const { data, total } = await proposalsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        return {
            data: data.map(toProposalResponseDto),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
    }

    // ── Update ──────────────────────────────────────────────────────────

    async update(id: string, tenantId: string, data: UpdateProposalDto) {
        const existing = await proposalsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Proposal not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const proposal = await proposalsRepository.update(id, tenantId, data);
        const dto = toProposalResponseDto(proposal);

        activityLogger.log({
            tenantId,
            entityType: 'Proposal',
            entityId: dto.id,
            action: 'UPDATE',
            module: 'proposals',
            description: `Updated proposal "${dto.proposalNumber}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    // ── Delete ──────────────────────────────────────────────────────────

    async delete(id: string, tenantId: string) {
        const existing = await proposalsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Proposal not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId,
            entityType: 'Proposal',
            entityId: id,
            action: 'DELETE',
            module: 'proposals',
            description: `Deleted proposal "${(existing as any).proposalNumber || id}"`,
        });

        await proposalsRepository.delete(id, tenantId);
    }

    // ── Generate Proposal PDF ───────────────────────────────────────────

    async generatePdf(id: string, tenantId: string): Promise<{ buffer: Buffer; fileName: string }> {
        const proposal = await proposalsRepository.findById(id, tenantId);
        if (!proposal) throw new NotFoundError('Proposal not found', ErrorCodes.RESOURCE_NOT_FOUND);

        // Load full quote data with items
        const quote = await prisma.quote.findFirst({
            where: { id: proposal.quoteId, tenantId },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
        if (!quote) throw new BadRequestError('Linked quote not found');

        // Load AI estimate data
        let estimate: any = null;
        if (proposal.roofEstimateId) {
            estimate = await prisma.roofEstimate.findFirst({
                where: { id: proposal.roofEstimateId, tenantId },
            });
        }

        // Load company settings
        const settings = await prisma.roofEstimateSettings.findUnique({
            where: { tenantId },
        });

        // Load lead info
        const lead = proposal.leadId
            ? await prisma.lead.findUnique({
                where: { id: proposal.leadId },
                select: { firstName: true, lastName: true, propertyAddress: true },
            })
            : null;

        const leadName = lead
            ? `${lead.firstName} ${lead.lastName}`.trim()
            : 'Direct deal proposal';

        // Generate PDF
        const { buffer, fileName } = generateProposalPdfBuffer({
            companyName: settings?.companyName || 'Zodo Sales CRM',
            companyPhone: settings?.companyPhone || undefined,
            companyEmail: settings?.companyEmail || undefined,
            companyAddress: settings?.companyAddress || undefined,
            proposalNumber: (proposal as any).proposalNumber,
            createdAt: proposal.createdAt.toISOString(),
            leadName,
            propertyAddress: lead?.propertyAddress || '',
            customMessage: proposal.customMessageToClient || undefined,
            scopeOfWork: proposal.scopeOfWork || undefined,
            quoteNumber: quote.quoteNumber,
            currency: quote.currency || 'CAD',
            items: (quote.items || []).map((item: any) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                total: Number(item.total),
            })),
            subtotal: Number(quote.subtotal),
            taxAmount: Number(quote.taxAmount),
            discountAmount: Number(quote.discountAmount),
            total: Number(quote.total),
            paymentScheduleType: (quote as any).paymentScheduleType || undefined,
            warrantySelected: (quote as any).warrantySelected || undefined,
            quoteNotes: quote.notes || undefined,
            roofAreaSqft: estimate?.roofAreaSqft || undefined,
            roofPitch: estimate?.pitch || undefined,
            roofType: estimate?.roofType || undefined,
            stories: estimate?.stories || undefined,
            ridgeLengthFt: estimate?.ridgeLengthFt || undefined,
            valleyLengthFt: estimate?.valleyLengthFt || undefined,
            eaveLengthFt: estimate?.eaveLengthFt || undefined,
            totalEstimate: estimate?.totalEstimate || undefined,
            termsAndConditions: proposal.termsAndConditions || undefined,
        });

        // Update proposal with PDF metadata
        await proposalsRepository.update(id, tenantId, {
            ...(((proposal as any).status === 'DRAFT') ? { status: 'GENERATED' } : {}),
            pdfGeneratedAt: new Date(),
        });

        activityLogger.log({
            tenantId,
            entityType: 'Proposal',
            entityId: id,
            action: 'UPDATE',
            module: 'proposals',
            description: `Generated PDF for proposal "${(proposal as any).proposalNumber}"`,
            metadata: { fileName },
        });

        return { buffer, fileName };
    }

    async saveProposalPdfToDocuments(
        tenantId: string,
        proposalId: string,
        actorUserId?: string,
        variant: 'sent' | 'accepted' = 'sent',
    ) {
        const proposal = await proposalsRepository.findById(proposalId, tenantId);
        if (!proposal) throw new NotFoundError('Proposal not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const description = variant === 'accepted' ? 'Accepted proposal PDF' : 'Proposal PDF';
        const existing = await (prisma as any).file.findFirst({
            where: {
                tenantId,
                deletedAt: null,
                documentMetadata: {
                    is: {
                        linkedEntityType: 'Proposal',
                        linkedEntityId: proposalId,
                        documentType: 'pdf',
                        description,
                    },
                },
            },
        });
        if (existing) return documentsService.get(existing.id, tenantId);

        const { buffer, fileName } = await this.generatePdf(proposalId, tenantId);
        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uploadDir = path.join(process.cwd(), 'uploads', tenantId);
        await fs.mkdir(uploadDir, { recursive: true });
        const storagePath = path.join(uploadDir, `${randomUUID()}-${safeFileName}`);
        await fs.writeFile(storagePath, buffer);

        const saved = await filesService.create(tenantId, {
            name: fileName,
            originalName: fileName,
            mimeType: 'application/pdf',
            size: buffer.length,
            path: storagePath,
            extension: '.pdf',
            checksum: crypto.createHash('sha256').update(buffer).digest('hex'),
            clientId: (proposal as any).clientId || null,
            projectId: (proposal as any).projectId || null,
            quoteId: proposal.quoteId || null,
            leadId: proposal.leadId || null,
        });
        const categories = await documentsService.categories(tenantId);
        const proposalsCategory = categories.find((category: any) => String(category.name).toLowerCase() === 'proposals');
        const relatedDeal = (proposal as any).projectId
            ? { id: (proposal as any).projectId, clientId: (proposal as any).clientId || null, contactId: (proposal as any).contactId || null }
            : await (prisma as any).project.findFirst({
                where: { tenantId, OR: [{ quoteId: proposal.quoteId }, ...(proposal.leadId ? [{ leadId: proposal.leadId }] : [])] },
                select: { id: true, clientId: true, contactId: true },
                orderBy: { updatedAt: 'desc' },
            });
        const document = await documentsService.update(saved.id, tenantId, {
            categoryId: proposalsCategory?.id,
            documentType: 'pdf',
            linkedEntityType: 'Proposal',
            linkedEntityId: proposalId,
            description,
        });
        await (prisma as any).documentMetadata.updateMany({
            where: { tenantId, fileId: saved.id },
            data: {
                metadata: {
                    variant,
                    relatedEntities: {
                        proposalId,
                        quoteId: proposal.quoteId,
                        leadId: proposal.leadId || null,
                        dealId: relatedDeal?.id || null,
                        projectId: relatedDeal?.id || null,
                        clientId: relatedDeal?.clientId || (proposal as any).clientId || null,
                        contactId: relatedDeal?.contactId || (proposal as any).contactId || null,
                    },
                },
            },
        }).catch((error: any) => logger.warn('[ProposalsService] Failed to enrich proposal document metadata', {
            tenantId,
            proposalId,
            fileId: saved.id,
            error: error?.message || String(error),
        }));
        activityLogger.log({
            tenantId,
            entityType: 'Proposal',
            entityId: proposalId,
            action: 'UPDATE',
            module: 'documents',
            description: `Saved ${variant === 'accepted' ? 'accepted ' : ''}proposal PDF to Documents`,
            userId: actorUserId,
            metadata: { fileId: saved.id, variant },
        });
        return document;
    }

    // ── Generate + Emit Event (used after create) ───────────────────────

    async generateAndEmit(id: string, tenantId: string): Promise<void> {
        const { buffer, fileName } = await this.generatePdf(id, tenantId);

        const proposal = await proposalsRepository.findById(id, tenantId);
        if (!proposal) return;

        const p = proposal as any;

        // Load lead for name resolution
        const lead = proposal.leadId
            ? await prisma.lead.findUnique({
                where: { id: proposal.leadId },
                select: {
                    firstName: true,
                    lastName: true,
                    assignedToId: true,
                    assignedTo: { select: { userId: true } },
                },
            })
            : null;

        const leadName = lead
            ? `${lead.firstName} ${lead.lastName}`.trim()
            : 'Direct deal proposal';

        // Emit proposal.generated event for downstream automations
        eventBus.emit('proposal.generated', {
            tenantId,
            leadId: proposal.leadId || '',
            leadName,
            proposalId: proposal.id,
            quoteId: proposal.quoteId,
            quoteNumber: p.quote?.quoteNumber || '',
            estimateId: proposal.roofEstimateId || '',
            total: p.quote ? Number(p.quote.total) : 0,
            pdfUrl: p.pdfUrl || undefined,
            ownerId: lead?.assignedToId || undefined,
            ownerUserId: lead?.assignedTo?.userId || undefined,
        });

        logger.info('[ProposalsService] proposal.generated event emitted', {
            proposalId: proposal.id,
            tenantId,
            leadName,
        });
    }

    // ── Stage 4: Send Proposal ──────────────────────────────────────────

    async sendProposal(
        id: string,
        tenantId: string,
        deliveryMethod: 'email' | 'sms' | 'email_sms',
        salesRepId: string,
    ) {
        const proposal = await proposalsRepository.findById(id, tenantId);
        if (!proposal) throw new NotFoundError('Proposal not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const p = proposal as any;
        if (!['DRAFT', 'GENERATED'].includes(p.status)) {
            throw new BadRequestError(`Cannot send proposal in "${p.status}" status. Must be DRAFT or GENERATED.`);
        }

        // Load lead data for email/phone/name
        const lead = proposal.leadId
            ? await prisma.lead.findUnique({
                where: { id: proposal.leadId },
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    propertyAddress: true,
                    assignedToId: true,
                    assignedTo: { select: { userId: true } },
                },
            })
            : null;
        if (!lead) throw new BadRequestError('Lead not found for this proposal');

        const leadName = `${lead.firstName} ${lead.lastName}`.trim();
        const leadEmail = lead.email || undefined;
        const leadPhone = lead.phone || undefined;

        // Validate delivery method vs available contact info
        if ((deliveryMethod === 'email' || deliveryMethod === 'email_sms') && !leadEmail) {
            throw new BadRequestError('Lead has no email address. Cannot send via email.');
        }
        if ((deliveryMethod === 'sms' || deliveryMethod === 'email_sms') && !leadPhone) {
            throw new BadRequestError('Lead has no phone number. Cannot send via SMS.');
        }

        // Generate signed JWT token for secure proposal link
        const tokenPayload = {
            proposalId: proposal.id,
            leadId: proposal.leadId || '',
            type: 'proposal_access',
        };
        const publicToken = jwt.sign(tokenPayload, config.jwt.accessSecret, {
            expiresIn: '30d',
        });

        const proposalLink = `/proposal-view/${proposal.id}?token=${publicToken}`;

        // Load AI estimate for report URL
        let aiReportUrl: string | undefined;
        if (proposal.roofEstimateId) {
            const estimate = await prisma.roofEstimate.findFirst({
                where: { id: proposal.roofEstimateId },
                select: { pdfUrl: true },
            });
            aiReportUrl = estimate?.pdfUrl || undefined;
        }

        // Update proposal: status → SENT, store token + delivery method
        await proposalsRepository.update(id, tenantId, {
            status: 'SENT',
            sentAt: new Date(),
            publicToken,
            deliveryMethod,
        } as any);

        // Emit proposal.sent event
        eventBus.emit('proposal.sent', {
            tenantId,
            proposalId: proposal.id,
            leadId: proposal.leadId || '',
            leadName,
            dealId: p.projectId || undefined,
            projectId: p.projectId || undefined,
            clientId: p.clientId || p.quote?.clientId || undefined,
            contactId: p.contactId || undefined,
            leadEmail,
            leadPhone,
            quoteId: proposal.quoteId,
            quoteNumber: p.quote?.quoteNumber || '',
            proposalPdfUrl: p.pdfUrl || undefined,
            aiReportUrl,
            deliveryMethod,
            publicToken,
            proposalLink,
            total: p.quote ? Number(p.quote.total) : 0,
            salesRepId,
            ownerUserId: lead?.assignedTo?.userId || undefined,
            recipientEmail: leadEmail,
        });

        activityLogger.log({
            tenantId,
            entityType: 'Proposal',
            entityId: id,
            action: 'STATUS_CHANGE',
            module: 'proposals',
            description: `Proposal "${p.proposalNumber}" sent to ${leadName} via ${deliveryMethod}`,
            userId: salesRepId,
            metadata: { deliveryMethod, proposalLink, leadEmail, leadPhone },
        });

        logger.info('[ProposalsService] Proposal sent', {
            proposalId: id,
            deliveryMethod,
            leadName,
        });

        return {
            success: true,
            status: 'SENT',
            proposalLink,
            deliveryMethod,
            proposalNumber: p.proposalNumber,
        };
    }

    // ── Stage 4: Track Proposal View ────────────────────────────────────

    async trackView(token: string): Promise<void> {
        const proposal = await proposalsRepository.findByPublicToken(token);
        if (!proposal) return; // silently ignore invalid tokens for tracking pixel

        const p = proposal as any;
        const newViewCount = (p.viewCount || 0) + 1;
        const isFirstView = newViewCount === 1;

        // Update view tracking
        const updateData: Record<string, any> = {
            viewCount: newViewCount,
            lastViewedAt: new Date(),
        };

        // Transition status to VIEWED only on first view of a SENT proposal
        if (isFirstView && p.status === 'SENT') {
            updateData.status = 'VIEWED';
        }

        await proposalsRepository.update(proposal.id, proposal.tenantId, updateData);

        // Emit proposal.viewed event on first view
        if (isFirstView) {
            const lead = proposal.leadId
                ? await prisma.lead.findUnique({
                    where: { id: proposal.leadId },
                    select: {
                        firstName: true,
                        lastName: true,
                        assignedTo: { select: { userId: true } },
                    },
                })
                : null;

            const leadName = lead
                ? `${lead.firstName} ${lead.lastName}`.trim()
                : 'Direct deal proposal';

            eventBus.emit('proposal.viewed', {
                tenantId: proposal.tenantId,
                proposalId: proposal.id,
                leadId: proposal.leadId || '',
                leadName,
                dealId: p.projectId || undefined,
                projectId: p.projectId || undefined,
                clientId: p.clientId || p.quote?.clientId || undefined,
                contactId: p.contactId || undefined,
                ownerUserId: lead?.assignedTo?.userId || undefined,
                viewCount: newViewCount,
            });

            logger.info('[ProposalsService] First proposal view tracked', {
                proposalId: proposal.id,
                leadName,
            });
        }
    }

    // ── Public: get proposal by token (for e-signature) ─────────────────

    async getByPublicToken(token: string) {
        const proposal = await proposalsRepository.findByPublicToken(token);
        if (!proposal) throw new NotFoundError('Proposal not found or link has expired');
        return proposal;
    }

    // ── Public: sign proposal ───────────────────────────────────────────

    async signProposal(token: string, data: {
        signedByName: string;
        signatureData?: string;
        initials?: string;
        ipAddress?: string;
    }) {
        const proposal = await proposalsRepository.findByPublicToken(token);
        if (!proposal) throw new NotFoundError('Proposal not found or link has expired');

        if (!['SENT', 'GENERATED', 'VIEWED'].includes((proposal as any).status)) {
            throw new BadRequestError(`This proposal has already been ${(proposal as any).status.toLowerCase()}`);
        }

        const now = new Date();

        // Update proposal status to ACCEPTED
        await proposalsRepository.update(proposal.id, proposal.tenantId, {
            status: 'ACCEPTED',
            signedAt: now,
            signedByName: data.signedByName,
            signatureData: data.signatureData || null,
            initials: data.initials || null,
            signerIpAddress: data.ipAddress || null,
        });

        // Stage 5: Create SignedContract record
        await (prisma as any).signedContract.create({
            data: {
                proposalId: proposal.id,
                leadId: proposal.leadId,
                fullLegalName: data.signedByName,
                signatureImage: data.signatureData || '',
                initials: data.initials || '',
                dateSigned: now,
                ipAddress: data.ipAddress || 'unknown',
                tenantId: proposal.tenantId,
            },
        });

        // Get lead details for the enhanced event
        const lead = proposal.leadId
            ? await prisma.lead.findUnique({
                where: { id: proposal.leadId },
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    assignedTo: { select: { userId: true } },
                    assignedToId: true,
                },
            })
            : null;

        const leadName = lead ? `${lead.firstName} ${lead.lastName}` : '';

        // Emit enhanced proposal.accepted event (Stage 5)
        eventBus.emit('proposal.accepted', {
            tenantId: proposal.tenantId,
            proposalId: proposal.id,
            leadId: proposal.leadId || '',
            leadName,
            dealId: (proposal as any).projectId || undefined,
            projectId: (proposal as any).projectId || undefined,
            clientId: (proposal as any).clientId || (proposal as any).quote?.clientId || undefined,
            contactId: (proposal as any).contactId || undefined,
            quoteId: proposal.quoteId,
            quoteNumber: (proposal as any).quote?.quoteNumber || '',
            total: (proposal as any).quote ? Number((proposal as any).quote.total) : 0,
            clientEmail: lead?.email || undefined,
            clientPhone: lead?.phone || undefined,
            salesRepId: lead?.assignedToId || undefined,
            ownerUserId: lead?.assignedTo?.userId,
        });

        activityLogger.log({
            tenantId: proposal.tenantId,
            entityType: 'Proposal',
            entityId: proposal.id,
            action: 'STATUS_CHANGE',
            module: 'proposals',
            description: `Proposal "${(proposal as any).proposalNumber}" accepted and signed by ${data.signedByName}`,
            metadata: { action: 'accept', signedByName: data.signedByName, initials: data.initials },
        });

        return { success: true, status: 'ACCEPTED', proposalNumber: (proposal as any).proposalNumber };
    }

    // ── Public: decline proposal ────────────────────────────────────────

    async declineProposal(token: string) {
        const proposal = await proposalsRepository.findByPublicToken(token);
        if (!proposal) throw new NotFoundError('Proposal not found or link has expired');

        if (!['SENT', 'GENERATED', 'VIEWED'].includes((proposal as any).status)) {
            throw new BadRequestError(`This proposal has already been ${(proposal as any).status.toLowerCase()}`);
        }

        await proposalsRepository.update(proposal.id, proposal.tenantId, {
            status: 'DECLINED',
        });

        eventBus.emit('proposal.declined', {
            tenantId: proposal.tenantId,
            proposalId: proposal.id,
            leadId: proposal.leadId || '',
            dealId: (proposal as any).projectId || undefined,
            projectId: (proposal as any).projectId || undefined,
            clientId: (proposal as any).clientId || (proposal as any).quote?.clientId || undefined,
            contactId: (proposal as any).contactId || undefined,
            quoteId: proposal.quoteId,
            quoteNumber: (proposal as any).quote?.quoteNumber || '',
            ownerUserId: undefined,
        });

        activityLogger.log({
            tenantId: proposal.tenantId,
            entityType: 'Proposal',
            entityId: proposal.id,
            action: 'STATUS_CHANGE',
            module: 'proposals',
            description: `Proposal "${(proposal as any).proposalNumber}" declined via public link`,
            metadata: { action: 'decline' },
        });

        return { success: true, status: 'DECLINED', proposalNumber: (proposal as any).proposalNumber };
    }
}

export const proposalsService = new ProposalsService();
