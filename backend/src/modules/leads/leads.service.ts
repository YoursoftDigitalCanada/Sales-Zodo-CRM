import { leadsRepository } from './leads.repository';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadQueryDto,
  LeadResponseDto,
  LeadListResponseDto,
  LeadPipelineDto,
  LeadStatisticsDto,
  ConvertLeadDto,
  toLeadResponseDto,
} from './leads.dto';
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

// ── Lifecycle Stage Auto-Progression Map ────────────────────────────────
// Maps LeadStatus → appropriate LeadLifecycleStage
const STATUS_TO_LIFECYCLE: Partial<Record<LeadStatus, LeadLifecycleStage>> = {
  NEW: 'SUBSCRIBER',
  CONTACTED: 'LEAD',
  QUALIFIED: 'MQL',
  PROPOSAL: 'SQL',
  NEGOTIATION: 'OPPORTUNITY',
  WON: 'OPPORTUNITY',
  // LOST doesn't change lifecycle — they stay at whatever stage they were
};

export class LeadsService {
  // ── CREATE ──────────────────────────────────────────────────────────────

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
    const dto = toLeadResponseDto(lead);

    // ▸ Timeline: log activity
    await this.logActivity(tenantId, dto.id, 'CREATED', 'Lead created', {
      name: dto.fullName,
      email: dto.email,
      source: dto.leadSource?.name,
    });

    // ▸ Domain event: lead created
    eventBus.emit('lead.created', {
      tenantId,
      leadId: dto.id,
      leadName: dto.fullName,
      ownerId: data.assignedToId,
      ownerUserId: dto.assignedTo?.userId,
      source: dto.leadSource?.name,
      email: dto.email,
      companyName: dto.companyName,
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

    const lead = await leadsRepository.update(id, tenantId, data);
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
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create client — maps lead fields to CreateClientDto shape
      const client = await tx.client.create({
        data: {
          tenantId,
          clientType: options.clientType as ClientType,
          clientName:
            options.clientType === 'COMPANY'
              ? (lead.companyName || `${lead.firstName} ${lead.lastName}`)
              : `${lead.firstName} ${lead.lastName}`,
          companyName: options.clientType === 'COMPANY' ? lead.companyName : null,
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

    // Timeline: log conversion activity on the lead
    await this.logActivity(tenantId, leadId, 'CONVERTED', 'Lead converted to client', {
      clientId: result.client.id,
      clientName: result.client.clientName,
      clientType: options.clientType,
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
      clientType: options.clientType,
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