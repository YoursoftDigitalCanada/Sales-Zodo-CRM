import { ClientType } from '@prisma/client';
import { inspectionsRepository } from './inspections.repository';
import { CreateLeadInspectionDto, UpdateLeadInspectionDto, toLeadInspectionResponseDto } from './inspections.dto';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { clientsService } from '../clients/clients.service';
import { prisma } from '../../config/database';
import type { DataAccessContext } from '../../common/access/data-access';
import {
    buildClientAccessWhere,
    buildLeadAccessWhere,
    mergeWhereWithAccess,
} from '../../common/access/data-access';

interface InspectionListFilters {
    leadId?: string;
    clientId?: string;
}

export class InspectionsService {
    async create(
        tenantId: string,
        data: CreateLeadInspectionDto,
        createdByEmployeeId?: string,
        createdByUserId?: string,
        dataAccess?: DataAccessContext,
    ) {
        const normalizedData = await this.normalizeCreateData(
            tenantId,
            data,
            createdByUserId,
            dataAccess,
        );

        const inspection = await inspectionsRepository.create(tenantId, normalizedData, createdByEmployeeId);
        return toLeadInspectionResponseDto(inspection);
    }

    async getAll(tenantId: string, dataAccess?: DataAccessContext, filters: InspectionListFilters = {}) {
        const inspections = await inspectionsRepository.findAll(tenantId, dataAccess, filters);
        return inspections.map(toLeadInspectionResponseDto);
    }

    async getByLeadId(leadId: string, tenantId: string, dataAccess?: DataAccessContext) {
        const inspections = await inspectionsRepository.findByLeadId(leadId, tenantId, dataAccess);
        return inspections.map(toLeadInspectionResponseDto);
    }

    async getById(inspectionId: string, tenantId: string, dataAccess?: DataAccessContext) {
        const inspection = await inspectionsRepository.findById(inspectionId, tenantId, dataAccess);
        if (!inspection) {
            throw new NotFoundError('Inspection not found');
        }
        return toLeadInspectionResponseDto(inspection);
    }

    async update(inspectionId: string, tenantId: string, data: UpdateLeadInspectionDto, dataAccess?: DataAccessContext) {
        const updated = await inspectionsRepository.update(inspectionId, tenantId, data, dataAccess);
        return toLeadInspectionResponseDto(updated);
    }

    async delete(inspectionId: string, tenantId: string, dataAccess?: DataAccessContext) {
        const existing = await inspectionsRepository.findById(inspectionId, tenantId, dataAccess);
        if (!existing) {
            throw new NotFoundError('Inspection not found');
        }

        await inspectionsRepository.delete(inspectionId, tenantId, dataAccess);
    }

    private async normalizeCreateData(
        tenantId: string,
        data: CreateLeadInspectionDto,
        createdByUserId?: string,
        dataAccess?: DataAccessContext,
    ): Promise<CreateLeadInspectionDto> {
        const sourceCount = [data.leadId, data.clientId, data.manualClient].filter(Boolean).length;
        if (sourceCount !== 1) {
            throw new BadRequestError('Inspection must be linked to exactly one source.');
        }

        let leadId = data.leadId;
        let clientId = data.clientId;

        if (leadId) {
            const lead = await prisma.lead.findFirst({
                where: mergeWhereWithAccess(
                    { id: leadId, tenantId },
                    buildLeadAccessWhere(dataAccess),
                ),
                select: {
                    id: true,
                    convertedToClientId: true,
                },
            });

            if (!lead) {
                throw new NotFoundError('Lead not found');
            }

            clientId = lead.convertedToClientId || undefined;
        }

        if (clientId && !leadId) {
            const client = await prisma.client.findFirst({
                where: mergeWhereWithAccess(
                    { id: clientId, tenantId },
                    buildClientAccessWhere(dataAccess),
                ),
                select: { id: true },
            });

            if (!client) {
                throw new NotFoundError('Client not found');
            }
        }

        if (data.manualClient) {
            const createdClient = await clientsService.create(tenantId, {
                clientName: data.manualClient.clientName,
                companyName: data.manualClient.companyName || null,
                clientType: data.manualClient.companyName ? ClientType.BUSINESS : ClientType.INDIVIDUAL,
                primaryEmail: data.manualClient.primaryEmail,
                primaryPhone: data.manualClient.primaryPhone,
                streetAddress: data.manualClient.streetAddress,
                city: data.manualClient.city || null,
                province: data.manualClient.province || null,
                postalCode: data.manualClient.postalCode || null,
                country: 'Canada',
                contactName: data.manualClient.clientName,
                directPhone: data.manualClient.primaryPhone,
                serviceType: data.manualClient.inspectionPurpose || data.inspectionType || null,
                internalNotes: data.manualClient.internalNotes || data.internalNotes || null,
            }, createdByUserId);

            clientId = createdClient.id;
        }

        if (clientId && !leadId && !(await inspectionsRepository.supportsClientLink())) {
            throw new BadRequestError('Client-linked inspections require the latest inspection database update.');
        }

        return {
            ...data,
            leadId,
            clientId,
            manualClient: undefined,
        };
    }
}

export const inspectionsService = new InspectionsService();
