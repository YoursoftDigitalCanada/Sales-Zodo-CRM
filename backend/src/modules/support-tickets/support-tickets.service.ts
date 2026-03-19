import fs from 'fs/promises';
import path from 'path';
import { TicketStatus } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { mailerService } from '../../common/services/mailer.service';
import { prisma } from '../../config/database';
import {
  type CreateSupportTicketDto,
  type SupportTeamMemberDto,
  type SupportTicketQueryDto,
  type SupportTicketRequesterIdentity,
  toSupportTicketDto,
} from './support-tickets.dto';
import { supportTicketsRealtimeService } from './support-tickets.realtime';
import { supportTicketsRepository } from './support-tickets.repository';

// Hardcoded SMTP config for support email notifications
const SUPPORT_SMTP = {
  host: 'smtp.hostinger.com',
  port: 465,
  user: 'support@zodo.ca',
  pass: 'TimnpfSupport@365',
  senderName: 'ZODO CRM Support',
  senderEmail: 'support@zodo.ca',
};

function toPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

interface SupportTicketAttachmentMetadata {
  name?: string;
  url?: string;
  type?: string;
  storedName?: string;
}

function isSupportTicketAttachmentMetadata(value: unknown): value is SupportTicketAttachmentMetadata {
  return typeof value === 'object' && value !== null;
}

