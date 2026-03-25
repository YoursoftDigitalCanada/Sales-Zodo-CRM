import { leadsRepository } from './leads.repository';
import {
  LeadResponseDto,
  LeadListResponseDto,
  LeadPipelineDto,
  LeadStatisticsDto,
  toLeadResponseDto,
} from './leads.dto';
import type {
  CreateLeadDto,
  UpdateLeadDto,
  LeadQueryDto,
  ConvertLeadDto,
} from '@contracts/lead';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { LeadStatus, LeadTemperature, LeadLifecycleStage, ClientType } from '@prisma/client';
import { eventBus } from '../../common/events/event-bus';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { DataAccessContext } from '../../common/access/data-access';
import {
  detectLeadSource,
  LeadSourceRequestMetadata,
} from './lead-source-detector';
import { duplicateDetectionService } from './duplicate-detection.service';

// Custom error class for duplicate detection
export class DuplicateLeadError extends Error {
  public readonly statusCode = 409;
  public readonly duplicates: any[];
  constructor(message: string, duplicates: any[]) {
    super(message);
    this.name = 'DuplicateLeadError';
    this.duplicates = duplicates;
  }
}

// ── Lifecycle Stage Auto-Progression Map ────────────────────────────────
// Maps LeadStatus → appropriate LeadLifecycleStage
const STATUS_TO_LIFECYCLE: Partial<Record<LeadStatus, LeadLifecycleStage>> = {
  NEW: 'SUBSCRIBER',
  CONTACTED: 'LEAD',
  QUALIFIED: 'MQL',
  PROPOSAL: 'SQL',
  NEGOTIATION: 'OPPORTUNITY',
  WON: 'OPPORTUNITY',
  // Inactive/closure states don't change lifecycle — lead stays at whatever stage it was
  // LOST, DUPLICATE, UNQUALIFIED, NO_RESPONSE, OUT_OF_SERVICE_AREA, FUTURE_FOLLOW_UP, DORMANT_PROPOSAL
};

// Terminal and inactive statuses that should not be counted as active leads
const INACTIVE_STATUSES: LeadStatus[] = [
  'WON', 'LOST', 'DUPLICATE', 'UNQUALIFIED', 'NO_RESPONSE',
  'OUT_OF_SERVICE_AREA', 'FUTURE_FOLLOW_UP', 'DORMANT_PROPOSAL',
];

// Statuses that require a mandatory closureReason
const REASON_REQUIRED_STATUSES: LeadStatus[] = ['LOST', 'DUPLICATE'];

// Statuses that require reactivateAt date
const REACTIVATION_REQUIRED_STATUSES: LeadStatus[] = ['FUTURE_FOLLOW_UP'];

export class LeadsService {
  // ── CREATE ──────────────────────────────────────────────────────────────

