import { Router } from 'express';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { uploadMultiple } from '../../common/middleware/multer.config';
import { validate } from '../../common/middleware/validate.middleware';
import { supportTicketsController } from './support-tickets.controller';
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

router.get('/stream', supportTicketsController.stream.bind(supportTicketsController));
router.get('/stats', supportTicketsController.getStats.bind(supportTicketsController));
router.get('/', validate(supportTicketQuerySchema), supportTicketsController.getTickets.bind(supportTicketsController));
router.post('/', validate(createSupportTicketSchema), supportTicketsController.createTicket.bind(supportTicketsController));
router.post(
  '/with-attachments',
  uploadMultiple,
  validate(createSupportTicketSchema),
  supportTicketsController.createTicketWithAttachments.bind(supportTicketsController)
);
router.get('/:id', validate(supportTicketIdSchema), supportTicketsController.getTicketById.bind(supportTicketsController));
router.patch(
  '/:id/status',
  validate(supportTicketIdSchema),
  validate(updateSupportTicketStatusSchema),
  supportTicketsController.updateStatus.bind(supportTicketsController)
);
router.post(
  '/:id/messages',
  validate(supportTicketIdSchema),
  validate(addSupportTicketMessageSchema),
  supportTicketsController.addMessage.bind(supportTicketsController)
);
router.delete('/:id', validate(supportTicketIdSchema), supportTicketsController.deleteTicket.bind(supportTicketsController));

export default router;
