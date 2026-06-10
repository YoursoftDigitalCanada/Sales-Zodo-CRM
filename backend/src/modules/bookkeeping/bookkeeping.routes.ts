import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '../../common/constants/permissions';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requireAnyPermission, requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { bookkeepingController } from './bookkeeping.controller';
import { importBookkeepingPayloadSchema } from './bookkeeping.import.dto';
import {
  attachReceiptSchema,
  createAccountSchema,
  createCategorySchema,
  createJournalEntrySchema,
  createReconciliationSchema,
  createRecurringRuleSchema,
  createTransactionSchema,
  createTransferSchema,
  createVendorSchema,
  idSchema,
  listQuerySchema,
  reconcileTransactionSchema,
  reportQuerySchema,
  updateAccountSchema,
  updateCategorySchema,
  updateJournalEntrySchema,
  updateReconciliationSchema,
  updateRecurringRuleSchema,
  updateTransactionSchema,
  updateVendorSchema,
} from './bookkeeping.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

const canCreateBookkeeping = requireAnyPermission([PERMISSIONS.BOOKKEEPING_CREATE, PERMISSIONS.EXPENSES_CREATE]);
const canUpdateBookkeeping = requireAnyPermission([PERMISSIONS.BOOKKEEPING_UPDATE, PERMISSIONS.EXPENSES_UPDATE]);
const canDeleteBookkeeping = requireAnyPermission([PERMISSIONS.BOOKKEEPING_DELETE, PERMISSIONS.EXPENSES_DELETE]);
const canReconcileBookkeeping = requireAnyPermission([PERMISSIONS.BOOKKEEPING_RECONCILE, PERMISSIONS.BOOKKEEPING_UPDATE, PERMISSIONS.EXPENSES_APPROVE]);
const canViewBookkeepingReports = requireAnyPermission([PERMISSIONS.BOOKKEEPING_REPORTS, PERMISSIONS.BOOKKEEPING_VIEW]);
const canExportBookkeeping = requireAnyPermission([PERMISSIONS.BOOKKEEPING_EXPORT, PERMISSIONS.BOOKKEEPING_REPORTS, PERMISSIONS.BOOKKEEPING_VIEW]);

router.post('/setup', canCreateBookkeeping, bookkeepingController.setup);
router.post('/sync', canCreateBookkeeping, bookkeepingController.sync);
router.get('/dashboard', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), bookkeepingController.dashboard);

router.get('/accounts', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listAccounts);
router.post('/accounts', canCreateBookkeeping, validate(createAccountSchema), bookkeepingController.createAccount);
router.get('/accounts/:id', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(idSchema), bookkeepingController.getAccount);
router.put('/accounts/:id', canUpdateBookkeeping, validate(idSchema), validate(updateAccountSchema), bookkeepingController.updateAccount);
router.delete('/accounts/:id', canDeleteBookkeeping, validate(idSchema), bookkeepingController.deleteAccount);

router.get('/categories', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listCategories);
router.post('/categories', canCreateBookkeeping, validate(createCategorySchema), bookkeepingController.createCategory);
router.put('/categories/:id', canUpdateBookkeeping, validate(idSchema), validate(updateCategorySchema), bookkeepingController.updateCategory);
router.delete('/categories/:id', canDeleteBookkeeping, validate(idSchema), bookkeepingController.deleteCategory);

router.get('/vendors', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listVendors);
router.post('/vendors', canCreateBookkeeping, validate(createVendorSchema), bookkeepingController.createVendor);
router.get('/vendors/:id', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(idSchema), bookkeepingController.getVendor);
router.put('/vendors/:id', canUpdateBookkeeping, validate(idSchema), validate(updateVendorSchema), bookkeepingController.updateVendor);
router.delete('/vendors/:id', canDeleteBookkeeping, validate(idSchema), bookkeepingController.deleteVendor);

