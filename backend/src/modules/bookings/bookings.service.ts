import { bookingsRepository } from './bookings.repository';
import { CreateBookingDto, UpdateBookingDto, BookingQueryDto, toBookingResponseDto } from './bookings.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class BookingsService {
    async create(tenantId: string, data: CreateBookingDto) {
        const booking = await bookingsRepository.create(tenantId, data);
        return toBookingResponseDto(booking);
    }

    async getById(id: string, tenantId: string) {
        const booking = await bookingsRepository.findById(id, tenantId);
        if (!booking) throw new NotFoundError('Booking not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toBookingResponseDto(booking);
    }

    async getMany(tenantId: string, query: BookingQueryDto) {
        const { data, total } = await bookingsRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toBookingResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateBookingDto) {
        const existing = await bookingsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Booking not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const booking = await bookingsRepository.update(id, data);
        return toBookingResponseDto(booking);
    }

    async delete(id: string, tenantId: string) {
        const existing = await bookingsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Booking not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await bookingsRepository.delete(id);
    }

    async confirm(id: string, tenantId: string) {
        const existing = await bookingsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Booking not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const booking = await bookingsRepository.confirm(id);
        return toBookingResponseDto(booking);
    }

    async cancel(id: string, tenantId: string) {
        const existing = await bookingsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Booking not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const booking = await bookingsRepository.cancel(id);
        return toBookingResponseDto(booking);
    }
}

export const bookingsService = new BookingsService();
