import { Request, Response, NextFunction } from 'express';
import { tenantsService } from './tenants.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class TenantsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenant = await tenantsService.create(sanitizeBody(req.body));
            sendCreated(res, tenant, 'Tenant created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await tenantsService.getMany(req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenant = await tenantsService.getById(req.params.id);
            sendSuccess(res, tenant);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenant = await tenantsService.update(req.params.id, sanitizeBody(req.body));
            sendSuccess(res, tenant, 'Tenant updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await tenantsService.delete(req.params.id);
            sendNoContent(res);
        } catch (e) { next(e); }
    }

    /**
     * PATCH /tenants/business-type
     * Updates the current tenant's businessType in settings.
     * Uses the authenticated employee's tenantId — no ID in URL needed.
     */
    async updateBusinessType(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = (req as any).tenantContext?.tenantId || (req as any).employee?.tenantId;
            if (!tenantId) {
                res.status(400).json({ success: false, message: 'Tenant context not found' });
                return;
            }
            const { businessType } = sanitizeBody(req.body);
            if (!businessType || typeof businessType !== 'string') {
                res.status(400).json({ success: false, message: 'businessType is required' });
                return;
            }
            const result = await tenantsService.updateBusinessType(tenantId, businessType);
            sendSuccess(res, result, 'Business type updated');
        } catch (e) { next(e); }
    }

    async getOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                res.status(400).json({ success: false, message: 'Tenant context not found' });
                return;
            }

            const result = await tenantsService.getOnboarding(tenantId);
            sendSuccess(res, result);
        } catch (e) { next(e); }
    }

    async completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                res.status(400).json({ success: false, message: 'Tenant context not found' });
                return;
            }

            const result = await tenantsService.completeOnboarding(tenantId, sanitizeBody(req.body));
            sendSuccess(res, result, 'Onboarding completed');
        } catch (e) { next(e); }
    }
}

export const tenantsController = new TenantsController();
