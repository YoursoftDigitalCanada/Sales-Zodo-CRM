import { CreateContactDto, UpdateContactDto, ContactQueryDto, ContactResponseDto } from './contacts.dto';
export declare class ContactsService {
    /**
     * Create a new contact
     */
    create(tenantId: string, data: CreateContactDto): Promise<ContactResponseDto>;
    /**
     * Get contact by ID
     */
    getById(id: string, tenantId: string): Promise<ContactResponseDto>;
    /**
     * Get contacts with filters and pagination
     */
    getMany(tenantId: string, query: ContactQueryDto): Promise<{
        data: ContactResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    /**
     * Update contact
     */
    update(id: string, tenantId: string, data: UpdateContactDto): Promise<ContactResponseDto>;
    /**
     * Delete contact
     */
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const contactsService: ContactsService;
//# sourceMappingURL=contacts.service.d.ts.map