export class SupportTicketsService {
  private async getRequesterProfile(
    requester: SupportTicketRequesterIdentity
  ): Promise<{ requesterName: string; requesterEmail: string }> {
    const user = requester.userId
      ? await prisma.user.findUnique({
          where: { id: requester.userId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : null;

    const requesterName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || requester.email || 'Workspace User';
    const requesterEmail = user?.email || requester.email;

    if (!requesterEmail) {
      throw new BadRequestError('Authenticated requester email is required to create a ticket');
    }

    return {
      requesterName,
      requesterEmail,
    };
  }

  private async getSupportTeamDirectory(): Promise<Map<string, SupportTeamMemberDto>> {
    const team = await this.getSupportTeam();
    return new Map(team.map((member) => [member.email.toLowerCase(), member]));
  }

  private async emitTicketEvent(
    event: 'ticket_created' | 'ticket_updated' | 'ticket_deleted',
    ticket: Awaited<ReturnType<typeof supportTicketsRepository.findByIdForAdmin>>
  ): Promise<void> {
    if (!ticket) {
      return;
    }

    const supportTeam = await this.getSupportTeamDirectory();
    supportTicketsRealtimeService.publishTicketEvent(
      event,
      {
        tenantId: ticket.tenantId,
        requesterUserId: ticket.requesterUserId,
        requesterEmail: ticket.requesterEmail,
      },
      {
        admin: event === 'ticket_deleted'
          ? { id: ticket.id }
          : { ticket: toSupportTicketDto(ticket, { viewer: 'admin', supportTeam }) },
        requester: event === 'ticket_deleted'
          ? { id: ticket.id }
          : { ticket: toSupportTicketDto(ticket, { viewer: 'crm', supportTeam }) },
      }
    );
  }

  private async buildSupportEmailAttachments(
    tenantId: string,
    attachments: unknown[]
  ): Promise<Array<{ filename: string; content: Buffer; contentType?: string }>> {
    const emailAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];

    for (const attachment of attachments) {
      if (!isSupportTicketAttachmentMetadata(attachment) || !attachment.storedName || !attachment.name) {
        continue;
      }

      try {
        const filePath = path.join(process.cwd(), 'uploads', tenantId, attachment.storedName);
        const content = await fs.readFile(filePath);

        emailAttachments.push({
          filename: attachment.name,
          content,
          contentType: attachment.type || 'application/octet-stream',
        });
      } catch (error: any) {
        console.warn(`Failed to attach support ticket file ${attachment.storedName}: ${error.message}`);
      }
    }

    return emailAttachments;
  }

  async createTicket(
    tenantId: string,
    requester: SupportTicketRequesterIdentity,
    data: CreateSupportTicketDto
  ) {
    const requesterProfile = await this.getRequesterProfile(requester);
    const ticket = await supportTicketsRepository.create(tenantId, {
      userId: requester.userId,
      requesterName: requesterProfile.requesterName,
      requesterEmail: requesterProfile.requesterEmail,
    }, data);

    try {
      const emailAttachments = await this.buildSupportEmailAttachments(
        tenantId,
        Array.isArray(ticket.attachments) ? ticket.attachments : []
      );

      await mailerService.sendMailWithConfig(SUPPORT_SMTP, {
        to: 'support@zodo.ca',
        subject: `[${ticket.ticketNumber}] New Support Ticket: ${ticket.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0891B2; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">New Support Ticket</h2>
              <p style="margin: 6px 0 0; opacity: 0.9;">${ticket.ticketNumber}</p>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; width: 120px;">Subject:</td><td style="padding: 8px 0; font-weight: 600;">${ticket.subject}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Priority:</td><td style="padding: 8px 0;">${ticket.priority}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Category:</td><td style="padding: 8px 0;">${ticket.category}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Requester:</td><td style="padding: 8px 0;">${ticket.requesterName} (${ticket.requesterEmail})</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Attachments:</td><td style="padding: 8px 0;">${emailAttachments.length > 0 ? `${emailAttachments.length} file(s)` : 'None'}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
              <h3 style="color: #0f172a; margin: 0 0 8px;">Description</h3>
              <p style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${ticket.description}</p>
            </div>
          </div>
        `,
        attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
      });
    } catch (error: any) {
      console.error(`Failed to send support ticket email: ${error.message}`);
    }

    await this.emitTicketEvent('ticket_created', ticket);

    const supportTeam = await this.getSupportTeamDirectory();
    return toSupportTicketDto(ticket, { viewer: 'crm', supportTeam });
  }

  async getRequesterTickets(
    tenantId: string,
    requester: SupportTicketRequesterIdentity,
    query: SupportTicketQueryDto
  ) {
    const { data, total } = await supportTicketsRepository.findManyForRequester(tenantId, requester, query);
    const page = query.page || 1;
    const limit = query.limit || 50;
    const supportTeam = await this.getSupportTeamDirectory();

    return {
      data: data.map((ticket) => toSupportTicketDto(ticket, { viewer: 'crm', supportTeam })),
      meta: toPaginationMeta(page, limit, total),
    };
  }

  async getAdminTickets(query: SupportTicketQueryDto) {
    const { data, total } = await supportTicketsRepository.findManyForAdmin(query);
    const page = query.page || 1;
    const limit = query.limit || 50;
    const supportTeam = await this.getSupportTeamDirectory();

    return {
      data: data.map((ticket) => toSupportTicketDto(ticket, { viewer: 'admin', supportTeam })),
      meta: toPaginationMeta(page, limit, total),
    };
  }

  async getRequesterTicketById(
    id: string,
    tenantId: string,
    requester: SupportTicketRequesterIdentity
  ) {
    const ticket = await supportTicketsRepository.findByIdForRequester(id, tenantId, requester);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const supportTeam = await this.getSupportTeamDirectory();
    return toSupportTicketDto(ticket, { viewer: 'crm', supportTeam });
  }

  async getAdminTicketById(id: string) {
    const ticket = await supportTicketsRepository.findByIdForAdmin(id);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const supportTeam = await this.getSupportTeamDirectory();
    return toSupportTicketDto(ticket, { viewer: 'admin', supportTeam });
  }

  async updateRequesterStatus(
    id: string,
    tenantId: string,
    requester: SupportTicketRequesterIdentity,
    status: TicketStatus,
    actor: string
  ) {
    const ticket = await supportTicketsRepository.updateStatusForRequester(id, tenantId, requester, status, actor);
    await this.emitTicketEvent('ticket_updated', ticket);

    const supportTeam = await this.getSupportTeamDirectory();
    return toSupportTicketDto(ticket, { viewer: 'crm', supportTeam });
  }

  async updateAdminStatus(id: string, status: TicketStatus, actor: string) {
    const ticket = await supportTicketsRepository.updateStatusForAdmin(id, status, actor);
    await this.emitTicketEvent('ticket_updated', ticket);

    const supportTeam = await this.getSupportTeamDirectory();
    return toSupportTicketDto(ticket, { viewer: 'admin', supportTeam });
  }

  async assignAdminTicket(id: string, assignee: string | null, actor: string) {
    const normalizedAssignee = assignee?.trim().toLowerCase() || null;
    const ticket = await supportTicketsRepository.assign(id, normalizedAssignee, actor);
    await this.emitTicketEvent('ticket_updated', ticket);

    const supportTeam = await this.getSupportTeamDirectory();
    return toSupportTicketDto(ticket, { viewer: 'admin', supportTeam });
  }

  async addRequesterMessage(
    id: string,
    tenantId: string,
    requester: SupportTicketRequesterIdentity,
    sender: string,
    message: string
  ) {
    const ticket = await supportTicketsRepository.addMessageForRequester(id, tenantId, requester, {
      sender,
      message,
      isStaff: false,
      isInternal: false,
    });
    await this.emitTicketEvent('ticket_updated', ticket);

    const supportTeam = await this.getSupportTeamDirectory();
    return toSupportTicketDto(ticket, { viewer: 'crm', supportTeam });
  }

  async addAdminMessage(
    id: string,
    sender: string,
    message: string,
    isInternal: boolean
  ) {
    const ticket = await supportTicketsRepository.addMessageForAdmin(id, {
      sender,
      message,
      isStaff: true,
      isInternal,
    });
    await this.emitTicketEvent('ticket_updated', ticket);

    const supportTeam = await this.getSupportTeamDirectory();
    return toSupportTicketDto(ticket, { viewer: 'admin', supportTeam });
  }

  async deleteRequesterTicket(
    id: string,
    tenantId: string,
    requester: SupportTicketRequesterIdentity
  ) {
    const deleted = await supportTicketsRepository.deleteForRequester(id, tenantId, requester);
    await this.emitTicketEvent('ticket_deleted', deleted);
  }

  async deleteAdminTicket(id: string) {
    const deleted = await supportTicketsRepository.deleteForAdmin(id);
    await this.emitTicketEvent('ticket_deleted', deleted);
  }

  async getRequesterStats(tenantId: string, requester: SupportTicketRequesterIdentity) {
    return supportTicketsRepository.getStatsForRequester(tenantId, requester);
  }

  async getSupportTeam(): Promise<SupportTeamMemberDto[]> {
    const admins = await prisma.superAdmin.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    return admins.map((admin) => ({
      id: admin.id,
      name: `${admin.firstName} ${admin.lastName}`.trim(),
      email: admin.email.toLowerCase(),
      role: admin.role,
    }));
  }
}

export const supportTicketsService = new SupportTicketsService();
