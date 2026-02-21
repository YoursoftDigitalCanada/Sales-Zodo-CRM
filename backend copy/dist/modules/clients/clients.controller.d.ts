import { Request, Response, NextFunction } from 'express';
export declare class ClientsController {
    /**
     * POST /clients
     * Create a new client
     */
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /clients
     * Get clients with filters and pagination
     */
    getMany(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /clients/:id
     * Get client by ID
     */
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PUT /clients/:id
     * Update client
     */
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /clients/:id
     * Delete client
     */
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const clientsController: ClientsController;
//# sourceMappingURL=clients.controller.d.ts.map