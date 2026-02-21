"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsService = exports.LeadsService = void 0;
const leads_repository_1 = require("./leads.repository");
const leads_dto_1 = require("./leads.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class LeadsService {
    /**
     * Create a new lead
     */
    async create(tenantId, data, createdById) {
        // Validate assigned employee
        if (data.assignedToId) {
            const exists = await leads_repository_1.leadsRepository.employeeExists(data.assignedToId, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('Assigned employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
            }
        }
        // Validate lead source
        if (data.leadSourceId) {
            const exists = await leads_repository_1.leadsRepository.leadSourceExists(data.leadSourceId, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('Lead source not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
            }
        }
        // Validate tags
        if (data.tagIds?.length) {
            const exists = await leads_repository_1.leadsRepository.tagsExist(data.tagIds, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('One or more tags not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
            }
        }
        const lead = await leads_repository_1.leadsRepository.create(tenantId, data, createdById);
        return (0, leads_dto_1.toLeadResponseDto)(lead);
    }
    /**
     * Get lead by ID
     */
    async getById(id, tenantId) {
        const lead = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!lead) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return (0, leads_dto_1.toLeadResponseDto)(lead);
    }
    /**
     * Get leads with filters and pagination
     */
    async getMany(tenantId, query) {
        const { data, total } = await leads_repository_1.leadsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);
        return {
            data: data.map(leads_dto_1.toLeadResponseDto),
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    /**
     * Update lead
     */
    async update(id, tenantId, data) {
        // Check if lead exists
        const existing = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        // Validate assigned employee
        if (data.assignedToId) {
            const exists = await leads_repository_1.leadsRepository.employeeExists(data.assignedToId, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('Assigned employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
            }
        }
        // Validate lead source
        if (data.leadSourceId) {
            const exists = await leads_repository_1.leadsRepository.leadSourceExists(data.leadSourceId, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('Lead source not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
            }
        }
        // Validate tags
        if (data.tagIds?.length) {
            const exists = await leads_repository_1.leadsRepository.tagsExist(data.tagIds, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('One or more tags not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
            }
        }
        const lead = await leads_repository_1.leadsRepository.update(id, tenantId, data);
        return (0, leads_dto_1.toLeadResponseDto)(lead);
    }
    /**
     * Delete lead
     */
    async delete(id, tenantId) {
        const existing = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        await leads_repository_1.leadsRepository.delete(id, tenantId);
    }
    /**
     * Update lead status
     */
    async updateStatus(id, tenantId, status) {
        const existing = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const lead = await leads_repository_1.leadsRepository.updateStatus(id, tenantId, status);
        return (0, leads_dto_1.toLeadResponseDto)(lead);
    }
    /**
     * Assign lead to employee
     */
    async assign(id, tenantId, assignedToId) {
        const existing = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        if (assignedToId) {
            const employeeExists = await leads_repository_1.leadsRepository.employeeExists(assignedToId, tenantId);
            if (!employeeExists) {
                throw new HttpErrors_1.BadRequestError('Assigned employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
            }
        }
        const lead = await leads_repository_1.leadsRepository.assign(id, tenantId, assignedToId);
        return (0, leads_dto_1.toLeadResponseDto)(lead);
    }
    /**
     * Bulk assign leads
     */
    async bulkAssign(leadIds, tenantId, assignedToId) {
        const employeeExists = await leads_repository_1.leadsRepository.employeeExists(assignedToId, tenantId);
        if (!employeeExists) {
            throw new HttpErrors_1.BadRequestError('Assigned employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
        }
        const result = await leads_repository_1.leadsRepository.bulkAssign(leadIds, tenantId, assignedToId);
        return result.count;
    }
    /**
     * Bulk update status
     */
    async bulkUpdateStatus(leadIds, tenantId, status) {
        const result = await leads_repository_1.leadsRepository.bulkUpdateStatus(leadIds, tenantId, status);
        return result.count;
    }
    /**
     * Get pipeline data
     */
    async getPipeline(tenantId, filters) {
        const pipeline = await leads_repository_1.leadsRepository.getPipeline(tenantId, filters);
        return pipeline.map((stage) => ({
            status: stage.status,
            count: stage.count,
            totalValue: stage.totalValue,
            leads: stage.leads.map(leads_dto_1.toLeadResponseDto),
        }));
    }
    /**
     * Get lead statistics
     */
    async getStatistics(tenantId, startDate, endDate) {
        return leads_repository_1.leadsRepository.getStatistics(tenantId, startDate, endDate);
    }
    /**
     * Get lead for update/delete (with ownership check)
     */
    async getForModification(id, tenantId, employeeId, permissions) {
        const lead = await leads_repository_1.leadsRepository.findById(id, tenantId);
        if (!lead) {
            throw new HttpErrors_1.NotFoundError('Lead not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        // Check if user can modify all leads or only their own
        const canModifyAll = permissions.includes('leads.update') || permissions.includes('leads.delete');
        const isAssigned = lead.assignedToId === employeeId;
        const isCreator = lead.createdById === employeeId;
        if (!canModifyAll && !isAssigned && !isCreator) {
            throw new HttpErrors_1.ForbiddenError('You can only modify leads assigned to you or created by you', errorCodes_1.ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS);
        }
        return (0, leads_dto_1.toLeadResponseDto)(lead);
    }
}
exports.LeadsService = LeadsService;
exports.leadsService = new LeadsService();
//# sourceMappingURL=leads.service.js.map