  /**
   * Create a new lead
   */
  async create(
    tenantId: string,
    data: CreateLeadDto,
    createdById?: string,
    requestMetadata?: LeadSourceRequestMetadata,
    options?: { skipDuplicateCheck?: boolean }
  ): Promise<LeadResponseDto> {
    // Validate assigned employee
    if (data.assignedToId) {
      const exists = await leadsRepository.employeeExists(data.assignedToId, tenantId);
      if (!exists) {
        throw new BadRequestError('Assigned employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
      }
    }

    // ── Duplicate detection ──────────────────────────────────────────────
    if (!options?.skipDuplicateCheck) {
      const dupResult = await duplicateDetectionService.findDuplicates(tenantId, {
        phone: data.phone,
        email: data.email,
        propertyAddress: data.propertyAddress,
      });
      if (dupResult.hasDuplicates) {
        throw new DuplicateLeadError(
          'Potential duplicate leads found. Review matches before creating.',
          dupResult.duplicates,
        );
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

    const detectedSourceName = await this.applyLeadSourceAutoDetection(
      tenantId,
      data,
      requestMetadata
    );

    // ── Auto-generate leadNumber (LD-YYYY-XXXX) within tenant scope ─────
    const leadNumber = await this.generateLeadNumber(tenantId);
    (data as any).leadNumber = leadNumber;

    // ── Territory-first assignment, then round-robin fallback ────────────
    if (!data.assignedToId) {
      try {
        const territoryAssignee = await this.findTerritoryAssignee(tenantId, data);
        if (territoryAssignee) {
          data.assignedToId = territoryAssignee.employeeId;
          logger.info('[LeadsService] Territory assignment applied', {
            tenantId,
            leadNumber,
            assignedToId: territoryAssignee.employeeId,
            sourceId: territoryAssignee.sourceId,
          });
        } else {
          // Find active sales employees, pick the one with fewest active leads
          const salesEmployees = await prisma.employee.findMany({
            where: {
              tenantId,
              isActive: true,
              role: { name: { in: ['Sales Rep', 'Sales Manager', 'Owner', 'Admin'] } },
            },
            select: {
              id: true,
              userId: true,
              _count: {
                select: {
                  assignedLeads: {
                    where: { status: { notIn: INACTIVE_STATUSES } },
                  },
                },
              },
            },
            orderBy: { assignedLeads: { _count: 'asc' } },
            take: 1,
          });
          if (salesEmployees.length > 0) {
            data.assignedToId = salesEmployees[0].id;
            logger.info('[LeadsService] Round-robin assigned', {
              tenantId, leadNumber,
              assignedToId: salesEmployees[0].id,
            });
          }
        }
      } catch (err) {
        logger.warn('[LeadsService] Auto-assignment failed, proceeding unassigned', { err });
      }
    }

    const lead = await leadsRepository.create(tenantId, data as any, createdById);
    const dto = toLeadResponseDto(lead);

    // ▸ Timeline: log activity
    await this.logActivity(tenantId, dto.id, 'CREATED', 'Lead created', {
      name: dto.fullName,
      email: dto.email,
      source: dto.leadSource?.name || detectedSourceName,
    });

    // ▸ Domain event: lead created
    eventBus.emit('lead.created', {
      tenantId,
      leadId: dto.id,
      leadName: dto.fullName,
      ownerId: data.assignedToId || undefined,
      ownerUserId: dto.assignedTo?.userId,
      source: dto.leadSource?.name || detectedSourceName,
      email: dto.email,
      phone: dto.phone,
      companyName: dto.companyName,
      serviceType: (lead as any).serviceType || undefined,
      propertyAddress: dto.propertyAddress || undefined,
      leadNumber: (lead as any).leadNumber || undefined,
    });

    // ▸ Audit: centralized audit trail
    activityLogger.log({
      tenantId, entityType: 'Lead', entityId: dto.id,
      action: 'CREATE', module: 'leads',
      description: `Lead created: ${dto.fullName}`,
      metadata: { name: dto.fullName, email: dto.email, status: dto.status },
    });

    logger.debug('[LeadsService] Lead created', { leadId: dto.id, tenantId });

    return dto;
  }

  // ── READ ────────────────────────────────────────────────────────────────

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
    query: LeadQueryDto,
    dataAccess?: DataAccessContext,
  ): Promise<LeadListResponseDto> {
    const { data, total } = await leadsRepository.findMany(tenantId, query, dataAccess);
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

  // ── UPDATE ──────────────────────────────────────────────────────────────

  /**
   * Update lead — with lifecycle stage and timeline hooks
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

    const lead = await leadsRepository.update(id, tenantId, data as any);
    const dto = toLeadResponseDto(lead);

    // ▸ Timeline: log field changes
    const changedFields = this.detectChangedFields(existing, data);
    if (changedFields.length > 0) {
      await this.logActivity(tenantId, id, 'UPDATED', `Updated: ${changedFields.join(', ')}`, {
        changedFields,
      });
    }

    // ▸ Audit: centralized audit trail
    activityLogger.log({
      tenantId, entityType: 'Lead', entityId: id,
      action: 'UPDATE', module: 'leads',
      description: changedFields.length > 0 ? `Lead updated: ${changedFields.join(', ')}` : 'Lead updated',
      metadata: { changedFields },
    });

    logger.debug('[LeadsService] Lead updated', { leadId: id, tenantId, changedFields });

    return dto;
  }

  // ── DELETE ──────────────────────────────────────────────────────────────

  /**
   * Delete lead
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    await leadsRepository.delete(id, tenantId);

    // ▸ Audit: centralized audit trail
    activityLogger.log({
      tenantId, entityType: 'Lead', entityId: id,
      action: 'DELETE', module: 'leads',
      description: `Lead deleted: ${existing.firstName} ${existing.lastName}`,
      metadata: { firstName: existing.firstName, lastName: existing.lastName, email: existing.email },
    });

    logger.debug('[LeadsService] Lead deleted', { leadId: id, tenantId });
  }

  // ── STATUS UPDATE + LIFECYCLE PROGRESSION ──────────────────────────────

  /**
   * Update lead status with automatic lifecycle stage progression
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

    const oldStatus = existing.status;
    const oldLifecycle = (existing as any).lifecycleStage;

    // ▸ Lifecycle: auto-progress lifecycle stage based on new status
    const newLifecycle = STATUS_TO_LIFECYCLE[status];
    const updateData: any = { status };

    if (newLifecycle && newLifecycle !== oldLifecycle) {
      updateData.lifecycleStage = newLifecycle;
    }

    // Update status (and optionally lifecycle stage)
    const rawLead = await prisma.lead.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        assignedTo: { include: { user: true } },
        leadSource: true,
        tags: { include: { tag: true } },
      },
    });

    const dto = toLeadResponseDto(rawLead);

    // ▸ Timeline: log status change with lifecycle context
    await this.logActivity(tenantId, id, 'STATUS_CHANGE',
      `Status: ${oldStatus} → ${status}${updateData.lifecycleStage ? ` (lifecycle: ${oldLifecycle} → ${updateData.lifecycleStage})` : ''}`,
      { oldStatus, newStatus: status, oldLifecycle, newLifecycle: updateData.lifecycleStage }
    );

    // ▸ Event: emit for automation engine
    eventBus.emit('lead.statusChanged', {
      tenantId,
      leadId: id,
      leadName: `${existing.firstName} ${existing.lastName}`,
      oldStatus,
      newStatus: status,
      ownerId: existing.assignedToId || undefined,
      ownerUserId: dto.assignedTo?.userId,
      email: dto.email,
      companyName: dto.companyName,
    });

    // ▸ Audit: centralized audit trail
    activityLogger.log({
      tenantId, entityType: 'Lead', entityId: id,
      action: 'STATUS_CHANGE', module: 'leads',
      description: `Lead status: ${oldStatus} → ${status}`,
      metadata: { oldStatus, newStatus: status, oldLifecycle, newLifecycle: updateData.lifecycleStage },
    });

    logger.info('[LeadsService] Lead status updated', {
      leadId: id, tenantId, oldStatus, newStatus: status,
      lifecycleChanged: !!updateData.lifecycleStage,
    });

    return dto;
  }

  /**
   * Update lead status with reason capture for inactive/closure states.
   * Enforces business rules:
   * - LOST, DUPLICATE → require closureReason
   * - DUPLICATE → require duplicateOfLeadId
   * - FUTURE_FOLLOW_UP → require reactivateAt date
   */
  async updateStatusWithReason(
    id: string,
    tenantId: string,
    payload: {
      status: LeadStatus;
      closureReason?: string;
      duplicateOfLeadId?: string;
      reactivateAt?: string;
    }
  ): Promise<LeadResponseDto> {
    const { status, closureReason, duplicateOfLeadId, reactivateAt } = payload;

    // ── Validate mandatory fields for specific statuses ──────────────────
    if (REASON_REQUIRED_STATUSES.includes(status) && !closureReason) {
      throw new BadRequestError(
        `A closure reason is required when setting status to ${status}`,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    if (status === 'DUPLICATE' && !duplicateOfLeadId) {
      throw new BadRequestError(
        'duplicateOfLeadId is required when marking a lead as DUPLICATE',
        ErrorCodes.VALIDATION_FAILED
      );
    }

    if (REACTIVATION_REQUIRED_STATUSES.includes(status) && !reactivateAt) {
      throw new BadRequestError(
        'reactivateAt date is required for FUTURE_FOLLOW_UP status',
        ErrorCodes.VALIDATION_FAILED
      );
    }

    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const oldStatus = existing.status;
    const oldLifecycle = (existing as any).lifecycleStage;

    // Build update data
    const newLifecycle = STATUS_TO_LIFECYCLE[status];
    const updateData: any = {
      status,
      closureReason: closureReason || null,
      duplicateOfLeadId: duplicateOfLeadId || null,
      reactivateAt: reactivateAt ? new Date(reactivateAt) : null,
    };

    // Set closedAt timestamp for all inactive statuses
    if (INACTIVE_STATUSES.includes(status)) {
      updateData.closedAt = new Date();
    } else {
      // If reactivating (moving back to an active status), clear closure fields
      updateData.closedAt = null;
      updateData.closureReason = null;
      updateData.duplicateOfLeadId = null;
      updateData.reactivateAt = null;
    }

    if (newLifecycle && newLifecycle !== oldLifecycle) {
      updateData.lifecycleStage = newLifecycle;
    }

    const rawLead = await prisma.lead.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        assignedTo: { include: { user: true } },
        leadSource: true,
        tags: { include: { tag: true } },
      },
    });

    const dto = toLeadResponseDto(rawLead);

    // ▸ Timeline
    const reasonText = closureReason ? ` (Reason: ${closureReason})` : '';
    await this.logActivity(tenantId, id, 'STATUS_CHANGE',
      `Status: ${oldStatus} → ${status}${reasonText}`,
      { oldStatus, newStatus: status, closureReason, duplicateOfLeadId, reactivateAt }
    );

    // ▸ Event: emit for automation engine
    eventBus.emit('lead.statusChanged', {
      tenantId,
      leadId: id,
      leadName: `${existing.firstName} ${existing.lastName}`,
      oldStatus,
      newStatus: status,
      ownerId: existing.assignedToId || undefined,
      ownerUserId: dto.assignedTo?.userId,
      email: dto.email,
      companyName: dto.companyName,
    });

    // ▸ Audit
    activityLogger.log({
      tenantId, entityType: 'Lead', entityId: id,
      action: 'STATUS_CHANGE', module: 'leads',
      description: `Lead status: ${oldStatus} → ${status}${reasonText}`,
      metadata: { oldStatus, newStatus: status, closureReason, duplicateOfLeadId, reactivateAt },
    });

    logger.info('[LeadsService] Lead status updated with reason', {
      leadId: id, tenantId, oldStatus, newStatus: status, closureReason,
    });

    return dto;
  }

  // ── SET ESTIMATION METHOD ───────────────────────────────────────────────

  /**
   * Set estimation method for a qualified lead and trigger estimation workflow.
   * Lead must be at QUALIFIED stage or beyond to set estimation method.
   */
  async setEstimationMethod(
    id: string,
    tenantId: string,
    estimationMethod: 'PHYSICAL_INSPECTION' | 'AI_ESTIMATION' | 'BOTH'
  ): Promise<LeadResponseDto> {
    const existing = await leadsRepository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Validate lead is at QUALIFIED stage or beyond
    const validStatuses: LeadStatus[] = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];
    if (!validStatuses.includes(existing.status)) {
      throw new BadRequestError(
        `Lead must be at QUALIFIED stage or beyond to set estimation method. Current status: ${existing.status}`
      );
    }

    // Update estimation method
    const rawLead = await prisma.lead.update({
      where: { id, tenantId },
      data: { estimationMethod },
      include: {
        assignedTo: { include: { user: true } },
        leadSource: true,
        tags: { include: { tag: true } },
      },
    });

    const dto = toLeadResponseDto(rawLead);

    // Log activity
    await this.logActivity(tenantId, id, 'UPDATE',
      `Estimation method set to: ${estimationMethod.replace(/_/g, ' ').toLowerCase()}`,
      { estimationMethod }
    );

    // Emit lead.qualified event to trigger estimation workflow
    eventBus.emit('lead.qualified', {
      tenantId,
      leadId: id,
      leadName: `${existing.firstName} ${existing.lastName}`,
      estimationMethod,
      propertyAddress: (existing as any).propertyAddress || undefined,
      ownerId: existing.assignedToId || undefined,
      ownerUserId: dto.assignedTo?.userId,
    });

    logger.info('[LeadsService] Estimation method set', {
      leadId: id, tenantId, estimationMethod,
    });

    return dto;
  }

  // ── ASSIGNMENT ─────────────────────────────────────────────────────────


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
    const dto = toLeadResponseDto(lead);

    // ▸ Timeline: log assignment
    const previousName = existing.assignedTo
      ? `${(existing.assignedTo as any)?.user?.firstName || ''} ${(existing.assignedTo as any)?.user?.lastName || ''}`.trim()
      : 'Unassigned';
    const newName = dto.assignedTo
      ? `${dto.assignedTo.user?.firstName || ''} ${dto.assignedTo.user?.lastName || ''}`.trim()
      : 'Unassigned';

    await this.logActivity(tenantId, id, 'ASSIGNED',
      `Assigned: ${previousName} → ${newName}`,
      { previousAssignee: existing.assignedToId, newAssignee: assignedToId }
    );

    // ▸ Audit: centralized audit trail
    activityLogger.log({
      tenantId, entityType: 'Lead', entityId: id,
      action: 'UPDATE', module: 'leads',
      description: `Lead assigned: ${previousName} → ${newName}`,
      metadata: { previousAssignee: existing.assignedToId, newAssignee: assignedToId },
    });

    logger.debug('[LeadsService] Lead assigned', { leadId: id, tenantId, assignedToId });

    return dto;
  }

