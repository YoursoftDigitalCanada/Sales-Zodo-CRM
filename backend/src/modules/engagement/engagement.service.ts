import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';

const db = prisma as any;

function norm(value: unknown, fallback: string) {
  return String(value || fallback).trim();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function entityFromTarget(targetType: string, targetId: string) {
  const type = targetType.toLowerCase();
  if (type === 'lead') return { entityType: 'Lead', entityId: targetId, leadId: targetId };
  if (type === 'contact') return { entityType: 'Contact', entityId: targetId, contactId: targetId };
  if (type === 'deal') return { entityType: 'Project', entityId: targetId, projectId: targetId };
  if (type === 'account' || type === 'organization') return { entityType: 'Client', entityId: targetId, clientId: targetId };
  return { entityType: targetType, entityId: targetId };
}

export class EngagementService {
  private initialized = false;

  initializeAutomation() {
    if (this.initialized) return;
    this.initialized = true;

    eventBus.on('lead.created', async (event) => {
      await this.ensureFollowUpTask(event.tenantId, { leadId: event.leadId, ownerId: event.ownerId, title: `Follow up: ${event.leadName}`, key: `lead-created:${event.leadId}` });
      await this.autoEnrollColdSequence(event.tenantId, 'Lead', event.leadId, event.ownerId);
    });

    eventBus.on('lead.statusChanged', async (event) => {
      if (String(event.newStatus).toUpperCase() === 'QUALIFIED') {
        await this.ensureFollowUpTask(event.tenantId, { leadId: event.leadId, ownerId: event.ownerId, title: `Schedule demo: ${event.leadName}`, key: `lead-qualified:${event.leadId}`, priority: 'HIGH' });
      }
    });

    eventBus.on('proposal.sent', async (event: any) => {
      if (event.leadId) {
        await this.ensureFollowUpTask(event.tenantId, { leadId: event.leadId, title: `Follow up on proposal ${event.quoteNumber || ''}`.trim(), key: `proposal-sent:${event.quoteId || event.leadId}`, priority: 'HIGH', days: 2 });
        await this.autoEnrollProposalSequence(event.tenantId, 'Lead', event.leadId);
      }
    });

    eventBus.on('proposal.accepted', async (event) => {
      await this.stopSequencesForTarget(event.tenantId, 'Lead', event.leadId, 'proposal accepted');
    });

    eventBus.on('deal.won', async (event: any) => {
      if (event.projectId) await this.stopSequencesForTarget(event.tenantId, 'Deal', event.projectId, 'deal won');
    });

    eventBus.on('payment.received', async (event: any) => {
      if (event.clientId) await this.logActivity(event.tenantId, 'Client', event.clientId, 'Payment received', event.paidByUserId, { invoiceId: event.invoiceId, amount: event.amount });
    });
  }

  async listTemplates(tenantId: string, query: Record<string, any> = {}) {
    return db.emailTemplate.findMany({ where: { tenantId, ...(query.active === 'true' ? { isActive: true } : {}), ...(query.category ? { category: query.category } : {}) }, orderBy: { updatedAt: 'desc' } });
  }

  async createTemplate(tenantId: string, data: Record<string, any>, userId?: string) {
    if (!data.subject || !data.body) throw new BadRequestError('Email template requires subject and body', ErrorCodes.VALIDATION_FAILED);
    const template = await db.emailTemplate.create({
      data: {
        tenantId,
        templateName: norm(data.templateName, data.subject),
        subject: data.subject,
        body: data.body,
        category: norm(data.category, 'Cold Outreach'),
        variables: Array.isArray(data.variables) ? data.variables : ['contactName', 'companyName', 'repName', 'proposalLink', 'planName'],
        isActive: data.isActive !== false,
      },
    });
    await this.logActivity(tenantId, 'EmailTemplate', template.id, `Email template "${template.templateName}" created`, userId);
    return template;
  }

  async updateTemplate(id: string, tenantId: string, data: Record<string, any>, userId?: string) {
    const existing = await db.emailTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Email template not found', ErrorCodes.RESOURCE_NOT_FOUND);
    if (data.subject === '' || data.body === '') throw new BadRequestError('Email template requires subject and body', ErrorCodes.VALIDATION_FAILED);
    const template = await db.emailTemplate.update({ where: { id }, data });
    await this.logActivity(tenantId, 'EmailTemplate', id, `Email template "${template.templateName}" updated`, userId);
    return template;
  }

  async listSequences(tenantId: string) {
    return db.salesSequence.findMany({ where: { tenantId }, include: { enrollments: true }, orderBy: { updatedAt: 'desc' } });
  }

  async createSequence(tenantId: string, data: Record<string, any>, userId?: string) {
    const sequence = await db.salesSequence.create({
      data: {
        tenantId,
        sequenceName: norm(data.sequenceName, 'Untitled Sequence'),
        targetType: norm(data.targetType, 'Lead'),
        status: norm(data.status, 'DRAFT').toUpperCase(),
        steps: Array.isArray(data.steps) ? data.steps : [],
        ownerId: data.ownerId || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        stopCondition: norm(data.stopCondition, 'reply received'),
      },
    });
    await this.logActivity(tenantId, 'SalesSequence', sequence.id, `Sequence "${sequence.sequenceName}" created`, userId);
    return sequence;
  }

  async updateSequence(id: string, tenantId: string, data: Record<string, any>, userId?: string) {
    const existing = await db.salesSequence.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Sequence not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const sequence = await db.salesSequence.update({ where: { id }, data: { ...data, ...(data.status ? { status: String(data.status).toUpperCase() } : {}) } });
    await this.logActivity(tenantId, 'SalesSequence', id, `Sequence "${sequence.sequenceName}" updated`, userId);
    return sequence;
  }

  async startSequence(id: string, tenantId: string, data: Record<string, any>, userId?: string) {
    const sequence = await db.salesSequence.findFirst({ where: { id, tenantId } });
    if (!sequence) throw new NotFoundError('Sequence not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const steps = Array.isArray(sequence.steps) ? sequence.steps : [];
    if (!steps.length) throw new BadRequestError('Sequence cannot start without at least one step', ErrorCodes.VALIDATION_FAILED);
    const targetType = norm(data.targetType, sequence.targetType);
    const targetId = data.targetId;
    if (!targetId) throw new BadRequestError('Sequence target is required', ErrorCodes.VALIDATION_FAILED);
    const enrollment = await db.salesSequenceEnrollment.upsert({
      where: { tenantId_sequenceId_targetType_targetId: { tenantId, sequenceId: id, targetType, targetId } },
      update: { status: 'ACTIVE', stoppedAt: null, stopReason: null },
      create: { tenantId, sequenceId: id, targetType, targetId, status: 'ACTIVE' },
    });
    await db.salesSequence.update({ where: { id }, data: { status: 'ACTIVE', startDate: sequence.startDate || new Date() } });
    await this.createFirstSequenceTask(tenantId, sequence, enrollment, userId);
    await this.logActivity(tenantId, entityFromTarget(targetType, targetId).entityType, targetId, `Started sequence "${sequence.sequenceName}"`, userId, { sequenceId: id });
    return enrollment;
  }

  async stopSequence(id: string, tenantId: string, data: Record<string, any>, userId?: string) {
    const targetType = data.targetType;
    const targetId = data.targetId;
    const updated = await db.salesSequenceEnrollment.updateMany({
      where: { tenantId, sequenceId: id, ...(targetType && targetId ? { targetType, targetId } : {}) },
      data: { status: 'STOPPED', stoppedAt: new Date(), stopReason: data.reason || 'manual stop' },
    });
    await this.logActivity(tenantId, 'SalesSequence', id, 'Sequence stopped', userId, { targetType, targetId, count: updated.count });
    return updated;
  }

  async listCalls(tenantId: string, query: Record<string, any> = {}) {
    return db.salesCall.findMany({ where: { tenantId, ...(query.leadId ? { leadId: query.leadId } : {}), ...(query.clientId ? { clientId: query.clientId } : {}), ...(query.projectId ? { projectId: query.projectId } : {}) }, orderBy: { createdAt: 'desc' }, take: Number(query.limit || 300) });
  }

  async logCall(tenantId: string, data: Record<string, any>, userId?: string) {
    if (!data.outcome) throw new BadRequestError('Call outcome is required', ErrorCodes.VALIDATION_FAILED);
    const call = await db.salesCall.create({
      data: {
        tenantId,
        leadId: data.leadId || null,
        contactId: data.contactId || null,
        projectId: data.projectId || data.dealId || null,
        clientId: data.clientId || data.accountId || null,
        callerId: data.callerId || userId || null,
        direction: norm(data.direction, 'Outbound'),
        outcome: data.outcome,
        duration: data.duration ? Number(data.duration) : null,
        callNotes: data.callNotes || data.notes || null,
        nextAction: data.nextAction || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
    });
    await this.logRelatedActivity(tenantId, call, `Call logged: ${call.outcome}`, userId, { callId: call.id });
    if (call.outcome === 'Callback Requested' && call.followUpDate) {
      await this.ensureFollowUpTask(tenantId, { leadId: call.leadId, clientId: call.clientId, projectId: call.projectId, ownerId: call.callerId, title: call.nextAction || 'Callback requested', key: `callback:${call.id}`, dueDate: call.followUpDate, priority: 'HIGH' });
      await this.scheduleReminder(tenantId, call, userId);
    }
    return call;
  }

  async updateCall(id: string, tenantId: string, data: Record<string, any>, userId?: string) {
    const existing = await db.salesCall.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Call not found', ErrorCodes.RESOURCE_NOT_FOUND);
    if (data.outcome === '') throw new BadRequestError('Call outcome is required', ErrorCodes.VALIDATION_FAILED);
    const call = await db.salesCall.update({ where: { id }, data: { ...data, ...(data.followUpDate ? { followUpDate: new Date(data.followUpDate) } : {}) } });
    await this.logRelatedActivity(tenantId, call, `Call updated: ${call.outcome}`, userId, { callId: call.id });
    return call;
  }

  async scheduleMeeting(tenantId: string, data: Record<string, any>, userId?: string) {
    if (!data.startTime && !data.dateTime) throw new BadRequestError('Meeting date/time is required', ErrorCodes.VALIDATION_FAILED);
    if (!data.attendees && !data.attendeeEmails) throw new BadRequestError('Meeting attendees are required', ErrorCodes.VALIDATION_FAILED);
    const start = new Date(data.startTime || data.dateTime);
    const end = data.endTime ? new Date(data.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    const meeting = await prisma.calendarEvent.create({
      data: {
        tenantId,
        title: data.title || `${data.meetingType || 'Demo'} meeting`,
        description: data.description || data.meetingNotes || null,
        eventType: 'MEETING',
        status: 'SCHEDULED',
        startTime: start,
        endTime: end,
        timezone: data.timezone || 'UTC',
        category: data.meetingType || 'Demo',
        notes: data.meetingNotes || null,
        createdById: data.ownerId || userId || null,
        clientId: data.clientId || data.accountId || null,
        leadId: data.leadId || null,
        referenceDoctype: 'SalesEngagement',
        referenceDocname: data.projectId || data.dealId || data.contactId || data.leadId || data.clientId || null,
      } as any,
    });
    await this.logActivity(tenantId, 'CalendarEvent', meeting.id, `Meeting scheduled: ${meeting.title}`, userId, { meetingType: data.meetingType, projectId: data.projectId || data.dealId });
    return meeting;
  }

  async completeMeeting(id: string, tenantId: string, data: Record<string, any>, userId?: string) {
    const meeting = await prisma.calendarEvent.update({
      where: { id_tenantId: { id, tenantId } },
      data: { status: data.status || 'COMPLETED', notes: [data.meetingNotes, data.outcome, data.nextAction].filter(Boolean).join('\n\n') },
    });
    if (data.nextAction) {
      await this.ensureFollowUpTask(tenantId, { leadId: (meeting as any).leadId, clientId: (meeting as any).clientId, ownerId: (meeting as any).createdById, title: data.nextAction, key: `meeting-next:${meeting.id}`, priority: 'HIGH' });
    }
    await this.logActivity(tenantId, 'CalendarEvent', meeting.id, `Meeting completed: ${meeting.title}`, userId, { outcome: data.outcome, nextAction: data.nextAction });
    return meeting;
  }

  async logNote(tenantId: string, data: Record<string, any>, userId?: string) {
    const targetType = norm(data.targetType, data.projectId || data.dealId ? 'Deal' : data.leadId ? 'Lead' : data.clientId ? 'Account' : 'Contact');
    const targetId = data.targetId || data.projectId || data.dealId || data.leadId || data.clientId || data.contactId;
    if (!targetId || !data.note) throw new BadRequestError('Note target and content are required', ErrorCodes.VALIDATION_FAILED);
    const target = entityFromTarget(targetType, targetId);
    if (target.projectId) {
      await prisma.projectNote.create({ data: { tenantId, projectId: target.projectId, content: data.note, title: data.title || 'Sales note', createdById: userId || null } as any }).catch(() => null);
    }
    await this.logActivity(tenantId, target.entityType, target.entityId, data.title || 'Sales note added', userId, { note: data.note });
    return { success: true, targetType, targetId };
  }

  async stopSequencesForTarget(tenantId: string, targetType: string, targetId: string, reason: string) {
    return db.salesSequenceEnrollment.updateMany({ where: { tenantId, targetType, targetId, status: 'ACTIVE' }, data: { status: 'STOPPED', stoppedAt: new Date(), stopReason: reason } });
  }

  private async autoEnrollColdSequence(tenantId: string, targetType: string, targetId: string, ownerId?: string) {
    const sequence = await db.salesSequence.findFirst({ where: { tenantId, targetType, status: 'ACTIVE', sequenceName: { contains: 'Cold', mode: 'insensitive' } } });
    if (sequence) await this.startSequence(sequence.id, tenantId, { targetType, targetId }, ownerId);
  }

  private async autoEnrollProposalSequence(tenantId: string, targetType: string, targetId: string) {
    const sequence = await db.salesSequence.findFirst({ where: { tenantId, targetType, status: 'ACTIVE', sequenceName: { contains: 'Proposal', mode: 'insensitive' } } });
    if (sequence) await this.startSequence(sequence.id, tenantId, { targetType, targetId });
  }

  private async createFirstSequenceTask(tenantId: string, sequence: any, enrollment: any, userId?: string) {
    const first = Array.isArray(sequence.steps) ? sequence.steps[0] : null;
    if (!first) return;
    if (!['task', 'call'].includes(String(first.type || '').toLowerCase())) return;
    const target = entityFromTarget(enrollment.targetType, enrollment.targetId);
    await this.ensureFollowUpTask(tenantId, { ...target, ownerId: sequence.ownerId, title: first.title || `${first.type} step: ${sequence.sequenceName}`, key: `sequence:${enrollment.id}:0`, days: Number(first.delayDays || 0), priority: 'MEDIUM' });
  }

  private async ensureFollowUpTask(tenantId: string, input: Record<string, any>) {
    const referenceDocname = input.key;
    const existing = await prisma.task.findFirst({ where: { tenantId, referenceDoctype: 'SalesEngagement', referenceDocname } });
    if (existing) return existing;
    return prisma.task.create({
      data: {
        tenantId,
        title: input.title,
        description: input.description || null,
        status: 'TODO',
        priority: input.priority || 'MEDIUM',
        dueDate: input.dueDate || addDays(new Date(), input.days ?? 1),
        assignedToId: input.ownerId || null,
        leadId: input.leadId || null,
        clientId: input.clientId || null,
        projectId: input.projectId || null,
        referenceDoctype: 'SalesEngagement',
        referenceDocname,
      } as any,
    });
  }

  private async scheduleReminder(tenantId: string, call: any, userId?: string) {
    const existing = await prisma.calendarEvent.findFirst({ where: { tenantId, referenceDoctype: 'SalesEngagement', referenceDocname: `callback:${call.id}` } });
    if (existing) return existing;
    return prisma.calendarEvent.create({
      data: { tenantId, title: call.nextAction || 'Callback reminder', eventType: 'REMINDER', status: 'SCHEDULED', startTime: call.followUpDate, endTime: addDays(call.followUpDate, 0), timezone: 'UTC', createdById: userId || call.callerId || null, clientId: call.clientId || null, leadId: call.leadId || null, referenceDoctype: 'SalesEngagement', referenceDocname: `callback:${call.id}` } as any,
    });
  }

  private async logRelatedActivity(tenantId: string, call: any, description: string, userId?: string, metadata?: Record<string, any>) {
    const targets = [
      call.leadId ? ['Lead', call.leadId] : null,
      call.contactId ? ['Contact', call.contactId] : null,
      call.clientId ? ['Client', call.clientId] : null,
      call.projectId ? ['Project', call.projectId] : null,
    ].filter(Boolean) as string[][];
    for (const [entityType, entityId] of targets.length ? targets : [['SalesCall', call.id]]) {
      await this.logActivity(tenantId, entityType, entityId, description, userId, metadata);
    }
  }

  private async logActivity(tenantId: string, entityType: string, entityId: string, description: string, userId?: string, metadata?: Record<string, any>) {
    await activityLogger.log({ tenantId, entityType, entityId, action: 'CREATE', module: 'sales-engagement', description, userId, metadata });
  }
}

export const engagementService = new EngagementService();
