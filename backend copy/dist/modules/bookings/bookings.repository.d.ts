import { CreateBookingDto, UpdateBookingDto, BookingQueryDto } from './bookings.dto';
export declare class BookingsRepository {
    create(tenantId: string, data: CreateBookingDto): Promise<{
        client: {
            id: string;
            firstName: never;
            lastName: never;
            companyName: string | null;
            clientType: import(".prisma/client").$Enums.ClientType;
        } | null;
        assignedTo: ({
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
    } & {
        status: import(".prisma/client").$Enums.BookingStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        assignedToId: string | null;
        notes: string | null;
        title: string;
        startTime: Date;
        clientId: string | null;
        endTime: Date;
        meetingLink: string | null;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        isOnline: boolean;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    }>;
    findById(id: string, tenantId: string): Promise<({
        client: {
            id: string;
            firstName: never;
            lastName: never;
            companyName: string | null;
            clientType: import(".prisma/client").$Enums.ClientType;
        } | null;
        assignedTo: ({
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
    } & {
        status: import(".prisma/client").$Enums.BookingStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        assignedToId: string | null;
        notes: string | null;
        title: string;
        startTime: Date;
        clientId: string | null;
        endTime: Date;
        meetingLink: string | null;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        isOnline: boolean;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    }) | null>;
    findMany(tenantId: string, query: BookingQueryDto): Promise<{
        data: ({
            client: {
                id: string;
                firstName: never;
                lastName: never;
                companyName: string | null;
                clientType: import(".prisma/client").$Enums.ClientType;
            } | null;
            assignedTo: ({
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
        } & {
            status: import(".prisma/client").$Enums.BookingStatus;
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            timezone: string;
            location: string | null;
            assignedToId: string | null;
            notes: string | null;
            title: string;
            startTime: Date;
            clientId: string | null;
            endTime: Date;
            meetingLink: string | null;
            guestName: string | null;
            guestEmail: string | null;
            guestPhone: string | null;
            isOnline: boolean;
            confirmedAt: Date | null;
            cancelledAt: Date | null;
        })[];
        total: number;
    }>;
    update(id: string, data: UpdateBookingDto): Promise<{
        client: {
            id: string;
            firstName: never;
            lastName: never;
            companyName: string | null;
            clientType: import(".prisma/client").$Enums.ClientType;
        } | null;
        assignedTo: ({
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
    } & {
        status: import(".prisma/client").$Enums.BookingStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        assignedToId: string | null;
        notes: string | null;
        title: string;
        startTime: Date;
        clientId: string | null;
        endTime: Date;
        meetingLink: string | null;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        isOnline: boolean;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    }>;
    delete(id: string): Promise<{
        status: import(".prisma/client").$Enums.BookingStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        assignedToId: string | null;
        notes: string | null;
        title: string;
        startTime: Date;
        clientId: string | null;
        endTime: Date;
        meetingLink: string | null;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        isOnline: boolean;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    }>;
    confirm(id: string): Promise<{
        client: {
            id: string;
            firstName: never;
            lastName: never;
            companyName: string | null;
            clientType: import(".prisma/client").$Enums.ClientType;
        } | null;
        assignedTo: ({
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
    } & {
        status: import(".prisma/client").$Enums.BookingStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        assignedToId: string | null;
        notes: string | null;
        title: string;
        startTime: Date;
        clientId: string | null;
        endTime: Date;
        meetingLink: string | null;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        isOnline: boolean;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    }>;
    cancel(id: string): Promise<{
        client: {
            id: string;
            firstName: never;
            lastName: never;
            companyName: string | null;
            clientType: import(".prisma/client").$Enums.ClientType;
        } | null;
        assignedTo: ({
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
    } & {
        status: import(".prisma/client").$Enums.BookingStatus;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        timezone: string;
        location: string | null;
        assignedToId: string | null;
        notes: string | null;
        title: string;
        startTime: Date;
        clientId: string | null;
        endTime: Date;
        meetingLink: string | null;
        guestName: string | null;
        guestEmail: string | null;
        guestPhone: string | null;
        isOnline: boolean;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    }>;
}
export declare const bookingsRepository: BookingsRepository;
//# sourceMappingURL=bookings.repository.d.ts.map