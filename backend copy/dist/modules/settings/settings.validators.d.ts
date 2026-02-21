import { z } from 'zod';
export declare const updateSettingsSchema: z.ZodObject<{
    body: z.ZodObject<{
        companyName: z.ZodOptional<z.ZodString>;
        companyLogo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        timezone: z.ZodOptional<z.ZodString>;
        dateFormat: z.ZodOptional<z.ZodString>;
        currency: z.ZodOptional<z.ZodString>;
        language: z.ZodOptional<z.ZodString>;
        emailSettings: z.ZodOptional<z.ZodObject<{
            senderName: z.ZodOptional<z.ZodString>;
            senderEmail: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            senderName?: string | undefined;
            senderEmail?: string | undefined;
        }, {
            senderName?: string | undefined;
            senderEmail?: string | undefined;
        }>>;
        notificationSettings: z.ZodOptional<z.ZodObject<{
            emailNotifications: z.ZodOptional<z.ZodBoolean>;
            pushNotifications: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            emailNotifications?: boolean | undefined;
            pushNotifications?: boolean | undefined;
        }, {
            emailNotifications?: boolean | undefined;
            pushNotifications?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        timezone?: string | undefined;
        dateFormat?: string | undefined;
        currency?: string | undefined;
        language?: string | undefined;
        notificationSettings?: {
            emailNotifications?: boolean | undefined;
            pushNotifications?: boolean | undefined;
        } | undefined;
        companyName?: string | undefined;
        companyLogo?: string | null | undefined;
        emailSettings?: {
            senderName?: string | undefined;
            senderEmail?: string | undefined;
        } | undefined;
    }, {
        timezone?: string | undefined;
        dateFormat?: string | undefined;
        currency?: string | undefined;
        language?: string | undefined;
        notificationSettings?: {
            emailNotifications?: boolean | undefined;
            pushNotifications?: boolean | undefined;
        } | undefined;
        companyName?: string | undefined;
        companyLogo?: string | null | undefined;
        emailSettings?: {
            senderName?: string | undefined;
            senderEmail?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        timezone?: string | undefined;
        dateFormat?: string | undefined;
        currency?: string | undefined;
        language?: string | undefined;
        notificationSettings?: {
            emailNotifications?: boolean | undefined;
            pushNotifications?: boolean | undefined;
        } | undefined;
        companyName?: string | undefined;
        companyLogo?: string | null | undefined;
        emailSettings?: {
            senderName?: string | undefined;
            senderEmail?: string | undefined;
        } | undefined;
    };
}, {
    body: {
        timezone?: string | undefined;
        dateFormat?: string | undefined;
        currency?: string | undefined;
        language?: string | undefined;
        notificationSettings?: {
            emailNotifications?: boolean | undefined;
            pushNotifications?: boolean | undefined;
        } | undefined;
        companyName?: string | undefined;
        companyLogo?: string | null | undefined;
        emailSettings?: {
            senderName?: string | undefined;
            senderEmail?: string | undefined;
        } | undefined;
    };
}>;
//# sourceMappingURL=settings.validators.d.ts.map