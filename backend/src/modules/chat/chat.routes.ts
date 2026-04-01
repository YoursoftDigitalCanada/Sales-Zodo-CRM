import { Router } from 'express';
import { chatController } from './chat.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
    conversationIdSchema,
    conversationQuerySchema,
    conversationSettingsSchema,
    createConversationSchema,
    messageIdSchema,
    messageQuerySchema,
    sendMessageSchema,
    updateMessageSchema,
} from './chat.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get(
    '/conversations',
    requirePermission(PERMISSIONS.CHAT_VIEW),
    validate(conversationQuerySchema),
    chatController.getConversations.bind(chatController),
);
router.post(
    '/conversations',
    requirePermission(PERMISSIONS.CHAT_CREATE),
    validate(createConversationSchema),
    chatController.createConversation.bind(chatController),
);
router.get(
    '/conversations/:id',
    requirePermission(PERMISSIONS.CHAT_VIEW),
    validate(conversationIdSchema),
    chatController.getConversation.bind(chatController),
);
router.patch(
    '/conversations/:id/settings',
    requirePermission(PERMISSIONS.CHAT_VIEW),
    validate(conversationIdSchema),
    validate(conversationSettingsSchema),
    chatController.updateConversationSettings.bind(chatController),
);
router.delete(
    '/conversations/:id',
    requirePermission(PERMISSIONS.CHAT_CREATE),
    validate(conversationIdSchema),
    chatController.deleteConversation.bind(chatController),
);
router.get(
    '/conversations/:id/messages',
    requirePermission(PERMISSIONS.CHAT_VIEW),
    validate(conversationIdSchema),
    validate(messageQuerySchema),
    chatController.getMessages.bind(chatController),
);
router.post(
    '/conversations/:id/messages',
    requirePermission(PERMISSIONS.CHAT_CREATE),
    validate(conversationIdSchema),
    validate(sendMessageSchema),
    chatController.sendMessage.bind(chatController),
);
router.patch(
    '/conversations/:id/messages/:messageId',
    requirePermission(PERMISSIONS.CHAT_CREATE),
    validate(messageIdSchema),
    validate(updateMessageSchema),
    chatController.updateMessage.bind(chatController),
);
router.delete(
    '/conversations/:id/messages/:messageId',
    requirePermission(PERMISSIONS.CHAT_CREATE),
    validate(messageIdSchema),
    chatController.deleteMessage.bind(chatController),
);

export default router;
