import { LeadStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { leadsService } from './leads.service';
import { leadsRepository } from './leads.repository';
import {
  LeadResponseDto,
} from './leads.dto';
import type {
  CreateLeadDto,
  UpdateLeadDto,
  ConvertLeadDto,
} from '@contracts/lead';
import { notificationManager } from '../notifications/notifications.manager';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { logger } from '../../common/utils/logger';
import { Request } from 'express';
import { LeadSourceRequestMetadata } from './lead-source-detector';


/**
 * Leads Manager
 * Handles notification orchestration and bulk operations.
 * Audit logging is handled exclusively in leads.service via activityLogger.
 */
export class LeadsManager {
  /**
   * Create lead with notifications
   */
  async createLead(
    req: Request,
    tenantId: string,
    data: CreateLeadDto,
    createdById: string,
    options?: { skipDuplicateCheck?: boolean }
  ): Promise<LeadResponseDto> {
    const sourceMetadata = this.buildLeadSourceMetadata(req, data);
    const lead = await leadsService.create(tenantId, data, createdById, sourceMetadata, options);

    // Notify assigned employee if different from creator
    if (data.assignedToId && data.assignedToId !== createdById) {
      const assignee = lead.assignedTo;
      if (assignee) {
        const creatorName = `${(req.employee as any)?.user?.firstName || 'Someone'} ${(req.employee as any)?.user?.lastName || ''}`.trim();

        await notificationManager.notifyLeadAssigned(
          assignee.userId,
          tenantId,
          lead.id,
          lead.fullName,
          creatorName
        );
      }
    }

    logger.info('Lead created', {
      leadId: lead.id,
      tenantId,
      createdBy: createdById,
    });

    return lead;
  }

  /**
   * Update lead with notifications
   */
  async updateLead(
    req: Request,
    id: string,
    tenantId: string,
    data: UpdateLeadDto,
    employeeId: string
  ): Promise<LeadResponseDto> {
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const previousAssignee = existing.assignedToId;
    const lead = await leadsService.update(id, tenantId, data);

    // Notify new assignee if assignment changed
    if (data.assignedToId && data.assignedToId !== previousAssignee) {
      const assignee = lead.assignedTo;
      if (assignee) {
        const updaterName = `${(req.employee as any)?.user?.firstName || 'Someone'} ${(req.employee as any)?.user?.lastName || ''}`.trim();

        await notificationManager.notifyLeadAssigned(
          assignee.userId,
          tenantId,
          lead.id,
          lead.fullName,
          updaterName
        );
      }
    }

    return lead;
  }

  /**
   * Delete lead
   */
  async deleteLead(
    req: Request,
    id: string,
    tenantId: string
  ): Promise<void> {
    const lead = await leadsRepository.findById(id, tenantId);
    if (!lead) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    await leadsService.delete(id, tenantId);

    logger.info('Lead deleted', { leadId: id, tenantId });
  }

  /**
   * Update lead status (with optional closure reason for inactive states)
   */
  async updateLeadStatus(
    req: Request,
    id: string,
    tenantId: string,
    status: LeadStatus,
    reasonPayload?: {
      closureReason?: string;
      duplicateOfLeadId?: string;
      reactivateAt?: string;
    }
  ): Promise<LeadResponseDto> {
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const hasReasonFields = Boolean(
      reasonPayload?.closureReason ||
      reasonPayload?.duplicateOfLeadId ||
      reasonPayload?.reactivateAt
    );

    let lead: LeadResponseDto;
    if (hasReasonFields) {
      lead = await leadsService.updateStatusWithReason(id, tenantId, {
        status,
        closureReason: reasonPayload?.closureReason,
        duplicateOfLeadId: reasonPayload?.duplicateOfLeadId,
        reactivateAt: reasonPayload?.reactivateAt,
      });
    } else {
      lead = await leadsService.updateStatus(id, tenantId, status);
    }

    logger.info('Lead status updated', {
      leadId: id,
      tenantId,
      oldStatus: existing.status,
      newStatus: status,
    });

    return lead;
  }

  /**
   * Assign lead with notifications
   */
  async assignLead(
    req: Request,
    id: string,
    tenantId: string,
    assignedToId: string | null,
    assignerEmployeeId: string
  ): Promise<LeadResponseDto> {
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const lead = await leadsService.assign(id, tenantId, assignedToId);

    // Notify new assignee
    if (assignedToId && assignedToId !== assignerEmployeeId) {
      const assignee = lead.assignedTo;
      if (assignee) {
        const assignerName = `${(req.employee as any)?.user?.firstName || 'Someone'} ${(req.employee as any)?.user?.lastName || ''}`.trim();

        await notificationManager.notifyLeadAssigned(
          assignee.userId,
          tenantId,
          lead.id,
          lead.fullName,
          assignerName
        );
      }
    }

    return lead;
  }

  /**
   * Bulk assign leads with notifications
   */
  async bulkAssignLeads(
    req: Request,
    leadIds: string[],
    tenantId: string,
    assignedToId: string,
    assignerEmployeeId: string
  ): Promise<number> {
    const count = await leadsService.bulkAssign(leadIds, tenantId, assignedToId);

    // Notify assignee
    if (assignedToId !== assignerEmployeeId) {
      const assignee = await prisma.employee.findUnique({
        where: { id: assignedToId },
        include: { user: true },
      });

      if (assignee) {
        const assignerName = `${(req.employee as any)?.user?.firstName || 'Someone'} ${(req.employee as any)?.user?.lastName || ''}`.trim();

        await notificationManager.createNotification({
          userId: assignee.userId,
          tenantId,
          title: 'Leads Assigned',
          message: `${assignerName} assigned ${count} leads to you.`,
          type: 'INFO',
          actionUrl: '/leads?assignedToMe=true',
          actionLabel: 'View Leads',
        });
      }
    }

    logger.info('Bulk lead assignment', {
      count,
      tenantId,
      assignedToId,
    });

    return count;
  }

  /**
   * Bulk update lead status
   */
  async bulkUpdateLeadStatus(
    req: Request,
    leadIds: string[],
    tenantId: string,
    status: LeadStatus
  ): Promise<number> {
    const count = await leadsService.bulkUpdateStatus(leadIds, tenantId, status);

    logger.info('Bulk lead status update', {
      count,
      tenantId,
      newStatus: status,
    });

    return count;
  }

  /**
   * Convert lead to client
   */
  async convertLeadToClient(
    req: Request,
    leadId: string,
    tenantId: string,
    options: ConvertLeadDto
  ): Promise<{ clientId: string; contactId?: string }> {
    const result = await leadsService.convertToClient(
      leadId,
      tenantId,
      options,
      req.user?.userId,
    );

    return result;
  }

  /**
   * Add activity to lead
   */
  async addActivity(
    tenantId: string,
    leadId: string,
    type: string,
    title: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const lead = await leadsRepository.findById(leadId, tenantId);

    if (!lead) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    await prisma.leadActivity.create({
      data: {
        leadId,
        type,
        title,
        description,
        metadata: metadata as any,
      },
    });
  }

  /**
   * Get lead activities
   */
  async getActivities(
    tenantId: string,
    leadId: string,
    limit: number = 50
  ): Promise<any[]> {
    const lead = await leadsRepository.findById(leadId, tenantId);

    if (!lead) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const activities = await prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities;
  }

  /**
   * Import leads from data
   */
  async importLeads(
    req: Request,
    tenantId: string,
    leads: CreateLeadDto[],
    createdById: string
  ): Promise<{ imported: number; failed: number; duplicates: number; errors: string[] }> {
    let imported = 0;
    let failed = 0;
    let duplicatesFound = 0;
    const errors: string[] = [];

    for (let i = 0; i < leads.length; i++) {
      try {
        await leadsService.create(tenantId, leads[i], createdById);
        imported++;
      } catch (error: any) {
        if (error.name === 'DuplicateLeadError') {
          // Track as duplicate but still create with skipDuplicateCheck
          duplicatesFound++;
          errors.push(`Row ${i + 1}: Duplicate detected (${error.duplicates?.[0]?.matchedFields?.join(', ') || 'unknown field'}), created anyway`);
          try {
            await leadsService.create(tenantId, leads[i], createdById, undefined, { skipDuplicateCheck: true });
            imported++;
          } catch (innerErr: any) {
            failed++;
            errors.push(`Row ${i + 1}: ${innerErr.message}`);
          }
        } else {
          failed++;
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }
    }

    logger.info('Leads import completed', {
      tenantId,
      imported,
      failed,
      duplicatesFound,
    });

    return { imported, failed, duplicates: duplicatesFound, errors };
  }

  /**
   * Export leads
   */
  async exportLeads(
    req: Request,
    tenantId: string,
    query: any
  ): Promise<any[]> {
    const { data } = await leadsService.getMany(tenantId, { ...query, limit: 10000 });

    return data;
  }

  private buildLeadSourceMetadata(
    req: Request,
    data: CreateLeadDto
  ): LeadSourceRequestMetadata {
    const query = req.query as Record<string, unknown>;
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const first = (value: unknown): string | null => {
      if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null;
      return typeof value === 'string' ? value : null;
    };

    const queryLanding = first(query.landingPageURL) || first(query.landingPageUrl) || first(query.landing_page_url);
    const requestLanding =
      queryLanding ||
      first(headers['x-landing-page']) ||
      first(headers.referer) ||
      first(headers.referrer);

    return {
      utmSource: data.leadSourceUTM || first(query.utm_source) || first(headers['x-utm-source']),
      utmMedium: data.leadMediumUTM || first(query.utm_medium) || first(headers['x-utm-medium']),
      utmCampaign: data.leadCampaignUTM || first(query.utm_campaign) || first(headers['x-utm-campaign']),
      referralParam:
        first(query.referral) ||
        first(query.ref) ||
        first(query.partner) ||
        first(headers['x-referral']),
      formOrigin: first(query.form_origin) || first(headers['x-form-origin']),
      referrer: first(headers.referer) || first(headers.referrer),
      landingPageUrl: data.landingPageURL || requestLanding,
      headers,
    };
  }
}

export const leadsManager = new LeadsManager();
