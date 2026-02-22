import { LeadStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { leadsService } from './leads.service';
import { leadsRepository } from './leads.repository';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadResponseDto,
  ConvertLeadDto,
} from './leads.dto';
import { notificationManager } from '../notifications/notifications.manager';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { logger } from '../../common/utils/logger';
import { Request } from 'express';


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
    createdById: string
  ): Promise<LeadResponseDto> {
    const lead = await leadsService.create(tenantId, data, createdById);

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
   * Update lead status
   */
  async updateLeadStatus(
    req: Request,
    id: string,
    tenantId: string,
    status: LeadStatus
  ): Promise<LeadResponseDto> {
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const lead = await leadsService.updateStatus(id, tenantId, status);

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
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < leads.length; i++) {
      try {
        await leadsService.create(tenantId, leads[i], createdById);
        imported++;
      } catch (error: any) {
        failed++;
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    logger.info('Leads import completed', {
      tenantId,
      imported,
      failed,
    });

    return { imported, failed, errors };
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
}

export const leadsManager = new LeadsManager();