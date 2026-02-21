"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsService = exports.BookingsService = void 0;
const bookings_repository_1 = require("./bookings.repository");
const bookings_dto_1 = require("./bookings.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class BookingsService {
    async create(tenantId, data) {
        const booking = await bookings_repository_1.bookingsRepository.create(tenantId, data);
        return (0, bookings_dto_1.toBookingResponseDto)(booking);
    }
    async getById(id, tenantId) {
        const booking = await bookings_repository_1.bookingsRepository.findById(id, tenantId);
        if (!booking)
            throw new HttpErrors_1.NotFoundError('Booking not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, bookings_dto_1.toBookingResponseDto)(booking);
    }
    async getMany(tenantId, query) {
        const { data, total } = await bookings_repository_1.bookingsRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(bookings_dto_1.toBookingResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await bookings_repository_1.bookingsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Booking not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const booking = await bookings_repository_1.bookingsRepository.update(id, data);
        return (0, bookings_dto_1.toBookingResponseDto)(booking);
    }
    async delete(id, tenantId) {
        const existing = await bookings_repository_1.bookingsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Booking not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await bookings_repository_1.bookingsRepository.delete(id);
    }
    async confirm(id, tenantId) {
        const existing = await bookings_repository_1.bookingsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Booking not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const booking = await bookings_repository_1.bookingsRepository.confirm(id);
        return (0, bookings_dto_1.toBookingResponseDto)(booking);
    }
    async cancel(id, tenantId) {
        const existing = await bookings_repository_1.bookingsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Booking not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const booking = await bookings_repository_1.bookingsRepository.cancel(id);
        return (0, bookings_dto_1.toBookingResponseDto)(booking);
    }
}
exports.BookingsService = BookingsService;
exports.bookingsService = new BookingsService();
//# sourceMappingURL=bookings.service.js.map