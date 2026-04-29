// src/modules/copilot/copilot.routes.ts
// ============================================================================
// COPILOT ROUTES — Context-Aware Hybrid AI Assistant
//
// POST   /copilot/ask      — Main copilot chat endpoint
// DELETE /copilot/history   — Clear session conversation history
//
// Protected by: authenticate + tenantContext + ai-assistant module enablement
// Context-specific data access is enforced by CopilotPermissionGuard.
// ============================================================================

import { Router } from 'express';
import { loadEmployee } from '../../common/middleware/auth.middleware';
import { copilotController } from './copilot.controller';

const router = Router();

// ── Load employee for permission checks ─────────────────────────────────
router.use(loadEmployee);

// ── Main copilot endpoint ───────────────────────────────────────────────
router.post('/ask',
    copilotController.ask.bind(copilotController),
);

// ── Clear session history ───────────────────────────────────────────────
router.delete('/history',
    copilotController.clearHistory.bind(copilotController),
);

export default router;
