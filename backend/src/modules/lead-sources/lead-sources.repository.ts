import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { CreateLeadSourceDto, UpdateLeadSourceDto, LeadSourceQueryDto } from './lead-sources.dto';
import crypto from 'crypto';

export class LeadSourcesRepository {
  /**
   * Create lead source with auto-generated slug and webhook URL/secret
   */
  async create(tenantId: string, data: CreateLeadSourceDto) {
    const slug = this.generateSlug(data.name);
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const sourceId = crypto.randomUUID();
    const webhookUrl = `${process.env.API_BASE_URL || 'https://api.zodo.ca'}/api/v1/webhooks/leads/${sourceId}`;

    return prisma.leadSource.create({
      data: {
        id: sourceId,
        ...data,
        slug,
        webhookUrl,
        webhookSecret,
        tenantId,
      } as any,
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
    const { page: rawPage = 1, limit: rawLimit = 20, search, isActive, sourceType, category, status, integrationStatus } = query;

    const page = Number(rawPage) || 1;
    const limit = Number(rawLimit) || 20;

    const where: Prisma.LeadSourceWhereInput = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(sourceType && { sourceType: sourceType as any }),
      ...(category && { category: category as any }),
      ...(status && { status: status as any }),
      ...(integrationStatus && { integrationStatus: integrationStatus as any }),
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
            select: {
              leads: {
                where: { tenantId },
              },
            },
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
    const existing = await prisma.leadSource.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Lead source not found or access denied');

    // If name is changing, update slug too
    const updateData: any = { ...data };
    if (data.name && data.name !== existing.name) {
      updateData.slug = this.generateSlug(data.name);
    }

    return prisma.leadSource.update({
      where: { id },
      data: updateData,
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
          where: { tenantId },
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
        sourceType: source.sourceType,
        category: source.category,
        icon: source.icon,
        color: source.color,
        isActive: source.isActive,
        integrationStatus: source.integrationStatus,
        status: source.status,
        leadCount,
        convertedCount,
        conversionRate: leadCount > 0 ? (convertedCount / leadCount) * 100 : 0,
        totalValue,
        costPerLead: source.costPerLead ? Number(source.costPerLead) : null,
        lastLeadAt: source.lastLeadAt,
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

  /**
   * Get available source types (static config)
   */
  getSourceTypes() {
    return [
      { type: 'COLD_CALL', name: 'Cold Call', category: 'MANUAL', icon: 'Phone', color: '#6366F1', description: 'Track leads from cold calling campaigns', method: 'Manual entry' },
      { type: 'EMAIL_CAMPAIGN', name: 'Email Campaign', category: 'DIGITAL', icon: 'Mail', color: '#EC4899', description: 'Leads from email marketing campaigns', method: 'Email parser / Manual' },
      { type: 'GOOGLE_ADS', name: 'Google Ads', category: 'DIGITAL', icon: 'Chrome', color: '#4285F4', description: 'Import leads from Google Ads lead forms', method: 'API / Webhook' },
      { type: 'REFERRAL', name: 'Referral', category: 'MANUAL', icon: 'UserPlus', color: '#10B981', description: 'Customer referrals and partner leads', method: 'Manual entry' },
      { type: 'SOCIAL_MEDIA', name: 'Social Media', category: 'DIGITAL', icon: 'Share2', color: '#3B82F6', description: 'Leads from Facebook, Instagram, Meta Ads', method: 'Meta API / Webhook' },
      { type: 'TRADE_SHOW', name: 'Trade Show', category: 'MANUAL', icon: 'Presentation', color: '#F59E0B', description: 'Leads collected at trade shows and events', method: 'Manual entry / Import' },
      { type: 'WALK_IN', name: 'Walk-In', category: 'MANUAL', icon: 'MapPin', color: '#8B5CF6', description: 'Walk-in customers at your location', method: 'Manual entry' },
      { type: 'WEBSITE', name: 'Website', category: 'DIGITAL', icon: 'Globe', color: '#0891B2', description: 'Leads from website contact forms', method: 'Webhook / Form embed' },
    ];
  }

  /**
   * Regenerate webhook secret for a source
   */
  async regenerateWebhookSecret(id: string, tenantId: string) {
    const existing = await prisma.leadSource.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Lead source not found');

    const webhookSecret = crypto.randomBytes(32).toString('hex');
    return prisma.leadSource.update({
      where: { id },
      data: { webhookSecret },
    });
  }

  /**
   * Create a log entry
   */
  async createLog(data: {
    leadSourceId: string;
    eventType: string;
    status: string;
    direction?: string;
    requestPayload?: any;
    responsePayload?: any;
    errorMessage?: string;
    processingTimeMs?: number;
    leadId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.leadSourceLog.create({ data: data as any });
  }

  /**
   * Get logs for a lead source
   */
  async getLogs(leadSourceId: string, query: { page?: number; limit?: number; eventType?: string; status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: any = { leadSourceId };
    if (query.eventType) where.eventType = query.eventType;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      prisma.leadSourceLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leadSourceLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Update cached statistics for a source
   */
  async updateStats(id: string, tenantId: string) {
    const leads = await prisma.lead.findMany({
      where: { leadSourceId: id, tenantId },
      select: { status: true, potentialValue: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalLeads = leads.length;
    const convertedLeads = leads.filter((l) => l.status === 'WON').length;
    const totalRevenue = leads.reduce((sum, l) => sum + Number(l.potentialValue || 0), 0);
    const lastLeadAt = leads.length > 0 ? leads[0].createdAt : null;

    return prisma.leadSource.update({
      where: { id },
      data: {
        totalLeads,
        convertedLeads,
        totalRevenue,
        lastLeadAt,
        statsUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Generate URL-safe slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

export const leadSourcesRepository = new LeadSourcesRepository();