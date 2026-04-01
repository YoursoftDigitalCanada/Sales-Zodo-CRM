import { Prisma, BookingStatus } from '@prisma/client';
import { CreateBookingDto, UpdateBookingDto, BookingQueryDto } from './bookings.dto';
import { prisma } from '../../config/database';
const bookingInclude = {
    client: { select: { id: true, companyName: true, firstName: true, lastName: true, clientType: true } },
    assignedTo: { include: { user: { select: { firstName: true, lastName: true } } } },
};

export class BookingsRepository {
    async create(tenantId: string, data: CreateBookingDto) {
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

    async findById(id: string, tenantId: string) {
        return prisma.booking.findFirst({ where: { id, tenantId }, include: bookingInclude });
    }

    async findMany(tenantId: string, query: BookingQueryDto) {
        const { page = 1, limit = 20, status, clientId, assignedToId, startDate, endDate, sortBy = 'startTime', sortOrder = 'asc' } = query;
        const where: Prisma.BookingWhereInput = {
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

    async update(id: string, tenantId: string, data: UpdateBookingDto) {
        // Verify tenant ownership
        const existing = await prisma.booking.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Booking not found or access denied');

        return prisma.booking.update({
            where: { id_tenantId: { id, tenantId } },
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

    async delete(id: string, tenantId: string) {
        // Tenant-scoped delete
        const existing = await prisma.booking.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Booking not found or access denied');
        return prisma.booking.delete({ where: { id_tenantId: { id, tenantId } } });
    }

    async confirm(id: string, tenantId: string) {
        // Verify tenant ownership
        const existing = await prisma.booking.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Booking not found or access denied');
        return prisma.booking.update({
            where: { id_tenantId: { id, tenantId } },
            data: { status: 'CONFIRMED' },
            include: bookingInclude,
        });
    }

    async cancel(id: string, tenantId: string) {
        // Verify tenant ownership
        const existing = await prisma.booking.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Booking not found or access denied');
        return prisma.booking.update({
            where: { id_tenantId: { id, tenantId } },
            data: { status: 'CANCELLED' },
            include: bookingInclude,
        });
    }
}

export const bookingsRepository = new BookingsRepository();
