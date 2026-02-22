import { bookingsRepository } from './bookings.repository';
import { CreateBookingDto, UpdateBookingDto, BookingQueryDto, toBookingResponseDto } from './bookings.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { activityLogger } from '../../common/services/activity-logger.service';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';

export class BookingsService {
    async create(tenantId: string, data: CreateBookingDto) {
        const booking = await bookingsRepository.create(tenantId, data);
        const dto = toBookingResponseDto(booking);

        eventBus.emit('booking.created', {
            tenantId,
            bookingId: dto.id,
            clientId: (booking as any).clientId,
            serviceType: (booking as any).serviceType || (booking as any).type,
        });

        activityLogger.log({
            tenantId, entityType: 'Booking', entityId: dto.id,
            action: 'CREATE', module: 'bookings',
            description: `Created booking "${dto.id}"`,
            metadata: { clientId: (booking as any).clientId },
        });

        return dto;
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
        const booking = await bookingsRepository.update(id, tenantId, data);
        const dto = toBookingResponseDto(booking);

        activityLogger.log({
            tenantId, entityType: 'Booking', entityId: dto.id,
            action: 'UPDATE', module: 'bookings',
            description: `Updated booking "${dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await bookingsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Booking not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Booking', entityId: id,
            action: 'DELETE', module: 'bookings',
            description: `Deleted booking "${id}"`,
        });

        await bookingsRepository.delete(id, tenantId);
    }

    async confirm(id: string, tenantId: string) {
        const existing = await bookingsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Booking not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const booking = await bookingsRepository.confirm(id, tenantId);
        const dto = toBookingResponseDto(booking);

        eventBus.emit('booking.confirmed', {
            tenantId,
            bookingId: dto.id,
            clientId: (booking as any).clientId,
        });

        activityLogger.log({
            tenantId, entityType: 'Booking', entityId: dto.id,
            action: 'STATUS_CHANGE', module: 'bookings',
            description: `Booking "${dto.id}" confirmed`,
            metadata: { newStatus: 'CONFIRMED' },
        });

        // Lifecycle: confirmed booking signals active client engagement
        const clientId = (booking as any).clientId;
        if (clientId) {
            await clientLifecycleService.progressTo(clientId, tenantId, 'ACTIVE');
            await clientLifecycleService.reinforceEngagement(clientId, tenantId);
        }

        return dto;
    }

    async cancel(id: string, tenantId: string) {
        const existing = await bookingsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Booking not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const booking = await bookingsRepository.cancel(id, tenantId);
        const dto = toBookingResponseDto(booking);

        eventBus.emit('booking.cancelled', {
            tenantId,
            bookingId: dto.id,
            clientId: (booking as any).clientId,
        });

        activityLogger.log({
            tenantId, entityType: 'Booking', entityId: dto.id,
            action: 'STATUS_CHANGE', module: 'bookings',
            description: `Booking "${dto.id}" cancelled`,
            metadata: { newStatus: 'CANCELLED' },
        });

        return dto;
    }
}

export const bookingsService = new BookingsService();
