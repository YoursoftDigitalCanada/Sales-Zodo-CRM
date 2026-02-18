import { Router } from 'express';
import { chatController } from './chat.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createConversationSchema, sendMessageSchema, conversationQuerySchema, messageQuerySchema, conversationIdSchema } from './chat.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/conversations', requirePermission(PERMISSIONS.CHAT_VIEW), validate(conversationQuerySchema), chatController.getConversations.bind(chatController));
router.post('/conversations', requirePermission(PERMISSIONS.CHAT_CREATE), validate(createConversationSchema), chatController.createConversation.bind(chatController));
router.get('/conversations/:id', requirePermission(PERMISSIONS.CHAT_VIEW), validate(conversationIdSchema), chatController.getConversation.bind(chatController));
router.get('/conversations/:id/messages', requirePermission(PERMISSIONS.CHAT_VIEW), validate(conversationIdSchema), validate(messageQuerySchema), chatController.getMessages.bind(chatController));
router.post('/conversations/:id/messages', requirePermission(PERMISSIONS.CHAT_CREATE), validate(conversationIdSchema), validate(sendMessageSchema), chatController.sendMessage.bind(chatController));

export default router;
