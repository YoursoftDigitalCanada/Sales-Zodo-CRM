import { z } from 'zod';

export const updateSettingsSchema = z.object({
    body: z.object({
        // General
        timezone: z.string().max(50).optional(),
        dateFormat: z.string().max(20).optional(),
        timeFormat: z.string().max(10).optional(),
        currency: z.string().length(3).optional(),
        language: z.string().max(10).optional(),
        darkMode: z.boolean().optional(),

        // Invoice
        fiscalYearStart: z.number().int().min(1).max(12).optional(),
        invoicePrefix: z.string().max(20).optional(),
        invoiceNextNumber: z.number().int().min(1).optional(),
        invoiceTerms: z.string().max(2000).optional().nullable(),
        invoiceNotes: z.string().max(2000).optional().nullable(),

        // Email signature
        emailSignature: z.string().max(2000).optional().nullable(),

        // Notification preferences
        notificationSettings: z.object({
            email: z.boolean().optional(),
            push: z.boolean().optional(),
            desktop: z.boolean().optional(),
            weekly: z.boolean().optional(),
            marketing: z.boolean().optional(),
        }).optional(),

        // SMTP configuration
        smtpSettings: z.object({
            smtpHost: z.string().max(255).optional(),
            smtpPort: z.number().int().min(1).max(65535).optional(),
            smtpUser: z.string().max(255).optional(),
            smtpPass: z.string().max(255).optional(),
            senderName: z.string().max(100).optional(),
            senderEmail: z.string().email().optional().or(z.literal('')),
        }).optional(),

        // Company profile
        companyProfile: z.object({
            companyName: z.string().max(255).optional(),
            companyDomain: z.string().max(255).optional(),
            companyEmail: z.string().email().optional().or(z.literal('')),
            companyPhone: z.string().max(30).optional(),
            companyAddress: z.string().max(500).optional(),
            taxId: z.string().max(50).optional(),
        }).optional(),
    }),
});
