import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto } from './calendar.dto';
export declare class CalendarRepository {
    create(tenantId: string, data: CreateCalendarEventDto, createdById?: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        createdById: string | null;
        color: string | null;
        title: string;
        startTime: Date;
        isAllDay: boolean;
        endTime: Date;
        eventType: import(".prisma/client").$Enums.CalendarEventType;
        recurrence: import(".prisma/client").$Enums.CalendarEventRecurrence;
        recurrenceRule: string | null;
        recurrenceEndDate: Date | null;
        reminderMinutes: number | null;
    }>;
    findById(id: string, tenantId: string): Promise<({
        createdBy: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        attendees: ({
            employee: {
                user: {
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            status: string;
            employeeId: string;
            id: string;
            eventId: string;
            respondedAt: Date | null;
        })[];
    } & {
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        createdById: string | null;
        color: string | null;
        title: string;
        startTime: Date;
        isAllDay: boolean;
        endTime: Date;
        eventType: import(".prisma/client").$Enums.CalendarEventType;
        recurrence: import(".prisma/client").$Enums.CalendarEventRecurrence;
        recurrenceRule: string | null;
        recurrenceEndDate: Date | null;
        reminderMinutes: number | null;
    }) | null>;
    findMany(tenantId: string, query: CalendarEventQueryDto, userId?: string): Promise<{
        data: ({
            createdBy: ({
                user: {
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
            attendees: ({
                employee: {
                    user: {
                        firstName: string;
                        lastName: string;
                    };
                } & {
                    userId: string;
                    tenantId: string;
                    id: string;
                    employeeNumber: string | null;
                    department: string | null;
                    position: string | null;
                    hireDate: Date | null;
                    isActive: boolean;
                    roleId: string;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                status: string;
                employeeId: string;
                id: string;
                eventId: string;
                respondedAt: Date | null;
            })[];
        } & {
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            timezone: string;
            location: string | null;
            createdById: string | null;
            color: string | null;
            title: string;
            startTime: Date;
            isAllDay: boolean;
            endTime: Date;
            eventType: import(".prisma/client").$Enums.CalendarEventType;
            recurrence: import(".prisma/client").$Enums.CalendarEventRecurrence;
            recurrenceRule: string | null;
            recurrenceEndDate: Date | null;
            reminderMinutes: number | null;
        })[];
        total: number;
    }>;
    update(id: string, data: UpdateCalendarEventDto): Promise<{
        createdBy: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        attendees: ({
            employee: {
                user: {
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            status: string;
            employeeId: string;
            id: string;
            eventId: string;
            respondedAt: Date | null;
        })[];
    } & {
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        createdById: string | null;
        color: string | null;
        title: string;
        startTime: Date;
        isAllDay: boolean;
        endTime: Date;
        eventType: import(".prisma/client").$Enums.CalendarEventType;
        recurrence: import(".prisma/client").$Enums.CalendarEventRecurrence;
        recurrenceRule: string | null;
        recurrenceEndDate: Date | null;
        reminderMinutes: number | null;
    }>;
    delete(id: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        createdById: string | null;
        color: string | null;
        title: string;
        startTime: Date;
        isAllDay: boolean;
        endTime: Date;
        eventType: import(".prisma/client").$Enums.CalendarEventType;
        recurrence: import(".prisma/client").$Enums.CalendarEventRecurrence;
        recurrenceRule: string | null;
        recurrenceEndDate: Date | null;
        reminderMinutes: number | null;
    }>;
}
export declare const calendarRepository: CalendarRepository;
//# sourceMappingURL=calendar.repository.d.ts.map