"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const folders_controller_1 = require("./folders.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const folders_validators_1 = require("./folders.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FOLDERS_VIEW), (0, validate_middleware_1.validate)(folders_validators_1.folderQuerySchema), folders_controller_1.foldersController.getMany.bind(folders_controller_1.foldersController));
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FOLDERS_CREATE), (0, validate_middleware_1.validate)(folders_validators_1.createFolderSchema), folders_controller_1.foldersController.create.bind(folders_controller_1.foldersController));
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FOLDERS_VIEW), (0, validate_middleware_1.validate)(folders_validators_1.folderIdSchema), folders_controller_1.foldersController.getById.bind(folders_controller_1.foldersController));
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FOLDERS_UPDATE), (0, validate_middleware_1.validate)(folders_validators_1.folderIdSchema), (0, validate_middleware_1.validate)(folders_validators_1.updateFolderSchema), folders_controller_1.foldersController.update.bind(folders_controller_1.foldersController));
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FOLDERS_DELETE), (0, validate_middleware_1.validate)(folders_validators_1.folderIdSchema), folders_controller_1.foldersController.delete.bind(folders_controller_1.foldersController));
exports.default = router;
//# sourceMappingURL=folders.routes.js.map