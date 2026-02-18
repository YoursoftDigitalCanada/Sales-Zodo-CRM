import { Router } from 'express';
import { projectsController } from './projects.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createProjectSchema, updateProjectSchema, projectQuerySchema, projectIdSchema } from './projects.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectQuerySchema), projectsController.getMany.bind(projectsController));
router.post('/', requirePermission(PERMISSIONS.PROJECTS_CREATE), validate(createProjectSchema), projectsController.create.bind(projectsController));
router.get('/:id', requirePermission(PERMISSIONS.PROJECTS_VIEW), validate(projectIdSchema), projectsController.getById.bind(projectsController));
router.put('/:id', requirePermission(PERMISSIONS.PROJECTS_UPDATE), validate(projectIdSchema), validate(updateProjectSchema), projectsController.update.bind(projectsController));
router.delete('/:id', requirePermission(PERMISSIONS.PROJECTS_DELETE), validate(projectIdSchema), projectsController.delete.bind(projectsController));

export default router;
