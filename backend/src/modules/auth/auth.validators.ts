import { z } from 'zod';
import { SIGNUP_COMPANY_TYPES, SIGNUP_PLANS } from './signup-access';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    tenantName: z.string().min(2).max(100).optional(),
    tenantSlug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
      .optional(),
  }),
});

export const signupOtpSendSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    channel: z.literal('email').default('email'),
  }),
});

export const signupOtpVerifySchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    channel: z.literal('email').default('email'),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
});

export const signupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Full name is required').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    companyName: z.string().trim().min(2, 'Company name is required').max(120),
    companyType: z.enum(SIGNUP_COMPANY_TYPES),
    phone: z.string().trim().min(6, 'Phone number is required').max(30),
    country: z.string().trim().min(2, 'Country is required').max(80),
    plan: z.enum(SIGNUP_PLANS).default('standard'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type SignupOtpSendInput = z.infer<typeof signupOtpSendSchema>['body'];
export type SignupOtpVerifyInput = z.infer<typeof signupOtpVerifySchema>['body'];
export type SignupInput = z.infer<typeof signupSchema>['body'];
