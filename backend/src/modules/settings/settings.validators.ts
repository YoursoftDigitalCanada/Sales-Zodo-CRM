import { z } from 'zod';

export const updateSettingsSchema = z.object({
    body: z.object({
        companyName: z.string().min(1).max(255).optional(),
        companyLogo: z.string().url().optional().nullable(),
        timezone: z.string().max(50).optional(),
        dateFormat: z.string().max(20).optional(),
        currency: z.string().length(3).optional(),
        language: z.string().max(10).optional(),
        emailSettings: z.object({
            senderName: z.string().max(100).optional(),
            senderEmail: z.string().email().optional(),
        }).optional(),
        notificationSettings: z.object({
            emailNotifications: z.boolean().optional(),
            pushNotifications: z.boolean().optional(),
        }).optional(),
    }),
});
