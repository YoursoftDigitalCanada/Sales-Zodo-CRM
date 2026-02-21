import { LeadStatus, ClientType } from '@prisma/client';
import { prisma } from '../../config/database';
import { leadsService } from './leads.service';
import { leadsRepository } from './leads.repository';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadResponseDto,
  ConvertLeadDto,
} from './leads.dto';
import { auditService } from '../audit/audit.service';
import { notificationManager } from '../notifications/notifications.manager';
import { NotFoundError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { logger } from '../../common/utils/logger';
import { Request } from 'express';

/**
 * Leads Manager
 * Contains complex business logic and orchestration
 */
export class LeadsManager {
  /**
   * Create lead with audit logging and notifications
   */
  async createLead(
    req: Request,
    tenantId: string,
    data: CreateLeadDto,
    createdById: string
  ): Promise<LeadResponseDto> {
    const lead = await leadsService.create(tenantId, data, createdById);

    // Audit log
    await auditService.logCreate(req, 'leads', 'Lead', lead.id, {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      status: lead.status,
    });

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
   * Update lead with audit logging
   */
  async updateLead(
    req: Request,
    id: string,
    tenantId: string,
    data: UpdateLeadDto,
    employeeId: string
  ): Promise<LeadResponseDto> {
    // Get existing lead for comparison
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const previousAssignee = existing.assignedToId;
    const lead = await leadsService.update(id, tenantId, data);

    // Audit log
    await auditService.logUpdate(req, 'leads', 'Lead', lead.id, existing, lead);

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
   * Delete lead with audit logging
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

    // Audit log
    await auditService.logDelete(req, 'leads', 'Lead', id, {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
    });

    logger.info('Lead deleted', { leadId: id, tenantId });
  }

  /**
   * Update lead status with audit logging
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

    const oldStatus = existing.status;
    const lead = await leadsService.updateStatus(id, tenantId, status);

    // Audit log
    await auditService.logStatusChange(
      req,
      'leads',
      'Lead',
      id,
      oldStatus,
      status
    );

    logger.info('Lead status updated', {
      leadId: id,
      tenantId,
      oldStatus,
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

    // Audit log
    await auditService.logUpdate(
      req,
      'leads',
      'Lead',
      id,
      { assignedToId: existing.assignedToId },
      { assignedToId }
    );

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

    // Audit log
    await auditService.logWithContext(
      req,
      'UPDATE',
      'leads',
      `Bulk assigned ${count} leads`,
      {
        entityType: 'Lead',
        newValues: { leadIds, assignedToId },
      }
    );

    // Get assignee info for notification
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
   * Convert lead to client
   */
  async convertLeadToClient(
    req: Request,
    leadId: string,
    tenantId: string,
    options: ConvertLeadDto
  ): Promise<{ clientId: string; contactId?: string }> {
    const lead = await leadsRepository.findById(leadId, tenantId);

    if (!lead) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (lead.status === 'WON' && lead.convertedToClientId) {
      throw new BadRequestError('Lead has already been converted', ErrorCodes.VALIDATION_FAILED);
    }

    // Create client and optionally contact in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create client
      const client = await tx.client.create({
        data: {
          tenantId,
          clientType: options.clientType as ClientType,
          clientName: options.clientType === 'COMPANY' ? (lead.companyName || `${lead.firstName} ${lead.lastName}`) : `${lead.firstName} ${lead.lastName}`,
          companyName: options.clientType === 'COMPANY' ? lead.companyName : null,
          primaryEmail: lead.email || '',
          primaryPhone: lead.phone || '',
          status: 'ACTIVE',
          assignedOwnerId: lead.assignedToId,
          internalNotes: lead.notes,
        },
      });

      let contact = null;

      // Create primary contact if requested and it's a company
      if (options.createContact && options.clientType === 'COMPANY') {
        contact = await tx.contact.create({
          data: {
            tenantId,
            companyId: client.id,
            contactName: `${lead.firstName} ${lead.lastName}`,
            email: lead.email || '',
            officePhone: lead.phone,
            jobTitle: lead.jobTitle,
            isPrimaryContact: true,
          },
        });
      }

      // Mark lead as converted
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: 'WON',
          convertedAt: new Date(),
          convertedToClientId: client.id,
        },
      });

      return { client, contact };
    });

    // Audit log
    await auditService.logWithContext(
      req,
      'UPDATE',
      'leads',
      `Converted lead to ${options.clientType.toLowerCase()} client`,
      {
        entityType: 'Lead',
        entityId: leadId,
        oldValues: { status: lead.status },
        newValues: {
          status: 'WON',
          convertedToClientId: result.client.id,
        },
      }
    );

    logger.info('Lead converted to client', {
      leadId,
      clientId: result.client.id,
      contactId: result.contact?.id,
      tenantId,
    });

    return {
      clientId: result.client.id,
      contactId: result.contact?.id,
    };
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

    // Audit log
    await auditService.logWithContext(
      req,
      'IMPORT',
      'leads',
      `Imported ${imported} leads (${failed} failed)`,
      {
        newValues: { imported, failed },
      }
    );

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

    // Audit log
    await auditService.logWithContext(
      req,
      'EXPORT',
      'leads',
      `Exported ${data.length} leads`,
      {
        newValues: { count: data.length },
      }
    );

    return data;
  }
}

export const leadsManager = new LeadsManager();