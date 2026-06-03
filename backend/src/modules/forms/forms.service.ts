import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { slugify } from '../../common/utils/slugify';
import { leadsService } from '../leads/leads.service';
import { activityLogger } from '../../common/services/activity-logger.service';
import { logger } from '../../common/utils/logger';
import { CreateFormDto, FORM_CRM_MAPPINGS, FormBuilderFieldDto, FormQueryDto, SubmissionQueryDto, toFormResponse, toSubmissionResponse, UpdateFormDto } from './forms.dto';
import { formsRepository } from './forms.repository';

const HONEYPOT_VERDICT = 'HONEYPOT';
const RATE_LIMIT_VERDICT = 'RATE_LIMITED';
const OK_VERDICT = 'OK';
const PUBLIC_ORIGIN = process.env.FRONTEND_URL || process.env.APP_URL || 'https://sales.zodo.ca';
const API_ORIGIN = process.env.API_BASE_URL || 'https://salesapi.zodo.ca';

type TrackingInput = Record<string, unknown>;

export class FormsService {
  async create(tenantId: string, data: CreateFormDto, employeeId?: string) {
    await this.validateLeadSource(tenantId, data.leadSourceId);
    const slug = await this.uniqueSlug(tenantId, data.name);
    const form = await formsRepository.create(tenantId, {
      ...data,
      slug,
      publicId: this.createPublicId(data.name),
      createdById: employeeId || null,
      fields: this.normalizeFields(data.fields || this.defaultFields()),
    });
    await this.log(tenantId, employeeId, 'CREATE', form.id, `Created form "${form.name}"`);
    return toFormResponse(form);
  }

