import { Request } from 'express';
import { contactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './contacts.dto';

/**
 * Contacts Manager
 * Handles business orchestration and audit logging
 */
export class ContactsManager {
    async createContact(req: Request, tenantId: string, data: CreateContactDto) {
        const contact = await contactsService.create(tenantId, data);
        // TODO: Add audit logging
        return contact;
    }

    async updateContact(req: Request, id: string, tenantId: string, data: UpdateContactDto) {
        const contact = await contactsService.update(id, tenantId, data);
        // TODO: Add audit logging
        return contact;
    }

    async deleteContact(req: Request, id: string, tenantId: string) {
        await contactsService.delete(id, tenantId);
        // TODO: Add audit logging
    }
}

export const contactsManager = new ContactsManager();
