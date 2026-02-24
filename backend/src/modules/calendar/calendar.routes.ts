import { Router } from 'express';
import { calendarController } from './calendar.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createCalendarEventSchema, updateCalendarEventSchema, calendarEventQuerySchema, calendarEventIdSchema } from './calendar.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.CALENDAR_VIEW), validate(calendarEventQuerySchema), calendarController.getMany.bind(calendarController));
router.post('/', requirePermission(PERMISSIONS.CALENDAR_CREATE), validate(createCalendarEventSchema), calendarController.create.bind(calendarController));
router.get('/:id', requirePermission(PERMISSIONS.CALENDAR_VIEW), validate(calendarEventIdSchema), calendarController.getById.bind(calendarController));
router.put('/:id', requirePermission(PERMISSIONS.CALENDAR_UPDATE), validate(calendarEventIdSchema), validate(updateCalendarEventSchema), calendarController.update.bind(calendarController));
router.delete('/:id', requirePermission(PERMISSIONS.CALENDAR_DELETE), validate(calendarEventIdSchema), calendarController.delete.bind(calendarController));
router.patch('/:id/status', requirePermission(PERMISSIONS.CALENDAR_UPDATE), calendarController.updateStatus.bind(calendarController));

export default router;
