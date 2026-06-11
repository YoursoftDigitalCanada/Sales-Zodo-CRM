import { Router } from 'express';
import { PERMISSIONS } from '../../../common/constants/permissions';
import { requireAnyPermission } from '../../../common/middleware/permission.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { importSessionController } from './import-session.controller';
import {
  createSessionSchema,
  uploadFileSchema,
  sessionIdSchema,
  rawTxIdSchema,
  matchActionSchema,
  updateRawTxSchema,
  listRawTxQuerySchema,
  auditLogQuerySchema,
} from './import-session.validators';

const router = Router();

const canCreateBookkeeping = requireAnyPermission([PERMISSIONS.BOOKKEEPING_CREATE, PERMISSIONS.EXPENSES_CREATE]);
const canViewBookkeeping = requireAnyPermission([PERMISSIONS.BOOKKEEPING_VIEW]);
const canUpdateBookkeeping = requireAnyPermission([PERMISSIONS.BOOKKEEPING_UPDATE, PERMISSIONS.EXPENSES_UPDATE]);
const canDeleteBookkeeping = requireAnyPermission([PERMISSIONS.BOOKKEEPING_DELETE, PERMISSIONS.EXPENSES_DELETE]);

// Import Sessions
router.post('/', canCreateBookkeeping, validate(createSessionSchema), importSessionController.createSession);
router.get('/', canViewBookkeeping, importSessionController.listSessions);
router.get('/:sessionId', canViewBookkeeping, validate(sessionIdSchema), importSessionController.getSession);
router.post('/:sessionId/cancel', canDeleteBookkeeping, validate(sessionIdSchema), importSessionController.cancelSession);

// File Upload & Processing
router.post('/:sessionId/upload', canCreateBookkeeping, validate(uploadFileSchema), importSessionController.uploadFile);
router.post('/:sessionId/process', canCreateBookkeeping, validate(sessionIdSchema), importSessionController.processSession);
router.post('/:sessionId/finalize', canCreateBookkeeping, validate(sessionIdSchema), importSessionController.finalizeSession);

// Raw Transactions
router.get('/:sessionId/raw-transactions', canViewBookkeeping, validate(sessionIdSchema), importSessionController.listRawTransactions);
router.put('/:sessionId/raw-transactions/:rawTxId', canUpdateBookkeeping, validate(updateRawTxSchema), importSessionController.updateRawTransaction);

// Transfer Matching
router.get('/:sessionId/matches', canViewBookkeeping, validate(sessionIdSchema), importSessionController.getMatches);
router.post('/:sessionId/matches/:rawTxId/confirm', canUpdateBookkeeping, validate(matchActionSchema), importSessionController.confirmMatch);
router.post('/:sessionId/matches/:rawTxId/reject', canUpdateBookkeeping, validate(rawTxIdSchema), importSessionController.rejectMatch);

// AI Categorization
router.post('/:sessionId/ai-categorize', canCreateBookkeeping, validate(sessionIdSchema), importSessionController.aiCategorize);

// Review Queue & Duplicates
router.get('/:sessionId/review-queue', canViewBookkeeping, validate(sessionIdSchema), importSessionController.getReviewQueue);
router.get('/:sessionId/duplicates', canViewBookkeeping, validate(sessionIdSchema), importSessionController.getDuplicates);

export default router;
