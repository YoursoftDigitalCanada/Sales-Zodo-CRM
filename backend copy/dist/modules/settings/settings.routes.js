"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("./settings.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const settings_validators_1 = require("./settings.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.SETTINGS_VIEW), settings_controller_1.settingsController.get.bind(settings_controller_1.settingsController));
router.put('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.SETTINGS_UPDATE), (0, validate_middleware_1.validate)(settings_validators_1.updateSettingsSchema), settings_controller_1.settingsController.update.bind(settings_controller_1.settingsController));
exports.default = router;
//# sourceMappingURL=settings.routes.js.map