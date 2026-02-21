"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsController = exports.ContactsController = void 0;
const contacts_service_1 = require("./contacts.service");
const contacts_manager_1 = require("./contacts.manager");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class ContactsController {
    async create(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const data = req.body;
            const contact = await contacts_manager_1.contactsManager.createContact(req, tenantId, data);
            (0, responseFormatter_1.sendCreated)(res, contact, 'Contact created successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getMany(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const result = await contacts_service_1.contactsService.getMany(tenantId, query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const contact = await contacts_service_1.contactsService.getById(id, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, contact);
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const data = req.body;
            const contact = await contacts_manager_1.contactsManager.updateContact(req, id, tenantId, data);
            (0, responseFormatter_1.sendSuccess)(res, contact, 'Contact updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            await contacts_manager_1.contactsManager.deleteContact(req, id, tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ContactsController = ContactsController;
exports.contactsController = new ContactsController();
//# sourceMappingURL=contacts.controller.js.map