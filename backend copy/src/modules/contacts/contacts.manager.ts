import { Request } from 'express';
import { contactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './contacts.dto';
import { auditService } from '../audit/audit.service';

/**
 * Contacts Manager
 * Handles business orchestration and audit logging
 */
export class ContactsManager {
    async createContact(req: Request, tenantId: string, data: CreateContactDto) {
        const contact = await contactsService.create(tenantId, data);

        const record = contact as any;
        await auditService.logCreate(req, 'contacts', 'Contact', contact.id, {
            firstName: record.firstName,
            lastName: record.lastName,
            email: record.email,
        });

        return contact;
    }

    async updateContact(req: Request, id: string, tenantId: string, data: UpdateContactDto) {
        const existing = await contactsService.getById(id, tenantId);
        const contact = await contactsService.update(id, tenantId, data);

        await auditService.logUpdate(req, 'contacts', 'Contact', id, existing, contact);

        return contact;
    }

    async deleteContact(req: Request, id: string, tenantId: string) {
        const existing = await contactsService.getById(id, tenantId);
        await contactsService.delete(id, tenantId);

        await auditService.logDelete(req, 'contacts', 'Contact', id, {
            firstName: (existing as any)?.firstName,
            lastName: (existing as any)?.lastName,
        });
    }
}

export const contactsManager = new ContactsManager();
