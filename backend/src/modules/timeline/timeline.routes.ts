import { Router } from 'express';
import { timelineController } from './timeline.controller';
import { loadEmployee } from '../../common/middleware/auth.middleware';

const router = Router();

// All timeline routes require authentication (applied globally in routes/index.ts)
// + loadEmployee for RBAC context
router.use(loadEmployee);

// GET /timeline/:entityType/:entityId — single entity timeline
router.get('/:entityType/:entityId', (req, res, next) =>
    timelineController.getEntityTimeline(req, res, next),
);

// GET /timeline/:entityType/:entityId/related — cross-entity timeline
router.get('/:entityType/:entityId/related', (req, res, next) =>
    timelineController.getRelatedTimeline(req, res, next),
);

export default router;
