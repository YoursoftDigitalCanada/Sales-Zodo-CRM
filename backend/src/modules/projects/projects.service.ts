import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { projectsRepository } from './projects.repository';
import { normalizeProjectDto, ProjectQueryDto, toNumber } from './projects.dto';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { DataAccessContext } from '../../common/access/data-access';
import { liveInvoiceSyncService } from './live-invoice-sync.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';

const NOT_FOUND_MESSAGES = new Set([
  'PROJECT_NOT_FOUND',
  'PROJECT_TASK_NOT_FOUND',
  'PROJECT_MATERIAL_NOT_FOUND',
  'PROJECT_LABOR_NOT_FOUND',
  'PROJECT_EXPENSE_NOT_FOUND',
  'PROJECT_CREW_ASSIGNMENT_NOT_FOUND',
  'PROJECT_DOCUMENT_NOT_FOUND',
  'PROJECT_PHOTO_NOT_FOUND',
  'PROJECT_NOTE_NOT_FOUND',
  'PROJECT_INSPECTION_NOT_FOUND',
  'PROJECT_CHANGE_ORDER_NOT_FOUND',
  'QUOTE_NOT_FOUND',
]);

const DEAL_STAGES = ['Qualification', 'Demo Scheduled', 'Demo Completed', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'] as const;

const DEAL_STAGE_PROBABILITY: Record<string, number> = {
  Qualification: 25,
  'Demo Scheduled': 40,
  'Demo Completed': 45,
  'Proposal Sent': 50,
  Negotiation: 60,
  Won: 100,
  Lost: 0,
};

function mapProjectError(error: unknown): never {
  if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ConflictError) {
    throw error;
  }

  if (error instanceof Error && NOT_FOUND_MESSAGES.has(error.message)) {
    throw new NotFoundError('Requested resource not found', ErrorCodes.RESOURCE_NOT_FOUND);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictError('A project resource with this unique value already exists', ErrorCodes.RESOURCE_ALREADY_EXISTS);
    }
    if (error.code === 'P2003') {
      throw new BadRequestError('Invalid related resource reference', ErrorCodes.INVALID_INPUT);
    }
  }

  if (error instanceof Error) {
    throw new BadRequestError(error.message, ErrorCodes.INVALID_INPUT);
  }

  throw new BadRequestError('Deal operation failed', ErrorCodes.INVALID_INPUT);
}

