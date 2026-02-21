import { Request, Response, NextFunction } from 'express';
export declare class LeadSourcesController {
    /**
     * POST /lead-sources
     */
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /lead-sources
     */
    getMany(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /lead-sources/active
     */
    getActive(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /lead-sources/statistics
     */
    getStatistics(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /lead-sources/:id
     */
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PUT /lead-sources/:id
     */
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /lead-sources/:id
     */
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const leadSourcesController: LeadSourcesController;
//# sourceMappingURL=lead-sources.controller.d.ts.map