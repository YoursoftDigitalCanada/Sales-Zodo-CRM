"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsManager = exports.ContactsManager = void 0;
const contacts_service_1 = require("./contacts.service");
/**
 * Contacts Manager
 * Handles business orchestration and audit logging
 */
class ContactsManager {
    async createContact(req, tenantId, data) {
        const contact = await contacts_service_1.contactsService.create(tenantId, data);
        // TODO: Add audit logging
        return contact;
    }
    async updateContact(req, id, tenantId, data) {
        const contact = await contacts_service_1.contactsService.update(id, tenantId, data);
        // TODO: Add audit logging
        return contact;
    }
    async deleteContact(req, id, tenantId) {
        await contacts_service_1.contactsService.delete(id, tenantId);
        // TODO: Add audit logging
    }
}
exports.ContactsManager = ContactsManager;
exports.contactsManager = new ContactsManager();
//# sourceMappingURL=contacts.manager.js.map