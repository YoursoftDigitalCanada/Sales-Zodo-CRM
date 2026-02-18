import { PrismaClient, Prisma, CalendarEventType } from '@prisma/client';
import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto } from './calendar.dto';

const prisma = new PrismaClient();
const calendarEventInclude = {
    attendees: { include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } },
    createdBy: { include: { user: { select: { firstName: true, lastName: true } } } },
};

export class CalendarRepository {
    async create(tenantId: string, data: CreateCalendarEventDto, createdById?: string) {
        return prisma.calendarEvent.create({
            data: {
                tenantId,
                title: data.title,
                description: data.description,
                location: data.location,
                eventType: data.eventType || 'MEETING',
                color: data.color,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                isAllDay: data.isAllDay || false,
                timezone: data.timezone || 'UTC',
                recurrence: data.recurrence || 'NONE',
                recurrenceRule: data.recurrenceRule,
                recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
                reminderMinutes: data.reminderMinutes,
                meetingLink: data.meetingLink,
                priority: data.priority || 'MEDIUM',
                isPrivate: data.isPrivate || false,
                notes: data.notes,
                category: data.category,
                createdById,
                ...(data.attendeeIds?.length && {
                    attendees: { create: data.attendeeIds.map((employeeId) => ({ employeeId })) },
                }),
            },
            include: calendarEventInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.calendarEvent.findFirst({ where: { id, tenantId }, include: calendarEventInclude });
    }

    async findMany(tenantId: string, query: CalendarEventQueryDto) {
        const { page = 1, limit = 50, startDate, endDate, eventType, category, priority, sortBy = 'startTime', sortOrder = 'asc' } = query;
        const where: Prisma.CalendarEventWhereInput = {
            tenantId,
            ...(eventType && { eventType }),
            ...(category && { category }),
            ...(priority && { priority }),
            ...(startDate && { startTime: { gte: new Date(startDate) } }),
            ...(endDate && { endTime: { lte: new Date(endDate) } }),
        };
        const [data, total] = await Promise.all([
            prisma.calendarEvent.findMany({ where, include: calendarEventInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.calendarEvent.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, data: UpdateCalendarEventDto) {
        if (data.attendeeIds) {
            await prisma.calendarEventAttendee.deleteMany({ where: { eventId: id } });
        }

        return prisma.calendarEvent.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.eventType !== undefined && { eventType: data.eventType }),
                ...(data.color !== undefined && { color: data.color }),
                ...(data.startTime !== undefined && { startTime: new Date(data.startTime) }),
                ...(data.endTime !== undefined && { endTime: new Date(data.endTime) }),
                ...(data.isAllDay !== undefined && { isAllDay: data.isAllDay }),
                ...(data.timezone !== undefined && { timezone: data.timezone }),
                ...(data.recurrence !== undefined && { recurrence: data.recurrence }),
                ...(data.recurrenceRule !== undefined && { recurrenceRule: data.recurrenceRule }),
                ...(data.recurrenceEndDate !== undefined && { recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null }),
                ...(data.reminderMinutes !== undefined && { reminderMinutes: data.reminderMinutes }),
                ...(data.meetingLink !== undefined && { meetingLink: data.meetingLink }),
                ...(data.priority !== undefined && { priority: data.priority }),
                ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.attendeeIds && {
                    attendees: { create: data.attendeeIds.map((employeeId) => ({ employeeId })) },
                }),
            },
            include: calendarEventInclude,
        });
    }

    async delete(id: string) {
        await prisma.calendarEventAttendee.deleteMany({ where: { eventId: id } });
        return prisma.calendarEvent.delete({ where: { id } });
    }
}

export const calendarRepository = new CalendarRepository();
