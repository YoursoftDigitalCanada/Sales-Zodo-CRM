"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emails_controller_1 = require("./emails.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const permission_middleware_1 = require("../../common/middleware/permission.middleware");
const validate_middleware_1 = require("../../common/middleware/validate.middleware");
const permissions_1 = require("../../common/constants/permissions");
const emails_validators_1 = require("./emails.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(auth_middleware_1.loadEmployee);
// Templates
router.get('/templates', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMAILS_VIEW), (0, validate_middleware_1.validate)(emails_validators_1.emailTemplateQuerySchema), emails_controller_1.emailsController.getTemplates.bind(emails_controller_1.emailsController));
router.post('/templates', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMAILS_CREATE), (0, validate_middleware_1.validate)(emails_validators_1.createEmailTemplateSchema), emails_controller_1.emailsController.createTemplate.bind(emails_controller_1.emailsController));
router.get('/templates/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMAILS_VIEW), (0, validate_middleware_1.validate)(emails_validators_1.emailTemplateIdSchema), emails_controller_1.emailsController.getTemplateById.bind(emails_controller_1.emailsController));
router.put('/templates/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMAILS_UPDATE), (0, validate_middleware_1.validate)(emails_validators_1.emailTemplateIdSchema), (0, validate_middleware_1.validate)(emails_validators_1.updateEmailTemplateSchema), emails_controller_1.emailsController.updateTemplate.bind(emails_controller_1.emailsController));
router.delete('/templates/:id', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMAILS_DELETE), (0, validate_middleware_1.validate)(emails_validators_1.emailTemplateIdSchema), emails_controller_1.emailsController.deleteTemplate.bind(emails_controller_1.emailsController));
// Send
router.post('/send', (0, permission_middleware_1.requirePermission)(permissions_1.PERMISSIONS.EMAILS_SEND), (0, validate_middleware_1.validate)(emails_validators_1.sendEmailSchema), emails_controller_1.emailsController.sendEmail.bind(emails_controller_1.emailsController));
exports.default = router;
//# sourceMappingURL=emails.routes.js.map