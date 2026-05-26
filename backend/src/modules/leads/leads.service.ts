import { leadsRepository } from './leads.repository';
import {
  LeadResponseDto,
  LeadListResponseDto,
  LeadPipelineDto,
  LeadStatisticsDto,
  toLeadResponseDto,
  stripLegacyLeadFields,
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
import { Prisma, LeadStatus, LeadTemperature, LeadLifecycleStage, ClientType } from '@prisma/client';
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
const REASON_REQUIRED_STATUSES: LeadStatus[] = ['LOST', 'DUPLICATE', 'UNQUALIFIED'];

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
    data = stripLegacyLeadFields(data);

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
    // Respect explicit null from manual forms so "Unassigned" stays unassigned.
    if (data.assignedToId === undefined) {
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
    await this.ensureLeadSalesRecords(tenantId, lead as any, createdById);

    const hydratedLead = await leadsRepository.findById((lead as any).id, tenantId);
    const dto = toLeadResponseDto(hydratedLead || lead);

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

  private async ensureLeadSalesRecords(
    tenantId: string,
    lead: any,
    createdById?: string,
    options: { logPreparation?: boolean } = {},
  ): Promise<void> {
    const { logPreparation = true } = options;
    const fullName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(' ').trim();
    const organizationName = (lead.companyName || lead.organization || fullName || 'New Lead').trim();
    const phone = lead.phone || lead.mobileNo || '';
    const email = lead.email || '';
    const dueDate = lead.followUpDateTime
      ? new Date(lead.followUpDateTime)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const clientSearch: Prisma.ClientWhereInput[] = [
        { clientName: organizationName },
        { companyName: organizationName },
      ];

      if (email) {
        clientSearch.push({ primaryEmail: email });
      }

      const existingClient = lead.convertedToClientId
        ? await tx.client.findFirst({ where: { id: lead.convertedToClientId, tenantId } })
        : await tx.client.findFirst({
          where: {
            tenantId,
            OR: clientSearch,
          },
        });

      const client = existingClient || await tx.client.create({
        data: {
          tenantId,
          clientType: 'BUSINESS',
          clientName: organizationName,
          companyName: organizationName,
          primaryEmail: email,
          primaryPhone: phone,
          status: 'PROSPECT',
          lifecycleStage: 'PROSPECT',
          assignedOwnerId: lead.assignedToId || null,
          website: lead.website || null,
          noOfEmployees: lead.companySize || null,
          annualRevenue: lead.annualRevenue || null,
          industry: lead.industry || null,
          territory: lead.territory || lead.teamRegion || null,
          organizationAddress: lead.location || null,
          streetAddress: lead.location || null,
          city: lead.city || null,
          province: lead.state || null,
          postalCode: lead.zipCode || null,
          country: lead.country || null,
          internalNotes: lead.notes || lead.useCase || null,
          contactName: fullName || null,
          position: lead.jobTitle || null,
          directPhone: phone || null,
          leadSource: lead.leadSource?.name || lead.leadSourceUTM || null,
          budgetRange: lead.budgetRange || null,
          preferredContactMethod: lead.preferredContactMethod || null,
          nextFollowUp: dueDate,
        },
      });

      const contactSearch: Prisma.ContactWhereInput[] = [];
      if (email) contactSearch.push({ email });
      if (phone) {
        contactSearch.push({ mobilePhone: phone }, { officePhone: phone });
      }
      if (fullName) contactSearch.push({ AND: [{ contactName: fullName }, { companyId: client.id }] });

      const existingContact = lead.convertedToContactId
        ? await tx.contact.findFirst({ where: { id: lead.convertedToContactId, tenantId } })
        : contactSearch.length
          ? await tx.contact.findFirst({
            where: {
              tenantId,
              OR: contactSearch,
            },
          })
          : null;

      const accountPrimaryContact = existingContact
        ? await tx.contact.findFirst({
          where: {
            tenantId,
            companyId: client.id,
            isPrimaryContact: true,
            id: { not: existingContact.id },
          },
          select: { id: true },
        })
        : null;

      const contact = existingContact
        ? await tx.contact.update({
          where: { id: existingContact.id },
          data: {
            companyId: existingContact.companyId || client.id,
            type: existingContact.type || 'LEAD',
            jobTitle: existingContact.jobTitle || lead.jobTitle || undefined,
            officePhone: existingContact.officePhone || lead.phone || undefined,
            mobilePhone: existingContact.mobilePhone || lead.mobileNo || lead.phone || undefined,
            assignedToId: existingContact.assignedToId || lead.assignedToId || undefined,
            notes: existingContact.notes || lead.notes || undefined,
            preferredContactMethod: existingContact.preferredContactMethod || lead.preferredContactMethod || undefined,
            isPrimaryContact: existingContact.isPrimaryContact || !accountPrimaryContact,
          },
        })
        : await tx.contact.create({
          data: {
            tenantId,
            companyId: client.id,
            type: 'LEAD',
            contactName: fullName || organizationName,
            firstName: lead.firstName || null,
            lastName: lead.lastName || null,
            email,
            officePhone: lead.phone || null,
            mobilePhone: lead.mobileNo || lead.phone || null,
            jobTitle: lead.jobTitle || null,
            relationshipStatus: 'Active',
            preferredContactMethod: lead.preferredContactMethod || null,
            assignedToId: lead.assignedToId || null,
            notes: lead.notes || lead.useCase || null,
            isPrimaryContact: true,
          },
        });

      const existingTask = await tx.task.findFirst({
        where: {
          tenantId,
          leadId: lead.id,
          referenceDoctype: 'Lead',
          referenceDocname: lead.id,
          title: { startsWith: 'Follow up new lead' },
        },
      });

      const task = existingTask || await tx.task.create({
        data: {
          tenantId,
          title: `Follow up new lead: ${fullName || organizationName}`,
          description: [
            lead.useCase ? `Use case: ${lead.useCase}` : null,
            lead.productInterest ? `Product interest: ${lead.productInterest}` : null,
            lead.buyingIntent ? `Buying intent: ${lead.buyingIntent}` : null,
            lead.budgetRange ? `Budget: ${lead.budgetRange}` : null,
            lead.purchaseTimeline || lead.workTimeline ? `Timeline: ${lead.purchaseTimeline || lead.workTimeline}` : null,
          ].filter(Boolean).join('\n') || null,
          status: 'TODO',
          priority: lead.temperature === 'HOT' || lead.buyingIntent === 'High' ? 'HIGH' : 'MEDIUM',
          dueDate,
          assignedToId: lead.assignedToId || null,
          createdById: createdById || null,
          leadId: lead.id,
          clientId: client.id,
          referenceDoctype: 'Lead',
          referenceDocname: lead.id,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          convertedToClientId: client.id,
          convertedToContactId: contact.id,
        },
      });

      return {
        client,
        contact,
        task,
        clientWasCreated: !existingClient,
        contactWasCreated: !existingContact,
        taskWasCreated: !existingTask,
      };
    });

    if (logPreparation) {
      await this.logActivity(tenantId, lead.id, 'CREATED', 'Account, contact and follow-up task prepared', {
        clientId: result.client.id,
        contactId: result.contact.id,
        taskId: result.task.id,
      });

      activityLogger.log({
        tenantId,
        entityType: 'Lead',
        entityId: lead.id,
        action: 'CREATE',
        module: 'leads',
        description: 'Prepared account, contact and follow-up task for new lead',
        userId: createdById,
        metadata: {
          clientId: result.client.id,
          contactId: result.contact.id,
          taskId: result.task.id,
        },
      });

      activityLogger.log({
        tenantId,
        entityType: 'Client',
        entityId: result.client.id,
        action: result.clientWasCreated ? 'CREATE' : 'UPDATE',
        module: 'lead-automation',
        description: `Organization prepared from lead: ${organizationName}`,
        userId: createdById,
        metadata: {
          leadId: lead.id,
          contactId: result.contact.id,
          taskId: result.task.id,
          autoCreated: true,
        },
      });

      activityLogger.log({
        tenantId,
        entityType: 'Contact',
        entityId: result.contact.id,
        action: result.contactWasCreated ? 'CREATE' : 'UPDATE',
        module: 'lead-automation',
        description: `Primary contact prepared from lead: ${fullName || email || organizationName}`,
        userId: createdById,
        metadata: {
          leadId: lead.id,
          clientId: result.client.id,
          taskId: result.task.id,
          autoCreated: true,
        },
      });

      activityLogger.log({
        tenantId,
        entityType: 'Task',
        entityId: result.task.id,
        action: result.taskWasCreated ? 'CREATE' : 'UPDATE',
        module: 'lead-automation',
        description: `First follow-up task prepared for lead: ${fullName || organizationName}`,
        userId: createdById,
        metadata: {
          leadId: lead.id,
          clientId: result.client.id,
          contactId: result.contact.id,
          autoCreated: result.taskWasCreated,
        },
      });
    }
  }

  private async ensureQualifiedLeadDeal(
    tenantId: string,
    lead: any,
    actorUserId?: string,
  ): Promise<string> {
    if (!lead.convertedToClientId || !lead.convertedToContactId) {
      await this.ensureLeadSalesRecords(tenantId, lead, actorUserId, { logPreparation: false });
      lead = await leadsRepository.findById(lead.id, tenantId);
    }

    const existingDeal = lead.convertedToDealId
      ? await prisma.project.findFirst({ where: { id: lead.convertedToDealId, tenantId, deletedAt: null } })
      : await prisma.project.findFirst({ where: { tenantId, leadId: lead.id, deletedAt: null } });

    if (existingDeal) {
      return existingDeal.id;
    }

    const fullName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(' ').trim();
    const organizationName = lead.companyName || lead.organization || fullName || 'Qualified Lead';
    const dealValue = lead.potentialValue || lead.annualRevenue || null;
    const propertyType = lead.propertyType === 'Commercial'
      ? 'COMMERCIAL'
      : lead.propertyType === 'Multi-Family'
        ? 'MULTI_FAMILY'
        : 'RESIDENTIAL';

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdDeal = await tx.project.create({
        data: {
          tenantId,
          leadId: lead.id,
          clientId: lead.convertedToClientId || null,
          name: `${organizationName} Deal`,
          description: lead.notes || lead.useCase || null,
          projectNumber: await this.generateDealNumber(tx, tenantId),
          status: 'ACTIVE',
          priority: lead.temperature === 'HOT' ? 'HIGH' : 'NORMAL',
          projectType: 'OTHER',
          propertyType,
          salesRepId: lead.assignedToId || null,
          projectManagerId: lead.assignedToId || null,
          organization: lead.convertedToClientId || null,
          organizationName,
          nextStep: lead.nextStep || 'Schedule demo or qualification call',
          dealStatus: 'Qualification',
          dealOwnerId: lead.assignedToId || null,
          probability: 25,
          expectedDealValue: dealValue,
          dealValue,
          expectedClosureDate: lead.followUpDateTime || null,
          sourceId: lead.leadSourceId || null,
          leadName: fullName || organizationName,
          website: lead.website || null,
          noOfEmployees: lead.companySize || null,
          jobTitle: lead.jobTitle || null,
          territory: lead.territory || lead.teamRegion || null,
          annualRevenue: lead.annualRevenue || null,
          salutation: lead.salutation || null,
          firstName: lead.firstName || null,
          lastName: lead.lastName || null,
          email: lead.email || null,
          mobileNo: lead.mobileNo || lead.phone || null,
          phone: lead.phone || lead.mobileNo || null,
          gender: lead.gender || null,
          contactId: lead.convertedToContactId || null,
          total: dealValue,
          netTotal: dealValue,
          currency: 'CAD',
          jobSiteAddress: null,
          jobSiteCity: null,
          jobSiteState: null,
          jobSiteZip: null,
          createdById: lead.createdById || null,
        },
      });

      if (lead.convertedToContactId) {
        await tx.contactDeal.create({
          data: {
            tenantId,
            contactId: lead.convertedToContactId,
            dealId: createdDeal.id,
            role: 'Decision Maker',
            isPrimary: true,
          },
        });
      }

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          convertedToDealId: createdDeal.id,
        },
      });

      const existingScheduleDemoTask = await tx.task.findFirst({
        where: {
          tenantId,
          projectId: createdDeal.id,
          referenceDoctype: 'LeadQualified',
          referenceDocname: `${lead.id}:schedule-demo`,
        },
      });

      const scheduleDemoTask = existingScheduleDemoTask || await tx.task.create({
          data: {
            tenantId,
            title: `Schedule demo: ${organizationName}`,
            description: `Lead is qualified. Book the sales discovery call or product demo and confirm attendees.`,
            status: 'TODO',
            priority: 'HIGH',
            dueDate: lead.followUpDateTime || new Date(Date.now() + 24 * 60 * 60 * 1000),
            assignedToId: lead.assignedToId || null,
            createdById: lead.createdById || null,
            leadId: lead.id,
            clientId: lead.convertedToClientId || null,
            projectId: createdDeal.id,
            referenceDoctype: 'LeadQualified',
            referenceDocname: `${lead.id}:schedule-demo`,
          },
        });

      return { deal: createdDeal, scheduleDemoTask, scheduleDemoTaskWasCreated: !existingScheduleDemoTask };
    });
    const { deal, scheduleDemoTask, scheduleDemoTaskWasCreated } = result;

    await this.logActivity(tenantId, lead.id, 'CONVERTED', 'Qualified lead opened as deal', {
      dealId: deal.id,
      dealName: deal.name,
    });

    activityLogger.log({
      tenantId,
      entityType: 'Project',
      entityId: deal.id,
      action: 'CREATE',
      module: 'deals',
      description: `Created deal from qualified lead: ${deal.name}`,
      userId: actorUserId,
      metadata: {
        leadId: lead.id,
        clientId: lead.convertedToClientId,
        contactId: lead.convertedToContactId,
      },
    });

    if (lead.convertedToContactId) {
      activityLogger.log({
        tenantId,
        entityType: 'Contact',
        entityId: lead.convertedToContactId,
        action: 'UPDATE',
        module: 'deals',
        description: `Added as Decision Maker on deal: ${deal.name}`,
        userId: actorUserId,
        metadata: { leadId: lead.id, dealId: deal.id, role: 'Decision Maker' },
      });
    }

    activityLogger.log({
      tenantId,
      entityType: 'Task',
      entityId: scheduleDemoTask.id,
      action: scheduleDemoTaskWasCreated ? 'CREATE' : 'UPDATE',
      module: 'lead-automation',
      description: `Schedule demo task prepared for qualified lead: ${organizationName}`,
      userId: actorUserId,
      metadata: {
        leadId: lead.id,
        dealId: deal.id,
        clientId: lead.convertedToClientId,
        contactId: lead.convertedToContactId,
        autoCreated: scheduleDemoTaskWasCreated,
      },
    });

    return deal.id;
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
    data = stripLegacyLeadFields(data);

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

    let lead = await leadsRepository.update(id, tenantId, data as any);

    if (data.status === 'QUALIFIED' && (existing.status !== 'QUALIFIED' || !(existing as any).convertedToDealId)) {
      await this.ensureQualifiedLeadDeal(tenantId, lead as any);
      lead = await leadsRepository.findById(id, tenantId) || lead;
    }

    const dto = toLeadResponseDto(lead);

    // ▸ Timeline: log field changes
    const changedFields = this.detectChangedFields(existing, data);
    if (changedFields.length > 0) {
      await this.logActivity(tenantId, id, 'UPDATED', `Updated: ${changedFields.join(', ')}`, {
        changedFields,
      });
    }

    eventBus.emit('lead.updated', {
      tenantId,
      leadId: id,
      leadName: dto.fullName,
      changedFields,
      ownerId: dto.assignedTo?.id,
      ownerUserId: dto.assignedTo?.userId,
    });

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
    if (REASON_REQUIRED_STATUSES.includes(status as LeadStatus)) {
      throw new BadRequestError('A reason is required for this lead status', ErrorCodes.VALIDATION_FAILED);
    }
    const oldLifecycle = (existing as any).lifecycleStage;

    // ▸ Lifecycle: auto-progress lifecycle stage based on new status
    const newLifecycle = STATUS_TO_LIFECYCLE[status];
    const updateData: any = { status };

    if (newLifecycle && newLifecycle !== oldLifecycle) {
      updateData.lifecycleStage = newLifecycle;
    }

    // Update status (and optionally lifecycle stage)
    let rawLead = await prisma.lead.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        assignedTo: { include: { user: true } },
        leadSource: true,
        tags: { include: { tag: true } },
      },
    });

    if (status === 'QUALIFIED' && (oldStatus !== 'QUALIFIED' || !(existing as any).convertedToDealId)) {
      await this.ensureQualifiedLeadDeal(tenantId, rawLead);
      rawLead = await prisma.lead.findFirst({
        where: { id, tenantId },
        include: {
          assignedTo: { include: { user: true } },
          leadSource: true,
          tags: { include: { tag: true } },
        },
      }) || rawLead;
    }

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

    if (status === 'QUALIFIED') {
      eventBus.emit('lead.qualified', {
        tenantId,
        leadId: id,
        leadName: `${existing.firstName} ${existing.lastName}`,
        estimationMethod: 'SALES_QUALIFICATION',
        ownerId: existing.assignedToId || undefined,
        ownerUserId: dto.assignedTo?.userId,
      });
    }

    if (status === 'CONTACTED') {
      eventBus.emit('lead.contacted', {
        tenantId,
        leadId: id,
        leadName: `${existing.firstName} ${existing.lastName}`,
        ownerId: existing.assignedToId || undefined,
        ownerUserId: dto.assignedTo?.userId,
        contactedAt: new Date(),
      });
    }

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

    let rawLead = await prisma.lead.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        assignedTo: { include: { user: true } },
        leadSource: true,
        tags: { include: { tag: true } },
      },
    });

    if (status === 'QUALIFIED' && (oldStatus !== 'QUALIFIED' || !(existing as any).convertedToDealId)) {
      await this.ensureQualifiedLeadDeal(tenantId, rawLead);
      rawLead = await prisma.lead.findFirst({
        where: { id, tenantId },
        include: {
          assignedTo: { include: { user: true } },
          leadSource: true,
          tags: { include: { tag: true } },
        },
      }) || rawLead;
    }

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

    if (status === 'UNQUALIFIED' || status === 'LOST') {
      eventBus.emit('lead.disqualified', {
        tenantId,
        leadId: id,
        leadName: `${existing.firstName} ${existing.lastName}`,
        ownerId: existing.assignedToId || undefined,
        ownerUserId: dto.assignedTo?.userId,
        reason: closureReason || status,
      });
    }

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
   * Convert a lead into crm-develop-style sales records:
   * Account/Organization (Client), primary Contact, and Deal (Project).
   *
   * Transactional: client create + optional contact create + lead status update
   * are committed atomically. Domain side effects fire AFTER commit.
   */
  async convertToClient(
    leadId: string,
    tenantId: string,
    options: ConvertLeadDto,
    actorUserId?: string,
  ): Promise<{ clientId: string; contactId?: string; dealId: string }> {
    // ── Validate ──────────────────────────────────────────────────────────
    const lead = await leadsRepository.findById(leadId, tenantId);

    if (!lead) {
      throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (lead.status === 'WON' && lead.convertedToClientId && lead.convertedToDealId) {
      throw new BadRequestError('Lead has already been converted', ErrorCodes.VALIDATION_FAILED);
    }

    // ── Atomic writes ─────────────────────────────────────────────────────
    // Normalize clientType: frontend sends 'COMPANY' but Prisma enum is 'BUSINESS'
    const normalizedClientType = (options.clientType === 'COMPANY' ? 'BUSINESS' : options.clientType || 'BUSINESS') as ClientType;
    const isBusinessClient = normalizedClientType === 'BUSINESS';
    const organizationName = lead.organization || lead.companyName || `${lead.firstName} ${lead.lastName}`;
    const leadFullName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(' ');
    const dealValue = lead.potentialValue || lead.annualRevenue || null;
    const propertyType = lead.propertyType === 'Commercial'
      ? 'COMMERCIAL'
      : lead.propertyType === 'Multi-Family'
        ? 'MULTI_FAMILY'
        : 'RESIDENTIAL';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create account/organization — maps CRM Lead organization fields.
      const existingClient = lead.convertedToClientId
        ? await tx.client.findFirst({ where: { id: lead.convertedToClientId, tenantId } })
        : await tx.client.findFirst({
          where: {
            tenantId,
            OR: [
              ...(lead.email ? [{ primaryEmail: lead.email }] : []),
              { clientName: organizationName },
            ],
          },
        });

      const client = existingClient || await tx.client.create({
        data: {
          tenantId,
          clientType: normalizedClientType,
          clientName:
            isBusinessClient
              ? organizationName
              : leadFullName,
          companyName: isBusinessClient ? organizationName : null,
          primaryEmail: lead.email || '',
          primaryPhone: lead.phone || lead.mobileNo || '',
          status: 'ACTIVE',
          assignedOwnerId: lead.assignedToId,
          internalNotes: lead.notes,
          streetAddress: lead.location || null,
          city: lead.city || null,
          province: lead.state || null,
          postalCode: lead.zipCode || null,
          // Lead source
          leadSource: lead.leadSource?.name || lead.leadSourceUTM || null,
          preferredContactMethod: lead.preferredContactMethod || null,
          bestTimeToContact: lead.bestTimeToContact || null,
          isHOA: lead.isHOA || null,
          hoaRestrictions: lead.hoaRestrictions || null,
          secondaryPhone: lead.secondaryPhone || null,
          spouseCoOwnerName: lead.spouseCoOwnerName || null,
        },
      });

      // 2. Create/reuse primary contact, then link it to the account.
      let contact = lead.convertedToContactId
        ? await tx.contact.findFirst({ where: { id: lead.convertedToContactId, tenantId } })
        : null;

      if (!contact && (lead.email || lead.phone || lead.mobileNo || lead.firstName || lead.lastName)) {
        contact = await tx.contact.findFirst({
          where: {
            tenantId,
            OR: [
              ...(lead.email ? [{ email: lead.email }] : []),
              { contactName: leadFullName },
            ],
          },
        });
      }

      if (!contact) {
        contact = await tx.contact.create({
          data: {
            tenantId,
            companyId: client.id,
            type: 'LEAD',
            contactName: leadFullName || organizationName,
            email: lead.email || '',
            officePhone: lead.phone,
            mobilePhone: lead.mobileNo,
            jobTitle: lead.jobTitle,
            isPrimaryContact: true,
          },
        });
      } else if (contact.companyId !== client.id || !contact.isPrimaryContact) {
        contact = await tx.contact.update({
          where: { id: contact.id },
          data: {
            companyId: contact.companyId || client.id,
            isPrimaryContact: contact.isPrimaryContact || true,
            jobTitle: contact.jobTitle || lead.jobTitle || undefined,
            mobilePhone: contact.mobilePhone || lead.mobileNo || undefined,
            officePhone: contact.officePhone || lead.phone || undefined,
          },
        });
      }

      // 3. Create/reuse deal — our Project model is the Sales Deal surface.
      const existingDeal = lead.convertedToDealId
        ? await tx.project.findFirst({ where: { id: lead.convertedToDealId, tenantId, deletedAt: null } })
        : await tx.project.findFirst({ where: { tenantId, leadId: lead.id, deletedAt: null } });

      const deal = existingDeal || await tx.project.create({
        data: {
          tenantId,
          leadId: lead.id,
          clientId: client.id,
          name: `${organizationName} Deal`,
          description: lead.notes || lead.useCase || null,
          projectNumber: await this.generateDealNumber(tx, tenantId),
          status: 'ACTIVE',
          priority: lead.temperature === 'HOT' ? 'HIGH' : 'NORMAL',
          projectType: 'OTHER',
          propertyType,
          salesRepId: lead.assignedToId,
          projectManagerId: lead.assignedToId,
          organization: client.id,
          organizationName,
          nextStep: lead.nextStep || null,
          dealStatus: 'Qualification',
          dealOwnerId: lead.assignedToId,
          probability: 25,
          expectedDealValue: dealValue,
          dealValue,
          expectedClosureDate: lead.followUpDateTime || null,
          sourceId: lead.leadSourceId || null,
          leadName: leadFullName || organizationName,
          website: lead.website || null,
          noOfEmployees: lead.companySize || null,
          jobTitle: lead.jobTitle || null,
          territory: lead.territory || null,
          annualRevenue: lead.annualRevenue || null,
          salutation: lead.salutation || null,
          firstName: lead.firstName || null,
          lastName: lead.lastName || null,
          email: lead.email || null,
          mobileNo: lead.mobileNo || lead.phone || null,
          phone: lead.phone || lead.mobileNo || null,
          gender: lead.gender || null,
          contactId: contact?.id || null,
          total: dealValue,
          netTotal: dealValue,
          currency: 'CAD',
          jobSiteAddress: null,
          jobSiteCity: null,
          jobSiteState: null,
          jobSiteZip: null,
          createdById: lead.createdById || null,
        },
      });

      // 4. Mark lead as converted and store all crm-develop-style links.
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: 'WON',
          converted: true,
          convertedAt: new Date(),
          convertedToClientId: client.id,
          convertedToContactId: contact?.id || null,
          convertedToDealId: deal.id,
        },
      });

      return { client, contact, deal };
    });

    // ── Post-commit domain side effects ───────────────────────────────────
    const safeClientType = options.clientType === 'COMPANY'
      ? 'BUSINESS'
      : (options.clientType || 'BUSINESS');

    // Timeline: log conversion activity on the lead
    await this.logActivity(tenantId, leadId, 'CONVERTED', 'Lead converted to account, contact and deal', {
      clientId: result.client.id,
      clientName: result.client.clientName,
      clientType: safeClientType,
      contactId: result.contact?.id,
      dealId: result.deal.id,
      dealName: result.deal.name,
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
      contactId: result.contact?.id,
      dealId: result.deal.id,
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
      dealId: result.deal.id,
      tenantId,
    });

    return {
      clientId: result.client.id,
      contactId: result.contact?.id,
      dealId: result.deal.id,
    };
  }

  private async generateDealNumber(tx: any, tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DEAL-${year}-`;
    const latest = await tx.project.findFirst({
      where: { tenantId, projectNumber: { startsWith: prefix } },
      orderBy: { projectNumber: 'desc' },
      select: { projectNumber: true },
    });
    const latestSeq = latest?.projectNumber ? Number(latest.projectNumber.split('-').pop()) || 0 : 0;
    return `${prefix}${String(latestSeq + 1).padStart(4, '0')}`;
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
    const ruleAddressContains = this.getRuleValue(rule, ['addressContains', 'area', 'location']);

    const leadState = this.normalizeLocationToken(data.state);
    const leadCity = this.normalizeLocationToken(data.city);
    const leadZip = this.normalizeLocationToken(data.zipCode);
    const leadAddress = this.normalizeLocationToken(data.location);

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
      'city', 'state', 'zipCode', 'urgencyLevel', 'preferredContactMethod',
      'bestTimeToContact', 'issueDescription',
      'confirmedName', 'confirmedPhone', 'confirmedEmail', 'confirmedAddress',
      'secondaryPhone', 'spouseCoOwnerName', 'isDecisionMaker',
      'budgetRange', 'workTimeline',
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
