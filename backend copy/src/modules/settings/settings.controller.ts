import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service';
import { sendSuccess } from '../../common/utils/responseFormatter';

export class SettingsController {
    async get(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const settings = await settingsService.get(req.context.tenantId);
            sendSuccess(res, settings);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const settings = await settingsService.update(req.context.tenantId, req.body);
            sendSuccess(res, settings, 'Settings updated');
        } catch (e) { next(e); }
    }
}

export const settingsController = new SettingsController();
