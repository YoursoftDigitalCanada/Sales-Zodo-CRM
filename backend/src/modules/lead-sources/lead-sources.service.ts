import { leadSourcesRepository } from './lead-sources.repository';
import {
  CreateLeadSourceDto,
  UpdateLeadSourceDto,
  LeadSourceQueryDto,
  LeadSourceResponseDto,
  LeadSourceListResponseDto,
  LeadSourceWithStatsDto,
  toLeadSourceResponseDto,
} from './lead-sources.dto';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';

export class LeadSourcesService {
  /**
   * Create lead source
   */
  async create(tenantId: string, data: CreateLeadSourceDto): Promise<LeadSourceResponseDto> {
    // Check for duplicate name
    const existing = await leadSourcesRepository.findByName(data.name, tenantId);
    if (existing) {
      throw new ConflictError('A lead source with this name already exists');
    }

    const source = await leadSourcesRepository.create(tenantId, data);
    const dto = toLeadSourceResponseDto(source);

    activityLogger.log({
      tenantId, entityType: 'LeadSource', entityId: dto.id,
      action: 'CREATE', module: 'lead-sources',
      description: `Created lead source "${data.name}"`,
      metadata: { sourceName: data.name },
    });

    return dto;
  }

  /**
   * Get lead source by ID
   */
  async getById(id: string, tenantId: string): Promise<LeadSourceResponseDto> {
    const source = await leadSourcesRepository.findById(id, tenantId);

    if (!source) {
      throw new NotFoundError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    return toLeadSourceResponseDto(source);
  }

  /**
   * Get lead sources with filters
   */
  async getMany(tenantId: string, query: LeadSourceQueryDto): Promise<LeadSourceListResponseDto> {
    const { data, total } = await leadSourcesRepository.findMany(tenantId, query);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    return {
      data: data.map(toLeadSourceResponseDto),
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

  /**
   * Get all active lead sources (for dropdowns)
   */
  async getActive(tenantId: string): Promise<LeadSourceResponseDto[]> {
    const { data } = await leadSourcesRepository.findMany(tenantId, {
      isActive: true,
      limit: 1000,
    });
    return data.map(toLeadSourceResponseDto);
  }

  /**
   * Update lead source
   */
  async update(
    id: string,
    tenantId: string,
    data: UpdateLeadSourceDto
  ): Promise<LeadSourceResponseDto> {
    const existing = await leadSourcesRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existing.name) {
      const duplicate = await leadSourcesRepository.findByName(data.name, tenantId, id);
      if (duplicate) {
        throw new ConflictError('A lead source with this name already exists');
      }
    }

    const source = await leadSourcesRepository.update(id, tenantId, data);
    const dto = toLeadSourceResponseDto(source);

    activityLogger.log({
      tenantId, entityType: 'LeadSource', entityId: dto.id,
      action: 'UPDATE', module: 'lead-sources',
      description: `Updated lead source "${(source as any).name || dto.id}"`,
      metadata: { updatedFields: Object.keys(data) },
    });

    return dto;
  }

  /**
   * Delete lead source
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await leadSourcesRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if source has leads
    const hasLeads = await leadSourcesRepository.hasLeads(id, tenantId);
    if (hasLeads) {
      throw new BadRequestError(
        'Cannot delete lead source that has associated leads. Consider deactivating it instead.'
      );
    }

    activityLogger.log({
      tenantId, entityType: 'LeadSource', entityId: id,
      action: 'DELETE', module: 'lead-sources',
      description: `Deleted lead source "${existing.name}"`,
    });

    await leadSourcesRepository.delete(id, tenantId);
  }

  /**
   * Get lead source statistics
   */
  async getStatistics(tenantId: string): Promise<any[]> {
    return leadSourcesRepository.getStatistics(tenantId);
  }
}

export const leadSourcesService = new LeadSourcesService();