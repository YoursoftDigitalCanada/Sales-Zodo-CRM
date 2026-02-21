"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenants_controller_1 = require("./tenants.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const tenants_validators_1 = require("./tenants.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.TENANTS_VIEW), (0, validate_middleware_1.validate)(tenants_validators_1.tenantQuerySchema), tenants_controller_1.tenantsController.getMany.bind(tenants_controller_1.tenantsController));
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.TENANTS_CREATE), (0, validate_middleware_1.validate)(tenants_validators_1.createTenantSchema), tenants_controller_1.tenantsController.create.bind(tenants_controller_1.tenantsController));
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.TENANTS_VIEW), (0, validate_middleware_1.validate)(tenants_validators_1.tenantIdSchema), tenants_controller_1.tenantsController.getById.bind(tenants_controller_1.tenantsController));
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.TENANTS_UPDATE), (0, validate_middleware_1.validate)(tenants_validators_1.tenantIdSchema), (0, validate_middleware_1.validate)(tenants_validators_1.updateTenantSchema), tenants_controller_1.tenantsController.update.bind(tenants_controller_1.tenantsController));
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.TENANTS_DELETE), (0, validate_middleware_1.validate)(tenants_validators_1.tenantIdSchema), tenants_controller_1.tenantsController.delete.bind(tenants_controller_1.tenantsController));
exports.default = router;
//# sourceMappingURL=tenants.routes.js.map