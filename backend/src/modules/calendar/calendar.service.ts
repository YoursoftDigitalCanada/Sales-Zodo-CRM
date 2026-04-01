import { calendarRepository } from './calendar.repository';
import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto, toCalendarEventResponseDto } from './calendar.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { mailerService } from '../../common/services/mailer.service';
import { prisma } from '../../config/database';

function buildMeetingEmailHtml(opts: {
    recipientName: string;
    isLead: boolean;
    leadName: string;
    title: string;
    dateStr: string;
    timeStr: string;
    endTimeStr: string;
    meetingType: string;
    locationOrLink: string;
    meetingLink?: string;
    description?: string;
}): string {
    const introText = opts.isLead
        ? 'We are excited to connect! A meeting has been scheduled with our team.'
        : `A qualification meeting has been scheduled with lead <strong>${opts.leadName}</strong>.`;

    const joinBtn = opts.meetingLink
        ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 16px;"><a href="${opts.meetingLink}" style="display:inline-block;background:#0891B2;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Join Meeting</a></td></tr></table>`
        : '';

    const notesRow = opts.description
        ? `<tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Notes</td><td style="padding:8px 0;font-size:14px;color:#475569;">${opts.description}</td></tr>`
        : '';

    const typeIcon = opts.meetingLink ? 'Online' : 'In-Person';
    const locLabel = opts.meetingLink ? 'Link' : 'Location';
    const locValue = opts.meetingLink
        ? `<a href="${opts.meetingLink}" style="color:#0891B2;text-decoration:none;font-weight:600;">${opts.meetingLink}</a>`
        : opts.locationOrLink;

    const timeDisplay = opts.endTimeStr ? `${opts.timeStr} - ${opts.endTimeStr}` : opts.timeStr;

    return [
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
        '<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">',
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;"><tr><td align="center">',
        '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">',
        // Header
        '<tr><td style="background:linear-gradient(135deg,#0891B2,#06B6D4);padding:32px 40px;text-align:center;">',
        '<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Meeting Scheduled</h1>',
        '<p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">A new meeting has been scheduled for you</p>',
        '</td></tr>',
        // Body
        '<tr><td style="padding:32px 40px;">',
        `<p style="margin:0 0 20px;font-size:16px;color:#0F172A;">Hi <strong>${opts.recipientName}</strong>,</p>`,
        `<p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">${introText}</p>`,
        // Meeting card
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px;">',
        '<tr><td style="padding:24px;">',
        `<h3 style="margin:0 0 16px;font-size:18px;color:#0F172A;">${opts.title}</h3>`,
        '<table width="100%" cellpadding="0" cellspacing="0">',
        `<tr><td style="padding:8px 0;font-size:13px;color:#64748b;width:100px;">Date</td><td style="padding:8px 0;font-size:14px;color:#0F172A;font-weight:600;">${opts.dateStr}</td></tr>`,
        `<tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Time</td><td style="padding:8px 0;font-size:14px;color:#0F172A;font-weight:600;">${timeDisplay}</td></tr>`,
        `<tr><td style="padding:8px 0;font-size:13px;color:#64748b;">Type</td><td style="padding:8px 0;font-size:14px;color:#0F172A;font-weight:600;">${typeIcon}</td></tr>`,
        `<tr><td style="padding:8px 0;font-size:13px;color:#64748b;">${locLabel}</td><td style="padding:8px 0;font-size:14px;color:#0F172A;">${locValue}</td></tr>`,
        notesRow,
        '</table></td></tr></table>',
        joinBtn,
        '<p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">This is an automated notification from ZODO CRM. Please do not reply to this email.</p>',
        '</td></tr>',
        // Footer
        `<tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;"><p style="margin:0;font-size:12px;color:#94a3b8;">ZODO CRM - Powered by Yoursoft Digital</p></td></tr>`,
        '</table></td></tr></table></body></html>',
    ].join('');
}

export class CalendarService {
    async create(tenantId: string, data: CreateCalendarEventDto, createdById?: string) {
        const event = await calendarRepository.create(tenantId, data, createdById);
        const dto = toCalendarEventResponseDto(event);

        activityLogger.log({
            tenantId, entityType: 'CalendarEvent', entityId: dto.id,
            action: 'CREATE', module: 'calendar',
            description: `Created calendar event "${(event as any).title || dto.id}"`,
            userId: createdById,
            metadata: { title: (event as any).title, startDate: (event as any).startDate },
        });

        eventBus.emit('calendar.created', {
            tenantId,
            eventId: dto.id,
            title: (event as any).title || '',
            startDate: (event as any).startTime?.toISOString?.() || undefined,
        });

        // Send email notifications if this meeting is linked to a lead
        if ((data as any).leadId) {
            this.sendMeetingNotifications(tenantId, event as any).catch((err) =>
                console.error('Failed to send meeting notification emails:', err.message)
            );
        }

        return dto;
    }

