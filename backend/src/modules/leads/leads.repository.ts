import { prisma } from '../../config/database';
import { LeadStatus, LeadTemperature, Prisma } from '@prisma/client';
import { CreateLeadDto, UpdateLeadDto, LeadQueryDto } from './leads.dto';

export class LeadsRepository {
  // Default includes for lead queries
  private readonly defaultInclude = {
    leadSource: true,
    assignedTo: {
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    },
    createdBy: {
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    },
    tags: {
      include: {
        tag: true,
      },
    },
  };

  /**
   * Create a new lead
   */
  async create(
    tenantId: string,
    data: CreateLeadDto,
    createdById?: string
  ) {
    const { tagIds, ...leadData } = data;

    return prisma.lead.create({
      data: {
        ...leadData,
        tenantId,
        createdById,
        potentialValue: data.potentialValue ? new Prisma.Decimal(data.potentialValue) : null,
        tags: tagIds?.length
          ? {
            create: tagIds.map((tagId) => ({
              tag: { connect: { id: tagId } },
            })),
          }
          : undefined,
      },
      include: this.defaultInclude,
    });
  }

  /**
   * Find lead by ID
   */
  async findById(id: string, tenantId: string) {
    return prisma.lead.findFirst({
      where: { id, tenantId },
      include: this.defaultInclude,
    });
  }

