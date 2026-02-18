import { PrismaClient, Prisma } from '@prisma/client';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from './tenants.dto';
import { Prisma as PrismaTypes } from '@prisma/client';

const prisma = new PrismaClient();
const tenantInclude = { _count: { select: { users: true } } };

export class TenantsRepository {
    async create(data: CreateTenantDto) {
        return prisma.tenant.create({
            data: {
                name: data.name,
                slug: data.slug,
                domain: data.domain,
                subscriptionTier: data.subscriptionTier || 'free',
                settings: (data.settings || {}) as PrismaTypes.InputJsonValue,
            },
            include: tenantInclude,
        });
    }

    async findById(id: string) {
        return prisma.tenant.findUnique({ where: { id }, include: tenantInclude });
    }

    async findBySlug(slug: string) {
        return prisma.tenant.findUnique({ where: { slug }, include: tenantInclude });
    }

    async findMany(query: TenantQueryDto) {
        const { page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.TenantWhereInput = {
            ...(status && { status }),
            ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { slug: { contains: search, mode: 'insensitive' as const } }] }),
        };
        const [data, total] = await Promise.all([
            prisma.tenant.findMany({ where, include: tenantInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.tenant.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, data: UpdateTenantDto) {
        return prisma.tenant.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.domain !== undefined && { domain: data.domain }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.settings !== undefined && { settings: data.settings as PrismaTypes.InputJsonValue }),
                ...(data.subscriptionTier !== undefined && { subscriptionTier: data.subscriptionTier }),
            },
            include: tenantInclude,
        });
    }

    async delete(id: string) {
        return prisma.tenant.delete({ where: { id } });
    }
}

export const tenantsRepository = new TenantsRepository();