  // ── BULK OPERATIONS ────────────────────────────────────────────────────

  /**
   * Bulk assign leads — with event emission for each
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

    // ▸ Timeline: log bulk assignment
    for (const leadId of leadIds) {
      await this.logActivity(tenantId, leadId, 'ASSIGNED', 'Bulk assigned', {
        assignedToId,
        bulkOperation: true,
      });
    }

    // ▸ Audit: centralized audit trail
    activityLogger.log({
      tenantId, entityType: 'Lead', entityId: leadIds[0] || '',
      action: 'UPDATE', module: 'leads',
      description: `Bulk assigned ${result.count} leads`,
      metadata: { leadIds, assignedToId, count: result.count },
    });

    logger.info('[LeadsService] Bulk assign', { count: result.count, tenantId });

    return result.count;
  }

  /**
   * Bulk update status — with lifecycle progression and event emission
   */
  async bulkUpdateStatus(
    leadIds: string[],
    tenantId: string,
    status: LeadStatus
  ): Promise<number> {
    // ▸ Lifecycle: compute lifecycle stage for the new status
    const newLifecycle = STATUS_TO_LIFECYCLE[status];
    const updateData: any = { status };
    if (newLifecycle) {
      updateData.lifecycleStage = newLifecycle;
    }

    const result = await prisma.lead.updateMany({
      where: { id: { in: leadIds }, tenantId },
      data: updateData,
    });

    // ▸ Events + Timeline: emit for each lead
    for (const leadId of leadIds) {
      eventBus.emit('lead.statusChanged', {
        tenantId,
        leadId,
        leadName: '',  // bulk ops don't have individual names easily
        oldStatus: 'UNKNOWN',
        newStatus: status,
      });

      await this.logActivity(tenantId, leadId, 'STATUS_CHANGE',
        `Bulk status change → ${status}${newLifecycle ? ` (lifecycle → ${newLifecycle})` : ''}`,
        { newStatus: status, newLifecycle, bulkOperation: true }
      );
    }

    // ▸ Audit: centralized audit trail
    activityLogger.log({
      tenantId, entityType: 'Lead', entityId: leadIds[0] || '',
      action: 'UPDATE', module: 'leads',
      description: `Bulk updated ${result.count} leads to status ${status}`,
      metadata: { leadIds, status, count: result.count },
    });

    logger.info('[LeadsService] Bulk status update', {
      count: result.count, tenantId, newStatus: status,
      lifecycleStage: newLifecycle,
    });

    return result.count;
  }

