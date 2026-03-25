import { Request, Response, NextFunction } from 'express';
import { clientsService } from './clients.service';
import {
    sendSuccess,
    sendCreated,
    sendNoContent,
} from '../../common/utils/responseFormatter';
import { CreateClientDto, UpdateClientDto } from './clients.dto';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class ClientsController {
    /**
     * POST /clients
     * Create a new client
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const data = sanitizeBody<CreateClientDto>(req.body);

            const client = await clientsService.create(tenantId, data as CreateClientDto, req.user?.userId);

            sendCreated(res, client, 'Client created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /clients
     * Get clients with filters and pagination
     */
    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const query = req.query as any;

            const result = await clientsService.getMany(tenantId, query, req.dataAccess);

            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /clients/:id
     * Get client by ID
     */
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;

            const client = await clientsService.getById(id, tenantId);

            sendSuccess(res, client);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /clients/:id
     * Update client
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const data = sanitizeBody<UpdateClientDto>(req.body);

            const client = await clientsService.update(id, tenantId, data as UpdateClientDto);

            sendSuccess(res, client, 'Client updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /clients/:id
     * Delete client
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;

            await clientsService.delete(id, tenantId);

            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const clientsController = new ClientsController();
