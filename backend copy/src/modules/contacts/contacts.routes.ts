import { Router } from 'express';
import { contactsController } from './contacts.controller';
import {
    authenticate,
    loadEmployee,
} from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
    createContactSchema,
    updateContactSchema,
    contactQuerySchema,
    contactIdSchema,
} from './contacts.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

router.get(
    '/',
    requirePermission(PERMISSIONS.CONTACTS_VIEW),
    validate(contactQuerySchema),
    contactsController.getMany.bind(contactsController)
);

router.post(
    '/',
    requirePermission(PERMISSIONS.CONTACTS_CREATE),
    validate(createContactSchema),
    contactsController.create.bind(contactsController)
);

router.get(
    '/:id',
    requirePermission(PERMISSIONS.CONTACTS_VIEW),
    validate(contactIdSchema),
    contactsController.getById.bind(contactsController)
);

router.put(
    '/:id',
    requirePermission(PERMISSIONS.CONTACTS_UPDATE),
    validate(contactIdSchema),
    validate(updateContactSchema),
    contactsController.update.bind(contactsController)
);

router.delete(
    '/:id',
    requirePermission(PERMISSIONS.CONTACTS_DELETE),
    validate(contactIdSchema),
    contactsController.delete.bind(contactsController)
);

export default router;
