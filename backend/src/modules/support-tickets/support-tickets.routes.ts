import { Router } from 'express';
import { supportTicketsController } from './support-tickets.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/stats', supportTicketsController.getStats.bind(supportTicketsController));
router.get('/', supportTicketsController.getTickets.bind(supportTicketsController));
router.post('/', supportTicketsController.createTicket.bind(supportTicketsController));
router.get('/:id', supportTicketsController.getTicketById.bind(supportTicketsController));
router.patch('/:id/status', supportTicketsController.updateStatus.bind(supportTicketsController));
router.post('/:id/messages', supportTicketsController.addMessage.bind(supportTicketsController));
router.delete('/:id', supportTicketsController.deleteTicket.bind(supportTicketsController));

export default router;
