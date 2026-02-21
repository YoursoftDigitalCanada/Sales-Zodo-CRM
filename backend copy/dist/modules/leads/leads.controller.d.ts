import { Request, Response, NextFunction } from 'express';
export declare class LeadsController {
    /**
     * POST /leads
     * Create a new lead
     */
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /leads
     * Get leads with filters and pagination
     */
    getMany(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /leads/pipeline
     * Get leads grouped by status (pipeline view)
     */
    getPipeline(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /leads/statistics
     * Get lead statistics
     */
    getStatistics(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /leads/:id
     * Get lead by ID
     */
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /leads/:id/activities
     * Get lead activities
     */
    getActivities(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PUT /leads/:id
     * Update lead
     */
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /leads/:id/status
     * Update lead status
     */
    updateStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /leads/:id/assign
     * Assign lead to employee
     */
    assign(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /leads/:id/convert
     * Convert lead to client
     */
    convert(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /leads/:id
     * Delete lead
     */
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /leads/bulk/assign
     * Bulk assign leads
     */
    bulkAssign(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /leads/bulk/status
     * Bulk update lead status
     */
    bulkUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /leads/import
     * Import leads
     */
    import(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /leads/export
     * Export leads
     */
    export(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const leadsController: LeadsController;
//# sourceMappingURL=leads.controller.d.ts.map