"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarController = exports.CalendarController = void 0;
const calendar_service_1 = require("./calendar.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class CalendarController {
    async create(req, res, next) {
        try {
            const event = await calendar_service_1.calendarService.create(req.user.tenantId, req.body, req.user.employeeId);
            (0, responseFormatter_1.sendCreated)(res, event, 'Event created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await calendar_service_1.calendarService.getMany(req.user.tenantId, req.query, req.user.id);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const event = await calendar_service_1.calendarService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, event);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const event = await calendar_service_1.calendarService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, event, 'Event updated');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await calendar_service_1.calendarService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.CalendarController = CalendarController;
exports.calendarController = new CalendarController();
//# sourceMappingURL=calendar.controller.js.map