import { Request, Response, NextFunction } from 'express';
import { timelineService } from './timeline.service';
import { TimelineQueryDto } from './timeline.dto';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { BadRequestError } from '../../common/errors/HttpErrors';

const ALLOWED_ENTITY_TYPES = [
    'Lead', 'Client', 'Contact', 'Project', 'Task', 'Invoice', 'Employee',
];

/**
 * Timeline Controller
 * Exposes entity timeline as REST endpoints.
 */
export class TimelineController {
    /**
     * GET /timeline/:entityType/:entityId
     * Returns paginated timeline for a single entity.
     */
    async getEntityTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { entityType, entityId } = req.params;

            if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
                throw new BadRequestError(
                    `Invalid entityType "${entityType}". Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
                );
            }

            const query: TimelineQueryDto = {
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 30,
                action: req.query.action as string | undefined,
                module: req.query.module as string | undefined,
            };

            const result = await timelineService.getEntityTimeline(
                req.context.tenantId,
                entityType,
                entityId,
                query,
            );

            sendSuccess(res, result.data, 'Timeline fetched', 200, result.meta);
        } catch (e) {
            next(e);
        }
    }

    /**
     * GET /timeline/:entityType/:entityId/related
     * Returns cross-entity timeline (e.g., client + its projects + invoices).
     */
    async getRelatedTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { entityType, entityId } = req.params;

            if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
                throw new BadRequestError(
                    `Invalid entityType "${entityType}". Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
                );
            }

            const query: TimelineQueryDto = {
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 50,
                action: req.query.action as string | undefined,
            };

            const result = await timelineService.getRelatedTimeline(
                req.context.tenantId,
                entityType,
                entityId,
                query,
            );

            sendSuccess(res, result.data, 'Related timeline fetched', 200, result.meta);
        } catch (e) {
            next(e);
        }
    }
}

export const timelineController = new TimelineController();