  /**
   * Find leads with filters and pagination
   */
  async findMany(tenantId: string, query: LeadQueryDto) {
    const {
      page: rawPage = 1,
      limit: rawLimit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      status,
      temperature,
      leadSourceId,
      assignedToId,
      startDate,
      endDate,
      minValue,
      maxValue,
    } = query;

    const page = Number(rawPage) || 1;
    const limit = Number(rawLimit) || 20;

    const where: Prisma.LeadWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(temperature && { temperature }),
      ...(leadSourceId && { leadSourceId }),
      ...(assignedToId && { assignedToId }),
      ...(startDate || endDate
        ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
        : {}),
      ...(minValue !== undefined || maxValue !== undefined
        ? {
          potentialValue: {
            ...(minValue !== undefined && { gte: minValue }),
            ...(maxValue !== undefined && { lte: maxValue }),
          },
        }
        : {}),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { propertyAddress: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { zipCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Build orderBy
    let orderBy: Prisma.LeadOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy = { firstName: sortOrder };
    } else if (sortBy === 'value') {
      orderBy = { potentialValue: sortOrder };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    const [data, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: this.defaultInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update lead
   */
  async update(id: string, tenantId: string, data: UpdateLeadDto) {
    // Verify tenant ownership
    const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Lead not found or access denied');

    const { tagIds, ...leadData } = data;

    // If tagIds provided, update tags
    if (tagIds !== undefined) {
      // Delete existing tags
      await prisma.leadTag.deleteMany({
        where: { leadId: id },
      });

      // Create new tags
      if (tagIds.length > 0) {
        await prisma.leadTag.createMany({
          data: tagIds.map((tagId) => ({
            leadId: id,
            tagId,
          })),
        });
      }
    }

    return prisma.lead.update({
      where: { id },
      data: {
        ...leadData,
        potentialValue: data.potentialValue !== undefined
          ? data.potentialValue
            ? new Prisma.Decimal(data.potentialValue)
            : null
          : undefined,
      },
      include: this.defaultInclude,
    });
  }

  /**
   * Delete lead
   */
  async delete(id: string, tenantId: string) {
    return prisma.lead.deleteMany({
      where: { id, tenantId },
    });
  }

  /**
   * Update lead status
   */
  async updateStatus(id: string, tenantId: string, status: LeadStatus) {
    // Verify tenant ownership
    const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Lead not found or access denied');

    return prisma.lead.update({
      where: { id },
      data: { status },
      include: this.defaultInclude,
    });
  }

  /**
   * Assign lead to employee
   */
  async assign(id: string, tenantId: string, assignedToId: string | null) {
    // Verify tenant ownership
    const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Lead not found or access denied');

    return prisma.lead.update({
      where: { id },
      data: { assignedToId },
      include: this.defaultInclude,
    });
  }

  /**
   * Bulk assign leads
   */
  async bulkAssign(ids: string[], tenantId: string, assignedToId: string) {
    return prisma.lead.updateMany({
      where: {
        id: { in: ids },
        tenantId,
      },
      data: { assignedToId },
    });
  }

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(ids: string[], tenantId: string, status: LeadStatus) {
    return prisma.lead.updateMany({
      where: {
        id: { in: ids },
        tenantId,
      },
      data: { status },
    });
  }

  /**
   * Mark lead as converted
   */
  async markConverted(id: string, tenantId: string, clientId: string) {
    // Verify tenant ownership
    const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Lead not found or access denied');

    return prisma.lead.update({
      where: { id },
      data: {
        status: 'WON',
        convertedAt: new Date(),
        convertedToClientId: clientId,
      },
      include: this.defaultInclude,
    });
  }

  /**
   * Get pipeline data (leads grouped by status)
   */
  async getPipeline(tenantId: string, filters?: {
    assignedToId?: string;
    leadSourceId?: string;
    temperature?: LeadTemperature;
  }) {
    const where: Prisma.LeadWhereInput = {
      tenantId,
      ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
      ...(filters?.leadSourceId && { leadSourceId: filters.leadSourceId }),
      ...(filters?.temperature && { temperature: filters.temperature }),
    };

    const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

    const pipeline = await Promise.all(
      statuses.map(async (status) => {
        const [leads, aggregation] = await Promise.all([
          prisma.lead.findMany({
            where: { ...where, status },
            include: this.defaultInclude,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.lead.aggregate({
            where: { ...where, status },
            _count: { id: true },
            _sum: { potentialValue: true },
          }),
        ]);

        return {
          status,
          count: aggregation._count.id,
          totalValue: Number(aggregation._sum.potentialValue || 0),
          leads,
        };
      })
    );

    return pipeline;
  }

  /**
   * Get lead statistics
   */
  async getStatistics(tenantId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate || endDate
      ? {
        createdAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      }
      : {};

    const baseWhere = { tenantId, ...dateFilter };

    const [
      total,
      byStatus,
      byTemperature,
      bySource,
      valueStats,
      convertedCount,
      thisMonthNew,
      thisMonthConverted,
    ] = await Promise.all([
      // Total count
      prisma.lead.count({ where: baseWhere }),

      // By status
      prisma.lead.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),

      // By temperature
      prisma.lead.groupBy({
        by: ['temperature'],
        where: baseWhere,
        _count: { temperature: true },
      }),

      // By source
      prisma.lead.groupBy({
        by: ['leadSourceId'],
        where: { ...baseWhere, leadSourceId: { not: null } },
        _count: { leadSourceId: true },
      }),

      // Value statistics
      prisma.lead.aggregate({
        where: baseWhere,
        _sum: { potentialValue: true },
        _avg: { potentialValue: true },
      }),

      // Converted count
      prisma.lead.count({
        where: { ...baseWhere, status: 'WON' },
      }),

      // New this month
      prisma.lead.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Converted this month
      prisma.lead.count({
        where: {
          tenantId,
          status: 'WON',
          convertedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Get source names
    const sourceIds = bySource.map((s) => s.leadSourceId).filter(Boolean) as string[];
    const sources = await prisma.leadSource.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, name: true },
    });

    const sourceMap = new Map(sources.map((s) => [s.id, s.name]));

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, curr) => ({ ...acc, [curr.status]: curr._count.status }),
        {} as Record<LeadStatus, number>
      ),
      byTemperature: byTemperature.reduce(
        (acc, curr) => ({ ...acc, [curr.temperature]: curr._count.temperature }),
        {} as Record<LeadTemperature, number>
      ),
      bySource: bySource.map((s) => ({
        sourceId: s.leadSourceId!,
        sourceName: sourceMap.get(s.leadSourceId!) || 'Unknown',
        count: s._count.leadSourceId,
      })),
      totalValue: Number(valueStats._sum.potentialValue || 0),
      averageValue: Number(valueStats._avg.potentialValue || 0),
      conversionRate: total > 0 ? (convertedCount / total) * 100 : 0,
      newThisMonth: thisMonthNew,
      convertedThisMonth: thisMonthConverted,
    };
  }

  /**
   * Check if employee exists in tenant
   */
  async employeeExists(employeeId: string, tenantId: string): Promise<boolean> {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, isActive: true },
    });
    return !!employee;
  }

  /**
   * Check if lead source exists in tenant
   */
  async leadSourceExists(leadSourceId: string, tenantId: string): Promise<boolean> {
    const source = await prisma.leadSource.findFirst({
      where: { id: leadSourceId, tenantId },
    });
    return !!source;
  }

  /**
   * Check if tags exist in tenant
   */
  async tagsExist(tagIds: string[], tenantId: string): Promise<boolean> {
    const count = await prisma.tag.count({
      where: { id: { in: tagIds }, tenantId },
    });
    return count === tagIds.length;
  }
}

export const leadsRepository = new LeadsRepository();