import { Request, Response, NextFunction } from 'express';
import { roofEstimatorService } from './roof-estimator.service';
import { roofEstimatorManager } from './roof-estimator.manager';
import {
    sendSuccess,
    sendCreated,
    sendNoContent,
} from '../../common/utils/responseFormatter';
import {
    CreateEstimateDto, UpdateEstimateDto, UpdateSettingsDto,
} from './roof-estimator.dto';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class RoofEstimatorController {
    /**
     * GET /autocomplete — Address autocomplete suggestions
     */
    async autocomplete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = req.query.input as string;
            if (!input || input.length < 3) {
                sendSuccess(res, [], 'Type at least 3 characters');
                return;
            }
            const suggestions = await roofEstimatorService.autocompleteAddress(input);
            sendSuccess(res, suggestions, 'Address suggestions');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /satellite — Geocode address and return satellite image URL
     */
    async getSatellite(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { address, placeId } = req.body;

            const result = await roofEstimatorManager.getSatellite(tenantId, address, placeId);

            sendSuccess(res, result, 'Satellite image retrieved');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /detect — Run AI roof detection on satellite image
     */
    async detectRoof(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { satelliteImageUrl, latitude, longitude } = req.body;

            const result = await roofEstimatorManager.detectRoof(tenantId, satelliteImageUrl, latitude, longitude);

            sendSuccess(res, result, 'Roof detection completed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST / — Save an estimate
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const createdBy = req.user!.employeeId || req.user!.userId;
            const data = sanitizeBody<CreateEstimateDto>(req.body);

            const estimate = await roofEstimatorManager.createEstimate(req, tenantId, data, createdBy);

            sendCreated(res, estimate, 'Estimate saved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET / — List all estimates for tenant
     */
    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const query = req.query as any;

            const result = await roofEstimatorService.getMany(tenantId, query);

            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /:id — Get single estimate
     */
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;

            const estimate = await roofEstimatorService.getById(id, tenantId);

            sendSuccess(res, estimate);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /:id — Update estimate
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const data = sanitizeBody<UpdateEstimateDto>(req.body);

            const estimate = await roofEstimatorManager.updateEstimate(req, id, tenantId, data);

            sendSuccess(res, estimate, 'Estimate updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /:id — Delete estimate
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;

            await roofEstimatorManager.deleteEstimate(req, id, tenantId);

            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /settings — Get tenant roof estimator settings
     */
    async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;

            const settings = await roofEstimatorService.getSettings(tenantId);

            sendSuccess(res, settings);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /settings — Update tenant roof estimator settings
     */
    async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const data = sanitizeBody<UpdateSettingsDto>(req.body);

            const settings = await roofEstimatorService.updateSettings(tenantId, data);

            sendSuccess(res, settings, 'Settings updated');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /statistics — Get estimate statistics for tenant
     */
    async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;

            const stats = await roofEstimatorService.getStatistics(tenantId);

            sendSuccess(res, stats);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /ai-health — Check AI service health status
     */
    async checkAiHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const healthy = await roofEstimatorService.checkAiHealth();
            sendSuccess(res, { healthy, service: 'ai-roof-estimator' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /generate-estimate — Generate cost estimate via OpenAI
     */
    async generateEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { roofAreaSqft, roofType, material, location, stories, pitch, currentCondition } = req.body;

            const estimate = await roofEstimatorService.generateEstimate({
                roofAreaSqft,
                roofType,
                material,
                location,
                stories,
                pitch,
                currentCondition,
            });

            sendSuccess(res, estimate, 'Estimate generated successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const roofEstimatorController = new RoofEstimatorController();
