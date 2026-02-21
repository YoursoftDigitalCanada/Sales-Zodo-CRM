import { TenantSettings, Currency } from '@prisma/client';

// ============================================================================
// SETTINGS DTOs - Using TenantSettings model (not non-existent "Setting")
// ============================================================================

export interface UpdateSettingsDto {
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
    currency?: Currency;
    language?: string;
    fiscalYearStart?: number;
    invoicePrefix?: string;
    invoiceNextNumber?: number;
    invoiceTerms?: string | null;
    invoiceNotes?: string | null;
    emailSignature?: string | null;
    notificationSettings?: Record<string, unknown>;
}

export interface SettingsResponseDto {
    id: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currency: Currency;
    language: string;
    fiscalYearStart: number;
    invoicePrefix: string;
    invoiceNextNumber: number;
    invoiceTerms: string | null;
    invoiceNotes: string | null;
    emailSignature: string | null;
    notificationSettings: Record<string, unknown>;
    updatedAt: Date;
}

export function toSettingsResponseDto(s: TenantSettings): SettingsResponseDto {
    return {
        id: s.id,
        timezone: s.timezone,
        dateFormat: s.dateFormat,
        timeFormat: s.timeFormat,
        currency: s.currency,
        language: s.language,
        fiscalYearStart: s.fiscalYearStart,
        invoicePrefix: s.invoicePrefix,
        invoiceNextNumber: s.invoiceNextNumber,
        invoiceTerms: s.invoiceTerms,
        invoiceNotes: s.invoiceNotes,
        emailSignature: s.emailSignature,
        notificationSettings: (s.notificationSettings as Record<string, unknown>) || {},
        updatedAt: s.updatedAt,
    };
}
