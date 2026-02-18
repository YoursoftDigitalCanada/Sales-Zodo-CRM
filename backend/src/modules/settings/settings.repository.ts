import { PrismaClient } from '@prisma/client';
import { UpdateSettingsDto } from './settings.dto';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class SettingsRepository {
    async findByTenantId(tenantId: string) {
        return prisma.tenantSettings.findUnique({ where: { tenantId } });
    }

    async upsert(tenantId: string, data: UpdateSettingsDto) {
        return prisma.tenantSettings.upsert({
            where: { tenantId },
            update: {
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
            },
            create: {
                tenantId,
                timezone: data.timezone || 'UTC',
                dateFormat: data.dateFormat || 'YYYY-MM-DD',
                timeFormat: data.timeFormat || 'HH:mm',
                currency: data.currency || 'USD',
                language: data.language || 'en',
                notificationSettings: (data.notificationSettings || {}) as Prisma.InputJsonValue,
            },
        });
    }
}

export const settingsRepository = new SettingsRepository();
