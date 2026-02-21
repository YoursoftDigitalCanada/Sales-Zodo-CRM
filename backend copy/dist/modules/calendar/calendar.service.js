"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarService = exports.CalendarService = void 0;
const calendar_repository_1 = require("./calendar.repository");
const calendar_dto_1 = require("./calendar.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class CalendarService {
    async create(tenantId, data, createdById) {
        const event = await calendar_repository_1.calendarRepository.create(tenantId, data, createdById);
        return (0, calendar_dto_1.toCalendarEventResponseDto)(event);
    }
    async getById(id, tenantId) {
        const event = await calendar_repository_1.calendarRepository.findById(id, tenantId);
        if (!event)
            throw new HttpErrors_1.NotFoundError('Calendar event not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, calendar_dto_1.toCalendarEventResponseDto)(event);
    }
    async getMany(tenantId, query, userId) {
        const { data, total } = await calendar_repository_1.calendarRepository.findMany(tenantId, query, userId);
        const page = query.page || 1, limit = query.limit || 50;
        return {
            data: data.map(calendar_dto_1.toCalendarEventResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await calendar_repository_1.calendarRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Calendar event not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const event = await calendar_repository_1.calendarRepository.update(id, data);
        return (0, calendar_dto_1.toCalendarEventResponseDto)(event);
    }
    async delete(id, tenantId) {
        const existing = await calendar_repository_1.calendarRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Calendar event not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await calendar_repository_1.calendarRepository.delete(id);
    }
}
exports.CalendarService = CalendarService;
exports.calendarService = new CalendarService();
//# sourceMappingURL=calendar.service.js.map