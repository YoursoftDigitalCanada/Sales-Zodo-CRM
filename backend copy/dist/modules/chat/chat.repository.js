"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRepository = exports.ChatRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const conversationInclude = {
    participants: { include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } } },
    messages: { take: 1, orderBy: { createdAt: 'desc' } },
};
class ChatRepository {
    async createConversation(tenantId, data, createdById) {
        return prisma.conversation.create({
            data: {
                tenantId,
                name: data.name,
                isGroup: data.isGroup || false,
                participants: { create: [...data.participantIds, createdById].map((id) => ({ employeeId: id })) },
            },
            include: conversationInclude,
        });
    }
    async findConversationById(id, tenantId) {
        return prisma.conversation.findFirst({ where: { id, tenantId }, include: conversationInclude });
    }
    async findConversations(tenantId, employeeId, query) {
        const { page = 1, limit = 20 } = query;
        const where = {
            tenantId,
            participants: { some: { employeeId } },
        };
        const [data, total] = await Promise.all([
            prisma.conversation.findMany({ where, include: conversationInclude, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma.conversation.count({ where }),
        ]);
        return { data, total };
    }
    async sendMessage(conversationId, senderId, data) {
        const message = await prisma.message.create({
            data: { conversationId, senderId, content: data.content, attachments: data.attachments || [] },
            include: { sender: { include: { user: { select: { firstName: true, lastName: true } } } } },
        });
        await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
        return message;
    }
    async findMessages(conversationId, query) {
        const { page = 1, limit = 50, before } = query;
        const where = {
            conversationId,
            ...(before && { createdAt: { lt: new Date(before) } }),
        };
        const [data, total] = await Promise.all([
            prisma.message.findMany({
                where,
                include: { sender: { include: { user: { select: { firstName: true, lastName: true } } } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.message.count({ where }),
        ]);
        return { data, total };
    }
    async markAsRead(conversationId, employeeId) {
        await prisma.message.updateMany({
            where: { conversationId, senderId: { not: employeeId }, isRead: false },
            data: { isRead: true },
        });
    }
}
exports.ChatRepository = ChatRepository;
exports.chatRepository = new ChatRepository();
//# sourceMappingURL=chat.repository.js.map