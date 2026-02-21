import { calendarRepository } from './calendar.repository';
import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto, toCalendarEventResponseDto } from './calendar.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class CalendarService {
    async create(tenantId: string, data: CreateCalendarEventDto, createdById?: string) {
        const event = await calendarRepository.create(tenantId, data, createdById);
        return toCalendarEventResponseDto(event);
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
        const event = await calendarRepository.update(id, data);
        return toCalendarEventResponseDto(event);
    }

    async delete(id: string, tenantId: string) {
        const existing = await calendarRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Calendar event not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await calendarRepository.delete(id);
    }
}

export const calendarService = new CalendarService();