  // ── PIPELINE & STATS ──────────────────────────────────────────────────

  /**
   * Get pipeline data
   */
  async getPipeline(
    tenantId: string,
    filters?: {
      assignedToId?: string;
      leadSourceId?: string;
      temperature?: LeadTemperature;
    },
    dataAccess?: DataAccessContext,
  ): Promise<LeadPipelineDto[]> {
    const pipeline = await leadsRepository.getPipeline(tenantId, filters, dataAccess);

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
    endDate?: Date,
    dataAccess?: DataAccessContext,
  ): Promise<LeadStatisticsDto> {
    return leadsRepository.getStatistics(tenantId, startDate, endDate, dataAccess);
  }

  // ── ACCESS CONTROL ─────────────────────────────────────────────────────

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

  // ── CONVERSION ──────────────────────────────────────────────────────────

  /**
   * Convert a lead into a client (and optionally a contact).
   *
   * Transactional: client create + optional contact create + lead status update
   * are committed atomically. Domain side effects fire AFTER commit.
   */
  async convertToClient(
    leadId: string,
    tenantId: string,
    options: ConvertLeadDto,
    actorUserId?: string,
  ): Promise<{ clientId: string; contactId?: string }> {
    // ── Validate ──────────────────────────────────────────────────────────
    const lead = await leadsRepository.findById(leadId, tenantId);

    if (!lead) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (lead.status === 'WON' && lead.convertedToClientId) {
      throw new BadRequestError('Lead has already been converted', ErrorCodes.VALIDATION_FAILED);
    }

    // ── Atomic writes ─────────────────────────────────────────────────────
    // Normalize clientType: frontend sends 'COMPANY' but Prisma enum is 'BUSINESS'
    const normalizedClientType = (options.clientType === 'COMPANY' ? 'BUSINESS' : options.clientType) as ClientType;
    const isBusinessClient = normalizedClientType === 'BUSINESS';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create client — maps lead fields to CreateClientDto shape
      const client = await tx.client.create({
        data: {
          tenantId,
          clientType: normalizedClientType,
          clientName:
            isBusinessClient
              ? (lead.companyName || `${lead.firstName} ${lead.lastName}`)
              : `${lead.firstName} ${lead.lastName}`,
          companyName: isBusinessClient ? lead.companyName : null,
          primaryEmail: lead.email || '',
          primaryPhone: lead.phone || '',
          status: 'ACTIVE',
          assignedOwnerId: lead.assignedToId,
          internalNotes: lead.notes,
          // Address mapping from lead property info
          streetAddress: lead.propertyAddress || null,
          city: lead.city || null,
          province: lead.state || null,
          postalCode: lead.zipCode || null,
          // Lead source
          leadSource: lead.leadSource?.name || lead.leadSourceUTM || null,
          // Roofing-specific fields from lead
          propertyType: lead.propertyType || null,
          numberOfStories: lead.numberOfStories || null,
          serviceType: lead.serviceType || null,
          preferredContactMethod: lead.preferredContactMethod || null,
          bestTimeToContact: lead.bestTimeToContact || null,
          currentRoofMaterial: lead.currentRoofMaterial || null,
          roofAge: lead.roofAge || null,
          insuranceCompanyName: lead.insuranceCompanyName || null,
          isInsuranceClaim: lead.isInsuranceClaim || null,
          isHomeowner: lead.isHomeowner || null,
          isHOA: lead.isHOA || null,
          hoaRestrictions: lead.hoaRestrictions || null,
          secondaryPhone: lead.secondaryPhone || null,
          spouseCoOwnerName: lead.spouseCoOwnerName || null,
        },
      });

      // 2. Create primary contact (company leads only)
      let contact = null;
      if (options.createContact && isBusinessClient) {
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

      // 3. Mark lead as converted
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

    // ── Post-commit domain side effects ───────────────────────────────────
    const safeClientType = options.clientType === 'COMPANY'
      ? 'BUSINESS'
      : (options.clientType || 'BUSINESS');

    // Timeline: log conversion activity on the lead
    await this.logActivity(tenantId, leadId, 'CONVERTED', 'Lead converted to client', {
      clientId: result.client.id,
      clientName: result.client.clientName,
      clientType: safeClientType,
      contactId: result.contact?.id,
    });

    // Event: client.created (mirrors what clientsService.create() emits)
    eventBus.emit('client.created', {
      tenantId,
      clientId: result.client.id,
      clientName: result.client.clientName,
      clientType: result.client.clientType,
      ownerUserId: actorUserId,
    });

    // Event: lead.converted
    eventBus.emit('lead.converted', {
      tenantId,
      leadId,
      leadName: `${lead.firstName} ${lead.lastName}`,
      clientId: result.client.id,
      clientType: safeClientType,
      convertedByUserId: actorUserId || '',
      ownerUserId: lead.assignedTo?.user?.id,
    });

    // Lifecycle: new client → ONBOARDING
    await clientLifecycleService.progressTo(result.client.id, tenantId, 'ONBOARDING');

    logger.info('[LeadsService] Lead converted to client', {
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

  // ── PRIVATE HELPERS ────────────────────────────────────────────────────

  /**
   * Auto-detect lead source when the source is not explicitly selected.
   * Priority: UTM -> form origin -> referral -> Website.
   */
  private async applyLeadSourceAutoDetection(
    tenantId: string,
    data: CreateLeadDto,
    requestMetadata?: LeadSourceRequestMetadata
  ): Promise<string | undefined> {
    const metadata: LeadSourceRequestMetadata = {
      ...requestMetadata,
      utmSource: data.leadSourceUTM || requestMetadata?.utmSource || null,
      utmMedium: data.leadMediumUTM || requestMetadata?.utmMedium || null,
      utmCampaign: data.leadCampaignUTM || requestMetadata?.utmCampaign || null,
      landingPageUrl: data.landingPageURL || requestMetadata?.landingPageUrl || null,
    };

    if (!data.leadSourceUTM && metadata.utmSource) data.leadSourceUTM = metadata.utmSource;
    if (!data.leadMediumUTM && metadata.utmMedium) data.leadMediumUTM = metadata.utmMedium;
    if (!data.leadCampaignUTM && metadata.utmCampaign) data.leadCampaignUTM = metadata.utmCampaign;
    if (!data.landingPageURL && metadata.landingPageUrl) data.landingPageURL = metadata.landingPageUrl;

    if (data.leadSourceId) return undefined;

    const detected = detectLeadSource(metadata);

    const normalizedSourceName = detected.sourceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const normalizedUtm = (metadata.utmSource || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const nameCandidates = Array.from(
      new Set([detected.sourceName, metadata.utmSource].filter(Boolean) as string[])
    );
    const slugCandidates = Array.from(
      new Set([detected.normalizedKey, normalizedSourceName, normalizedUtm].filter(Boolean))
    );

    const explicitFilters: Array<Record<string, unknown>> = [
      ...nameCandidates.map((name) => ({
        name: { equals: name, mode: 'insensitive' as const },
      })),
      ...slugCandidates.map((slug) => ({
        slug: { equals: slug, mode: 'insensitive' as const },
      })),
    ];

    let matchedSource: { id: string; name: string } | null = null;

    if (explicitFilters.length > 0) {
      matchedSource = await prisma.leadSource.findFirst({
        where: { tenantId, isActive: true, OR: explicitFilters as any },
        select: { id: true, name: true },
      });
    }

    if (!matchedSource) {
      matchedSource = await prisma.leadSource.findFirst({
        where: { tenantId, isActive: true, sourceType: detected.sourceType },
        select: { id: true, name: true },
      });
    }

    if (matchedSource) {
      data.leadSourceId = matchedSource.id;
    }

    logger.debug('[LeadsService] Lead source auto-detected', {
      tenantId,
      matchedBy: detected.matchedBy,
      sourceType: detected.sourceType,
      sourceName: matchedSource?.name || detected.sourceName,
      leadSourceId: matchedSource?.id,
    });

    return matchedSource?.name || detected.sourceName;
  }

  private async generateLeadNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LD-${year}-`;

    const latestLeadForYear = await prisma.lead.findFirst({
      where: {
        tenantId,
        leadNumber: { startsWith: prefix },
      },
      orderBy: { leadNumber: 'desc' },
      select: { leadNumber: true },
    });

    const latestSequence = latestLeadForYear?.leadNumber
      ? Number(latestLeadForYear.leadNumber.slice(prefix.length))
      : 0;
    const nextSequence = Number.isFinite(latestSequence) ? latestSequence + 1 : 1;

    return `${prefix}${String(nextSequence).padStart(4, '0')}`;
  }

  /**
   * Resolve territory-based assignment if configured.
   */
  private async findTerritoryAssignee(
    tenantId: string,
    data: CreateLeadDto
  ): Promise<{ employeeId: string; sourceId: string } | null> {
    const territorySources = await prisma.leadSource.findMany({
      where: {
        tenantId,
        isActive: true,
        assignmentMethod: 'TERRITORY',
      },
      select: {
        id: true,
        assignedUserId: true,
        territoryRules: true,
      },
    });

    if (!territorySources.length) {
      return null;
    }

    for (const source of territorySources) {
      const rules = this.normalizeTerritoryRules(source.territoryRules);
      if (!rules.length) continue;

      for (const rule of rules) {
        if (!this.territoryRuleMatchesLead(rule, data)) {
          continue;
        }

        const employee = await this.resolveTerritoryEmployee(
          tenantId,
          rule,
          source.assignedUserId || null
        );

        if (employee) {
          return { employeeId: employee.id, sourceId: source.id };
        }
      }
    }

    return null;
  }

  private normalizeTerritoryRules(rawRules: unknown): Record<string, unknown>[] {
    if (!rawRules) return [];

    if (Array.isArray(rawRules)) {
      return rawRules.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }

    if (typeof rawRules === 'object') {
      const rulesObject = rawRules as Record<string, unknown>;
      const nested = rulesObject.rules || rulesObject.territories;

      if (Array.isArray(nested)) {
        return nested.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }

      return [rulesObject];
    }

    return [];
  }

  private getRuleValue(rule: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const directValue = rule[key];
      if (typeof directValue === 'string' && directValue.trim()) {
        return directValue.trim();
      }

      const locationObject = rule.location;
      if (locationObject && typeof locationObject === 'object') {
        const nestedValue = (locationObject as Record<string, unknown>)[key];
        if (typeof nestedValue === 'string' && nestedValue.trim()) {
          return nestedValue.trim();
        }
      }
    }

    return null;
  }

  private territoryRuleMatchesLead(rule: Record<string, unknown>, data: CreateLeadDto): boolean {
    const ruleState = this.getRuleValue(rule, ['province', 'state']);
    const ruleCity = this.getRuleValue(rule, ['city']);
    const ruleZip = this.getRuleValue(rule, ['zipCode', 'zip', 'postalCode']);
    const ruleAddressContains = this.getRuleValue(rule, ['addressContains', 'area', 'propertyAddress']);

    const leadState = this.normalizeLocationToken(data.state);
    const leadCity = this.normalizeLocationToken(data.city);
    const leadZip = this.normalizeLocationToken(data.zipCode);
    const leadAddress = this.normalizeLocationToken(data.propertyAddress);

    const hasRuleConstraint = Boolean(ruleState || ruleCity || ruleZip || ruleAddressContains);
    if (!hasRuleConstraint) return false;

    if (ruleState && this.normalizeLocationToken(ruleState) !== leadState) {
      return false;
    }

    if (ruleCity && this.normalizeLocationToken(ruleCity) !== leadCity) {
      return false;
    }

    if (ruleZip) {
      const normalizedRuleZip = this.normalizeLocationToken(ruleZip).replace(/\s+/g, '');
      const normalizedLeadZip = leadZip.replace(/\s+/g, '');

      if (!normalizedLeadZip) return false;

      if (normalizedRuleZip.endsWith('*')) {
        const prefix = normalizedRuleZip.slice(0, -1);
        if (!normalizedLeadZip.startsWith(prefix)) {
          return false;
        }
      } else if (normalizedRuleZip !== normalizedLeadZip) {
        return false;
      }
    }

    if (ruleAddressContains) {
      const normalizedAddressNeedle = this.normalizeLocationToken(ruleAddressContains);
      if (!leadAddress.includes(normalizedAddressNeedle)) {
        return false;
      }
    }

    return true;
  }

  private async resolveTerritoryEmployee(
    tenantId: string,
    rule: Record<string, unknown>,
    sourceAssignedUserId: string | null
  ): Promise<{ id: string } | null> {
    const ruleEmployeeId = this.getRuleValue(rule, ['ownerEmployeeId', 'employeeId', 'assignedToId']);
    if (ruleEmployeeId) {
      const employee = await prisma.employee.findFirst({
        where: { tenantId, id: ruleEmployeeId, isActive: true },
        select: { id: true },
      });
      if (employee) return employee;
    }

    const ruleUserId = this.getRuleValue(rule, ['ownerUserId', 'userId']) || sourceAssignedUserId;
    if (!ruleUserId) return null;

    return prisma.employee.findFirst({
      where: {
        tenantId,
        userId: ruleUserId,
        isActive: true,
      },
      select: { id: true },
    });
  }

  private normalizeLocationToken(value?: string | null): string {
    return (value || '').trim().toLowerCase();
  }

  /**
   * Log a lead activity entry for the timeline
   */
  private async logActivity(
    tenantId: string,
    leadId: string,
    type: string,
    title: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.leadActivity.create({
        data: {
          leadId,
          type,
          title,
          description: title,
          metadata: metadata as any,
        },
      });
    } catch (err) {
      // Non-blocking: don't fail the main operation if activity logging fails
      logger.warn('[LeadsService] Failed to log activity', { leadId, type, err });
    }
  }

  /**
   * Detect which fields changed between existing record and update data
   */
  private detectChangedFields(existing: any, data: UpdateLeadDto): string[] {
    const trackableFields = [
      'firstName', 'lastName', 'email', 'phone', 'companyName',
      'jobTitle', 'website', 'location', 'status', 'temperature',
      'potentialValue', 'notes', 'assignedToId', 'leadSourceId',
      // Stage 1
      'propertyAddress', 'city', 'state', 'zipCode', 'propertyType',
      'serviceType', 'isInsuranceClaim', 'urgencyLevel', 'preferredContactMethod',
      'bestTimeToContact', 'issueDescription',
      // Stage 2
      'confirmedName', 'confirmedPhone', 'confirmedEmail', 'confirmedAddress',
      'secondaryPhone', 'spouseCoOwnerName', 'isHomeowner', 'isDecisionMaker',
      'ownershipType', 'roofAge', 'currentRoofMaterial', 'numberOfStories',
      'previousRoofWork', 'insuranceCompanyName', 'hasClaimBeenFiled',
      'claimNumber', 'adjusterName', 'budgetRange', 'workTimeline',
      'financingNeeded', 'gettingOtherQuotes', 'topPriority', 'isHOA',
      'leadScore', 'disqualifiedReason', 'nextStep', 'qualificationCallNotes',
    ];
    const changed: string[] = [];

    for (const field of trackableFields) {
      if (field in data && (data as any)[field] !== (existing as any)[field]) {
        changed.push(field);
      }
    }

    return changed;
  }
}

export const leadsService = new LeadsService();
