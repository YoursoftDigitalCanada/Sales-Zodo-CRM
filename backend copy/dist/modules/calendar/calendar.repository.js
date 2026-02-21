"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarRepository = exports.CalendarRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const calendarEventInclude = {
    createdBy: { include: { user: { select: { firstName: true, lastName: true } } } },
    attendees: { include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } },
};
class CalendarRepository {
    async create(tenantId, data, createdById) {
        return prisma.calendarEvent.create({
            data: {
                tenantId,
                title: data.title,
                description: data.description,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                isAllDay: data.isAllDay || false,
                location: data.location,
                color: data.color,
                reminders: data.reminders || [],
                createdById,
                ...(data.attendees?.length && {
                    attendees: { create: data.attendees.map((employeeId) => ({ employeeId })) },
                }),
            },
            include: calendarEventInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.calendarEvent.findFirst({ where: { id, tenantId }, include: calendarEventInclude });
    }
    async findMany(tenantId, query, userId) {
        const { page = 1, limit = 50, startDate, endDate, sortBy = 'startTime', sortOrder = 'asc' } = query;
        const where = {
            tenantId,
            ...(startDate && { startTime: { gte: new Date(startDate) } }),
            ...(endDate && { endTime: { lte: new Date(endDate) } }),
        };
        const [data, total] = await Promise.all([
            prisma.calendarEvent.findMany({ where, include: calendarEventInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.calendarEvent.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        const updateData = {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.startTime !== undefined && { startTime: new Date(data.startTime) }),
            ...(data.endTime !== undefined && { endTime: new Date(data.endTime) }),
            ...(data.isAllDay !== undefined && { isAllDay: data.isAllDay }),
            ...(data.location !== undefined && { location: data.location }),
            ...(data.color !== undefined && { color: data.color }),
            ...(data.reminders !== undefined && { reminders: data.reminders }),
        };
        if (data.attendees) {
            await prisma.calendarEventAttendee.deleteMany({ where: { eventId: id } });
            updateData.attendees = { create: data.attendees.map((employeeId) => ({ employeeId })) };
        }
        return prisma.calendarEvent.update({ where: { id }, data: updateData, include: calendarEventInclude });
    }
    async delete(id) {
        await prisma.calendarEventAttendee.deleteMany({ where: { eventId: id } });
        return prisma.calendarEvent.delete({ where: { id } });
    }
}
exports.CalendarRepository = CalendarRepository;
exports.calendarRepository = new CalendarRepository();
//# sourceMappingURL=calendar.repository.js.map