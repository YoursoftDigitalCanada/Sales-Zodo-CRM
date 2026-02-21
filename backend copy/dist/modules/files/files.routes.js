"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const files_controller_1 = require("./files.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const files_validators_1 = require("./files.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FILES_VIEW), (0, validate_middleware_1.validate)(files_validators_1.fileQuerySchema), files_controller_1.filesController.getMany.bind(files_controller_1.filesController));
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FILES_UPLOAD), (0, validate_middleware_1.validate)(files_validators_1.uploadFileSchema), files_controller_1.filesController.upload.bind(files_controller_1.filesController));
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FILES_VIEW), (0, validate_middleware_1.validate)(files_validators_1.fileIdSchema), files_controller_1.filesController.getById.bind(files_controller_1.filesController));
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FILES_UPDATE), (0, validate_middleware_1.validate)(files_validators_1.fileIdSchema), (0, validate_middleware_1.validate)(files_validators_1.updateFileSchema), files_controller_1.filesController.update.bind(files_controller_1.filesController));
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.FILES_DELETE), (0, validate_middleware_1.validate)(files_validators_1.fileIdSchema), files_controller_1.filesController.delete.bind(files_controller_1.filesController));
exports.default = router;
//# sourceMappingURL=files.routes.js.map