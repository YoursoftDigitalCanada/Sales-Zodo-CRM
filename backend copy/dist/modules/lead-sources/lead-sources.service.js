"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadSourcesService = exports.LeadSourcesService = void 0;
const lead_sources_repository_1 = require("./lead-sources.repository");
const lead_sources_dto_1 = require("./lead-sources.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class LeadSourcesService {
    /**
     * Create lead source
     */
    async create(tenantId, data) {
        // Check for duplicate name
        const existing = await lead_sources_repository_1.leadSourcesRepository.findByName(data.name, tenantId);
        if (existing) {
            throw new HttpErrors_1.ConflictError('A lead source with this name already exists');
        }
        const source = await lead_sources_repository_1.leadSourcesRepository.create(tenantId, data);
        return (0, lead_sources_dto_1.toLeadSourceResponseDto)(source);
    }
    /**
     * Get lead source by ID
     */
    async getById(id, tenantId) {
        const source = await lead_sources_repository_1.leadSourcesRepository.findById(id, tenantId);
        if (!source) {
            throw new HttpErrors_1.NotFoundError('Lead source not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return (0, lead_sources_dto_1.toLeadSourceResponseDto)(source);
    }
    /**
     * Get lead sources with filters
     */
    async getMany(tenantId, query) {
        const { data, total } = await lead_sources_repository_1.leadSourcesRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        return {
            data: data.map(lead_sources_dto_1.toLeadSourceResponseDto),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get all active lead sources (for dropdowns)
     */
    async getActive(tenantId) {
        const { data } = await lead_sources_repository_1.leadSourcesRepository.findMany(tenantId, {
            isActive: true,
            limit: 1000,
        });
        return data.map(lead_sources_dto_1.toLeadSourceResponseDto);
    }
    /**
     * Update lead source
     */
    async update(id, tenantId, data) {
        const existing = await lead_sources_repository_1.leadSourcesRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Lead source not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        // Check for duplicate name if name is being updated
        if (data.name && data.name !== existing.name) {
            const duplicate = await lead_sources_repository_1.leadSourcesRepository.findByName(data.name, tenantId, id);
            if (duplicate) {
                throw new HttpErrors_1.ConflictError('A lead source with this name already exists');
            }
        }
        const source = await lead_sources_repository_1.leadSourcesRepository.update(id, tenantId, data);
        return (0, lead_sources_dto_1.toLeadSourceResponseDto)(source);
    }
    /**
     * Delete lead source
     */
    async delete(id, tenantId) {
        const existing = await lead_sources_repository_1.leadSourcesRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Lead source not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        // Check if source has leads
        const hasLeads = await lead_sources_repository_1.leadSourcesRepository.hasLeads(id, tenantId);
        if (hasLeads) {
            throw new HttpErrors_1.BadRequestError('Cannot delete lead source that has associated leads. Consider deactivating it instead.');
        }
        await lead_sources_repository_1.leadSourcesRepository.delete(id, tenantId);
    }
    /**
     * Get lead source statistics
     */
    async getStatistics(tenantId) {
        return lead_sources_repository_1.leadSourcesRepository.getStatistics(tenantId);
    }
}
exports.LeadSourcesService = LeadSourcesService;
exports.leadSourcesService = new LeadSourcesService();
//# sourceMappingURL=lead-sources.service.js.map