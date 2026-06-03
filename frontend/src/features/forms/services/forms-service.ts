import api from "@/lib/axios";

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "url"
  | "date"
  | "time"
  | "address"
  | "dropdown"
  | "radio"
  | "checkbox_group"
  | "multi_select"
  | "file_upload"
  | "hidden"
  | "section_heading"
  | "divider";

export type FormCrmMapping =
  | "fullName"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "companyName"
  | "website"
  | "address"
  | "notes"
  | "potentialValue";

export interface FormBuilderField {
  id: string;
  type: FormFieldType;
  label: string;
  internalName: string;
  placeholder?: string | null;
  helpText?: string | null;
  required?: boolean;
  defaultValue?: unknown;
  validationRules?: Record<string, unknown>;
  width?: "FULL" | "HALF";
  options?: Array<{ id?: string; label: string; value: string }>;
  crmMapping?: FormCrmMapping | null;
  customFieldId?: string | null;
  order?: number;
}

export interface FormBuilderForm {
  id: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  thankYouMessage: string;
  redirectUrl?: string | null;
  publicId: string;
  slug: string;
  fields: FormBuilderField[];
  settings: Record<string, unknown>;
  spamProtection: Record<string, unknown>;
  notificationEmails: string[];
  assignmentRules: Record<string, unknown>;
  duplicateHandling: "CREATE_NEW" | "UPDATE_EXISTING" | "IGNORE" | "FLAG_DUPLICATE";
  submissionLimit?: number | null;
  viewCount: number;
  submissionCount: number;
  conversionRate: number;
  leadSourceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  leadId?: string | null;
  status: string;
  submittedData: Record<string, unknown>;
  mappedLeadData: Record<string, unknown>;
  unmappedData: Record<string, unknown>;
  tracking: Record<string, unknown>;
  submittedAt: string;
  lead?: { id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null; companyName?: string | null } | null;
}

function unwrap<T>(response: any): T {
  return response.data?.data ?? response.data;
}

export async function getForms(params?: Record<string, unknown>) {
  const response = await api.get("/forms", { params });
  return response.data;
}

export async function getForm(id: string): Promise<FormBuilderForm> {
  return unwrap(await api.get(`/forms/${id}`));
}

export async function createForm(payload: Partial<FormBuilderForm>): Promise<FormBuilderForm> {
  return unwrap(await api.post("/forms", payload));
}

export async function updateForm(id: string, payload: Partial<FormBuilderForm>): Promise<FormBuilderForm> {
  return unwrap(await api.patch(`/forms/${id}`, payload));
}

export async function publishForm(id: string): Promise<FormBuilderForm> {
  return unwrap(await api.post(`/forms/${id}/publish`));
}

export async function archiveForm(id: string): Promise<FormBuilderForm> {
  return unwrap(await api.post(`/forms/${id}/archive`));
}

export async function duplicateForm(id: string): Promise<FormBuilderForm> {
  return unwrap(await api.post(`/forms/${id}/duplicate`));
}

export async function deleteForm(id: string): Promise<void> {
  await api.delete(`/forms/${id}`);
}

export async function getFormSubmissions(id: string, params?: Record<string, unknown>) {
  const response = await api.get(`/forms/${id}/submissions`, { params });
  return response.data;
}

export async function getFormAnalytics(id: string) {
  return unwrap(await api.get(`/forms/${id}/analytics`));
}

export async function getFormsSummary() {
  return unwrap(await api.get("/forms/analytics/summary"));
}

export function getFormExportUrl(id: string) {
  return `${api.defaults.baseURL}/forms/${id}/submissions/export`;
}

export async function getPublicForm(publicId: string) {
  return unwrap(await api.get(`/public/forms/${publicId}`));
}

export async function submitPublicForm(publicId: string, payload: Record<string, unknown>) {
  return unwrap(await api.post(`/public/forms/${publicId}/submit`, payload));
}

export async function recordPublicFormView(publicId: string) {
  return unwrap(await api.post(`/public/forms/${publicId}/view`));
}
