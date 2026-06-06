import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { logger } from '../../common/utils/logger';
import { bookkeepingService } from '../bookkeeping/bookkeeping.service';

const prismaAny = prisma as any;

const DEFAULT_PLANS = [
  { planName: 'Starter', monthlyPrice: 199, annualPrice: 1990, setupFee: 499, seatLimit: 5, includedFeatures: ['Lead tracking', 'Pipeline', 'Email support'] },
  { planName: 'Professional', monthlyPrice: 399, annualPrice: 3990, setupFee: 999, seatLimit: 20, includedFeatures: ['Automation', 'Proposals', 'Billing', 'Priority support'] },
  { planName: 'Enterprise', monthlyPrice: 799, annualPrice: 7990, setupFee: 1999, seatLimit: null, includedFeatures: ['Advanced permissions', 'Custom onboarding', 'Dedicated success manager'] },
];

const SUBSCRIPTION_INCLUDE = {
  client: { select: { id: true, clientName: true, primaryEmail: true, primaryPhone: true, status: true, totalRevenue: true, assignedOwnerId: true } },
  project: { select: { id: true, name: true, organizationName: true, dealStatus: true, dealValue: true, quoteId: true, contactId: true } },
} as const;

const INVOICE_INCLUDE = {
  client: { select: { id: true, clientName: true, primaryEmail: true, primaryPhone: true } },
  project: { select: { id: true, name: true, organizationName: true, dealStatus: true } },
  quote: { select: { id: true, quoteNumber: true, status: true, total: true } },
  items: { orderBy: { sortOrder: 'asc' as const } },
  payments: { orderBy: { paymentDate: 'desc' as const } },
} as const;

