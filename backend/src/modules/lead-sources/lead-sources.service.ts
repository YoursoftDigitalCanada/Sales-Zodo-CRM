import { leadSourcesRepository } from './lead-sources.repository';
import {
  CreateLeadSourceDto,
  UpdateLeadSourceDto,
  LeadSourceQueryDto,
  LeadSourceResponseDto,
  LeadSourceListResponseDto,
  toLeadSourceResponseDto,
} from './lead-sources.dto';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { logger } from '../../common/utils/logger';
import { leadSourceSyncService } from './lead-source-sync.service';

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
      metadata: { sourceName: data.name, sourceType: data.sourceType },
    });

    // Auto-connect if API endpoint is configured
    if (source.apiEndpoint) {
      void leadSourceSyncService.maybeAutoConnectAndSync(source.id, tenantId).catch((error) => {
        logger.warn('[LeadSources] Auto-connect after create failed', {
          sourceId: source.id,
          tenantId,
          error: (error as Error)?.message || String(error),
        });
      });
    }

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
  async update(id: string, tenantId: string, data: UpdateLeadSourceDto): Promise<LeadSourceResponseDto> {
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

    // Reconnect automatically when integration settings change.
    const integrationTouched = (
      data.apiEndpoint !== undefined
      || data.integrationConfig !== undefined
      || data.fieldMapping !== undefined
      || data.defaultValues !== undefined
    );
    if (integrationTouched && source.apiEndpoint) {
      void leadSourceSyncService.maybeAutoConnectAndSync(source.id, tenantId).catch((error) => {
        logger.warn('[LeadSources] Auto-connect after update failed', {
          sourceId: source.id,
          tenantId,
          error: (error as Error)?.message || String(error),
        });
      });
    }

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

  /**
   * Get available source types
   */
  getSourceTypes() {
    return leadSourcesRepository.getSourceTypes();
  }

  /**
   * Pause a lead source
   */
  async pause(id: string, tenantId: string): Promise<LeadSourceResponseDto> {
    const existing = await leadSourcesRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const source = await leadSourcesRepository.update(id, tenantId, { status: 'PAUSED' } as any);
    return toLeadSourceResponseDto(source);
  }

  /**
   * Resume a lead source
   */
  async resume(id: string, tenantId: string): Promise<LeadSourceResponseDto> {
    const existing = await leadSourcesRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const source = await leadSourcesRepository.update(id, tenantId, { status: 'ACTIVE' } as any);
    return toLeadSourceResponseDto(source);
  }

  /**
   * Test connection for a lead source
   */
  async testConnection(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const existing = await leadSourcesRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // For manual sources, always return success
    if (['COLD_CALL', 'REFERRAL', 'WALK_IN', 'TRADE_SHOW'].includes(existing.sourceType)) {
      await leadSourcesRepository.createLog({
        leadSourceId: id,
        eventType: 'connection_test',
        status: 'success',
        direction: 'outbound',
        responsePayload: { message: 'Manual source - no connection needed' },
      });
      return { success: true, message: 'Manual source — no external connection needed.' };
    }

    if (existing.apiEndpoint) {
      try {
        const result = await leadSourceSyncService.syncSourceById(id, tenantId, 'connection_test');
        await leadSourcesRepository.createLog({
          leadSourceId: id,
          eventType: 'connection_test',
          status: result.failed > 0 ? 'partial' : 'success',
          direction: 'outbound',
          responsePayload: {
            imported: result.imported,
            skipped: result.skipped,
            failed: result.failed,
            totalReceived: result.totalReceived,
          },
        });

        return {
          success: true,
          message: `Connected successfully. Imported ${result.imported} new leads (${result.skipped} duplicates skipped).`,
        };
      } catch (error) {
        const message = (error as Error)?.message || 'Failed to connect to external API';
        await leadSourcesRepository.createLog({
          leadSourceId: id,
          eventType: 'connection_test',
          status: 'failed',
          direction: 'outbound',
          errorMessage: message,
        });
        return { success: false, message };
      }
    }

    // For webhook-only sources, confirm webhook endpoint is ready.
    if (existing.webhookUrl) {
      await leadSourcesRepository.createLog({
        leadSourceId: id,
        eventType: 'connection_test',
        status: 'success',
        direction: 'outbound',
        responsePayload: { webhookUrl: existing.webhookUrl },
      });
      return {
        success: true,
        message: `Webhook URL is ready: ${existing.webhookUrl}`,
      };
    }

    await leadSourcesRepository.createLog({
      leadSourceId: id,
      eventType: 'connection_test',
      status: 'failed',
      direction: 'outbound',
      errorMessage: 'No API endpoint or webhook URL configured',
    });
    return { success: false, message: 'Add an API endpoint (or use webhook URL) to enable automatic lead sync.' };
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateWebhookSecret(id: string, tenantId: string): Promise<{ webhookUrl: string; webhookSecret: string }> {
    const existing = await leadSourcesRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const updated = await leadSourcesRepository.regenerateWebhookSecret(id, tenantId);
    return {
      webhookUrl: updated.webhookUrl || '',
      webhookSecret: updated.webhookSecret || '',
    };
  }

  /**
   * Get webhook logs for a source
   */
  async getLogs(id: string, tenantId: string, query: { page?: number; limit?: number; eventType?: string; status?: string }) {
    const existing = await leadSourcesRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    return leadSourcesRepository.getLogs(id, tenantId, query);
  }

  /**
   * Get summary stats across all sources
   */
  async getStatsSummary(tenantId: string) {
    // Count sources from our repo (already tenant-scoped)
    const stats = await leadSourcesRepository.getStatistics(tenantId);
    const { data: allSources } = await leadSourcesRepository.findMany(tenantId, { page: 1, limit: 1000 });

    const totalSources = allSources.length;
    const activeSources = allSources.filter((s: any) => s.isActive && s.status !== 'PAUSED').length;

    // Count ALL leads for this tenant directly (including those without a source)
    const { prisma } = await import('../../config/database');
    const [leadAgg, wonAgg] = await Promise.all([
      prisma.lead.aggregate({
        where: { tenantId },
        _count: { id: true },
        _sum: { potentialValue: true },
      }),
      prisma.lead.aggregate({
        where: { tenantId, status: 'WON' },
        _count: { id: true },
        _sum: { potentialValue: true },
      }),
    ]);

    const totalLeads = leadAgg._count.id || 0;
    const totalConverted = wonAgg._count.id || 0;
    const totalRevenue = Number(wonAgg._sum.potentialValue || 0);
    const avgConversionRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;

    return {
      totalSources,
      activeSources,
      totalLeads,
      totalConverted,
      totalRevenue,
      avgConversionRate: Math.round(avgConversionRate * 10) / 10,
    };
  }
}

export const leadSourcesService = new LeadSourcesService();
