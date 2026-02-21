"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contacts_controller_1 = require("./contacts.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const contacts_validators_1 = require("./contacts.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CONTACTS_VIEW), (0, validate_middleware_1.validate)(contacts_validators_1.contactQuerySchema), contacts_controller_1.contactsController.getMany.bind(contacts_controller_1.contactsController));
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CONTACTS_CREATE), (0, validate_middleware_1.validate)(contacts_validators_1.createContactSchema), contacts_controller_1.contactsController.create.bind(contacts_controller_1.contactsController));
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CONTACTS_VIEW), (0, validate_middleware_1.validate)(contacts_validators_1.contactIdSchema), contacts_controller_1.contactsController.getById.bind(contacts_controller_1.contactsController));
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CONTACTS_UPDATE), (0, validate_middleware_1.validate)(contacts_validators_1.contactIdSchema), (0, validate_middleware_1.validate)(contacts_validators_1.updateContactSchema), contacts_controller_1.contactsController.update.bind(contacts_controller_1.contactsController));
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CONTACTS_DELETE), (0, validate_middleware_1.validate)(contacts_validators_1.contactIdSchema), contacts_controller_1.contactsController.delete.bind(contacts_controller_1.contactsController));
exports.default = router;
//# sourceMappingURL=contacts.routes.js.map