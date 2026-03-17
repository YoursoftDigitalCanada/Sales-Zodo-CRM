import { PrismaClient, Prisma } from '@prisma/client';
import { UpdateSettingsDto } from './settings.dto';

const prisma = new PrismaClient();

export class SettingsRepository {
    async findByTenantId(tenantId: string) {
        return prisma.tenantSettings.findUnique({ where: { tenantId } });
    }

    async upsert(tenantId: string, data: UpdateSettingsDto) {
        // Build the integrations JSON by merging with existing
        const existing = await this.findByTenantId(tenantId);
        const existingIntegrations = (existing?.integrations as Record<string, any>) || {};

        // Merge SMTP settings
        const smtpUpdates: Record<string, any> = {};
        if (data.smtpSettings) {
            if (data.smtpSettings.smtpHost !== undefined) smtpUpdates.smtpHost = data.smtpSettings.smtpHost;
            if (data.smtpSettings.smtpPort !== undefined) smtpUpdates.smtpPort = data.smtpSettings.smtpPort;
            if (data.smtpSettings.smtpUser !== undefined) smtpUpdates.smtpUser = data.smtpSettings.smtpUser;
            // Only update password if it's not the masked placeholder
            if (data.smtpSettings.smtpPass !== undefined && data.smtpSettings.smtpPass !== '••••••••') {
                smtpUpdates.smtpPass = data.smtpSettings.smtpPass;
            }
            if (data.smtpSettings.senderName !== undefined) smtpUpdates.senderName = data.smtpSettings.senderName;
            if (data.smtpSettings.senderEmail !== undefined) smtpUpdates.senderEmail = data.smtpSettings.senderEmail;
        }

        // Merge company profile
        const companyUpdates: Record<string, any> = {};
        if (data.companyProfile) {
            if (data.companyProfile.companyName !== undefined) companyUpdates.companyName = data.companyProfile.companyName;
            if (data.companyProfile.companyDomain !== undefined) companyUpdates.companyDomain = data.companyProfile.companyDomain;
            if (data.companyProfile.companyEmail !== undefined) companyUpdates.companyEmail = data.companyProfile.companyEmail;
            if (data.companyProfile.companyPhone !== undefined) companyUpdates.companyPhone = data.companyProfile.companyPhone;
            if (data.companyProfile.companyAddress !== undefined) companyUpdates.companyAddress = data.companyProfile.companyAddress;
            if (data.companyProfile.taxId !== undefined) companyUpdates.taxId = data.companyProfile.taxId;
        }

        // Dark mode
        const darkModeUpdate = data.darkMode !== undefined ? { darkMode: data.darkMode } : {};

        const mergedIntegrations = {
            ...existingIntegrations,
            ...smtpUpdates,
            ...companyUpdates,
            ...darkModeUpdate,
        };

        const updateData: Record<string, any> = {
            ...(data.timezone !== undefined && { timezone: data.timezone }),
            ...(data.dateFormat !== undefined && { dateFormat: data.dateFormat }),
            ...(data.timeFormat !== undefined && { timeFormat: data.timeFormat }),
            ...(data.currency !== undefined && { currency: data.currency }),
            ...(data.language !== undefined && { language: data.language }),
            ...(data.fiscalYearStart !== undefined && { fiscalYearStart: data.fiscalYearStart }),
            ...(data.invoicePrefix !== undefined && { invoicePrefix: data.invoicePrefix }),
            ...(data.invoiceNextNumber !== undefined && { invoiceNextNumber: data.invoiceNextNumber }),
            ...(data.invoiceTerms !== undefined && { invoiceTerms: data.invoiceTerms }),
            ...(data.invoiceNotes !== undefined && { invoiceNotes: data.invoiceNotes }),
            ...(data.emailSignature !== undefined && { emailSignature: data.emailSignature }),
            ...(data.notificationSettings !== undefined && { notificationSettings: data.notificationSettings as Prisma.InputJsonValue }),
            integrations: mergedIntegrations as Prisma.InputJsonValue,
        };

        return prisma.tenantSettings.upsert({
            where: { tenantId },
            update: updateData,
            create: {
                tenantId,
                timezone: data.timezone || 'UTC',
                dateFormat: data.dateFormat || 'YYYY-MM-DD',
                timeFormat: data.timeFormat || 'HH:mm',
                currency: data.currency || 'USD',
                language: data.language || 'en',
                notificationSettings: (data.notificationSettings || {}) as Prisma.InputJsonValue,
                integrations: mergedIntegrations as Prisma.InputJsonValue,
            },
        });
    }

    /**
     * Get raw SMTP credentials (unmasked) for email sending.
     */
    async getSmtpConfig(tenantId: string) {
        const settings = await this.findByTenantId(tenantId);
        if (!settings) return null;
        const integrations = (settings.integrations as Record<string, any>) || {};
        return {
            host: integrations.smtpHost || '',
            port: integrations.smtpPort || 587,
            user: integrations.smtpUser || '',
            pass: integrations.smtpPass || '',
            senderName: integrations.senderName || 'ZODO CRM',
            senderEmail: integrations.senderEmail || '',
        };
    }
}

export const settingsRepository = new SettingsRepository();
