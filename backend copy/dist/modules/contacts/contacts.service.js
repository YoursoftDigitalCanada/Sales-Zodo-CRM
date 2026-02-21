"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsService = exports.ContactsService = void 0;
const contacts_repository_1 = require("./contacts.repository");
const contacts_dto_1 = require("./contacts.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class ContactsService {
    /**
     * Create a new contact
     */
    async create(tenantId, data) {
        const contact = await contacts_repository_1.contactsRepository.create(tenantId, data);
        return (0, contacts_dto_1.toContactResponseDto)(contact);
    }
    /**
     * Get contact by ID
     */
    async getById(id, tenantId) {
        const contact = await contacts_repository_1.contactsRepository.findById(id, tenantId);
        if (!contact) {
            throw new HttpErrors_1.NotFoundError('Contact not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return (0, contacts_dto_1.toContactResponseDto)(contact);
    }
    /**
     * Get contacts with filters and pagination
     */
    async getMany(tenantId, query) {
        const { data, total } = await contacts_repository_1.contactsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);
        return {
            data: data.map(contacts_dto_1.toContactResponseDto),
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    /**
     * Update contact
     */
    async update(id, tenantId, data) {
        const existing = await contacts_repository_1.contactsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Contact not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const contact = await contacts_repository_1.contactsRepository.update(id, data);
        return (0, contacts_dto_1.toContactResponseDto)(contact);
    }
    /**
     * Delete contact
     */
    async delete(id, tenantId) {
        const existing = await contacts_repository_1.contactsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Contact not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        await contacts_repository_1.contactsRepository.delete(id);
    }
}
exports.ContactsService = ContactsService;
exports.contactsService = new ContactsService();
//# sourceMappingURL=contacts.service.js.map