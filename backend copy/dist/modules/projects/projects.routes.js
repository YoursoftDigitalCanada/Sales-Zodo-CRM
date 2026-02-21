"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projects_controller_1 = require("./projects.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const projects_validators_1 = require("./projects.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.PROJECTS_VIEW), (0, validate_middleware_1.validate)(projects_validators_1.projectQuerySchema), projects_controller_1.projectsController.getMany.bind(projects_controller_1.projectsController));
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.PROJECTS_CREATE), (0, validate_middleware_1.validate)(projects_validators_1.createProjectSchema), projects_controller_1.projectsController.create.bind(projects_controller_1.projectsController));
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.PROJECTS_VIEW), (0, validate_middleware_1.validate)(projects_validators_1.projectIdSchema), projects_controller_1.projectsController.getById.bind(projects_controller_1.projectsController));
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.PROJECTS_UPDATE), (0, validate_middleware_1.validate)(projects_validators_1.projectIdSchema), (0, validate_middleware_1.validate)(projects_validators_1.updateProjectSchema), projects_controller_1.projectsController.update.bind(projects_controller_1.projectsController));
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.PROJECTS_DELETE), (0, validate_middleware_1.validate)(projects_validators_1.projectIdSchema), projects_controller_1.projectsController.delete.bind(projects_controller_1.projectsController));
exports.default = router;
//# sourceMappingURL=projects.routes.js.map