import { Setting } from '@prisma/client';
export interface UpdateSettingsDto {
    companyName?: string;
    companyLogo?: string | null;
    timezone?: string;
    dateFormat?: string;
    currency?: string;
    language?: string;
    emailSettings?: {
        senderName?: string;
        senderEmail?: string;
    };
    notificationSettings?: {
        emailNotifications?: boolean;
        pushNotifications?: boolean;
    };
}
export interface SettingsResponseDto {
    id: string;
    companyName: string;
    companyLogo: string | null;
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
    emailSettings: Record<string, unknown>;
    notificationSettings: Record<string, unknown>;
    updatedAt: Date;
}
export declare function toSettingsResponseDto(s: Setting): SettingsResponseDto;
//# sourceMappingURL=settings.dto.d.ts.map