  async getMany(tenantId: string, query: FormQueryDto) {
    const result = await formsRepository.findMany(tenantId, query);
    return {
      data: result.data.map(toFormResponse),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async getById(tenantId: string, id: string) {
    const form = await formsRepository.findById(id, tenantId);
    if (!form) throw new NotFoundError('Form not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return toFormResponse(form);
  }

  async update(tenantId: string, id: string, data: UpdateFormDto, employeeId?: string) {
    const existing = await formsRepository.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Form not found', ErrorCodes.RESOURCE_NOT_FOUND);
    await this.validateLeadSource(tenantId, data.leadSourceId);

    const updateData: Record<string, unknown> = {};
    for (const key of [
      'name', 'description', 'leadSourceId', 'thankYouMessage', 'redirectUrl', 'settings',
      'spamProtection', 'notificationEmails', 'assignmentRules', 'duplicateHandling',
      'submissionLimit', 'status',
    ]) {
      if ((data as any)[key] !== undefined) updateData[key] = (data as any)[key];
    }
    if (data.fields !== undefined) updateData.fields = this.normalizeFields(data.fields);
    if (data.name && data.name !== existing.name) updateData.slug = await this.uniqueSlug(tenantId, data.name, id);

    const form = await formsRepository.update(id, tenantId, updateData as any);
    await this.log(tenantId, employeeId, 'UPDATE', form.id, `Updated form "${form.name}"`);
    return toFormResponse(form);
  }

  async duplicate(tenantId: string, id: string, employeeId?: string) {
    const existing = await formsRepository.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Form not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return this.create(tenantId, {
      name: `${existing.name} Copy`,
      description: existing.description,
      leadSourceId: existing.leadSourceId,
      thankYouMessage: existing.thankYouMessage,
      redirectUrl: existing.redirectUrl,
      fields: existing.fields as any,
      settings: existing.settings as any,
      spamProtection: existing.spamProtection as any,
      notificationEmails: existing.notificationEmails as any,
      assignmentRules: existing.assignmentRules as any,
      duplicateHandling: existing.duplicateHandling,
      submissionLimit: existing.submissionLimit,
    }, employeeId);
  }

  async publish(tenantId: string, id: string, employeeId?: string) {
    const existing = await formsRepository.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Form not found', ErrorCodes.RESOURCE_NOT_FOUND);
    if (!Array.isArray(existing.fields) || !existing.fields.length) {
      throw new BadRequestError('Add at least one form field before publishing.', ErrorCodes.VALIDATION_FAILED);
    }
    const form = await formsRepository.update(id, tenantId, { status: 'PUBLISHED' } as any);
    await this.log(tenantId, employeeId, 'UPDATE', form.id, `Published form "${form.name}"`);
    return toFormResponse(form);
  }

  async archive(tenantId: string, id: string, employeeId?: string) {
    const form = await formsRepository.update(id, tenantId, { status: 'ARCHIVED', archivedAt: new Date() } as any);
    await this.log(tenantId, employeeId, 'UPDATE', form.id, `Archived form "${form.name}"`);
    return toFormResponse(form);
  }

  async delete(tenantId: string, id: string, employeeId?: string) {
    const existing = await formsRepository.findById(id, tenantId);
    if (!existing) throw new NotFoundError('Form not found', ErrorCodes.RESOURCE_NOT_FOUND);
    await formsRepository.softDelete(id, tenantId);
    await this.log(tenantId, employeeId, 'DELETE', id, `Deleted form "${existing.name}"`);
  }

  async publicForm(publicId: string) {
    const form = await this.getPublicFormRecord(publicId);
    return this.toPublicForm(form);
  }

  async recordView(publicId: string) {
    const form = await this.getPublicFormRecord(publicId);
    const updated = await prisma.formBuilderForm.update({
      where: { id_tenantId: { id: form.id, tenantId: form.tenantId } },
      data: { viewCount: { increment: 1 } },
    });
    return { viewCount: updated.viewCount };
  }

  async submitPublic(publicId: string, input: { data: Record<string, unknown>; tracking?: TrackingInput; honeypot?: string }, meta: { ip?: string; userAgent?: string; referrerUrl?: string; landingPageUrl?: string }) {
    const form = await this.getPublicFormRecord(publicId);
    const fields = this.normalizeFields((form.fields || []) as any);
    const submittedData = this.sanitizeSubmittedData(input.data || {});
    const tracking = this.normalizeTracking(input.tracking || {}, meta);
    const ipAddressHash = meta.ip ? this.hashIp(meta.ip) : null;

    if (input.honeypot) {
      return this.createSpamSubmission(form, submittedData, tracking, meta, ipAddressHash, HONEYPOT_VERDICT);
    }
    await this.enforceRateLimit(form.id, ipAddressHash);
    this.validateRequiredFields(fields, submittedData);

    const { mappedLeadData, unmappedData } = this.mapSubmission(fields, submittedData);
    const submission = await prisma.formBuilderSubmission.create({
      data: {
        tenantId: form.tenantId,
        formId: form.id,
        submittedData: submittedData as Prisma.InputJsonValue,
        mappedLeadData: mappedLeadData as Prisma.InputJsonValue,
        unmappedData: unmappedData as Prisma.InputJsonValue,
        tracking: tracking as Prisma.InputJsonValue,
        spamScore: new Prisma.Decimal(0),
        spamVerdict: OK_VERDICT,
        ipAddressHash,
        userAgent: meta.userAgent || null,
        referrerUrl: meta.referrerUrl || this.asString(tracking.referrerUrl) || null,
        landingPageUrl: meta.landingPageUrl || this.asString(tracking.landingPageUrl) || null,
      },
    });

    const leadResult = await this.createLeadFromSubmission(form, submission.id, mappedLeadData, unmappedData, tracking);
    const updatedSubmission = await prisma.formBuilderSubmission.update({
      where: { id: submission.id },
      data: {
        leadId: leadResult.leadId,
        status: leadResult.status,
      },
      include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, companyName: true } } },
    });

    await this.updateCounters(form.id, form.tenantId);
    this.sendNotifications(form, updatedSubmission).catch((error) => {
      logger.warn('[Forms] Notification delivery failed', { formId: form.id, error: error?.message });
    });

    return {
      success: true,
      status: updatedSubmission.status,
      leadId: updatedSubmission.leadId,
      thankYouMessage: form.thankYouMessage,
      redirectUrl: form.redirectUrl,
      submissionId: updatedSubmission.id,
    };
  }

