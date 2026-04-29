import { Prisma, ProjectStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateProjectDto, ProjectQueryDto, toNumber, UpdateProjectDto } from './projects.dto';
import {
  DataAccessContext,
  buildProjectAccessWhere,
  mergeWhereWithAccess,
} from '../../common/access/data-access';

const projectDetailInclude = {
  client: {
    select: {
      id: true,
      clientName: true,
      primaryEmail: true,
      primaryPhone: true,
      streetAddress: true,
      city: true,
      province: true,
      postalCode: true,
      country: true,
      gstHstNumber: true,
      paymentTerms: true,
      currency: true,
    },
  },
  quote: {
    select: {
      id: true,
      quoteNumber: true,
      total: true,
      status: true,
      subtotal: true,
      taxRate: true,
      taxAmount: true,
      discountAmount: true,
      notes: true,
      terms: true,
      currency: true,
    },
  },
  lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  stage: true,
  projectTasks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: 200 },
  projectMaterials: { orderBy: { createdAt: 'desc' }, take: 200 },
  projectLaborEntries: { orderBy: { date: 'desc' }, take: 500 },
  projectExpenses: { orderBy: { expenseDate: 'desc' }, take: 200 },
  crewAssignments: { orderBy: { scheduledStartDate: 'asc' }, take: 100 },
  projectNotes: { orderBy: { createdAt: 'desc' }, take: 200 },
  projectCommunications: { orderBy: { communicatedAt: 'desc' }, take: 200 },
  projectInspections: { orderBy: { createdAt: 'desc' }, take: 100 },
  changeOrders: { orderBy: { createdAt: 'desc' }, take: 100 },
  weatherDelays: { orderBy: { date: 'desc' }, take: 120 },
  projectPhotos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], take: 500 },
  projectDocuments: { orderBy: { addedAt: 'desc' }, take: 300 },
  projectStageHistory: { orderBy: { enteredAt: 'desc' }, take: 300, include: { stage: true } },
  members: {
    include: {
      employee: {
        select: {
          id: true,
          department: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    take: 100,
  },
  invoices: {
    include: {
      client: { select: { id: true, clientName: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  },
  payments: { orderBy: { paymentDate: 'desc' } },
  _count: {
    select: {
      projectTasks: true,
      projectMaterials: true,
      projectLaborEntries: true,
      projectExpenses: true,
      projectPhotos: true,
      projectDocuments: true,
      projectNotes: true,
      projectCommunications: true,
      projectInspections: true,
      changeOrders: true,
      weatherDelays: true,
      invoices: true,
      payments: true,
    },
  },
} satisfies Prisma.ProjectInclude;

export class ProjectsRepository {
  private async ensureProject(id: string, tenantId: string) {
    const project = await prisma.project.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!project) {
      throw new Error('PROJECT_NOT_FOUND');
    }
  }

  async generateProjectNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PRJ-${year}-`;

    const latest = await prisma.project.findFirst({
      where: {
        tenantId,
        projectNumber: { startsWith: prefix },
      },
      orderBy: { projectNumber: 'desc' },
      select: { projectNumber: true },
    });

    const latestSeq = latest?.projectNumber
      ? Number(latest.projectNumber.split('-').pop()) || 0
      : 0;

    const next = latestSeq + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  async create(tenantId: string, data: CreateProjectDto, createdById?: string) {
    const projectNumber = data.projectNumber || await this.generateProjectNumber(tenantId);

    return prisma.project.create({
      data: {
        tenantId,
        projectNumber,
        name: data.name,
        description: data.description ?? null,
        clientId: data.clientId ?? null,
        quoteId: data.quoteId ?? null,
        leadId: data.leadId ?? null,
        projectType: data.projectType ?? 'REPLACEMENT',
        propertyType: data.propertyType ?? 'RESIDENTIAL',
        status: data.status ?? 'PENDING',
        priority: data.priority ?? 'NORMAL',
        stageId: data.stageId ?? null,
        projectManagerId: data.projectManagerId ?? null,
        salesRepId: data.salesRepId ?? null,
        contractValue: this.asDecimalOrNull(data.contractValue),
        estimatedCost: this.asDecimalOrNull(data.estimatedCost),
        budget: this.asDecimalOrNull(data.budget),
        estimatedStartDate: this.asDateOrNull(data.estimatedStartDate),
        estimatedEndDate: this.asDateOrNull(data.estimatedEndDate),
        estimatedDuration: data.estimatedDuration ?? null,
        roofType: data.roofType ?? null,
        roofSquares: this.asDecimalOrNull(data.roofSquares),
        roofPitch: data.roofPitch ?? null,
        roofLayers: data.roofLayers ?? undefined,
        stories: data.stories ?? undefined,
        shingleManufacturer: data.shingleManufacturer ?? null,
        shingleProduct: data.shingleProduct ?? null,
        shingleColor: data.shingleColor ?? null,
        jobSiteAddress: data.jobSiteAddress ?? null,
        jobSiteAddress2: data.jobSiteAddress2 ?? null,
        jobSiteCity: data.jobSiteCity ?? null,
        jobSiteState: data.jobSiteState ?? null,
        jobSiteZip: data.jobSiteZip ?? null,
        jobSiteCountry: data.jobSiteCountry ?? undefined,
        latitude: this.asDecimalOrNull(data.latitude),
        longitude: this.asDecimalOrNull(data.longitude),
        isInsuranceJob: data.isInsuranceJob ?? false,
        insuranceCompany: data.insuranceCompany ?? null,
        claimNumber: data.claimNumber ?? null,
        policyNumber: data.policyNumber ?? null,
        deductible: this.asDecimalOrNull(data.deductible),
        dateOfLoss: this.asDateOrNull(data.dateOfLoss),
        permitRequired: data.permitRequired ?? true,
        permitNumber: data.permitNumber ?? null,
        permitStatus: data.permitStatus ?? null,
        permitPulledDate: this.asDateOrNull(data.permitPulledDate),
        permitApprovedDate: this.asDateOrNull(data.permitApprovedDate),
        warrantyType: data.warrantyType ?? null,
        warrantyYears: data.warrantyYears ?? null,
        tags: data.tags ?? [],
        customFields: (data.customFields ?? {}) as Prisma.InputJsonValue,
        internalNotes: data.internalNotes ?? null,
        createdById: createdById ?? null,
      },
      include: projectDetailInclude,
    });
  }

  async createFromQuote(tenantId: string, quoteId: string, userId?: string) {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      include: { client: true, lead: true, items: true },
    });

    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }

    if (!['SIGNED', 'ACCEPTED'].includes(String(quote.status))) {
      throw new Error('Only signed estimates can be converted into jobs');
    }

    const name = quote.client?.clientName
      ? `${quote.client.clientName} - Roofing Project`
      : `Quote ${quote.quoteNumber} - Roofing Project`;

    const project = await this.create(
      tenantId,
      {
        name,
        description: quote.notes || undefined,
        clientId: quote.clientId,
        quoteId: quote.id,
        leadId: quote.leadId,
        status: 'APPROVED',
        projectType: 'REPLACEMENT',
        propertyType: 'RESIDENTIAL',
        contractValue: toNumber(quote.total),
        estimatedCost: toNumber(quote.total) * 0.65,
        budget: toNumber(quote.total),
      },
      userId,
    );

    if (quote.items.length > 0) {
      await prisma.projectMaterial.createMany({
        data: quote.items.map((item) => ({
          tenantId,
          projectId: project.id,
          name: item.description,
          category: 'ROOFING',
          quantityNeeded: item.quantity,
          unit: 'each',
          unitCost: item.unitPrice,
          totalCost: item.total,
        })),
      });
    }

    if ((quote as any).signedPdfFileId) {
      await prisma.file.updateMany({
        where: { id: (quote as any).signedPdfFileId, tenantId },
        data: { projectId: project.id },
      });
    }

    return this.findById(project.id, tenantId);
  }

  async findById(id: string, tenantId: string) {
    return prisma.project.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: projectDetailInclude,
    });
  }

  async findMany(tenantId: string, query: ProjectQueryDto, dataAccess?: DataAccessContext) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      priority,
      projectType,
      stageId,
      clientId,
      leadId,
      projectManagerId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = query;

    const baseWhere: Prisma.ProjectWhereInput = {
      tenantId,
      deletedAt: null,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(projectType && { projectType }),
      ...(stageId && { stageId }),
      ...(clientId && { clientId }),
      ...(leadId && { leadId }),
      ...(projectManagerId && { projectManagerId }),
      ...(startDate || endDate
        ? {
          OR: [
            {
              estimatedStartDate: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            },
            {
              createdAt: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            },
          ],
        }
        : {}),
      ...(search
        ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { projectNumber: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { client: { clientName: { contains: search, mode: 'insensitive' } } },
          ],
        }
        : {}),
    };
    const where = mergeWhereWithAccess(baseWhere, buildProjectAccessWhere(dataAccess));

    const allowedSortFields = new Set([
      'createdAt',
      'updatedAt',
      'name',
      'projectNumber',
      'status',
      'priority',
      'estimatedStartDate',
      'estimatedEndDate',
      'contractValue',
      'completionPercentage',
    ]);

    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          client: { select: { id: true, clientName: true } },
          stage: true,
          _count: {
            select: {
              projectTasks: true,
              projectPhotos: true,
              projectDocuments: true,
            },
          },
        },
        orderBy: { [safeSortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return { data, total };
  }

  async getKanban(tenantId: string, dataAccess?: DataAccessContext) {
    const projectWhere = mergeWhereWithAccess(
      { tenantId, deletedAt: null },
      buildProjectAccessWhere(dataAccess),
    );
    const [stages, projects] = await Promise.all([
      prisma.projectStage.findMany({ where: { tenantId }, orderBy: { order: 'asc' } }),
      prisma.project.findMany({
        where: projectWhere,
        select: {
          id: true,
          projectNumber: true,
          name: true,
          status: true,
          priority: true,
          stageId: true,
          completionPercentage: true,
          contractValue: true,
          estimatedStartDate: true,
          estimatedEndDate: true,
          client: { select: { id: true, clientName: true } },
        },
      }),
    ]);

    if (stages.length === 0) {
      const byStatus = new Map<string, any[]>();
      for (const project of projects) {
        const key = project.status;
        if (!byStatus.has(key)) byStatus.set(key, []);
        byStatus.get(key)!.push(project);
      }
      return Array.from(byStatus.entries()).map(([status, items], index) => ({
        id: `status-${status}`,
        name: status,
        slug: status,
        order: index + 1,
        projects: items,
        count: items.length,
      }));
    }

    return stages.map((stage) => {
      const items = projects.filter((p) => p.stageId === stage.id);
      return {
        ...stage,
        projects: items,
        count: items.length,
      };
    });
  }

  async getCalendar(tenantId: string, dataAccess?: DataAccessContext) {
    const where = mergeWhereWithAccess(
      { tenantId, deletedAt: null },
      buildProjectAccessWhere(dataAccess),
    );
    return prisma.project.findMany({
      where,
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        estimatedStartDate: true,
        estimatedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        completionPercentage: true,
        client: { select: { id: true, clientName: true } },
      },
      orderBy: { estimatedStartDate: 'asc' },
    });
  }

  async getMap(tenantId: string, dataAccess?: DataAccessContext) {
    const where = mergeWhereWithAccess(
      {
        tenantId,
        deletedAt: null,
        OR: [
          { latitude: { not: null } },
          { longitude: { not: null } },
          { jobSiteAddress: { not: null } },
        ],
      },
      buildProjectAccessWhere(dataAccess),
    );
    return prisma.project.findMany({
      where,
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        priority: true,
        jobSiteAddress: true,
        jobSiteCity: true,
        jobSiteState: true,
        jobSiteZip: true,
        latitude: true,
        longitude: true,
        client: { select: { id: true, clientName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummaryStats(tenantId: string, dataAccess?: DataAccessContext) {
    const accessibleWhere = buildProjectAccessWhere(dataAccess);
    const activeStatuses: ProjectStatus[] = ['IN_PROGRESS', 'ACTIVE', 'SCHEDULED', 'APPROVED'];
    const [
      total,
      active,
      completed,
      onHold,
      contractAgg,
      costAgg,
      byStatus,
    ] = await Promise.all([
      prisma.project.count({ where: mergeWhereWithAccess({ tenantId, deletedAt: null }, accessibleWhere) }),
      prisma.project.count({ where: mergeWhereWithAccess({ tenantId, deletedAt: null, status: { in: activeStatuses } }, accessibleWhere) }),
      prisma.project.count({ where: mergeWhereWithAccess({ tenantId, deletedAt: null, status: 'COMPLETED' as ProjectStatus }, accessibleWhere) }),
      prisma.project.count({ where: mergeWhereWithAccess({ tenantId, deletedAt: null, status: 'ON_HOLD' as ProjectStatus }, accessibleWhere) }),
      prisma.project.aggregate({ where: mergeWhereWithAccess({ tenantId, deletedAt: null }, accessibleWhere), _sum: { contractValue: true } }),
      prisma.project.aggregate({ where: mergeWhereWithAccess({ tenantId, deletedAt: null }, accessibleWhere), _sum: { actualCost: true } }),
      prisma.project.groupBy({ by: ['status'], where: mergeWhereWithAccess({ tenantId, deletedAt: null }, accessibleWhere), _count: { status: true } }),
    ]);

    const contractValue = toNumber(contractAgg._sum.contractValue);
    const actualCost = toNumber(costAgg._sum.actualCost);

    return {
      total,
      active,
      completed,
      onHold,
      contractValue,
      actualCost,
      grossProfit: contractValue - actualCost,
      byStatus: byStatus.map((item) => ({ status: item.status, count: item._count.status })),
    };
  }

  async update(id: string, tenantId: string, data: UpdateProjectDto) {
    await this.ensureProject(id, tenantId);

    return prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.quoteId !== undefined && { quoteId: data.quoteId }),
        ...(data.leadId !== undefined && { leadId: data.leadId }),
        ...(data.projectType !== undefined && { projectType: data.projectType }),
        ...(data.propertyType !== undefined && { propertyType: data.propertyType }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.stageId !== undefined && { stageId: data.stageId }),
        ...(data.projectManagerId !== undefined && { projectManagerId: data.projectManagerId }),
        ...(data.salesRepId !== undefined && { salesRepId: data.salesRepId }),
        ...(data.contractValue !== undefined && { contractValue: this.asDecimalOrNull(data.contractValue) }),
        ...(data.estimatedCost !== undefined && { estimatedCost: this.asDecimalOrNull(data.estimatedCost) }),
        ...(data.budget !== undefined && { budget: this.asDecimalOrNull(data.budget) }),
        ...(data.estimatedStartDate !== undefined && { estimatedStartDate: this.asDateOrNull(data.estimatedStartDate) }),
        ...(data.estimatedEndDate !== undefined && { estimatedEndDate: this.asDateOrNull(data.estimatedEndDate) }),
        ...(data.estimatedDuration !== undefined && { estimatedDuration: data.estimatedDuration }),
        ...(data.roofType !== undefined && { roofType: data.roofType }),
        ...(data.roofSquares !== undefined && { roofSquares: this.asDecimalOrNull(data.roofSquares) }),
        ...(data.roofPitch !== undefined && { roofPitch: data.roofPitch }),
        ...(data.roofLayers !== undefined && { roofLayers: data.roofLayers }),
        ...(data.stories !== undefined && { stories: data.stories }),
        ...(data.shingleManufacturer !== undefined && { shingleManufacturer: data.shingleManufacturer }),
        ...(data.shingleProduct !== undefined && { shingleProduct: data.shingleProduct }),
        ...(data.shingleColor !== undefined && { shingleColor: data.shingleColor }),
        ...(data.jobSiteAddress !== undefined && { jobSiteAddress: data.jobSiteAddress }),
        ...(data.jobSiteAddress2 !== undefined && { jobSiteAddress2: data.jobSiteAddress2 }),
        ...(data.jobSiteCity !== undefined && { jobSiteCity: data.jobSiteCity }),
        ...(data.jobSiteState !== undefined && { jobSiteState: data.jobSiteState }),
        ...(data.jobSiteZip !== undefined && { jobSiteZip: data.jobSiteZip }),
        ...(data.jobSiteCountry !== undefined && { jobSiteCountry: data.jobSiteCountry }),
        ...(data.latitude !== undefined && { latitude: this.asDecimalOrNull(data.latitude) }),
        ...(data.longitude !== undefined && { longitude: this.asDecimalOrNull(data.longitude) }),
        ...(data.isInsuranceJob !== undefined && { isInsuranceJob: data.isInsuranceJob }),
        ...(data.insuranceCompany !== undefined && { insuranceCompany: data.insuranceCompany }),
        ...(data.claimNumber !== undefined && { claimNumber: data.claimNumber }),
        ...(data.policyNumber !== undefined && { policyNumber: data.policyNumber }),
        ...(data.deductible !== undefined && { deductible: this.asDecimalOrNull(data.deductible) }),
        ...(data.dateOfLoss !== undefined && { dateOfLoss: this.asDateOrNull(data.dateOfLoss) }),
        ...(data.permitRequired !== undefined && { permitRequired: data.permitRequired }),
        ...(data.permitNumber !== undefined && { permitNumber: data.permitNumber }),
        ...(data.permitStatus !== undefined && { permitStatus: data.permitStatus }),
        ...(data.permitPulledDate !== undefined && { permitPulledDate: this.asDateOrNull(data.permitPulledDate) }),
        ...(data.permitApprovedDate !== undefined && { permitApprovedDate: this.asDateOrNull(data.permitApprovedDate) }),
        ...(data.warrantyType !== undefined && { warrantyType: data.warrantyType }),
        ...(data.warrantyYears !== undefined && { warrantyYears: data.warrantyYears }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.customFields !== undefined && { customFields: (data.customFields ?? {}) as Prisma.InputJsonValue }),
        ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes }),
      } as Prisma.ProjectUncheckedUpdateInput,
      include: projectDetailInclude,
    });
  }

  async updateStage(id: string, tenantId: string, stageId: string, changedById?: string, notes?: string) {
    await this.ensureProject(id, tenantId);

    const now = new Date();

    return prisma.$transaction(async (tx) => {
      await tx.projectStageHistory.updateMany({
        where: { tenantId, projectId: id, exitedAt: null },
        data: { exitedAt: now },
      });

      await tx.projectStageHistory.create({
        data: {
          tenantId,
          projectId: id,
          stageId,
          changedById: changedById ?? null,
          notes: notes ?? null,
          enteredAt: now,
        },
      });

      const updated = await tx.project.update({
        where: { id },
        data: { stageId },
        include: projectDetailInclude,
      });

      return updated;
    });
  }

  async updateStatus(id: string, tenantId: string, status: string) {
    await this.ensureProject(id, tenantId);

    const normalized = status as any;
    const isCompleted = normalized === 'COMPLETED';

    return prisma.project.update({
      where: { id },
      data: {
        status: normalized,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
      include: projectDetailInclude,
    });
  }

  async assignProjectManager(id: string, tenantId: string, projectManagerId?: string | null) {
    await this.ensureProject(id, tenantId);

    return prisma.project.update({
      where: { id },
      data: { projectManagerId: projectManagerId ?? null },
      include: projectDetailInclude,
    });
  }

  async softDelete(id: string, tenantId: string) {
    await this.ensureProject(id, tenantId);

    return prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'CANCELLED',
      },
    });
  }

  async getFinancials(id: string, tenantId: string) {
    await this.ensureProject(id, tenantId);

    const [project, materialsAgg, laborAgg, expenseAgg, invoiceAgg, paymentAgg] = await Promise.all([
      prisma.project.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: {
          id: true,
          projectNumber: true,
          name: true,
          contractValue: true,
          estimatedCost: true,
          actualCost: true,
          grossProfit: true,
          profitMargin: true,
        },
      }),
      prisma.projectMaterial.aggregate({ where: { tenantId, projectId: id }, _sum: { totalCost: true } }),
      prisma.projectLabor.aggregate({ where: { tenantId, projectId: id }, _sum: { totalCost: true, hoursWorked: true } }),
      prisma.projectExpense.aggregate({ where: { tenantId, projectId: id }, _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({ where: { tenantId, projectId: id }, _sum: { total: true } }),
      prisma.invoicePayment.aggregate({ where: { tenantId, projectId: id }, _sum: { amount: true } }),
    ]);

    return {
      project,
      materialsCost: toNumber(materialsAgg._sum.totalCost),
      laborCost: toNumber(laborAgg._sum.totalCost),
      laborHours: toNumber(laborAgg._sum.hoursWorked),
      expensesCost: toNumber(expenseAgg._sum.totalAmount),
      invoiced: toNumber(invoiceAgg._sum.total),
      paid: toNumber(paymentAgg._sum.amount),
    };
  }

  async recalculateFinancials(id: string, tenantId: string) {
    const financials = await this.getFinancials(id, tenantId);

    const actualCost = financials.materialsCost + financials.laborCost + financials.expensesCost;
    const contractValue = toNumber(financials.project?.contractValue);
    const grossProfit = contractValue - actualCost;
    const profitMargin = contractValue > 0 ? (grossProfit / contractValue) * 100 : 0;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        actualCost: new Prisma.Decimal(actualCost),
        grossProfit: new Prisma.Decimal(grossProfit),
        profitMargin: new Prisma.Decimal(profitMargin),
      },
      include: projectDetailInclude,
    });

    return {
      project: updated,
      actualCost,
      grossProfit,
      profitMargin,
      estimatedCost: toNumber(updated.estimatedCost),
      contractValue,
      invoiced: financials.invoiced,
      paid: financials.paid,
      outstanding: financials.invoiced - financials.paid,
      breakdown: {
        materials: financials.materialsCost,
        labor: financials.laborCost,
        expenses: financials.expensesCost,
      },
    };
  }

  // Tasks
  async getTasks(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectTask.findMany({
      where: { projectId, tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createTask(projectId: string, tenantId: string, data: Record<string, any>, createdById?: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectTask.create({
      data: {
        tenantId,
        projectId,
        title: data.title,
        description: data.description ?? null,
        taskType: data.taskType ?? 'GENERAL',
        priority: data.priority ?? 'NORMAL',
        status: data.status ?? 'PENDING',
        assignedToId: data.assignedToId ?? null,
        dueDate: this.asDateOrNull(data.dueDate),
        startDate: this.asDateOrNull(data.startDate),
        estimatedMinutes: data.estimatedMinutes ?? null,
        actualMinutes: data.actualMinutes ?? null,
        isChecklist: data.isChecklist ?? false,
        checklistItems: data.checklistItems ?? null,
        sortOrder: data.sortOrder ?? 0,
        parentTaskId: data.parentTaskId ?? null,
        createdById: createdById ?? null,
      },
    });
  }

  async updateTask(projectId: string, taskId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureProject(projectId, tenantId);
    await this.ensureProjectTask(projectId, taskId, tenantId);

    return prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.taskType !== undefined && { taskType: data.taskType }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
        ...(data.dueDate !== undefined && { dueDate: this.asDateOrNull(data.dueDate) }),
        ...(data.startDate !== undefined && { startDate: this.asDateOrNull(data.startDate) }),
        ...(data.completedAt !== undefined && { completedAt: this.asDateOrNull(data.completedAt) }),
        ...(data.estimatedMinutes !== undefined && { estimatedMinutes: data.estimatedMinutes }),
        ...(data.actualMinutes !== undefined && { actualMinutes: data.actualMinutes }),
        ...(data.isChecklist !== undefined && { isChecklist: data.isChecklist }),
        ...(data.checklistItems !== undefined && { checklistItems: data.checklistItems }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async completeTask(projectId: string, taskId: string, tenantId: string, completedById?: string) {
    await this.ensureProjectTask(projectId, taskId, tenantId);

    return prisma.projectTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: completedById ?? null,
      },
    });
  }

  async deleteTask(projectId: string, taskId: string, tenantId: string) {
    await this.ensureProjectTask(projectId, taskId, tenantId);
    return prisma.projectTask.delete({ where: { id: taskId } });
  }

  // Materials
  async getMaterials(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectMaterial.findMany({ where: { projectId, tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async addMaterial(projectId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectMaterial.create({
      data: {
        tenantId,
        projectId,
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? 'ROOFING',
        sku: data.sku ?? null,
        quantityNeeded: this.asDecimal(data.quantityNeeded ?? 1),
        quantityOrdered: this.asDecimalOrNull(data.quantityOrdered),
        quantityReceived: this.asDecimalOrNull(data.quantityReceived),
        quantityUsed: this.asDecimalOrNull(data.quantityUsed),
        quantityReturned: this.asDecimalOrNull(data.quantityReturned),
        unit: data.unit ?? 'each',
        unitCost: this.asDecimal(data.unitCost ?? 0),
        totalCost: this.asDecimal(data.totalCost ?? ((data.quantityNeeded ?? 1) * (data.unitCost ?? 0))),
        markup: this.asDecimalOrNull(data.markup),
        sellPrice: this.asDecimalOrNull(data.sellPrice),
        supplierId: data.supplierId ?? null,
        supplierName: data.supplierName ?? null,
        purchaseOrderId: data.purchaseOrderId ?? null,
        orderStatus: data.orderStatus ?? 'NOT_ORDERED',
        orderedAt: this.asDateOrNull(data.orderedAt),
        orderedById: data.orderedById ?? null,
        expectedDeliveryDate: this.asDateOrNull(data.expectedDeliveryDate),
        actualDeliveryDate: this.asDateOrNull(data.actualDeliveryDate),
        deliveryStatus: data.deliveryStatus ?? 'PENDING',
        deliveryNotes: data.deliveryNotes ?? null,
        deductFromInventory: data.deductFromInventory ?? false,
        inventoryItemId: data.inventoryItemId ?? null,
      },
    });
  }

  async updateMaterial(projectId: string, materialId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureProjectMaterial(projectId, materialId, tenantId);
    return prisma.projectMaterial.update({
      where: { id: materialId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.quantityNeeded !== undefined && { quantityNeeded: this.asDecimal(data.quantityNeeded) }),
        ...(data.quantityOrdered !== undefined && { quantityOrdered: this.asDecimalOrNull(data.quantityOrdered) }),
        ...(data.quantityReceived !== undefined && { quantityReceived: this.asDecimalOrNull(data.quantityReceived) }),
        ...(data.quantityUsed !== undefined && { quantityUsed: this.asDecimalOrNull(data.quantityUsed) }),
        ...(data.quantityReturned !== undefined && { quantityReturned: this.asDecimalOrNull(data.quantityReturned) }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.unitCost !== undefined && { unitCost: this.asDecimal(data.unitCost) }),
        ...(data.totalCost !== undefined && { totalCost: this.asDecimal(data.totalCost) }),
        ...(data.markup !== undefined && { markup: this.asDecimalOrNull(data.markup) }),
        ...(data.sellPrice !== undefined && { sellPrice: this.asDecimalOrNull(data.sellPrice) }),
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
        ...(data.supplierName !== undefined && { supplierName: data.supplierName }),
        ...(data.purchaseOrderId !== undefined && { purchaseOrderId: data.purchaseOrderId }),
        ...(data.orderStatus !== undefined && { orderStatus: data.orderStatus }),
        ...(data.orderedAt !== undefined && { orderedAt: this.asDateOrNull(data.orderedAt) }),
        ...(data.orderedById !== undefined && { orderedById: data.orderedById }),
        ...(data.expectedDeliveryDate !== undefined && { expectedDeliveryDate: this.asDateOrNull(data.expectedDeliveryDate) }),
        ...(data.actualDeliveryDate !== undefined && { actualDeliveryDate: this.asDateOrNull(data.actualDeliveryDate) }),
        ...(data.deliveryStatus !== undefined && { deliveryStatus: data.deliveryStatus }),
        ...(data.deliveryNotes !== undefined && { deliveryNotes: data.deliveryNotes }),
        ...(data.deductFromInventory !== undefined && { deductFromInventory: data.deductFromInventory }),
        ...(data.inventoryItemId !== undefined && { inventoryItemId: data.inventoryItemId }),
      },
    });
  }

  async deleteMaterial(projectId: string, materialId: string, tenantId: string) {
    await this.ensureProjectMaterial(projectId, materialId, tenantId);
    return prisma.projectMaterial.delete({ where: { id: materialId } });
  }

  async importMaterialsFromQuote(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { quoteId: true },
    });

    if (!project?.quoteId) return { imported: 0, skipped: 0 };

    const quote = await prisma.quote.findFirst({
      where: { id: project.quoteId, tenantId },
      include: { items: true },
    });

    if (!quote || quote.items.length === 0) return { imported: 0, skipped: 0 };

    const existingNames = await prisma.projectMaterial.findMany({
      where: { tenantId, projectId },
      select: { name: true },
    });
    const existingSet = new Set(existingNames.map((m) => m.name.toLowerCase()));

    const itemsToImport = quote.items.filter((item) => !existingSet.has(item.description.toLowerCase()));

    if (itemsToImport.length > 0) {
      await prisma.projectMaterial.createMany({
        data: itemsToImport.map((item) => ({
          tenantId,
          projectId,
          name: item.description,
          category: 'ROOFING',
          quantityNeeded: item.quantity,
          unit: 'each',
          unitCost: item.unitPrice,
          totalCost: item.total,
          orderStatus: 'NOT_ORDERED',
          deliveryStatus: 'PENDING',
        })),
      });
    }

    return {
      imported: itemsToImport.length,
      skipped: quote.items.length - itemsToImport.length,
    };
  }

  // Labor
  async getLabor(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectLabor.findMany({
      where: { projectId, tenantId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addLabor(projectId: string, tenantId: string, data: Record<string, any>, createdById?: string) {
    await this.ensureProject(projectId, tenantId);

    const hoursWorked = toNumber(data.hoursWorked);
    const hourlyRate = toNumber(data.hourlyRate);
    const overtimeHours = toNumber(data.overtimeHours);
    const overtimeRate = data.overtimeRate !== undefined ? toNumber(data.overtimeRate) : hourlyRate;
    const totalCost = data.totalCost !== undefined
      ? toNumber(data.totalCost)
      : (hoursWorked * hourlyRate) + (overtimeHours * overtimeRate);

    return prisma.projectLabor.create({
      data: {
        tenantId,
        projectId,
        userId: data.userId ?? null,
        workerName: data.workerName,
        workerType: data.workerType ?? 'EMPLOYEE',
        crewAssignmentId: data.crewAssignmentId ?? null,
        date: this.asDate(data.date ?? new Date().toISOString()),
        startTime: this.asDateOrNull(data.startTime),
        endTime: this.asDateOrNull(data.endTime),
        hoursWorked: this.asDecimal(hoursWorked),
        breakMinutes: data.breakMinutes ?? 0,
        overtimeHours: this.asDecimalOrNull(overtimeHours),
        taskId: data.taskId ?? null,
        activityType: data.activityType ?? 'GENERAL',
        description: data.description ?? null,
        hourlyRate: this.asDecimal(hourlyRate),
        overtimeRate: this.asDecimalOrNull(overtimeRate),
        totalCost: this.asDecimal(totalCost),
        isBillable: data.isBillable ?? true,
        billedToClient: data.billedToClient ?? false,
        verified: data.verified ?? false,
        verifiedById: data.verifiedById ?? null,
        verifiedAt: this.asDateOrNull(data.verifiedAt),
        checkInLatitude: this.asDecimalOrNull(data.checkInLatitude),
        checkInLongitude: this.asDecimalOrNull(data.checkInLongitude),
        checkOutLatitude: this.asDecimalOrNull(data.checkOutLatitude),
        checkOutLongitude: this.asDecimalOrNull(data.checkOutLongitude),
        notes: data.notes ?? null,
        createdById: createdById ?? null,
      },
    });
  }

  async updateLabor(projectId: string, laborId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureProjectLabor(projectId, laborId, tenantId);

    return prisma.projectLabor.update({
      where: { id: laborId },
      data: {
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.workerName !== undefined && { workerName: data.workerName }),
        ...(data.workerType !== undefined && { workerType: data.workerType }),
        ...(data.crewAssignmentId !== undefined && { crewAssignmentId: data.crewAssignmentId }),
        ...(data.date !== undefined && { date: this.asDate(data.date) }),
        ...(data.startTime !== undefined && { startTime: this.asDateOrNull(data.startTime) }),
        ...(data.endTime !== undefined && { endTime: this.asDateOrNull(data.endTime) }),
        ...(data.hoursWorked !== undefined && { hoursWorked: this.asDecimal(data.hoursWorked) }),
        ...(data.breakMinutes !== undefined && { breakMinutes: data.breakMinutes }),
        ...(data.overtimeHours !== undefined && { overtimeHours: this.asDecimalOrNull(data.overtimeHours) }),
        ...(data.taskId !== undefined && { taskId: data.taskId }),
        ...(data.activityType !== undefined && { activityType: data.activityType }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.hourlyRate !== undefined && { hourlyRate: this.asDecimal(data.hourlyRate) }),
        ...(data.overtimeRate !== undefined && { overtimeRate: this.asDecimalOrNull(data.overtimeRate) }),
        ...(data.totalCost !== undefined && { totalCost: this.asDecimal(data.totalCost) }),
        ...(data.isBillable !== undefined && { isBillable: data.isBillable }),
        ...(data.billedToClient !== undefined && { billedToClient: data.billedToClient }),
        ...(data.verified !== undefined && { verified: data.verified }),
        ...(data.verifiedById !== undefined && { verifiedById: data.verifiedById }),
        ...(data.verifiedAt !== undefined && { verifiedAt: this.asDateOrNull(data.verifiedAt) }),
        ...(data.checkInLatitude !== undefined && { checkInLatitude: this.asDecimalOrNull(data.checkInLatitude) }),
        ...(data.checkInLongitude !== undefined && { checkInLongitude: this.asDecimalOrNull(data.checkInLongitude) }),
        ...(data.checkOutLatitude !== undefined && { checkOutLatitude: this.asDecimalOrNull(data.checkOutLatitude) }),
        ...(data.checkOutLongitude !== undefined && { checkOutLongitude: this.asDecimalOrNull(data.checkOutLongitude) }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async deleteLabor(projectId: string, laborId: string, tenantId: string) {
    await this.ensureProjectLabor(projectId, laborId, tenantId);
    return prisma.projectLabor.delete({ where: { id: laborId } });
  }

  async getLaborSummary(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);

    const rows = await prisma.projectLabor.findMany({
      where: { projectId, tenantId },
      select: {
        date: true,
        workerName: true,
        hoursWorked: true,
        totalCost: true,
      },
      orderBy: [{ date: 'desc' }, { workerName: 'asc' }],
    });

    const byWorker: Record<string, { hours: number; cost: number; days: number }> = {};
    const byDate: Record<string, { hours: number; cost: number; entries: number }> = {};

    for (const row of rows) {
      const worker = row.workerName || 'Unknown';
      const dateKey = row.date.toISOString().slice(0, 10);
      const hours = toNumber(row.hoursWorked);
      const cost = toNumber(row.totalCost);

      if (!byWorker[worker]) byWorker[worker] = { hours: 0, cost: 0, days: 0 };
      byWorker[worker].hours += hours;
      byWorker[worker].cost += cost;
      byWorker[worker].days += 1;

      if (!byDate[dateKey]) byDate[dateKey] = { hours: 0, cost: 0, entries: 0 };
      byDate[dateKey].hours += hours;
      byDate[dateKey].cost += cost;
      byDate[dateKey].entries += 1;
    }

    return {
      totalHours: rows.reduce((sum, row) => sum + toNumber(row.hoursWorked), 0),
      totalCost: rows.reduce((sum, row) => sum + toNumber(row.totalCost), 0),
      byWorker,
      byDate,
      entries: rows.length,
    };
  }

  // Expenses
  async getExpenses(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectExpense.findMany({ where: { projectId, tenantId }, orderBy: { expenseDate: 'desc' } });
  }

  async addExpense(projectId: string, tenantId: string, data: Record<string, any>, createdById?: string) {
    await this.ensureProject(projectId, tenantId);
    const amount = toNumber(data.amount);
    const taxAmount = toNumber(data.taxAmount);
    const totalAmount = data.totalAmount !== undefined ? toNumber(data.totalAmount) : amount + taxAmount;

    return prisma.projectExpense.create({
      data: {
        tenantId,
        projectId,
        category: data.category ?? 'OTHER',
        description: data.description,
        vendor: data.vendor ?? null,
        amount: this.asDecimal(amount),
        taxAmount: this.asDecimalOrNull(taxAmount),
        totalAmount: this.asDecimal(totalAmount),
        paymentMethod: data.paymentMethod ?? null,
        paymentStatus: data.paymentStatus ?? 'UNPAID',
        paidAt: this.asDateOrNull(data.paidAt),
        referenceNumber: data.referenceNumber ?? null,
        receiptDocumentId: data.receiptDocumentId ?? null,
        isReimbursable: data.isReimbursable ?? false,
        reimbursedToId: data.reimbursedToId ?? null,
        reimbursedAt: this.asDateOrNull(data.reimbursedAt),
        billableToClient: data.billableToClient ?? false,
        billedToClient: data.billedToClient ?? false,
        expenseDate: this.asDate(data.expenseDate ?? new Date().toISOString()),
        notes: data.notes ?? null,
        createdById: createdById ?? null,
      },
    });
  }

  async updateExpense(projectId: string, expenseId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureProjectExpense(projectId, expenseId, tenantId);
    return prisma.projectExpense.update({
      where: { id: expenseId },
      data: {
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.vendor !== undefined && { vendor: data.vendor }),
        ...(data.amount !== undefined && { amount: this.asDecimal(data.amount) }),
        ...(data.taxAmount !== undefined && { taxAmount: this.asDecimalOrNull(data.taxAmount) }),
        ...(data.totalAmount !== undefined && { totalAmount: this.asDecimal(data.totalAmount) }),
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
        ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus }),
        ...(data.paidAt !== undefined && { paidAt: this.asDateOrNull(data.paidAt) }),
        ...(data.referenceNumber !== undefined && { referenceNumber: data.referenceNumber }),
        ...(data.receiptDocumentId !== undefined && { receiptDocumentId: data.receiptDocumentId }),
        ...(data.isReimbursable !== undefined && { isReimbursable: data.isReimbursable }),
        ...(data.reimbursedToId !== undefined && { reimbursedToId: data.reimbursedToId }),
        ...(data.reimbursedAt !== undefined && { reimbursedAt: this.asDateOrNull(data.reimbursedAt) }),
        ...(data.billableToClient !== undefined && { billableToClient: data.billableToClient }),
        ...(data.billedToClient !== undefined && { billedToClient: data.billedToClient }),
        ...(data.expenseDate !== undefined && { expenseDate: this.asDate(data.expenseDate) }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async deleteExpense(projectId: string, expenseId: string, tenantId: string) {
    await this.ensureProjectExpense(projectId, expenseId, tenantId);
    return prisma.projectExpense.delete({ where: { id: expenseId } });
  }

  // Crews
  async getCrewAssignments(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectCrewAssignment.findMany({
      where: { tenantId, projectId },
      include: { crew: true },
      orderBy: { scheduledStartDate: 'asc' },
    });
  }

  async assignCrew(projectId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectCrewAssignment.create({
      data: {
        tenantId,
        projectId,
        crewId: data.crewId,
        crewLeadId: data.crewLeadId ?? null,
        scheduledStartDate: this.asDate(data.scheduledStartDate),
        scheduledEndDate: this.asDate(data.scheduledEndDate),
        actualStartDate: this.asDateOrNull(data.actualStartDate),
        actualEndDate: this.asDateOrNull(data.actualEndDate),
        status: data.status ?? 'SCHEDULED',
        workerCount: data.workerCount ?? 0,
        assignedWorkers: data.assignedWorkers ?? null,
        notes: data.notes ?? null,
      },
      include: { crew: true },
    });
  }

  async updateCrewAssignment(projectId: string, assignmentId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureCrewAssignment(projectId, assignmentId, tenantId);
    return prisma.projectCrewAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(data.crewId !== undefined && { crewId: data.crewId }),
        ...(data.crewLeadId !== undefined && { crewLeadId: data.crewLeadId }),
        ...(data.scheduledStartDate !== undefined && { scheduledStartDate: this.asDate(data.scheduledStartDate) }),
        ...(data.scheduledEndDate !== undefined && { scheduledEndDate: this.asDate(data.scheduledEndDate) }),
        ...(data.actualStartDate !== undefined && { actualStartDate: this.asDateOrNull(data.actualStartDate) }),
        ...(data.actualEndDate !== undefined && { actualEndDate: this.asDateOrNull(data.actualEndDate) }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.workerCount !== undefined && { workerCount: data.workerCount }),
        ...(data.assignedWorkers !== undefined && { assignedWorkers: data.assignedWorkers }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { crew: true },
    });
  }

  async deleteCrewAssignment(projectId: string, assignmentId: string, tenantId: string) {
    await this.ensureCrewAssignment(projectId, assignmentId, tenantId);
    return prisma.projectCrewAssignment.delete({ where: { id: assignmentId } });
  }

  // Documents
  async getDocuments(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectDocument.findMany({ where: { tenantId, projectId }, orderBy: { addedAt: 'desc' } });
  }

  async attachDocument(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectDocument.create({
      data: {
        tenantId,
        projectId,
        documentId: data.documentId,
        category: data.category ?? 'OTHER',
        description: data.description ?? null,
        visibleToClient: data.visibleToClient ?? false,
        requiresSignature: data.requiresSignature ?? false,
        signedAt: this.asDateOrNull(data.signedAt),
        signedById: data.signedById ?? null,
        signatureDocumentId: data.signatureDocumentId ?? null,
        addedById: userId ?? null,
      },
    });
  }

  async removeDocument(projectId: string, docId: string, tenantId: string) {
    await this.ensureProjectDocument(projectId, docId, tenantId);
    return prisma.projectDocument.delete({ where: { id: docId } });
  }

  // Photos
  async getPhotos(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectPhoto.findMany({
      where: { tenantId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async uploadPhoto(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectPhoto.create({
      data: {
        tenantId,
        projectId,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl ?? null,
        filename: data.filename,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        category: data.category ?? 'PROGRESS',
        description: data.description ?? null,
        latitude: this.asDecimalOrNull(data.latitude),
        longitude: this.asDecimalOrNull(data.longitude),
        takenAt: this.asDateOrNull(data.takenAt),
        takenById: data.takenById ?? null,
        taskId: data.taskId ?? null,
        visibleToClient: data.visibleToClient ?? false,
        visibleToInsurance: data.visibleToInsurance ?? false,
        aiAnalyzed: data.aiAnalyzed ?? false,
        aiAnalysis: data.aiAnalysis ?? null,
        sortOrder: data.sortOrder ?? 0,
        uploadedById: userId ?? null,
      },
    });
  }

  async updatePhoto(projectId: string, photoId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureProjectPhoto(projectId, photoId, tenantId);
    return prisma.projectPhoto.update({
      where: { id: photoId },
      data: {
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.latitude !== undefined && { latitude: this.asDecimalOrNull(data.latitude) }),
        ...(data.longitude !== undefined && { longitude: this.asDecimalOrNull(data.longitude) }),
        ...(data.takenAt !== undefined && { takenAt: this.asDateOrNull(data.takenAt) }),
        ...(data.takenById !== undefined && { takenById: data.takenById }),
        ...(data.taskId !== undefined && { taskId: data.taskId }),
        ...(data.visibleToClient !== undefined && { visibleToClient: data.visibleToClient }),
        ...(data.visibleToInsurance !== undefined && { visibleToInsurance: data.visibleToInsurance }),
        ...(data.aiAnalyzed !== undefined && { aiAnalyzed: data.aiAnalyzed }),
        ...(data.aiAnalysis !== undefined && { aiAnalysis: data.aiAnalysis }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async deletePhoto(projectId: string, photoId: string, tenantId: string) {
    await this.ensureProjectPhoto(projectId, photoId, tenantId);
    return prisma.projectPhoto.delete({ where: { id: photoId } });
  }

  // Notes
  async getNotes(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectNote.findMany({ where: { tenantId, projectId }, orderBy: { createdAt: 'desc' } });
  }

  async addNote(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectNote.create({
      data: {
        tenantId,
        projectId,
        content: data.content,
        noteType: data.noteType ?? 'GENERAL',
        mentionedUserIds: data.mentionedUserIds ?? [],
        isInternal: data.isInternal ?? true,
        visibleToClient: data.visibleToClient ?? false,
        isPinned: data.isPinned ?? false,
        createdById: userId ?? null,
      },
    });
  }

  async updateNote(projectId: string, noteId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureProjectNote(projectId, noteId, tenantId);
    return prisma.projectNote.update({
      where: { id: noteId },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.noteType !== undefined && { noteType: data.noteType }),
        ...(data.mentionedUserIds !== undefined && { mentionedUserIds: data.mentionedUserIds }),
        ...(data.isInternal !== undefined && { isInternal: data.isInternal }),
        ...(data.visibleToClient !== undefined && { visibleToClient: data.visibleToClient }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
      },
    });
  }

  async deleteNote(projectId: string, noteId: string, tenantId: string) {
    await this.ensureProjectNote(projectId, noteId, tenantId);
    return prisma.projectNote.delete({ where: { id: noteId } });
  }

  // Communications
  async getCommunications(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectCommunication.findMany({
      where: { tenantId, projectId },
      orderBy: { communicatedAt: 'desc' },
    });
  }

  async logCommunication(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectCommunication.create({
      data: {
        tenantId,
        projectId,
        type: data.type,
        direction: data.direction,
        subject: data.subject ?? null,
        content: data.content,
        fromUserId: data.fromUserId ?? userId ?? null,
        fromName: data.fromName ?? null,
        fromEmail: data.fromEmail ?? null,
        fromPhone: data.fromPhone ?? null,
        toClientId: data.toClientId ?? null,
        toName: data.toName ?? null,
        toEmail: data.toEmail ?? null,
        toPhone: data.toPhone ?? null,
        status: data.status ?? 'COMPLETED',
        callDuration: data.callDuration ?? null,
        callRecordingUrl: data.callRecordingUrl ?? null,
        emailMessageId: data.emailMessageId ?? null,
        emailThreadId: data.emailThreadId ?? null,
        attachmentIds: data.attachmentIds ?? [],
        communicatedAt: this.asDateOrNull(data.communicatedAt) ?? new Date(),
        createdById: userId ?? null,
      },
    });
  }

  // Inspections
  async getInspections(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectInspection.findMany({
      where: { tenantId, projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async scheduleInspection(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectInspection.create({
      data: {
        tenantId,
        projectId,
        type: data.type,
        scheduledDate: this.asDateOrNull(data.scheduledDate),
        scheduledTime: data.scheduledTime ?? null,
        actualDate: this.asDateOrNull(data.actualDate),
        inspectorName: data.inspectorName ?? null,
        inspectorPhone: data.inspectorPhone ?? null,
        inspectorEmail: data.inspectorEmail ?? null,
        inspectionCompany: data.inspectionCompany ?? null,
        status: data.status ?? 'SCHEDULED',
        result: data.result ?? null,
        notes: data.notes ?? null,
        failureReasons: data.failureReasons ?? [],
        requiredFixes: data.requiredFixes ?? null,
        reinspectionRequired: data.reinspectionRequired ?? false,
        reinspectionDate: this.asDateOrNull(data.reinspectionDate),
        reportDocumentId: data.reportDocumentId ?? null,
        createdById: userId ?? null,
      },
    });
  }

  async updateInspection(projectId: string, inspId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureInspection(projectId, inspId, tenantId);
    return prisma.projectInspection.update({
      where: { id: inspId },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.scheduledDate !== undefined && { scheduledDate: this.asDateOrNull(data.scheduledDate) }),
        ...(data.scheduledTime !== undefined && { scheduledTime: data.scheduledTime }),
        ...(data.actualDate !== undefined && { actualDate: this.asDateOrNull(data.actualDate) }),
        ...(data.inspectorName !== undefined && { inspectorName: data.inspectorName }),
        ...(data.inspectorPhone !== undefined && { inspectorPhone: data.inspectorPhone }),
        ...(data.inspectorEmail !== undefined && { inspectorEmail: data.inspectorEmail }),
        ...(data.inspectionCompany !== undefined && { inspectionCompany: data.inspectionCompany }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.result !== undefined && { result: data.result }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.failureReasons !== undefined && { failureReasons: data.failureReasons }),
        ...(data.requiredFixes !== undefined && { requiredFixes: data.requiredFixes }),
        ...(data.reinspectionRequired !== undefined && { reinspectionRequired: data.reinspectionRequired }),
        ...(data.reinspectionDate !== undefined && { reinspectionDate: this.asDateOrNull(data.reinspectionDate) }),
        ...(data.reportDocumentId !== undefined && { reportDocumentId: data.reportDocumentId }),
      },
    });
  }

  async recordInspectionResult(projectId: string, inspId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureInspection(projectId, inspId, tenantId);
    return prisma.projectInspection.update({
      where: { id: inspId },
      data: {
        result: data.result,
        status: data.status ?? 'COMPLETED',
        notes: data.notes ?? undefined,
        failureReasons: data.failureReasons ?? undefined,
        requiredFixes: data.requiredFixes ?? undefined,
        actualDate: this.asDateOrNull(data.actualDate) ?? new Date(),
      },
    });
  }

  // Change orders
  async getChangeOrders(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.changeOrder.findMany({ where: { tenantId, projectId }, orderBy: { createdAt: 'desc' } });
  }

  async createChangeOrder(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    await this.ensureProject(projectId, tenantId);

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { contractValue: true },
    });

    const previousContractValue = data.previousContractValue !== undefined
      ? toNumber(data.previousContractValue)
      : toNumber(project?.contractValue);
    const changeAmount = toNumber(data.changeAmount);
    const newContractValue = data.newContractValue !== undefined
      ? toNumber(data.newContractValue)
      : previousContractValue + changeAmount;

    const coCount = await prisma.changeOrder.count({ where: { tenantId, projectId } });
    const changeOrderNumber = data.changeOrderNumber || `CO-${String(coCount + 1).padStart(3, '0')}`;

    const changeOrder = await prisma.changeOrder.create({
      data: {
        tenantId,
        projectId,
        changeOrderNumber,
        title: data.title,
        description: data.description,
        reason: data.reason,
        previousContractValue: this.asDecimal(previousContractValue),
        changeAmount: this.asDecimal(changeAmount),
        newContractValue: this.asDecimal(newContractValue),
        status: data.status ?? 'DRAFT',
        clientApproved: data.clientApproved ?? null,
        clientApprovedAt: this.asDateOrNull(data.clientApprovedAt),
        clientSignatureId: data.clientSignatureId ?? null,
        isInsuranceSupplement: data.isInsuranceSupplement ?? false,
        supplementNumber: data.supplementNumber ?? null,
        insuranceApproved: data.insuranceApproved ?? null,
        insuranceApprovedAmount: this.asDecimalOrNull(data.insuranceApprovedAmount),
        additionalDays: data.additionalDays ?? null,
        documentId: data.documentId ?? null,
        createdById: userId ?? null,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { contractValue: this.asDecimal(newContractValue) },
    });

    return changeOrder;
  }

  async updateChangeOrder(projectId: string, coId: string, tenantId: string, data: Record<string, any>) {
    await this.ensureChangeOrder(projectId, coId, tenantId);
    return prisma.changeOrder.update({
      where: { id: coId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.reason !== undefined && { reason: data.reason }),
        ...(data.previousContractValue !== undefined && { previousContractValue: this.asDecimal(data.previousContractValue) }),
        ...(data.changeAmount !== undefined && { changeAmount: this.asDecimal(data.changeAmount) }),
        ...(data.newContractValue !== undefined && { newContractValue: this.asDecimal(data.newContractValue) }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.clientApproved !== undefined && { clientApproved: data.clientApproved }),
        ...(data.clientApprovedAt !== undefined && { clientApprovedAt: this.asDateOrNull(data.clientApprovedAt) }),
        ...(data.clientSignatureId !== undefined && { clientSignatureId: data.clientSignatureId }),
        ...(data.isInsuranceSupplement !== undefined && { isInsuranceSupplement: data.isInsuranceSupplement }),
        ...(data.supplementNumber !== undefined && { supplementNumber: data.supplementNumber }),
        ...(data.insuranceApproved !== undefined && { insuranceApproved: data.insuranceApproved }),
        ...(data.insuranceApprovedAmount !== undefined && { insuranceApprovedAmount: this.asDecimalOrNull(data.insuranceApprovedAmount) }),
        ...(data.additionalDays !== undefined && { additionalDays: data.additionalDays }),
        ...(data.documentId !== undefined && { documentId: data.documentId }),
      },
    });
  }

  async approveChangeOrder(projectId: string, coId: string, tenantId: string) {
    const changeOrder = await this.ensureChangeOrder(projectId, coId, tenantId);

    await prisma.project.update({
      where: { id: projectId },
      data: { contractValue: changeOrder.newContractValue },
    });

    return prisma.changeOrder.update({
      where: { id: coId },
      data: {
        status: 'APPROVED',
        clientApproved: true,
        clientApprovedAt: new Date(),
      },
    });
  }

  // Weather delays
  async getWeatherDelays(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.weatherDelay.findMany({ where: { tenantId, projectId }, orderBy: { date: 'desc' } });
  }

  async addWeatherDelay(projectId: string, tenantId: string, data: Record<string, any>, userId?: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.weatherDelay.create({
      data: {
        tenantId,
        projectId,
        date: this.asDate(data.date ?? new Date().toISOString()),
        weatherType: data.weatherType,
        description: data.description ?? null,
        workdayLost: data.workdayLost ?? true,
        hoursLost: this.asDecimalOrNull(data.hoursLost),
        photoIds: data.photoIds ?? [],
        createdById: userId ?? null,
      },
    });
  }

  async getTimeline(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);

    const [
      stageHistory,
      tasks,
      notes,
      communications,
      inspections,
      changeOrders,
      weatherDelays,
    ] = await Promise.all([
      prisma.projectStageHistory.findMany({ where: { tenantId, projectId }, include: { stage: true }, orderBy: { enteredAt: 'desc' }, take: 200 }),
      prisma.projectTask.findMany({ where: { tenantId, projectId }, orderBy: { updatedAt: 'desc' }, take: 200 }),
      prisma.projectNote.findMany({ where: { tenantId, projectId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.projectCommunication.findMany({ where: { tenantId, projectId }, orderBy: { communicatedAt: 'desc' }, take: 200 }),
      prisma.projectInspection.findMany({ where: { tenantId, projectId }, orderBy: { updatedAt: 'desc' }, take: 100 }),
      prisma.changeOrder.findMany({ where: { tenantId, projectId }, orderBy: { updatedAt: 'desc' }, take: 100 }),
      prisma.weatherDelay.findMany({ where: { tenantId, projectId }, orderBy: { date: 'desc' }, take: 100 }),
    ]);

    const events = [
      ...stageHistory.map((item) => ({
        id: `stage-${item.id}`,
        type: 'STAGE_CHANGE',
        title: `Moved to stage: ${item.stage.name}`,
        timestamp: item.enteredAt,
        data: item,
      })),
      ...tasks.map((item) => ({
        id: `task-${item.id}`,
        type: 'TASK_UPDATE',
        title: `${item.status === 'COMPLETED' ? 'Completed' : 'Updated'} task: ${item.title}`,
        timestamp: item.updatedAt,
        data: item,
      })),
      ...notes.map((item) => ({
        id: `note-${item.id}`,
        type: 'NOTE',
        title: `Note added`,
        timestamp: item.createdAt,
        data: item,
      })),
      ...communications.map((item) => ({
        id: `comm-${item.id}`,
        type: 'COMMUNICATION',
        title: `${item.type} (${item.direction})`,
        timestamp: item.communicatedAt,
        data: item,
      })),
      ...inspections.map((item) => ({
        id: `inspection-${item.id}`,
        type: 'INSPECTION',
        title: `Inspection ${item.type} - ${item.status}`,
        timestamp: item.updatedAt,
        data: item,
      })),
      ...changeOrders.map((item) => ({
        id: `co-${item.id}`,
        type: 'CHANGE_ORDER',
        title: `Change Order ${item.changeOrderNumber} - ${item.status}`,
        timestamp: item.updatedAt,
        data: item,
      })),
      ...weatherDelays.map((item) => ({
        id: `weather-${item.id}`,
        type: 'WEATHER_DELAY',
        title: `Weather delay: ${item.weatherType}`,
        timestamp: item.date,
        data: item,
      })),
    ];

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return events;
  }

  async getStageHistory(projectId: string, tenantId: string) {
    await this.ensureProject(projectId, tenantId);
    return prisma.projectStageHistory.findMany({
      where: { tenantId, projectId },
      include: { stage: true },
      orderBy: { enteredAt: 'desc' },
    });
  }

  private async ensureProjectTask(projectId: string, taskId: string, tenantId: string) {
    const item = await prisma.projectTask.findFirst({ where: { id: taskId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_TASK_NOT_FOUND');
    return item;
  }

  private async ensureProjectMaterial(projectId: string, materialId: string, tenantId: string) {
    const item = await prisma.projectMaterial.findFirst({ where: { id: materialId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_MATERIAL_NOT_FOUND');
  }

  private async ensureProjectLabor(projectId: string, laborId: string, tenantId: string) {
    const item = await prisma.projectLabor.findFirst({ where: { id: laborId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_LABOR_NOT_FOUND');
  }

  private async ensureProjectExpense(projectId: string, expenseId: string, tenantId: string) {
    const item = await prisma.projectExpense.findFirst({ where: { id: expenseId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_EXPENSE_NOT_FOUND');
  }

  private async ensureCrewAssignment(projectId: string, assignmentId: string, tenantId: string) {
    const item = await prisma.projectCrewAssignment.findFirst({ where: { id: assignmentId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_CREW_ASSIGNMENT_NOT_FOUND');
  }

  private async ensureProjectDocument(projectId: string, docId: string, tenantId: string) {
    const item = await prisma.projectDocument.findFirst({ where: { id: docId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_DOCUMENT_NOT_FOUND');
  }

  private async ensureProjectPhoto(projectId: string, photoId: string, tenantId: string) {
    const item = await prisma.projectPhoto.findFirst({ where: { id: photoId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_PHOTO_NOT_FOUND');
  }

  private async ensureProjectNote(projectId: string, noteId: string, tenantId: string) {
    const item = await prisma.projectNote.findFirst({ where: { id: noteId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_NOTE_NOT_FOUND');
  }

  private async ensureInspection(projectId: string, inspId: string, tenantId: string) {
    const item = await prisma.projectInspection.findFirst({ where: { id: inspId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_INSPECTION_NOT_FOUND');
  }

  private async ensureChangeOrder(projectId: string, coId: string, tenantId: string) {
    const item = await prisma.changeOrder.findFirst({ where: { id: coId, projectId, tenantId } });
    if (!item) throw new Error('PROJECT_CHANGE_ORDER_NOT_FOUND');
    return item;
  }

  private asDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private asDateOrNull(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    return this.asDate(value);
  }

  private asDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
    if (value instanceof Prisma.Decimal) return value;
    return new Prisma.Decimal(value);
  }

  private asDecimalOrNull(value: number | string | Prisma.Decimal | null | undefined): Prisma.Decimal | null {
    if (value === null || value === undefined) return null;
    return this.asDecimal(value);
  }
}

export const projectsRepository = new ProjectsRepository();
