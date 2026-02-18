import { Application, ApplicationStatus } from '@prisma/client';

export interface CreateApplicationDto {
    referenceNumber: string;
    title: string;
    description?: string | null;
    formData?: Record<string, any>;
    internalNotes?: string | null;
}

export interface UpdateApplicationDto {
    title?: string;
    description?: string | null;
    status?: ApplicationStatus;
    formData?: Record<string, any>;
    internalNotes?: string | null;
}

export interface ApplicationQueryDto {
    page?: number;
    limit?: number;
    status?: ApplicationStatus;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'referenceNumber';
    sortOrder?: 'asc' | 'desc';
}

export interface ApplicationResponseDto {
    id: string;
    referenceNumber: string;
    title: string;
    description: string | null;
    status: ApplicationStatus;
    formData: Record<string, any>;
    internalNotes: string | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    completedAt: Date | null;
    files: { id: string; name: string; mimeType: string; size: string }[];
    createdAt: Date;
    updatedAt: Date;
}

type ApplicationWithRelations = Application & {
    files?: { id: string; name: string; mimeType: string; size: bigint }[];
};

export function toApplicationResponseDto(app: ApplicationWithRelations): ApplicationResponseDto {
    return {
        id: app.id,
        referenceNumber: app.referenceNumber,
        title: app.title,
        description: app.description,
        status: app.status,
        formData: app.formData as Record<string, any>,
        internalNotes: app.internalNotes,
        submittedAt: app.submittedAt,
        reviewedAt: app.reviewedAt,
        completedAt: app.completedAt,
        files: (app.files || []).map(f => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            size: f.size.toString(),
        })),
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
    };
}
