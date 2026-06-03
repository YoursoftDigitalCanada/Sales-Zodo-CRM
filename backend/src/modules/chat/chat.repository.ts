import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import {
    ChatAttachmentDto,
    ConversationQueryDto,
    ConversationSettingsDto,
    CreateConversationDto,
    MessageQueryDto,
    ParticipantWithEmployee,
    SendMessageDto,
    UpdateMessageDto,
} from './chat.dto';
import { notificationManager } from '../notifications/notifications.manager';

const participantInclude = {
    employee: {
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    avatar: true,
                    phone: true,
                    lastLoginAt: true,
                },
            },
            role: {
                select: {
                    name: true,
                },
            },
        },
    },
} as const;

const conversationInclude = {
    participants: {
        where: {
            leftAt: null,
        },
        include: participantInclude,
    },
    messages: {
        where: {
            deletedAt: null,
        },
        orderBy: {
            createdAt: 'desc' as const,
        },
        take: 1,
    },
} as const;

type ConversationRecord = Prisma.ChatRoomGetPayload<{
    include: typeof conversationInclude;
}>;

type MessageRecord = Prisma.ChatMessageGetPayload<{}> & {
    senderParticipant?: ParticipantWithEmployee | null;
};

function normalizeConversationName(name?: string | null): string | null {
    const normalized = name?.trim();
    return normalized ? normalized : null;
}

function normalizeAttachments(attachments?: ChatAttachmentDto[]): ChatAttachmentDto[] {
    return (attachments || [])
        .map((attachment, index) => ({
            id: attachment.id || `att-${Date.now()}-${index}`,
            name: attachment.name?.trim() || undefined,
            size: attachment.size?.trim() || undefined,
            type: (attachment.type === 'image' ? 'image' : 'file') as 'image' | 'file',
            url: String(attachment.url || '').trim(),
        }))
        .filter((attachment) => attachment.url);
}

function buildMessagePreview(content: string, attachments: ChatAttachmentDto[]): string {
    if (content.trim()) {
        return content.trim().slice(0, 160);
    }

    if (attachments.length === 0) {
        return 'New message';
    }

    if (attachments.length === 1) {
        const attachment = attachments[0];
        const label = attachment.name || (attachment.type === 'image' ? 'Photo' : 'Attachment');
        return attachment.type === 'image' ? `Photo: ${label}` : `Attachment: ${label}`;
    }

    return `${attachments.length} attachments`;
}

function resolveMessageType(content: string, attachments: ChatAttachmentDto[]): string {
    if (attachments.length === 0) {
        return 'text';
    }

    if (!content.trim() && attachments.every((attachment) => attachment.type === 'image')) {
        return 'image';
    }

    return 'file';
}

function resolveParticipantName(participant: ParticipantWithEmployee | null | undefined): string {
    if (!participant) {
        return 'Someone';
    }

    const firstName = participant.employee.user.firstName || '';
    const lastName = participant.employee.user.lastName || '';
    return `${firstName} ${lastName}`.trim() || participant.employee.user.email;
}

