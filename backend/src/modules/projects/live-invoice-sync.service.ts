import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { toNumber } from './projects.dto';

const projectInvoiceSyncInclude = {
  client: {
    select: {
      id: true,
      clientName: true,
      primaryEmail: true,
      primaryPhone: true,
      streetAddress: true,
      city: true,
      province: true,
      postalCode: true,
      country: true,
      gstHstNumber: true,
      paymentTerms: true,
      currency: true,
    },
  },
  quote: {
    select: {
      id: true,
      quoteNumber: true,
      subtotal: true,
      taxRate: true,
      taxAmount: true,
      discountAmount: true,
      total: true,
      notes: true,
      terms: true,
      currency: true,
    },
  },
  projectMaterials: {
    orderBy: { createdAt: 'asc' },
  },
  projectLaborEntries: {
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  },
  projectExpenses: {
    orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
  },
  invoices: {
    include: {
      client: { select: { id: true, clientName: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWithInvoiceSyncData = Prisma.ProjectGetPayload<{
  include: typeof projectInvoiceSyncInclude;
}>;

type DraftLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number | null;
};

function readText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function clampMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function decimalOrNull(value: number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return new Prisma.Decimal(clampMoney(value));
}

function decimal(value: number | null | undefined): Prisma.Decimal {
  return new Prisma.Decimal(clampMoney(value ?? 0));
}

function getProjectAddress(project: ProjectWithInvoiceSyncData): string {
  return [
    readText(project.jobSiteAddress),
    readText(project.jobSiteCity),
    readText(project.jobSiteState),
    readText(project.jobSiteZip),
  ]
    .filter(Boolean)
    .join(', ');
}

function getInvoiceLineDescription(prefix: string, title: string, secondary?: string | null) {
  const suffix = readText(secondary);
  return suffix ? `${prefix}: ${title} - ${suffix}` : `${prefix}: ${title}`;
}

function getMaterialQuantity(material: Record<string, unknown>): number {
  const quantityUsed = toNumber(material.quantityUsed);
  const quantityNeeded = toNumber(material.quantityNeeded);
  return quantityUsed > 0 ? quantityUsed : quantityNeeded > 0 ? quantityNeeded : 1;
}

function getMaterialUnitPrice(material: Record<string, unknown>): number {
  const sellPrice = toNumber(material.sellPrice);
  if (sellPrice > 0) return sellPrice;

  const quantity = getMaterialQuantity(material);
  const totalCost = toNumber(material.totalCost);
  if (totalCost > 0 && quantity > 0) return totalCost / quantity;

  const unitCost = toNumber(material.unitCost);
  const markup = toNumber(material.markup);
  return markup > 0 ? unitCost * (1 + markup / 100) : unitCost;
}

function parsePaymentTermDays(term: unknown): number {
  const text = readText(term).toLowerCase();
  const match = text.match(/(\d{1,3})/);
  if (match) return Number(match[1]);
  return 30;
}

export class LiveInvoiceSyncService {
  async syncProjectInvoiceDraft(
    tenantId: string,
    projectId: string,
    options?: { allowCompletedSync?: boolean },
  ) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      include: projectInvoiceSyncInclude,
    });

    if (!project || !project.clientId || !project.client) {
      return null;
    }

    const isCompleted = project.status === 'COMPLETED' || Boolean(project.isCompleted);
    if (isCompleted && !options?.allowCompletedSync) {
      return project.invoices.find((invoice) => invoice.status === 'DRAFT') ?? project.invoices[0] ?? null;
    }

    const quoteTaxRate = project.quote?.taxRate ? toNumber(project.quote.taxRate) : 0;
    const derivedTaxRate =
      quoteTaxRate > 0
        ? quoteTaxRate
        : toNumber(project.quote?.subtotal) > 0
          ? (toNumber(project.quote?.taxAmount) / toNumber(project.quote?.subtotal)) * 100
          : 0;

    const lineItems = this.buildLineItems(project, derivedTaxRate);
    const subtotal = clampMoney(lineItems.reduce((sum, item) => sum + item.amount, 0));
    const taxAmount = clampMoney((subtotal * derivedTaxRate) / 100);
    const discountAmount = clampMoney(toNumber(project.quote?.discountAmount));
    const total = clampMoney(Math.max(subtotal + taxAmount - discountAmount, 0));
    const dueDate = this.buildDueDate(project);
    const notes = this.buildNotes(project);
    const terms = readText(project.quote?.terms) || null;
    const currency = (readText(project.currency) ||
      readText(project.quote?.currency) ||
      readText(project.client.currency) ||
      'CAD') as any;

    const existingDraft = project.invoices.find((invoice) => invoice.status === 'DRAFT') ?? null;
    if (isCompleted && !existingDraft && project.invoices.length > 0) {
      return project.invoices[0];
    }

    if (existingDraft) {
      return prisma.$transaction(async (tx) => {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: existingDraft.id, tenantId: project.tenantId } });
        return tx.invoice.update({
          where: { id_tenantId: { id: existingDraft.id, tenantId: project.tenantId } },
          data: {
            clientId: project.clientId!,
            quoteId: project.quoteId ?? null,
            projectId: project.id,
            currency,
            taxRate: decimalOrNull(derivedTaxRate > 0 ? derivedTaxRate : null),
            subtotal: decimal(subtotal),
            taxAmount: decimal(taxAmount),
            discountAmount: decimal(discountAmount),
            total: decimal(total),
            amountDue: decimal(Math.max(total - toNumber(existingDraft.amountPaid), 0)),
            notes,
            terms,
            items: {
              create: lineItems.map((item, index) => ({
                tenantId: project.tenantId,
                description: item.description,
                quantity: decimal(item.quantity),
                unitPrice: decimal(item.unitPrice),
                amount: decimal(item.amount),
                taxRate: decimalOrNull(item.taxRate),
                sortOrder: index,
              })),
            },
          },
          include: {
            client: { select: { id: true, clientName: true } },
            items: { orderBy: { sortOrder: 'asc' } },
          },
        });
      });
    }

    return prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber: await this.generateInvoiceNumber(tenantId),
        clientId: project.clientId!,
        quoteId: project.quoteId ?? null,
        projectId: project.id,
        issueDate: new Date(),
        dueDate,
        currency,
        status: 'DRAFT',
        taxRate: decimalOrNull(derivedTaxRate > 0 ? derivedTaxRate : null),
        subtotal: decimal(subtotal),
        taxAmount: decimal(taxAmount),
        discountAmount: decimal(discountAmount),
        total: decimal(total),
        amountPaid: decimal(0),
        amountDue: decimal(total),
        notes,
        terms,
        items: {
          create: lineItems.map((item, index) => ({
            tenantId,
            description: item.description,
            quantity: decimal(item.quantity),
            unitPrice: decimal(item.unitPrice),
            amount: decimal(item.amount),
            taxRate: decimalOrNull(item.taxRate),
            sortOrder: index,
          })),
        },
      },
      include: {
        client: { select: { id: true, clientName: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  private buildLineItems(project: ProjectWithInvoiceSyncData, taxRate: number): DraftLineItem[] {
    const materialItems: DraftLineItem[] = project.projectMaterials.map((material) => {
      const quantity = getMaterialQuantity(material as unknown as Record<string, unknown>);
      const unitPrice = getMaterialUnitPrice(material as unknown as Record<string, unknown>);
      const amount = quantity * unitPrice;
      return {
        description: getInvoiceLineDescription('Material', material.name, material.description),
        quantity,
        unitPrice: clampMoney(unitPrice),
        amount: clampMoney(amount),
        taxRate: taxRate > 0 ? taxRate : null,
      };
    });

    const laborItems: DraftLineItem[] = project.projectLaborEntries
      .filter((entry) => entry.isBillable !== false)
      .map((entry) => {
        const regularHours = toNumber(entry.hoursWorked);
        const overtimeHours = toNumber(entry.overtimeHours);
        const quantity = regularHours + overtimeHours;
        const totalCost = toNumber(entry.totalCost);
        const safeQuantity = quantity > 0 ? quantity : 1;
        const labelDate = entry.date instanceof Date ? entry.date.toISOString().slice(0, 10) : '';
        return {
          description: getInvoiceLineDescription('Labor', entry.workerName, labelDate || entry.description),
          quantity: clampMoney(safeQuantity),
          unitPrice: clampMoney(totalCost / safeQuantity),
          amount: clampMoney(totalCost),
          taxRate: taxRate > 0 ? taxRate : null,
        };
      });

    const addonItems: DraftLineItem[] = project.projectExpenses
      .filter((expense) => expense.billableToClient === true)
      .map((expense) => {
        const amount = toNumber(expense.amount) > 0 ? toNumber(expense.amount) : toNumber(expense.totalAmount);
        return {
          description: getInvoiceLineDescription('Add-on', expense.description, expense.vendor),
          quantity: 1,
          unitPrice: clampMoney(amount),
          amount: clampMoney(amount),
          taxRate: taxRate > 0 ? taxRate : null,
        };
      });

    const items = [...materialItems, ...laborItems, ...addonItems].filter((item) => item.amount > 0);
    if (items.length > 0) {
      return items;
    }

    const fallbackAmount =
      toNumber(project.contractValue) > 0
        ? toNumber(project.contractValue)
        : toNumber(project.quote?.total);

    return [
      {
        description: `Roofing job: ${project.name}`,
        quantity: 1,
        unitPrice: clampMoney(fallbackAmount),
        amount: clampMoney(fallbackAmount),
        taxRate: taxRate > 0 ? taxRate : null,
      },
    ];
  }

  private buildDueDate(project: ProjectWithInvoiceSyncData): Date {
    const paymentDays = parsePaymentTermDays(project.client?.paymentTerms);
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + paymentDays);
    return baseDate;
  }

  private buildNotes(project: ProjectWithInvoiceSyncData): string | null {
    const address = getProjectAddress(project);
    const sourceNote = readText(project.description) || readText(project.quote?.notes);
    const parts = [
      `Auto-built from job ${readText(project.projectNumber) || project.name}.`,
      address ? `Site: ${address}.` : '',
      sourceNote,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const latest = await prisma.invoice.findFirst({
      where: {
        tenantId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    const latestSeq = latest?.invoiceNumber
      ? Number(latest.invoiceNumber.split('-').pop()) || 0
      : 0;

    return `${prefix}${String(latestSeq + 1).padStart(4, '0')}`;
  }
}

export const liveInvoiceSyncService = new LiveInvoiceSyncService();
