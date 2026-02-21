import { CreateBookingDto, UpdateBookingDto, BookingQueryDto } from './bookings.dto';
export declare class BookingsService {
    create(tenantId: string, data: CreateBookingDto): Promise<import("./bookings.dto").BookingResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./bookings.dto").BookingResponseDto>;
    getMany(tenantId: string, query: BookingQueryDto): Promise<{
        data: import("./bookings.dto").BookingResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateBookingDto): Promise<import("./bookings.dto").BookingResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
    confirm(id: string, tenantId: string): Promise<import("./bookings.dto").BookingResponseDto>;
    cancel(id: string, tenantId: string): Promise<import("./bookings.dto").BookingResponseDto>;
}
export declare const bookingsService: BookingsService;
//# sourceMappingURL=bookings.service.d.ts.map