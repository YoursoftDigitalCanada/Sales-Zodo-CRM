// src/modules/copilot/copilot.controller.ts
// ============================================================================
// COPILOT CONTROLLER — Context-Aware Hybrid AI Assistant
//
// Orchestrates the copilot pipeline:
//   1. Validate input (Zod)
//   1.5 Permission guard (module-level RBAC)
//   2. Resolve entity context (ContextResolverService)
//   2.5 Load session history (CopilotSessionService)
//   3. Route to intelligence strategy (CopilotIntelligenceService)
//   4. Persist messages + return structured response
//
// Security: All data is tenant-scoped via req.context.tenantId
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { contextResolverService } from './context-resolver.service';
import { copilotIntelligenceService } from './copilot-intelligence.service';
import { copilotPermissionGuard } from './copilot-permission.guard';
import { copilotSessionService } from './copilot-session.service';
import { logger } from '../../common/utils/logger';

// ── Request validation schema ───────────────────────────────────────────

const copilotAskSchema = z.object({
    message: z.string().min(1).max(2000).trim(),
    context: z.object({
        module: z.string().optional(),
        entityId: z.string().uuid().optional(),
        page: z.string().optional(),
    }).optional(),
});

// ── Controller ──────────────────────────────────────────────────────────

class CopilotController {

    /**
     * POST /copilot/ask — Main copilot chat endpoint
     *
     * Accepts a user message + optional page context, resolves entity data,
     * loads session history for conversational continuity, routes to the
     * appropriate intelligence strategy, persists messages, and returns
     * a structured response.
     */
    async ask(req: Request, res: Response, next: NextFunction): Promise<void> {
        const startTime = Date.now();

        try {
            // 1. Validate input
            const parsed = copilotAskSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new BadRequestError(
                    'Invalid copilot request: ' + parsed.error.issues.map(i => i.message).join(', '),
                    ErrorCodes.VALIDATION_FAILED
                );
            }

            const { message, context } = parsed.data;
            const tenantId = req.context.tenantId;
            const employeeId = (req as any).employee?.id || 'anonymous';

            // 1.5 Permission guard — block access to unauthorized module data
            copilotPermissionGuard.validateModuleAccess(
                req.permissions || [],
                context?.module,
            );

            // 2. Resolve entity context (hydrate lightweight context → full data)
            const resolvedContext = await contextResolverService.resolve(
                tenantId,
                context?.module,
                context?.entityId,
            );

            // 2.5 Load session history for conversational continuity
            const sessionHistory = await copilotSessionService.getHistory(tenantId, employeeId);
            const historyForLLM = sessionHistory.map(m => ({
                role: m.role,
                content: m.content,
            }));

            // 3. Route to intelligence strategy + generate response
            const response = await copilotIntelligenceService.generateResponse(
                message,
                resolvedContext,
                historyForLLM,
            );

            // 3.5 Persist messages to session (user message + assistant response)
            const now = Date.now();
            await copilotSessionService.appendMessage(tenantId, employeeId, {
                role: 'user',
                content: message,
                timestamp: now,
            });
            await copilotSessionService.appendMessage(tenantId, employeeId, {
                role: 'assistant',
                content: response.answer,
                timestamp: now,
            });

            logger.info('[Copilot] Processed request', {
                tenantId,
                module: context?.module || 'general',
                entityId: context?.entityId || null,
                page: context?.page || null,
                sessionMessages: sessionHistory.length + 2,
                durationMs: Date.now() - startTime,
            });

            // 4. Return structured response
            sendSuccess(res, {
                answer: response.answer,
                context: {
                    module: resolvedContext.module,
                    entityId: resolvedContext.entityId || null,
                    businessType: resolvedContext.aiContext.businessType,
                },
                suggestedActions: response.suggestedActions,
                suggestedFollowUps: response.suggestedFollowUps,
                generatedAt: new Date().toISOString(),
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /copilot/history — Clear copilot session history
     *
     * Allows users to start a fresh conversation with the copilot.
     */
    async clearHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const employeeId = (req as any).employee?.id || 'anonymous';

            await copilotSessionService.clearHistory(tenantId, employeeId);

            logger.info('[Copilot] Session history cleared', { tenantId, employeeId });

            sendSuccess(res, { message: 'Copilot session history cleared' });
        } catch (error) {
            next(error);
        }
    }
}

export const copilotController = new CopilotController();
