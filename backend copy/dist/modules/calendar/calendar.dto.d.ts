import { CalendarEvent, EventCategory, EventPriority } from '@prisma/client';
export interface CreateCalendarEventDto {
    eventTitle: string;
    description?: string | null;
    isAllDay?: boolean;
    startDate: Date | string;
    startTime?: string | null;
    endDate: Date | string;
    endTime?: string | null;
    category?: EventCategory;
    color?: string | null;
    location?: string | null;
    meetingLink?: string | null;
    priority?: EventPriority;
    attendees?: string[];
    isPrivate?: boolean;
    notes?: string | null;
}
export interface UpdateCalendarEventDto extends Partial<CreateCalendarEventDto> {
}
export interface CalendarEventQueryDto {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    category?: EventCategory;
    priority?: EventPriority;
    sortBy?: 'startDate' | 'eventTitle';
    sortOrder?: 'asc' | 'desc';
}
export interface CalendarEventResponseDto {
    id: string;
    eventTitle: string;
    description: string | null;
    isAllDay: boolean;
    startDate: Date;
    startTime: string | null;
    endDate: Date;
    endTime: string | null;
    category: EventCategory;
    color: string | null;
    location: string | null;
    meetingLink: string | null;
    priority: EventPriority;
    attendees: {
        id: string;
        firstName: string;
        lastName: string;
    }[];
    isPrivate: boolean;
    notes: string | null;
    createdBy: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}
type CalendarEventWithRelations = CalendarEvent & {
    createdBy?: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
        };
    } | null;
    attendees?: {
        employee: {
            id: string;
            user: {
                firstName: string;
                lastName: string;
            };
        };
    }[];
};
export declare function toCalendarEventResponseDto(e: CalendarEventWithRelations): CalendarEventResponseDto;
export {};
//# sourceMappingURL=calendar.dto.d.ts.map