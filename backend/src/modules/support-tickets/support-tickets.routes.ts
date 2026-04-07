import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { uploadMultiple } from '../../common/middleware/multer.config';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { supportTicketsController } from './support-tickets.controller';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
  addSupportTicketMessageSchema,
  createSupportTicketSchema,
  supportTicketIdSchema,
  supportTicketQuerySchema,
  updateSupportTicketStatusSchema,
} from './support-tickets.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get('/stream', requirePermission(PERMISSIONS.SUPPORT_VIEW), supportTicketsController.stream.bind(supportTicketsController));
router.get('/stats', requirePermission(PERMISSIONS.SUPPORT_VIEW), supportTicketsController.getStats.bind(supportTicketsController));
router.get('/', requirePermission(PERMISSIONS.SUPPORT_VIEW), validate(supportTicketQuerySchema), supportTicketsController.getTickets.bind(supportTicketsController));
router.post('/', requirePermission(PERMISSIONS.SUPPORT_CREATE), validate(createSupportTicketSchema), supportTicketsController.createTicket.bind(supportTicketsController));
router.post(
  '/with-attachments',
  requirePermission(PERMISSIONS.SUPPORT_CREATE),
  uploadMultiple,
  validate(createSupportTicketSchema),
  supportTicketsController.createTicketWithAttachments.bind(supportTicketsController)
);
router.get('/:id', requirePermission(PERMISSIONS.SUPPORT_VIEW), validate(supportTicketIdSchema), supportTicketsController.getTicketById.bind(supportTicketsController));
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.SUPPORT_UPDATE),
  validate(supportTicketIdSchema),
  validate(updateSupportTicketStatusSchema),
  supportTicketsController.updateStatus.bind(supportTicketsController)
);
router.post(
  '/:id/messages',
  requirePermission(PERMISSIONS.SUPPORT_UPDATE),
  validate(supportTicketIdSchema),
  validate(addSupportTicketMessageSchema),
  supportTicketsController.addMessage.bind(supportTicketsController)
);
router.delete('/:id', requirePermission(PERMISSIONS.SUPPORT_DELETE), validate(supportTicketIdSchema), supportTicketsController.deleteTicket.bind(supportTicketsController));

export default router;
