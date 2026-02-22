import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { CreateLeadSourceDto, UpdateLeadSourceDto, LeadSourceQueryDto } from './lead-sources.dto';

export class LeadSourcesRepository {
  /**
   * Create lead source
   */
  async create(tenantId: string, data: CreateLeadSourceDto) {
    return prisma.leadSource.create({
      data: {
        ...data,
        tenantId,
      },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  /**
   * Find lead source by ID
   */
  async findById(id: string, tenantId: string) {
    return prisma.leadSource.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  /**
   * Find lead source by name (for uniqueness check)
   */
  async findByName(name: string, tenantId: string, excludeId?: string) {
    return prisma.leadSource.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        tenantId,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  /**
   * Find lead sources with filters
   */
  async findMany(tenantId: string, query: LeadSourceQueryDto) {
    const { page: rawPage = 1, limit: rawLimit = 20, search, isActive } = query;

    const page = Number(rawPage) || 1;
    const limit = Number(rawLimit) || 20;

    const where: Prisma.LeadSourceWhereInput = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.leadSource.findMany({
        where,
        include: {
          _count: {
            select: { leads: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leadSource.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update lead source
   */
  async update(id: string, tenantId: string, data: UpdateLeadSourceDto) {
    // Verify tenant ownership
    const existing = await prisma.leadSource.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Lead source not found or access denied');

    return prisma.leadSource.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
  }

  /**
   * Delete lead source
   */
  async delete(id: string, tenantId: string) {
    return prisma.leadSource.deleteMany({
      where: { id, tenantId },
    });
  }

  /**
   * Get lead source statistics
   */
  async getStatistics(tenantId: string) {
    const sources = await prisma.leadSource.findMany({
      where: { tenantId, isActive: true },
      include: {
        leads: {
          select: {
            id: true,
            status: true,
            potentialValue: true,
          },
        },
      },
    });

    return sources.map((source) => {
      const leadCount = source.leads.length;
      const convertedCount = source.leads.filter((l) => l.status === 'WON').length;
      const totalValue = source.leads.reduce(
        (sum, l) => sum + Number(l.potentialValue || 0),
        0
      );

      return {
        id: source.id,
        name: source.name,
        description: source.description,
        isActive: source.isActive,
        leadCount,
        convertedCount,
        conversionRate: leadCount > 0 ? (convertedCount / leadCount) * 100 : 0,
        totalValue,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      };
    });
  }

  /**
   * Check if lead source has leads
   */
  async hasLeads(id: string, tenantId: string): Promise<boolean> {
    const count = await prisma.lead.count({
      where: { leadSourceId: id, tenantId },
    });
    return count > 0;
  }
}

export const leadSourcesRepository = new LeadSourcesRepository();