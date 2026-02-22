// Timeline DTOs
// Transforms raw AuditLog entries into user-friendly timeline events

export interface TimelineEventDto {
    id: string;
    action: string;
    title: string;
    description: string;
    icon: string;        // icon key for frontend mapping
    color: string;       // color key for frontend mapping
    entityType: string;
    entityId: string;
    module: string;
    user: {
        id: string;
        name: string;
        email: string;
    } | null;
    metadata: {
        oldValues?: Record<string, any>;
        newValues?: Record<string, any>;
        changes?: string[];
    } | null;
    createdAt: Date;
}

export interface TimelineQueryDto {
    page?: number;
    limit?: number;
    action?: string;        // filter by AuditAction
    module?: string;        // filter by module name
    includeRelated?: boolean; // include related entity timelines
}

export interface TimelineResponseDto {
    data: TimelineEventDto[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
