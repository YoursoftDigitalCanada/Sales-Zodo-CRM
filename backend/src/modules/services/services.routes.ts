import { Router } from 'express';
import { servicesController } from './services.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createServiceSchema, updateServiceSchema, serviceQuerySchema, serviceIdSchema } from './services.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.SERVICES_VIEW), validate(serviceQuerySchema), servicesController.getMany.bind(servicesController));
router.post('/', requirePermission(PERMISSIONS.SERVICES_CREATE), validate(createServiceSchema), servicesController.create.bind(servicesController));
router.get('/:id', requirePermission(PERMISSIONS.SERVICES_VIEW), validate(serviceIdSchema), servicesController.getById.bind(servicesController));
router.patch('/:id', requirePermission(PERMISSIONS.SERVICES_UPDATE), validate(serviceIdSchema), validate(updateServiceSchema), servicesController.update.bind(servicesController));
router.patch('/:id/deactivate', requirePermission(PERMISSIONS.SERVICES_DELETE), validate(serviceIdSchema), servicesController.deactivate.bind(servicesController));
router.delete('/:id', requirePermission(PERMISSIONS.SERVICES_DELETE), validate(serviceIdSchema), servicesController.delete.bind(servicesController));

export default router;
