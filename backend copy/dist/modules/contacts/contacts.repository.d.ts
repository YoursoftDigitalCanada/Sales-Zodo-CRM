import { CreateContactDto, UpdateContactDto, ContactQueryDto } from './contacts.dto';
export declare class ContactsRepository {
    create(tenantId: string, data: CreateContactDto): Promise<{
        company: {
            id: string;
            clientName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.ContactType;
        email: string;
        tenantId: string;
        id: string;
        department: string | null;
        createdAt: Date;
        updatedAt: Date;
        jobTitle: string | null;
        contactName: string;
        officePhone: string | null;
        mobilePhone: string | null;
        linkedInUrl: string | null;
        isPrimaryContact: boolean;
        companyId: string | null;
    }>;
    findById(id: string, tenantId: string): Promise<({
        company: {
            id: string;
            clientName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.ContactType;
        email: string;
        tenantId: string;
        id: string;
        department: string | null;
        createdAt: Date;
        updatedAt: Date;
        jobTitle: string | null;
        contactName: string;
        officePhone: string | null;
        mobilePhone: string | null;
        linkedInUrl: string | null;
        isPrimaryContact: boolean;
        companyId: string | null;
    }) | null>;
    findMany(tenantId: string, query: ContactQueryDto): Promise<{
        data: ({
            company: {
                id: string;
                clientName: string;
            } | null;
        } & {
            type: import(".prisma/client").$Enums.ContactType;
            email: string;
            tenantId: string;
            id: string;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
            jobTitle: string | null;
            contactName: string;
            officePhone: string | null;
            mobilePhone: string | null;
            linkedInUrl: string | null;
            isPrimaryContact: boolean;
            companyId: string | null;
        })[];
        total: number;
    }>;
    update(id: string, data: UpdateContactDto): Promise<{
        company: {
            id: string;
            clientName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.ContactType;
        email: string;
        tenantId: string;
        id: string;
        department: string | null;
        createdAt: Date;
        updatedAt: Date;
        jobTitle: string | null;
        contactName: string;
        officePhone: string | null;
        mobilePhone: string | null;
        linkedInUrl: string | null;
        isPrimaryContact: boolean;
        companyId: string | null;
    }>;
    delete(id: string): Promise<{
        type: import(".prisma/client").$Enums.ContactType;
        email: string;
        tenantId: string;
        id: string;
        department: string | null;
        createdAt: Date;
        updatedAt: Date;
        jobTitle: string | null;
        contactName: string;
        officePhone: string | null;
        mobilePhone: string | null;
        linkedInUrl: string | null;
        isPrimaryContact: boolean;
        companyId: string | null;
    }>;
}
export declare const contactsRepository: ContactsRepository;
//# sourceMappingURL=contacts.repository.d.ts.map