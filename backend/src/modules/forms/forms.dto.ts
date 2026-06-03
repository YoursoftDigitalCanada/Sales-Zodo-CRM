import {
  FormBuilderDuplicateHandling,
  FormBuilderFormStatus,
  FormBuilderSubmissionStatus,
} from '@prisma/client';

export const FORM_FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'phone',
  'number',
  'url',
  'date',
  'time',
  'address',
  'dropdown',
  'radio',
  'checkbox_group',
  'multi_select',
  'file_upload',
  'hidden',
  'section_heading',
  'divider',
] as const;

export const FORM_CRM_MAPPINGS = [
  'fullName',
  'firstName',
  'lastName',
  'email',
  'phone',
  'companyName',
  'website',
  'address',
  'notes',
  'potentialValue',
] as const;

export type FormFieldType = typeof FORM_FIELD_TYPES[number];
export type FormCrmMapping = typeof FORM_CRM_MAPPINGS[number];

export interface FormBuilderFieldDto {
  id: string;
  type: FormFieldType;
  label: string;
  internalName: string;
  placeholder?: string | null;
  helpText?: string | null;
  required?: boolean;
  defaultValue?: unknown;
  validationRules?: Record<string, unknown>;
  width?: 'FULL' | 'HALF';
  options?: Array<{ id?: string; label: string; value: string }>;
  crmMapping?: FormCrmMapping | null;
  customFieldId?: string | null;
  order?: number;
}

export interface CreateFormDto {
  name: string;
  description?: string | null;
  leadSourceId?: string | null;
  thankYouMessage?: string;
  redirectUrl?: string | null;
  fields?: FormBuilderFieldDto[];
  settings?: Record<string, unknown>;
  spamProtection?: Record<string, unknown>;
  notificationEmails?: string[];
  assignmentRules?: Record<string, unknown>;
  duplicateHandling?: FormBuilderDuplicateHandling;
  submissionLimit?: number | null;
}

export interface UpdateFormDto extends Partial<CreateFormDto> {
  status?: FormBuilderFormStatus;
}

export interface FormQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: FormBuilderFormStatus;
}

export interface SubmissionQueryDto {
  page?: number;
  limit?: number;
  status?: FormBuilderSubmissionStatus;
}

export function toFormResponse(form: any) {
  return {
    id: form.id,
    tenantId: form.tenantId,
    leadSourceId: form.leadSourceId,
    name: form.name,
    description: form.description,
    status: form.status,
    thankYouMessage: form.thankYouMessage,
    redirectUrl: form.redirectUrl,
    slug: form.slug,
    publicId: form.publicId,
    fields: form.fields || [],
    settings: form.settings || {},
    spamProtection: form.spamProtection || {},
    notificationEmails: form.notificationEmails || [],
    assignmentRules: form.assignmentRules || {},
    duplicateHandling: form.duplicateHandling,
    submissionLimit: form.submissionLimit,
    viewCount: form.viewCount,
    submissionCount: form.submissionCount,
    conversionRate: Number(form.conversionRate || 0),
    createdById: form.createdById,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    archivedAt: form.archivedAt,
    leadSource: form.leadSource ? {
      id: form.leadSource.id,
      name: form.leadSource.name,
      sourceType: form.leadSource.sourceType,
    } : null,
  };
}

export function toSubmissionResponse(submission: any) {
  return {
    id: submission.id,
    tenantId: submission.tenantId,
    formId: submission.formId,
    leadId: submission.leadId,
    status: submission.status,
    submittedData: submission.submittedData || {},
    mappedLeadData: submission.mappedLeadData || {},
    unmappedData: submission.unmappedData || {},
    tracking: submission.tracking || {},
    spamScore: submission.spamScore === null || submission.spamScore === undefined ? null : Number(submission.spamScore),
    spamVerdict: submission.spamVerdict,
    ipAddressHash: submission.ipAddressHash,
    userAgent: submission.userAgent,
    referrerUrl: submission.referrerUrl,
    landingPageUrl: submission.landingPageUrl,
    submittedAt: submission.submittedAt,
    createdAt: submission.createdAt,
    lead: submission.lead ? {
      id: submission.lead.id,
      firstName: submission.lead.firstName,
      lastName: submission.lead.lastName,
      email: submission.lead.email,
      phone: submission.lead.phone,
      companyName: submission.lead.companyName,
    } : null,
  };
}
