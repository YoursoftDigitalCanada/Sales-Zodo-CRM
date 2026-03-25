import { Prisma, TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import type {
  AddSupportTicketMessageDto,
  CreateSupportTicketDto,
  SupportTicketQueryDto,
  SupportTicketRequesterIdentity,
} from './support-tickets.dto';

const ticketInclude = {
  messages: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  tenant: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.SupportTicketInclude;

function formatStatus(status: TicketStatus): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildRequesterScope(
  tenantId: string,
  requester: SupportTicketRequesterIdentity
): Prisma.SupportTicketWhereInput {
  const email = requester.email?.trim().toLowerCase();
  const matches: Prisma.SupportTicketWhereInput[] = [];

  if (requester.userId) {
    matches.push({ requesterUserId: requester.userId });
  }
  if (email) {
    matches.push({ requesterEmail: email });
  }

  if (matches.length === 0) {
    return {
      tenantId,
      id: '__unreachable__',
    };
  }

  return {
    tenantId,
    deletedAt: null,
    OR: matches,
  };
}

function buildTicketFilters(query: SupportTicketQueryDto): Prisma.SupportTicketWhereInput[] {
  const filters: Prisma.SupportTicketWhereInput[] = [];

  if (query.status && query.status !== 'ALL') {
    filters.push({ status: query.status });
  }
  if (query.priority && query.priority !== 'ALL') {
    filters.push({ priority: query.priority });
  }
  if (query.assignee === 'unassigned') {
    filters.push({ assignee: null });
  } else if (query.assignee) {
    filters.push({ assignee: query.assignee });
  }
  if (query.search) {
    filters.push({
      OR: [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { ticketNumber: { contains: query.search, mode: 'insensitive' } },
        { requesterName: { contains: query.search, mode: 'insensitive' } },
        { requesterEmail: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  return filters;
}

function toOrderBy(query: SupportTicketQueryDto): Prisma.SupportTicketOrderByWithRelationInput {
  const sortBy = query.sortBy || 'updatedAt';
  const sortOrder = query.sortOrder || 'desc';

  return {
    [sortBy]: sortOrder,
  } as Prisma.SupportTicketOrderByWithRelationInput;
}

async function createSystemNote(
  tx: Prisma.TransactionClient,
  ticketId: string,
  message: string
): Promise<void> {
  await tx.ticketMessage.create({
    data: {
      ticketId,
      sender: 'System',
      message,
      isStaff: true,
      isInternal: true,
    },
  });
}

export class SupportTicketsRepository {
  private async generateTicketNumber(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
    const count = await tx.supportTicket.count({ where: { tenantId } });
    return `TK-${String(count + 1).padStart(4, '0')}`;
  }

  private async findExistingForRequester(
    tx: Prisma.TransactionClient,
    id: string,
    tenantId: string,
    requester: SupportTicketRequesterIdentity
  ) {
    return tx.supportTicket.findFirst({
      where: {
        id,
        AND: [buildRequesterScope(tenantId, requester)],
      },
      include: ticketInclude,
    });
  }

  async create(
    tenantId: string,
    requester: SupportTicketRequesterIdentity & {
      requesterName: string;
      requesterEmail: string;
    },
    data: CreateSupportTicketDto
  ) {
    return prisma.$transaction(async (tx) => {
      const ticketNumber = await this.generateTicketNumber(tx, tenantId);

      return tx.supportTicket.create({
        data: {
          tenantId,
          ticketNumber,
          subject: data.subject,
          description: data.description,
          priority: data.priority || 'MEDIUM',
          category: data.category || 'Technical',
          requesterUserId: requester.userId || null,
          requesterName: requester.requesterName,
          requesterEmail: requester.requesterEmail.toLowerCase(),
          status: 'OPEN',
          messagesCount: 0,
          attachments: (data.attachments || []) as Prisma.InputJsonValue,
        },
        include: ticketInclude,
      });
    });
  }

  async findManyForRequester(
    tenantId: string,
    requester: SupportTicketRequesterIdentity,
    query: SupportTicketQueryDto
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const where: Prisma.SupportTicketWhereInput = {
      AND: [buildRequesterScope(tenantId, requester), ...buildTicketFilters(query)],
    };

    const [data, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: ticketInclude,
        orderBy: toOrderBy(query),
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { data, total };
  }

  async findManyForAdmin(query: SupportTicketQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const where: Prisma.SupportTicketWhereInput = {
      AND: [{ deletedAt: null }, ...buildTicketFilters(query)],
    };

    const [data, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: ticketInclude,
        orderBy: toOrderBy(query),
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { data, total };
  }

  async findByIdForRequester(id: string, tenantId: string, requester: SupportTicketRequesterIdentity) {
    return prisma.supportTicket.findFirst({
      where: {
        id,
        AND: [buildRequesterScope(tenantId, requester)],
      },
      include: ticketInclude,
    });
  }

  async findByIdForAdmin(id: string) {
    return prisma.supportTicket.findFirst({
      where: { id, deletedAt: null },
      include: ticketInclude,
    });
  }

  async updateStatusForRequester(
    id: string,
    tenantId: string,
    requester: SupportTicketRequesterIdentity,
    status: TicketStatus,
    actor: string
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await this.findExistingForRequester(tx, id, tenantId, requester);
      if (!existing) {
        throw new Error('Ticket not found');
      }

      if (existing.status === status) {
        return existing;
      }

      await tx.supportTicket.update({
        where: { id },
        data: {
          status,
          resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
        },
      });
      await createSystemNote(
        tx,
        id,
        `${actor} changed the status from ${formatStatus(existing.status)} to ${formatStatus(status)}.`
      );

      return tx.supportTicket.findUniqueOrThrow({
        where: { id },
        include: ticketInclude,
      });
    });
  }

  async updateStatusForAdmin(id: string, status: TicketStatus, actor: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.supportTicket.findFirst({
        where: { id, deletedAt: null },
        include: ticketInclude,
      });
      if (!existing) {
        throw new Error('Ticket not found');
      }

      if (existing.status === status) {
        return existing;
      }

      await tx.supportTicket.update({
        where: { id },
        data: {
          status,
          resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
        },
      });
      await createSystemNote(
        tx,
        id,
        `${actor} changed the status from ${formatStatus(existing.status)} to ${formatStatus(status)}.`
      );

      return tx.supportTicket.findUniqueOrThrow({
        where: { id },
        include: ticketInclude,
      });
    });
  }

  async assign(id: string, assignee: string | null, actor: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.supportTicket.findFirst({
        where: { id, deletedAt: null },
        include: ticketInclude,
      });
      if (!existing) {
        throw new Error('Ticket not found');
      }

      if ((existing.assignee || null) === assignee) {
        return existing;
      }

      await tx.supportTicket.update({
        where: { id },
        data: {
          assignee,
        },
      });
      await createSystemNote(
        tx,
        id,
        assignee
          ? `${actor} assigned the ticket to ${assignee}.`
          : `${actor} cleared the ticket assignment.`
      );

      return tx.supportTicket.findUniqueOrThrow({
        where: { id },
        include: ticketInclude,
      });
    });
  }

  async addMessageForRequester(
    id: string,
    tenantId: string,
    requester: SupportTicketRequesterIdentity,
    data: AddSupportTicketMessageDto
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await this.findExistingForRequester(tx, id, tenantId, requester);
      if (!existing) {
        throw new Error('Ticket not found');
      }

      await tx.ticketMessage.create({
        data: {
          ticketId: id,
          sender: data.sender,
          message: data.message,
          isStaff: false,
          isInternal: false,
        },
      });

      await tx.supportTicket.update({
        where: { id },
        data: {
          messagesCount: { increment: 1 },
          status: existing.status,
          resolvedAt: existing.resolvedAt,
        },
      });

      return tx.supportTicket.findUniqueOrThrow({
        where: { id },
        include: ticketInclude,
      });
    });
  }

  async addMessageForAdmin(id: string, data: AddSupportTicketMessageDto) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.supportTicket.findFirst({
        where: { id, deletedAt: null },
        include: ticketInclude,
      });
      if (!existing) {
        throw new Error('Ticket not found');
      }

      await tx.ticketMessage.create({
        data: {
          ticketId: id,
          sender: data.sender,
          message: data.message,
          isStaff: true,
          isInternal: Boolean(data.isInternal),
        },
      });

      const shouldAdvance =
        !data.isInternal && (existing.status === 'OPEN' || existing.status === 'WAITING');
      const nextStatus = shouldAdvance ? 'IN_PROGRESS' : existing.status;

      await tx.supportTicket.update({
        where: { id },
        data: {
          ...(data.isInternal ? {} : { messagesCount: { increment: 1 } }),
          status: nextStatus,
          resolvedAt: nextStatus === 'RESOLVED' || nextStatus === 'CLOSED' ? existing.resolvedAt : null,
        },
      });

      if (shouldAdvance) {
        await createSystemNote(
          tx,
          id,
          `${data.sender} moved the ticket into ${formatStatus(nextStatus)} after replying.`
        );
      }

      return tx.supportTicket.findUniqueOrThrow({
        where: { id },
        include: ticketInclude,
      });
    });
  }

  async deleteForRequester(id: string, tenantId: string, requester: SupportTicketRequesterIdentity) {
    const existing = await prisma.supportTicket.findFirst({
      where: {
        id,
        AND: [buildRequesterScope(tenantId, requester)],
      },
      include: ticketInclude,
    });
    if (!existing) {
      throw new Error('Ticket not found');
    }

    await prisma.supportTicket.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return existing;
  }

  async deleteForAdmin(id: string) {
    const existing = await prisma.supportTicket.findFirst({
      where: { id, deletedAt: null },
      include: ticketInclude,
    });
    if (!existing) {
      throw new Error('Ticket not found');
    }

    await prisma.supportTicket.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return existing;
  }

  async getStatsForRequester(tenantId: string, requester: SupportTicketRequesterIdentity) {
    const scope = buildRequesterScope(tenantId, requester);

    const [open, inProgress, waiting, resolved, total] = await Promise.all([
      prisma.supportTicket.count({ where: { AND: [scope, { status: 'OPEN' }] } }),
      prisma.supportTicket.count({ where: { AND: [scope, { status: 'IN_PROGRESS' }] } }),
      prisma.supportTicket.count({ where: { AND: [scope, { status: 'WAITING' }] } }),
      prisma.supportTicket.count({
        where: { AND: [scope, { status: { in: ['RESOLVED', 'CLOSED'] } }] },
      }),
      prisma.supportTicket.count({ where: scope }),
    ]);

    return { open, inProgress, waiting, resolved, total };
  }
}

export const supportTicketsRepository = new SupportTicketsRepository();
