import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createBookingSchema, updateBookingSchema, bookingQuerySchema, bookingIdSchema } from './bookings.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.BOOKINGS_VIEW), validate(bookingQuerySchema), bookingsController.getMany.bind(bookingsController));
router.post('/', requirePermission(PERMISSIONS.BOOKINGS_CREATE), validate(createBookingSchema), bookingsController.create.bind(bookingsController));
router.get('/:id', requirePermission(PERMISSIONS.BOOKINGS_VIEW), validate(bookingIdSchema), bookingsController.getById.bind(bookingsController));
router.put('/:id', requirePermission(PERMISSIONS.BOOKINGS_UPDATE), validate(bookingIdSchema), validate(updateBookingSchema), bookingsController.update.bind(bookingsController));
router.patch('/:id/confirm', requirePermission(PERMISSIONS.BOOKINGS_CONFIRM), validate(bookingIdSchema), bookingsController.confirm.bind(bookingsController));
router.patch('/:id/cancel', requirePermission(PERMISSIONS.BOOKINGS_CANCEL), validate(bookingIdSchema), bookingsController.cancel.bind(bookingsController));
router.delete('/:id', requirePermission(PERMISSIONS.BOOKINGS_DELETE), validate(bookingIdSchema), bookingsController.delete.bind(bookingsController));

export default router;
