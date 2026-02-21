import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto } from './calendar.dto';
export declare class CalendarService {
    create(tenantId: string, data: CreateCalendarEventDto, createdById?: string): Promise<import("./calendar.dto").CalendarEventResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./calendar.dto").CalendarEventResponseDto>;
    getMany(tenantId: string, query: CalendarEventQueryDto, userId?: string): Promise<{
        data: import("./calendar.dto").CalendarEventResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateCalendarEventDto): Promise<import("./calendar.dto").CalendarEventResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const calendarService: CalendarService;
//# sourceMappingURL=calendar.service.d.ts.map