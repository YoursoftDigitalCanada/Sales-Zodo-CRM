import { TenantSettings, Currency } from '@prisma/client';

// ============================================================================
// SETTINGS DTOs - Using TenantSettings model
// ============================================================================

export interface SmtpSettings {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    senderName?: string;
    senderEmail?: string;
}

export interface ImapSettings {
    imapHost?: string;
    imapPort?: number;
    imapUser?: string;
    imapPass?: string;
}

export interface CompanyProfile {
    companyName?: string;
    companyDomain?: string;
    companyEmail?: string;
    companyPhone?: string;
    companyAddress?: string;
    taxId?: string;
}

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
    // SMTP settings (stored inside integrations JSON)
    smtpSettings?: SmtpSettings;
    // IMAP settings (stored inside integrations JSON)
    imapSettings?: ImapSettings;
    // Company profile (stored inside integrations JSON)
    companyProfile?: CompanyProfile;
    // Dark mode preference
    darkMode?: boolean;
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
    // Extracted from integrations JSON for convenience
    smtpSettings: SmtpSettings;
    imapSettings: ImapSettings;
    companyProfile: CompanyProfile;
    darkMode: boolean;
    updatedAt: Date;
}

export function toSettingsResponseDto(s: TenantSettings): SettingsResponseDto {
    const integrations = (s.integrations as Record<string, any>) || {};
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
        smtpSettings: {
            smtpHost: integrations.smtpHost || '',
            smtpPort: integrations.smtpPort || 587,
            smtpUser: integrations.smtpUser || '',
            smtpPass: integrations.smtpPass ? '••••••••' : '', // Never send raw password
            senderName: integrations.senderName || '',
            senderEmail: integrations.senderEmail || '',
        },
        imapSettings: {
            imapHost: integrations.imapHost || '',
            imapPort: integrations.imapPort || 993,
            imapUser: integrations.imapUser || '',
            imapPass: integrations.imapPass ? '••••••••' : '', // Never send raw password
        },
        companyProfile: {
            companyName: integrations.companyName || '',
            companyDomain: integrations.companyDomain || '',
            companyEmail: integrations.companyEmail || '',
            companyPhone: integrations.companyPhone || '',
            companyAddress: integrations.companyAddress || '',
            taxId: integrations.taxId || '',
        },
        darkMode: integrations.darkMode || false,
        updatedAt: s.updatedAt,
    };
}
