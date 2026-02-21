"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsSchema = void 0;
const zod_1 = require("zod");
exports.updateSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        companyName: zod_1.z.string().min(1).max(255).optional(),
        companyLogo: zod_1.z.string().url().optional().nullable(),
        timezone: zod_1.z.string().max(50).optional(),
        dateFormat: zod_1.z.string().max(20).optional(),
        currency: zod_1.z.string().length(3).optional(),
        language: zod_1.z.string().max(10).optional(),
        emailSettings: zod_1.z.object({
            senderName: zod_1.z.string().max(100).optional(),
            senderEmail: zod_1.z.string().email().optional(),
        }).optional(),
        notificationSettings: zod_1.z.object({
            emailNotifications: zod_1.z.boolean().optional(),
            pushNotifications: zod_1.z.boolean().optional(),
        }).optional(),
    }),
});
//# sourceMappingURL=settings.validators.js.map