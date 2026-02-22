import { calendarRepository } from './calendar.repository';
import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto, toCalendarEventResponseDto } from './calendar.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';

export class CalendarService {
    async create(tenantId: string, data: CreateCalendarEventDto, createdById?: string) {
        const event = await calendarRepository.create(tenantId, data, createdById);
        const dto = toCalendarEventResponseDto(event);

        activityLogger.log({
            tenantId, entityType: 'CalendarEvent', entityId: dto.id,
            action: 'CREATE', module: 'calendar',
            description: `Created calendar event "${(event as any).title || dto.id}"`,
            userId: createdById,
            metadata: { title: (event as any).title, startDate: (event as any).startDate },
        });

        eventBus.emit('calendar.created', {
            tenantId,
            eventId: dto.id,
            title: (event as any).title || '',
            startDate: (event as any).startDate?.toISOString?.() || undefined,
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const event = await calendarRepository.findById(id, tenantId);
        if (!event) throw new NotFoundError('Calendar event not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toCalendarEventResponseDto(event);
    }

    async getMany(tenantId: string, query: CalendarEventQueryDto) {
        const { data, total } = await calendarRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 50;
        return {
            data: data.map(toCalendarEventResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateCalendarEventDto) {
        const existing = await calendarRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Calendar event not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const event = await calendarRepository.update(id, tenantId, data);
        const dto = toCalendarEventResponseDto(event);

        activityLogger.log({
            tenantId, entityType: 'CalendarEvent', entityId: dto.id,
            action: 'UPDATE', module: 'calendar',
            description: `Updated calendar event "${(event as any).title || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await calendarRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Calendar event not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'CalendarEvent', entityId: id,
            action: 'DELETE', module: 'calendar',
            description: `Deleted calendar event "${(existing as any).title || id}"`,
        });

        await calendarRepository.delete(id, tenantId);
    }
}

export const calendarService = new CalendarService();
