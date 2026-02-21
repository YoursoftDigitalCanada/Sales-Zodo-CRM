"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsController = exports.BookingsController = void 0;
const bookings_service_1 = require("./bookings.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class BookingsController {
    async create(req, res, next) {
        try {
            const booking = await bookings_service_1.bookingsService.create(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, booking, 'Booking created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await bookings_service_1.bookingsService.getMany(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const booking = await bookings_service_1.bookingsService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, booking);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const booking = await bookings_service_1.bookingsService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, booking, 'Booking updated');
        }
        catch (e) {
            next(e);
        }
    }
    async confirm(req, res, next) {
        try {
            const booking = await bookings_service_1.bookingsService.confirm(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, booking, 'Booking confirmed');
        }
        catch (e) {
            next(e);
        }
    }
    async cancel(req, res, next) {
        try {
            const booking = await bookings_service_1.bookingsService.cancel(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, booking, 'Booking cancelled');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await bookings_service_1.bookingsService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.BookingsController = BookingsController;
exports.bookingsController = new BookingsController();
//# sourceMappingURL=bookings.controller.js.map