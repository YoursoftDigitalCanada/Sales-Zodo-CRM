"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toConversationResponseDto = toConversationResponseDto;
exports.toMessageResponseDto = toMessageResponseDto;
function toConversationResponseDto(c, unreadCount = 0) {
    const lastMsg = c.messages?.[0];
    return {
        id: c.id,
        name: c.name,
        isGroup: c.isGroup,
        participants: (c.participants || []).map((p) => ({ id: p.employee.id, firstName: p.employee.user.firstName, lastName: p.employee.user.lastName })),
        lastMessage: lastMsg ? { content: lastMsg.content, sentAt: lastMsg.createdAt } : null,
        unreadCount,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
function toMessageResponseDto(m) {
    return {
        id: m.id,
        content: m.content,
        attachments: m.attachments || [],
        sender: m.sender ? { id: m.sender.id, firstName: m.sender.user.firstName, lastName: m.sender.user.lastName } : { id: '', firstName: '', lastName: '' },
        isRead: m.isRead,
        sentAt: m.createdAt,
    };
}
//# sourceMappingURL=chat.dto.js.map