import { z } from 'zod';
import { FORM_CRM_MAPPINGS, FORM_FIELD_TYPES } from './forms.dto';

const formStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const duplicateHandlingEnum = z.enum(['CREATE_NEW', 'UPDATE_EXISTING', 'IGNORE', 'FLAG_DUPLICATE']);
const submissionStatusEnum = z.enum(['RECEIVED', 'LEAD_CREATED', 'DUPLICATE', 'FAILED', 'DELETED']);
const fieldTypeEnum = z.enum(FORM_FIELD_TYPES);
const crmMappingEnum = z.enum(FORM_CRM_MAPPINGS);

const optionSchema = z.object({
  id: z.string().max(100).optional(),
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
});

const fieldSchema = z.object({
  id: z.string().min(1).max(100),
  type: fieldTypeEnum,
  label: z.string().min(1).max(200),
  internalName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, 'Use letters, numbers, dots, dashes, or underscores'),
  placeholder: z.string().max(250).optional().nullable(),
  helpText: z.string().max(500).optional().nullable(),
  required: z.boolean().optional().default(false),
  defaultValue: z.any().optional(),
  validationRules: z.record(z.any()).optional().default({}),
  width: z.enum(['FULL', 'HALF']).optional().default('FULL'),
  options: z.array(optionSchema).optional().default([]),
  crmMapping: crmMappingEnum.optional().nullable(),
  customFieldId: z.string().max(100).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

const formPayloadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  leadSourceId: z.string().uuid().optional().nullable(),
  thankYouMessage: z.string().min(1).max(1000).optional(),
  redirectUrl: z.string().url().optional().nullable(),
  fields: z.array(fieldSchema).max(80).optional(),
  settings: z.record(z.any()).optional(),
  spamProtection: z.record(z.any()).optional(),
  notificationEmails: z.array(z.string().email()).max(20).optional(),
  assignmentRules: z.record(z.any()).optional(),
  duplicateHandling: duplicateHandlingEnum.optional(),
  submissionLimit: z.number().int().min(1).optional().nullable(),
});

export const createFormSchema = z.object({
  body: formPayloadSchema,
}).passthrough();

export const updateFormSchema = z.object({
  body: formPayloadSchema.partial().extend({
    status: formStatusEnum.optional(),
  }),
}).passthrough();

export const formIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid form ID'),
  }),
}).passthrough();

export const submissionIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid form ID'),
    submissionId: z.string().uuid('Invalid submission ID'),
  }),
}).passthrough();

export const publicFormIdSchema = z.object({
  params: z.object({
    publicId: z.string().min(6).max(120),
  }),
}).passthrough();

export const formQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((value) => value ? parseInt(value, 10) : 1),
    limit: z.string().optional().transform((value) => value ? Math.min(parseInt(value, 10), 100) : 20),
    search: z.string().optional(),
    status: formStatusEnum.optional(),
  }),
}).passthrough();

export const submissionQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((value) => value ? parseInt(value, 10) : 1),
    limit: z.string().optional().transform((value) => value ? Math.min(parseInt(value, 10), 200) : 25),
    status: submissionStatusEnum.optional(),
  }),
}).passthrough();

export const publicSubmissionSchema = z.object({
  body: z.object({
    data: z.record(z.any()).optional().default({}),
    tracking: z.record(z.any()).optional().default({}),
    honeypot: z.string().optional().default(''),
    captchaToken: z.string().optional(),
  }).passthrough(),
}).passthrough();
