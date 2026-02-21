"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const calendar_controller_1 = require("./calendar.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const calendar_validators_1 = require("./calendar.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
router.get('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CALENDAR_VIEW), (0, validate_middleware_1.validate)(calendar_validators_1.calendarEventQuerySchema), calendar_controller_1.calendarController.getMany.bind(calendar_controller_1.calendarController));
router.post('/', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CALENDAR_CREATE), (0, validate_middleware_1.validate)(calendar_validators_1.createCalendarEventSchema), calendar_controller_1.calendarController.create.bind(calendar_controller_1.calendarController));
router.get('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CALENDAR_VIEW), (0, validate_middleware_1.validate)(calendar_validators_1.calendarEventIdSchema), calendar_controller_1.calendarController.getById.bind(calendar_controller_1.calendarController));
router.put('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CALENDAR_UPDATE), (0, validate_middleware_1.validate)(calendar_validators_1.calendarEventIdSchema), (0, validate_middleware_1.validate)(calendar_validators_1.updateCalendarEventSchema), calendar_controller_1.calendarController.update.bind(calendar_controller_1.calendarController));
router.delete('/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.CALENDAR_DELETE), (0, validate_middleware_1.validate)(calendar_validators_1.calendarEventIdSchema), calendar_controller_1.calendarController.delete.bind(calendar_controller_1.calendarController));
exports.default = router;
//# sourceMappingURL=calendar.routes.js.map