import { Router } from 'express';
import { proposalsController } from './proposals.controller';

const router = Router();

// Public: View proposal by token (no auth)
router.get('/proposals/:token', proposalsController.getPublic.bind(proposalsController));

// Public: Sign proposal
router.post('/proposals/:token/sign', proposalsController.signPublic.bind(proposalsController));

// Public: Decline proposal
router.post('/proposals/:token/decline', proposalsController.declinePublic.bind(proposalsController));

// Stage 4: Tracking pixel (1x1 GIF for email open tracking)
router.get('/proposals/:token/track', proposalsController.trackView.bind(proposalsController));

export default router;
