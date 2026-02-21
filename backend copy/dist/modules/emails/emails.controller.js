"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailsController = exports.EmailsController = void 0;
const emails_service_1 = require("./emails.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class EmailsController {
    async createTemplate(req, res, next) {
        try {
            const template = await emails_service_1.emailsService.createTemplate(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, template, 'Email template created');
        }
        catch (e) {
            next(e);
        }
    }
    async getTemplates(req, res, next) {
        try {
            const result = await emails_service_1.emailsService.getTemplates(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getTemplateById(req, res, next) {
        try {
            const template = await emails_service_1.emailsService.getTemplateById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, template);
        }
        catch (e) {
            next(e);
        }
    }
    async updateTemplate(req, res, next) {
        try {
            const template = await emails_service_1.emailsService.updateTemplate(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, template, 'Email template updated');
        }
        catch (e) {
            next(e);
        }
    }
    async deleteTemplate(req, res, next) {
        try {
            await emails_service_1.emailsService.deleteTemplate(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
    async sendEmail(req, res, next) {
        try {
            const result = await emails_service_1.emailsService.sendEmail(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, result, 'Email sent');
        }
        catch (e) {
            next(e);
        }
    }
}
exports.EmailsController = EmailsController;
exports.emailsController = new EmailsController();
//# sourceMappingURL=emails.controller.js.map