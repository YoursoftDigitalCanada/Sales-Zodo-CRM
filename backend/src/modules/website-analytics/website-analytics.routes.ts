import { Router } from 'express';
import { z } from 'zod';
import { loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { rateLimiter } from '../../common/middleware/rateLimiter.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { websiteAnalyticsController } from './website-analytics.controller';

const idSchema = z.object({ params: z.object({ id: z.string().uuid() }) }).passthrough();
const bodySchema = z.object({ body: z.object({}).passthrough() }).passthrough();

export const websiteAnalyticsPublicRoutes = Router();

websiteAnalyticsPublicRoutes.get('/tracker.js', websiteAnalyticsController.tracker.bind(websiteAnalyticsController));
websiteAnalyticsPublicRoutes.post('/session/start', rateLimiter({ windowMs: 60 * 1000, max: 600 }), validate(bodySchema), websiteAnalyticsController.startSession.bind(websiteAnalyticsController));
websiteAnalyticsPublicRoutes.post('/session/end', rateLimiter({ windowMs: 60 * 1000, max: 600 }), validate(bodySchema), websiteAnalyticsController.endSession.bind(websiteAnalyticsController));
websiteAnalyticsPublicRoutes.post('/collect', rateLimiter({ windowMs: 60 * 1000, max: 1200 }), validate(bodySchema), websiteAnalyticsController.collect.bind(websiteAnalyticsController));

const router = Router();

router.use(loadEmployee);

router.get('/sites', requirePermission(PERMISSIONS.ANALYTICS_VIEW), websiteAnalyticsController.listSites.bind(websiteAnalyticsController));
router.post('/sites', requirePermission(PERMISSIONS.ANALYTICS_EXPORT), validate(bodySchema), websiteAnalyticsController.createSite.bind(websiteAnalyticsController));
router.get('/sites/:id', requirePermission(PERMISSIONS.ANALYTICS_VIEW), validate(idSchema), websiteAnalyticsController.getSite.bind(websiteAnalyticsController));
router.put('/sites/:id', requirePermission(PERMISSIONS.ANALYTICS_EXPORT), validate(idSchema), validate(bodySchema), websiteAnalyticsController.updateSite.bind(websiteAnalyticsController));
router.delete('/sites/:id', requirePermission(PERMISSIONS.ANALYTICS_EXPORT), validate(idSchema), websiteAnalyticsController.deactivateSite.bind(websiteAnalyticsController));
router.get('/sites/:id/snippet', requirePermission(PERMISSIONS.ANALYTICS_VIEW), validate(idSchema), websiteAnalyticsController.getSnippet.bind(websiteAnalyticsController));
router.get('/sessions', requirePermission(PERMISSIONS.ANALYTICS_VIEW), websiteAnalyticsController.listSessions.bind(websiteAnalyticsController));
router.get('/sessions/:id', requirePermission(PERMISSIONS.ANALYTICS_VIEW), validate(idSchema), websiteAnalyticsController.getSession.bind(websiteAnalyticsController));
router.get('/events', requirePermission(PERMISSIONS.ANALYTICS_VIEW), websiteAnalyticsController.listEvents.bind(websiteAnalyticsController));

export default router;
