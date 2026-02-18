import { Booking, BookingStatus } from '@prisma/client';

export interface CreateBookingDto {
    title: string;
    description?: string | null;
    startTime: Date | string;
    endTime: Date | string;
    status?: BookingStatus;
    clientId?: string | null;
    assignedToId?: string | null;
    location?: string | null;
    notes?: string | null;
}

export interface UpdateBookingDto extends Partial<CreateBookingDto> { }

export interface BookingQueryDto {
    page?: number;
    limit?: number;
    status?: BookingStatus;
    clientId?: string;
    assignedToId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'startTime' | 'createdAt' | 'title';
    sortOrder?: 'asc' | 'desc';
}

export interface BookingResponseDto {
    id: string;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    location: string | null;
    notes: string | null;
    client: { id: string; displayName: string } | null;
    assignedTo: { id: string; firstName: string; lastName: string } | null;
    createdAt: Date;
    updatedAt: Date;
}

type BookingWithRelations = Booking & {
    client?: { id: string; companyName: string | null; firstName: string | null; lastName: string | null; clientType: string } | null;
    assignedTo?: { id: string; user: { firstName: string; lastName: string } } | null;
};

export function toBookingResponseDto(b: BookingWithRelations): BookingResponseDto {
    let clientDisplayName: string | undefined;
    if (b.client) {
        clientDisplayName = b.client.clientType === 'COMPANY' ? b.client.companyName || 'Company' : `${b.client.firstName || ''} ${b.client.lastName || ''}`.trim();
    }

    return {
        id: b.id,
        title: b.title,
        description: b.description,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        location: b.location,
        notes: b.notes,
        client: b.client ? { id: b.client.id, displayName: clientDisplayName! } : null,
        assignedTo: b.assignedTo ? { id: b.assignedTo.id, firstName: b.assignedTo.user.firstName, lastName: b.assignedTo.user.lastName } : null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
    };
}
