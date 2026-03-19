import { SupportTicket, TicketMessage, TicketPriority, TicketStatus } from '@prisma/client';

export interface SupportTeamMemberDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SupportTicketMessageDto {
  id: string;
  sender: string;
  message: string;
  isStaff: boolean;
  isInternal: boolean;
  createdAt: Date;
}

export interface SupportTicketActivityDto {
  id: string;
  type: 'created' | 'reply' | 'internal_note';
  actor: string;
  content: string;
  createdAt: Date;
}

export interface SupportTicketResponseDto {
  id: string;
  ticketId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  userId: string | null;
  workspaceId: string;
  requesterName: string;
  requesterEmail: string;
  assignedTo: string | null;
  assignedToName: string | null;
  messagesCount: number;
  internalNotesCount: number;
  category: string;
  tags: string[];
  attachments: unknown[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  tenant?: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  messages: SupportTicketMessageDto[];
  activity: SupportTicketActivityDto[];
}

export interface SupportTicketListResponseDto {
  data: SupportTicketResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SupportTicketQueryDto {
  page?: number;
  limit?: number;
  status?: TicketStatus | 'ALL';
  priority?: TicketPriority | 'ALL';
  assignee?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSupportTicketDto {
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: string;
  attachments?: unknown[];
}

export interface AddSupportTicketMessageDto {
  sender: string;
  message: string;
  isStaff: boolean;
  isInternal?: boolean;
}

export interface SupportTicketRequesterIdentity {
  userId?: string;
  email?: string;
}

export type SupportTicketRecord = SupportTicket & {
  messages: TicketMessage[];
  tenant?: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
};

function toAttachments(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toActivity(messages: SupportTicketMessageDto[], requesterName: string, createdAt: Date, ticketId: string): SupportTicketActivityDto[] {
  const activity: SupportTicketActivityDto[] = [
    {
      id: `${ticketId}-created`,
      type: 'created',
      actor: requesterName,
      content: 'Ticket created',
      createdAt,
    },
    ...messages.map((message) => ({
      id: message.id,
      type: message.isInternal ? 'internal_note' as const : 'reply' as const,
      actor: message.sender,
      content: message.message,
      createdAt: message.createdAt,
    })),
  ];

  return activity.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
}

function toAssignedToName(assignedTo: string | null, supportTeam?: Map<string, SupportTeamMemberDto>): string | null {
  if (!assignedTo) {
    return null;
  }

  const match = supportTeam?.get(assignedTo.toLowerCase());
  return match?.name || assignedTo;
}

export function toSupportTicketDto(
  ticket: SupportTicketRecord,
  options: {
    viewer: 'crm' | 'admin';
    supportTeam?: Map<string, SupportTeamMemberDto>;
  }
): SupportTicketResponseDto {
  const visibleMessages = options.viewer === 'admin'
    ? ticket.messages
    : ticket.messages.filter((message) => !message.isInternal);
  const messages: SupportTicketMessageDto[] = visibleMessages.map((message) => ({
    id: message.id,
    sender: message.sender,
    message: message.message,
    isStaff: message.isStaff,
    isInternal: message.isInternal,
    createdAt: message.createdAt,
  }));

  return {
    id: ticket.id,
    ticketId: ticket.ticketNumber,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    userId: ticket.requesterUserId || null,
    workspaceId: ticket.tenantId,
    requesterName: ticket.requesterName,
    requesterEmail: ticket.requesterEmail,
    assignedTo: ticket.assignee || null,
    assignedToName: toAssignedToName(ticket.assignee || null, options.supportTeam),
    messagesCount: ticket.messagesCount,
    internalNotesCount: ticket.messages.filter((message) => message.isInternal).length,
    category: ticket.category,
    tags: ticket.tags || [],
    attachments: toAttachments(ticket.attachments),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    resolvedAt: ticket.resolvedAt || null,
    ...(options.viewer === 'admin'
      ? {
          tenant: ticket.tenant
            ? {
                id: ticket.tenant.id,
                name: ticket.tenant.name,
                slug: ticket.tenant.slug,
              }
            : null,
        }
      : {}),
    messages,
    activity: toActivity(messages, ticket.requesterName, ticket.createdAt, ticket.id),
  };
}
