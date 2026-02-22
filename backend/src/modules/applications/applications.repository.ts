import { PrismaClient, Prisma } from '@prisma/client';
import { CreateApplicationDto, UpdateApplicationDto, ApplicationQueryDto } from './applications.dto';

const prisma = new PrismaClient();

const applicationInclude = {
    files: { select: { id: true, name: true, mimeType: true, size: true } },
};

export class ApplicationsRepository {
    async create(tenantId: string, data: CreateApplicationDto) {
        return prisma.application.create({
            data: {
                tenantId,
                referenceNumber: data.referenceNumber,
                title: data.title,
                description: data.description,
                formData: data.formData || {},
                internalNotes: data.internalNotes,
            },
            include: applicationInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.application.findFirst({
            where: { id, tenantId },
            include: applicationInclude,
        });
    }

    async findMany(tenantId: string, query: ApplicationQueryDto) {
        const {
            page = 1,
            limit = 20,
            status,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = query;

        const where: Prisma.ApplicationWhereInput = {
            tenantId,
            ...(status && { status }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                    { referenceNumber: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                    { description: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                ],
            }),
        };

        const [data, total] = await Promise.all([
            prisma.application.findMany({
                where,
                include: applicationInclude,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.application.count({ where }),
        ]);

        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateApplicationDto) {
        // Verify tenant ownership
        const existing = await prisma.application.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Application not found or access denied');

        const updateData: Prisma.ApplicationUpdateInput = {};

        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.formData !== undefined) updateData.formData = data.formData;
        if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;
        if (data.status !== undefined) {
            updateData.status = data.status;
            if (data.status === 'SUBMITTED') updateData.submittedAt = new Date();
            if (data.status === 'UNDER_REVIEW') updateData.reviewedAt = new Date();
            if (data.status === 'APPROVED' || data.status === 'REJECTED') updateData.completedAt = new Date();
        }

        return prisma.application.update({
            where: { id },
            data: updateData,
            include: applicationInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped delete
        const existing = await prisma.application.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Application not found or access denied');
        return prisma.application.delete({ where: { id } });
    }
}

export const applicationsRepository = new ApplicationsRepository();
