import api from "@/lib/axios";

// ─── Types matching backend SettingsResponseDto ───

export interface SmtpSettings {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    senderName: string;
    senderEmail: string;
}

export interface CompanyProfile {
    companyName: string;
    companyDomain: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    taxId: string;
}

export interface NotificationPrefs {
    email?: boolean;
    push?: boolean;
    desktop?: boolean;
    weekly?: boolean;
    marketing?: boolean;
}

export interface SettingsResponse {
    id: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currency: string;
    language: string;
    fiscalYearStart: number;
    invoicePrefix: string;
    invoiceNextNumber: number;
    invoiceTerms: string | null;
    invoiceNotes: string | null;
    emailSignature: string | null;
    notificationSettings: NotificationPrefs;
    smtpSettings: SmtpSettings;
    companyProfile: CompanyProfile;
    darkMode: boolean;
    updatedAt: string;
}

// ─── API calls ───

export async function getSettings(): Promise<SettingsResponse> {
    const response = await api.get("/settings");
    const raw = response.data;
    return raw?.data || raw;
}

export async function updateSettings(data: Partial<{
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currency: string;
    language: string;
    darkMode: boolean;
    emailSignature: string | null;
    notificationSettings: NotificationPrefs;
    smtpSettings: Partial<SmtpSettings>;
    companyProfile: Partial<CompanyProfile>;
}>): Promise<SettingsResponse> {
    const response = await api.put("/settings", data);
    const raw = response.data;
    return raw?.data || raw;
}
