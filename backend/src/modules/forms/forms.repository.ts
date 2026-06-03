import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateFormDto, FormQueryDto, SubmissionQueryDto, UpdateFormDto } from './forms.dto';

const formInclude = {
  leadSource: { select: { id: true, name: true, sourceType: true } },
} satisfies Prisma.FormBuilderFormInclude;

export class FormsRepository {
  create(tenantId: string, data: CreateFormDto & { slug: string; publicId: string; createdById?: string | null }) {
    return prisma.formBuilderForm.create({
      data: {
        tenantId,
        leadSourceId: data.leadSourceId || null,
        name: data.name,
        description: data.description || null,
        thankYouMessage: data.thankYouMessage || undefined,
        redirectUrl: data.redirectUrl || null,
        slug: data.slug,
        publicId: data.publicId,
        fields: (data.fields || []) as unknown as Prisma.InputJsonValue,
        settings: (data.settings || {}) as Prisma.InputJsonValue,
        spamProtection: (data.spamProtection || {}) as Prisma.InputJsonValue,
        notificationEmails: (data.notificationEmails || []) as Prisma.InputJsonValue,
        assignmentRules: (data.assignmentRules || {}) as Prisma.InputJsonValue,
        duplicateHandling: data.duplicateHandling || 'FLAG_DUPLICATE',
        submissionLimit: data.submissionLimit ?? null,
        createdById: data.createdById || null,
      },
      include: formInclude,
    });
  }

  async findMany(tenantId: string, query: FormQueryDto) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const where: Prisma.FormBuilderFormWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.formBuilderForm.findMany({
        where,
        include: formInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.formBuilderForm.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  findById(id: string, tenantId: string) {
    return prisma.formBuilderForm.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: formInclude,
    });
  }

  findByPublicId(publicId: string) {
    return prisma.formBuilderForm.findUnique({
      where: { publicId },
      include: formInclude,
    });
  }

  update(id: string, tenantId: string, data: UpdateFormDto & Record<string, any>) {
    return prisma.formBuilderForm.update({
      where: { id_tenantId: { id, tenantId } },
      data: data as Prisma.FormBuilderFormUncheckedUpdateInput,
      include: formInclude,
    });
  }

  softDelete(id: string, tenantId: string) {
    return prisma.formBuilderForm.update({
      where: { id_tenantId: { id, tenantId } },
      data: { deletedAt: new Date(), status: 'ARCHIVED', archivedAt: new Date() },
    });
  }

  async listSubmissions(formId: string, tenantId: string, query: SubmissionQueryDto) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 25, 1), 200);
    const where: Prisma.FormBuilderSubmissionWhereInput = {
      formId,
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.formBuilderSubmission.findMany({
        where,
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, companyName: true },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.formBuilderSubmission.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  findSubmission(formId: string, submissionId: string, tenantId: string) {
    return prisma.formBuilderSubmission.findFirst({
      where: { id: submissionId, formId, tenantId, deletedAt: null },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, companyName: true } },
      },
    });
  }
}

export const formsRepository = new FormsRepository();