export class ProjectsService {
  private async guarded<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      mapProjectError(error);
    }
  }

  private async syncProjectRevenueState(
    projectId: string,
    tenantId: string,
    options?: { allowCompletedSync?: boolean },
  ) {
    const current = await projectsRepository.findById(projectId, tenantId);
    const isCompleted = (current as any)?.status === 'COMPLETED' || Boolean((current as any)?.isCompleted);
    if (isCompleted && !options?.allowCompletedSync) {
      return;
    }

    await projectsRepository.recalculateFinancials(projectId, tenantId);
    await liveInvoiceSyncService.syncProjectInvoiceDraft(tenantId, projectId, options);
  }

  private async getProjectDetailOrThrow(projectId: string, tenantId: string) {
    const project = await projectsRepository.findById(projectId, tenantId);
    if (!project) {
      throw new NotFoundError('Deal not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    return project;
  }

  private async validateDealReferences(tenantId: string, data: Record<string, any>, current?: Record<string, any>) {
    const clientId = data.clientId !== undefined ? data.clientId : current?.clientId;
    const contactId = data.contactId !== undefined ? data.contactId : current?.contactId;
    const leadId = data.leadId !== undefined ? data.leadId : current?.leadId;
    const ownerId = data.dealOwnerId || data.salesRepId || data.projectManagerId || current?.dealOwnerId || current?.salesRepId || current?.projectManagerId;
    const sourceId = data.sourceId !== undefined ? data.sourceId : current?.sourceId;
    const quoteId = data.quoteId !== undefined ? data.quoteId : current?.quoteId;

    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } });
      if (!client) {
        throw new BadRequestError('Linked account does not belong to this tenant', ErrorCodes.RESOURCE_NOT_FOUND);
      }
    }

    if (contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId }, select: { id: true, companyId: true } });
      if (!contact) {
        throw new BadRequestError('Linked contact does not belong to this tenant', ErrorCodes.RESOURCE_NOT_FOUND);
      }
      if (clientId && contact.companyId && contact.companyId !== clientId) {
        throw new BadRequestError('Linked contact belongs to a different account', ErrorCodes.VALIDATION_FAILED);
      }
    }

    if (leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId }, select: { id: true } });
      if (!lead) {
        throw new BadRequestError('Linked lead does not belong to this tenant', ErrorCodes.RESOURCE_NOT_FOUND);
      }
    }

    if (ownerId) {
      const owner = await prisma.employee.findFirst({ where: { id: ownerId, tenantId, isActive: true }, select: { id: true } });
      if (!owner) {
        throw new BadRequestError('Linked owner does not belong to this tenant', ErrorCodes.RESOURCE_NOT_FOUND);
      }
    }

    if (sourceId) {
      const source = await prisma.leadSource.findFirst({ where: { id: sourceId, tenantId }, select: { id: true } });
      if (!source) {
        throw new BadRequestError('Linked source does not belong to this tenant', ErrorCodes.RESOURCE_NOT_FOUND);
      }
    }

    if (quoteId) {
      const quote = await prisma.quote.findFirst({ where: { id: quoteId, tenantId }, select: { id: true } });
      if (!quote) {
        throw new BadRequestError('Linked proposal does not belong to this tenant', ErrorCodes.RESOURCE_NOT_FOUND);
      }
    }
  }

  async create(tenantId: string, data: Record<string, any>, createdById?: string) {
    const dto = normalizeProjectDto(data);
    return this.guarded(async () => {
      const project = await projectsRepository.create(tenantId, dto, createdById);
      await this.ensureDealContactLink(tenantId, project.id, (project as any).contactId, createdById);
      await this.syncProjectRevenueState(project.id, tenantId);
      return this.getProjectDetailOrThrow(project.id, tenantId);
    });
  }

  async createDeal(tenantId: string, data: Record<string, any>, createdById?: string) {
    const dto = normalizeProjectDto({
      ...data,
      dealStatus: this.canonicalDealStage(data.dealStatus || data.stage || 'Qualification'),
      status: data.status || 'ACTIVE',
      projectType: data.projectType || 'OTHER',
      propertyType: data.propertyType || 'COMMERCIAL',
    });

    return this.guarded(async () => {
      await this.validateDealReferences(tenantId, dto);
      await this.attachDealContactFromPayload(tenantId, dto);
      this.validateDealInput(dto);
      const deal = await projectsRepository.create(tenantId, dto, createdById);
      await this.ensureDealContactLink(tenantId, deal.id, (deal as any).contactId, createdById);
      await this.syncProjectRevenueState(deal.id, tenantId);
      const detail = await this.getProjectDetailOrThrow(deal.id, tenantId);
      this.emitDealCreated(tenantId, detail as any);
      return detail;
    });
  }

  async createFromQuote(tenantId: string, quoteId: string, userId?: string) {
    return this.guarded(async () => {
      const project = await projectsRepository.createFromQuote(tenantId, quoteId, userId);
      const projectId = (project as any)?.id;
      if (!projectId) {
        throw new NotFoundError('Deal not found', ErrorCodes.RESOURCE_NOT_FOUND);
      }
      await this.syncProjectRevenueState(projectId, tenantId);
      const detail = await this.getProjectDetailOrThrow(projectId, tenantId);
      if (this.canonicalDealStage((detail as any).dealStatus) === 'Won') {
        await this.ensureDealWonAutomation(tenantId, detail as any, userId);
      }
      return this.getProjectDetailOrThrow(projectId, tenantId);
    });
  }

  async getById(id: string, tenantId: string) {
    return this.guarded(async () => {
      const current = await this.getProjectDetailOrThrow(id, tenantId);
      const isCompleted = (current as any)?.status === 'COMPLETED' || Boolean((current as any)?.isCompleted);
      if (!isCompleted) {
        await liveInvoiceSyncService.syncProjectInvoiceDraft(tenantId, id);
      }
      return this.getProjectDetailOrThrow(id, tenantId);
    });
  }

  async getMany(tenantId: string, query: ProjectQueryDto, dataAccess?: DataAccessContext) {
    return this.guarded(async () => {
      const { data, total } = await projectsRepository.findMany(tenantId, query, dataAccess);
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    });
  }

  async getDealsByStage(tenantId: string, query: ProjectQueryDto, dataAccess?: DataAccessContext) {
    return this.guarded(async () => {
      const { data } = await this.getMany(tenantId, { ...query, limit: query.limit ?? 500 }, dataAccess);
      const columns = DEAL_STAGES.map((stage) => {
        const deals = data.filter((deal: any) => this.canonicalDealStage(deal.dealStatus) === stage);
        return {
          stage,
          probability: DEAL_STAGE_PROBABILITY[stage],
          count: deals.length,
          value: deals.reduce((sum: number, deal: any) => sum + this.getDealValue(deal), 0),
          deals,
        };
      });

      return {
        stages: columns,
        totals: {
          count: data.length,
          open: data.filter((deal: any) => !['Won', 'Lost'].includes(this.canonicalDealStage(deal.dealStatus))).length,
          won: data.filter((deal: any) => this.canonicalDealStage(deal.dealStatus) === 'Won').length,
          lost: data.filter((deal: any) => this.canonicalDealStage(deal.dealStatus) === 'Lost').length,
          value: data.reduce((sum: number, deal: any) => sum + this.getDealValue(deal), 0),
        },
      };
    });
  }

  async getKanban(tenantId: string, dataAccess?: DataAccessContext) {
    return this.guarded(() => projectsRepository.getKanban(tenantId, dataAccess));
  }

  async getCalendar(tenantId: string, dataAccess?: DataAccessContext) {
    return this.guarded(() => projectsRepository.getCalendar(tenantId, dataAccess));
  }

  async getMap(tenantId: string, dataAccess?: DataAccessContext) {
    return this.guarded(() => projectsRepository.getMap(tenantId, dataAccess));
  }

  async getSummaryStats(tenantId: string, dataAccess?: DataAccessContext) {
    return this.guarded(() => projectsRepository.getSummaryStats(tenantId, dataAccess));
  }

  async update(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const dto = normalizeProjectDto(data);
    return this.guarded(async () => {
      const current = await this.getProjectDetailOrThrow(id, tenantId);
      if (dto.dealStatus) {
        dto.dealStatus = this.canonicalDealStage(dto.dealStatus);
      }
      await this.validateDealReferences(tenantId, dto, current as any);
      await this.attachDealContactFromPayload(tenantId, dto, current as any);
      this.validateDealInput(dto, current as any);

      const project = await projectsRepository.update(id, tenantId, dto);
      await this.ensureDealContactLink(tenantId, project.id, (project as any).contactId, actorUserId);
      const updatedDetail = await this.getProjectDetailOrThrow(project.id, tenantId);
      const previousStage = this.canonicalDealStage((current as any).dealStatus);
      const nextStage = this.canonicalDealStage((updatedDetail as any).dealStatus);
      if (dto.dealStatus) {
        await this.runDealStageAutomation(tenantId, project.id, dto.dealStatus, current as any, actorUserId);
      }
      await this.syncProjectRevenueState(project.id, tenantId);
      if (previousStage !== nextStage) {
        this.emitDealStageChanged(tenantId, updatedDetail as any, current as any, actorUserId);
        if (nextStage === 'Won') {
          this.emitDealWon(tenantId, updatedDetail as any);
        }
        if (nextStage === 'Lost') {
          this.emitDealLost(tenantId, updatedDetail as any);
        }
      }

      const previousValue = this.getDealValue(current as any);
      const nextValue = this.getDealValue(updatedDetail as any);
      if (previousValue !== nextValue) {
        this.emitDealValueChanged(tenantId, updatedDetail as any, previousValue, nextValue);
      }

      const previousOwner = this.getDealOwner(current as any);
      const nextOwner = this.getDealOwner(updatedDetail as any);
      if (previousOwner !== nextOwner) {
        this.emitDealOwnerChanged(tenantId, updatedDetail as any, previousOwner, nextOwner);
      }

      return updatedDetail;
    });
  }

  async updateDeal(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    return this.update(id, tenantId, data, actorUserId);
  }

  async moveDealStage(id: string, tenantId: string, stage: string, data: Record<string, any> = {}, actorUserId?: string) {
    const targetStage = this.canonicalDealStage(stage);
    return this.update(id, tenantId, {
      ...data,
      dealStatus: targetStage,
      probability: data.probability ?? DEAL_STAGE_PROBABILITY[targetStage],
      status: targetStage === 'Won' ? 'COMPLETED' : targetStage === 'Lost' ? 'CANCELLED' : 'ACTIVE',
      closedDate: ['Won', 'Lost'].includes(targetStage) ? data.closedDate || new Date() : data.closedDate,
    }, actorUserId);
  }

  async markDealWon(id: string, tenantId: string, data: Record<string, any> = {}, actorUserId?: string) {
    return this.moveDealStage(id, tenantId, 'Won', data, actorUserId);
  }

  async markDealLost(id: string, tenantId: string, data: Record<string, any> = {}, actorUserId?: string) {
    if (!data.lostReason) {
      const current = await this.getProjectDetailOrThrow(id, tenantId);
      if (!(current as any).lostReason) {
        throw new BadRequestError('Lost reason is required when a deal is marked Lost', ErrorCodes.VALIDATION_FAILED);
      }
    }
    return this.moveDealStage(id, tenantId, 'Lost', data, actorUserId);
  }

  private async runDealStageAutomation(
    tenantId: string,
    projectId: string,
    dealStatus: string,
    previousProject: any,
    actorUserId?: string,
  ): Promise<void> {
    const project = await this.getProjectDetailOrThrow(projectId, tenantId);
    const normalizedStatus = this.normalizeDealStage(dealStatus);

    if (normalizedStatus === 'demo scheduled') {
      await this.ensureDemoAutomation(tenantId, project as any, actorUserId);
      return;
    }

    if (normalizedStatus === 'proposal sent') {
      await this.ensureProposalAutomation(tenantId, project as any, actorUserId);
      return;
    }

    if (normalizedStatus === 'demo completed') {
      await this.ensureDemoCompletedAutomation(tenantId, project as any, actorUserId);
      return;
    }

    if (normalizedStatus === 'won') {
      await this.ensureDealWonAutomation(tenantId, project as any, actorUserId);
      return;
    }

    if (normalizedStatus === 'lost') {
      await this.ensureDealLostAutomation(tenantId, project as any, previousProject, actorUserId);
    }
  }

  private normalizeDealStage(value: string | null | undefined): string {
    return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  }

  private canonicalDealStage(value: string | null | undefined): string {
    const normalized = this.normalizeDealStage(value || 'Qualification');
    const map: Record<string, string> = {
      qualification: 'Qualification',
      qualified: 'Qualification',
      'demo scheduled': 'Demo Scheduled',
      'demo booked': 'Demo Scheduled',
      'demo completed': 'Demo Completed',
      'demo done': 'Demo Completed',
      'proposal sent': 'Proposal Sent',
      proposal: 'Proposal Sent',
      negotiation: 'Negotiation',
      won: 'Won',
      closed: 'Won',
      lost: 'Lost',
    };
    return map[normalized] || 'Qualification';
  }

  private validateDealInput(data: Record<string, any>, current?: Record<string, any>) {
    const nextClientId = data.clientId !== undefined ? data.clientId : current?.clientId;
    const targetStage = data.dealStatus ? this.canonicalDealStage(data.dealStatus) : this.canonicalDealStage(current?.dealStatus);
    const nextValue = this.getDealValue({ ...current, ...data });

    if (data.clientId === null || data.clientId === '') {
      throw new BadRequestError('A deal must belong to an Account', ErrorCodes.VALIDATION_FAILED);
    }

    if (!nextClientId && data.dealStatus) {
      throw new BadRequestError('A deal must belong to an Account', ErrorCodes.VALIDATION_FAILED);
    }

    const nextContactId = data.contactId !== undefined ? data.contactId : current?.contactId;
    const hasKnownDealContacts = Array.isArray(current?.contacts) && current.contacts.length > 0;
    if (!nextContactId && !hasKnownDealContacts) {
      throw new BadRequestError('A deal must have at least one Contact', ErrorCodes.VALIDATION_FAILED);
    }

    if (targetStage === 'Won' && nextValue <= 0) {
      throw new BadRequestError('Won deals must have a deal value', ErrorCodes.VALIDATION_FAILED);
    }

    if (targetStage === 'Lost' && !(data.lostReason || current?.lostReason)) {
      throw new BadRequestError('Lost reason is required when a deal is marked Lost', ErrorCodes.VALIDATION_FAILED);
    }
  }

  private async ensureDealContactLink(
    tenantId: string,
    dealId: string,
    contactId?: string | null,
    actorUserId?: string,
  ) {
    if (!contactId) return null;

    const existing = await prisma.contactDeal.findFirst({
      where: { tenantId, contactId, dealId },
    });
    if (existing) {
      if (!existing.isPrimary || existing.role !== 'Decision Maker') {
        return prisma.contactDeal.update({
          where: { id: existing.id },
          data: { isPrimary: true, role: existing.role || 'Decision Maker' },
        });
      }
      return existing;
    }

    const link = await prisma.contactDeal.create({
      data: {
        tenantId,
        contactId,
        dealId,
        role: 'Decision Maker',
        isPrimary: true,
      },
    });

    activityLogger.log({
      tenantId,
      entityType: 'Project',
      entityId: dealId,
      action: 'UPDATE',
      module: 'deals',
      description: 'Primary contact linked to deal',
      userId: actorUserId,
      metadata: { contactId },
    });

    return link;
  }

  private async attachDealContactFromPayload(tenantId: string, data: Record<string, any>, current?: Record<string, any>) {
    if (data.contactId || current?.contactId) return;
    const clientId = data.clientId || current?.clientId;
    if (!clientId) return;

    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || data.leadName || data.contactName;
    const email = String(data.email || '').trim();
    const phone = String(data.phone || data.mobileNo || '').trim();
    if (!fullName && !email && !phone) return;
    if (!email) {
      throw new BadRequestError('A new deal Contact requires an email address, or select an existing Contact', ErrorCodes.VALIDATION_FAILED);
    }

    const existing = await prisma.contact.findFirst({
      where: {
        tenantId,
        OR: [
          { email },
          ...(phone ? [{ mobilePhone: phone }, { officePhone: phone }] : []),
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    const contact = existing || await prisma.contact.create({
      data: {
        tenantId,
        companyId: clientId,
        type: 'LEAD',
        contactName: fullName || email,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        email,
        officePhone: data.phone || null,
        mobilePhone: data.mobileNo || data.phone || null,
        jobTitle: data.jobTitle || null,
        relationshipStatus: 'Active',
        assignedToId: data.dealOwnerId || data.salesRepId || data.projectManagerId || null,
        isPrimaryContact: true,
      },
    });

    if (!contact.companyId) {
      await prisma.contact.update({ where: { id_tenantId: { id: contact.id, tenantId } }, data: { companyId: clientId } });
    }
    data.contactId = contact.id;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private nextBusinessDate(daysFromNow: number, hour = 10): Date {
    const date = this.addDays(new Date(), daysFromNow);
    date.setHours(hour, 0, 0, 0);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  private getDealOwner(project: any): string | null {
    return project.dealOwnerId || project.salesRepId || project.projectManagerId || null;
  }

  private getDealValue(project: any): number {
    return toNumber(project.dealValue || project.expectedDealValue || project.contractValue || project.budget || project.total || 0);
  }

  private dealEventPayload(tenantId: string, project: any) {
    const ownerId = this.getDealOwner(project) || undefined;
    return {
      tenantId,
      dealId: project.id,
      projectId: project.id,
      dealName: project.name || project.organizationName || project.leadName || 'Deal',
      clientId: project.clientId || undefined,
      contactId: project.contactId || undefined,
      leadId: project.leadId || undefined,
      value: this.getDealValue(project),
      probability: project.probability !== null && project.probability !== undefined ? Number(project.probability) : undefined,
      ownerId,
      ownerUserId: undefined,
    };
  }

  private emitDealCreated(tenantId: string, project: any) {
    eventBus.emit('deal.created', {
      ...this.dealEventPayload(tenantId, project),
      stageName: this.canonicalDealStage(project.dealStatus),
      expectedCloseDate: project.expectedClosureDate || undefined,
    });
  }

  private emitDealStageChanged(tenantId: string, project: any, previousProject: any, changedById?: string) {
    eventBus.emit('deal.stageChanged', {
      ...this.dealEventPayload(tenantId, project),
      previousStageName: this.canonicalDealStage(previousProject?.dealStatus),
      newStageName: this.canonicalDealStage(project.dealStatus),
      lostReason: project.lostReason || previousProject?.lostReason || undefined,
      changedById,
    });
  }

  private emitDealValueChanged(tenantId: string, project: any, previousValue: number, newValue: number) {
    eventBus.emit('deal.valueChanged', {
      tenantId,
      dealId: project.id,
      projectId: project.id,
      dealName: project.name || project.organizationName || 'Deal',
      previousValue,
      newValue,
      ownerId: this.getDealOwner(project) || undefined,
    });
  }

  private emitDealOwnerChanged(tenantId: string, project: any, previousOwnerId?: string | null, newOwnerId?: string | null) {
    eventBus.emit('deal.ownerChanged', {
      tenantId,
      dealId: project.id,
      projectId: project.id,
      dealName: project.name || project.organizationName || 'Deal',
      previousOwnerId: previousOwnerId || undefined,
      newOwnerId: newOwnerId || undefined,
    });
  }

  private emitDealWon(tenantId: string, project: any) {
    eventBus.emit('deal.won', {
      tenantId,
      dealId: project.id,
      projectId: project.id,
      dealName: project.name || project.organizationName || 'Deal',
      leadId: project.leadId || undefined,
      leadName: project.leadName || project.name || undefined,
      clientId: project.clientId || undefined,
      quoteId: project.quoteId || undefined,
      total: this.getDealValue(project),
      ownerId: this.getDealOwner(project) || undefined,
    });
  }

  private emitDealLost(tenantId: string, project: any) {
    eventBus.emit('deal.lost', {
      tenantId,
      dealId: project.id,
      projectId: project.id,
      dealName: project.name || project.organizationName || 'Deal',
      clientId: project.clientId || undefined,
      leadId: project.leadId || undefined,
      lostReason: project.lostReason || 'Not specified',
      ownerId: this.getDealOwner(project) || undefined,
    });
  }

  private async calculateWonDealBilling(tenantId: string, project: any, fallbackTotal: number) {
    const custom = ((project.customFields as any) || {}) as Record<string, any>;
    const requestedPlanName = custom.pricingPlanName || custom.planName || project.planName || 'Professional';
    const plan = await prisma.pricingPlan.findFirst({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { id: custom.pricingPlanId || '' },
          { planName: String(requestedPlanName) },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });
    const billingCycle = String(custom.billingCycle || project.billingCycle || 'MONTHLY').toUpperCase().startsWith('ANNUAL')
      ? 'ANNUAL'
      : 'MONTHLY';
    const setupFee = toNumber(custom.setupFee ?? plan?.setupFee ?? 0);
    const monthlyPrice = toNumber(custom.monthlyPrice ?? plan?.monthlyPrice ?? (billingCycle === 'MONTHLY' ? fallbackTotal : 0));
    const annualPrice = toNumber(custom.annualPrice ?? plan?.annualPrice ?? (billingCycle === 'ANNUAL' ? fallbackTotal : monthlyPrice * 12));
    const mrr = billingCycle === 'ANNUAL' ? annualPrice / 12 : monthlyPrice;
    const arr = billingCycle === 'ANNUAL' ? annualPrice : mrr * 12;

    return {
      planName: plan?.planName || String(requestedPlanName || 'Professional'),
      billingCycle,
      setupFee,
      seats: Number.parseInt(String(custom.seats || plan?.seatLimit || 1), 10) || 1,
      mrr: Math.max(0, Math.round(mrr * 100) / 100),
      arr: Math.max(0, Math.round(arr * 100) / 100),
    };
  }

  private getDealContactEmail(project: any): string {
    return String(project.email || project.contact?.email || '').trim();
  }

  private async ensureTask(
    tenantId: string,
    project: any,
    input: {
      key: string;
      title: string;
      description?: string;
      dueDate: Date;
      priority?: 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT';
      clientId?: string | null;
      leadId?: string | null;
      actorUserId?: string;
    },
  ) {
    const existing = await prisma.task.findFirst({
      where: {
        tenantId,
        projectId: project.id,
        referenceDoctype: 'DealAutomation',
        referenceDocname: `${project.id}:${input.key}`,
      },
    });

    if (existing) return existing;

    const task = await prisma.task.create({
      data: {
        tenantId,
        title: input.title,
        description: input.description || null,
        status: 'TODO',
        priority: input.priority || 'MEDIUM',
        dueDate: input.dueDate,
        assignedToId: this.getDealOwner(project),
        createdById: project.createdById || null,
        projectId: project.id,
        clientId: input.clientId || project.clientId || null,
        leadId: input.leadId || project.leadId || null,
        referenceDoctype: 'DealAutomation',
        referenceDocname: `${project.id}:${input.key}`,
      },
    });

    activityLogger.log({
      tenantId,
      entityType: 'Task',
      entityId: task.id,
      action: 'CREATE',
      module: 'deal-automation',
      description: input.title,
      userId: input.actorUserId,
      metadata: {
        dealId: project.id,
        clientId: input.clientId || project.clientId || null,
        leadId: input.leadId || project.leadId || null,
        automationKey: input.key,
      },
    });

    return task;
  }

  private async ensureDemoAutomation(tenantId: string, project: any, actorUserId?: string): Promise<void> {
    const demoStart = project.expectedClosureDate
      ? new Date(project.expectedClosureDate)
      : this.nextBusinessDate(1, 10);
    if (Number.isNaN(demoStart.getTime())) demoStart.setTime(this.nextBusinessDate(1, 10).getTime());
    const demoEnd = new Date(demoStart);
    demoEnd.setHours(demoEnd.getHours() + 1);

    const existingMeeting = await prisma.calendarEvent.findFirst({
      where: {
        tenantId,
        referenceDoctype: 'DealAutomation',
        referenceDocname: `${project.id}:demo`,
      },
    });

    const meeting = existingMeeting || await prisma.calendarEvent.create({
      data: {
        tenantId,
        title: `Demo: ${project.organizationName || project.name}`,
        description: `Software demo for deal "${project.name}".`,
        eventType: 'MEETING',
        status: 'SCHEDULED',
        startTime: demoStart,
        endTime: demoEnd,
        timezone: 'UTC',
        reminderMinutes: 30,
        priority: 'HIGH',
        category: 'DEMO',
        createdById: project.createdById || null,
        clientId: project.clientId || null,
        leadId: project.leadId || null,
        referenceDoctype: 'DealAutomation',
        referenceDocname: `${project.id}:demo`,
      },
    });

    if (!existingMeeting) {
      activityLogger.log({
        tenantId,
        entityType: 'CalendarEvent',
        entityId: meeting.id,
        action: 'CREATE',
        module: 'deal-automation',
        description: `Demo meeting created for deal "${project.name}"`,
        userId: actorUserId,
        metadata: { dealId: project.id, clientId: project.clientId, leadId: project.leadId },
      });
    }

    await this.ensureDemoConfirmationDraft(tenantId, project, meeting, actorUserId);

    await this.ensureTask(tenantId, project, {
      key: 'demo-preparation',
      title: `Prepare demo: ${project.organizationName || project.name}`,
      description: `Prepare demo agenda, pain points, and Sales CRM workflow for "${project.name}".`,
      dueDate: this.addDays(demoStart, -1),
      priority: 'HIGH',
      actorUserId,
    });

    const followUpDate = this.addDays(demoEnd, 1);
    await this.ensureTask(tenantId, project, {
      key: 'demo-follow-up',
      title: `Follow up after demo: ${project.organizationName || project.name}`,
      description: `Review demo outcome and confirm next step for "${project.name}".`,
      dueDate: followUpDate,
      priority: 'HIGH',
      actorUserId,
    });

    activityLogger.log({
      tenantId,
      entityType: 'Project',
      entityId: project.id,
      action: 'CREATE',
      module: 'deal-automation',
      description: `Demo scheduled automation prepared for deal "${project.name}"`,
      userId: actorUserId,
      metadata: { meetingId: meeting.id },
    });
  }

  private async ensureDemoConfirmationDraft(
    tenantId: string,
    project: any,
    meeting: any,
    actorUserId?: string,
  ): Promise<void> {
    const recipient = this.getDealContactEmail(project);
    if (!recipient) return;

    const existing = await prisma.email.findFirst({
      where: {
        tenantId,
        projectId: project.id,
        status: 'DRAFT',
        subject: { contains: `Demo confirmation` },
      },
    });
    if (existing) return;

    const email = await prisma.email.create({
      data: {
        tenantId,
        fromAddress: 'sales@zodo.ca',
        fromName: 'Zodo Sales',
        toAddresses: [{ email: recipient, name: project.leadName || project.organizationName || project.name }],
        subject: `Demo confirmation: ${project.organizationName || project.name}`,
        bodyText: `Hi,\n\nYour Sales CRM demo is scheduled for ${new Date(meeting.startTime).toLocaleString()}.\n\nWe look forward to showing how Sales CRM can help your sales team manage leads, accounts, proposals, and follow-ups.\n\nThanks,\nZodo Sales`,
        status: 'DRAFT',
        folder: 'DRAFTS',
        isRead: true,
        sentById: project.createdById || null,
        clientId: project.clientId || null,
        contactId: project.contactId || null,
        leadId: project.leadId || null,
        projectId: project.id,
        scheduledFor: new Date(meeting.startTime),
      },
    });

    activityLogger.log({
      tenantId,
      entityType: 'Email',
      entityId: email.id,
      action: 'CREATE',
      module: 'deal-automation',
      description: `Demo confirmation email drafted for ${recipient}`,
      userId: actorUserId,
      metadata: { recipient, meetingId: meeting.id, dealId: project.id },
    });
  }

  private async ensureDemoCompletedAutomation(tenantId: string, project: any, actorUserId?: string): Promise<void> {
    await prisma.project.update({
      where: { id: project.id },
      data: { nextStep: 'Send proposal' },
    });

    await this.ensureTask(tenantId, project, {
      key: 'send-proposal',
      title: `Send proposal: ${project.organizationName || project.name}`,
      description: `Demo completed for "${project.name}". Capture outcome and send proposal.`,
      dueDate: this.nextBusinessDate(1, 10),
      priority: 'HIGH',
      actorUserId,
    });

    activityLogger.log({
      tenantId,
      entityType: 'Project',
      entityId: project.id,
      action: 'STATUS_CHANGE',
      module: 'deal-automation',
      description: `Demo completed for deal "${project.name}". Next step set to send proposal.`,
      userId: actorUserId,
      metadata: { nextStep: 'Send proposal' },
    });
  }

  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;
    const latest = await prisma.quote.findFirst({
      where: { tenantId, quoteNumber: { startsWith: prefix } },
      orderBy: { quoteNumber: 'desc' },
      select: { quoteNumber: true },
    });
    const next = latest?.quoteNumber
      ? Number.parseInt(latest.quoteNumber.replace(prefix, ''), 10) + 1
      : 1;
    return `${prefix}${String(Number.isFinite(next) ? next : 1).padStart(4, '0')}`;
  }

  private async generateProposalNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PR-${year}-`;
    const latest = await prisma.proposal.findFirst({
      where: { tenantId, proposalNumber: { startsWith: prefix } },
      orderBy: { proposalNumber: 'desc' },
      select: { proposalNumber: true },
    });
    const next = latest?.proposalNumber
      ? Number.parseInt(latest.proposalNumber.replace(prefix, ''), 10) + 1
      : 1;
    return `${prefix}${String(Number.isFinite(next) ? next : 1).padStart(4, '0')}`;
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const latest = await prisma.invoice.findFirst({
      where: { tenantId, invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    const next = latest?.invoiceNumber
      ? Number.parseInt(latest.invoiceNumber.replace(prefix, ''), 10) + 1
      : 1;
    return `${prefix}${String(Number.isFinite(next) ? next : 1).padStart(4, '0')}`;
  }

  private async ensureProposalAutomation(tenantId: string, project: any, actorUserId?: string): Promise<void> {
    const total = this.getDealValue(project);
    const validUntil = this.addDays(new Date(), 30);

    let quote = project.quoteId
      ? await prisma.quote.findFirst({ where: { id: project.quoteId, tenantId } })
      : await prisma.quote.findFirst({
        where: {
          tenantId,
          OR: [
            ...(project.leadId ? [{ leadId: project.leadId }] : []),
            ...(project.clientId ? [{ clientId: project.clientId }] : []),
          ],
          notes: { contains: `Deal:${project.id}` },
        },
      });

    if (!quote) {
      quote = await prisma.quote.create({
        data: {
          tenantId,
          quoteNumber: await this.generateQuoteNumber(tenantId),
          status: 'SENT',
          clientId: project.clientId || null,
          leadId: project.leadId || null,
          validUntil,
          currency: 'CAD',
          subtotal: total,
          taxAmount: 0,
          discountAmount: 0,
          total,
          notes: `Deal:${project.id}\nAuto-created when deal moved to Proposal Sent.`,
          terms: 'Proposal valid for 30 days.',
          createdById: project.createdById || null,
          sentAt: new Date(),
          items: {
            create: [{
              tenantId,
              description: `Sales CRM subscription and onboarding - ${project.organizationName || project.name}`,
              quantity: 1,
              unitPrice: total,
              total,
              sortOrder: 0,
            }],
          },
        },
      });

      await prisma.project.update({ where: { id: project.id }, data: { quoteId: quote.id } });

      activityLogger.log({
        tenantId,
        entityType: 'Quote',
        entityId: quote.id,
        action: 'CREATE',
        module: 'deal-automation',
        description: `Quote created for proposal on deal "${project.name}"`,
        userId: actorUserId,
        metadata: { dealId: project.id, clientId: project.clientId, leadId: project.leadId, total },
      });
    }

    const existingProposal = await prisma.proposal.findFirst({
      where: {
        tenantId,
        quoteId: quote.id,
        OR: [
          ...(project.leadId ? [{ leadId: project.leadId }] : []),
          { customMessageToClient: { contains: `Deal:${project.id}` } },
        ],
      },
    });

    if (!existingProposal) {
      const proposal = await prisma.proposal.create({
        data: {
          tenantId,
          proposalNumber: await this.generateProposalNumber(tenantId),
          status: 'SENT',
          leadId: project.leadId || null,
          quoteId: quote.id,
          clientId: project.clientId || null,
          contactId: project.contactId || null,
          projectId: project.id,
          customMessageToClient: `Deal:${project.id}\nProposal for ${project.organizationName || project.client?.clientName || project.name}`,
          scopeOfWork: 'Sales CRM subscription, setup, team onboarding, and sales support.',
          termsAndConditions: 'Pricing and terms are valid for 30 days.',
          createdById: project.createdById || null,
          sentAt: new Date(),
        },
      });

      activityLogger.log({
        tenantId,
        entityType: 'Proposal',
        entityId: proposal.id,
        action: 'CREATE',
        module: 'deal-automation',
        description: `Proposal created for deal "${project.name}"`,
        userId: actorUserId,
        metadata: { dealId: project.id, quoteId: quote.id, leadId: project.leadId, clientId: project.clientId, contactId: project.contactId },
      });
    }

    await this.ensureTask(tenantId, project, {
      key: 'proposal-follow-up',
      title: `Follow up on proposal: ${project.organizationName || project.name}`,
      description: `Proposal was sent for deal "${project.name}". Follow up if the client has not replied.`,
      dueDate: this.nextBusinessDate(2, 10),
      priority: 'HIGH',
      actorUserId,
    });

    activityLogger.log({
      tenantId,
      entityType: 'Project',
      entityId: project.id,
      action: 'CREATE',
      module: 'deal-automation',
      description: `Proposal automation prepared for deal "${project.name}"`,
      userId: actorUserId,
      metadata: { quoteId: quote.id },
    });
  }

  private async ensureDealWonAutomation(tenantId: string, project: any, actorUserId?: string): Promise<void> {
    if (!project.clientId) {
      throw new BadRequestError('A client/account is required before marking a deal Won', ErrorCodes.VALIDATION_FAILED);
    }

    const total = this.getDealValue(project);
    const dueDate = this.addDays(new Date(), 14);
    const billing = await this.calculateWonDealBilling(tenantId, project, total);
    const renewalDate = this.addDays(new Date(), billing.billingCycle === 'ANNUAL' ? 365 : 30);
    const { mrr, arr } = billing;

    await prisma.client.update({
      where: { id_tenantId: { id: project.clientId, tenantId } },
      data: {
        status: 'ACTIVE',
        lifecycleStage: 'ONBOARDING',
        nextFollowUp: this.addDays(new Date(), 30),
        internalNotes: [
          project.client?.internalNotes,
          `Deal "${project.name}" marked Won on ${new Date().toISOString().slice(0, 10)}. Subscription tracking started for Sales CRM.`,
        ].filter(Boolean).join('\n\n'),
      },
    });

    if (project.leadId) {
      await prisma.lead.update({
        where: { id_tenantId: { id: project.leadId, tenantId } },
        data: {
          status: 'WON',
          converted: true,
          convertedAt: new Date(),
          convertedToClientId: project.clientId,
          convertedToDealId: project.id,
          convertedToContactId: project.contactId || undefined,
        },
      });
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: { tenantId, projectId: project.id },
    });

    const invoice = existingInvoice || await prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber: await this.generateInvoiceNumber(tenantId),
        clientId: project.clientId,
        projectId: project.id,
        issueDate: new Date(),
        dueDate,
        currency: 'CAD',
        status: 'DRAFT',
        subtotal: total,
        taxAmount: 0,
        discountAmount: 0,
        total,
        amountPaid: 0,
        amountDue: total,
        notes: `Auto-created when deal "${project.name}" was marked Won.`,
        terms: 'Due on receipt unless otherwise agreed.',
        createdById: project.createdById || null,
        items: {
          create: [{
            tenantId,
            description: `Sales CRM subscription/setup - ${project.organizationName || project.name}`,
            quantity: 1,
            unitPrice: total,
            amount: total,
            sortOrder: 0,
          }],
        },
      },
    });

    if (!existingInvoice) {
      activityLogger.log({
        tenantId,
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'CREATE',
        module: 'deal-automation',
        description: `Invoice created from won deal "${project.name}"`,
        userId: actorUserId,
        metadata: { dealId: project.id, clientId: project.clientId, total },
      });
    }

    const subscription = await prisma.customerSubscription.upsert({
      where: {
        tenantId_clientId_projectId: {
          tenantId,
          clientId: project.clientId,
          projectId: project.id,
        },
      },
      update: {
        invoiceId: invoice.id,
        contactId: project.contactId || null,
        quoteId: project.quoteId || null,
          status: 'PENDING_PAYMENT',
          mrr,
          arr,
          seats: billing.seats,
          setupFee: billing.setupFee,
          discountAmount: 0,
          taxRate: 0,
          paymentTerms: 'Due on receipt',
        ownerId: this.getDealOwner(project),
        renewalDate,
        notes: `Auto-created from won deal "${project.name}".`,
      } as any,
      create: {
        tenantId,
        clientId: project.clientId,
        projectId: project.id,
        invoiceId: invoice.id,
        subscriptionNumber: `SUB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        contactId: project.contactId || null,
        quoteId: project.quoteId || null,
        planName: billing.planName,
        billingCycle: billing.billingCycle,
        status: 'PENDING_PAYMENT',
        mrr,
        arr,
        seats: billing.seats,
        setupFee: billing.setupFee,
        discountAmount: 0,
        taxRate: 0,
        paymentTerms: 'Due on receipt',
        ownerId: this.getDealOwner(project),
        startDate: new Date(),
        renewalDate,
        notes: `Auto-created from won deal "${project.name}".`,
      } as any,
    });

    await this.ensureTask(tenantId, project, {
      key: 'subscription-setup',
      title: `Set up subscription: ${project.organizationName || project.name}`,
      description: 'Create/confirm the customer subscription plan, billing cycle, seats, and renewal date.',
      dueDate: this.nextBusinessDate(1, 11),
      priority: 'HIGH',
      actorUserId,
    });

    await this.ensureTask(tenantId, project, {
      key: 'onboarding',
      title: `Start onboarding: ${project.organizationName || project.name}`,
      description: 'Welcome the customer, set up Sales CRM workspace, invite users, and schedule kickoff.',
      dueDate: this.nextBusinessDate(1, 14),
      priority: 'HIGH',
      actorUserId,
    });

    await this.ensureTask(tenantId, project, {
      key: 'renewal-reminder',
      title: `Renewal reminder: ${project.organizationName || project.name}`,
      description: 'Review account health and prepare renewal conversation.',
      dueDate: this.addDays(renewalDate, -30),
      priority: 'MEDIUM',
      actorUserId,
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'COMPLETED',
        closedDate: project.closedDate || new Date(),
      },
    });

    activityLogger.log({
      tenantId,
      entityType: 'Project',
      entityId: project.id,
      action: 'STATUS_CHANGE',
      module: 'deal-automation',
      description: `Deal won automation completed for "${project.name}"`,
      userId: actorUserId,
      metadata: { invoiceId: invoice.id, clientId: project.clientId, subscriptionId: subscription.id },
    });

    activityLogger.log({
      tenantId,
      entityType: 'CustomerSubscription',
      entityId: subscription.id,
      action: 'CREATE',
      module: 'deal-automation',
      description: `Customer subscription prepared for "${project.organizationName || project.name}"`,
      userId: actorUserId,
      metadata: { dealId: project.id, invoiceId: invoice.id, mrr, arr, renewalDate },
    });
  }

  private async ensureDealLostAutomation(
    tenantId: string,
    project: any,
    previousProject: any,
    actorUserId?: string,
  ): Promise<void> {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'CANCELLED',
        closedDate: project.closedDate || new Date(),
      },
    });

    if (project.leadId) {
      await prisma.lead.update({
        where: { id_tenantId: { id: project.leadId, tenantId } },
        data: {
          status: 'LOST',
          lostReason: project.lostReason || previousProject?.lostReason || 'Not specified',
          lostNotes: project.lostNotes || previousProject?.lostNotes || null,
          closedAt: new Date(),
        },
      });
    }

    if (project.expectedClosureDate) {
      await this.ensureTask(tenantId, project, {
        key: 'lost-follow-up',
        title: `Future follow-up for lost deal: ${project.organizationName || project.name}`,
        description: `Deal was lost. Reason: ${project.lostReason || previousProject?.lostReason || 'Not specified'}. Revisit if timing changes.`,
        dueDate: new Date(project.expectedClosureDate),
        priority: 'NORMAL',
        actorUserId,
      });
    }

    activityLogger.log({
      tenantId,
      entityType: 'Project',
      entityId: project.id,
      action: 'STATUS_CHANGE',
      module: 'deal-automation',
      description: `Deal lost automation completed for "${project.name}"`,
      userId: actorUserId,
      metadata: {
        lostReason: project.lostReason || previousProject?.lostReason,
        followUpDate: project.expectedClosureDate || null,
      },
    });
  }

  async updateStage(id: string, tenantId: string, stageId: string, changedById?: string, notes?: string) {
    // Fetch current project + stage info before update
    const currentProject = await projectsRepository.findById(id, tenantId);
    const previousStage = (currentProject as any)?.stage;

    const updated = await this.guarded(() => projectsRepository.updateStage(id, tenantId, stageId, changedById, notes));

    // Fetch new stage to get slug/name
    const newStage = await prisma.projectStage.findUnique({ where: { id: stageId } });

    if (newStage) {
      const { eventBus } = await import('../../common/events/event-bus');
      eventBus.emit('project.stageChanged', {
        tenantId,
        projectId: id,
        projectName: (updated as any)?.name || '',
        clientId: (updated as any)?.clientId || undefined,
        clientName: (updated as any)?.client?.clientName || undefined,
        previousStageSlug: previousStage?.slug || undefined,
        previousStageName: previousStage?.name || undefined,
        newStageSlug: newStage.slug,
        newStageName: newStage.name,
        contractValue: (updated as any)?.contractValue ? Number((updated as any).contractValue) : undefined,
        changedById,
        projectManagerId: (updated as any)?.projectManagerId || undefined,
        salesRepId: (updated as any)?.salesRepId || undefined,
      });
    }

    return updated;
  }

  async updateStatus(id: string, tenantId: string, status: string) {
    return this.guarded(async () => {
      const project = await projectsRepository.updateStatus(id, tenantId, status);
      const allowCompletedSync = status === 'COMPLETED';
      await this.syncProjectRevenueState(project.id, tenantId, { allowCompletedSync });
      return this.getProjectDetailOrThrow(project.id, tenantId);
    });
  }

  async assignProjectManager(id: string, tenantId: string, projectManagerId?: string | null) {
    return this.guarded(() => projectsRepository.assignProjectManager(id, tenantId, projectManagerId));
  }

  async delete(id: string, tenantId: string) {
    return this.guarded(async () => {
      await projectsRepository.softDelete(id, tenantId);
    });
  }

  async getFinancials(id: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getFinancials(id, tenantId));
  }

  async getProfitability(id: string, tenantId: string) {
    return this.guarded(async () => {
      const financials = await projectsRepository.getFinancials(id, tenantId);
      const contractValue = toNumber(financials.project?.contractValue);
      const actualCost = financials.materialsCost + financials.laborCost + financials.expensesCost;
      const grossProfit = contractValue - actualCost;
      const profitMargin = contractValue > 0 ? (grossProfit / contractValue) * 100 : 0;

      return {
        project: financials.project,
        contractValue,
        actualCost,
        grossProfit,
        profitMargin,
        estimatedCost: toNumber(financials.project?.estimatedCost),
        invoiced: financials.invoiced,
        paid: financials.paid,
        outstanding: financials.invoiced - financials.paid,
        breakdown: {
          materials: financials.materialsCost,
          labor: financials.laborCost,
          expenses: financials.expensesCost,
        },
      };
    });
  }

  async recalculateFinancials(id: string, tenantId: string) {
    return this.guarded(async () => {
      const result = await projectsRepository.recalculateFinancials(id, tenantId);
      await liveInvoiceSyncService.syncProjectInvoiceDraft(tenantId, id);
      return result;
    });
  }

  async getTasks(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getTasks(projectId, tenantId));
  }

  async createTask(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.createTask(projectId, tenantId, data, userId));
  }

  async updateTask(projectId: string, taskId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateTask(projectId, taskId, tenantId, data));
  }

  async completeTask(projectId: string, taskId: string, tenantId: string, userId?: string) {
    return this.guarded(() => projectsRepository.completeTask(projectId, taskId, tenantId, userId));
  }

  async deleteTask(projectId: string, taskId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deleteTask(projectId, taskId, tenantId));
  }

  async getMaterials(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getMaterials(projectId, tenantId));
  }

  async addMaterial(projectId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(async () => {
      const material = await projectsRepository.addMaterial(projectId, tenantId, data);
      await this.syncProjectRevenueState(projectId, tenantId);
      return material;
    });
  }

  async updateMaterial(projectId: string, materialId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(async () => {
      const material = await projectsRepository.updateMaterial(projectId, materialId, tenantId, data);
      await this.syncProjectRevenueState(projectId, tenantId);
      return material;
    });
  }

  async deleteMaterial(projectId: string, materialId: string, tenantId: string) {
    return this.guarded(async () => {
      const deleted = await projectsRepository.deleteMaterial(projectId, materialId, tenantId);
      await this.syncProjectRevenueState(projectId, tenantId);
      return deleted;
    });
  }

  async importMaterialsFromQuote(projectId: string, tenantId: string) {
    return this.guarded(async () => {
      const result = await projectsRepository.importMaterialsFromQuote(projectId, tenantId);
      await this.syncProjectRevenueState(projectId, tenantId);
      return result;
    });
  }

  async getLabor(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getLabor(projectId, tenantId));
  }

  async addLabor(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(async () => {
      const labor = await projectsRepository.addLabor(projectId, tenantId, data, userId);
      await this.syncProjectRevenueState(projectId, tenantId);
      return labor;
    });
  }

  async updateLabor(projectId: string, laborId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(async () => {
      const labor = await projectsRepository.updateLabor(projectId, laborId, tenantId, data);
      await this.syncProjectRevenueState(projectId, tenantId);
      return labor;
    });
  }

  async deleteLabor(projectId: string, laborId: string, tenantId: string) {
    return this.guarded(async () => {
      const deleted = await projectsRepository.deleteLabor(projectId, laborId, tenantId);
      await this.syncProjectRevenueState(projectId, tenantId);
      return deleted;
    });
  }

  async getLaborSummary(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getLaborSummary(projectId, tenantId));
  }

  async getExpenses(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getExpenses(projectId, tenantId));
  }

  async addExpense(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(async () => {
      const expense = await projectsRepository.addExpense(projectId, tenantId, data, userId);
      await this.syncProjectRevenueState(projectId, tenantId);
      return expense;
    });
  }

  async updateExpense(projectId: string, expenseId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(async () => {
      const expense = await projectsRepository.updateExpense(projectId, expenseId, tenantId, data);
      await this.syncProjectRevenueState(projectId, tenantId);
      return expense;
    });
  }

  async deleteExpense(projectId: string, expenseId: string, tenantId: string) {
    return this.guarded(async () => {
      const deleted = await projectsRepository.deleteExpense(projectId, expenseId, tenantId);
      await this.syncProjectRevenueState(projectId, tenantId);
      return deleted;
    });
  }

  async getCrewAssignments(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getCrewAssignments(projectId, tenantId));
  }

  async assignCrew(projectId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.assignCrew(projectId, tenantId, data));
  }

  async updateCrewAssignment(projectId: string, assignmentId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateCrewAssignment(projectId, assignmentId, tenantId, data));
  }

  async deleteCrewAssignment(projectId: string, assignmentId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deleteCrewAssignment(projectId, assignmentId, tenantId));
  }

  async getDocuments(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getDocuments(projectId, tenantId));
  }

  async attachDocument(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.attachDocument(projectId, tenantId, data, userId));
  }

  async removeDocument(projectId: string, docId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.removeDocument(projectId, docId, tenantId));
  }

  async getPhotos(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getPhotos(projectId, tenantId));
  }

  async uploadPhoto(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.uploadPhoto(projectId, tenantId, data, userId));
  }

  async updatePhoto(projectId: string, photoId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updatePhoto(projectId, photoId, tenantId, data));
  }

  async deletePhoto(projectId: string, photoId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deletePhoto(projectId, photoId, tenantId));
  }

  async getNotes(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getNotes(projectId, tenantId));
  }

  async addNote(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.addNote(projectId, tenantId, data, userId));
  }

  async updateNote(projectId: string, noteId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateNote(projectId, noteId, tenantId, data));
  }

  async deleteNote(projectId: string, noteId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.deleteNote(projectId, noteId, tenantId));
  }

  async getCommunications(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getCommunications(projectId, tenantId));
  }

  async logCommunication(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.logCommunication(projectId, tenantId, data, userId));
  }

  async getInspections(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getInspections(projectId, tenantId));
  }

  async scheduleInspection(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.scheduleInspection(projectId, tenantId, data, userId));
  }

  async updateInspection(projectId: string, inspId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateInspection(projectId, inspId, tenantId, data));
  }

  async recordInspectionResult(projectId: string, inspId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.recordInspectionResult(projectId, inspId, tenantId, data));
  }

  async getChangeOrders(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getChangeOrders(projectId, tenantId));
  }

  async createChangeOrder(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.createChangeOrder(projectId, tenantId, data, userId));
  }

  async updateChangeOrder(projectId: string, coId: string, tenantId: string, data: Record<string, any>) {
    return this.guarded(() => projectsRepository.updateChangeOrder(projectId, coId, tenantId, data));
  }

  async approveChangeOrder(projectId: string, coId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.approveChangeOrder(projectId, coId, tenantId));
  }

  async getWeatherDelays(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getWeatherDelays(projectId, tenantId));
  }

  async addWeatherDelay(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    return this.guarded(() => projectsRepository.addWeatherDelay(projectId, tenantId, data, userId));
  }

  async getTimeline(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getTimeline(projectId, tenantId));
  }

  async getStageHistory(projectId: string, tenantId: string) {
    return this.guarded(() => projectsRepository.getStageHistory(projectId, tenantId));
  }
}

export const projectsService = new ProjectsService();
