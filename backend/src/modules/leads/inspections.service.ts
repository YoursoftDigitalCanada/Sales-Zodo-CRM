import { inspectionsRepository } from './inspections.repository';
import { CreateLeadInspectionDto, UpdateLeadInspectionDto, toLeadInspectionResponseDto } from './inspections.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';

export class InspectionsService {
    /**
     * Create a new inspection for a lead
     */
    async create(leadId: string, tenantId: string, data: CreateLeadInspectionDto, createdById?: string) {
        const inspection = await inspectionsRepository.create(leadId, tenantId, data, createdById);
        return toLeadInspectionResponseDto(inspection);
    }

    /**
     * Get all inspections across all leads for a tenant
     */
    async getAll(tenantId: string) {
        const inspections = await inspectionsRepository.findAll(tenantId);
        return inspections.map((i: any) => ({
            ...toLeadInspectionResponseDto(i),
            lead: i.lead || null,
        }));
    }

    /**
     * Get all inspections for a lead
     */
    async getByLeadId(leadId: string, tenantId: string) {
        const inspections = await inspectionsRepository.findByLeadId(leadId, tenantId);
        return inspections.map(toLeadInspectionResponseDto);
    }

    /**
     * Get a specific inspection by ID
     */
    async getById(inspectionId: string, tenantId: string) {
        const inspection = await inspectionsRepository.findById(inspectionId, tenantId);
        if (!inspection) {
            throw new NotFoundError('Inspection not found');
        }
        return toLeadInspectionResponseDto(inspection);
    }

    /**
     * Update an inspection
     */
    async update(inspectionId: string, tenantId: string, data: UpdateLeadInspectionDto) {
        // Verify exists
        const existing = await inspectionsRepository.findById(inspectionId, tenantId);
        if (!existing) {
            throw new NotFoundError('Inspection not found');
        }

        const updated = await inspectionsRepository.update(inspectionId, tenantId, data);
        return toLeadInspectionResponseDto(updated);
    }

    /**
     * Delete an inspection
     */
    async delete(inspectionId: string, tenantId: string) {
        const existing = await inspectionsRepository.findById(inspectionId, tenantId);
        if (!existing) {
            throw new NotFoundError('Inspection not found');
        }

        await inspectionsRepository.delete(inspectionId, tenantId);
    }
}

export const inspectionsService = new InspectionsService();
