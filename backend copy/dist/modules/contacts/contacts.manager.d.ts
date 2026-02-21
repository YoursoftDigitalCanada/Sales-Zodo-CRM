import { Request } from 'express';
import { CreateContactDto, UpdateContactDto } from './contacts.dto';
/**
 * Contacts Manager
 * Handles business orchestration and audit logging
 */
export declare class ContactsManager {
    createContact(req: Request, tenantId: string, data: CreateContactDto): Promise<import("./contacts.dto").ContactResponseDto>;
    updateContact(req: Request, id: string, tenantId: string, data: UpdateContactDto): Promise<import("./contacts.dto").ContactResponseDto>;
    deleteContact(req: Request, id: string, tenantId: string): Promise<void>;
}
export declare const contactsManager: ContactsManager;
//# sourceMappingURL=contacts.manager.d.ts.map