"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRepository = exports.SettingsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SettingsRepository {
    async findByTenantId(tenantId) {
        return prisma.setting.findFirst({ where: { tenantId } });
    }
    async upsert(tenantId, data) {
        return prisma.setting.upsert({
            where: { tenantId },
            update: {
                ...(data.companyName !== undefined && { companyName: data.companyName }),
                ...(data.companyLogo !== undefined && { companyLogo: data.companyLogo }),
                ...(data.timezone !== undefined && { timezone: data.timezone }),
                ...(data.dateFormat !== undefined && { dateFormat: data.dateFormat }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.language !== undefined && { language: data.language }),
                ...(data.emailSettings !== undefined && { emailSettings: data.emailSettings }),
                ...(data.notificationSettings !== undefined && { notificationSettings: data.notificationSettings }),
            },
            create: {
                tenantId,
                companyName: data.companyName || 'My Company',
                timezone: data.timezone || 'UTC',
                dateFormat: data.dateFormat || 'YYYY-MM-DD',
                currency: data.currency || 'USD',
                language: data.language || 'en',
                emailSettings: data.emailSettings || {},
                notificationSettings: data.notificationSettings || {},
            },
        });
    }
}
exports.SettingsRepository = SettingsRepository;
exports.settingsRepository = new SettingsRepository();
//# sourceMappingURL=settings.repository.js.map