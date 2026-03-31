import { Router } from 'express';
import { tasksController } from './tasks.controller';
import {
    authenticate,
    loadEmployee,
} from '../../common/middleware/auth.middleware';
import { loadDataAccess } from '../../common/middleware/data-access.middleware';
import { requireAccessibleTask } from '../../common/middleware/entity-access.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
    createTaskSchema,
    updateTaskSchema,
    taskQuerySchema,
    taskIdSchema,
    taskStatusUpdateSchema,
} from './tasks.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);
router.use(loadDataAccess);

router.get(
    '/',
    requirePermission(PERMISSIONS.TASKS_VIEW),
    validate(taskQuerySchema),
    tasksController.getMany.bind(tasksController)
);

router.get(
    '/kanban',
    requirePermission(PERMISSIONS.TASKS_VIEW),
    tasksController.getKanban.bind(tasksController)
);

router.get(
    '/statistics',
    requirePermission(PERMISSIONS.TASKS_VIEW),
    tasksController.getStatistics.bind(tasksController)
);

router.post(
    '/',
    requirePermission(PERMISSIONS.TASKS_CREATE),
    validate(createTaskSchema),
    tasksController.create.bind(tasksController)
);

router.use('/:id', requireAccessibleTask());

router.get(
    '/:id',
    requirePermission(PERMISSIONS.TASKS_VIEW),
    validate(taskIdSchema),
    tasksController.getById.bind(tasksController)
);

router.put(
    '/:id',
    requirePermission(PERMISSIONS.TASKS_UPDATE),
    validate(taskIdSchema),
    validate(updateTaskSchema),
    tasksController.update.bind(tasksController)
);

router.patch(
    '/:id/status',
    requirePermission(PERMISSIONS.TASKS_UPDATE),
    validate(taskIdSchema),
    validate(taskStatusUpdateSchema),
    tasksController.updateStatus.bind(tasksController)
);

router.patch(
    '/:id/assign',
    requirePermission(PERMISSIONS.TASKS_ASSIGN),
    validate(taskIdSchema),
    tasksController.assign.bind(tasksController)
);

router.delete(
    '/:id',
    requirePermission(PERMISSIONS.TASKS_DELETE),
    validate(taskIdSchema),
    tasksController.delete.bind(tasksController)
);

export default router;
