"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsRepository = exports.BookingsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const bookingInclude = {
    client: { select: { id: true, companyName: true, firstName: true, lastName: true, clientType: true } },
    assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } },
};
class BookingsRepository {
    async create(tenantId, data) {
        return prisma.booking.create({
            data: {
                tenantId,
                title: data.title,
                description: data.description,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                status: data.status || 'PENDING',
                clientId: data.clientId,
                assignedToId: data.assignedToId,
                location: data.location,
                notes: data.notes,
            },
            include: bookingInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.booking.findFirst({ where: { id, tenantId }, include: bookingInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, status, clientId, assignedToId, startDate, endDate, sortBy = 'startTime', sortOrder = 'asc' } = query;
        const where = {
            tenantId,
            ...(status && { status }),
            ...(clientId && { clientId }),
            ...(assignedToId && { assignedToId }),
            ...(startDate && { startTime: { gte: new Date(startDate) } }),
            ...(endDate && { endTime: { lte: new Date(endDate) } }),
        };
        const [data, total] = await Promise.all([
            prisma.booking.findMany({ where, include: bookingInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.booking.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        return prisma.booking.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.startTime !== undefined && { startTime: new Date(data.startTime) }),
                ...(data.endTime !== undefined && { endTime: new Date(data.endTime) }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.notes !== undefined && { notes: data.notes }),
            },
            include: bookingInclude,
        });
    }
    async delete(id) {
        return prisma.booking.delete({ where: { id } });
    }
    async confirm(id) {
        return prisma.booking.update({ where: { id }, data: { status: 'CONFIRMED' }, include: bookingInclude });
    }
    async cancel(id) {
        return prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' }, include: bookingInclude });
    }
}
exports.BookingsRepository = BookingsRepository;
exports.bookingsRepository = new BookingsRepository();
//# sourceMappingURL=bookings.repository.js.map