function toNumber(value: unknown): number {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function normalizeCycle(value: unknown): 'MONTHLY' | 'ANNUAL' {
  return String(value || 'MONTHLY').toUpperCase().startsWith('ANNUAL') ? 'ANNUAL' : 'MONTHLY';
}

function normalizeSubscriptionStatus(value: unknown): string {
  const normalized = String(value || 'ACTIVE').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const allowed = new Set(['TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PENDING_PAYMENT', 'PENDING']);
  return allowed.has(normalized) ? normalized : 'ACTIVE';
}

function normalizeInvoiceStatus(value: unknown): string {
  const normalized = String(value || 'DRAFT').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const allowed = new Set(['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED', 'VIEWED']);
  return allowed.has(normalized) ? normalized : 'DRAFT';
}

function paymentContribution(payment: Record<string, any>): number {
  const status = String(payment.status || 'SUCCESSFUL').toUpperCase();
  if (status === 'SUCCESSFUL') return toNumber(payment.amount);
  if (status === 'PARTIALLY_REFUNDED') {
    return Math.max(toNumber(payment.amount) - toNumber(payment.refundAmount), 0);
  }
  return 0;
}

function latestContributingPaymentDate(payments: Record<string, any>[]): Date | null {
  return payments.reduce<Date | null>((latest, payment) => {
    if (paymentContribution(payment) <= 0 || !payment.paymentDate) return latest;
    const paymentDate = new Date(payment.paymentDate);
    if (Number.isNaN(paymentDate.getTime())) return latest;
    return !latest || paymentDate > latest ? paymentDate : latest;
  }, null);
}

export class BillingService {
  private proposalHandlerInitialized = false;

  initializeProposalAcceptedHandler() {
    if (this.proposalHandlerInitialized) return;
    this.proposalHandlerInitialized = true;
    eventBus.on('proposal.accepted', async (event) => {
      try {
        const deal = await prisma.project.findFirst({
          where: {
            tenantId: event.tenantId,
            OR: [
              { quoteId: event.quoteId },
              ...(event.leadId ? [{ leadId: event.leadId }] : []),
            ],
          },
          orderBy: { updatedAt: 'desc' },
        });
        if (!deal?.clientId) return;
        await prisma.project.update({
          where: { id: deal.id },
          data: {
            dealStatus: 'Won',
            status: 'COMPLETED',
            probability: 100,
            closedDate: new Date(),
          },
        }).catch((error) => {
          logger.warn('[Billing] Unable to mark deal won after proposal acceptance', {
            tenantId: event.tenantId,
            proposalId: event.proposalId,
            dealId: deal.id,
            error: (error as Error)?.message || String(error),
          });
        });
        await this.createSubscription(event.tenantId, {
          clientId: deal.clientId,
          projectId: deal.id,
          quoteId: event.quoteId,
          contactId: (deal as any).contactId || null,
          planName: 'Professional',
          billingCycle: 'MONTHLY',
          status: 'TRIAL',
          mrr: event.total || (deal as any).dealValue || (deal as any).expectedDealValue || 0,
          ownerId: (deal as any).dealOwnerId || (deal as any).salesRepId || event.salesRepId || null,
          notes: `Auto-created after proposal ${event.quoteNumber} was accepted.`,
        }, event.ownerUserId);
      } catch (error) {
        logger.error('[Billing] Proposal accepted automation failed', {
          tenantId: event.tenantId,
          proposalId: event.proposalId,
          quoteId: event.quoteId,
          leadId: event.leadId,
          error: (error as Error)?.message || String(error),
        });
        activityLogger.log({
          tenantId: event.tenantId,
          entityType: 'Proposal',
          entityId: event.proposalId,
          action: 'UPDATE',
          module: 'billing',
          description: 'Billing automation failed after proposal acceptance. Subscription/invoice needs review.',
          metadata: { quoteId: event.quoteId, leadId: event.leadId, error: (error as Error)?.message || String(error) },
        });
      }
    });
  }

  private async generateNumber(tenantId: string, model: 'subscription' | 'invoice' | 'payment') {
    const year = new Date().getFullYear();
    const config = {
      subscription: { prefix: `SUB-${year}-`, table: 'customerSubscription', field: 'subscriptionNumber' },
      invoice: { prefix: `INV-${year}-`, table: 'invoice', field: 'invoiceNumber' },
      payment: { prefix: `PAY-${year}-`, table: 'invoicePayment', field: 'reference' },
    }[model];
    const latest = await prismaAny[config.table].findFirst({
      where: { tenantId, [config.field]: { startsWith: config.prefix } },
      orderBy: { [config.field]: 'desc' },
      select: { [config.field]: true },
    });
    const current = String(latest?.[config.field] || '').replace(config.prefix, '');
    const next = (Number.parseInt(current, 10) || 0) + 1;
    return `${config.prefix}${String(next).padStart(4, '0')}`;
  }

  private calculateBilling(input: Record<string, any>, plan?: Record<string, any> | null) {
    const cycle = normalizeCycle(input.billingCycle);
    const seats = Math.max(Number.parseInt(String(input.seats || 1), 10) || 1, 1);
    const setupFee = toNumber(input.setupFee ?? plan?.setupFee);
    const subscriptionAmount = toNumber(input.subscriptionAmount ?? (cycle === 'ANNUAL' ? plan?.annualPrice : plan?.monthlyPrice) ?? input.mrr);
    const discount = toNumber(input.discountAmount ?? input.discount);
    const taxRate = toNumber(input.taxRate);
    const taxable = Math.max(setupFee + subscriptionAmount - discount, 0);
    const tax = (taxable * taxRate) / 100;
    const total = taxable + tax;
    const mrr = toNumber(input.mrr || (cycle === 'ANNUAL' ? subscriptionAmount / 12 : subscriptionAmount));
    const arr = toNumber(input.arr || (cycle === 'ANNUAL' ? subscriptionAmount : mrr * 12));
    return { cycle, seats, setupFee, subscriptionAmount, discount, taxRate, tax, total, mrr, arr };
  }

  private async ensureDefaultPlans(tenantId: string) {
    const count = await prismaAny.pricingPlan.count({ where: { tenantId } });
    if (count > 0) return;
    await Promise.all(DEFAULT_PLANS.map((plan) => prismaAny.pricingPlan.upsert({
      where: { tenantId_planName: { tenantId, planName: plan.planName } },
      update: {},
      create: { tenantId, ...plan },
    })));
  }

  async listPricingPlans(tenantId: string, query: Record<string, any> = {}) {
    await this.ensureDefaultPlans(tenantId);
    return prismaAny.pricingPlan.findMany({
      where: {
        tenantId,
        ...(query.active === 'true' ? { isActive: true } : query.active === 'false' ? { isActive: false } : {}),
      },
      orderBy: [{ isActive: 'desc' }, { monthlyPrice: 'asc' }],
    });
  }

  async upsertPricingPlan(tenantId: string, data: Record<string, any>) {
    const planName = String(data.planName || '').trim();
    if (!planName) throw new BadRequestError('Plan name is required', ErrorCodes.VALIDATION_FAILED);
    return prismaAny.pricingPlan.upsert({
      where: { tenantId_planName: { tenantId, planName } },
      update: {
        monthlyPrice: toNumber(data.monthlyPrice),
        annualPrice: toNumber(data.annualPrice),
        setupFee: toNumber(data.setupFee),
        seatLimit: data.seatLimit === '' || data.seatLimit == null ? null : Number(data.seatLimit),
        includedFeatures: Array.isArray(data.includedFeatures) ? data.includedFeatures : String(data.includedFeatures || '').split(',').map((item) => item.trim()).filter(Boolean),
        isActive: data.isActive !== false,
      },
      create: {
        tenantId,
        planName,
        monthlyPrice: toNumber(data.monthlyPrice),
        annualPrice: toNumber(data.annualPrice),
        setupFee: toNumber(data.setupFee),
        seatLimit: data.seatLimit === '' || data.seatLimit == null ? null : Number(data.seatLimit),
        includedFeatures: Array.isArray(data.includedFeatures) ? data.includedFeatures : String(data.includedFeatures || '').split(',').map((item) => item.trim()).filter(Boolean),
        isActive: data.isActive !== false,
      },
    });
  }

  async updatePricingPlan(id: string, tenantId: string, data: Record<string, any>) {
    const existing = await prismaAny.pricingPlan.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Pricing plan not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return prismaAny.pricingPlan.update({
      where: { id },
      data: {
        ...(data.planName !== undefined && { planName: String(data.planName).trim() }),
        ...(data.monthlyPrice !== undefined && { monthlyPrice: toNumber(data.monthlyPrice) }),
        ...(data.annualPrice !== undefined && { annualPrice: toNumber(data.annualPrice) }),
        ...(data.setupFee !== undefined && { setupFee: toNumber(data.setupFee) }),
        ...(data.seatLimit !== undefined && { seatLimit: data.seatLimit === '' || data.seatLimit == null ? null : Number(data.seatLimit) }),
        ...(data.includedFeatures !== undefined && { includedFeatures: Array.isArray(data.includedFeatures) ? data.includedFeatures : String(data.includedFeatures || '').split(',').map((item) => item.trim()).filter(Boolean) }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
      },
    });
  }

  async listSubscriptions(tenantId: string, query: Record<string, any> = {}) {
    await this.markPastDueSubscriptions(tenantId);
    const where: Record<string, any> = {
      tenantId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status && query.status !== 'all' ? { status: normalizeSubscriptionStatus(query.status) } : {}),
      ...(query.plan && query.plan !== 'all' ? { planName: query.plan } : {}),
      ...(query.ownerId && query.ownerId !== 'all' ? { ownerId: query.ownerId } : {}),
      ...(query.renewalFrom || query.renewalTo ? {
        renewalDate: {
          ...(query.renewalFrom ? { gte: new Date(query.renewalFrom) } : {}),
          ...(query.renewalTo ? { lte: new Date(query.renewalTo) } : {}),
        },
      } : {}),
    };
    const data = await prisma.customerSubscription.findMany({
      where,
      include: SUBSCRIPTION_INCLUDE,
      orderBy: { renewalDate: 'asc' },
      take: Number(query.limit || 300),
    });
    const totals = data.reduce((acc, sub: any) => {
      if (!['CANCELLED', 'EXPIRED'].includes(String(sub.status))) {
        acc.mrr += toNumber(sub.mrr);
        acc.arr += toNumber(sub.arr);
      }
      acc.count += 1;
      return acc;
    }, { count: 0, mrr: 0, arr: 0 });
    return { data, totals };
  }

  async getSubscription(id: string, tenantId: string) {
    const subscription = await prisma.customerSubscription.findFirst({
      where: { id, tenantId },
      include: SUBSCRIPTION_INCLUDE,
    });
    if (!subscription) throw new NotFoundError('Subscription not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const [invoice, payments, renewalTasks] = await Promise.all([
      (subscription as any).invoiceId ? prisma.invoice.findFirst({ where: { id: (subscription as any).invoiceId, tenantId }, include: INVOICE_INCLUDE }) : null,
      prisma.invoicePayment.findMany({ where: { tenantId, clientId: subscription.clientId }, orderBy: { paymentDate: 'desc' }, take: 50 }),
      prisma.task.findMany({ where: { tenantId, referenceDoctype: 'SubscriptionAutomation', referenceDocname: { contains: subscription.id } }, orderBy: { dueDate: 'asc' }, take: 20 }),
    ]);
    return { ...subscription, invoice, payments, renewalTasks };
  }

  async createSubscription(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const clientId = data.clientId || data.accountId || data.organizationId;
    if (!clientId) throw new BadRequestError('Subscription must have an Account', ErrorCodes.VALIDATION_FAILED);
    const plan = data.pricingPlanId
      ? await prismaAny.pricingPlan.findFirst({ where: { id: data.pricingPlanId, tenantId } })
      : data.planName
        ? await prismaAny.pricingPlan.findFirst({ where: { tenantId, planName: data.planName } })
        : null;
    const calc = this.calculateBilling(data, plan);
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const renewalDate = data.renewalDate ? new Date(data.renewalDate) : addMonths(startDate, calc.cycle === 'ANNUAL' ? 12 : 1);
    if (!renewalDate || Number.isNaN(renewalDate.getTime())) {
      throw new BadRequestError('Subscription renewal date is required', ErrorCodes.VALIDATION_FAILED);
    }

    const existing = data.projectId
      ? await prisma.customerSubscription.findFirst({ where: { tenantId, clientId, projectId: data.projectId } })
      : null;
    if (existing) return this.getSubscription(existing.id, tenantId);

    const subscription = await prisma.customerSubscription.create({
      data: {
        tenantId,
        subscriptionNumber: data.subscriptionNumber || await this.generateNumber(tenantId, 'subscription'),
        clientId,
        projectId: data.projectId || data.dealId || null,
        contactId: data.contactId || null,
        quoteId: data.quoteId || data.proposalId || null,
        pricingPlanId: plan?.id || data.pricingPlanId || null,
        planName: data.planName || plan?.planName || 'Professional',
        billingCycle: calc.cycle,
        status: normalizeSubscriptionStatus(data.status || 'TRIAL'),
        mrr: calc.mrr,
        arr: calc.arr,
        seats: calc.seats,
        setupFee: calc.setupFee,
        discountAmount: calc.discount,
        taxRate: calc.taxRate,
        paymentTerms: data.paymentTerms || 'Due on receipt',
        ownerId: data.ownerId || data.accountManagerId || null,
        startDate,
        renewalDate,
        notes: data.notes || null,
      } as any,
      include: SUBSCRIPTION_INCLUDE,
    });

    await prisma.client.update({ where: { id: clientId }, data: { status: 'ACTIVE', lifecycleStage: 'ONBOARDING' } }).catch(() => null);
    await this.ensureFirstInvoice(tenantId, subscription as any, actorUserId);
    await this.ensureOnboardingTask(tenantId, subscription as any, actorUserId);
    return this.getSubscription(subscription.id, tenantId);
  }

  async updateSubscription(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const current = await prisma.customerSubscription.findFirst({ where: { id, tenantId } });
    if (!current) throw new NotFoundError('Subscription not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const plan = data.pricingPlanId ? await prismaAny.pricingPlan.findFirst({ where: { id: data.pricingPlanId, tenantId } }) : null;
    const calc = this.calculateBilling({ ...current, ...data }, plan);
    const updated = await prisma.customerSubscription.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.projectId !== undefined && { projectId: data.projectId || null }),
        ...(data.contactId !== undefined && { contactId: data.contactId || null }),
        ...(data.quoteId !== undefined && { quoteId: data.quoteId || null }),
        ...(data.pricingPlanId !== undefined && { pricingPlanId: data.pricingPlanId || null }),
        ...(data.planName !== undefined && { planName: data.planName }),
        ...(data.billingCycle !== undefined && { billingCycle: calc.cycle }),
        ...(data.status !== undefined && { status: normalizeSubscriptionStatus(data.status) }),
        mrr: calc.mrr,
        arr: calc.arr,
        seats: calc.seats,
        setupFee: calc.setupFee,
        discountAmount: calc.discount,
        taxRate: calc.taxRate,
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms || null }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId || null }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.renewalDate !== undefined && { renewalDate: new Date(data.renewalDate) }),
        ...(data.cancelledAt !== undefined && { cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      } as any,
      include: SUBSCRIPTION_INCLUDE,
    });
    activityLogger.log({ tenantId, entityType: 'CustomerSubscription', entityId: id, action: 'UPDATE', module: 'billing', description: 'Subscription updated', userId: actorUserId });
    return updated;
  }

  async setSubscriptionStatus(id: string, tenantId: string, status: 'PAUSED' | 'CANCELLED' | 'ACTIVE', actorUserId?: string) {
    const data: Record<string, any> = { status };
    if (status === 'PAUSED') data.pausedAt = new Date();
    if (status === 'CANCELLED') data.cancelledAt = new Date();
    if (status === 'ACTIVE') {
      data.pausedAt = null;
      data.cancelledAt = null;
      data.activatedAt = new Date();
    }
    const updated = await prisma.customerSubscription.update({ where: { id }, data, include: SUBSCRIPTION_INCLUDE });
    if (updated.tenantId !== tenantId) throw new NotFoundError('Subscription not found', ErrorCodes.RESOURCE_NOT_FOUND);
    activityLogger.log({ tenantId, entityType: 'CustomerSubscription', entityId: id, action: 'STATUS_CHANGE', module: 'billing', description: `Subscription ${status.toLowerCase()}`, userId: actorUserId });
    return updated;
  }

  async listInvoices(tenantId: string, query: Record<string, any> = {}) {
    return prisma.invoice.findMany({
      where: {
        tenantId,
        ...(query.status && query.status !== 'all' ? { status: normalizeInvoiceStatus(query.status) } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}),
      } as any,
      include: INVOICE_INCLUDE,
      orderBy: { issueDate: 'desc' },
      take: Number(query.limit || 300),
    });
  }

  async createInvoice(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const clientId = data.clientId || data.accountId;
    if (!clientId) throw new BadRequestError('Invoice must have an Account', ErrorCodes.VALIDATION_FAILED);
    const calc = this.calculateBilling(data);
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber: data.invoiceNumber || await this.generateNumber(tenantId, 'invoice'),
        clientId,
        projectId: data.projectId || data.dealId || null,
        quoteId: data.quoteId || data.proposalId || null,
        status: normalizeInvoiceStatus(data.status || 'DRAFT') as any,
        issueDate: data.invoiceDate ? new Date(data.invoiceDate) : data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : addDays(new Date(), 14),
        currency: data.currency || 'CAD',
        subtotal: calc.setupFee + calc.subscriptionAmount,
        taxRate: calc.taxRate,
        taxAmount: calc.tax,
        discountAmount: calc.discount,
        total: calc.total,
        amountPaid: 0,
        amountDue: calc.total,
        notes: [data.notes, data.subscriptionId ? `Subscription:${data.subscriptionId}` : null].filter(Boolean).join('\n'),
        terms: data.paymentTerms || data.terms || 'Due on receipt',
        createdById: data.createdById || null,
        items: {
          create: [
            ...(calc.setupFee > 0 ? [{ tenantId, description: 'Roofer CRM setup fee', quantity: 1, unitPrice: calc.setupFee, amount: calc.setupFee, sortOrder: 0 }] : []),
            { tenantId, description: `Roofer CRM ${calc.cycle.toLowerCase()} subscription`, quantity: 1, unitPrice: calc.subscriptionAmount, amount: calc.subscriptionAmount, sortOrder: 1 },
          ],
        },
      } as any,
      include: INVOICE_INCLUDE,
    });
    if (data.subscriptionId) {
      await prisma.customerSubscription.updateMany({ where: { id: data.subscriptionId, tenantId }, data: { invoiceId: invoice.id } });
    }
    activityLogger.log({ tenantId, entityType: 'Invoice', entityId: invoice.id, action: 'CREATE', module: 'billing', description: `Invoice ${invoice.invoiceNumber} created`, userId: actorUserId });
    return invoice;
  }

  async markInvoiceSent(id: string, tenantId: string, actorUserId?: string) {
    const invoice = await prisma.invoice.update({ where: { id_tenantId: { id, tenantId } }, data: { status: 'SENT', sentAt: new Date() }, include: INVOICE_INCLUDE });
    activityLogger.log({ tenantId, entityType: 'Invoice', entityId: id, action: 'STATUS_CHANGE', module: 'billing', description: `Invoice ${invoice.invoiceNumber} marked sent`, userId: actorUserId });
    return invoice;
  }

  async markInvoicePaid(id: string, tenantId: string, data: Record<string, any> = {}, actorUserId?: string) {
    const invoice = await prisma.invoice.findFirst({ where: { id, tenantId }, include: INVOICE_INCLUDE });
    if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const balance = toNumber((invoice as any).amountDue);
    const amount = toNumber(data.amount || balance);
    return this.recordPayment(tenantId, { ...data, invoiceId: id, clientId: invoice.clientId, amount, paymentDate: data.paymentDate || new Date() }, actorUserId);
  }

  async listPayments(tenantId: string, query: Record<string, any> = {}) {
    return prisma.invoicePayment.findMany({
      where: {
        tenantId,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
        ...(query.status ? { status: String(query.status).toUpperCase() } : {}),
      },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, total: true, amountDue: true, status: true, projectId: true, quoteId: true } },
        client: { select: { id: true, clientName: true, primaryEmail: true } },
        project: { select: { id: true, name: true, organizationName: true } },
      },
      orderBy: { paymentDate: 'desc' },
      take: Number(query.limit || 300),
    });
  }

  async getPayment(id: string, tenantId: string) {
    const payment = await prisma.invoicePayment.findFirst({
      where: { id, tenantId },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            amountPaid: true,
            amountDue: true,
            status: true,
            currency: true,
            projectId: true,
            quoteId: true,
          },
        },
        client: { select: { id: true, clientName: true, primaryEmail: true, primaryPhone: true } },
        project: { select: { id: true, name: true, organizationName: true } },
      },
    });
    if (!payment) throw new NotFoundError('Payment not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return payment;
  }

  private async assertPaymentIsEditable(paymentId: string, tenantId: string) {
    const transaction = await prismaAny.bookkeepingTransaction.findFirst({
      where: { tenantId, sourceType: 'INVOICE_PAYMENT', sourceId: paymentId },
      select: { id: true, status: true, isReconciled: true },
    });
    if (transaction && (transaction.isReconciled || String(transaction.status).toUpperCase() === 'RECONCILED')) {
      throw new BadRequestError(
        'Unreconcile the related bookkeeping transaction before editing or voiding this payment.',
        ErrorCodes.INVALID_INPUT,
      );
    }
  }

  private async recalculateInvoiceFromPayments(invoiceId: string, tenantId: string, tx: any = prisma) {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const payments = await tx.invoicePayment.findMany({ where: { invoiceId, tenantId } });
    const amountPaid = payments.reduce(
      (sum: number, payment: Record<string, any>) => sum + paymentContribution(payment),
      0,
    );
    const total = toNumber(invoice.total);
    const amountDue = Math.max(total - amountPaid, 0);
    const status = amountDue === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIALLY_PAID' : 'SENT';
    const paidAt = amountDue === 0 ? latestContributingPaymentDate(payments) || invoice.paidAt || new Date() : null;
    return tx.invoice.update({
      where: { id_tenantId: { id: invoiceId, tenantId } },
      data: {
        amountPaid,
        amountDue,
        status,
        paidAt,
      },
    });
  }

  async updatePayment(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const payment = await prisma.invoicePayment.findFirst({
      where: { id, tenantId },
      include: { invoice: true },
    });
    if (!payment) throw new NotFoundError('Payment not found', ErrorCodes.RESOURCE_NOT_FOUND);
    if (!payment.invoiceId || !payment.invoice) {
      throw new BadRequestError('Only invoice-linked payments can be edited', ErrorCodes.INVALID_INPUT);
    }
    await this.assertPaymentIsEditable(id, tenantId);

    const status = String(payment.status || 'SUCCESSFUL').toUpperCase();
    if (!['SUCCESSFUL', 'PARTIALLY_REFUNDED'].includes(status)) {
      throw new BadRequestError('Voided, failed, or refunded payments cannot be edited', ErrorCodes.INVALID_INPUT);
    }

    const amount = toNumber(data.amount);
    if (amount <= 0) throw new BadRequestError('Payment amount must be greater than zero', ErrorCodes.VALIDATION_FAILED);
    if (status === 'PARTIALLY_REFUNDED' && amount <= toNumber(payment.refundAmount)) {
      throw new BadRequestError('Payment amount must exceed the refunded amount', ErrorCodes.VALIDATION_FAILED);
    }

    const otherPayments = await prisma.invoicePayment.findMany({
      where: { tenantId, invoiceId: payment.invoiceId, id: { not: id } },
    });
    const otherPaid = otherPayments.reduce(
      (sum: number, row: Record<string, any>) => sum + paymentContribution(row),
      0,
    );
    const available = Math.max(toNumber(payment.invoice.total) - otherPaid, 0);
    const contribution = status === 'PARTIALLY_REFUNDED'
      ? Math.max(amount - toNumber(payment.refundAmount), 0)
      : amount;
    if (contribution > available) {
      throw new BadRequestError('Payment cannot exceed the remaining invoice balance', ErrorCodes.VALIDATION_FAILED);
    }

    const previousContribution = paymentContribution(payment as any);
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.invoicePayment.update({
        where: { id },
        data: {
          amount,
          paymentMethod: String(data.paymentMethod).toUpperCase() as any,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : payment.paymentDate,
          reference: data.reference ?? null,
          notes: data.notes ?? null,
        },
      });
      await this.recalculateInvoiceFromPayments(payment.invoiceId!, tenantId, tx);
      const delta = paymentContribution(next as any) - previousContribution;
      if (delta !== 0) {
        await tx.client.update({
          where: { id: payment.clientId },
          data: { totalRevenue: { increment: delta } },
        });
      }
      return next;
    });

    await bookkeepingService.syncInvoicePayment(tenantId, id);
    activityLogger.log({
      tenantId,
      entityType: 'InvoicePayment',
      entityId: id,
      action: 'UPDATE',
      module: 'payments',
      description: `Payment ${payment.paymentNumber || id} updated`,
      userId: actorUserId,
      metadata: { invoiceId: payment.invoiceId, previousAmount: toNumber(payment.amount), amount },
    });
    return this.getPayment(updated.id, tenantId);
  }

  async voidPayment(id: string, tenantId: string, actorUserId?: string) {
    const payment = await prisma.invoicePayment.findFirst({
      where: { id, tenantId },
      include: { invoice: true },
    });
    if (!payment) throw new NotFoundError('Payment not found', ErrorCodes.RESOURCE_NOT_FOUND);
    if (!payment.invoiceId) throw new BadRequestError('Only invoice-linked payments can be voided', ErrorCodes.INVALID_INPUT);
    await this.assertPaymentIsEditable(id, tenantId);
    if (String(payment.status).toUpperCase() === 'VOIDED') return this.getPayment(id, tenantId);

    const previousContribution = paymentContribution(payment as any);
    await prisma.$transaction(async (tx) => {
      await tx.invoicePayment.update({
        where: { id },
        data: { status: 'VOIDED', voidedAt: new Date() },
      });
      await this.recalculateInvoiceFromPayments(payment.invoiceId!, tenantId, tx);
      if (previousContribution !== 0) {
        await tx.client.update({
          where: { id: payment.clientId },
          data: { totalRevenue: { decrement: previousContribution } },
        });
      }
    });

    await bookkeepingService.syncInvoicePayment(tenantId, id);
    eventBus.emit('payment.voided', {
      tenantId,
      paymentId: id,
      invoiceId: payment.invoiceId,
      invoiceNumber: (payment.invoice as any)?.invoiceNumber || '',
      clientId: payment.clientId,
      amount: toNumber(payment.amount),
      status: 'VOIDED',
      paidByUserId: actorUserId,
    });
    activityLogger.log({
      tenantId,
      entityType: 'InvoicePayment',
      entityId: id,
      action: 'DELETE',
      module: 'payments',
      description: `Payment ${payment.paymentNumber || id} voided`,
      userId: actorUserId,
      metadata: { invoiceId: payment.invoiceId, amount: toNumber(payment.amount) },
    });
    return this.getPayment(id, tenantId);
  }

  async recordPayment(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const invoiceId = data.invoiceId;
    if (!invoiceId) throw new BadRequestError('Payment must be linked to an invoice', ErrorCodes.VALIDATION_FAILED);
    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const amount = toNumber(data.amount);
    const balance = toNumber((invoice as any).amountDue);
    if (amount <= 0) throw new BadRequestError('Payment amount must be greater than zero', ErrorCodes.VALIDATION_FAILED);
    if (amount > balance && !data.allowOverpayment) {
      throw new BadRequestError('Payment cannot exceed invoice balance unless overpayment is allowed', ErrorCodes.VALIDATION_FAILED);
    }
    const subscription = await prisma.customerSubscription.findFirst({ where: { tenantId, invoiceId } });
    const payment = await prisma.invoicePayment.create({
      data: {
        tenantId,
        paymentNumber: data.paymentNumber || await this.generateNumber(tenantId, 'payment'),
        invoiceId,
        clientId: data.clientId || invoice.clientId,
        projectId: data.projectId || invoice.projectId || null,
        subscriptionId: data.subscriptionId || subscription?.id || null,
        amount,
        paymentMethod: String(data.paymentMethod || 'BANK_TRANSFER').toUpperCase(),
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        status: String(data.status || 'SUCCESSFUL').toUpperCase(),
        reference: data.reference || null,
        notes: data.notes || null,
      } as any,
    });
    const paid = toNumber((invoice as any).amountPaid) + amount;
    const due = Math.max(toNumber((invoice as any).total) - paid, 0);
    const status = due <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    const updatedInvoice = await prisma.invoice.update({
      where: { id_tenantId: { id: invoiceId, tenantId } },
      data: { amountPaid: paid, amountDue: due, status: status as any, paidAt: status === 'PAID' ? payment.paymentDate : null },
      include: INVOICE_INCLUDE,
    });
    if (subscription && status === 'PAID') {
      await prisma.customerSubscription.update({ where: { id: subscription.id }, data: { status: 'ACTIVE', activatedAt: subscription.activatedAt || new Date() } });
    }
    await prisma.client.update({ where: { id: invoice.clientId }, data: { status: 'ACTIVE', totalRevenue: { increment: amount } } }).catch(() => null);
    activityLogger.log({ tenantId, entityType: 'InvoicePayment', entityId: payment.id, action: 'CREATE', module: 'billing', description: `Payment recorded for invoice ${invoice.invoiceNumber}`, userId: actorUserId, metadata: { invoiceId, amount, status } });
    bookkeepingService.syncInvoicePayment(tenantId, payment.id).catch((error) => {
      logger.warn('[Billing] Bookkeeping sync failed for invoice payment', {
        tenantId,
        invoiceId,
        paymentId: payment.id,
        error: (error as Error)?.message || String(error),
      });
      activityLogger.log({
        tenantId,
        entityType: 'InvoicePayment',
        entityId: payment.id,
        action: 'UPDATE',
        module: 'bookkeeping',
        description: 'Bookkeeping sync failed for invoice payment',
        userId: actorUserId,
        metadata: { invoiceId, error: (error as Error)?.message || String(error) },
      });
    });
    return { payment, invoice: updatedInvoice };
  }

  async createRenewalReminders(tenantId: string, days = 30, actorUserId?: string) {
    const now = new Date();
    const until = addDays(new Date(), days);
    const subscriptions = await prisma.customerSubscription.findMany({
      where: { tenantId, status: { notIn: ['CANCELLED', 'EXPIRED'] }, renewalDate: { gte: now, lte: until } },
      include: SUBSCRIPTION_INCLUDE,
    });
    const created = [];
    for (const subscription of subscriptions as any[]) {
      const existing = await prisma.task.findFirst({
        where: { tenantId, referenceDoctype: 'SubscriptionAutomation', referenceDocname: `renewal:${subscription.id}` },
      });
      if (existing) continue;
      const task = await prisma.task.create({
        data: {
          tenantId,
          title: `Renewal follow-up: ${subscription.client?.clientName || subscription.planName}`,
          description: `Subscription ${subscription.subscriptionNumber || subscription.id} renews on ${subscription.renewalDate.toISOString().slice(0, 10)}.`,
          status: 'TODO',
          priority: 'HIGH',
          dueDate: addDays(new Date(subscription.renewalDate), -7),
          assignedToId: subscription.ownerId || subscription.client?.assignedOwnerId || null,
          clientId: subscription.clientId,
          projectId: subscription.projectId || null,
          referenceDoctype: 'SubscriptionAutomation',
          referenceDocname: `renewal:${subscription.id}`,
        } as any,
      });
      created.push(task);
      activityLogger.log({ tenantId, entityType: 'Task', entityId: task.id, action: 'CREATE', module: 'billing', description: `Renewal task created for ${subscription.client?.clientName || subscription.planName}`, userId: actorUserId, metadata: { subscriptionId: subscription.id } });
    }
    return { checked: subscriptions.length, created: created.length, tasks: created };
  }

  async markPastDueSubscriptions(tenantId: string) {
    const overdueInvoices = await prisma.invoice.findMany({
      where: { tenantId, status: { in: ['SENT', 'OVERDUE'] as any }, dueDate: { lt: new Date() }, amountDue: { gt: 0 } as any },
      select: { id: true },
    });
    for (const invoice of overdueInvoices) {
      await prisma.invoice.update({ where: { id_tenantId: { id: invoice.id, tenantId } }, data: { status: 'OVERDUE' as any } });
      const subscription = await prisma.customerSubscription.findFirst({ where: { tenantId, invoiceId: invoice.id } });
      if (subscription && !['CANCELLED', 'EXPIRED'].includes(String(subscription.status))) {
        await prisma.customerSubscription.update({ where: { id: subscription.id }, data: { status: 'PAST_DUE' } });
        await this.ensureBillingFollowUpTask(tenantId, subscription as any);
      }
    }
  }

  private async ensureFirstInvoice(tenantId: string, subscription: Record<string, any>, actorUserId?: string) {
    if (subscription.invoiceId) return subscription.invoiceId;
    const invoice = await this.createInvoice(tenantId, {
      subscriptionId: subscription.id,
      clientId: subscription.clientId,
      projectId: subscription.projectId,
      quoteId: subscription.quoteId,
      billingCycle: subscription.billingCycle,
      setupFee: subscription.setupFee,
      subscriptionAmount: normalizeCycle(subscription.billingCycle) === 'ANNUAL' ? subscription.arr : subscription.mrr,
      discountAmount: subscription.discountAmount,
      taxRate: subscription.taxRate,
      paymentTerms: subscription.paymentTerms,
      currency: 'CAD',
      status: 'DRAFT',
    }, actorUserId);
    return invoice.id;
  }

  private async ensureOnboardingTask(tenantId: string, subscription: Record<string, any>, actorUserId?: string) {
    const existing = await prisma.task.findFirst({ where: { tenantId, referenceDoctype: 'SubscriptionAutomation', referenceDocname: `onboarding:${subscription.id}` } });
    if (existing) return existing;
    return prisma.task.create({
      data: {
        tenantId,
        title: `Start onboarding: ${subscription.planName}`,
        description: 'Kick off Roofer CRM onboarding, invite users, confirm seats, and schedule setup call.',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: addDays(new Date(), 1),
        assignedToId: subscription.ownerId || null,
        clientId: subscription.clientId,
        projectId: subscription.projectId || null,
        referenceDoctype: 'SubscriptionAutomation',
        referenceDocname: `onboarding:${subscription.id}`,
      } as any,
    }).then((task) => {
      activityLogger.log({ tenantId, entityType: 'Task', entityId: task.id, action: 'CREATE', module: 'billing', description: `Onboarding task created for subscription ${subscription.subscriptionNumber || subscription.id}`, userId: actorUserId });
      return task;
    });
  }

  private async ensureBillingFollowUpTask(tenantId: string, subscription: Record<string, any>) {
    const existing = await prisma.task.findFirst({ where: { tenantId, referenceDoctype: 'SubscriptionAutomation', referenceDocname: `past-due:${subscription.id}` } });
    if (existing) return existing;
    return prisma.task.create({
      data: {
        tenantId,
        title: `Billing follow-up: ${subscription.planName}`,
        description: 'Subscription is past due. Follow up on payment and account status.',
        status: 'TODO',
        priority: 'URGENT',
        dueDate: new Date(),
        assignedToId: subscription.ownerId || null,
        clientId: subscription.clientId,
        projectId: subscription.projectId || null,
        referenceDoctype: 'SubscriptionAutomation',
        referenceDocname: `past-due:${subscription.id}`,
      } as any,
    });
  }
}

export const billingService = new BillingService();
