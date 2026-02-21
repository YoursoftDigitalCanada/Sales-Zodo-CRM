import { Request, Response, NextFunction } from 'express';
import { contactsService } from './contacts.service';
import { contactsManager } from './contacts.manager';
import {
    sendSuccess,
    sendCreated,
    sendNoContent,
} from '../../common/utils/responseFormatter';
import { CreateContactDto, UpdateContactDto } from './contacts.dto';

export class ContactsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const data: CreateContactDto = req.body;

            const contact = await contactsManager.createContact(req, tenantId, data);

            sendCreated(res, contact, 'Contact created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const query = req.query as any;

            const result = await contactsService.getMany(tenantId, query);

            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const { id } = req.params;

            const contact = await contactsService.getById(id, tenantId);

            sendSuccess(res, contact);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const { id } = req.params;
            const data: UpdateContactDto = req.body;

            const contact = await contactsManager.updateContact(req, id, tenantId, data);

            sendSuccess(res, contact, 'Contact updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const { id } = req.params;

            await contactsManager.deleteContact(req, id, tenantId);

            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const contactsController = new ContactsController();