router.get('/transactions', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listTransactions);
router.post('/transactions', canCreateBookkeeping, validate(createTransactionSchema), bookkeepingController.createTransaction);
router.post('/import', canCreateBookkeeping, validate(importBookkeepingPayloadSchema), bookkeepingController.importTransactions);
router.get('/transactions/:id', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(idSchema), bookkeepingController.getTransaction);
router.put('/transactions/:id', canUpdateBookkeeping, validate(idSchema), validate(updateTransactionSchema), bookkeepingController.updateTransaction);
router.post('/transactions/bulk-delete', canDeleteBookkeeping, validate(z.object({ body: z.object({ ids: z.array(z.string()) }) })), bookkeepingController.bulkDeleteTransactions);
router.delete('/transactions/:id', canDeleteBookkeeping, validate(idSchema), bookkeepingController.deleteTransaction);
router.post('/transactions/:id/void', canDeleteBookkeeping, validate(idSchema), bookkeepingController.voidTransaction);
router.post('/transactions/:id/attach-receipt', canUpdateBookkeeping, validate(idSchema), validate(attachReceiptSchema), bookkeepingController.attachReceipt);
router.post('/transactions/:id/reconcile', canReconcileBookkeeping, validate(idSchema), validate(reconcileTransactionSchema), bookkeepingController.reconcileTransaction);
router.post('/transactions/:id/unreconcile', canReconcileBookkeeping, validate(idSchema), bookkeepingController.unreconcileTransaction);

router.post('/transfers', canCreateBookkeeping, validate(createTransferSchema), bookkeepingController.createTransfer);
router.get('/transfers', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listTransfers);

router.get('/journal-entries', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listJournalEntries);
router.post('/journal-entries', canCreateBookkeeping, validate(createJournalEntrySchema), bookkeepingController.createJournalEntry);
router.get('/journal-entries/:id', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(idSchema), bookkeepingController.getJournalEntry);
router.put('/journal-entries/:id', canUpdateBookkeeping, validate(idSchema), validate(updateJournalEntrySchema), bookkeepingController.updateJournalEntry);
router.post('/journal-entries/:id/post', canCreateBookkeeping, validate(idSchema), bookkeepingController.postJournalEntry);
router.post('/journal-entries/:id/void', canDeleteBookkeeping, validate(idSchema), bookkeepingController.voidJournalEntry);

router.get('/reconciliations', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listReconciliations);
router.post('/reconciliations', canReconcileBookkeeping, validate(createReconciliationSchema), bookkeepingController.createReconciliation);
router.get('/reconciliations/:id', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(idSchema), bookkeepingController.getReconciliation);
router.put('/reconciliations/:id', canReconcileBookkeeping, validate(idSchema), validate(updateReconciliationSchema), bookkeepingController.updateReconciliation);
router.delete('/reconciliations/:id', canReconcileBookkeeping, validate(idSchema), bookkeepingController.deleteReconciliation);
router.post('/reconciliations/:id/complete', canReconcileBookkeeping, validate(idSchema), bookkeepingController.completeReconciliation);

router.get('/recurring-rules', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listRecurringRules);
router.post('/recurring-rules', canCreateBookkeeping, validate(createRecurringRuleSchema), bookkeepingController.createRecurringRule);
router.put('/recurring-rules/:id', canUpdateBookkeeping, validate(idSchema), validate(updateRecurringRuleSchema), bookkeepingController.updateRecurringRule);
router.delete('/recurring-rules/:id', canDeleteBookkeeping, validate(idSchema), bookkeepingController.deleteRecurringRule);
router.post('/recurring-rules/run-due', canCreateBookkeeping, bookkeepingController.runDueRecurringRules);

router.get('/reports/profit-loss', canViewBookkeepingReports, validate(reportQuerySchema), bookkeepingController.profitLoss);
router.get('/reports/cash-flow', canViewBookkeepingReports, validate(reportQuerySchema), bookkeepingController.cashFlow);
router.get('/reports/tax-summary', canViewBookkeepingReports, validate(reportQuerySchema), bookkeepingController.taxSummary);
router.get('/reports/balance-sheet', canViewBookkeepingReports, bookkeepingController.balanceSheet);
router.get('/reports/transactions-export', canExportBookkeeping, validate(reportQuerySchema), bookkeepingController.transactionsExport);
router.get('/reports/profit-loss-export', canExportBookkeeping, validate(reportQuerySchema), bookkeepingController.profitLossExport);

export default router;
