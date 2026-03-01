import { PrismaClient, Prisma, ContractStatus } from '@prisma/client';
import { CreateContractDto, UpdateContractDto, ContractQueryDto } from './contracts.dto';

const prisma = new PrismaClient();
const contractInclude = {
    client: { select: { id: true, clientName: true } },
};

async function generateContractNumber(tenantId: string): Promise<string> {
    const count = await prisma.contract.count({ where: { tenantId } });
    const num = (count + 1).toString().padStart(5, '0');
    return `CT-${num}`;
}

export class ContractsRepository {
    async create(tenantId: string, data: CreateContractDto, createdById?: string) {
        const contractNumber = data.contractNumber || await generateContractNumber(tenantId);

        return prisma.contract.create({
            data: {
                tenantId,
                contractNumber,
                title: data.title,
                description: data.description || null,
                clientId: data.clientId,
                quoteId: data.quoteId || null,
                projectId: data.projectId || null,
                value: data.value,
                currency: data.currency || 'CAD',
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                terms: data.terms || null,
                notes: data.notes || null,
                createdById: createdById || null,
                status: 'DRAFT',
            },
            include: contractInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.contract.findFirst({ where: { id, tenantId }, include: contractInclude });
    }

    async findMany(tenantId: string, query: ContractQueryDto) {
        const { page = 1, limit = 20, search, status, clientId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.ContractWhereInput = {
            tenantId,
            ...(status && { status }),
            ...(clientId && { clientId }),
            ...(search && {
                OR: [
                    { contractNumber: { contains: search, mode: 'insensitive' as const } },
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.contract.findMany({
                where,
                include: contractInclude,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.contract.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateContractDto) {
        const existing = await prisma.contract.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Contract not found or access denied');

        return prisma.contract.update({
            where: { id },
            data: {
                ...(data.contractNumber !== undefined && { contractNumber: data.contractNumber }),
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                ...(data.quoteId !== undefined && { quoteId: data.quoteId }),
                ...(data.projectId !== undefined && { projectId: data.projectId }),
                ...(data.value !== undefined && { value: data.value }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
                ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.terms !== undefined && { terms: data.terms }),
                ...(data.notes !== undefined && { notes: data.notes }),
            },
            include: contractInclude,
        });
    }

    async updateStatus(id: string, tenantId: string, status: ContractStatus) {
        const existing = await prisma.contract.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Contract not found or access denied');

        const updateData: Prisma.ContractUpdateInput = { status };
        if (status === 'ACTIVE' && !existing.signedAt) {
            updateData.signedAt = new Date();
        }

        return prisma.contract.update({
            where: { id },
            data: updateData,
            include: contractInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        const existing = await prisma.contract.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Contract not found or access denied');

        return prisma.contract.delete({ where: { id } });
    }
}

export const contractsRepository = new ContractsRepository();
