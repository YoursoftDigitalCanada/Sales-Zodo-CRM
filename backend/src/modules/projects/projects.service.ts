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

  throw new BadRequestError('Project operation failed', ErrorCodes.INVALID_INPUT);
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
      throw new NotFoundError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    return project;
  }

  async create(tenantId: string, data: Record<string, any>, createdById?: string) {
    const dto = normalizeProjectDto(data);
    return this.guarded(async () => {
      const project = await projectsRepository.create(tenantId, dto, createdById);
      await this.syncProjectRevenueState(project.id, tenantId);
      return this.getProjectDetailOrThrow(project.id, tenantId);
    });
  }

  async createFromQuote(tenantId: string, quoteId: string, userId?: string) {
    return this.guarded(async () => {
      const project = await projectsRepository.createFromQuote(tenantId, quoteId, userId);
      const projectId = (project as any)?.id;
      if (!projectId) {
        throw new NotFoundError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);
      }
      await this.syncProjectRevenueState(projectId, tenantId);
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
      if (dto.dealStatus === 'Lost' && !(dto.lostReason || (current as any).lostReason)) {
        throw new BadRequestError('Lost reason is required when a deal is marked Lost', ErrorCodes.VALIDATION_FAILED);
      }

      const project = await projectsRepository.update(id, tenantId, dto);
      if (dto.dealStatus && dto.dealStatus !== (current as any).dealStatus) {
        await this.runDealStageAutomation(tenantId, project.id, dto.dealStatus, current as any, actorUserId);
      }
      await this.syncProjectRevenueState(project.id, tenantId);
      return this.getProjectDetailOrThrow(project.id, tenantId);
    });
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
      description: `Prepare demo agenda, pain points, and Roofer CRM workflow for "${project.name}".`,
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
        bodyText: `Hi,\n\nYour Roofer CRM demo is scheduled for ${new Date(meeting.startTime).toLocaleString()}.\n\nWe look forward to showing how Roofer CRM can help your roofing company manage leads, jobs, proposals, and follow-ups.\n\nThanks,\nZodo Sales`,
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
              description: `Roofer CRM subscription and onboarding - ${project.organizationName || project.name}`,
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

    if (project.leadId) {
      const existingProposal = await prisma.proposal.findFirst({
        where: { tenantId, leadId: project.leadId, quoteId: quote.id },
      });

      if (!existingProposal) {
        const proposal = await prisma.proposal.create({
          data: {
            tenantId,
            proposalNumber: await this.generateProposalNumber(tenantId),
            status: 'SENT',
            leadId: project.leadId,
            quoteId: quote.id,
            customMessageToClient: `Proposal for ${project.organizationName || project.name}`,
            scopeOfWork: 'Roofer CRM subscription, setup, team onboarding, and sales support.',
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
          metadata: { dealId: project.id, quoteId: quote.id, leadId: project.leadId },
        });
      }
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
    const renewalDate = this.addDays(new Date(), 365);
    const mrr = total > 0 ? total : 0;
    const arr = mrr * 12;

    await prisma.client.update({
      where: { id: project.clientId },
      data: {
        status: 'ACTIVE',
        lifecycleStage: 'ONBOARDING',
        nextFollowUp: this.addDays(new Date(), 30),
        internalNotes: [
          project.client?.internalNotes,
          `Deal "${project.name}" marked Won on ${new Date().toISOString().slice(0, 10)}. Subscription tracking started for Roofer CRM.`,
        ].filter(Boolean).join('\n\n'),
      },
    });

    if (project.leadId) {
      await prisma.lead.update({
        where: { id: project.leadId },
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
            description: `Roofer CRM subscription/setup - ${project.organizationName || project.name}`,
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
        status: 'PENDING_PAYMENT',
        mrr,
        arr,
        renewalDate,
        notes: `Auto-created from won deal "${project.name}".`,
      },
      create: {
        tenantId,
        clientId: project.clientId,
        projectId: project.id,
        invoiceId: invoice.id,
        planName: 'Roofer CRM',
        billingCycle: 'MONTHLY',
        status: 'PENDING_PAYMENT',
        mrr,
        arr,
        startDate: new Date(),
        renewalDate,
        notes: `Auto-created from won deal "${project.name}".`,
      },
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
      description: 'Welcome the customer, set up Roofer CRM workspace, invite users, and schedule kickoff.',
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
        where: { id: project.leadId },
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
