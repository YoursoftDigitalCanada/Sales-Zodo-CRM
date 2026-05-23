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
import { tenantMailerService } from '../../common/services/tenant-mailer.service';

const db = prisma as any;

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
    name: 'Lead converted handoff',
    description: 'Notify the owner and create a deal follow-up after lead conversion.',
    triggerType: 'lead.converted',
    actions: ['create_conversion_followup_task', 'notify_owner'],
    priority: 15,
    runOncePerEntity: true,
  },
  {
    name: 'Deal stage changed follow-up',
    description: 'Create stage-specific sales tasks and reminders as deals move through the pipeline.',
    triggerType: 'deal.stage.changed',
    actions: ['create_stage_followup_task', 'schedule_stage_reminder'],
    priority: 20,
    runOncePerEntity: false,
  },
  {
    name: 'Deal won onboarding',
    description: 'Create the customer onboarding task when a deal is won.',
    triggerType: 'deal.won',
    actions: ['create_onboarding_task'],
    priority: 10,
    runOncePerEntity: true,
  },
  {
    name: 'Proposal sent follow-up',
    description: 'Schedule proposal follow-up reminders and save available proposal documents.',
    triggerType: 'proposal.sent',
    actions: ['schedule_proposal_followup', 'save_proposal_document'],
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
    name: 'Contract sent document archive',
    description: 'Archive sent contract PDFs in Documents.',
    triggerType: 'contract.sent',
    actions: ['save_contract_document'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Contract signed document archive',
    description: 'Archive signed contract PDFs in Documents.',
    triggerType: 'contract.signed',
    actions: ['save_contract_document'],
    priority: 20,
    runOncePerEntity: true,
  },
  {
    name: 'Invoice sent reminders',
    description: 'Save invoice PDFs and schedule due-soon, due-today, overdue, and escalation reminders.',
    triggerType: 'invoice.sent',
    actions: ['save_invoice_pdf', 'schedule_invoice_reminders'],
    priority: 10,
    runOncePerEntity: true,
  },
  {
    name: 'Invoice paid closeout',
    description: 'Cancel payment reminders, sync bookkeeping, and notify the account owner.',
    triggerType: 'invoice.paid',
    actions: ['cancel_invoice_reminders', 'sync_bookkeeping', 'notify_owner'],
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
    triggerType: 'payment.partially_refunded',
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
    name: 'Expense deleted bookkeeping cleanup',
    description: 'Void the source bookkeeping transaction when an expense is deleted.',
    triggerType: 'expense.deleted',
    actions: ['void_bookkeeping_expense'],
    priority: 10,
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
    eventBus.on('lead.stale', (event) => this.executeTrigger('lead.stale', 'Lead', event.leadId, event));
    eventBus.on('lead.converted', (event) => this.executeTrigger('lead.converted', 'Lead', event.leadId, event));
    eventBus.on('lead.statusChanged', (event) => this.executeTrigger('lead.status.changed', 'Lead', event.leadId, event));
    eventBus.on('project.stageChanged', (event) => this.executeTrigger('deal.stage.changed', 'Deal', event.projectId, event));
    eventBus.on('deal.won', (event) => this.executeTrigger('deal.won', 'Deal', event.leadId, event));
    eventBus.on('proposal.sent', (event) => this.executeTrigger('proposal.sent', 'Proposal', event.proposalId, event));
    eventBus.on('proposal.viewed', (event) => this.executeTrigger('proposal.viewed', 'Proposal', event.proposalId, event));
    eventBus.on('proposal.accepted', (event) => this.executeTrigger('proposal.accepted', 'Proposal', event.proposalId, event));
    eventBus.on('contract.sent', (event) => this.executeTrigger('contract.sent', 'Contract', event.contractId, event));
    eventBus.on('contract.signed', (event) => this.executeTrigger('contract.signed', 'Contract', event.contractId, event));
    eventBus.on('invoice.sent', (event) => this.executeTrigger('invoice.sent', 'Invoice', event.invoiceId, event));
    eventBus.on('invoice.statusChanged', (event) => {
      const status = cleanStatus(event.newStatus);
      if (status === 'PAID') this.executeTrigger('invoice.paid', 'Invoice', event.invoiceId, event);
      else if (status === 'PARTIALLY_PAID') this.executeTrigger('invoice.partially.paid', 'Invoice', event.invoiceId, event);
      else if (status === 'CANCELLED' || status === 'CANCELED') this.executeTrigger('invoice.cancelled', 'Invoice', event.invoiceId, event);
      else this.executeTrigger('invoice.status.changed', 'Invoice', event.invoiceId, event);
    });
    eventBus.on('payment.received', (event) => this.executeTrigger('payment.received', 'InvoicePayment', event.invoiceId, event));
    eventBus.on('payment.failed', (event) => this.executeTrigger('payment.failed', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('payment.refunded', (event) => this.executeTrigger('payment.refunded', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('payment.partially_refunded', (event) => this.executeTrigger('payment.partially_refunded', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('payment.voided', (event) => this.executeTrigger('payment.voided', 'InvoicePayment', event.paymentId || event.invoiceId, event));
    eventBus.on('expense.created', (event) => this.executeTrigger('expense.created', 'Expense', event.expenseId, event));
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
    if (triggerType === 'deal.stage.changed') {
      add('create_stage_followup_task', { channel: 'TASK', dealId: input.projectId || entityId, stage: input.newStageName || input.newStageSlug || null });
      add('schedule_stage_reminder', { channel: 'TASK' });
    }
    if (triggerType === 'deal.won') {
      add('create_onboarding_task', { channel: 'TASK' });
    }
    if (triggerType === 'proposal.sent') {
      add('save_proposal_document', { documentType: 'pdf', linkedEntityType: 'Proposal', linkedEntityId: input.proposalId || entityId });
      add('schedule_proposal_followup_1d', { channel: 'TASK', dueInDays: 1 });
      add('schedule_proposal_followup_2d', { channel: 'NOTIFICATION', dueInDays: 2 });
    }
    if (triggerType === 'proposal.accepted') {
      add('save_accepted_proposal_document', { documentType: 'pdf', linkedEntityType: 'Proposal', linkedEntityId: input.proposalId || entityId });
      add('mark_deal_won');
      add('create_onboarding_task', { channel: 'TASK' });
    }
    if (triggerType === 'contract.sent') {
      add('save_contract_document', { documentType: 'pdf', linkedEntityType: 'Contract', linkedEntityId: input.contractId || entityId });
    }
    if (triggerType === 'contract.signed') {
      add('save_signed_contract_document', { documentType: 'pdf', linkedEntityType: 'Contract', linkedEntityId: input.contractId || entityId });
    }
    if (triggerType === 'invoice.sent') {
      add('save_invoice_document', { documentType: 'pdf', linkedEntityType: 'Invoice', linkedEntityId: input.invoiceId || entityId });
      add('schedule_invoice_due_soon_reminder', { channel: 'NOTIFICATION' });
      add('schedule_invoice_due_today_reminder', { channel: 'NOTIFICATION' });
      add('schedule_invoice_overdue_task', { channel: 'TASK' });
      add('schedule_invoice_escalation_reminder', { channel: 'NOTIFICATION' });
    }
    if (triggerType === 'invoice.paid' || triggerType === 'payment.received') {
      add('cancel_invoice_reminders');
      add('sync_bookkeeping_income');
      add('notify_owner', { channel: 'NOTIFICATION' });
    }
    if (['payment.failed', 'payment.refunded', 'payment.partially_refunded', 'payment.voided'].includes(triggerType)) {
      add('sync_bookkeeping_reversal');
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
      output.actions.push('lead_followup_created');
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
    if (triggerType === 'deal.stage.changed') {
      await this.handleDealStageChanged(entityId, input, output);
    }
    if (triggerType === 'deal.won') {
      await this.createOnboardingTask(input.tenantId, entityId, input);
      output.actions.push('deal_onboarding_task_created');
    }
    if (triggerType === 'proposal.sent') {
      await automationIdempotencyService.runOnce(
        input.tenantId,
        this.idempotencyKey(input.tenantId, triggerType, 'Proposal', input.proposalId || entityId, 'save-proposal-pdf-document'),
        { eventName: triggerType, entityType: 'Proposal', entityId: input.proposalId || entityId, actionType: 'save-proposal-pdf-document' },
        async () => proposalsService.saveProposalPdfToDocuments(input.tenantId, input.proposalId || entityId, input.salesRepId, 'sent'),
      ).catch((error) => {
        logger.warn('[SalesAutomation] Proposal PDF document save failed', { tenantId: input.tenantId, proposalId: input.proposalId || entityId, error: (error as Error)?.message || String(error) });
      });
      await this.scheduleReminder(input.tenantId, 'Proposal', entityId, 'proposal.followup.1d', addDays(new Date(), 1), 'TASK', input);
      await this.scheduleReminder(input.tenantId, 'Proposal', entityId, 'proposal.followup.2d', addDays(new Date(), 2), 'NOTIFICATION', input);
      output.actions.push('proposal_pdf_saved', 'proposal_followups_scheduled');
    }
    if (triggerType === 'proposal.accepted') {
      await automationIdempotencyService.runOnce(
        input.tenantId,
        this.idempotencyKey(input.tenantId, triggerType, 'Proposal', input.proposalId || entityId, 'save-accepted-proposal-pdf-document'),
        { eventName: triggerType, entityType: 'Proposal', entityId: input.proposalId || entityId, actionType: 'save-accepted-proposal-pdf-document' },
        async () => proposalsService.saveProposalPdfToDocuments(input.tenantId, input.proposalId || entityId, input.salesRepId, 'accepted'),
      ).catch((error) => {
        logger.warn('[SalesAutomation] Accepted proposal PDF document save failed', { tenantId: input.tenantId, proposalId: input.proposalId || entityId, error: (error as Error)?.message || String(error) });
      });
      await this.handleProposalAccepted(input);
      output.actions.push('accepted_proposal_pdf_saved', 'proposal_acceptance_handoff');
    }
    if (triggerType === 'contract.sent' || triggerType === 'contract.signed') {
      const variant = triggerType === 'contract.signed' ? 'signed' : 'sent';
      await automationIdempotencyService.runOnce(
        input.tenantId,
        this.idempotencyKey(input.tenantId, triggerType, 'Contract', input.contractId || entityId, `save-${variant}-contract-pdf-document`),
        { eventName: triggerType, entityType: 'Contract', entityId: input.contractId || entityId, actionType: `save-${variant}-contract-pdf-document` },
        async () => contractsService.saveContractPdfToDocuments(input.tenantId, input.contractId || entityId, input.ownerUserId, variant),
      ).catch((error) => {
        logger.warn('[SalesAutomation] Contract PDF document save failed', { tenantId: input.tenantId, contractId: input.contractId || entityId, variant, error: (error as Error)?.message || String(error) });
      });
      output.actions.push(`${variant}_contract_pdf_saved`);
    }
    if (triggerType === 'invoice.sent') {
      await automationIdempotencyService.runOnce(
        input.tenantId,
        this.idempotencyKey(input.tenantId, triggerType, 'Invoice', input.invoiceId || entityId, 'save-invoice-pdf-document'),
        { eventName: triggerType, entityType: 'Invoice', entityId: input.invoiceId || entityId, actionType: 'save-invoice-pdf-document' },
        async () => invoicesService.saveInvoicePdfToDocuments(input.tenantId, input.invoiceId || entityId),
      ).catch((error) => {
        logger.warn('[SalesAutomation] Invoice PDF document save failed', { tenantId: input.tenantId, invoiceId: input.invoiceId || entityId, error: (error as Error)?.message || String(error) });
      });
      await this.scheduleInvoiceReminders(input.tenantId, input.invoiceId);
      output.actions.push('invoice_pdf_saved', 'invoice_reminders_scheduled');
    }
    if (triggerType === 'invoice.paid' || triggerType === 'payment.received') {
      const invoiceId = input.invoiceId || entityId;
      await this.cancelEntityReminders(input.tenantId, 'Invoice', invoiceId);
      const payment = input.paymentId
        ? await db.invoicePayment.findFirst({ where: { tenantId: input.tenantId, id: input.paymentId, invoiceId } })
        : await db.invoicePayment.findFirst({ where: { tenantId: input.tenantId, invoiceId }, orderBy: { paymentDate: 'desc' } });
      if (payment) await automationIdempotencyService.runOnce(
        input.tenantId,
        `${input.tenantId}:${invoiceId}:${payment.id}:bookkeeping-sync`,
        { eventName: triggerType, entityType: 'InvoicePayment', entityId: payment.id, actionType: 'bookkeeping-sync' },
        async () => bookkeepingService.syncInvoicePayment(input.tenantId, payment.id),
      );
      await this.notifyOwner(
        input.tenantId,
        input.ownerUserId || input.paidByUserId,
        'Payment received',
        `Payment recorded for invoice ${input.invoiceNumber || invoiceId}.`,
        `/invoices/${invoiceId}`,
        this.idempotencyKey(input.tenantId, triggerType, 'Invoice', invoiceId, 'payment-notification'),
        triggerType,
        'Invoice',
        invoiceId,
      );
      output.actions.push('invoice_reminders_cancelled', 'bookkeeping_synced');
    }
    if (['payment.failed', 'payment.refunded', 'payment.partially_refunded', 'payment.voided'].includes(triggerType)) {
      if (input.paymentId) {
        await automationIdempotencyService.runOnce(
          input.tenantId,
          `${input.tenantId}:${input.invoiceId || entityId}:${input.paymentId}:bookkeeping-reversal:${triggerType}:${input.refundAmount || ''}`,
          { eventName: triggerType, entityType: 'InvoicePayment', entityId: input.paymentId, actionType: 'bookkeeping-reversal' },
          async () => {
            if (triggerType === 'payment.refunded') return bookkeepingService.createInvoicePaymentReversal(input.tenantId, input.paymentId, Number(input.amount || 0), 'REFUNDED');
            if (triggerType === 'payment.partially_refunded') return bookkeepingService.createInvoicePaymentReversal(input.tenantId, input.paymentId, Number(input.refundAmount || 0), 'PARTIALLY_REFUNDED');
            return bookkeepingService.syncInvoicePayment(input.tenantId, input.paymentId);
          },
        );
      }
      output.actions.push('bookkeeping_reversal_synced');
    }
    if (triggerType === 'expense.deleted') {
      await automationIdempotencyService.runOnce(
        input.tenantId,
        this.idempotencyKey(input.tenantId, triggerType, 'Expense', input.expenseId || entityId, 'void-bookkeeping-expense'),
        { eventName: triggerType, entityType: 'Expense', entityId: input.expenseId || entityId, actionType: 'void-bookkeeping-expense' },
        async () => bookkeepingService.voidSourceTransaction(input.tenantId, 'EXPENSE', input.expenseId || entityId),
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
    const key = `${input.tenantId}:lead:${input.leadId}:first-followup-task`;
    const run = await automationIdempotencyService.runOnce(
      input.tenantId,
      key,
      { eventName: 'lead.created', entityType: 'Lead', entityId: input.leadId, actionType: 'first-followup-task' },
      async () => this.createLeadFollowUpTask(input),
    );
    if (!run.executed) {
      return db.task.findFirst({
        where: { tenantId: input.tenantId, leadId: input.leadId, referenceDoctype: 'SalesAutomation', referenceDocname: `${input.leadId}:first-followup` },
      });
    }
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
    const run = await automationIdempotencyService.runOnce(
      tenantId,
      this.idempotencyKey(tenantId, eventName, entityType, entityId, actionType),
      { eventName, entityType, entityId, actionType },
      async () => db.task.create({
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

  private async handleDealStageChanged(entityId: string, input: Record<string, any>, output: Record<string, any>) {
    const stage = cleanStatus(input.newStageName || input.newStageSlug);
    const dealId = input.projectId || entityId;
    if (stage.includes('QUALIFIED')) {
      await this.createTaskOnce(input.tenantId, {
        eventName: 'deal.stage.changed',
        entityType: 'Deal',
        entityId: dealId,
        actionType: 'qualified-stage-followup',
        title: `Schedule discovery follow-up: ${input.projectName || 'Deal'}`,
        description: 'Deal moved to Qualified. Confirm discovery notes, decision makers, and next step.',
        priority: 'HIGH',
        dueDate: addBusinessDays(new Date(), 1),
        assignedToId: input.salesRepId || input.projectManagerId || null,
        clientId: input.clientId || null,
        projectId: dealId,
        referenceDoctype: 'SalesAutomation',
        referenceDocname: `${dealId}:qualified-followup`,
      });
      output.actions.push('deal_qualified_followup_created');
    }
    if (stage.includes('PROPOSAL')) {
      await this.scheduleReminder(input.tenantId, 'Deal', dealId, 'deal.proposal.followup.1d', addDays(new Date(), 1), 'TASK', input);
      await this.scheduleReminder(input.tenantId, 'Deal', dealId, 'deal.proposal.followup.3d', addDays(new Date(), 3), 'NOTIFICATION', input);
      output.actions.push('deal_proposal_followups_scheduled');
    }
    if (stage === 'WON' || stage.includes('CLOSED_WON')) {
      await this.createOnboardingTask(input.tenantId, dealId, input);
      output.actions.push('deal_onboarding_task_created');
    }
    if (stage === 'LOST' || stage.includes('CLOSED_LOST')) {
      await this.createTaskOnce(input.tenantId, {
        eventName: 'deal.stage.changed',
        entityType: 'Deal',
        entityId: dealId,
        actionType: 'lost-nurture-task',
        title: `Plan nurture follow-up: ${input.projectName || 'Lost deal'}`,
        description: 'Deal moved to Lost. Review lost reason and schedule a future nurture touch if appropriate.',
        priority: 'LOW',
        dueDate: addDays(new Date(), 30),
        assignedToId: input.salesRepId || input.projectManagerId || null,
        clientId: input.clientId || null,
        projectId: dealId,
        referenceDoctype: 'SalesAutomation',
        referenceDocname: `${dealId}:lost-nurture`,
      });
      output.actions.push('deal_lost_nurture_task_created');
    }
  }

  async scheduleInvoiceReminders(tenantId: string, invoiceId: string) {
    const key = this.idempotencyKey(tenantId, 'invoice.sent', 'Invoice', invoiceId, 'reminder-set');
    const run = await automationIdempotencyService.runOnce(
      tenantId,
      key,
      { eventName: 'invoice.sent', entityType: 'Invoice', entityId: invoiceId, actionType: 'reminder-set' },
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
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.due.soon', addDays(dueDate, -2), 'NOTIFICATION', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.due.today', dueDate, 'NOTIFICATION', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.overdue', addDays(dueDate, 1), 'TASK', payload);
        await this.scheduleReminder(tenantId, 'Invoice', invoiceId, 'invoice.escalation', addDays(dueDate, 7), 'NOTIFICATION', payload);
      },
    );
    if (!run.executed) {
      return db.salesReminderSchedule.findMany({ where: { tenantId, entityType: 'Invoice', entityId: invoiceId } });
    }
    return run.result;
  }

  async scheduleReminder(tenantId: string, entityType: string, entityId: string, reminderType: string, scheduledFor: Date, channel = 'NOTIFICATION', payload: Record<string, any> = {}) {
    const key = `${tenantId}:${entityType}:${entityId}:${reminderType}:${channel}:reminder`;
    const run = await automationIdempotencyService.runOnce(
      tenantId,
      key,
      { eventName: `${entityType.toLowerCase()}.reminder`, entityType, entityId, actionType: `${reminderType}:${channel}` },
      async () => db.salesReminderSchedule.upsert({
        where: { tenantId_entityType_entityId_reminderType_channel: { tenantId, entityType, entityId, reminderType, channel } },
        create: { tenantId, entityType, entityId, reminderType, scheduledFor, channel, payload, status: 'SCHEDULED' },
        update: { scheduledFor, payload, status: 'SCHEDULED', sentAt: null, cancelledAt: null },
      }),
    );
    if (!run.executed) {
      return db.salesReminderSchedule.findFirst({ where: { tenantId, entityType, entityId, reminderType, channel } });
    }
    return run.result;
  }

  async cancelEntityReminders(tenantId: string, entityType: string, entityId: string) {
    return db.salesReminderSchedule.updateMany({
      where: { tenantId, entityType, entityId, status: 'SCHEDULED' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  async processDueReminders(limit = 100) {
    const reminders = await db.salesReminderSchedule.findMany({
      where: { status: { in: ['SCHEDULED', 'PENDING'] }, scheduledFor: { lte: new Date() } },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
    });
    for (const reminder of reminders) {
      await this.sendReminder(reminder).catch(async (error) => {
        logger.warn('[SalesAutomation] Reminder failed', { reminderId: reminder.id, tenantId: reminder.tenantId, error: (error as Error)?.message || String(error) });
        await db.salesReminderSchedule.update({ where: { id: reminder.id }, data: { status: 'FAILED' } });
      });
    }
    return { processed: reminders.length };
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
    await db.salesReminderSchedule.update({ where: { id: reminder.id }, data: { status: 'SENT', sentAt: new Date() } });
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

  private async sendTaskReminder(reminder: any) {
      const existingTask = await db.task.findFirst({ where: { tenantId: reminder.tenantId, referenceDoctype: 'SalesReminderSchedule', referenceDocname: reminder.id } });
      if (!existingTask) {
        await automationIdempotencyService.runOnce(
          reminder.tenantId,
          `${reminder.tenantId}:SalesReminderSchedule:${reminder.id}:task`,
          { eventName: 'reminder.sent', entityType: 'SalesReminderSchedule', entityId: reminder.id, actionType: 'task' },
          async () => db.task.create({
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
    const delivery = await tenantMailerService.sendTenantEmail({
      tenantId: reminder.tenantId,
      preferredUserId: payload.ownerUserId || payload.senderUserId || payload.createdByUserId || undefined,
      to: recipient,
      subject,
      html,
      text,
    });
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

  private async handleProposalAccepted(input: Record<string, any>) {
    const deal = await db.project.findFirst({ where: { tenantId: input.tenantId, OR: [{ quoteId: input.quoteId }, { leadId: input.leadId }] }, orderBy: { updatedAt: 'desc' } });
    if (deal) {
      await db.project.update({ where: { id: deal.id }, data: { dealStatus: 'Won', probability: 100, closedDate: new Date() } }).catch(() => null);
      const existingTask = await db.task.findFirst({ where: { tenantId: input.tenantId, projectId: deal.id, referenceDoctype: 'SalesAutomation', referenceDocname: `${deal.id}:onboarding` } });
      if (!existingTask) {
        await automationIdempotencyService.runOnce(
          input.tenantId,
          `${input.tenantId}:proposal.accepted:Deal:${deal.id}:onboarding-task`,
          { eventName: 'proposal.accepted', entityType: 'Deal', entityId: deal.id, actionType: 'onboarding-task' },
          async () => db.task.create({
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
    if (!idempotencyKey) return createNotification();
    return automationIdempotencyService.runOnce(
      tenantId,
      idempotencyKey,
      { eventName, entityType, entityId, actionType: `notification:${userId}` },
      createNotification,
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
    if (reminder.entityType === 'Invoice') return `/invoices/${reminder.entityId}`;
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
