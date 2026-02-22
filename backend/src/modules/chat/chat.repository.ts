import { PrismaClient, Prisma } from '@prisma/client';
import { CreateConversationDto, SendMessageDto, ConversationQueryDto, MessageQueryDto } from './chat.dto';

const prisma = new PrismaClient();
const chatRoomInclude = {
    participants: { include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } },
    messages: { take: 1, orderBy: { createdAt: 'desc' as const } },
};

export class ChatRepository {
    async createConversation(tenantId: string, data: CreateConversationDto, createdById: string) {
        return prisma.chatRoom.create({
            data: {
                tenantId,
                name: data.name,
                isGroup: data.isGroup || false,
                participants: {
                    create: data.participantIds.map((employeeId) => ({ employeeId })),
                },
            },
            include: chatRoomInclude,
        });
    }

    async findConversationById(id: string, tenantId: string) {
        return prisma.chatRoom.findFirst({ where: { id, tenantId }, include: chatRoomInclude });
    }

    async findConversations(tenantId: string, employeeId: string, query: ConversationQueryDto) {
        const { page = 1, limit = 20 } = query;
        const where: Prisma.ChatRoomWhereInput = { tenantId, participants: { some: { employeeId } } };
        const [data, total] = await Promise.all([
            prisma.chatRoom.findMany({ where, include: chatRoomInclude, orderBy: { lastMessageAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma.chatRoom.count({ where }),
        ]);
        return { data, total };
    }

    async sendMessage(roomId: string, tenantId: string, senderId: string, data: SendMessageDto) {
        // Verify room belongs to tenant
        const room = await prisma.chatRoom.findFirst({ where: { id: roomId, tenantId } });
        if (!room) throw new Error('Chat room not found or access denied');

        const message = await prisma.chatMessage.create({
            data: { roomId, senderId, content: data.content, attachments: data.attachments as Prisma.InputJsonValue || undefined },
        });
        await prisma.chatRoom.update({ where: { id: roomId }, data: { lastMessageAt: new Date() } });
        return message;
    }

    async findMessages(roomId: string, query: MessageQueryDto) {
        const { page = 1, limit = 50, before } = query;
        const where: Prisma.ChatMessageWhereInput = {
            roomId,
            deletedAt: null,
            ...(before && { createdAt: { lt: new Date(before) } }),
        };
        const [data, total] = await Promise.all([
            prisma.chatMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma.chatMessage.count({ where }),
        ]);
        return { data, total };
    }

    async deleteMessage(messageId: string, tenantId: string) {
        // Verify message's room belongs to tenant
        const message = await prisma.chatMessage.findUnique({ where: { id: messageId }, include: { room: { select: { tenantId: true } } } });
        if (!message || message.room.tenantId !== tenantId) throw new Error('Message not found or access denied');
        return prisma.chatMessage.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    }
}

export const chatRepository = new ChatRepository();
