import { contactsRepository } from './contacts.repository';
import {
    CreateContactDto,
    UpdateContactDto,
    ContactQueryDto,
    ContactResponseDto,
    toContactResponseDto,
} from './contacts.dto';
import {
    NotFoundError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class ContactsService {
    /**
     * Create a new contact
     */
    async create(tenantId: string, data: CreateContactDto): Promise<ContactResponseDto> {
        const contact = await contactsRepository.create(tenantId, data);
        return toContactResponseDto(contact);
    }

    /**
     * Get contact by ID
     */
    async getById(id: string, tenantId: string): Promise<ContactResponseDto> {
        const contact = await contactsRepository.findById(id, tenantId);

        if (!contact) {
            throw new NotFoundError('Contact not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return toContactResponseDto(contact);
    }

    /**
     * Get contacts with filters and pagination
     */
    async getMany(tenantId: string, query: ContactQueryDto) {
        const { data, total } = await contactsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map(toContactResponseDto),
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
    async update(id: string, tenantId: string, data: UpdateContactDto): Promise<ContactResponseDto> {
        const existing = await contactsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Contact not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const contact = await contactsRepository.update(id, data);
        return toContactResponseDto(contact);
    }

    /**
     * Delete contact
     */
    async delete(id: string, tenantId: string): Promise<void> {
        const existing = await contactsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Contact not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        await contactsRepository.delete(id);
    }
}

export const contactsService = new ContactsService();