    private async sendMeetingNotifications(tenantId: string, event: any) {
        const leadId = event.leadId;
        if (!leadId) return;

        const lead = await prisma.lead.findFirst({
            where: { id: leadId, tenantId },
            include: {
                assignedTo: {
                    include: { user: { select: { firstName: true, lastName: true, email: true } } },
                },
            },
        });
        if (!lead) return;

        const startTime = event.startTime ? new Date(event.startTime) : null;
        const endTime = event.endTime ? new Date(event.endTime) : null;
        const dateStr = startTime
            ? startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : 'TBD';
        const timeStr = startTime
            ? startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : 'TBD';
        const endTimeStr = endTime
            ? endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '';
        const leadName = `${lead.firstName} ${lead.lastName}`;

        const emailOpts = {
            title: event.title || 'Meeting',
            dateStr,
            timeStr,
            endTimeStr,
            meetingType: event.meetingLink ? 'Online Meeting' : 'In-Person Meeting',
            locationOrLink: event.location || 'TBD',
            meetingLink: event.meetingLink || undefined,
            description: event.description || undefined,
            leadName,
        };

        const emails: Promise<boolean>[] = [];

        // Email to lead
        if (lead.email) {
            emails.push(
                mailerService.sendMail({
                    to: lead.email,
                    subject: `Meeting Scheduled: ${event.title || 'Upcoming Meeting'}`,
                    html: buildMeetingEmailHtml({ ...emailOpts, recipientName: leadName, isLead: true }),
                })
            );
        }

        // Email to assigned employee
        const emp = lead.assignedTo?.user;
        if (emp?.email) {
            emails.push(
                mailerService.sendMail({
                    to: emp.email,
                    subject: `Meeting Scheduled with ${leadName}`,
                    html: buildMeetingEmailHtml({ ...emailOpts, recipientName: `${emp.firstName} ${emp.lastName}`, isLead: false }),
                })
            );
        }

        await Promise.allSettled(emails);
    }

    async getById(id: string, tenantId: string) {
        const event = await calendarRepository.findById(id, tenantId);
        if (!event) throw new NotFoundError('Calendar event not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toCalendarEventResponseDto(event);
    }

    async getMany(tenantId: string, query: CalendarEventQueryDto) {
        const { data, total } = await calendarRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 50;
        return {
            data: data.map(toCalendarEventResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateCalendarEventDto) {
        const existing = await calendarRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Calendar event not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const event = await calendarRepository.update(id, tenantId, data);
        const dto = toCalendarEventResponseDto(event);

        activityLogger.log({
            tenantId, entityType: 'CalendarEvent', entityId: dto.id,
            action: 'UPDATE', module: 'calendar',
            description: `Updated calendar event "${(event as any).title || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await calendarRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Calendar event not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'CalendarEvent', entityId: id,
            action: 'DELETE', module: 'calendar',
            description: `Deleted calendar event "${(existing as any).title || id}"`,
        });

        await calendarRepository.delete(id, tenantId);
    }

    async updateStatus(id: string, tenantId: string, status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED') {
        const existing = await calendarRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Calendar event not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const event = await calendarRepository.updateStatus(id, tenantId, status);
        const dto = toCalendarEventResponseDto(event);

        activityLogger.log({
            tenantId, entityType: 'CalendarEvent', entityId: dto.id,
            action: 'UPDATE', module: 'calendar',
            description: `Marked calendar event "${(event as any).title || dto.id}" as ${status}`,
            metadata: { status },
        });

        // Emit calendar.completed for automation engine
        if (status === 'COMPLETED') {
            eventBus.emit('calendar.completed', {
                tenantId,
                eventId: dto.id,
                title: (event as any).title || '',
                eventType: (event as any).eventType || '',
                category: (event as any).category,
                leadId: (event as any).leadId || undefined,
                clientId: (event as any).clientId || undefined,
                createdById: (event as any).createdById || undefined,
                createdByUserId: (event as any).createdBy?.userId || undefined,
                description: (event as any).description || undefined,
            });
        }

        return dto;
    }
}

export const calendarService = new CalendarService();
