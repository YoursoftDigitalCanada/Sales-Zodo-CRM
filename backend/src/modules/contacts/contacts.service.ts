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
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';

export class ContactsService {
    /**
     * Create a new contact
     */
    async create(tenantId: string, data: CreateContactDto): Promise<ContactResponseDto> {
        const contact = await contactsRepository.create(tenantId, data);
        const dto = toContactResponseDto(contact);

        activityLogger.log({
            tenantId, entityType: 'Contact', entityId: dto.id,
            action: 'CREATE', module: 'contacts',
            description: `Created contact "${dto.contactName}"`,
            metadata: { contactName: dto.contactName, companyId: data.companyId },
        });

        eventBus.emit('contact.created', {
            tenantId,
            contactId: dto.id,
            contactName: dto.contactName,
            companyId: data.companyId || undefined,
        });

        return dto;
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

        const contact = await contactsRepository.update(id, tenantId, data);
        const dto = toContactResponseDto(contact);

        activityLogger.log({
            tenantId, entityType: 'Contact', entityId: dto.id,
            action: 'UPDATE', module: 'contacts',
            description: `Updated contact "${dto.contactName}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        eventBus.emit('contact.updated', {
            tenantId,
            contactId: dto.id,
            contactName: dto.contactName,
            updatedFields: Object.keys(data),
        });

        return dto;
    }

    /**
     * Delete contact
     */
    async delete(id: string, tenantId: string): Promise<void> {
        const existing = await contactsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Contact not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const contactName = (existing as any).contactName || '';

        activityLogger.log({
            tenantId, entityType: 'Contact', entityId: id,
            action: 'DELETE', module: 'contacts',
            description: `Deleted contact "${contactName}"`,
        });

        eventBus.emit('contact.deleted', {
            tenantId,
            contactId: id,
            contactName,
        });

        await contactsRepository.delete(id, tenantId);
    }
}

export const contactsService = new ContactsService();
