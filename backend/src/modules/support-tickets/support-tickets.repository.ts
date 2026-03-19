import { PrismaClient, Prisma, TicketStatus, TicketPriority } from '@prisma/client';

const prisma = new PrismaClient();

const ticketInclude = {
    messages: { orderBy: { createdAt: 'asc' as const } },
};

export class SupportTicketsRepository {
    async create(tenantId: string, data: {
        subject: string;
        description: string;
        priority?: TicketPriority;
        category?: string;
        requesterName: string;
        requesterEmail: string;
    }) {
        // Generate ticket number: TK-001, TK-002, etc.
        const count = await prisma.supportTicket.count({ where: { tenantId } });
        const ticketNumber = `TK-${String(count + 1).padStart(3, '0')}`;

        return prisma.supportTicket.create({
            data: {
                tenantId,
                ticketNumber,
                subject: data.subject,
                description: data.description,
                priority: data.priority || 'MEDIUM',
                category: data.category || 'Technical',
                requesterName: data.requesterName,
                requesterEmail: data.requesterEmail,
                status: 'OPEN',
            },
            include: ticketInclude,
        });
    }

    async findMany(tenantId: string, query: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: string;
    }) {
        const { page = 1, limit = 50, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.SupportTicketWhereInput = {
            tenantId,
            deletedAt: null,
            ...(status && status !== 'all' && { status: status.toUpperCase().replace('-', '_') as TicketStatus }),
            ...(search && {
                OR: [
                    { subject: { contains: search, mode: 'insensitive' as const } },
                    { ticketNumber: { contains: search, mode: 'insensitive' as const } },
                    { requesterName: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [data, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where,
                include: ticketInclude,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.supportTicket.count({ where }),
        ]);

        return { data, total };
    }

    async findById(id: string, tenantId: string) {
        return prisma.supportTicket.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: ticketInclude,
        });
    }

    async updateStatus(id: string, tenantId: string, status: TicketStatus) {
        const existing = await prisma.supportTicket.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Ticket not found');
        return prisma.supportTicket.update({
            where: { id },
            data: {
                status,
                ...(status === 'RESOLVED' || status === 'CLOSED' ? { resolvedAt: new Date() } : {}),
            },
            include: ticketInclude,
        });
    }

    async addMessage(id: string, tenantId: string, data: { sender: string; message: string; isStaff: boolean }) {
        const existing = await prisma.supportTicket.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Ticket not found');

        const msg = await prisma.ticketMessage.create({
            data: {
                ticketId: id,
                sender: data.sender,
                message: data.message,
                isStaff: data.isStaff,
            },
        });

        // Also update ticket's updatedAt and set status to IN_PROGRESS if staff reply
        if (data.isStaff && existing.status === 'OPEN') {
            await prisma.supportTicket.update({
                where: { id },
                data: { status: 'IN_PROGRESS' },
            });
        }

        return msg;
    }

    async delete(id: string, tenantId: string) {
        const existing = await prisma.supportTicket.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Ticket not found');
        return prisma.supportTicket.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async getStats(tenantId: string) {
        const [open, inProgress, resolved, total] = await Promise.all([
            prisma.supportTicket.count({ where: { tenantId, deletedAt: null, status: 'OPEN' } }),
            prisma.supportTicket.count({ where: { tenantId, deletedAt: null, status: 'IN_PROGRESS' } }),
            prisma.supportTicket.count({ where: { tenantId, deletedAt: null, status: { in: ['RESOLVED', 'CLOSED'] } } }),
            prisma.supportTicket.count({ where: { tenantId, deletedAt: null } }),
        ]);
        return { open, inProgress, resolved, total };
    }
}

export const supportTicketsRepository = new SupportTicketsRepository();
