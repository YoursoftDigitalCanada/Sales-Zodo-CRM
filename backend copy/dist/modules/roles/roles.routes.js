"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roles_controller_1 = require("./roles.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const roles_validators_1 = require("./roles.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.ROLES_VIEW), (0, validate_middleware_1.validate)(roles_validators_1.roleQuerySchema), roles_controller_1.rolesController.getMany.bind(roles_controller_1.rolesController));
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.ROLES_CREATE), (0, validate_middleware_1.validate)(roles_validators_1.createRoleSchema), roles_controller_1.rolesController.create.bind(roles_controller_1.rolesController));
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.ROLES_VIEW), (0, validate_middleware_1.validate)(roles_validators_1.roleIdSchema), roles_controller_1.rolesController.getById.bind(roles_controller_1.rolesController));
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.ROLES_UPDATE), (0, validate_middleware_1.validate)(roles_validators_1.roleIdSchema), (0, validate_middleware_1.validate)(roles_validators_1.updateRoleSchema), roles_controller_1.rolesController.update.bind(roles_controller_1.rolesController));
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.ROLES_DELETE), (0, validate_middleware_1.validate)(roles_validators_1.roleIdSchema), roles_controller_1.rolesController.delete.bind(roles_controller_1.rolesController));
exports.default = router;
//# sourceMappingURL=roles.routes.js.map