  async listSubmissions(tenantId: string, formId: string, query: SubmissionQueryDto) {
    await this.assertForm(tenantId, formId);
    const result = await formsRepository.listSubmissions(formId, tenantId, query);
    return {
      data: result.data.map(toSubmissionResponse),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async getSubmission(tenantId: string, formId: string, submissionId: string) {
    const submission = await formsRepository.findSubmission(formId, submissionId, tenantId);
    if (!submission) throw new NotFoundError('Submission not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return toSubmissionResponse(submission);
  }

  async deleteSubmission(tenantId: string, formId: string, submissionId: string) {
    await this.assertForm(tenantId, formId);
    const submission = await formsRepository.findSubmission(formId, submissionId, tenantId);
    if (!submission) throw new NotFoundError('Submission not found', ErrorCodes.RESOURCE_NOT_FOUND);
    await prisma.formBuilderSubmission.update({
      where: { id: submissionId },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
    await this.updateCounters(formId, tenantId);
  }

  async analytics(tenantId: string, formId: string) {
    const form = await this.assertForm(tenantId, formId);
    const [byStatus, recent] = await Promise.all([
      prisma.formBuilderSubmission.groupBy({
        by: ['status'],
        where: { tenantId, formId, deletedAt: null },
        _count: true,
      }),
      prisma.formBuilderSubmission.findMany({
        where: { tenantId, formId, deletedAt: null },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        include: { lead: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
    ]);
    return {
      form: toFormResponse(form),
      byStatus: byStatus.map((item) => ({ status: item.status, count: item._count })),
      recent: recent.map(toSubmissionResponse),
    };
  }

  async summary(tenantId: string) {
    const [forms, submissions, topForms] = await Promise.all([
      prisma.formBuilderForm.count({ where: { tenantId, deletedAt: null } }),
      prisma.formBuilderSubmission.count({ where: { tenantId, deletedAt: null } }),
      prisma.formBuilderForm.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: [{ submissionCount: 'desc' }, { viewCount: 'desc' }],
        take: 5,
      }),
    ]);
    return {
      forms,
      submissions,
      topForms: topForms.map(toFormResponse),
    };
  }

  async exportCsv(tenantId: string, formId: string) {
    await this.assertForm(tenantId, formId);
    const submissions = await prisma.formBuilderSubmission.findMany({
      where: { tenantId, formId, deletedAt: null },
      include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    const headers = ['Submission ID', 'Submitted At', 'Status', 'Lead ID', 'Lead Name', 'Email', 'Phone', 'Submitted Data'];
    const rows = submissions.map((submission) => [
      submission.id,
      submission.submittedAt.toISOString(),
      submission.status,
      submission.leadId || '',
      submission.lead ? `${submission.lead.firstName} ${submission.lead.lastName}`.trim() : '',
      submission.lead?.email || '',
      submission.lead?.phone || '',
      JSON.stringify(submission.submittedData || {}),
    ]);
    return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  embedJs(publicId: string) {
    const formUrl = `${PUBLIC_ORIGIN.replace(/\/$/, '')}/forms/${encodeURIComponent(publicId)}`;
    return `(function(){var s=document.currentScript;var c=document.createElement('iframe');c.src=${JSON.stringify(formUrl)};c.style.width='100%';c.style.border='0';c.style.minHeight='620px';c.loading='lazy';c.title='Lead capture form';(s&&s.parentNode?s.parentNode:document.body).insertBefore(c,s? s.nextSibling:null);})();`;
  }

  private async validateLeadSource(tenantId: string, leadSourceId?: string | null) {
    if (!leadSourceId) return;
    const exists = await prisma.leadSource.findFirst({ where: { id: leadSourceId, tenantId }, select: { id: true } });
    if (!exists) throw new BadRequestError('Lead source not found', ErrorCodes.RESOURCE_NOT_FOUND);
  }

  private async assertForm(tenantId: string, formId: string) {
    const form = await formsRepository.findById(formId, tenantId);
    if (!form) throw new NotFoundError('Form not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return form;
  }

  private async getPublicFormRecord(publicId: string) {
    const form = await formsRepository.findByPublicId(publicId);
    if (!form || form.deletedAt || form.status !== 'PUBLISHED') {
      throw new NotFoundError('Form not found', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    if (form.submissionLimit !== null && form.submissionCount >= form.submissionLimit) {
      throw new ForbiddenError('This form is no longer accepting submissions.', ErrorCodes.TENANT_ACCESS_DENIED);
    }
    return form;
  }

  private toPublicForm(form: any) {
    return {
      publicId: form.publicId,
      name: form.name,
      description: form.description,
      thankYouMessage: form.thankYouMessage,
      redirectUrl: form.redirectUrl,
      fields: (form.fields || []).filter((field: any) => field.type !== 'hidden' || field.defaultValue !== undefined),
      settings: form.settings || {},
    };
  }

  private normalizeFields(fields: FormBuilderFieldDto[]) {
    return fields
      .map((field, index) => ({
        id: field.id || crypto.randomUUID(),
        type: field.type,
        label: field.label,
        internalName: field.internalName,
        placeholder: field.placeholder || null,
        helpText: field.helpText || null,
        required: Boolean(field.required),
        defaultValue: field.defaultValue,
        validationRules: field.validationRules || {},
        width: field.width || 'FULL',
        options: Array.isArray(field.options) ? field.options : [],
        crmMapping: field.crmMapping && FORM_CRM_MAPPINGS.includes(field.crmMapping as any) ? field.crmMapping : null,
        customFieldId: field.customFieldId || null,
        order: field.order ?? index,
      }))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  private defaultFields(): FormBuilderFieldDto[] {
    return [
      { id: 'full-name', type: 'text', label: 'Full Name', internalName: 'full_name', required: true, crmMapping: 'fullName', width: 'FULL', order: 0 },
      { id: 'email', type: 'email', label: 'Email', internalName: 'email', required: true, crmMapping: 'email', width: 'HALF', order: 1 },
      { id: 'phone', type: 'phone', label: 'Phone', internalName: 'phone', required: false, crmMapping: 'phone', width: 'HALF', order: 2 },
      { id: 'company', type: 'text', label: 'Company', internalName: 'company', required: false, crmMapping: 'companyName', width: 'FULL', order: 3 },
      { id: 'message', type: 'textarea', label: 'Message', internalName: 'message', required: false, crmMapping: 'notes', width: 'FULL', order: 4 },
    ];
  }

  private sanitizeSubmittedData(input: Record<string, unknown>) {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (key.length > 120) continue;
      if (typeof value === 'string') output[key] = value.slice(0, 5000);
      else if (Array.isArray(value)) output[key] = value.slice(0, 100);
      else if (typeof value === 'number' || typeof value === 'boolean' || value === null) output[key] = value;
      else output[key] = String(value ?? '').slice(0, 5000);
    }
    return output;
  }

  private validateRequiredFields(fields: FormBuilderFieldDto[], data: Record<string, unknown>) {
    const missing = fields
      .filter((field) => field.required && !['section_heading', 'divider'].includes(field.type))
      .filter((field) => {
        const value = data[field.internalName] ?? data[field.id];
        return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
      })
      .map((field) => field.label);
    if (missing.length) {
      throw new BadRequestError(`Missing required fields: ${missing.join(', ')}`, ErrorCodes.VALIDATION_FAILED);
    }
  }

  private mapSubmission(fields: FormBuilderFieldDto[], data: Record<string, unknown>) {
    const mappedLeadData: Record<string, unknown> = {};
    const unmappedData: Record<string, unknown> = {};
    for (const field of fields) {
      if (['section_heading', 'divider'].includes(field.type)) continue;
      const value = data[field.internalName] ?? data[field.id] ?? field.defaultValue;
      if (value === undefined || value === null || value === '') continue;
      if (field.crmMapping) mappedLeadData[field.crmMapping] = value;
      else unmappedData[field.internalName] = value;
    }
    return { mappedLeadData, unmappedData };
  }

  private async createLeadFromSubmission(form: any, submissionId: string, mapped: Record<string, unknown>, unmapped: Record<string, unknown>, tracking: Record<string, unknown>) {
    const duplicate = await this.findDuplicateLead(form.tenantId, mapped);
    if (duplicate) {
      if (form.duplicateHandling === 'IGNORE') return { status: 'DUPLICATE' as const, leadId: duplicate.id };
      if (form.duplicateHandling === 'UPDATE_EXISTING') {
        const notes = [duplicate.notes, this.buildSubmissionNote(submissionId, mapped, unmapped)].filter(Boolean).join('\n\n');
        await prisma.lead.update({ where: { id: duplicate.id }, data: { notes } });
        return { status: 'DUPLICATE' as const, leadId: duplicate.id };
      }
      if (form.duplicateHandling === 'FLAG_DUPLICATE') {
        mapped.notes = [mapped.notes, `Potential duplicate of lead ${duplicate.leadNumber || duplicate.id}`].filter(Boolean).join('\n');
      }
    }

    const names = this.extractNames(mapped);
    const createPayload: any = {
      firstName: names.firstName,
      lastName: names.lastName,
      email: this.asString(mapped.email) || undefined,
      phone: this.asString(mapped.phone) || undefined,
      companyName: this.asString(mapped.companyName) || undefined,
      website: this.asString(mapped.website) || undefined,
      location: this.asString(mapped.address) || undefined,
      notes: this.buildSubmissionNote(submissionId, mapped, unmapped),
      potentialValue: this.toNumber(mapped.potentialValue) ?? undefined,
      leadSourceId: form.leadSourceId || undefined,
      leadSourceUTM: this.asString(tracking.utm_source) || form.name,
      leadCampaignUTM: this.asString(tracking.utm_campaign) || undefined,
      leadMediumUTM: this.asString(tracking.utm_medium) || undefined,
      landingPageURL: this.asString(tracking.landingPageUrl) || undefined,
    };
    const lead = await leadsService.create(form.tenantId, createPayload, undefined, undefined, { skipDuplicateCheck: true });
    return { status: 'LEAD_CREATED' as const, leadId: lead.id };
  }

  private async findDuplicateLead(tenantId: string, mapped: Record<string, unknown>) {
    const email = this.asString(mapped.email);
    const phone = this.asString(mapped.phone);
    if (!email && !phone) return null;
    return prisma.lead.findFirst({
      where: {
        tenantId,
        OR: [
          ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true, leadNumber: true, notes: true },
    });
  }

  private extractNames(mapped: Record<string, unknown>) {
    const fullName = this.asString(mapped.fullName);
    let firstName = this.asString(mapped.firstName);
    let lastName = this.asString(mapped.lastName);
    if ((!firstName || !lastName) && fullName) {
      const [first, ...rest] = fullName.split(/\s+/).filter(Boolean);
      firstName ||= first;
      lastName ||= rest.join(' ');
    }
    if (!firstName && mapped.email) firstName = this.asString(mapped.email).split('@')[0];
    return { firstName: firstName || 'Unknown', lastName: lastName || 'Lead' };
  }

  private buildSubmissionNote(submissionId: string, mapped: Record<string, unknown>, unmapped: Record<string, unknown>) {
    return [
      this.asString(mapped.notes),
      `Form submission ID: ${submissionId}`,
      Object.keys(unmapped).length ? `Additional form data: ${JSON.stringify(unmapped)}` : null,
    ].filter(Boolean).join('\n');
  }

  private async createSpamSubmission(form: any, data: Record<string, unknown>, tracking: Record<string, unknown>, meta: any, ipAddressHash: string | null, verdict: string) {
    const submission = await prisma.formBuilderSubmission.create({
      data: {
        tenantId: form.tenantId,
        formId: form.id,
        status: 'FAILED',
        submittedData: data as Prisma.InputJsonValue,
        tracking: tracking as Prisma.InputJsonValue,
        spamScore: new Prisma.Decimal(100),
        spamVerdict: verdict,
        ipAddressHash,
        userAgent: meta.userAgent || null,
        referrerUrl: meta.referrerUrl || null,
        landingPageUrl: meta.landingPageUrl || null,
      },
    });
    await this.updateCounters(form.id, form.tenantId);
    return { success: false, status: submission.status, message: 'Submission rejected.' };
  }

  private async enforceRateLimit(formId: string, ipAddressHash: string | null) {
    if (!ipAddressHash) return;
    const recent = await prisma.formBuilderSubmission.count({
      where: {
        formId,
        ipAddressHash,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recent >= 5) {
      throw new ForbiddenError('Too many submissions. Please try again later.', ErrorCodes.AUTH_OTP_RATE_LIMITED);
    }
  }

  private normalizeTracking(input: TrackingInput, meta: any) {
    return {
      utm_source: this.asString(input.utm_source),
      utm_medium: this.asString(input.utm_medium),
      utm_campaign: this.asString(input.utm_campaign),
      utm_term: this.asString(input.utm_term),
      utm_content: this.asString(input.utm_content),
      referrerUrl: meta.referrerUrl || this.asString(input.referrerUrl),
      landingPageUrl: meta.landingPageUrl || this.asString(input.landingPageUrl),
      submittedAt: new Date().toISOString(),
    };
  }

  private hashIp(ip: string) {
    return crypto.createHash('sha256').update(`${ip}:${process.env.JWT_SECRET || 'sales-crm'}`).digest('hex');
  }

  private async updateCounters(formId: string, tenantId: string) {
    const [total, leadCreated, form] = await Promise.all([
      prisma.formBuilderSubmission.count({ where: { formId, tenantId, deletedAt: null } }),
      prisma.formBuilderSubmission.count({ where: { formId, tenantId, deletedAt: null, status: 'LEAD_CREATED' } }),
      prisma.formBuilderForm.findFirst({ where: { id: formId, tenantId }, select: { viewCount: true } }),
    ]);
    const conversionRate = form?.viewCount ? (total / form.viewCount) * 100 : 0;
    await prisma.formBuilderForm.update({
      where: { id_tenantId: { id: formId, tenantId } },
      data: {
        submissionCount: total,
        conversionRate: new Prisma.Decimal(conversionRate.toFixed(4)),
      },
    });
  }

  private async uniqueSlug(tenantId: string, name: string, excludeId?: string) {
    const base = slugify(name) || 'form';
    let slug = base;
    let suffix = 1;
    while (await prisma.formBuilderForm.findFirst({ where: { tenantId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }

  private createPublicId(name: string) {
    return `${slugify(name) || 'form'}-${crypto.randomBytes(6).toString('hex')}`;
  }

  private async sendNotifications(form: any, submission: any) {
    const emails = Array.isArray(form.notificationEmails) ? form.notificationEmails : [];
    if (!emails.length) return;
    logger.info('[Forms] Submission notification queued', { formId: form.id, submissionId: submission.id, recipients: emails.length });
  }

  private async log(tenantId: string, employeeId: string | undefined, action: string, entityId: string, description: string) {
    await activityLogger.log({
      tenantId,
      userId: employeeId,
      action,
      module: 'forms',
      entityType: 'FormBuilderForm',
      entityId,
      description,
    } as any).catch(() => undefined);
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : value === null || value === undefined ? '' : String(value).trim();
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}

export const formsService = new FormsService();
