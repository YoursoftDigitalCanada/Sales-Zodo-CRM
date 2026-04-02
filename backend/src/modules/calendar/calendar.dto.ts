import { CalendarEvent, CalendarEventType, CalendarEventRecurrence } from '@prisma/client';

// ============================================================================
// CALENDAR DTOs - Matching Prisma Schema + Frontend Fields
// ============================================================================

export interface CreateCalendarEventDto {
    title: string;
    description?: string | null;
    location?: string | null;
    eventType?: CalendarEventType;
    color?: string | null;
    startTime: Date | string;
    endTime: Date | string;
    isAllDay?: boolean;
    timezone?: string;
    recurrence?: CalendarEventRecurrence;
    recurrenceRule?: string | null;
    recurrenceEndDate?: Date | string | null;
    reminderMinutes?: number | null;
    attendeeIds?: string[];
    meetingLink?: string | null;
    priority?: string;
    isPrivate?: boolean;
    notes?: string | null;
    category?: string | null;
    clientId?: string | null;
    leadId?: string | null;
}

export interface UpdateCalendarEventDto extends Partial<CreateCalendarEventDto> { }

export interface CalendarEventQueryDto {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    eventType?: CalendarEventType;
    category?: string;
    priority?: string;
    sortBy?: 'startTime' | 'createdAt' | 'title';
    sortOrder?: 'asc' | 'desc';
}

export interface CalendarEventResponseDto {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    eventType: CalendarEventType;
    color: string | null;
    startTime: Date;
    endTime: Date;
    isAllDay: boolean;
    timezone: string;
    recurrence: CalendarEventRecurrence;
    recurrenceRule: string | null;
    recurrenceEndDate: Date | null;
    reminderMinutes: number | null;
    meetingLink: string | null;
    priority: string;
    isPrivate: boolean;
    notes: string | null;
    category: string | null;
    clientId: string | null;
    leadId: string | null;
    attendees: {
        id: string;
        employeeId: string;
        status: string;
        respondedAt: Date | null;
        employee: {
            id: string;
            userId: string;
            user: {
                firstName: string;
                lastName: string;
                email: string;
                avatar: string | null;
            };
        };
    }[];
    createdBy: { id: string; firstName: string; lastName: string } | null;
    createdAt: Date;
    updatedAt: Date;
}

type CalendarEventWithRelations = CalendarEvent & {
    attendees?: {
        id: string;
        employeeId: string;
        status: string;
        respondedAt: Date | null;
        employee: {
            id: string;
            userId: string;
            user: {
                firstName: string;
                lastName: string;
                email: string;
                avatar: string | null;
            };
        };
    }[];
    createdBy?: { id: string; user: { firstName: string; lastName: string } } | null;
};

export function toCalendarEventResponseDto(e: CalendarEventWithRelations): CalendarEventResponseDto {
    return {
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        eventType: e.eventType,
        color: e.color,
        startTime: e.startTime,
        endTime: e.endTime,
        isAllDay: e.isAllDay,
        timezone: e.timezone,
        recurrence: e.recurrence,
        recurrenceRule: e.recurrenceRule,
        recurrenceEndDate: e.recurrenceEndDate,
        reminderMinutes: e.reminderMinutes,
        meetingLink: e.meetingLink,
        priority: e.priority,
        isPrivate: e.isPrivate,
        notes: e.notes,
        category: e.category,
        clientId: e.clientId ?? null,
        leadId: e.leadId ?? null,
        attendees: (e.attendees || []).map((a) => ({
            id: a.id,
            employeeId: a.employeeId,
            status: a.status,
            respondedAt: a.respondedAt ?? null,
            employee: {
                id: a.employee.id,
                userId: a.employee.userId,
                user: {
                    firstName: a.employee.user.firstName,
                    lastName: a.employee.user.lastName,
                    email: a.employee.user.email,
                    avatar: a.employee.user.avatar ?? null,
                },
            },
        })),
        createdBy: e.createdBy ? { id: e.createdBy.id, firstName: e.createdBy.user.firstName, lastName: e.createdBy.user.lastName } : null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
    };
}
