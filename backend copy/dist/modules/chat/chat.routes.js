"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("./chat.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const chat_validators_1 = require("./chat.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
// Conversations
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CHAT_VIEW), (0, validate_middleware_1.validate)(chat_validators_1.conversationQuerySchema), chat_controller_1.chatController.getConversations.bind(chat_controller_1.chatController));
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CHAT_CREATE), (0, validate_middleware_1.validate)(chat_validators_1.createConversationSchema), chat_controller_1.chatController.createConversation.bind(chat_controller_1.chatController));
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CHAT_VIEW), (0, validate_middleware_1.validate)(chat_validators_1.conversationIdSchema), chat_controller_1.chatController.getConversation.bind(chat_controller_1.chatController));
router.post('/:id/messages', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CHAT_SEND), (0, validate_middleware_1.validate)(chat_validators_1.conversationIdSchema), (0, validate_middleware_1.validate)(chat_validators_1.sendMessageSchema), chat_controller_1.chatController.sendMessage.bind(chat_controller_1.chatController));
router.get('/:id/messages', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CHAT_VIEW), (0, validate_middleware_1.validate)(chat_validators_1.conversationIdSchema), (0, validate_middleware_1.validate)(chat_validators_1.messageQuerySchema), chat_controller_1.chatController.getMessages.bind(chat_controller_1.chatController));
router.patch('/:id/read', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CHAT_VIEW), (0, validate_middleware_1.validate)(chat_validators_1.conversationIdSchema), chat_controller_1.chatController.markAsRead.bind(chat_controller_1.chatController));
exports.default = router;
//# sourceMappingURL=chat.routes.js.map