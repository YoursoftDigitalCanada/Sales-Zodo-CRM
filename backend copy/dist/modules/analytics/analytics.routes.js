"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("./analytics.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const analytics_validators_1 = require("./analytics.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/dashboard', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.ANALYTICS_VIEW), analytics_controller_1.analyticsController.getDashboard.bind(analytics_controller_1.analyticsController));
router.get('/leads', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.ANALYTICS_VIEW), (0, validate_middleware_1.validate)(analytics_validators_1.analyticsQuerySchema), analytics_controller_1.analyticsController.getLeadsReport.bind(analytics_controller_1.analyticsController));
router.get('/revenue', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.ANALYTICS_VIEW), analytics_controller_1.analyticsController.getRevenueReport.bind(analytics_controller_1.analyticsController));
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map