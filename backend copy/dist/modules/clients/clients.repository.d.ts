import { Prisma } from '@prisma/client';
import { CreateClientDto, UpdateClientDto, ClientQueryDto } from './clients.dto';
export declare class ClientsRepository {
    create(tenantId: string, data: CreateClientDto): Promise<{
        _count: {
            contacts: number;
            projects: number;
        };
        assignedOwner: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.ClientStatus;
        tenantId: string;
        leadSource: string | null;
        id: string;
        position: string | null;
        createdAt: Date;
        updatedAt: Date;
        tags: Prisma.JsonValue;
        currency: string;
        companyName: string | null;
        clientLogo: string | null;
        clientName: string;
        clientType: import(".prisma/client").$Enums.ClientType;
        primaryEmail: string;
        primaryPhone: string;
        gstHstNumber: string | null;
        pstQstNumber: string | null;
        businessStructure: string | null;
        corpRegistrationNumber: string | null;
        streetAddress: string | null;
        suite: string | null;
        city: string | null;
        province: string | null;
        postalCode: string | null;
        country: string | null;
        internalNotes: string | null;
        contactName: string | null;
        directPhone: string | null;
        creditLimit: Prisma.Decimal | null;
        paymentTerms: string | null;
        clientCategory: string | null;
        totalRevenue: Prisma.Decimal;
        assignedOwnerId: string | null;
    }>;
    findById(id: string, tenantId: string): Promise<({
        _count: {
            contacts: number;
            projects: number;
        };
        assignedOwner: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.ClientStatus;
        tenantId: string;
        leadSource: string | null;
        id: string;
        position: string | null;
        createdAt: Date;
        updatedAt: Date;
        tags: Prisma.JsonValue;
        currency: string;
        companyName: string | null;
        clientLogo: string | null;
        clientName: string;
        clientType: import(".prisma/client").$Enums.ClientType;
        primaryEmail: string;
        primaryPhone: string;
        gstHstNumber: string | null;
        pstQstNumber: string | null;
        businessStructure: string | null;
        corpRegistrationNumber: string | null;
        streetAddress: string | null;
        suite: string | null;
        city: string | null;
        province: string | null;
        postalCode: string | null;
        country: string | null;
        internalNotes: string | null;
        contactName: string | null;
        directPhone: string | null;
        creditLimit: Prisma.Decimal | null;
        paymentTerms: string | null;
        clientCategory: string | null;
        totalRevenue: Prisma.Decimal;
        assignedOwnerId: string | null;
    }) | null>;
    findMany(tenantId: string, query: ClientQueryDto): Promise<{
        data: ({
            _count: {
                contacts: number;
                projects: number;
            };
            assignedOwner: ({
                user: {
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
        } & {
            status: import(".prisma/client").$Enums.ClientStatus;
            tenantId: string;
            leadSource: string | null;
            id: string;
            position: string | null;
            createdAt: Date;
            updatedAt: Date;
            tags: Prisma.JsonValue;
            currency: string;
            companyName: string | null;
            clientLogo: string | null;
            clientName: string;
            clientType: import(".prisma/client").$Enums.ClientType;
            primaryEmail: string;
            primaryPhone: string;
            gstHstNumber: string | null;
            pstQstNumber: string | null;
            businessStructure: string | null;
            corpRegistrationNumber: string | null;
            streetAddress: string | null;
            suite: string | null;
            city: string | null;
            province: string | null;
            postalCode: string | null;
            country: string | null;
            internalNotes: string | null;
            contactName: string | null;
            directPhone: string | null;
            creditLimit: Prisma.Decimal | null;
            paymentTerms: string | null;
            clientCategory: string | null;
            totalRevenue: Prisma.Decimal;
            assignedOwnerId: string | null;
        })[];
        total: number;
    }>;
    update(id: string, data: UpdateClientDto): Promise<{
        _count: {
            contacts: number;
            projects: number;
        };
        assignedOwner: ({
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.ClientStatus;
        tenantId: string;
        leadSource: string | null;
        id: string;
        position: string | null;
        createdAt: Date;
        updatedAt: Date;
        tags: Prisma.JsonValue;
        currency: string;
        companyName: string | null;
        clientLogo: string | null;
        clientName: string;
        clientType: import(".prisma/client").$Enums.ClientType;
        primaryEmail: string;
        primaryPhone: string;
        gstHstNumber: string | null;
        pstQstNumber: string | null;
        businessStructure: string | null;
        corpRegistrationNumber: string | null;
        streetAddress: string | null;
        suite: string | null;
        city: string | null;
        province: string | null;
        postalCode: string | null;
        country: string | null;
        internalNotes: string | null;
        contactName: string | null;
        directPhone: string | null;
        creditLimit: Prisma.Decimal | null;
        paymentTerms: string | null;
        clientCategory: string | null;
        totalRevenue: Prisma.Decimal;
        assignedOwnerId: string | null;
    }>;
    delete(id: string): Promise<{
        status: import(".prisma/client").$Enums.ClientStatus;
        tenantId: string;
        leadSource: string | null;
        id: string;
        position: string | null;
        createdAt: Date;
        updatedAt: Date;
        tags: Prisma.JsonValue;
        currency: string;
        companyName: string | null;
        clientLogo: string | null;
        clientName: string;
        clientType: import(".prisma/client").$Enums.ClientType;
        primaryEmail: string;
        primaryPhone: string;
        gstHstNumber: string | null;
        pstQstNumber: string | null;
        businessStructure: string | null;
        corpRegistrationNumber: string | null;
        streetAddress: string | null;
        suite: string | null;
        city: string | null;
        province: string | null;
        postalCode: string | null;
        country: string | null;
        internalNotes: string | null;
        contactName: string | null;
        directPhone: string | null;
        creditLimit: Prisma.Decimal | null;
        paymentTerms: string | null;
        clientCategory: string | null;
        totalRevenue: Prisma.Decimal;
        assignedOwnerId: string | null;
    }>;
}
export declare const clientsRepository: ClientsRepository;
//# sourceMappingURL=clients.repository.d.ts.map