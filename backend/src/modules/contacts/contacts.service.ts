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
    BadRequestError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';
import { settingsManager } from '../settings/settings.manager';
import { prisma } from '../../config/database';

export class ContactsService {
    private normalizeContactData<T extends CreateContactDto | UpdateContactDto>(data: T): T {
        const firstName = typeof data.firstName === 'string' ? data.firstName.trim() : data.firstName;
        const lastName = typeof data.lastName === 'string' ? data.lastName.trim() : data.lastName;
        const contactName = typeof data.contactName === 'string'
            ? data.contactName.trim()
            : [firstName, lastName].filter(Boolean).join(' ').trim();
        const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : data.email;
        const secondaryEmail = typeof data.secondaryEmail === 'string' ? data.secondaryEmail.trim().toLowerCase() : data.secondaryEmail;

        return {
            ...data,
            ...(contactName ? { contactName } : {}),
            ...(firstName !== undefined ? { firstName } : {}),
            ...(lastName !== undefined ? { lastName } : {}),
            ...(email !== undefined ? { email } : {}),
            ...(secondaryEmail !== undefined ? { secondaryEmail } : {}),
        };
    }

    private async validateRelationshipLinks(tenantId: string, data: CreateContactDto | UpdateContactDto): Promise<void> {
        if (data.companyId) {
            const company = await prisma.client.findFirst({
                where: { id: data.companyId, tenantId },
                select: { id: true },
            });
            if (!company) {
                throw new BadRequestError('Linked organization does not belong to this tenant', ErrorCodes.VALIDATION_FAILED);
            }
        }

        if (data.dealId) {
            const deal = await prisma.project.findFirst({
                where: { id: data.dealId, tenantId, deletedAt: null },
                select: { id: true },
            });
            if (!deal) {
                throw new BadRequestError('Linked deal does not belong to this tenant', ErrorCodes.VALIDATION_FAILED);
            }
        }

        if (data.assignedToId) {
            const owner = await prisma.employee.findFirst({
                where: { id: data.assignedToId, tenantId, isActive: true },
                select: { id: true },
            });
            if (!owner) {
                throw new BadRequestError('Assigned owner does not belong to this tenant', ErrorCodes.VALIDATION_FAILED);
            }
        }
    }

    private async ensureUniqueEmail(tenantId: string, email?: string | null, excludeContactId?: string): Promise<void> {
        if (!email) return;
        const duplicate = await prisma.contact.findFirst({
            where: {
                tenantId,
                email: { equals: email.trim().toLowerCase(), mode: 'insensitive' },
                ...(excludeContactId ? { id: { not: excludeContactId } } : {}),
            },
            select: { id: true },
        });
        if (duplicate) {
            throw new BadRequestError('A contact with this email already exists for this tenant', ErrorCodes.VALIDATION_FAILED);
        }
    }

    /**
     * Create a new contact
     */
    async create(tenantId: string, data: CreateContactDto): Promise<ContactResponseDto> {
        await settingsManager.assertUsageWithinPlan(tenantId, 'contacts');
        const normalizedData = this.normalizeContactData(data);
        if (!normalizedData.companyId && !normalizedData.dealId) {
            throw new BadRequestError('Contact must be linked to an Account or Deal', ErrorCodes.VALIDATION_FAILED);
        }
        if (!normalizedData.contactName) {
            throw new BadRequestError('Contact must include a first and last name', ErrorCodes.VALIDATION_FAILED);
        }
        await this.validateRelationshipLinks(tenantId, normalizedData);
        await this.ensureUniqueEmail(tenantId, normalizedData.email);
        const contact = await contactsRepository.create(tenantId, normalizedData);
        const dto = toContactResponseDto(contact);

        activityLogger.log({
            tenantId, entityType: 'Contact', entityId: dto.id,
            action: 'CREATE', module: 'contacts',
            description: `Created contact "${dto.contactName}"`,
            metadata: { contactName: dto.contactName, companyId: normalizedData.companyId },
        });

        eventBus.emit('contact.created', {
            tenantId,
            contactId: dto.id,
            contactName: dto.contactName,
            companyId: normalizedData.companyId || undefined,
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

        const normalizedData = this.normalizeContactData(data);
        const nextCompanyId = normalizedData.companyId !== undefined ? normalizedData.companyId : (existing as any).companyId;
        const hasDealLink = Boolean(normalizedData.dealId || (existing as any).deals?.length);
        if (!nextCompanyId && !hasDealLink) {
            throw new BadRequestError('Contact must be linked to an Account or Deal', ErrorCodes.VALIDATION_FAILED);
        }

        await this.validateRelationshipLinks(tenantId, normalizedData);
        await this.ensureUniqueEmail(tenantId, normalizedData.email, id);

        await contactsRepository.update(id, tenantId, normalizedData);
        if (normalizedData.dealId) {
            await contactsRepository.linkDeal(tenantId, id, normalizedData.dealId, normalizedData.roleInBuyingProcess);
        }
        const contact = await contactsRepository.findById(id, tenantId);
        if (!contact) {
            throw new NotFoundError('Contact not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const dto = toContactResponseDto(contact);

        activityLogger.log({
            tenantId, entityType: 'Contact', entityId: dto.id,
            action: 'UPDATE', module: 'contacts',
            description: `Updated contact "${dto.contactName}"`,
            metadata: { updatedFields: Object.keys(normalizedData) },
        });

        eventBus.emit('contact.updated', {
            tenantId,
            contactId: dto.id,
            contactName: dto.contactName,
            updatedFields: Object.keys(normalizedData),
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
