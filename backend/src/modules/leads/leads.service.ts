import { leadsRepository } from './leads.repository';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadQueryDto,
  LeadResponseDto,
  LeadListResponseDto,
  LeadPipelineDto,
  LeadStatisticsDto,
  toLeadResponseDto,
} from './leads.dto';
import { 
  NotFoundError, 
  BadRequestError,
  ForbiddenError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { LeadStatus, LeadTemperature } from '@prisma/client';

export class LeadsService {
  /**
   * Create a new lead
   */
  async create(
    tenantId: string,
    data: CreateLeadDto,
    createdById?: string
  ): Promise<LeadResponseDto> {
    // Validate assigned employee
    if (data.assignedToId) {
      const exists = await leadsRepository.employeeExists(data.assignedToId, tenantId);
      if (!exists) {
        throw new BadRequestError('Assigned employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
      }
    }

    // Validate lead source
    if (data.leadSourceId) {
      const exists = await leadsRepository.leadSourceExists(data.leadSourceId, tenantId);
      if (!exists) {
        throw new BadRequestError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
      }
    }

    // Validate tags
    if (data.tagIds?.length) {
      const exists = await leadsRepository.tagsExist(data.tagIds, tenantId);
      if (!exists) {
        throw new BadRequestError('One or more tags not found', ErrorCodes.RESOURCE_NOT_FOUND);
      }
    }

    const lead = await leadsRepository.create(tenantId, data, createdById);
    return toLeadResponseDto(lead);
  }

  /**
   * Get lead by ID
   */
  async getById(id: string, tenantId: string): Promise<LeadResponseDto> {
    const lead = await leadsRepository.findById(id, tenantId);
    
    if (!lead) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    return toLeadResponseDto(lead);
  }

  /**
   * Get leads with filters and pagination
   */
  async getMany(
    tenantId: string,
    query: LeadQueryDto
  ): Promise<LeadListResponseDto> {
    const { data, total } = await leadsRepository.findMany(tenantId, query);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(toLeadResponseDto),
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
  async update(
    id: string,
    tenantId: string,
    data: UpdateLeadDto
  ): Promise<LeadResponseDto> {
    // Check if lead exists
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Validate assigned employee
    if (data.assignedToId) {
      const exists = await leadsRepository.employeeExists(data.assignedToId, tenantId);
      if (!exists) {
        throw new BadRequestError('Assigned employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
      }
    }

    // Validate lead source
    if (data.leadSourceId) {
      const exists = await leadsRepository.leadSourceExists(data.leadSourceId, tenantId);
      if (!exists) {
        throw new BadRequestError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
      }
    }

    // Validate tags
    if (data.tagIds?.length) {
      const exists = await leadsRepository.tagsExist(data.tagIds, tenantId);
      if (!exists) {
        throw new BadRequestError('One or more tags not found', ErrorCodes.RESOURCE_NOT_FOUND);
      }
    }

    const lead = await leadsRepository.update(id, tenantId, data);
    return toLeadResponseDto(lead);
  }

  /**
   * Delete lead
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    await leadsRepository.delete(id, tenantId);
  }

  /**
   * Update lead status
   */
  async updateStatus(
    id: string,
    tenantId: string,
    status: LeadStatus
  ): Promise<LeadResponseDto> {
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const lead = await leadsRepository.updateStatus(id, tenantId, status);
    return toLeadResponseDto(lead);
  }

  /**
   * Assign lead to employee
   */
  async assign(
    id: string,
    tenantId: string,
    assignedToId: string | null
  ): Promise<LeadResponseDto> {
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (assignedToId) {
      const employeeExists = await leadsRepository.employeeExists(assignedToId, tenantId);
      if (!employeeExists) {
        throw new BadRequestError('Assigned employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
      }
    }

    const lead = await leadsRepository.assign(id, tenantId, assignedToId);
    return toLeadResponseDto(lead);
  }

  /**
   * Bulk assign leads
   */
  async bulkAssign(
    leadIds: string[],
    tenantId: string,
    assignedToId: string
  ): Promise<number> {
    const employeeExists = await leadsRepository.employeeExists(assignedToId, tenantId);
    if (!employeeExists) {
      throw new BadRequestError('Assigned employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
    }

    const result = await leadsRepository.bulkAssign(leadIds, tenantId, assignedToId);
    return result.count;
  }

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(
    leadIds: string[],
    tenantId: string,
    status: LeadStatus
  ): Promise<number> {
    const result = await leadsRepository.bulkUpdateStatus(leadIds, tenantId, status);
    return result.count;
  }

  /**
   * Get pipeline data
   */
  async getPipeline(
    tenantId: string,
    filters?: {
      assignedToId?: string;
      leadSourceId?: string;
      temperature?: LeadTemperature;
    }
  ): Promise<LeadPipelineDto[]> {
    const pipeline = await leadsRepository.getPipeline(tenantId, filters);
    
    return pipeline.map((stage) => ({
      status: stage.status,
      count: stage.count,
      totalValue: stage.totalValue,
      leads: stage.leads.map(toLeadResponseDto),
    }));
  }

  /**
   * Get lead statistics
   */
  async getStatistics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<LeadStatisticsDto> {
    return leadsRepository.getStatistics(tenantId, startDate, endDate);
  }

  /**
   * Get lead for update/delete (with ownership check)
   */
  async getForModification(
    id: string,
    tenantId: string,
    employeeId: string,
    permissions: string[]
  ): Promise<LeadResponseDto> {
    const lead = await leadsRepository.findById(id, tenantId);
    
    if (!lead) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if user can modify all leads or only their own
    const canModifyAll = permissions.includes('leads.update') || permissions.includes('leads.delete');
    const isAssigned = lead.assignedToId === employeeId;
    const isCreator = lead.createdById === employeeId;

    if (!canModifyAll && !isAssigned && !isCreator) {
      throw new ForbiddenError(
        'You can only modify leads assigned to you or created by you',
        ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS
      );
    }

    return toLeadResponseDto(lead);
  }
}

export const leadsService = new LeadsService();