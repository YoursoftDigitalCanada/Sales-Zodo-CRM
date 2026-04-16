import { z } from 'zod';

const dateFormatSchema = z.enum([
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'MM-DD-YYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
]);

const themeSchema = z.enum(['light', 'dark']);
const encryptionSchema = z.enum(['SSL/TLS', 'STARTTLS', 'NONE']);
const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CNY']);
const templateIdSchema = z.enum(['TEAM_INVITE', 'WELCOME', 'INVOICE_REMINDER']);
const billingPlanSchema = z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']);
const billingCycleSchema = z.enum(['MONTHLY', 'YEARLY']);

export const updateGeneralSchema = z.object({
  body: z.object({
    organizationName: z.string().min(1).max(255).optional(),
    language: z.string().min(2).max(16).optional(),
    timezone: z.string().min(2).max(64).optional(),
    currency: currencySchema.optional(),
    dateFormat: dateFormatSchema.optional(),
    theme: themeSchema.optional(),
  }),
});

export const updateCompanySchema = z.object({
  body: z.object({
    companyName: z.string().min(1).max(255).optional(),
    domain: z.string().max(255).optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(50).optional().or(z.literal('')),
    taxId: z.string().max(100).optional().or(z.literal('')),
    address: z.string().max(500).optional().or(z.literal('')),
  }),
});

export const updateNotificationSettingsSchema = z.object({
  body: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    desktopNotifications: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    productUpdates: z.boolean().optional(),
  }),
});

export const updateBillingSchema = z.object({
  body: z.object({
    planType: billingPlanSchema,
    billingCycle: billingCycleSchema,
  }),
});

export const updateSecuritySettingsSchema = z.object({
  body: z.object({
    enforce2FA: z.boolean().optional(),
    passwordMinLength: z.number().int().min(8).max(128).optional(),
    sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
    ipWhitelist: z.array(z.string().min(3).max(100)).max(100).optional(),
  }),
});

export const updateSmtpSettingsSchema = z.object({
  body: z.object({
    host: z.string().max(255).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    username: z.string().max(255).optional(),
    password: z.string().max(255).optional(),
    encryption: encryptionSchema.optional(),
    senderName: z.string().max(100).optional(),
    senderEmail: z.string().email().optional().or(z.literal('')),
    signature: z.string().max(5000).optional().or(z.literal('')),
  }),
});

export const updateImapSettingsSchema = z.object({
  body: z.object({
    host: z.string().max(255).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    username: z.string().max(255).optional(),
    password: z.string().max(255).optional(),
    encryption: encryptionSchema.optional(),
  }),
});

export const sendTestEmailSchema = z.object({
  body: z.object({
    toEmail: z.string().email(),
  }),
});

export const updateEmailTemplatesSchema = z.object({
  body: z.object({
    templates: z.array(
      z.object({
        id: templateIdSchema,
        subject: z.string().max(500).optional(),
        bodyHtml: z.string().max(25000).optional(),
        bodyText: z.string().max(25000).optional(),
      })
    ).min(1),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    general: updateGeneralSchema.shape.body.optional(),
    company: updateCompanySchema.shape.body.optional(),
    notifications: updateNotificationSettingsSchema.shape.body.optional(),
    security: updateSecuritySettingsSchema.shape.body.optional(),
    smtp: updateSmtpSettingsSchema.shape.body.optional(),
    imap: updateImapSettingsSchema.shape.body.optional(),
    templates: updateEmailTemplatesSchema.shape.body.shape.templates.optional(),
  }),
});
