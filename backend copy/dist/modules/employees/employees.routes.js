"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employees_controller_1 = require("./employees.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const employees_validators_1 = require("./employees.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMPLOYEES_VIEW), (0, validate_middleware_1.validate)(employees_validators_1.employeeQuerySchema), employees_controller_1.employeesController.getMany.bind(employees_controller_1.employeesController));
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMPLOYEES_CREATE), (0, validate_middleware_1.validate)(employees_validators_1.createEmployeeSchema), employees_controller_1.employeesController.create.bind(employees_controller_1.employeesController));
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMPLOYEES_VIEW), (0, validate_middleware_1.validate)(employees_validators_1.employeeIdSchema), employees_controller_1.employeesController.getById.bind(employees_controller_1.employeesController));
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMPLOYEES_UPDATE), (0, validate_middleware_1.validate)(employees_validators_1.employeeIdSchema), (0, validate_middleware_1.validate)(employees_validators_1.updateEmployeeSchema), employees_controller_1.employeesController.update.bind(employees_controller_1.employeesController));
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMPLOYEES_DELETE), (0, validate_middleware_1.validate)(employees_validators_1.employeeIdSchema), employees_controller_1.employeesController.delete.bind(employees_controller_1.employeesController));
exports.default = router;
//# sourceMappingURL=employees.routes.js.map