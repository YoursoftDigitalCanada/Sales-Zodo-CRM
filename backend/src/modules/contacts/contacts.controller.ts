import { Request, Response, NextFunction } from 'express';
import { contactsService } from './contacts.service';
import {
    sendSuccess,
    sendCreated,
    sendNoContent,
} from '../../common/utils/responseFormatter';
import { CreateContactDto, UpdateContactDto } from './contacts.dto';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class ContactsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const data = sanitizeBody<CreateContactDto>(req.body);

            const contact = await contactsService.create(tenantId, data);

            sendCreated(res, contact, 'Contact created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const query = req.query as any;

            const result = await contactsService.getMany(tenantId, query);

            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;

            const contact = await contactsService.getById(id, tenantId);

            sendSuccess(res, contact);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const data = sanitizeBody<UpdateContactDto>(req.body);

            const contact = await contactsService.update(id, tenantId, data);

            sendSuccess(res, contact, 'Contact updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;

            await contactsService.delete(id, tenantId);

            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const contactsController = new ContactsController();
