import os from 'os';
import { prisma } from '../../config/database';
import { eventBus } from '../../common/events/event-bus';
import { activityLogger } from '../../common/services/activity-logger.service';
import { logger } from '../../common/utils/logger';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { notificationsService } from '../notifications/notifications.service';
import { bookkeepingService } from '../bookkeeping/bookkeeping.service';
import { invoicesService } from '../invoices/invoices.service';
import { proposalsService } from '../proposals/proposals.service';
import { contractsService } from '../contracts/contracts.service';
import { automationIdempotencyService } from './automation-idempotency.service';
import { automationOrchestratorService } from './automation-orchestrator.service';
import { tenantMailerService } from '../../common/services/tenant-mailer.service';
import { leadAutomationService } from '../leads/lead-automation.service';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';

const db = prisma as any;
const REMINDER_PROCESSING_TIMEOUT_MS = Number(process.env.SALES_REMINDER_PROCESSING_TIMEOUT_MS || 15 * 60 * 1000);
const DEFAULT_REMINDER_WORKER_ID = process.env.SALES_AUTOMATION_WORKER_ID || `${os.hostname()}-${process.pid}`;

const DEFAULT_RULES = [
  {
    name: 'New lead follow-up',
    description: 'Create the first sales follow-up and notify the assigned owner when a lead is created.',
    triggerType: 'lead.created',
    actions: ['create_followup_task', 'notify_owner'],
    priority: 10,
    runOncePerEntity: true,
  },
  {
    name: 'Stale lead follow-up',
    description: 'Create a recovery task and notify the owner when a lead has no recent activity.',
    triggerType: 'lead.stale',
    actions: ['create_stale_lead_task', 'notify_owner'],
    priority: 15,
    runOncePerEntity: false,
  },
  {
    name: 'Lead contacted next step',
    description: 'Log contact automation, schedule next follow-up, and start a no-response reminder.',
    triggerType: 'lead.contacted',
    actions: ['create_contacted_followup_task', 'schedule_no_response_reminder', 'score_lead'],
    priority: 15,
    runOncePerEntity: false,
  },
  {
    name: 'Lead qualified conversion',
    description: 'Prepare account, contact, deal, default task, and owner notification when a lead qualifies.',
    triggerType: 'lead.qualified',
    actions: ['prepare_lead_conversion', 'create_default_deal_task', 'notify_owner'],
    priority: 10,
    runOncePerEntity: true,
  },
  {
    name: 'Lead converted handoff',
    description: 'Notify the owner and create a deal follow-up after lead conversion.',
    triggerType: 'lead.converted',
    actions: ['create_conversion_followup_task', 'notify_owner'],
    priority: 15,
    runOncePerEntity: true,
  },
  {
    name: 'Lead disqualified cleanup',
    description: 'Cancel lead reminders and create nurture follow-up when a lead is disqualified.',
    triggerType: 'lead.disqualified',
    actions: ['cancel_lead_reminders', 'create_nurture_followup'],
    priority: 15,
    runOncePerEntity: false,
  },
  {
    name: 'New deal kickoff',
    description: 'Set safe defaults, create the first deal task, prepare a document folder, and notify the owner.',
    triggerType: 'deal.created',
    actions: ['set_deal_defaults', 'create_first_deal_task', 'create_deal_document_folder', 'notify_owner'],
    priority: 15,
    runOncePerEntity: true,
  },
  {
    name: 'Deal stage changed follow-up',
    description: 'Create stage-specific sales tasks and reminders as deals move through the pipeline.',
    triggerType: 'deal.stageChanged',
    actions: ['create_stage_followup_task', 'schedule_stage_reminder'],
    priority: 20,
    runOncePerEntity: false,
  },
  {
    name: 'Deal won onboarding',
    description: 'Start customer success onboarding when a deal is won.',
    triggerType: 'deal.won',
    actions: ['start_customer_onboarding'],
    priority: 10,
    runOncePerEntity: true,
  },
  {
    name: 'Deal lost nurture',
    description: 'Cancel open deal reminders and create a future nurture task when a deal is lost.',
    triggerType: 'deal.lost',
    actions: ['cancel_deal_reminders', 'create_lost_nurture_task'],
    priority: 10,
    runOncePerEntity: true,
  },
  {
    name: 'Stale deal follow-up',
    description: 'Create a recovery task and notify the owner when a deal has stalled.',
    triggerType: 'deal.stale',
    actions: ['create_stale_deal_task', 'notify_owner'],
    priority: 15,
    runOncePerEntity: false,
  },
  {
    name: 'Proposal created activity',
    description: 'Log proposal creation and prepare tracking context.',
    triggerType: 'proposal.created',
    actions: ['create_activity_log'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Proposal sent follow-up',
    description: 'Move deal to Proposal Sent, send proposal email, schedule follow-ups, save documents, and notify owner.',
    triggerType: 'proposal.sent',
    actions: ['update_deal_stage', 'send_proposal_email', 'schedule_proposal_followup', 'save_proposal_document', 'notify_owner'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Proposal accepted handoff',
    description: 'Mark linked sales work ready for billing and create onboarding follow-up.',
    triggerType: 'proposal.accepted',
    actions: ['mark_deal_won', 'create_onboarding_task', 'save_proposal_document'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Proposal declined follow-up',
    description: 'Notify the owner and create a follow-up task when a proposal is declined.',
    triggerType: 'proposal.declined',
    actions: ['create_declined_followup_task', 'notify_owner'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Proposal expired follow-up',
    description: 'Cancel reminders and create a follow-up task when a proposal expires.',
    triggerType: 'proposal.expired',
    actions: ['cancel_proposal_reminders', 'create_expired_followup_task', 'notify_owner'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Contract created activity',
    description: 'Log contract creation and prepare contract lifecycle automation context.',
    triggerType: 'contract.created',
    actions: ['create_activity_log'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Contract sent document archive',
    description: 'Send contract email, archive PDF, schedule signing reminders, and notify owner.',
    triggerType: 'contract.sent',
    actions: ['send_contract_email', 'save_contract_document', 'schedule_contract_reminders', 'notify_owner'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Contract signed document archive',
    description: 'Archive signed contract PDFs, cancel reminders, update deal/customer lifecycle, and create next steps.',
    triggerType: 'contract.signed',
    actions: ['save_contract_document', 'cancel_contract_reminders', 'update_deal_stage', 'create_invoice_draft', 'start_customer_onboarding', 'update_customer_lifecycle'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Contract declined follow-up',
    description: 'Notify the owner and create follow-up when a contract is declined.',
    triggerType: 'contract.declined',
    actions: ['notify_owner', 'create_contract_followup_task'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Contract expiring follow-up',
    description: 'Create renewal/expiry follow-up and notify owner before a contract expires.',
    triggerType: 'contract.expiring',
    actions: ['notify_owner', 'create_contract_renewal_task'],
    priority: 20,
    runOncePerEntity: false,
  },
  {
    name: 'Contract expired follow-up',
    description: 'Create expiry follow-up and notify owner when a contract expires.',
    triggerType: 'contract.expired',
    actions: ['notify_owner', 'create_contract_expired_task'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Invoice created document draft',
    description: 'Archive draft invoice PDF and log invoice creation context.',
    triggerType: 'invoice.created',
    actions: ['save_invoice_pdf', 'create_activity_log'],
    priority: 15,
    runOncePerEntity: true,
  },
  {
    name: 'Invoice sent reminders',
    description: 'Save invoice PDFs and schedule payment reminders before and after due date.',
    triggerType: 'invoice.sent',
    actions: ['save_invoice_pdf', 'schedule_invoice_reminders'],
    priority: 10,
    runOncePerEntity: true,
  },
  {
    name: 'Invoice partial payment follow-up',
    description: 'Keep payment reminders active and sync bookkeeping when an invoice is partially paid.',
    triggerType: 'invoice.partiallyPaid',
    actions: ['sync_bookkeeping', 'schedule_invoice_reminders', 'notify_owner'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Invoice paid closeout',
    description: 'Cancel payment reminders, sync bookkeeping, start customer success onboarding, and notify the account owner.',
    triggerType: 'invoice.paid',
    actions: ['cancel_invoice_reminders', 'sync_bookkeeping', 'start_customer_onboarding', 'notify_owner'],
    priority: 10,
    runOncePerEntity: true,
  },
  {
    name: 'Payment received closeout',
    description: 'Sync bookkeeping and stop invoice reminders after a payment is received.',
    triggerType: 'payment.received',
    actions: ['sync_bookkeeping', 'cancel_invoice_reminders'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Payment correction bookkeeping',
    description: 'Reverse or void bookkeeping entries when a payment fails, is refunded, or is voided.',
    triggerType: 'payment.failed',
    actions: ['sync_bookkeeping_reversal'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Payment refund bookkeeping',
    description: 'Create refund bookkeeping entries when a payment is refunded.',
    triggerType: 'payment.refunded',
    actions: ['sync_bookkeeping_reversal'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Partial refund bookkeeping',
    description: 'Create partial refund bookkeeping entries when part of a payment is refunded.',
    triggerType: 'payment.partiallyRefunded',
    actions: ['sync_bookkeeping_reversal'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Voided payment bookkeeping',
    description: 'Void bookkeeping entries when a payment is voided.',
    triggerType: 'payment.voided',
    actions: ['sync_bookkeeping_reversal'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Expense created bookkeeping sync',
    description: 'Sync new expenses into bookkeeping with review status until approved or paid.',
    triggerType: 'expense.created',
    actions: ['sync_bookkeeping_expense'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Expense updated bookkeeping sync',
    description: 'Update the linked bookkeeping transaction when an expense changes.',
    triggerType: 'expense.updated',
    actions: ['sync_bookkeeping_expense'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Expense approved bookkeeping sync',
    description: 'Post approved expenses into bookkeeping.',
    triggerType: 'expense.approved',
    actions: ['sync_bookkeeping_expense'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Expense deleted bookkeeping cleanup',
    description: 'Void the source bookkeeping transaction when an expense is deleted.',
    triggerType: 'expense.deleted',
    actions: ['void_bookkeeping_expense'],
    priority: 10,
    runOncePerEntity: false,
  },
  {
    name: 'Customer success follow-up',
    description: 'Create a customer-success follow-up task and notify the owner when post-sale follow-up is due.',
    triggerType: 'customer.followupDue',
    actions: ['create_customer_followup_task', 'notify_owner'],
    priority: 20,
    runOncePerEntity: false,
  },
  {
    name: 'Bookkeeping sync failed',
    description: 'Log and surface bookkeeping sync failures for admin review.',
    triggerType: 'bookkeeping.sync.failed',
    actions: ['notify_admin', 'create_activity_log'],
    priority: 5,
    runOncePerEntity: false,
  },
] as const;

const TEST_TRIGGER_ENTITY_MODELS: Record<string, { model: string; entityType: string; idField: string }> = {
  lead: { model: 'lead', entityType: 'Lead', idField: 'leadId' },
  proposal: { model: 'proposal', entityType: 'Proposal', idField: 'proposalId' },
  quote: { model: 'quote', entityType: 'Quote', idField: 'quoteId' },
  contract: { model: 'contract', entityType: 'Contract', idField: 'contractId' },
  invoice: { model: 'invoice', entityType: 'Invoice', idField: 'invoiceId' },
  invoicepayment: { model: 'invoicePayment', entityType: 'InvoicePayment', idField: 'paymentId' },
  payment: { model: 'invoicePayment', entityType: 'InvoicePayment', idField: 'paymentId' },
  expense: { model: 'expense', entityType: 'Expense', idField: 'expenseId' },
  deal: { model: 'project', entityType: 'Deal', idField: 'projectId' },
  project: { model: 'project', entityType: 'Deal', idField: 'projectId' },
  client: { model: 'client', entityType: 'Client', idField: 'clientId' },
  account: { model: 'client', entityType: 'Client', idField: 'clientId' },
  company: { model: 'client', entityType: 'Client', idField: 'clientId' },
  organization: { model: 'client', entityType: 'Client', idField: 'clientId' },
  contact: { model: 'contact', entityType: 'Contact', idField: 'contactId' },
  bookkeepingtransaction: { model: 'bookkeepingTransaction', entityType: 'BookkeepingTransaction', idField: 'bookkeepingTransactionId' },
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addBusinessDays(date: Date, days: number) {
  const next = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    next.setDate(next.getDate() + 1);
    if (![0, 6].includes(next.getDay())) remaining -= 1;
  }
  return next;
}

function cleanStatus(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function entityKey(value: unknown) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

class SalesAutomationService {
  private initialized = false;
  private schedulerStarted = false;

  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    eventBus.on('lead.created', (event) => this.executeTrigger('lead.created', 'Lead', event.leadId, event));
    eventBus.on('lead.updated', (event) => this.executeTrigger('lead.updated', 'Lead', event.leadId, event));
    eventBus.on('lead.contacted', (event) => this.executeTrigger('lead.contacted', 'Lead', event.leadId, event));
    eventBus.on('lead.qualified', (event) => this.executeTrigger('lead.qualified', 'Lead', event.leadId, event));
    eventBus.on('lead.stale', (event) => this.executeTrigger('lead.stale', 'Lead', event.leadId, event));
    eventBus.on('lead.converted', (event) => this.executeTrigger('lead.converted', 'Lead', event.leadId, event));
    eventBus.on('lead.disqualified', (event) => this.executeTrigger('lead.disqualified', 'Lead', event.leadId, event));
    eventBus.on('lead.statusChanged', (event) => this.executeTrigger('lead.status.changed', 'Lead', event.leadId, event));
    eventBus.on('deal.created', (event) => this.executeTrigger('deal.created', 'Deal', event.dealId || event.projectId, event));
    eventBus.on('deal.stageChanged', (event) => this.executeTrigger('deal.stageChanged', 'Deal', event.dealId || event.projectId, event));
    eventBus.on('deal.valueChanged', (event) => this.executeTrigger('deal.valueChanged', 'Deal', event.dealId || event.projectId, event));
    eventBus.on('deal.ownerChanged', (event) => this.executeTrigger('deal.ownerChanged', 'Deal', event.dealId || event.projectId, event));
    eventBus.on('deal.stale', (event) => this.executeTrigger('deal.stale', 'Deal', event.dealId || event.projectId, event));
    eventBus.on('deal.lost', (event) => this.executeTrigger('deal.lost', 'Deal', event.dealId || event.projectId, event));
    eventBus.on('project.stageChanged', (event) => this.executeTrigger('deal.stageChanged', 'Deal', event.projectId, event));
    eventBus.on('deal.won', (event) => this.executeTrigger('deal.won', 'Deal', event.dealId || event.projectId || event.leadId || '', event));
    eventBus.on('proposal.created', (event) => this.executeTrigger('proposal.created', 'Proposal', event.proposalId, event));
    eventBus.on('proposal.sent', (event) => this.executeTrigger('proposal.sent', 'Proposal', event.proposalId, event));
    eventBus.on('proposal.viewed', (event) => this.executeTrigger('proposal.viewed', 'Proposal', event.proposalId, event));
    eventBus.on('proposal.reminderDue', (event) => this.executeTrigger('proposal.reminderDue', 'Proposal', event.proposalId, event));
    eventBus.on('proposal.accepted', (event) => this.executeTrigger('proposal.accepted', 'Proposal', event.proposalId, event));
    eventBus.on('proposal.declined', (event) => this.executeTrigger('proposal.declined', 'Proposal', event.proposalId, event));
    eventBus.on('proposal.expired', (event) => this.executeTrigger('proposal.expired', 'Proposal', event.proposalId, event));
    eventBus.on('contract.created', (event) => this.executeTrigger('contract.created', 'Contract', event.contractId, event));
    eventBus.on('contract.sent', (event) => this.executeTrigger('contract.sent', 'Contract', event.contractId, event));
    eventBus.on('contract.viewed', (event) => this.executeTrigger('contract.viewed', 'Contract', event.contractId, event));
    eventBus.on('contract.reminderDue', (event) => this.executeTrigger('contract.reminderDue', 'Contract', event.contractId, event));
    eventBus.on('contract.signed', (event) => this.executeTrigger('contract.signed', 'Contract', event.contractId, event));
    eventBus.on('contract.declined', (event) => this.executeTrigger('contract.declined', 'Contract', event.contractId, event));
    eventBus.on('contract.expiring', (event) => this.executeTrigger('contract.expiring', 'Contract', event.contractId, event));
    eventBus.on('contract.expired', (event) => this.executeTrigger('contract.expired', 'Contract', event.contractId, event));
    eventBus.on('invoice.created', (event) => this.executeTrigger('invoice.created', 'Invoice', event.invoiceId, event));
    eventBus.on('invoice.sent', (event) => this.executeTrigger('invoice.sent', 'Invoice', event.invoiceId, event));
    eventBus.on('invoice.dueSoon', (event) => this.executeTrigger('invoice.dueSoon', 'Invoice', event.invoiceId, event));
    eventBus.on('invoice.overdue', (event) => this.executeTrigger('invoice.overdue', 'Invoice', event.invoiceId, event));
    eventBus.on('invoice.paid', (event) => this.executeTrigger('invoice.paid', 'Invoice', event.invoiceId, event));
    eventBus.on('invoice.partiallyPaid', (event) => this.executeTrigger('invoice.partiallyPaid', 'Invoice', event.invoiceId, event));
    eventBus.on('invoice.statusChanged', (event) => {
      const status = cleanStatus(event.newStatus);
      if (status === 'PAID') this.executeTrigger('invoice.paid', 'Invoice', event.invoiceId, event);
      else if (status === 'PARTIALLY_PAID') this.executeTrigger('invoice.partiallyPaid', 'Invoice', event.invoiceId, event);
      else if (status === 'CANCELLED' || status === 'CANCELED') this.executeTrigger('invoice.cancelled', 'Invoice', event.invoiceId, event);
      else this.executeTrigger('invoice.status.changed', 'Invoice', event.invoiceId, event);
    });
    eventBus.on('payment.received', (event) => this.executeTrigger('payment.received', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('payment.failed', (event) => this.executeTrigger('payment.failed', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('payment.refunded', (event) => this.executeTrigger('payment.refunded', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('payment.partially_refunded', (event) => this.executeTrigger('payment.partially_refunded', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('payment.partiallyRefunded', (event) => this.executeTrigger('payment.partiallyRefunded', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('payment.voided', (event) => this.executeTrigger('payment.voided', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('customer.created', (event) => this.executeTrigger('customer.created', 'Customer', event.customerId || event.clientId || '', event));
    eventBus.on('customer.activated', (event) => this.executeTrigger('customer.activated', 'Customer', event.customerId || event.clientId || '', event));
    eventBus.on('onboarding.started', (event) => this.executeTrigger('onboarding.started', 'Customer', event.customerId || event.clientId || '', event));
    eventBus.on('onboarding.completed', (event) => this.executeTrigger('onboarding.completed', 'Customer', event.customerId || event.clientId || '', event));
    eventBus.on('customer.followupDue', (event) => this.executeTrigger('customer.followupDue', 'Customer', event.customerId || event.clientId || '', event));
    eventBus.on('expense.created', (event) => this.executeTrigger('expense.created', 'Expense', event.expenseId, event));
    eventBus.on('expense.updated', (event) => this.executeTrigger('expense.updated', 'Expense', event.expenseId, event));
    eventBus.on('expense.approved', (event) => this.executeTrigger('expense.approved', 'Expense', event.expenseId, event));
    eventBus.on('expense.deleted', (event) => this.executeTrigger('expense.deleted', 'Expense', event.expenseId, event));

    this.startScheduler();
  }

  startScheduler() {
    if (this.schedulerStarted) return;
    this.schedulerStarted = true;
    const tick = () => this.processDueReminders().catch((error) => logger.error('[SalesAutomation] Reminder scheduler failed', { error }));
    setInterval(tick, 60 * 1000);
  }

  async listRules(tenantId: string, query: Record<string, any> = {}) {
    return db.salesAutomationRule.findMany({
      where: { tenantId, ...(query.triggerType ? { triggerType: String(query.triggerType) } : {}) },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(Number(query.limit || 200), 500),
    });
  }

  async createRule(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    if (!data.name || !data.triggerType) throw new BadRequestError('Rule name and trigger type are required', ErrorCodes.VALIDATION_FAILED);
    return db.salesAutomationRule.create({
      data: {
        tenantId,
        name: String(data.name),
        description: data.description || null,
        triggerType: String(data.triggerType),
        conditions: data.conditions || {},
        actions: Array.isArray(data.actions) ? data.actions : [],
        isActive: data.isActive !== false,
        priority: Number(data.priority || 100),
        runOncePerEntity: Boolean(data.runOncePerEntity),
        createdById: actorUserId || null,
      },
    });
  }

  async getRule(tenantId: string, id: string) {
    const rule = await db.salesAutomationRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundError('Automation rule not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return rule;
  }

  async updateRule(tenantId: string, id: string, data: Record<string, any>) {
    await this.getRule(tenantId, id);
    return db.salesAutomationRule.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        conditions: data.conditions,
        actions: data.actions,
        isActive: data.isActive,
        priority: data.priority !== undefined ? Number(data.priority) : undefined,
        runOncePerEntity: data.runOncePerEntity,
      },
    });
  }

  async deleteRule(tenantId: string, id: string) {
    await this.getRule(tenantId, id);
    return db.salesAutomationRule.delete({ where: { id } });
  }

  async setRuleActive(tenantId: string, id: string, isActive: boolean) {
    await this.getRule(tenantId, id);
    return db.salesAutomationRule.update({ where: { id }, data: { isActive } });
  }

  async listRuns(tenantId: string, query: Record<string, any> = {}) {
    return db.salesAutomationRun.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: String(query.status).toUpperCase() } : {}),
        ...(query.triggerType ? { triggerType: String(query.triggerType) } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(query.limit || 200), 500),
    });
  }

  async retryRun(tenantId: string, runId: string, actorUserId?: string) {
    const run = await db.salesAutomationRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundError('Automation run not found for this tenant', ErrorCodes.RESOURCE_NOT_FOUND);
    if (String(run.status).toUpperCase() !== 'FAILED') {
      throw new BadRequestError('Only failed automation runs can be retried', ErrorCodes.VALIDATION_FAILED);
    }

    const originalInput = run.input && typeof run.input === 'object' && !Array.isArray(run.input) ? run.input : {};
    const idempotencyKey = String((originalInput as any).idempotencyKey || '').trim();
    if (!idempotencyKey) {
      throw new BadRequestError('Automation run does not include a retryable idempotency key', ErrorCodes.VALIDATION_FAILED);
    }

    const key = await automationIdempotencyService.assertRetryAllowedByKey(tenantId, idempotencyKey);
    activityLogger.log({
      tenantId,
      entityType: run.entityType,
      entityId: run.entityId,
      action: 'UPDATE',
      module: 'automation',
      description: `Retry requested for failed automation run "${run.triggerType}"`,
      userId: actorUserId,
      metadata: {
        runId,
        idempotencyKey,
        retryCount: Number(key.retryCount || 0),
        lastError: key.error || run.error || null,
      },
    });

    const { tenantId: _ignoredTenantId, ...safeInput } = originalInput as Record<string, any>;
    await this.executeTrigger(run.triggerType, run.entityType, run.entityId, {
      ...safeInput,
      tenantId,
      retryOfRunId: run.id,
      retryIdempotencyKey: idempotencyKey,
    });

    const refreshedKey = await automationIdempotencyService.getByKey(tenantId, idempotencyKey);
    return {
      retried: true,
      runId,
      triggerType: run.triggerType,
      entityType: run.entityType,
      entityId: run.entityId,
      idempotencyKey,
      idempotencyStatus: refreshedKey?.status || null,
      retryCount: Number(refreshedKey?.retryCount || 0),
    };
  }

  async listReminders(tenantId: string, query: Record<string, any> = {}) {
    return db.salesReminderSchedule.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: String(query.status).toUpperCase() } : {}),
        ...(query.entityType ? { entityType: String(query.entityType) } : {}),
        ...(query.entityId ? { entityId: String(query.entityId) } : {}),
      },
      orderBy: { scheduledFor: 'asc' },
      take: Math.min(Number(query.limit || 300), 500),
    });
  }

  async cancelReminder(tenantId: string, id: string) {
    const reminder = await db.salesReminderSchedule.findFirst({ where: { id, tenantId } });
    if (!reminder) throw new NotFoundError('Reminder not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return db.salesReminderSchedule.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
  }

  async seedDefaults(tenantId: string, actorUserId?: string) {
    const created = [];
    for (const rule of DEFAULT_RULES) {
      const existing = await db.salesAutomationRule.findFirst({ where: { tenantId, name: rule.name, triggerType: rule.triggerType } });
      if (existing) continue;
      created.push(await db.salesAutomationRule.create({
        data: {
          tenantId,
          ...rule,
          conditions: {},
          actions: [...rule.actions],
          createdById: actorUserId || null,
        },
      }));
    }
    return { created: created.length };
  }

  async testTrigger(tenantId: string, body: Record<string, any>, actorUserId?: string) {
    const triggerType = String(body.triggerType || '').trim();
    const entityId = String(body.entityId || '').trim();
    const config = TEST_TRIGGER_ENTITY_MODELS[entityKey(body.entityType)];
    if (!triggerType) throw new BadRequestError('triggerType is required', ErrorCodes.VALIDATION_FAILED);
    if (!config) throw new BadRequestError('Unsupported automation entity type', ErrorCodes.VALIDATION_FAILED);
    if (!entityId) throw new BadRequestError('entityId is required', ErrorCodes.VALIDATION_FAILED);

    const delegate = db[config.model];
    if (!delegate?.findFirst) throw new BadRequestError('Automation entity type is not available', ErrorCodes.VALIDATION_FAILED);
    const entity = await delegate.findFirst({ where: { id: entityId, tenantId } });
    if (!entity) throw new NotFoundError(`${config.entityType} not found for this tenant`, ErrorCodes.RESOURCE_NOT_FOUND);

    const rawInput = body.input && typeof body.input === 'object' && !Array.isArray(body.input) ? body.input : {};
    const { tenantId: _ignoredTenantId, ...safeInput } = rawInput;
    const input = { ...safeInput, tenantId, [config.idField]: entityId };
    const rules = await this.resolveRulesForTest(tenantId, triggerType, input);
    const plannedActions = this.planActions(triggerType, config.entityType, entityId, input, rules);
    const mode = body.execute === true || body.mode === 'execute' ? 'execute' : 'dry-run';

    if (mode !== 'execute') {
      return {
        mode: 'dry-run',
        executed: false,
        triggerType,
        entityType: config.entityType,
        entityId,
        plannedActions,
        matchingRules: rules.map((rule: any) => ({ id: rule.id || null, name: rule.name || null, actions: rule.actions || [], source: rule.source || 'saved' })),
      };
    }

    activityLogger.log({
      tenantId,
      entityType: config.entityType,
      entityId,
      action: 'CREATE',
      module: 'automation',
      description: `Executed automation test trigger "${triggerType}"`,
      userId: actorUserId,
      metadata: { triggerType, entityType: config.entityType, plannedActions: plannedActions.map((action) => action.action) },
    });
    await this.executeTrigger(triggerType, config.entityType, entityId, input);
    return {
      mode: 'execute',
      executed: true,
      triggerType,
      entityType: config.entityType,
      entityId,
      plannedActions,
    };
  }

  async executeTrigger(triggerType: string, entityType: string, entityId: string, input: Record<string, any>) {
    const tenantId = input.tenantId;
    if (!tenantId || !entityId) return;
    await this.seedDefaults(tenantId).catch(() => null);
    const rules = await db.salesAutomationRule.findMany({ where: { tenantId, triggerType, isActive: true }, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] });
    if (!rules.length) {
      await this.recordRun({ tenantId, triggerType, entityType, entityId, status: 'SKIPPED', input, output: { reason: 'No active rules' } });
      return;
    }
    for (const rule of rules) {
      const previous = rule.runOncePerEntity ? await db.salesAutomationRun.findFirst({ where: { tenantId, ruleId: rule.id, entityType, entityId, status: 'SUCCESS' } }) : null;
      if (previous) {
        await this.recordRun({ tenantId, ruleId: rule.id, triggerType, entityType, entityId, status: 'SKIPPED', input, output: { reason: 'Already ran for entity' } });
        continue;
      }
      if (!this.conditionsMatch(rule.conditions || {}, input)) {
        await this.recordRun({ tenantId, ruleId: rule.id, triggerType, entityType, entityId, status: 'SKIPPED', input, output: { reason: 'Conditions did not match' } });
        continue;
      }
      const run = await this.recordRun({ tenantId, ruleId: rule.id, triggerType, entityType, entityId, status: 'RUNNING', input, startedAt: new Date() });
      try {
        const output = await this.applyBuiltInActions(triggerType, entityType, entityId, input, rule.actions || []);
        await db.salesAutomationRun.update({ where: { id: run.id }, data: { status: 'SUCCESS', finishedAt: new Date(), output } });
      } catch (error) {
        logger.error('[SalesAutomation] Rule failed', { tenantId, triggerType, entityType, entityId, ruleId: rule.id, error });
        await db.salesAutomationRun.update({ where: { id: run.id }, data: { status: 'FAILED', finishedAt: new Date(), error: (error as Error)?.message || String(error) } });
      }
    }
  }

  conditionsMatch(conditions: Record<string, any>, input: Record<string, any>) {
    const entries = Object.entries(conditions || {});
    if (!entries.length) return true;
    return entries.every(([key, expected]) => {
      const value = input[key];
      if (expected && typeof expected === 'object') {
        if (expected.equals !== undefined) return value === expected.equals;
        if (expected.notEquals !== undefined) return value !== expected.notEquals;
        if (expected.exists !== undefined) return expected.exists ? value !== undefined && value !== null && value !== '' : value === undefined || value === null || value === '';
        if (expected.greaterThan !== undefined) return Number(value) > Number(expected.greaterThan);
        if (expected.lessThan !== undefined) return Number(value) < Number(expected.lessThan);
      }
      return value === expected;
    });
  }

  private async resolveRulesForTest(tenantId: string, triggerType: string, input: Record<string, any>) {
    const savedRules = await db.salesAutomationRule.findMany({
      where: { tenantId, triggerType, isActive: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    const matchingSaved = savedRules.filter((rule: any) => this.conditionsMatch(rule.conditions || {}, input));
    if (matchingSaved.length) return matchingSaved;
    return DEFAULT_RULES
      .filter((rule) => rule.triggerType === triggerType)
      .map((rule, index) => ({ id: `default:${triggerType}:${index}`, name: rule.name, actions: [...rule.actions], conditions: {}, source: 'default' }));
  }

  private planActions(triggerType: string, entityType: string, entityId: string, input: Record<string, any>, rules: any[]) {
    const actions = new Map<string, Record<string, any>>();
    const add = (action: string, details: Record<string, any> = {}) => actions.set(action, { action, triggerType, entityType, entityId, ...details });
    for (const rule of rules) {
      for (const configuredAction of rule.actions || []) {
        add(String(configuredAction), { ruleId: rule.id || null, ruleName: rule.name || null });
      }
    }
    if (triggerType === 'lead.created') {
      add('create_followup_task', { channel: 'TASK', dueInBusinessDays: 1, leadId: input.leadId || entityId });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'lead.stale') {
      add('create_stale_lead_task', { channel: 'TASK', leadId: input.leadId || entityId });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'lead.converted') {
      add('create_conversion_followup_task', { channel: 'TASK', leadId: input.leadId || entityId, dealId: input.dealId || null });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'deal.created') {
      add('create_first_deal_task', { channel: 'TASK', dealId: input.dealId || input.projectId || entityId });
      add('create_deal_document_folder', { dealId: input.dealId || input.projectId || entityId });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'deal.stageChanged' || triggerType === 'deal.stage.changed') {
      add('create_stage_followup_task', { channel: 'TASK', dealId: input.dealId || input.projectId || entityId, stage: input.newStageName || input.newStageSlug || null });
      add('schedule_stage_reminder', { channel: 'TASK' });
    }
    if (triggerType === 'deal.won') {
      add('start_customer_onboarding', { channel: 'TASK' });
    }
    if (triggerType === 'deal.lost') {
      add('cancel_deal_reminders');
      add('create_lost_nurture_task', { channel: 'TASK' });
    }
    if (triggerType === 'deal.stale') {
      add('create_stale_deal_task', { channel: 'TASK' });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'proposal.sent') {
      add('update_deal_stage', { stage: 'Proposal Sent' });
      add('send_proposal_email', { channel: 'EMAIL' });
      add('save_proposal_document', { documentType: 'pdf', linkedEntityType: 'Proposal', linkedEntityId: input.proposalId || entityId });
      add('schedule_proposal_followup_1d', { channel: 'TASK', dueInDays: 1 });
      add('schedule_proposal_followup_2d', { channel: 'NOTIFICATION', dueInDays: 2 });
    }
    if (triggerType === 'proposal.accepted') {
      add('save_accepted_proposal_document', { documentType: 'pdf', linkedEntityType: 'Proposal', linkedEntityId: input.proposalId || entityId });
      add('mark_deal_won');
      add('create_onboarding_task', { channel: 'TASK' });
    }
    if (triggerType === 'proposal.declined') {
      add('create_declined_followup_task', { channel: 'TASK' });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'proposal.expired') {
      add('cancel_proposal_reminders');
      add('create_expired_followup_task', { channel: 'TASK' });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'contract.sent') {
      add('send_contract_email', { channel: 'EMAIL' });
      add('save_contract_document', { documentType: 'pdf', linkedEntityType: 'Contract', linkedEntityId: input.contractId || entityId });
      add('schedule_contract_signing_reminder_1d', { channel: 'EMAIL', dueInDays: 1 });
      add('schedule_contract_signing_reminder_3d', { channel: 'NOTIFICATION', dueInDays: 3 });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'contract.signed') {
      add('save_signed_contract_document', { documentType: 'pdf', linkedEntityType: 'Contract', linkedEntityId: input.contractId || entityId });
      add('cancel_contract_reminders');
      add('update_deal_stage', { stage: 'Won' });
      add('create_invoice_draft');
      add('start_customer_onboarding', { channel: 'TASK' });
      add('update_customer_lifecycle');
    }
    if (triggerType === 'contract.declined') {
      add('create_contract_declined_followup_task', { channel: 'TASK' });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'contract.expiring' || triggerType === 'contract.expired') {
      add('create_contract_renewal_task', { channel: 'TASK' });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'invoice.created') {
      add('save_invoice_document', { documentType: 'pdf', linkedEntityType: 'Invoice', linkedEntityId: input.invoiceId || entityId, status: 'DRAFT' });
      add('create_activity_log');
    }
    if (triggerType === 'invoice.sent') {
      add('save_invoice_document', { documentType: 'pdf', linkedEntityType: 'Invoice', linkedEntityId: input.invoiceId || entityId });
      add('schedule_invoice_due_soon_reminder', { channel: 'NOTIFICATION' });
      add('schedule_invoice_due_today_reminder', { channel: 'NOTIFICATION' });
      add('schedule_invoice_overdue_task', { channel: 'TASK' });
      add('schedule_invoice_escalation_reminder', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'invoice.partiallyPaid') {
      add('sync_bookkeeping_income');
      add('schedule_invoice_remaining_balance_reminders');
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'invoice.paid' || triggerType === 'payment.received') {
      add('sync_bookkeeping_income');
      add('cancel_invoice_reminders');
      add('start_customer_onboarding', { channel: 'TASK' });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'customer.followupDue') {
      add('create_customer_followup_task', { channel: 'TASK' });
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (['expense.created', 'expense.updated', 'expense.approved'].includes(triggerType)) {
      add('sync_bookkeeping_expense');
    }
    if (['payment.failed', 'payment.refunded', 'payment.partially_refunded', 'payment.partiallyRefunded', 'payment.voided'].includes(triggerType)) {
      add('sync_bookkeeping_reversal');
      add('notify_accounting', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'expense.deleted') {
      add('void_bookkeeping_expense');
    }
    if (triggerType === 'bookkeeping.sync.failed') {
      add('notify_admin', { channel: 'NOTIFICATION' });
    }
    return Array.from(actions.values());
  }

  private async recordRun(data: Record<string, any>) {
    return db.salesAutomationRun.create({
      data: {
        tenantId: data.tenantId,
        ruleId: data.ruleId || null,
        triggerType: data.triggerType,
        entityType: data.entityType,
        entityId: data.entityId,
        status: data.status,
        startedAt: data.startedAt || null,
        finishedAt: data.finishedAt || (['SUCCESS', 'FAILED', 'SKIPPED'].includes(data.status) ? new Date() : null),
        error: data.error || null,
        input: data.input || {},
        output: data.output || {},
      },
    });
  }

  private async runSideEffect<T>(
    tenantId: string,
    eventName: string,
    entityType: string,
    entityId: string,
    actionType: string,
    module: string,
    fn: () => Promise<T>,
    input: Record<string, any> = {},
  ) {
    return automationOrchestratorService.runSideEffect(
      { tenantId, eventName, entityType, entityId, actionType, module, input },
      fn,
    );
  }

  private async applyBuiltInActions(triggerType: string, entityType: string, entityId: string, input: Record<string, any>, actions: any[]) {
    const output: Record<string, any> = { actions: [] };
    if (triggerType === 'lead.created') {
      await this.createLeadFollowUp(input);
      await this.notifyOwner(
        input.tenantId,
        input.ownerUserId,
        'New lead assigned',
        `${input.leadName || 'A new lead'} needs follow-up.`,
        `/leads/${entityId}`,
        this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'),
        triggerType,
        entityType,
        entityId,
      );
      await this.scoreLead(input.tenantId, input.leadId || entityId, triggerType);
      await this.flagDuplicateLead(input.tenantId, input.leadId || entityId, input);
      output.actions.push('lead_followup_created', 'lead_scored', 'duplicate_checked');
    }
    if (triggerType === 'lead.stale') {
      await this.createTaskOnce(input.tenantId, {
        eventName: triggerType,
        entityType,
        entityId,
        actionType: 'stale-lead-task',
        title: `Reconnect with stale lead: ${input.leadName || 'Lead'}`,
        description: `This lead has had no recent activity${input.daysInactive ? ` for ${input.daysInactive} days` : ''}. Review the timeline and plan the next outreach.`,
        priority: 'HIGH',
        dueDate: addBusinessDays(new Date(), 1),
        assignedToId: input.ownerId || null,
        leadId: input.leadId || entityId,
        referenceDoctype: 'SalesAutomation',
        referenceDocname: `${input.leadId || entityId}:stale-lead`,
      });
      await this.notifyOwner(input.tenantId, input.ownerUserId, 'Lead needs follow-up', `${input.leadName || 'A lead'} has gone stale.`, `/leads/${input.leadId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId);
      output.actions.push('stale_lead_task_created');
    }
    if (triggerType === 'lead.contacted') {
      await this.createTaskOnce(input.tenantId, {
        eventName: triggerType,
        entityType,
        entityId,
        actionType: 'contacted-next-followup-task',
        title: `Next follow-up: ${input.leadName || 'Lead'}`,
        description: 'Lead was contacted. Confirm next step, demo timing, or qualification details.',
        priority: 'MEDIUM',
        dueDate: addBusinessDays(new Date(), 2),
        assignedToId: input.ownerId || null,
        leadId: input.leadId || entityId,
        referenceDoctype: 'SalesAutomation',
        referenceDocname: `${input.leadId || entityId}:contacted-next-followup`,
      });
      await this.scheduleReminder(input.tenantId, 'Lead', input.leadId || entityId, 'lead.no-response', addDays(new Date(), 3), 'NOTIFICATION', {
        ...input,
        ownerUserId: input.ownerUserId,
      });
      await this.scoreLead(input.tenantId, input.leadId || entityId, triggerType);
      output.actions.push('lead_contacted_followup_scheduled', 'lead_scored');
    }
    if (triggerType === 'lead.qualified') {
      await this.createQualifiedLeadDealTask(input.tenantId, input.leadId || entityId, input);
      await this.notifyOwner(input.tenantId, input.ownerUserId, 'Lead qualified', `${input.leadName || 'A lead'} is ready for a deal follow-up.`, `/leads/${input.leadId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId);
      await this.scoreLead(input.tenantId, input.leadId || entityId, triggerType);
      output.actions.push('qualified_lead_deal_task_created', 'lead_scored');
    }
    if (triggerType === 'lead.converted') {
      await this.createTaskOnce(input.tenantId, {
        eventName: triggerType,
        entityType,
        entityId,
        actionType: 'conversion-followup-task',
        title: `Review converted lead handoff: ${input.leadName || 'Lead'}`,
        description: 'Confirm the company, contact, deal, and next sales step are linked correctly.',
        priority: 'MEDIUM',
        dueDate: addBusinessDays(new Date(), 1),
        assignedToId: input.ownerId || null,
        leadId: input.leadId || entityId,
        clientId: input.clientId || null,
        projectId: input.dealId || null,
        referenceDoctype: 'SalesAutomation',
        referenceDocname: `${input.leadId || entityId}:converted-handoff`,
      });
      await this.notifyOwner(input.tenantId, input.ownerUserId, 'Lead converted', `${input.leadName || 'A lead'} was converted.`, input.dealId ? `/deals?dealId=${input.dealId}` : `/leads/${input.leadId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId);
      output.actions.push('lead_conversion_handoff_created');
    }
    if (triggerType === 'lead.disqualified') {
      if (!input.reason) throw new BadRequestError('Disqualified lead reason is required', ErrorCodes.VALIDATION_FAILED);
      await this.cancelEntityReminders(input.tenantId, 'Lead', input.leadId || entityId);
      await this.createTaskOnce(input.tenantId, {
        eventName: triggerType,
        entityType,
        entityId,
        actionType: 'disqualified-nurture-task',
        title: `Nurture follow-up: ${input.leadName || 'Disqualified lead'}`,
        description: `Lead was disqualified. Reason: ${input.reason}. Revisit later if timing or fit changes.`,
        priority: 'LOW',
        dueDate: addDays(new Date(), 30),
        assignedToId: input.ownerId || null,
        leadId: input.leadId || entityId,
        referenceDoctype: 'SalesAutomation',
        referenceDocname: `${input.leadId || entityId}:disqualified-nurture`,
      });
      output.actions.push('lead_reminders_cancelled', 'lead_nurture_task_created');
    }
    if (triggerType === 'deal.created') {
      await this.handleDealCreated(entityId, input, output);
    }
    if (triggerType === 'deal.stageChanged' || triggerType === 'deal.stage.changed') {
      await this.handleDealStageChanged(entityId, input, output);
    }
    if (triggerType === 'deal.won') {
      await this.startCustomerSuccessOnboarding(input.tenantId, 'deal.won', 'Deal', entityId, input);
      await this.createDealWorkflowTask(input.tenantId, entityId, { ...input, triggerType }, 'won-next-workflow', 'Prepare contract and invoice workflow', 'Deal is won. Confirm contract, invoice draft, billing handoff, and onboarding timing.', 'HIGH', 1);
      output.actions.push('deal_onboarding_task_created', 'deal_won_next_workflow_created');
    }
    if (triggerType === 'deal.lost') {
      if (!input.lostReason) throw new BadRequestError('Lost reason is required when a deal is marked Lost', ErrorCodes.VALIDATION_FAILED);
      await this.cancelEntityReminders(input.tenantId, 'Deal', input.dealId || input.projectId || entityId);
      await this.createDealWorkflowTask(input.tenantId, entityId, { ...input, triggerType }, 'lost-nurture-task', 'Plan nurture follow-up', `Deal was lost. Reason: ${input.lostReason}. Revisit if timing or fit changes.`, 'LOW', 30);
      output.actions.push('deal_reminders_cancelled', 'deal_lost_nurture_task_created');
    }
    if (triggerType === 'deal.stale') {
      await this.createDealWorkflowTask(input.tenantId, entityId, { ...input, triggerType }, 'stale-deal-task', 'Reconnect with stalled deal', `This deal has had no recent activity${input.daysInactive ? ` for ${input.daysInactive} days` : ''}. Review the next step and follow up.`, 'HIGH', 1);
      await this.notifyOwner(input.tenantId, input.ownerUserId, 'Deal needs follow-up', `${input.dealName || input.projectName || 'A deal'} has stalled.`, `/deals/${input.dealId || input.projectId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId);
      if (input.escalate) {
        await this.notifyAdmins(input.tenantId, 'Stalled deal needs attention', `${input.dealName || input.projectName || 'A deal'} needs manager review.`, `/deals/${input.dealId || input.projectId || entityId}`);
      }
      output.actions.push('deal_stale_task_created', 'deal_stale_owner_notified');
    }
    if (triggerType === 'proposal.sent') {
      const proposalContext = await this.loadProposalContext(input.tenantId, input.proposalId || entityId);
      await this.updateProposalDealStage(input.tenantId, input.proposalId || entityId, proposalContext, 'Proposal Sent', triggerType);
      await this.runSideEffect(
        input.tenantId,
        triggerType,
        'Proposal',
        input.proposalId || entityId,
        'save-proposal-pdf-document',
        'documents',
        () => proposalsService.saveProposalPdfToDocuments(input.tenantId, input.proposalId || entityId, input.salesRepId, 'sent'),
        input,
      ).catch((error) => {
        logger.warn('[SalesAutomation] Proposal PDF document save failed', { tenantId: input.tenantId, proposalId: input.proposalId || entityId, error: (error as Error)?.message || String(error) });
      });
      await this.sendProposalEmail(input.tenantId, input.proposalId || entityId, { ...input, proposal: proposalContext });
      await this.scheduleReminder(input.tenantId, 'Proposal', entityId, 'proposal.followup.1d', addDays(new Date(), 1), 'TASK', input);
      await this.scheduleReminder(input.tenantId, 'Proposal', entityId, 'proposal.followup.2d', addDays(new Date(), 2), 'NOTIFICATION', input);
      await this.notifyOwner(input.tenantId, input.ownerUserId || proposalContext?.lead?.assignedTo?.userId, 'Proposal sent', `${proposalContext?.proposalNumber || 'Proposal'} was sent.`, `/proposals/${input.proposalId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId);
      output.actions.push('proposal_deal_stage_updated', 'proposal_pdf_saved', 'proposal_email_sent', 'proposal_followups_scheduled');
    }
    if (triggerType === 'proposal.viewed') {
      const proposalContext = await this.loadProposalContext(input.tenantId, input.proposalId || entityId);
      await this.notifyOwner(input.tenantId, input.ownerUserId || proposalContext?.lead?.assignedTo?.userId, 'Proposal viewed', `${proposalContext?.proposalNumber || 'Proposal'} was viewed.`, `/proposals/${input.proposalId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, `owner-notification:${input.viewCount || 1}`), triggerType, entityType, entityId);
      output.actions.push('proposal_view_owner_notified');
    }
    if (triggerType === 'proposal.accepted') {
      const proposalContext = await this.loadProposalContext(input.tenantId, input.proposalId || entityId);
      await this.updateProposalDealStage(input.tenantId, input.proposalId || entityId, proposalContext, 'Won', triggerType);
      await this.cancelEntityReminders(input.tenantId, 'Proposal', input.proposalId || entityId);
      await this.runSideEffect(
        input.tenantId,
        triggerType,
        'Proposal',
        input.proposalId || entityId,
        'save-accepted-proposal-pdf-document',
        'documents',
        () => proposalsService.saveProposalPdfToDocuments(input.tenantId, input.proposalId || entityId, input.salesRepId, 'accepted'),
        input,
      ).catch((error) => {
        logger.warn('[SalesAutomation] Accepted proposal PDF document save failed', { tenantId: input.tenantId, proposalId: input.proposalId || entityId, error: (error as Error)?.message || String(error) });
      });
      await this.createContractFromProposal(input.tenantId, input.proposalId || entityId, proposalContext, input);
      await this.createDraftInvoiceFromProposal(input.tenantId, input.proposalId || entityId, proposalContext, input);
      await this.handleProposalAccepted(input);
      await this.notifyOwner(input.tenantId, input.ownerUserId || proposalContext?.lead?.assignedTo?.userId, 'Proposal accepted', `${proposalContext?.proposalNumber || 'Proposal'} was accepted.`, `/proposals/${input.proposalId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId, 'SUCCESS');
      await this.createProposalFollowupTask(input.tenantId, input.proposalId || entityId, proposalContext, 'accepted-next-step-task', 'Confirm accepted proposal next step', 'Proposal accepted. Confirm contract, invoice, kickoff date, and customer handoff.', 'HIGH', 1, triggerType);
      output.actions.push('proposal_deal_won', 'proposal_reminders_cancelled', 'accepted_proposal_pdf_saved', 'proposal_acceptance_handoff');
    }
    if (triggerType === 'proposal.declined') {
      const proposalContext = await this.loadProposalContext(input.tenantId, input.proposalId || entityId);
      await this.notifyOwner(input.tenantId, input.ownerUserId || proposalContext?.lead?.assignedTo?.userId, 'Proposal declined', `${proposalContext?.proposalNumber || 'Proposal'} was declined${input.reason ? `: ${input.reason}` : '.'}`, `/proposals/${input.proposalId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId, 'WARNING');
      await this.createProposalFollowupTask(input.tenantId, input.proposalId || entityId, proposalContext, 'declined-followup-task', 'Follow up on declined proposal', 'Proposal was declined. Review feedback, objections, and whether this should move to negotiation or lost.', 'HIGH', 1, triggerType);
      output.actions.push('proposal_declined_followup_created');
    }
    if (triggerType === 'proposal.expired') {
      const proposalContext = await this.loadProposalContext(input.tenantId, input.proposalId || entityId);
      await this.cancelEntityReminders(input.tenantId, 'Proposal', input.proposalId || entityId);
      await this.notifyOwner(input.tenantId, input.ownerUserId || proposalContext?.lead?.assignedTo?.userId, 'Proposal expired', `${proposalContext?.proposalNumber || 'Proposal'} expired without acceptance.`, `/proposals/${input.proposalId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId, 'WARNING');
      await this.createProposalFollowupTask(input.tenantId, input.proposalId || entityId, proposalContext, 'expired-followup-task', 'Follow up on expired proposal', 'Proposal expired. Confirm whether to revise, resend, or close the deal.', 'HIGH', 1, triggerType);
      output.actions.push('proposal_expired_reminders_cancelled', 'proposal_expired_followup_created');
    }
    if (triggerType === 'contract.sent') {
      const contractContext = await this.loadContractContext(input.tenantId, input.contractId || entityId);
      await this.runSideEffect(
        input.tenantId,
        triggerType,
        'Contract',
        input.contractId || entityId,
        'save-sent-contract-pdf-document',
        'documents',
        () => contractsService.saveContractPdfToDocuments(input.tenantId, input.contractId || entityId, input.ownerUserId, 'sent'),
        input,
      ).catch((error) => {
        logger.warn('[SalesAutomation] Contract PDF document save failed', { tenantId: input.tenantId, contractId: input.contractId || entityId, variant: 'sent', error: (error as Error)?.message || String(error) });
      });
      await this.sendContractEmail(input.tenantId, input.contractId || entityId, { ...input, contract: contractContext });
      await this.scheduleReminder(input.tenantId, 'Contract', input.contractId || entityId, 'contract.signing.1d', addDays(new Date(), 1), 'EMAIL', { ...input, recipientEmail: input.recipientEmail || contractContext?.client?.primaryEmail || contractContext?.client?.email });
      await this.scheduleReminder(input.tenantId, 'Contract', input.contractId || entityId, 'contract.signing.3d', addDays(new Date(), 3), 'NOTIFICATION', input);
      await this.notifyOwner(input.tenantId, input.ownerUserId || contractContext?.createdBy?.userId, 'Contract sent', `${contractContext?.contractNumber || 'Contract'} was sent.`, `/contracts/${input.contractId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId);
      output.actions.push('sent_contract_pdf_saved', 'contract_email_sent', 'contract_signing_reminders_scheduled');
    }
    if (triggerType === 'contract.viewed') {
      const contractContext = await this.loadContractContext(input.tenantId, input.contractId || entityId);
      await this.notifyOwner(input.tenantId, input.ownerUserId || contractContext?.createdBy?.userId, 'Contract viewed', `${contractContext?.contractNumber || 'Contract'} was viewed.`, `/contracts/${input.contractId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, `owner-notification:${input.viewCount || 1}`), triggerType, entityType, entityId);
      output.actions.push('contract_view_owner_notified');
    }
    if (triggerType === 'contract.signed') {
      const contractContext = await this.loadContractContext(input.tenantId, input.contractId || entityId);
      await this.runSideEffect(
        input.tenantId,
        triggerType,
        'Contract',
        input.contractId || entityId,
        'save-signed-contract-pdf-document',
        'documents',
        () => contractsService.saveContractPdfToDocuments(input.tenantId, input.contractId || entityId, input.ownerUserId, 'signed'),
        input,
      ).catch((error) => {
        logger.warn('[SalesAutomation] Contract PDF document save failed', { tenantId: input.tenantId, contractId: input.contractId || entityId, variant: 'signed', error: (error as Error)?.message || String(error) });
      });
      await this.cancelEntityReminders(input.tenantId, 'Contract', input.contractId || entityId);
      await this.updateContractDealStage(input.tenantId, input.contractId || entityId, contractContext, 'Won', triggerType);
      await this.createDraftInvoiceFromContract(input.tenantId, input.contractId || entityId, contractContext, input);
      await this.updateContractCustomerLifecycle(input.tenantId, input.contractId || entityId, contractContext);
      await this.startCustomerSuccessOnboarding(input.tenantId, 'contract.signed', 'Contract', input.contractId || entityId, { ...input, contract: contractContext });
      await this.notifyOwner(input.tenantId, input.ownerUserId || contractContext?.createdBy?.userId, 'Contract signed', `${contractContext?.contractNumber || 'Contract'} was signed.`, `/contracts/${input.contractId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId, 'SUCCESS');
      output.actions.push('signed_contract_pdf_saved', 'contract_reminders_cancelled', 'contract_deal_won', 'contract_customer_lifecycle_updated');
    }
    if (triggerType === 'contract.declined') {
      const contractContext = await this.loadContractContext(input.tenantId, input.contractId || entityId);
      await this.createContractFollowupTask(input.tenantId, input.contractId || entityId, contractContext, 'declined-followup-task', 'Follow up on declined contract', 'Contract was declined. Review feedback, objections, and whether the deal should return to negotiation.', 'HIGH', 1, triggerType);
      await this.notifyOwner(input.tenantId, input.ownerUserId || contractContext?.createdBy?.userId, 'Contract declined', `${contractContext?.contractNumber || 'Contract'} was declined${input.reason ? `: ${input.reason}` : '.'}`, `/contracts/${input.contractId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId, 'WARNING');
      output.actions.push('contract_declined_followup_created');
    }
    if (triggerType === 'contract.expiring' || triggerType === 'contract.expired') {
      const contractContext = await this.loadContractContext(input.tenantId, input.contractId || entityId);
      const actionType = triggerType === 'contract.expired' ? 'expired-followup-task' : 'expiring-renewal-task';
      const title = triggerType === 'contract.expired' ? 'Review expired contract' : 'Prepare contract renewal';
      const description = triggerType === 'contract.expired'
        ? 'Contract has expired. Review renewal, replacement agreement, or account follow-up.'
        : 'Contract is approaching expiry. Prepare renewal or extension discussion.';
      await this.createContractFollowupTask(input.tenantId, input.contractId || entityId, contractContext, actionType, title, description, 'HIGH', 1, triggerType);
      await this.notifyOwner(input.tenantId, input.ownerUserId || contractContext?.createdBy?.userId, triggerType === 'contract.expired' ? 'Contract expired' : 'Contract expiring soon', `${contractContext?.contractNumber || 'Contract'} ${triggerType === 'contract.expired' ? 'has expired.' : 'is expiring soon.'}`, `/contracts/${input.contractId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, entityType, entityId, 'owner-notification'), triggerType, entityType, entityId, 'WARNING');
      output.actions.push('contract_expiry_followup_created');
    }
    if (triggerType === 'invoice.created') {
      await this.runSideEffect(
        input.tenantId,
        triggerType,
        'Invoice',
        input.invoiceId || entityId,
        'save-draft-invoice-pdf-document',
        'documents',
        () => invoicesService.saveInvoicePdfToDocuments(input.tenantId, input.invoiceId || entityId, input.actorUserId || input.ownerUserId),
        input,
      ).catch((error) => {
        logger.warn('[SalesAutomation] Draft invoice PDF document save failed', { tenantId: input.tenantId, invoiceId: input.invoiceId || entityId, error: (error as Error)?.message || String(error) });
      });
      output.actions.push('draft_invoice_pdf_saved');
    }
    if (triggerType === 'invoice.sent') {
      await this.runSideEffect(
        input.tenantId,
        triggerType,
        'Invoice',
        input.invoiceId || entityId,
        'save-invoice-pdf-document',
        'documents',
        () => invoicesService.saveInvoicePdfToDocuments(input.tenantId, input.invoiceId || entityId, input.actorUserId || input.ownerUserId),
        input,
      ).catch((error) => {
        logger.warn('[SalesAutomation] Invoice PDF document save failed', { tenantId: input.tenantId, invoiceId: input.invoiceId || entityId, error: (error as Error)?.message || String(error) });
      });
      await this.scheduleInvoiceReminders(input.tenantId, input.invoiceId || entityId, triggerType);
      output.actions.push('invoice_pdf_saved', 'invoice_reminders_scheduled');
    }
    if (triggerType === 'invoice.partiallyPaid' || triggerType === 'invoice.paid' || triggerType === 'payment.received') {
      const invoiceId = input.invoiceId || entityId;
      const invoice = await db.invoice.findFirst({ where: { tenantId: input.tenantId, id: invoiceId } });
      const status = String(input.status || input.newStatus || invoice?.status || '').toUpperCase();
      const amountDue = Number(invoice?.amountDue || input.amountDue || 0);
      const fullyPaid = triggerType === 'invoice.paid' || status === 'PAID' || amountDue <= 0;
      const payment = input.paymentId
        ? await db.invoicePayment.findFirst({ where: { tenantId: input.tenantId, id: input.paymentId, invoiceId } })
        : await db.invoicePayment.findFirst({ where: { tenantId: input.tenantId, invoiceId }, orderBy: { paymentDate: 'desc' } });
      if (payment) await this.runSideEffect(
        input.tenantId,
        triggerType,
        'InvoicePayment',
        payment.id,
        'bookkeeping-sync',
        'bookkeeping',
        () => bookkeepingService.syncInvoicePayment(input.tenantId, payment.id),
        input,
      );
      if (fullyPaid) {
        await this.cancelEntityReminders(input.tenantId, 'Invoice', invoiceId);
        await this.startCustomerSuccessOnboarding(input.tenantId, 'invoice.paid', 'Invoice', invoiceId, { ...input, invoice });
      } else {
        await this.scheduleInvoiceReminders(input.tenantId, invoiceId, triggerType);
      }
      await this.notifyOwner(
        input.tenantId,
        input.ownerUserId || input.paidByUserId,
        fullyPaid ? 'Invoice paid' : 'Partial payment received',
        fullyPaid
          ? `Invoice ${input.invoiceNumber || invoiceId} is fully paid.`
          : `Partial payment recorded for invoice ${input.invoiceNumber || invoiceId}. Remaining reminders are still active.`,
        `/invoice/${invoiceId}`,
        this.idempotencyKey(input.tenantId, triggerType, 'Invoice', invoiceId, 'payment-notification'),
        triggerType,
        'Invoice',
        invoiceId,
      );
      output.actions.push(fullyPaid ? 'invoice_reminders_cancelled' : 'invoice_reminders_rescheduled', 'bookkeeping_synced');
    }
    if (triggerType === 'customer.followupDue') {
      await this.createCustomerFollowupTask(input.tenantId, input.customerId || input.clientId || entityId, input);
      await this.notifyOwner(input.tenantId, input.ownerUserId, 'Customer follow-up due', `${input.customerName || 'A customer'} is due for post-sale follow-up.`, `/organizations/${input.customerId || input.clientId || entityId}`, this.idempotencyKey(input.tenantId, triggerType, 'Customer', input.customerId || input.clientId || entityId, 'owner-notification'), triggerType, 'Customer', input.customerId || input.clientId || entityId);
      output.actions.push('customer_followup_task_created');
    }
    if (['payment.failed', 'payment.refunded', 'payment.partially_refunded', 'payment.partiallyRefunded', 'payment.voided'].includes(triggerType)) {
      if (input.paymentId) {
        await this.runSideEffect(
          input.tenantId,
          triggerType,
          'InvoicePayment',
          input.paymentId,
          `bookkeeping-reversal:${input.refundAmount || ''}`,
          'bookkeeping',
          () => {
            if (triggerType === 'payment.refunded') return bookkeepingService.createInvoicePaymentReversal(input.tenantId, input.paymentId, Number(input.amount || 0), 'REFUNDED');
            if (triggerType === 'payment.partially_refunded' || triggerType === 'payment.partiallyRefunded') return bookkeepingService.createInvoicePaymentReversal(input.tenantId, input.paymentId, Number(input.refundAmount || input.amount || 0), 'PARTIALLY_REFUNDED');
            return bookkeepingService.syncInvoicePayment(input.tenantId, input.paymentId);
          },
          input,
        );
      }
      await this.notifyAdmins(
        input.tenantId,
        'Payment needs accounting review',
        `Payment ${input.paymentId || entityId} was ${triggerType.replace('payment.', '').replace(/([A-Z])/g, ' $1').toLowerCase()}. Bookkeeping has been queued for correction.`,
        input.invoiceId ? `/invoice/${input.invoiceId}` : '/bookkeeping',
      );
      output.actions.push('bookkeeping_reversal_synced');
    }
    if (['expense.created', 'expense.updated', 'expense.approved'].includes(triggerType)) {
      await this.runSideEffect(
        input.tenantId,
        triggerType,
        'Expense',
        input.expenseId || entityId,
        'bookkeeping-expense-sync',
        'bookkeeping',
        () => bookkeepingService.syncExpense(input.tenantId, input.expenseId || entityId),
        input,
      );
      output.actions.push('expense_bookkeeping_synced');
    }
    if (triggerType === 'expense.deleted') {
      await this.runSideEffect(
        input.tenantId,
        triggerType,
        'Expense',
        input.expenseId || entityId,
        'void-bookkeeping-expense',
        'bookkeeping',
        () => bookkeepingService.voidSourceTransaction(input.tenantId, 'EXPENSE', input.expenseId || entityId),
        input,
      );
      output.actions.push('expense_bookkeeping_voided');
    }
    if (triggerType === 'bookkeeping.sync.failed') {
      await this.notifyAdmins(input.tenantId, 'Bookkeeping sync failed', input.message || 'A bookkeeping sync needs review.', '/bookkeeping');
      output.actions.push('admin_notified');
    }
    return output;
  }

  private async createLeadFollowUp(input: Record<string, any>) {
    const run = await this.runSideEffect(
      input.tenantId,
      'lead.created',
      'Lead',
      input.leadId,
      'first-followup-task',
      'tasks',
      () => this.createLeadFollowUpTask(input),
      input,
    );
    if (!run.executed) return db.task.findFirst({
      where: { tenantId: input.tenantId, leadId: input.leadId, referenceDoctype: 'SalesAutomation', referenceDocname: `${input.leadId}:first-followup` },
    });
    return run.result;
  }

  private async createLeadFollowUpTask(input: Record<string, any>) {
    const existing = await db.task.findFirst({
      where: { tenantId: input.tenantId, leadId: input.leadId, referenceDoctype: 'SalesAutomation', referenceDocname: `${input.leadId}:first-followup` },
    });
    if (existing) return existing;
    return db.task.create({
      data: {
        tenantId: input.tenantId,
        title: `Follow up with ${input.leadName || 'new lead'}`,
        description: 'Initial sales follow-up created by automation.',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: addBusinessDays(new Date(), 1),
        assignedToId: input.ownerId || null,
        leadId: input.leadId,
        referenceDoctype: 'SalesAutomation',
        referenceDocname: `${input.leadId}:first-followup`,
      },
    });
  }

  private async createTaskOnce(tenantId: string, task: Record<string, any>) {
    const eventName = String(task.eventName || 'automation.task');
    const entityType = String(task.entityType || 'Automation');
    const entityId = String(task.entityId || task.referenceDocname || 'unknown');
    const actionType = String(task.actionType || 'task');
    const referenceDoctype = task.referenceDoctype || 'SalesAutomation';
    const referenceDocname = task.referenceDocname || `${entityId}:${actionType}`;
    const existing = await db.task.findFirst({ where: { tenantId, referenceDoctype, referenceDocname } });
    if (existing) return existing;
    const run = await this.runSideEffect(
      tenantId,
      eventName,
      entityType,
      entityId,
      actionType,
      'tasks',
      () => db.task.create({
        data: {
          tenantId,
          title: task.title,
          description: task.description || null,
          status: 'TODO',
          priority: task.priority || 'MEDIUM',
          dueDate: task.dueDate || addBusinessDays(new Date(), 1),
          assignedToId: task.assignedToId || null,
          leadId: task.leadId || null,
          clientId: task.clientId || null,
          projectId: task.projectId || null,
          referenceDoctype,
          referenceDocname,
        },
      }),
      task,
    );
    if (!run.executed) return db.task.findFirst({ where: { tenantId, referenceDoctype, referenceDocname } });
    return run.result;
  }

  private async createOnboardingTask(tenantId: string, entityId: string, input: Record<string, any>) {
    const dealId = input.projectId || input.dealId || entityId;
    const deal = dealId
      ? await db.project.findFirst({ where: { tenantId, id: dealId } })
      : null;
    return this.createTaskOnce(tenantId, {
      eventName: 'deal.won',
      entityType: 'Deal',
      entityId: deal?.id || dealId || input.leadId || entityId,
      actionType: 'onboarding-task',
      title: `Start onboarding for ${deal?.name || input.leadName || 'new customer'}`,
      description: 'Deal won. Prepare onboarding, billing handoff, and customer kickoff.',
      priority: 'HIGH',
      dueDate: addBusinessDays(new Date(), 1),
      assignedToId: deal?.dealOwnerId || deal?.salesRepId || input.ownerId || null,
      leadId: deal?.leadId || input.leadId || null,
      clientId: deal?.clientId || input.clientId || null,
      projectId: deal?.id || null,
      referenceDoctype: 'SalesAutomation',
      referenceDocname: `${deal?.id || dealId || input.leadId || entityId}:onboarding`,
    });
  }

  private async startCustomerSuccessOnboarding(tenantId: string, triggerType: string, entityType: string, entityId: string, input: Record<string, any>) {
    const context = await this.resolveCustomerSuccessContext(tenantId, entityType, entityId, input);
    if (!context?.clientId) return null;
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
    const followUpDays = Math.max(Number((tenant?.settings as any)?.customerSuccess?.followUpDays || 14), 1);
    return this.runSideEffect(
      tenantId,
      'onboarding.started',
      'Customer',
      context.clientId,
      'onboarding-started',
      'tasks',
      async () => {
        await clientLifecycleService.progressTo(context.clientId, tenantId, 'ONBOARDING');
        if (context.contactId && db.contact?.updateMany) {
          await db.contact.updateMany({
            where: { tenantId, id: context.contactId },
            data: { relationshipStatus: 'Customer' },
          }).catch((error: Error) => logger.warn('[SalesAutomation] Contact customer status update failed', { tenantId, contactId: context.contactId, error: error.message }));
        }
        const task = await db.task.create({
          data: {
            tenantId,
            title: `Start customer onboarding for ${context.customerName || 'new customer'}`,
            description: 'Post-sale handoff started. Confirm kickoff, implementation owner, customer-success owner, billing, documents, and first success milestone.',
            status: 'TODO',
            priority: 'HIGH',
            dueDate: addBusinessDays(new Date(), 1),
            assignedToId: context.ownerId || null,
            clientId: context.clientId,
            projectId: context.dealId || null,
            referenceDoctype: 'CustomerSuccess',
            referenceDocname: `${context.clientId}:onboarding-started`,
          },
        });
        await this.scheduleReminder(tenantId, 'Customer', context.clientId, 'customer.success.followup', addDays(new Date(), followUpDays), 'TASK', {
          customerId: context.clientId,
          clientId: context.clientId,
          customerName: context.customerName,
          ownerId: context.ownerId || null,
          ownerUserId: context.ownerUserId || null,
          dealId: context.dealId || null,
          trigger: triggerType,
        });
        await this.notifyOwner(
          tenantId,
          context.ownerUserId,
          'Customer onboarding started',
          `${context.customerName || 'A customer'} is ready for post-sale onboarding.`,
          `/organizations/${context.clientId}`,
          this.idempotencyKey(tenantId, 'onboarding.started', 'Customer', context.clientId, 'owner-notification'),
          'onboarding.started',
          'Customer',
          context.clientId,
          'SUCCESS',
        );
        activityLogger.log({
          tenantId,
          entityType: 'Customer',
          entityId: context.clientId,
          action: 'STATUS_CHANGE',
          module: 'automation',
          description: 'Customer success onboarding started',
          userId: context.ownerUserId || undefined,
          metadata: { trigger: triggerType, sourceEntityType: entityType, sourceEntityId: entityId, dealId: context.dealId || null, taskId: task.id },
        });
        eventBus.emit('onboarding.started', {
          tenantId,
          customerId: context.clientId,
          clientId: context.clientId,
          contactId: context.contactId || undefined,
          dealId: context.dealId || undefined,
          projectId: context.dealId || undefined,
          invoiceId: context.invoiceId || undefined,
          contractId: context.contractId || undefined,
          ownerId: context.ownerId || undefined,
          ownerUserId: context.ownerUserId || undefined,
          customerName: context.customerName || undefined,
          trigger: triggerType,
        });
        return { taskId: task.id, customerId: context.clientId, followUpDays };
      },
      { ...input, customerId: context.clientId, followUpDays },
    );
  }

  private async resolveCustomerSuccessContext(tenantId: string, entityType: string, entityId: string, input: Record<string, any>) {
    let clientId = input.customerId || input.clientId || input.companyId || null;
    let contactId = input.contactId || null;
    let dealId = input.dealId || input.projectId || null;
    let ownerId = input.customerSuccessOwnerId || input.ownerId || null;
    let ownerUserId = input.ownerUserId || null;
    let customerName = input.customerName || null;
    let invoiceId = input.invoiceId || null;
    let contractId = input.contractId || null;

    if (entityType === 'Deal' || dealId) {
      const deal = await db.project.findFirst({ where: { tenantId, id: dealId || entityId } });
      if (deal) {
        clientId = clientId || deal.clientId;
        contactId = contactId || deal.contactId;
        dealId = deal.id;
        ownerId = ownerId || deal.customerSuccessOwnerId || deal.dealOwnerId || deal.salesRepId;
        customerName = customerName || deal.organizationName || deal.name;
      }
    }
    if (entityType === 'Contract' || contractId || input.contract) {
      const contract = input.contract || await this.loadContractContext(tenantId, contractId || entityId);
      if (contract) {
        clientId = clientId || contract.clientId || contract.client?.id;
        contactId = contactId || contract.contactId;
        dealId = dealId || contract.projectId;
        contractId = contractId || contract.id;
        ownerId = ownerId || contract.createdById || contract.project?.dealOwnerId || contract.project?.salesRepId;
        ownerUserId = ownerUserId || contract.createdBy?.userId;
        customerName = customerName || contract.client?.clientName || contract.title || contract.contractNumber;
      }
    }
    if (entityType === 'Invoice' || invoiceId || input.invoice) {
      const invoice = input.invoice || await db.invoice.findFirst({ where: { tenantId, id: invoiceId || entityId }, include: { client: { include: { assignedOwner: true } } } });
      if (invoice) {
        clientId = clientId || invoice.clientId || invoice.client?.id;
        dealId = dealId || invoice.projectId;
        invoiceId = invoiceId || invoice.id;
        ownerId = ownerId || invoice.client?.assignedOwnerId || invoice.client?.assignedOwner?.id;
        ownerUserId = ownerUserId || invoice.client?.assignedOwner?.userId;
        customerName = customerName || invoice.client?.clientName || invoice.invoiceNumber;
      }
    }
    if (!clientId) return null;
    const client = await db.client.findFirst({
      where: { tenantId, id: clientId },
      include: { assignedOwner: true },
    });
    if (!client) throw new BadRequestError('Customer does not belong to this tenant', ErrorCodes.VALIDATION_FAILED);
    return {
      clientId,
      contactId,
      dealId,
      invoiceId,
      contractId,
      ownerId: ownerId || client.assignedOwnerId || client.assignedOwner?.id || null,
      ownerUserId: ownerUserId || client.assignedOwner?.userId || null,
      customerName: customerName || client.clientName || null,
    };
  }

  private async createCustomerFollowupTask(tenantId: string, customerId: string, input: Record<string, any>) {
    const client = await db.client.findFirst({ where: { tenantId, id: customerId }, include: { assignedOwner: true } });
    if (!client) throw new BadRequestError('Customer does not belong to this tenant', ErrorCodes.VALIDATION_FAILED);
    return this.createTaskOnce(tenantId, {
      eventName: 'customer.followupDue',
      entityType: 'Customer',
      entityId: customerId,
      actionType: 'customer-success-followup',
      title: `Follow up with ${client.clientName || input.customerName || 'customer'}`,
      description: 'Post-sale follow-up is due. Review onboarding progress, product adoption, open issues, and next success milestone.',
      priority: 'MEDIUM',
      dueDate: addBusinessDays(new Date(), 1),
      assignedToId: input.ownerId || client.assignedOwnerId || null,
      clientId: customerId,
      referenceDoctype: 'CustomerSuccess',
      referenceDocname: `${customerId}:customer-success-followup:${new Date().toISOString().slice(0, 10)}`,
    });
  }

  private async createQualifiedLeadDealTask(tenantId: string, leadId: string, input: Record<string, any>) {
    const lead = await db.lead.findFirst({
      where: { id: leadId, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        assignedToId: true,
        convertedToClientId: true,
        convertedToDealId: true,
      },
    });
    if (!lead) throw new NotFoundError('Lead not found for automation', ErrorCodes.RESOURCE_NOT_FOUND);
    const dealId = lead.convertedToDealId || input.dealId || null;
    return this.createTaskOnce(tenantId, {
      eventName: 'lead.qualified',
      entityType: 'Lead',
      entityId: leadId,
      actionType: 'qualified-default-deal-task',
      title: `Prepare qualified deal: ${lead.companyName || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Lead'}`,
      description: 'Lead qualified. Confirm account, contact, deal value, decision makers, and next sales step.',
      priority: 'HIGH',
      dueDate: addBusinessDays(new Date(), 1),
      assignedToId: lead.assignedToId || input.ownerId || null,
      leadId,
      clientId: lead.convertedToClientId || input.clientId || null,
      projectId: dealId,
      referenceDoctype: 'SalesAutomation',
      referenceDocname: `${leadId}:qualified-default-deal-task`,
    });
  }

  private async scoreLead(tenantId: string, leadId: string, eventName: string) {
    return this.runSideEffect(
      tenantId,
      eventName,
      'Lead',
      leadId,
      'score-lead',
      'leads',
      async () => {
        await leadAutomationService.scoreAndSave(tenantId, leadId);
        return { id: leadId, status: 'scored' };
      },
      { leadId },
    ).catch((error) => {
      logger.warn('[SalesAutomation] Lead scoring failed', { tenantId, leadId, error: (error as Error)?.message || String(error) });
      return null;
    });
  }

  private async flagDuplicateLead(tenantId: string, leadId: string, input: Record<string, any>) {
    return this.runSideEffect(
      tenantId,
      'lead.created',
      'Lead',
      leadId,
      'duplicate-check',
      'leads',
      async () => {
        const or: any[] = [];
        if (input.email) or.push({ email: input.email });
        if (input.phone) or.push({ phone: input.phone }, { mobileNo: input.phone });
        if (!or.length) return { id: leadId, status: 'no_match_fields' };
        const duplicate = await db.lead.findFirst({
          where: { tenantId, id: { not: leadId }, OR: or },
          select: { id: true },
        });
        if (!duplicate) return { id: leadId, status: 'unique' };
        await db.lead.update({
          where: { id: leadId },
          data: { status: 'DUPLICATE', duplicateOfLeadId: duplicate.id, closureReason: 'Potential duplicate email or phone detected by automation', closedAt: new Date() },
        });
        return { id: leadId, status: 'duplicate', duplicateOfLeadId: duplicate.id };
      },
      { leadId, email: input.email || null, phone: input.phone || null },
    ).catch((error) => {
      logger.warn('[SalesAutomation] Duplicate lead check failed', { tenantId, leadId, error: (error as Error)?.message || String(error) });
      return null;
    });
  }

  private async handleDealCreated(entityId: string, input: Record<string, any>, output: Record<string, any>) {
    const dealId = input.dealId || input.projectId || entityId;
    const deal = await db.project.findFirst({ where: { id: dealId, tenantId: input.tenantId } });
    if (!deal) throw new NotFoundError('Deal not found for automation', ErrorCodes.RESOURCE_NOT_FOUND);

    const updates: Record<string, any> = {};
    if (!deal.dealStatus) updates.dealStatus = 'Qualification';
    if (deal.probability === null || deal.probability === undefined) updates.probability = 25;
    if (!deal.expectedClosureDate) updates.expectedClosureDate = addDays(new Date(), 30);
    if (Object.keys(updates).length) {
      await this.runSideEffect(
        input.tenantId,
        'deal.created',
        'Deal',
        dealId,
        'set-defaults',
        'deals',
        () => db.project.update({ where: { id: dealId }, data: updates }),
        { dealId, updates },
      );
      output.actions.push('deal_defaults_set');
    }

    await this.createDealWorkflowTask(input.tenantId, dealId, { ...input, ...deal, triggerType: 'deal.created' }, 'first-deal-task', 'Plan first deal step', 'New deal created. Confirm buying process, stakeholders, value, expected close date, and next sales step.', 'HIGH', 1);
    await this.ensureDealDocumentFolder(input.tenantId, dealId, { ...input, ...deal });
    await this.notifyOwner(input.tenantId, input.ownerUserId, 'New deal created', `${input.dealName || deal.name || 'A deal'} needs a next step.`, `/deals/${dealId}`, this.idempotencyKey(input.tenantId, 'deal.created', 'Deal', dealId, 'owner-notification'), 'deal.created', 'Deal', dealId);

    const value = Number(input.value ?? deal.expectedDealValue ?? deal.dealValue ?? deal.contractValue ?? 0);
    if (value >= 10000) {
      await this.notifyAdmins(input.tenantId, 'High-value deal created', `${input.dealName || deal.name || 'A deal'} is valued at ${value}.`, `/deals/${dealId}`);
      output.actions.push('high_value_manager_notified');
    }
    output.actions.push('first_deal_task_created', 'deal_document_folder_ready');
  }

  private async createDealWorkflowTask(
    tenantId: string,
    entityId: string,
    input: Record<string, any>,
    actionType: string,
    title: string,
    description: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH',
    dueInBusinessDays: number,
  ) {
    const dealId = input.dealId || input.projectId || entityId;
    return this.createTaskOnce(tenantId, {
      eventName: String(input.triggerType || 'deal.automation'),
      entityType: 'Deal',
      entityId: dealId,
      actionType,
      title: `${title}: ${input.dealName || input.projectName || input.name || 'Deal'}`,
      description,
      priority,
      dueDate: dueInBusinessDays >= 5 ? addDays(new Date(), dueInBusinessDays) : addBusinessDays(new Date(), dueInBusinessDays),
      assignedToId: input.ownerId || input.dealOwnerId || input.salesRepId || input.projectManagerId || null,
      leadId: input.leadId || null,
      clientId: input.clientId || null,
      projectId: dealId,
      referenceDoctype: 'SalesAutomation',
      referenceDocname: `${dealId}:${actionType}`,
    });
  }

  private async ensureDealDocumentFolder(tenantId: string, dealId: string, input: Record<string, any>) {
    const folderName = `Deal - ${input.dealName || input.projectName || input.name || dealId}`;
    const existing = await db.folder?.findFirst?.({
      where: { tenantId, name: folderName, deletedAt: null },
    });
    if (existing) return existing;
    const run = await this.runSideEffect(
      tenantId,
      'deal.created',
      'Deal',
      dealId,
      'document-folder',
      'files',
      () => db.folder.create({ data: { tenantId, name: folderName } }),
      { dealId, folderName },
    );
    if (!run.executed) {
      return db.folder?.findFirst?.({ where: { tenantId, name: folderName, deletedAt: null } });
    }
    return run.result;
  }

  private async handleDealStageChanged(entityId: string, input: Record<string, any>, output: Record<string, any>) {
    const stage = cleanStatus(input.newStageName || input.newStageSlug || input.stageName);
    const dealId = input.dealId || input.projectId || entityId;
    const stageKey = stage.toLowerCase().replace(/_/g, '-');
    const stageInput = { ...input, triggerType: 'deal.stageChanged' };
    if (stage.includes('DISCOVERY') || stage.includes('QUALIFICATION') || stage.includes('QUALIFIED')) {
      await this.createDealWorkflowTask(input.tenantId, dealId, stageInput, `${stageKey}:requirements-demo-task`, 'Confirm requirements and demo plan', 'Deal moved into discovery/qualification. Confirm requirements, decision makers, use case, and demo plan.', 'HIGH', 1);
      output.actions.push('deal_discovery_task_created');
    }
    if (stage.includes('DEMO')) {
      await this.createDealWorkflowTask(input.tenantId, dealId, stageInput, `${stageKey}:demo-followup-task`, 'Follow up after demo', 'Deal is in demo stage. Confirm attendee feedback, blockers, decision timeline, and next step.', 'HIGH', 1);
      await this.scheduleReminder(input.tenantId, 'Deal', dealId, `deal.${stageKey}.followup`, addBusinessDays(new Date(), 1), 'TASK', input);
      output.actions.push('deal_demo_followup_created');
    }
    if (stage.includes('PROPOSAL')) {
      await this.createDealWorkflowTask(input.tenantId, dealId, stageInput, `${stageKey}:proposal-task`, 'Prepare and send proposal', 'Deal moved to proposal stage. Confirm pricing, terms, approval path, and send the proposal.', 'HIGH', 1);
      await this.scheduleReminder(input.tenantId, 'Deal', dealId, 'deal.proposal.followup.1d', addDays(new Date(), 1), 'TASK', input);
      await this.scheduleReminder(input.tenantId, 'Deal', dealId, 'deal.proposal.followup.3d', addDays(new Date(), 3), 'NOTIFICATION', input);
      output.actions.push('deal_proposal_task_created', 'deal_proposal_followups_scheduled');
    }
    if (stage.includes('NEGOTIATION')) {
      await this.createDealWorkflowTask(input.tenantId, dealId, stageInput, `${stageKey}:negotiation-followup-task`, 'Follow up on negotiation', 'Deal moved to negotiation. Confirm final blockers, discount approvals, stakeholder alignment, and close plan.', 'HIGH', 1);
      if (Number(input.discountAmount || input.discountPercent || 0) > 0 || input.discountApprovalRequired) {
        await this.notifyAdmins(input.tenantId, 'Discount approval may be needed', `${input.dealName || input.projectName || 'A deal'} is in negotiation and may need manager approval.`, `/deals/${dealId}`);
      }
      output.actions.push('deal_negotiation_followup_created');
    }
    if (stage === 'WON' || stage.includes('CLOSED_WON')) {
      await this.createOnboardingTask(input.tenantId, dealId, input);
      await this.createDealWorkflowTask(input.tenantId, dealId, stageInput, `${stageKey}:contract-invoice-workflow`, 'Start contract and invoice workflow', 'Deal is won. Prepare contract, invoice draft, billing handoff, and customer onboarding.', 'HIGH', 1);
      output.actions.push('deal_onboarding_task_created', 'deal_contract_invoice_task_created');
    }
    if (stage === 'LOST' || stage.includes('CLOSED_LOST')) {
      if (!input.lostReason) throw new BadRequestError('Lost reason is required when a deal is marked Lost', ErrorCodes.VALIDATION_FAILED);
      await this.cancelEntityReminders(input.tenantId, 'Deal', dealId);
      await this.createDealWorkflowTask(input.tenantId, dealId, stageInput, `${stageKey}:lost-nurture-task`, 'Plan nurture follow-up', `Deal moved to Lost. Reason: ${input.lostReason}. Review and schedule a future touch if appropriate.`, 'LOW', 30);
      output.actions.push('deal_reminders_cancelled', 'deal_lost_nurture_task_created');
    }
  }

  async scheduleInvoiceReminders(tenantId: string, invoiceId: string, reason = 'invoice.sent') {
    const run = await this.runSideEffect(
      tenantId,
      reason,
      'Invoice',
      invoiceId,
      `reminder-set:${reason}`,
      'automation',
      async () => {
        const invoice = await prisma.invoice.findFirst({
          where: { id: invoiceId, tenantId },
          include: { client: { select: { clientName: true, primaryEmail: true, email: true, assignedOwner: { select: { userId: true } } } } },
        } as any);
        if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await this.cancelEntityReminders(tenantId, 'Invoice', invoiceId);
        const dueDate = new Date((invoice as any).dueDate || Date.now());
        const payload = {
          invoiceId,
          invoiceNumber: (invoice as any).invoiceNumber,
          amountDue: Number((invoice as any).amountDue || (invoice as any).total || 0),
          dueDate: dueDate.toISOString(),
          ownerUserId: (invoice as any).client?.assignedOwner?.userId || null,
          recipientEmail: (invoice as any).client?.primaryEmail || (invoice as any).client?.email || null,
          recipientName: (invoice as any).client?.clientName || null,
        };
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.due.soon', addDays(dueDate, -3), 'NOTIFICATION', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.due.soon', addDays(dueDate, -3), 'EMAIL', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.due.today', dueDate, 'NOTIFICATION', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.due.today', dueDate, 'EMAIL', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.overdue.3d', addDays(dueDate, 3), 'TASK', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.overdue.3d', addDays(dueDate, 3), 'EMAIL', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.overdue.7d', addDays(dueDate, 7), 'NOTIFICATION', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.overdue.7d', addDays(dueDate, 7), 'EMAIL', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.overdue.14d', addDays(dueDate, 14), 'NOTIFICATION', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.overdue.14d', addDays(dueDate, 14), 'EMAIL', payload);
      },
      { invoiceId },
    );
    if (!run.executed) {
      return db.salesReminderSchedule.findMany({ where: { tenantId, entityType: 'Invoice', entityId: invoiceId } });
    }
    return run.result;
  }

  async scheduleReminder(tenantId: string, entityType: string, entityId: string, reminderType: string, scheduledFor: Date, channel = 'NOTIFICATION', payload: Record<string, any> = {}) {
    const run = await this.runSideEffect(
      tenantId,
      `${entityType.toLowerCase()}.reminder`,
      entityType,
      entityId,
      `${reminderType}:${channel}`,
      'automation',
      () => db.salesReminderSchedule.upsert({
        where: { tenantId_entityType_entityId_reminderType_channel: { tenantId, entityType, entityId, reminderType, channel } },
        create: { tenantId, entityType, entityId, reminderType, scheduledFor, channel, payload, status: 'SCHEDULED' },
        update: { scheduledFor, payload, status: 'SCHEDULED', sentAt: null, cancelledAt: null },
      }),
      { reminderType, scheduledFor: scheduledFor.toISOString(), channel, payload },
    );
    if (!run.executed) {
      return db.salesReminderSchedule.findFirst({ where: { tenantId, entityType, entityId, reminderType, channel } });
    }
    return run.result;
  }

  async cancelEntityReminders(tenantId: string, entityType: string, entityId: string) {
    const run = await this.runSideEffect(tenantId, `${entityType.toLowerCase()}.reminder.cancel`, entityType, entityId, 'cancel-reminders', 'automation', () => db.salesReminderSchedule.updateMany({
      where: { tenantId, entityType, entityId, status: 'SCHEDULED' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    }));
    return run.result;
  }

  async processDueReminders(
    limit = 100,
    options: { workerId?: string; stuckAfterMs?: number } = {},
  ) {
    const workerId = options.workerId || DEFAULT_REMINDER_WORKER_ID;
    const reminders = await this.claimDueReminders(limit, workerId, options.stuckAfterMs);

    for (const reminder of reminders) {
      await this.sendReminder(reminder).catch(async (error) => {
        const message = (error as Error)?.message || String(error);
        logger.warn('[SalesAutomation] Reminder failed', { reminderId: reminder.id, tenantId: reminder.tenantId, workerId, error: message });
        await this.markReminderFailed(reminder.id, workerId, message);
      });
    }
    return { processed: reminders.length };
  }

  private async claimDueReminders(limit: number, workerId: string, stuckAfterMs = REMINDER_PROCESSING_TIMEOUT_MS) {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - stuckAfterMs);
    const candidates = await db.salesReminderSchedule.findMany({
      where: {
        scheduledFor: { lte: now },
        OR: [
          { status: { in: ['SCHEDULED', 'PENDING'] } },
          { status: 'PROCESSING', processingStartedAt: { lte: staleBefore } },
        ],
      },
      orderBy: { scheduledFor: 'asc' },
      take: Math.max(limit * 3, limit),
    });

    const claimed: any[] = [];
    for (const candidate of candidates) {
      if (claimed.length >= limit) break;
      const wasStaleProcessing = candidate.status === 'PROCESSING';
      const result = await db.salesReminderSchedule.updateMany({
        where: {
          id: candidate.id,
          scheduledFor: { lte: now },
          OR: [
            { status: { in: ['SCHEDULED', 'PENDING'] } },
            { status: 'PROCESSING', processingStartedAt: { lte: staleBefore } },
          ],
        },
        data: {
          status: 'PROCESSING',
          claimedAt: now,
          claimedBy: workerId,
          processingStartedAt: now,
          lastError: wasStaleProcessing ? candidate.lastError || 'Retrying stuck reminder processing claim' : null,
          attemptCount: { increment: 1 },
        },
      });
      if (result.count !== 1) continue;
      claimed.push({
        ...candidate,
        status: 'PROCESSING',
        claimedAt: now,
        claimedBy: workerId,
        processingStartedAt: now,
        attemptCount: Number(candidate.attemptCount || 0) + 1,
      });
    }
    return claimed;
  }

  private async sendReminder(reminder: any) {
    const payload = reminder.payload || {};
    const channels = this.reminderChannels(reminder.channel);
    for (const channel of channels) {
      if (channel === 'TASK') {
        await this.sendTaskReminder(reminder);
      } else if (channel === 'NOTIFICATION') {
        await this.sendNotificationReminder(reminder, payload);
      } else if (channel === 'EMAIL') {
        await this.sendEmailReminder(reminder, payload);
      } else {
        throw new Error(`Unsupported reminder channel: ${channel}`);
      }
    }
    const sentAt = new Date();
    const sentUpdate = await db.salesReminderSchedule.updateMany({
      where: { id: reminder.id, status: 'PROCESSING', claimedBy: reminder.claimedBy },
      data: {
        status: 'SENT',
        sentAt,
        lastError: null,
        processingStartedAt: null,
      },
    });
    if (sentUpdate.count !== 1) {
      throw new Error('Reminder processing claim was lost before marking sent');
    }
    activityLogger.log({
      tenantId: reminder.tenantId,
      entityType: reminder.entityType,
      entityId: reminder.entityId,
      action: 'CREATE',
      module: 'automation',
      description: `Sent ${reminder.reminderType} automation reminder`,
      metadata: { reminderId: reminder.id, channel: reminder.channel },
    });
  }

  private async markReminderFailed(reminderId: string, workerId: string, error: string) {
    await db.salesReminderSchedule.updateMany({
      where: { id: reminderId, status: 'PROCESSING', claimedBy: workerId },
      data: {
        status: 'FAILED',
        lastError: error,
        processingStartedAt: null,
      },
    });
  }

  private async sendTaskReminder(reminder: any) {
      const existingTask = await db.task.findFirst({ where: { tenantId: reminder.tenantId, referenceDoctype: 'SalesReminderSchedule', referenceDocname: reminder.id } });
      if (!existingTask) {
        await this.runSideEffect(
          reminder.tenantId,
          'reminder.sent',
          'SalesReminderSchedule',
          reminder.id,
          'task',
          'tasks',
          () => db.task.create({
            data: {
              tenantId: reminder.tenantId,
              title: this.reminderTitle(reminder),
              description: this.reminderMessage(reminder),
              status: 'TODO',
              priority: reminder.reminderType.includes('overdue') || reminder.reminderType.includes('escalation') ? 'HIGH' : 'MEDIUM',
              dueDate: new Date(),
              referenceDoctype: 'SalesReminderSchedule',
              referenceDocname: reminder.id,
            },
          }),
          { reminderId: reminder.id, reminderType: reminder.reminderType },
        );
      }
  }

  private async sendNotificationReminder(reminder: any, payload: Record<string, any>) {
    if (!payload.ownerUserId) throw new Error('Notification reminder is missing ownerUserId');
    await this.notifyOwner(
      reminder.tenantId,
      payload.ownerUserId,
      this.reminderTitle(reminder),
      this.reminderMessage(reminder),
      this.entityUrl(reminder),
      `${reminder.tenantId}:SalesReminderSchedule:${reminder.id}:notification`,
      'reminder.sent',
      'SalesReminderSchedule',
      reminder.id,
      reminder.reminderType.includes('overdue') || reminder.reminderType.includes('failed') ? 'WARNING' : 'INFO',
      { reminderId: reminder.id, entityType: reminder.entityType, entityId: reminder.entityId },
    );
  }

  private async sendEmailReminder(reminder: any, payload: Record<string, any>) {
    const recipient = this.resolveReminderRecipient(payload);
    if (!recipient) throw new Error('Email reminder is missing recipient email');
    const subject = this.emailReminderSubject(reminder);
    const link = this.entityUrl(reminder);
    const html = this.emailReminderHtml(reminder, payload, link);
    const text = this.emailReminderText(reminder, payload, link);
    const deliveryRun = await this.runSideEffect(
      reminder.tenantId,
      'reminder.sent',
      'SalesReminderSchedule',
      reminder.id,
      `email:${reminder.reminderType}:${recipient}`,
      'emails',
      () => tenantMailerService.sendTenantEmail({
        tenantId: reminder.tenantId,
        preferredUserId: payload.ownerUserId || payload.senderUserId || payload.createdByUserId || undefined,
        to: recipient,
        subject,
        html,
        text,
        relatedEntityType: reminder.entityType,
        relatedEntityId: reminder.entityId,
      }),
      { reminderId: reminder.id, reminderType: reminder.reminderType, recipient },
    );
    const delivery = deliveryRun.result || { sent: true, senderEmail: null };
    if (!delivery.sent) throw new Error(delivery.error || 'Email reminder delivery failed');
    activityLogger.log({
      tenantId: reminder.tenantId,
      entityType: reminder.entityType,
      entityId: reminder.entityId,
      action: 'CREATE',
      module: 'automation',
      description: `Email reminder delivered to ${recipient}`,
      metadata: { reminderId: reminder.id, channel: 'EMAIL', recipient, senderEmail: delivery.senderEmail },
    });
  }

  private async loadContractContext(tenantId: string, contractId: string) {
    return db.contract.findFirst({
      where: { id: contractId, tenantId },
      include: {
        client: true,
        quote: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
        project: true,
        createdBy: { include: { user: true } },
      },
    });
  }

  private async sendContractEmail(tenantId: string, contractId: string, input: Record<string, any>) {
    const contract = input.contract || await this.loadContractContext(tenantId, contractId);
    const recipient = input.recipientEmail || contract?.client?.primaryEmail || contract?.client?.email;
    if (!recipient) return null;
    const contractNumber = contract?.contractNumber || input.contractNumber || contractId;
    const link = `/contracts/${contractId}`;
    const subject = `Contract ${contractNumber} ready for review`;
    const text = `Your contract ${contractNumber} is ready for review: ${link}`;
    const html = `<p>Your contract <strong>${contractNumber}</strong> is ready for review.</p><p><a href="${link}">View contract</a></p>`;
    return this.runSideEffect(
      tenantId,
      'contract.sent',
      'Contract',
      contractId,
      `email:${recipient}`,
      'emails',
      () => tenantMailerService.sendTenantEmail({
        tenantId,
        preferredUserId: input.ownerUserId || contract?.createdBy?.userId || undefined,
        to: recipient,
        subject,
        html,
        text,
        relatedEntityType: 'Contract',
        relatedEntityId: contractId,
      }),
      { contractId, recipient },
    );
  }

  private async updateContractDealStage(tenantId: string, contractId: string, contract: any, stage: string, eventName: string) {
    const dealId = contract?.projectId || contract?.project?.id;
    if (!dealId) return null;
    return this.runSideEffect(
      tenantId,
      eventName,
      'Contract',
      contractId,
      `deal-stage:${stage}`,
      'deals',
      () => db.project.update({
        where: { id: dealId },
        data: {
          dealStatus: stage,
          probability: stage === 'Won' ? 100 : undefined,
          status: stage === 'Won' ? 'COMPLETED' : undefined,
          closedDate: stage === 'Won' ? new Date() : undefined,
          nextStep: stage === 'Won' ? 'Prepare invoice and customer onboarding' : undefined,
        },
      }),
      { contractId, dealId, stage },
    ).catch((error) => {
      logger.warn('[SalesAutomation] Contract deal stage update failed', { tenantId, contractId, dealId, stage, error: (error as Error)?.message || String(error) });
      return null;
    });
  }

  private contractAutomationSettings(tenant: any) {
    const settings = (tenant?.settings || {}) as Record<string, any>;
    return {
      createDraftInvoiceOnSigned: settings.contractAutomation?.createDraftInvoiceOnSigned ?? settings.createDraftInvoiceOnContractSigned ?? false,
    };
  }

  private async createDraftInvoiceFromContract(tenantId: string, contractId: string, contract: any, input: Record<string, any>) {
    const tenant = await db.tenant?.findUnique?.({ where: { id: tenantId }, select: { settings: true } });
    const settings = this.contractAutomationSettings(tenant);
    const clientId = contract?.clientId || contract?.client?.id || input.clientId;
    if (!settings.createDraftInvoiceOnSigned || !clientId) return null;
    const quoteItems = Array.isArray(contract?.quote?.items) && contract.quote.items.length
      ? contract.quote.items
      : [{ description: contract?.title || `Contract ${contract?.contractNumber || contractId}`, quantity: 1, unitPrice: Number(contract?.value || input.value || 0) }];
    const total = Number(contract?.quote?.total || contract?.value || input.value || 0);
    return this.runSideEffect(
      tenantId,
      'contract.signed',
      'Contract',
      contractId,
      'create-draft-invoice',
      'finance',
      () => db.invoice.create({
        data: {
          tenantId,
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          clientId,
          quoteId: contract?.quoteId || null,
          projectId: contract?.projectId || contract?.project?.id || null,
          issueDate: new Date(),
          dueDate: addDays(new Date(), 14),
          currency: contract?.currency || contract?.quote?.currency || 'CAD',
          status: 'DRAFT',
          subtotal: Number(contract?.quote?.subtotal || total),
          taxAmount: Number(contract?.quote?.taxAmount || 0),
          discountAmount: Number(contract?.quote?.discountAmount || 0),
          total,
          amountPaid: 0,
          amountDue: total,
          notes: `Draft invoice created from signed contract ${contract?.contractNumber || contractId}.`,
          items: {
            create: quoteItems.map((item: any, index: number) => ({
              tenantId,
              description: item.description || `Contract item ${index + 1}`,
              quantity: Number(item.quantity || 1),
              unitPrice: Number(item.unitPrice || item.rate || item.total || total),
              amount: Number(item.amount || item.total || ((Number(item.quantity || 1)) * Number(item.unitPrice || item.rate || total))),
              sortOrder: index,
            })),
          },
        },
      }),
      { contractId, clientId },
    ).catch((error) => {
      logger.warn('[SalesAutomation] Draft invoice creation from contract failed', { tenantId, contractId, error: (error as Error)?.message || String(error) });
      return null;
    });
  }

  private async updateContractCustomerLifecycle(tenantId: string, contractId: string, contract: any) {
    const clientId = contract?.clientId || contract?.client?.id;
    if (!clientId) return null;
    return this.runSideEffect(
      tenantId,
      'contract.signed',
      'Contract',
      contractId,
      'customer-lifecycle',
      'clients',
      async () => {
        await clientLifecycleService.progressTo(clientId, tenantId, 'ONBOARDING');
        return { id: clientId, status: 'ONBOARDING' };
      },
      { contractId, clientId },
    );
  }

  private async createContractFollowupTask(
    tenantId: string,
    contractId: string,
    contract: any,
    actionType: string,
    title: string,
    description: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH',
    dueInBusinessDays: number,
    eventName: string,
  ) {
    return this.createTaskOnce(tenantId, {
      eventName,
      entityType: 'Contract',
      entityId: contractId,
      actionType,
      title: `${title}: ${contract?.contractNumber || contractId}`,
      description,
      priority,
      dueDate: addBusinessDays(new Date(), dueInBusinessDays),
      assignedToId: contract?.createdById || contract?.project?.dealOwnerId || contract?.project?.salesRepId || null,
      clientId: contract?.clientId || contract?.client?.id || null,
      projectId: contract?.projectId || contract?.project?.id || null,
      referenceDoctype: 'SalesAutomation',
      referenceDocname: `${contractId}:${actionType}`,
    });
  }

  private async loadProposalContext(tenantId: string, proposalId: string) {
    return db.proposal.findFirst({
      where: { id: proposalId, tenantId },
      include: {
        quote: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
        lead: { include: { assignedTo: { select: { userId: true } } } },
        client: true,
        contact: true,
        project: true,
      },
    });
  }

  private async updateProposalDealStage(tenantId: string, proposalId: string, proposal: any, stage: string, eventName: string) {
    const dealId = proposal?.projectId || proposal?.project?.id || await this.findProposalDealId(tenantId, proposal);
    if (!dealId) return null;
    return this.runSideEffect(
      tenantId,
      eventName,
      'Proposal',
      proposalId,
      `deal-stage:${stage}`,
      'deals',
      () => db.project.update({
        where: { id: dealId },
        data: {
          dealStatus: stage,
          probability: stage === 'Won' ? 100 : stage === 'Proposal Sent' ? 50 : undefined,
          status: stage === 'Won' ? 'COMPLETED' : undefined,
          closedDate: stage === 'Won' ? new Date() : undefined,
          nextStep: stage === 'Proposal Sent' ? 'Follow up on proposal response' : stage === 'Won' ? 'Prepare contract, invoice, and onboarding' : undefined,
        },
      }),
      { proposalId, dealId, stage },
    ).catch((error) => {
      logger.warn('[SalesAutomation] Proposal deal stage update failed', { tenantId, proposalId, dealId, stage, error: (error as Error)?.message || String(error) });
      return null;
    });
  }

  private async findProposalDealId(tenantId: string, proposal: any) {
    if (!proposal) return null;
    const deal = await db.project.findFirst({
      where: {
        tenantId,
        OR: [
          ...(proposal.quoteId ? [{ quoteId: proposal.quoteId }] : []),
          ...(proposal.leadId ? [{ leadId: proposal.leadId }] : []),
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return deal?.id || null;
  }

  private async sendProposalEmail(tenantId: string, proposalId: string, input: Record<string, any>) {
    const proposal = input.proposal || await this.loadProposalContext(tenantId, proposalId);
    const deliveryMethod = String(input.deliveryMethod || proposal?.deliveryMethod || '').toLowerCase();
    const shouldEmail = !deliveryMethod || deliveryMethod.includes('email');
    const recipient = input.recipientEmail || input.leadEmail || proposal?.lead?.email || proposal?.contact?.email || proposal?.client?.primaryEmail || proposal?.client?.email;
    if (!shouldEmail || !recipient) return null;
    const proposalNumber = proposal?.proposalNumber || input.quoteNumber || proposalId;
    const proposalLink = input.proposalLink || `/proposal-view/${proposalId}${input.publicToken ? `?token=${input.publicToken}` : ''}`;
    const subject = `Proposal ${proposalNumber} from your sales team`;
    const text = `Your proposal ${proposalNumber} is ready: ${proposalLink}`;
    const html = `<p>Your proposal <strong>${proposalNumber}</strong> is ready.</p><p><a href="${proposalLink}">View proposal</a></p>`;
    return this.runSideEffect(
      tenantId,
      'proposal.sent',
      'Proposal',
      proposalId,
      `email:${recipient}`,
      'emails',
      () => tenantMailerService.sendTenantEmail({
        tenantId,
        preferredUserId: input.ownerUserId || input.senderUserId || undefined,
        to: recipient,
        subject,
        html,
        text,
        relatedEntityType: 'Proposal',
        relatedEntityId: proposalId,
      }),
      { proposalId, recipient },
    );
  }

  private async createProposalFollowupTask(
    tenantId: string,
    proposalId: string,
    proposal: any,
    actionType: string,
    title: string,
    description: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH',
    dueInBusinessDays: number,
    eventName: string,
  ) {
    const dealId = proposal?.projectId || proposal?.project?.id || await this.findProposalDealId(tenantId, proposal);
    return this.createTaskOnce(tenantId, {
      eventName,
      entityType: 'Proposal',
      entityId: proposalId,
      actionType,
      title: `${title}: ${proposal?.proposalNumber || 'Proposal'}`,
      description,
      priority,
      dueDate: addBusinessDays(new Date(), dueInBusinessDays),
      assignedToId: proposal?.lead?.assignedToId || proposal?.project?.dealOwnerId || proposal?.project?.salesRepId || null,
      leadId: proposal?.leadId || null,
      clientId: proposal?.clientId || proposal?.quote?.clientId || proposal?.project?.clientId || null,
      projectId: dealId,
      referenceDoctype: 'SalesAutomation',
      referenceDocname: `${proposalId}:${actionType}`,
    });
  }

  private proposalAutomationSettings(tenant: any) {
    const settings = (tenant?.settings || {}) as Record<string, any>;
    return {
      createContractOnAcceptance: settings.proposalAutomation?.createContractOnAcceptance ?? settings.createContractOnProposalAccepted ?? true,
      createDraftInvoiceOnAcceptance: settings.proposalAutomation?.createDraftInvoiceOnAcceptance ?? settings.createDraftInvoiceOnProposalAccepted ?? false,
    };
  }

  private async createContractFromProposal(tenantId: string, proposalId: string, proposal: any, input: Record<string, any>) {
    const tenant = await db.tenant?.findUnique?.({ where: { id: tenantId }, select: { settings: true } });
    const settings = this.proposalAutomationSettings(tenant);
    const clientId = proposal?.clientId || proposal?.quote?.clientId || proposal?.project?.clientId || input.clientId;
    if (!settings.createContractOnAcceptance || !clientId) return null;
    return this.runSideEffect(
      tenantId,
      'proposal.accepted',
      'Proposal',
      proposalId,
      'create-contract',
      'contracts',
      () => db.contract.create({
        data: {
          tenantId,
          contractNumber: `CON-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          title: `Contract for ${proposal?.proposalNumber || proposalId}`,
          description: 'Created automatically from accepted proposal.',
          clientId,
          quoteId: proposal?.quoteId || null,
          projectId: proposal?.projectId || proposal?.project?.id || null,
          value: Number(proposal?.quote?.total || input.total || 0),
          currency: proposal?.quote?.currency || 'CAD',
          startDate: new Date(),
          endDate: addDays(new Date(), 365),
          terms: proposal?.termsAndConditions || proposal?.quote?.terms || null,
          createdById: input.salesRepId || null,
        },
      }),
      { proposalId, clientId },
    ).catch((error) => {
      logger.warn('[SalesAutomation] Contract creation from proposal failed', { tenantId, proposalId, error: (error as Error)?.message || String(error) });
      return null;
    });
  }

  private async createDraftInvoiceFromProposal(tenantId: string, proposalId: string, proposal: any, input: Record<string, any>) {
    const tenant = await db.tenant?.findUnique?.({ where: { id: tenantId }, select: { settings: true } });
    const settings = this.proposalAutomationSettings(tenant);
    const clientId = proposal?.clientId || proposal?.quote?.clientId || proposal?.project?.clientId || input.clientId;
    if (!settings.createDraftInvoiceOnAcceptance || !clientId) return null;
    const quoteItems = Array.isArray(proposal?.quote?.items) && proposal.quote.items.length
      ? proposal.quote.items
      : [{ description: `Accepted proposal ${proposal?.proposalNumber || proposalId}`, quantity: 1, unitPrice: Number(proposal?.quote?.total || input.total || 0) }];
    return this.runSideEffect(
      tenantId,
      'proposal.accepted',
      'Proposal',
      proposalId,
      'create-draft-invoice',
      'finance',
      () => db.invoice.create({
        data: {
          tenantId,
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          clientId,
          quoteId: proposal?.quoteId || null,
          projectId: proposal?.projectId || proposal?.project?.id || null,
          issueDate: new Date(),
          dueDate: addDays(new Date(), 14),
          currency: proposal?.quote?.currency || 'CAD',
          status: 'DRAFT',
          subtotal: Number(proposal?.quote?.subtotal || proposal?.quote?.total || input.total || 0),
          taxAmount: Number(proposal?.quote?.taxAmount || 0),
          discountAmount: Number(proposal?.quote?.discountAmount || 0),
          total: Number(proposal?.quote?.total || input.total || 0),
          amountPaid: 0,
          amountDue: Number(proposal?.quote?.total || input.total || 0),
          notes: `Draft invoice created from accepted proposal ${proposal?.proposalNumber || proposalId}.`,
          items: {
            create: quoteItems.map((item: any, index: number) => ({
              tenantId,
              description: item.description || `Proposal item ${index + 1}`,
              quantity: Number(item.quantity || 1),
              unitPrice: Number(item.unitPrice || item.rate || item.total || 0),
              amount: Number(item.amount || item.total || ((Number(item.quantity || 1)) * Number(item.unitPrice || item.rate || 0))),
              sortOrder: index,
            })),
          },
        },
      }),
      { proposalId, clientId },
    ).catch((error) => {
      logger.warn('[SalesAutomation] Draft invoice creation from proposal failed', { tenantId, proposalId, error: (error as Error)?.message || String(error) });
      return null;
    });
  }

  private async handleProposalAccepted(input: Record<string, any>) {
    const deal = await db.project.findFirst({ where: { tenantId: input.tenantId, OR: [{ quoteId: input.quoteId }, { leadId: input.leadId }] }, orderBy: { updatedAt: 'desc' } });
    if (deal) {
      await db.project.update({ where: { id: deal.id }, data: { dealStatus: 'Won', probability: 100, closedDate: new Date() } }).catch(() => null);
      const existingTask = await db.task.findFirst({ where: { tenantId: input.tenantId, projectId: deal.id, referenceDoctype: 'SalesAutomation', referenceDocname: `${deal.id}:onboarding` } });
      if (!existingTask) {
        await this.runSideEffect(
          input.tenantId,
          'proposal.accepted',
          'Deal',
          deal.id,
          'onboarding-task',
          'tasks',
          () => db.task.create({
            data: {
              tenantId: input.tenantId,
              title: `Start onboarding for ${deal.name || input.leadName || 'new customer'}`,
              description: 'Proposal accepted. Prepare customer onboarding and billing handoff.',
              status: 'TODO',
              priority: 'HIGH',
              dueDate: addBusinessDays(new Date(), 1),
              assignedToId: deal.dealOwnerId || deal.salesRepId || null,
              projectId: deal.id,
              clientId: deal.clientId || null,
              leadId: deal.leadId || input.leadId || null,
              referenceDoctype: 'SalesAutomation',
              referenceDocname: `${deal.id}:onboarding`,
            },
          }),
          input,
        );
      }
    }
  }

  private async notifyOwner(
    tenantId: string,
    userId: string | undefined | null,
    title: string,
    message: string,
    actionUrl?: string,
    idempotencyKey?: string,
    eventName = 'notification.create',
    entityType = 'Notification',
    entityId = actionUrl || title,
    type = 'INFO',
    metadata: Record<string, any> = {},
  ) {
    if (!userId) return;
    const createNotification = () => notificationsService.create({
      tenantId,
      userId,
      title,
      message,
      type: type as any,
      actionUrl,
      metadata: { automation: true, ...metadata },
    });
    return this.runSideEffect(
      tenantId,
      eventName,
      entityType,
      entityId,
      `notification:${userId}`,
      'notifications',
      createNotification,
      { idempotencyKey, title, actionUrl, ...metadata },
    );
  }

  private async notifyAdmins(tenantId: string, title: string, message: string, actionUrl?: string) {
    const admins = await prisma.employee.findMany({
      where: { tenantId, isActive: true, role: { name: { in: ['Owner', 'Admin', 'OWNER', 'ADMIN'] } } },
      include: { user: true },
      take: 20,
    });
    for (const admin of admins) {
      if (admin.userId) await this.notifyOwner(
        tenantId,
        admin.userId,
        title,
        message,
        actionUrl,
        `${tenantId}:bookkeeping.sync.failed:Admin:${admin.userId}:notification`,
        'bookkeeping.sync.failed',
        'Admin',
        admin.userId,
      );
    }
  }

  private idempotencyKey(tenantId: string, eventName: string, entityType: string, entityId: string, actionType: string) {
    return automationIdempotencyService.buildKey(tenantId, eventName, entityType, entityId, actionType);
  }

  private reminderTitle(reminder: any) {
    if (reminder.reminderType.includes('due.soon')) return 'Invoice due soon';
    if (reminder.reminderType.includes('due.today')) return 'Invoice due today';
    if (reminder.reminderType.includes('overdue')) return 'Invoice overdue';
    if (reminder.reminderType.includes('escalation')) return 'Invoice escalation';
    if (reminder.reminderType.includes('proposal')) return 'Proposal follow-up due';
    return 'Automation reminder';
  }

  private reminderMessage(reminder: any) {
    const payload = reminder.payload || {};
    if (reminder.entityType === 'Invoice') return `Invoice ${payload.invoiceNumber || reminder.entityId} has ${payload.amountDue ? `$${payload.amountDue} ` : ''}due.`;
    if (reminder.entityType === 'Proposal') return `Follow up on proposal ${payload.quoteNumber || reminder.entityId}.`;
    return `${reminder.entityType} ${reminder.entityId} needs attention.`;
  }

  private entityUrl(reminder: any) {
    if (reminder.entityType === 'Invoice') return `/invoice/${reminder.entityId}`;
    if (reminder.entityType === 'Proposal') return `/proposals/${reminder.entityId}`;
    if (reminder.entityType === 'Contract') return `/contracts/${reminder.entityId}`;
    return undefined;
  }

  private reminderChannels(channel: string) {
    return String(channel || 'NOTIFICATION')
      .split(/[,+]/)
      .map((part) => part.trim().toUpperCase())
      .filter(Boolean);
  }

  private resolveReminderRecipient(payload: Record<string, any>) {
    const value = payload.recipientEmail || payload.email || payload.contactEmail || payload.clientEmail || payload.to;
    if (Array.isArray(value)) return value.find(Boolean);
    return value || null;
  }

  private emailReminderSubject(reminder: any) {
    if (reminder.entityType === 'Invoice') return this.reminderTitle(reminder);
    if (reminder.entityType === 'Proposal') return 'Proposal follow-up';
    if (reminder.entityType === 'Contract') return 'Contract reminder';
    return this.reminderTitle(reminder);
  }

  private emailReminderHtml(reminder: any, payload: Record<string, any>, link?: string) {
    const recipientName = payload.recipientName || payload.clientName || payload.contactName || 'there';
    const absoluteLink = link ? `${process.env.FRONTEND_URL || process.env.APP_BASE_URL || ''}${link}` : '';
    return [
      `<p>Hi ${recipientName},</p>`,
      `<p>${this.reminderMessage(reminder)}</p>`,
      absoluteLink ? `<p><a href="${absoluteLink}">Open ${reminder.entityType.toLowerCase()}</a></p>` : '',
      '<p>Thank you.</p>',
    ].filter(Boolean).join('');
  }

  private emailReminderText(reminder: any, payload: Record<string, any>, link?: string) {
    const recipientName = payload.recipientName || payload.clientName || payload.contactName || 'there';
    const absoluteLink = link ? `${process.env.FRONTEND_URL || process.env.APP_BASE_URL || ''}${link}` : '';
    return [`Hi ${recipientName},`, '', this.reminderMessage(reminder), absoluteLink ? `Open: ${absoluteLink}` : '', '', 'Thank you.'].filter(Boolean).join('\n');
  }
}

export const salesAutomationService = new SalesAutomationService();
