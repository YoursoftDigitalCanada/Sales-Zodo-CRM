// src/modules/copilot/copilot.routes.ts
// ============================================================================
// COPILOT ROUTES — Context-Aware Hybrid AI Assistant
//
// POST   /copilot/ask      — Main copilot chat endpoint
// DELETE /copilot/history   — Clear session conversation history
//
// Protected by: authenticate + tenantContext + ANALYTICS_VIEW permission
// ============================================================================

import { Router } from 'express';
import { loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { copilotController } from './copilot.controller';

const router = Router();

// ── Load employee for permission checks ─────────────────────────────────
router.use(loadEmployee);

// ── Main copilot endpoint ───────────────────────────────────────────────
router.post('/ask',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    copilotController.ask.bind(copilotController),
);

// ── Clear session history ───────────────────────────────────────────────
router.delete('/history',
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    copilotController.clearHistory.bind(copilotController),
);

export default router;
