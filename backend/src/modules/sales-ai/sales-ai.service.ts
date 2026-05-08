import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { llmAdapterService } from '../copilot/llm-adapter.service';

const db = prisma as any;

function n(value: unknown) {
  return Number(value || 0) || 0;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function money(value: unknown) {
  return `$${n(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function parseEmail(text: string, fallbackSubject: string) {
  const subjectMatch = text.match(/^Subject:\s*(.+)$/im);
  const subject = subjectMatch?.[1]?.trim() || fallbackSubject;
  const body = text.replace(/^Subject:\s*.+$/im, '').trim() || text.trim();
  return { subject, body, shortVersion: body.split('\n').filter(Boolean).slice(0, 2).join(' ') || body.slice(0, 180) };
}

export class SalesAIService {
  private initialized = false;

  initializeAutomation() {
    if (this.initialized) return;
    this.initialized = true;

    eventBus.on('lead.created', async (event) => {
      const result = await this.scoreLead(event.tenantId, { leadId: event.leadId, autoUpdate: true }, event.ownerId).catch(() => null);
      if (result && result.score >= 75) {
        await this.ensureTask(event.tenantId, {
          leadId: event.leadId,
          ownerId: event.ownerId,
          title: `Priority follow-up: ${event.leadName}`,
          key: `ai-hot-lead:${event.leadId}`,
          priority: 'HIGH',
        });
      }
    });

    eventBus.on('proposal.sent', async (event: any) => {
      if (!event.leadId && !event.projectId) return;
      await this.generateEmail(event.tenantId, {
        leadId: event.leadId,
        dealId: event.projectId,
        templateType: 'proposal follow-up',
        tone: 'Professional',
        goal: 'Follow up on the proposal and book the next decision conversation.',
      }, event.ownerId).catch(() => null);
    });
  }

  async salesChat(tenantId: string, data: Record<string, any>, userId?: string) {
    const message = String(data.message || '').trim();
    if (!message) throw new BadRequestError('Message is required', ErrorCodes.VALIDATION_FAILED);
    const crm = await this.queryCRM(tenantId, { query: message }, userId);
    const llm = await llmAdapterService.generate({
      systemPrompt: `You are the Sales AI Assistant for Zodo. Help sales reps sell Roofer CRM software to roofing companies. Use only the supplied tenant-scoped CRM facts. Use sales terms: leads, accounts, contacts, deals, proposals, subscriptions.`,
      userMessage: message,
      contextSummary: JSON.stringify(crm.summary).slice(0, 6000),
      maxTokens: 700,
      temperature: 0.4,
    });
    return {
      answer: llm?.text || crm.answer,
      aiAvailable: llmAdapterService.isAvailable(),
      records: crm.records,
      suggestedPrompts: [
        'Show hot leads',
        'Which deals are closing this week?',
        'Which reps have overdue tasks?',
        'Show high-value deals without next task',
      ],
    };
  }

  async scoreLead(tenantId: string, data: Record<string, any>, userId?: string) {
    const leadId = data.leadId;
    if (!leadId) throw new BadRequestError('leadId is required', ErrorCodes.VALIDATION_FAILED);
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: { leadSource: true, assignedTo: { include: { user: true } } },
    });
    if (!lead) throw new NotFoundError('Lead not found', ErrorCodes.RESOURCE_NOT_FOUND);

    const [tasks, emails, calls, meetings] = await Promise.all([
      prisma.task.count({ where: { tenantId, leadId } }),
      prisma.email.count({ where: { tenantId, leadId } }),
      db.salesCall.count({ where: { tenantId, leadId } }),
      prisma.calendarEvent.count({ where: { tenantId, leadId } }),
    ]);

    const reasons: string[] = [];
    let score = 20;
    if (lead.leadSourceId) { score += 8; reasons.push(`Known source: ${lead.leadSource?.name || 'tracked lead source'}.`); }
    if (lead.companySize && !/^1.?10$/i.test(lead.companySize)) { score += 10; reasons.push(`Company size suggests B2B fit (${lead.companySize}).`); }
    if (lead.industry) { score += 6; reasons.push(`Industry is captured for segmentation.`); }
    if (lead.budgetRange || lead.potentialValue) { score += 14; reasons.push(`Budget or potential value is known.`); }
    if (String(lead.buyingIntent || '').toLowerCase() === 'high') { score += 18; reasons.push('Buying intent is high.'); }
    if (/immediate|1.?3|asap/i.test(String(lead.purchaseTimeline || lead.workTimeline || ''))) { score += 14; reasons.push('Timeline is urgent enough for sales follow-up.'); }
    if (lead.productInterest || lead.useCase) { score += 10; reasons.push('Product interest or use case is documented.'); }
    if (tasks + emails + calls + meetings > 0) { score += Math.min(12, (tasks + emails + calls + meetings) * 3); reasons.push('There is engagement history with this lead.'); }
    if (!lead.email || !lead.phone) { score -= 8; reasons.push('Missing email or phone lowers reachability.'); }
    score = Math.max(0, Math.min(100, score));
    const temperature = score >= 75 ? 'HOT' : score >= 45 ? 'WARM' : 'COLD';
    const recommendedNextAction = score >= 75 ? 'Call today and book a Roofer CRM demo.' : score >= 45 ? 'Send a personalized follow-up and qualify budget/timeline.' : 'Run a light nurture sequence and gather missing qualification data.';

    const result = { score, temperature, reasons, recommendedNextAction, engagement: { tasks, emails, calls, meetings }, aiAvailable: llmAdapterService.isAvailable() };
    if (data.autoUpdate !== false) {
      await prisma.lead.update({ where: { id: lead.id }, data: { leadScore: score, temperature: temperature as any, nextStep: recommendedNextAction } });
      await this.log(tenantId, 'Lead', lead.id, 'AI lead score updated', userId, result);
    }
    return result;
  }

  async generateEmail(tenantId: string, data: Record<string, any>, userId?: string) {
    const context = await this.loadContext(tenantId, data);
    const templateType = data.templateType || data.type || 'follow-up';
    const tone = data.tone || 'Professional';
    const goal = data.goal || 'Move the sales conversation to the next step.';
    const fallbackSubject = `${templateType} for ${context.accountName || context.contactName || 'Roofer CRM'}`;
    const prompt = `Write a ${tone} ${templateType} email. Goal: ${goal}. Product: Roofer CRM software. Include a clear CTA.`;
    const llm = await llmAdapterService.generate({
      systemPrompt: llmAdapterService.getSystemPrompt('email'),
      userMessage: prompt,
      contextSummary: JSON.stringify(context).slice(0, 5000),
      maxTokens: 550,
      temperature: 0.55,
    });
    const generated = parseEmail(llm?.text || this.fallbackEmail(templateType, tone, context), fallbackSubject);

    let draft = null;
    if (data.storeDraft && context.toEmail) {
      draft = await prisma.email.create({
        data: {
          tenantId,
          fromAddress: context.repEmail || 'sales@zodo.ca',
          fromName: context.repName || 'Zodo Sales',
          toAddresses: [{ email: context.toEmail, name: context.contactName || context.accountName || 'Contact' }],
          subject: generated.subject,
          bodyText: generated.body,
          status: 'DRAFT',
          folder: 'DRAFTS',
          sentById: userId || null,
          leadId: data.leadId || null,
          clientId: data.clientId || data.accountId || context.clientId || null,
          contactId: data.contactId || context.contactId || null,
          projectId: data.dealId || data.projectId || null,
        } as any,
      });
      await this.log(tenantId, 'Email', draft.id, 'AI generated email draft', userId, { templateType, tone });
    }
    return { ...generated, templateType, tone, aiAvailable: llmAdapterService.isAvailable(), draftId: draft?.id || null };
  }

  async dealInsights(tenantId: string, data: Record<string, any>, userId?: string) {
    const dealId = data.dealId || data.projectId;
    if (!dealId) throw new BadRequestError('dealId is required', ErrorCodes.VALIDATION_FAILED);
    const deal = await prisma.project.findFirst({
      where: { id: dealId, tenantId, deletedAt: null },
      include: { client: true, tasks: true, emails: true, invoices: true, customerSubscriptions: true, quote: true },
    });
    if (!deal) throw new NotFoundError('Deal not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const lastActivity = await prisma.auditLog.findFirst({ where: { tenantId, entityType: 'Project', entityId: deal.id }, orderBy: { createdAt: 'desc' } });
    const openTasks = deal.tasks.filter((task) => !['DONE', 'COMPLETED', 'CANCELLED'].includes(String(task.status)));
    const daysSinceActivity = lastActivity ? Math.floor((Date.now() - lastActivity.createdAt.getTime()) / 86400000) : 999;
    const closeDate = deal.expectedClosureDate || deal.estimatedEndDate;
    const value = n(deal.dealValue || deal.expectedDealValue || deal.contractValue || deal.total);
    const riskLevel = daysSinceActivity >= 14 || !openTasks.length && value >= 10000 ? 'High' : daysSinceActivity >= 7 || !deal.nextStep ? 'Medium' : 'Low';
    const stuckReason = daysSinceActivity >= 7 ? `No activity for ${daysSinceActivity} days.` : !deal.nextStep ? 'No next step is recorded.' : 'Deal is moving normally.';
    const nextBestAction = riskLevel === 'High' ? 'Call the decision maker and send a direct recap with a demo/proposal decision deadline.' : riskLevel === 'Medium' ? 'Create a follow-up task and send a value-based email.' : 'Continue the planned next step.';
    const suggestedEmail = await this.generateEmail(tenantId, { ...data, templateType: deal.dealStatus === 'Proposal Sent' ? 'proposal follow-up' : 'demo follow-up', tone: 'Professional', goal: nextBestAction }, userId).catch(() => null);
    const result = { riskLevel, stuckReason, nextBestAction, suggestedEmail: suggestedEmail?.body || this.fallbackEmail('follow-up', 'Professional', { accountName: deal.client?.clientName, dealName: deal.name }), callScript: `Hi, this is ${data.repName || 'the Zodo team'}. I wanted to reconnect on ${deal.name} and confirm the next step for Roofer CRM.`, lastActivityAt: lastActivity?.createdAt || null, openTasks: openTasks.length, proposalStatus: deal.quote?.status || null, aiAvailable: llmAdapterService.isAvailable() };
    await prisma.project.update({ where: { id: deal.id }, data: { customFields: { ...((deal.customFields as any) || {}), aiDealInsight: result } as any } });
    await this.log(tenantId, 'Project', deal.id, 'AI deal insight generated', userId, result);
    return result;
  }

  async summarizeActivity(tenantId: string, data: Record<string, any>, userId?: string) {
    const target = this.target(data);
    if (!target.id) throw new BadRequestError('A target record is required', ErrorCodes.VALIDATION_FAILED);
    const logs = await prisma.auditLog.findMany({ where: { tenantId, entityType: target.type, entityId: target.id }, orderBy: { createdAt: 'desc' }, take: 20 });
    const notes = data.notes || logs.map((log) => `${log.createdAt.toISOString()}: ${log.description}`).join('\n');
    const llm = await llmAdapterService.generate({ systemPrompt: llmAdapterService.getSystemPrompt('summary'), userMessage: 'Summarize this sales activity and identify next actions.', contextSummary: String(notes).slice(0, 6000), maxTokens: 450, temperature: 0.3 });
    const summary = llm?.text || `Summary: ${logs.length} recent activities found. Next action: confirm the latest open follow-up and update the CRM.`;
    await this.log(tenantId, target.type, target.id, 'AI activity summary generated', userId, { summary });
    return { summary, aiAvailable: llmAdapterService.isAvailable(), activityCount: logs.length };
  }

  async followUpSuggestions(tenantId: string, data: Record<string, any>, userId?: string) {
    const suggestions = [];
    if (data.leadId) {
      const score = await this.scoreLead(tenantId, { leadId: data.leadId, autoUpdate: false }, userId);
      suggestions.push(score.recommendedNextAction);
    }
    if (data.dealId || data.projectId) {
      const insight = await this.dealInsights(tenantId, data, userId);
      suggestions.push(insight.nextBestAction);
    }
    if (!suggestions.length) suggestions.push('Create a follow-up task, send a concise value email, and schedule the next conversation.');
    return { suggestions: [...new Set(suggestions)], aiAvailable: llmAdapterService.isAvailable() };
  }

  async queryCRM(tenantId: string, data: Record<string, any>, userId?: string) {
    const query = String(data.query || data.message || '').toLowerCase();
    const now = new Date();
    const weekEnd = addDays(now, 7);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    let records: any[] = [];
    let answer = 'I searched the tenant CRM data. Try asking about hot leads, deals closing this week, overdue tasks, stuck deals, or subscription renewals.';

    if (/hot leads/.test(query)) {
      const leads = await prisma.lead.findMany({ where: { tenantId, temperature: 'HOT' }, take: 10, orderBy: { updatedAt: 'desc' } });
      records = leads.map((lead) => ({ type: 'Lead', id: lead.id, label: `${lead.firstName} ${lead.lastName}`, href: `/leads/${lead.id}`, meta: lead.companyName || lead.email }));
      answer = `${records.length} hot leads found.`;
    } else if (/closing.*week|deals.*week/.test(query)) {
      const deals = await prisma.project.findMany({ where: { tenantId, deletedAt: null, expectedClosureDate: { gte: now, lte: weekEnd }, NOT: [{ dealStatus: { equals: 'Lost', mode: 'insensitive' } }] }, take: 10, orderBy: { expectedClosureDate: 'asc' } });
      records = deals.map((deal) => ({ type: 'Deal', id: deal.id, label: deal.name, href: `/deals?dealId=${deal.id}`, meta: `${deal.dealStatus || 'Open'} · ${money(deal.dealValue || deal.expectedDealValue || deal.contractValue)}` }));
      answer = `${records.length} deals are closing this week.`;
    } else if (/overdue/.test(query) && /rep|task/.test(query)) {
      const tasks = await prisma.task.findMany({ where: { tenantId, dueDate: { lt: now }, status: { notIn: ['DONE', 'COMPLETED', 'CANCELLED'] } }, include: { assignedTo: { include: { user: true } } }, take: 20 });
      records = tasks.map((task) => ({ type: 'Task', id: task.id, label: task.title, href: `/tasks?taskId=${task.id}`, meta: task.assignedTo ? `${task.assignedTo.user.firstName} ${task.assignedTo.user.lastName}` : 'Unassigned' }));
      answer = `${records.length} overdue follow-up tasks found.`;
    } else if (/high.value|without next task|next action/.test(query)) {
      const deals = await prisma.project.findMany({ where: { tenantId, deletedAt: null, nextStep: null, OR: [{ dealValue: { gte: 10000 } }, { expectedDealValue: { gte: 10000 } }, { contractValue: { gte: 10000 } }] }, take: 10 });
      records = deals.map((deal) => ({ type: 'Deal', id: deal.id, label: deal.name, href: `/deals?dealId=${deal.id}`, meta: money(deal.dealValue || deal.expectedDealValue || deal.contractValue) }));
      answer = `${records.length} high-value deals need a next action.`;
    } else if (/renew/.test(query) && /subscription/.test(query)) {
      const subs = await prisma.customerSubscription.findMany({ where: { tenantId, renewalDate: { gte: now, lte: monthEnd }, status: { notIn: ['CANCELLED', 'EXPIRED'] } }, include: { client: true }, take: 10, orderBy: { renewalDate: 'asc' } });
      records = subs.map((sub) => ({ type: 'Subscription', id: sub.id, label: sub.subscriptionNumber || sub.planName, href: `/subscriptions?subscriptionId=${sub.id}`, meta: `${sub.client.clientName} · renews ${sub.renewalDate.toLocaleDateString()}` }));
      answer = `${records.length} subscriptions renew this month.`;
    }

    await this.log(tenantId, 'AIQuery', userId || tenantId, 'Natural-language CRM query', userId, { query: data.query || data.message, count: records.length });
    return { answer, records, summary: { query, records } };
  }

  private async loadContext(tenantId: string, data: Record<string, any>) {
    const [lead, deal, client, contact, employee] = await Promise.all([
      data.leadId ? prisma.lead.findFirst({ where: { id: data.leadId, tenantId }, include: { leadSource: true } }) : null,
      (data.dealId || data.projectId) ? prisma.project.findFirst({ where: { id: data.dealId || data.projectId, tenantId }, include: { client: true } }) : null,
      (data.clientId || data.accountId) ? prisma.client.findFirst({ where: { id: data.clientId || data.accountId, tenantId } }) : null,
      data.contactId ? prisma.contact.findFirst({ where: { id: data.contactId, tenantId } }) : null,
      data.userId ? prisma.employee.findFirst({ where: { id: data.userId, tenantId }, include: { user: true } }) : null,
    ]);
    return {
      leadId: lead?.id,
      dealId: deal?.id,
      clientId: client?.id || deal?.clientId || lead?.convertedToClientId,
      contactId: contact?.id || lead?.convertedToContactId || deal?.contactId,
      contactName: contact?.contactName || [lead?.firstName, lead?.lastName].filter(Boolean).join(' ') || deal?.leadName,
      toEmail: contact?.email || lead?.email || deal?.email || client?.primaryEmail || deal?.client?.primaryEmail,
      accountName: client?.clientName || deal?.client?.clientName || lead?.companyName || deal?.organizationName,
      dealName: deal?.name,
      dealStage: deal?.dealStatus,
      dealValue: n(deal?.dealValue || deal?.expectedDealValue || deal?.contractValue || lead?.potentialValue),
      leadSource: lead?.leadSource?.name,
      useCase: lead?.useCase,
      repName: employee ? `${employee.user.firstName} ${employee.user.lastName}` : undefined,
      repEmail: employee?.user.email,
    };
  }

  private fallbackEmail(type: string, tone: string, context: Record<string, any>) {
    const name = context.contactName || 'there';
    const account = context.accountName || 'your team';
    const subject = `${type} for ${account}`;
    return `Subject: ${subject}\n\nHi ${name},\n\nI wanted to follow up on Roofer CRM and how it can help ${account} track leads, deals, proposals, subscriptions, and sales activity in one place.\n\nWould you be open to a quick conversation this week to confirm fit and next steps?\n\nBest,\nZodo Sales`;
  }

  private target(data: Record<string, any>) {
    if (data.leadId) return { type: 'Lead', id: data.leadId };
    if (data.dealId || data.projectId) return { type: 'Project', id: data.dealId || data.projectId };
    if (data.clientId || data.accountId) return { type: 'Client', id: data.clientId || data.accountId };
    if (data.contactId) return { type: 'Contact', id: data.contactId };
    return { type: 'AI', id: null };
  }

  private async ensureTask(tenantId: string, input: Record<string, any>) {
    const existing = await prisma.task.findFirst({ where: { tenantId, referenceDoctype: 'SalesAI', referenceDocname: input.key } });
    if (existing) return existing;
    return prisma.task.create({
      data: {
        tenantId,
        title: input.title,
        status: 'TODO',
        priority: input.priority || 'MEDIUM',
        dueDate: input.dueDate || addDays(new Date(), 1),
        assignedToId: input.ownerId || null,
        leadId: input.leadId || null,
        projectId: input.projectId || null,
        clientId: input.clientId || null,
        referenceDoctype: 'SalesAI',
        referenceDocname: input.key,
      } as any,
    });
  }

  private async log(tenantId: string, entityType: string, entityId: string, description: string, userId?: string, metadata?: Record<string, any>) {
    await activityLogger.log({ tenantId, entityType, entityId, action: 'CREATE', module: 'sales-ai', description, userId, metadata });
  }
}

export const salesAIService = new SalesAIService();
