"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesController = exports.InvoicesController = void 0;
const invoices_service_1 = require("./invoices.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class InvoicesController {
    async create(req, res, next) {
        try {
            const invoice = await invoices_service_1.invoicesService.create(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, invoice, 'Invoice created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await invoices_service_1.invoicesService.getMany(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const invoice = await invoices_service_1.invoicesService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, invoice);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const invoice = await invoices_service_1.invoicesService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, invoice, 'Invoice updated');
        }
        catch (e) {
            next(e);
        }
    }
    async markAsPaid(req, res, next) {
        try {
            const invoice = await invoices_service_1.invoicesService.markAsPaid(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, invoice, 'Invoice marked as paid');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await invoices_service_1.invoicesService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.InvoicesController = InvoicesController;
exports.invoicesController = new InvoicesController();
//# sourceMappingURL=invoices.controller.js.map