export class ChatRepository {
    listDirectory(tenantId: string, currentEmployeeId: string) {
        return prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true,
                id: { not: currentEmployeeId },
                user: {
                    email: {
                        not: '',
                    },
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true,
                        phone: true,
                        lastLoginAt: true,
                    },
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                { user: { firstName: 'asc' } },
                { user: { lastName: 'asc' } },
                { user: { email: 'asc' } },
            ],
            take: 500,
        });
    }

    private async ensureTenantEmployees(tenantId: string, employeeIds: string[]) {
        const uniqueEmployeeIds = Array.from(new Set(employeeIds));
        const employees = await prisma.employee.findMany({
            where: {
                tenantId,
                id: { in: uniqueEmployeeIds },
                isActive: true,
            },
            select: {
                id: true,
            },
        });

        if (employees.length !== uniqueEmployeeIds.length) {
            throw new BadRequestError(
                'One or more selected employees are unavailable for chat',
                ErrorCodes.INVALID_INPUT,
            );
        }

        return uniqueEmployeeIds;
    }

    private async findParticipant(roomId: string, tenantId: string, employeeId: string) {
        return prisma.chatParticipant.findFirst({
            where: {
                roomId,
                employeeId,
                leftAt: null,
                room: {
                    tenantId,
                },
            },
        });
    }

    private async findConversationRecord(id: string, tenantId: string, employeeId: string) {
        return prisma.chatRoom.findFirst({
            where: {
                id,
                tenantId,
                participants: {
                    some: {
                        employeeId,
                        leftAt: null,
                    },
                },
            },
            include: conversationInclude,
        });
    }

    async createConversation(tenantId: string, data: CreateConversationDto, createdById: string): Promise<ConversationRecord> {
        const participantIds = await this.ensureTenantEmployees(tenantId, [
            createdById,
            ...(data.participantIds || []),
        ]);
        const isGroup = Boolean(data.isGroup || participantIds.length > 2);

        if (!isGroup && participantIds.length !== 2) {
            throw new BadRequestError(
                'Direct chats must include exactly two participants',
                ErrorCodes.INVALID_INPUT,
            );
        }

        if (!isGroup) {
            const existingRooms = await prisma.chatRoom.findMany({
                where: {
                    tenantId,
                    isGroup: false,
                    participants: {
                        some: {
                            employeeId: {
                                in: participantIds,
                            },
                        },
                    },
                },
                include: {
                    participants: true,
                },
            });

            const existingRoom = existingRooms.find((room) => {
                const roomParticipantIds = Array.from(
                    new Set(room.participants.map((participant) => participant.employeeId)),
                );

                return roomParticipantIds.length === 2
                    && participantIds.every((employeeId) => roomParticipantIds.includes(employeeId));
            });

            if (existingRoom) {
                await prisma.chatParticipant.updateMany({
                    where: {
                        roomId: existingRoom.id,
                        employeeId: {
                            in: participantIds,
                        },
                    },
                    data: {
                        leftAt: null,
                        isArchived: false,
                    },
                });

                const restored = await this.findConversationRecord(existingRoom.id, tenantId, createdById);
                if (!restored) {
                    throw new NotFoundError('Conversation not found', ErrorCodes.RESOURCE_NOT_FOUND);
                }
                return restored;
            }
        }

        const room = await prisma.chatRoom.create({
            data: {
                tenantId,
                isGroup,
                name: isGroup ? normalizeConversationName(data.name) : null,
                participants: {
                    create: participantIds.map((employeeId) => ({
                        employeeId,
                        role: employeeId === createdById ? 'admin' : 'member',
                        lastReadAt: employeeId === createdById ? new Date() : null,
                    })),
                },
            },
            select: {
                id: true,
            },
        });

        const created = await this.findConversationRecord(room.id, tenantId, createdById);
        if (!created) {
            throw new NotFoundError('Conversation not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return created;
    }

    async findConversationById(id: string, tenantId: string, employeeId: string): Promise<ConversationRecord | null> {
        return this.findConversationRecord(id, tenantId, employeeId);
    }

    async findConversations(tenantId: string, employeeId: string, query: ConversationQueryDto) {
        const { page = 1, limit = 20, archived = false } = query;
        const where: Prisma.ChatRoomWhereInput = {
            tenantId,
            participants: {
                some: {
                    employeeId,
                    leftAt: null,
                    isArchived: archived,
                },
            },
        };

        const [data, total] = await Promise.all([
            prisma.chatRoom.findMany({
                where,
                include: conversationInclude,
                orderBy: [
                    { lastMessageAt: 'desc' },
                    { updatedAt: 'desc' },
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.chatRoom.count({ where }),
        ]);

        return {
            data,
            total,
        };
    }

    async sendMessage(roomId: string, tenantId: string, senderId: string, data: SendMessageDto): Promise<MessageRecord> {
        const attachments = normalizeAttachments(data.attachments);
        const content = (data.content || '').trim();
        const preview = buildMessagePreview(content, attachments);
        const messageType = resolveMessageType(content, attachments);

        const result = await prisma.$transaction(async (tx) => {
            const participant = await tx.chatParticipant.findFirst({
                where: {
                    roomId,
                    employeeId: senderId,
                    leftAt: null,
                    room: {
                        tenantId,
                    },
                },
                include: {
                    room: true,
                },
            });

            if (!participant) {
                throw new ForbiddenError('You do not have access to this conversation', ErrorCodes.TENANT_ACCESS_DENIED);
            }

            const message = await tx.chatMessage.create({
                data: {
                    roomId,
                    senderId,
                    content,
                    attachments: attachments as unknown as Prisma.InputJsonValue,
                    messageType,
                },
            });

            await tx.chatRoom.update({
                where: {
                    id: roomId,
                },
                data: {
                    lastMessageAt: message.createdAt,
                    lastMessagePreview: preview,
                },
            });

            await tx.chatParticipant.updateMany({
                where: {
                    roomId,
                    leftAt: null,
                    employeeId: senderId,
                },
                data: {
                    unreadCount: 0,
                    lastReadAt: new Date(),
                    isArchived: false,
                },
            });

            await tx.chatParticipant.updateMany({
                where: {
                    roomId,
                    leftAt: null,
                    employeeId: {
                        not: senderId,
                    },
                },
                data: {
                    unreadCount: {
                        increment: 1,
                    },
                    isArchived: false,
                },
            });

            const room = await tx.chatRoom.findFirst({
                where: {
                    id: roomId,
                    tenantId,
                },
                include: conversationInclude,
            });

            if (!room) {
                throw new NotFoundError('Conversation not found', ErrorCodes.RESOURCE_NOT_FOUND);
            }

            const senderParticipant = room.participants.find((entry) => entry.employeeId === senderId) || null;
            const recipients = room.participants.filter(
                (entry) => entry.employeeId !== senderId && !entry.isMuted,
            );

            return {
                message,
                senderParticipant,
                recipients,
                preview,
            };
        });

        const senderName = resolveParticipantName(result.senderParticipant);
        await Promise.all(
            result.recipients.map((recipient) =>
                notificationManager.notifyNewChatMessage(
                    recipient.employee.user.id,
                    tenantId,
                    roomId,
                    senderName,
                    result.preview,
                ),
            ),
        );

        return {
            ...result.message,
            senderParticipant: result.senderParticipant,
        };
    }

    async findMessages(roomId: string, tenantId: string, employeeId: string, query: MessageQueryDto) {
        const participant = await this.findParticipant(roomId, tenantId, employeeId);
        if (!participant) {
            throw new ForbiddenError('You do not have access to this conversation', ErrorCodes.TENANT_ACCESS_DENIED);
        }

        const { page = 1, limit = 100, before } = query;
        const where: Prisma.ChatMessageWhereInput = {
            roomId,
            deletedAt: null,
            ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        };

        const [messages, total, participants] = await Promise.all([
            prisma.chatMessage.findMany({
                where,
                orderBy: {
                    createdAt: 'desc',
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.chatMessage.count({ where }),
            prisma.chatParticipant.findMany({
                where: {
                    roomId,
                    leftAt: null,
                },
                include: participantInclude,
            }),
        ]);

        await prisma.chatParticipant.update({
            where: {
                id: participant.id,
            },
            data: {
                unreadCount: 0,
                lastReadAt: new Date(),
            },
        });

        const participantMap = new Map(
            participants.map((entry) => [entry.employeeId, entry as ParticipantWithEmployee]),
        );

        return {
            data: messages
                .slice()
                .reverse()
                .map((message) => ({
                    ...message,
                    senderParticipant: message.senderId
                        ? participantMap.get(message.senderId) || null
                        : null,
                })),
            total,
        };
    }

    async updateConversationSettings(
        roomId: string,
        tenantId: string,
        employeeId: string,
        data: ConversationSettingsDto,
    ): Promise<ConversationRecord> {
        const participant = await this.findParticipant(roomId, tenantId, employeeId);
        if (!participant) {
            throw new ForbiddenError('You do not have access to this conversation', ErrorCodes.TENANT_ACCESS_DENIED);
        }

        const settingsUpdate: Prisma.ChatParticipantUpdateInput = {
            ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
            ...(data.isMuted !== undefined ? { isMuted: data.isMuted } : {}),
            ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
        };

        await prisma.chatParticipant.update({
            where: {
                id: participant.id,
            },
            data: settingsUpdate,
        });

        const room = await this.findConversationRecord(roomId, tenantId, employeeId);
        if (!room) {
            throw new NotFoundError('Conversation not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return room;
    }

    async deleteConversation(roomId: string, tenantId: string, employeeId: string): Promise<void> {
        const participant = await this.findParticipant(roomId, tenantId, employeeId);
        if (!participant) {
            throw new ForbiddenError('You do not have access to this conversation', ErrorCodes.TENANT_ACCESS_DENIED);
        }

        await prisma.chatParticipant.update({
            where: {
                id: participant.id,
            },
            data: {
                isArchived: true,
                unreadCount: 0,
            },
        });
    }

    async updateMessage(
        roomId: string,
        messageId: string,
        tenantId: string,
        employeeId: string,
        data: UpdateMessageDto,
    ): Promise<MessageRecord> {
        const existing = await prisma.chatMessage.findFirst({
            where: {
                id: messageId,
                roomId,
                deletedAt: null,
                senderId: employeeId,
                room: {
                    tenantId,
                    participants: {
                        some: {
                            employeeId,
                            leftAt: null,
                        },
                    },
                },
            },
        });

        if (!existing) {
            throw new NotFoundError('Message not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const content = data.content.trim();
        const attachments = normalizeAttachments(
            Array.isArray(existing.attachments) ? (existing.attachments as ChatAttachmentDto[]) : [],
        );

        const message = await prisma.chatMessage.update({
            where: {
                id: messageId,
            },
            data: {
                content,
                isEdited: true,
                editedAt: new Date(),
            },
        });

        const latestMessage = await prisma.chatMessage.findFirst({
            where: {
                roomId,
                deletedAt: null,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (latestMessage?.id === messageId) {
            await prisma.chatRoom.update({
                where: {
                    id: roomId,
                },
                data: {
                    lastMessagePreview: buildMessagePreview(content, attachments),
                },
            });
        }

        const room = await this.findConversationRecord(roomId, tenantId, employeeId);
        const senderParticipant = room?.participants.find((participant) => participant.employeeId === employeeId) || null;

        return {
            ...message,
            senderParticipant,
        };
    }

    async deleteMessage(roomId: string, messageId: string, tenantId: string, employeeId: string): Promise<void> {
        const existing = await prisma.chatMessage.findFirst({
            where: {
                id: messageId,
                roomId,
                deletedAt: null,
                senderId: employeeId,
                room: {
                    tenantId,
                    participants: {
                        some: {
                            employeeId,
                            leftAt: null,
                        },
                    },
                },
            },
        });

        if (!existing) {
            throw new NotFoundError('Message not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        await prisma.$transaction(async (tx) => {
            await tx.chatMessage.update({
                where: {
                    id: messageId,
                },
                data: {
                    deletedAt: new Date(),
                },
            });

            const latestMessage = await tx.chatMessage.findFirst({
                where: {
                    roomId,
                    deletedAt: null,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            const nextAttachments = normalizeAttachments(
                latestMessage && Array.isArray(latestMessage.attachments)
                    ? (latestMessage.attachments as ChatAttachmentDto[])
                    : [],
            );

            await tx.chatRoom.update({
                where: {
                    id: roomId,
                },
                data: {
                    lastMessageAt: latestMessage?.createdAt || null,
                    lastMessagePreview: latestMessage
                        ? buildMessagePreview(latestMessage.content, nextAttachments)
                        : null,
                },
            });
        });
    }
}

export const chatRepository = new ChatRepository();
