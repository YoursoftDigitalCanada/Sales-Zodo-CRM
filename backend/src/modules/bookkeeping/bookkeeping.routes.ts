import { Router } from 'express';
import { PERMISSIONS } from '../../common/constants/permissions';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { bookkeepingController } from './bookkeeping.controller';
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

router.post('/setup', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), bookkeepingController.setup);
router.post('/sync', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), bookkeepingController.sync);
router.get('/dashboard', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), bookkeepingController.dashboard);

router.get('/accounts', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listAccounts);
router.post('/accounts', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), validate(createAccountSchema), bookkeepingController.createAccount);
router.get('/accounts/:id', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(idSchema), bookkeepingController.getAccount);
router.put('/accounts/:id', requirePermission(PERMISSIONS.BOOKKEEPING_UPDATE), validate(idSchema), validate(updateAccountSchema), bookkeepingController.updateAccount);
router.delete('/accounts/:id', requirePermission(PERMISSIONS.BOOKKEEPING_DELETE), validate(idSchema), bookkeepingController.deleteAccount);

router.get('/categories', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listCategories);
router.post('/categories', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), validate(createCategorySchema), bookkeepingController.createCategory);
router.put('/categories/:id', requirePermission(PERMISSIONS.BOOKKEEPING_UPDATE), validate(idSchema), validate(updateCategorySchema), bookkeepingController.updateCategory);
router.delete('/categories/:id', requirePermission(PERMISSIONS.BOOKKEEPING_DELETE), validate(idSchema), bookkeepingController.deleteCategory);

router.get('/vendors', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listVendors);
router.post('/vendors', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), validate(createVendorSchema), bookkeepingController.createVendor);
router.get('/vendors/:id', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(idSchema), bookkeepingController.getVendor);
router.put('/vendors/:id', requirePermission(PERMISSIONS.BOOKKEEPING_UPDATE), validate(idSchema), validate(updateVendorSchema), bookkeepingController.updateVendor);
router.delete('/vendors/:id', requirePermission(PERMISSIONS.BOOKKEEPING_DELETE), validate(idSchema), bookkeepingController.deleteVendor);

router.get('/transactions', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listTransactions);
router.post('/transactions', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), validate(createTransactionSchema), bookkeepingController.createTransaction);
router.get('/transactions/:id', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(idSchema), bookkeepingController.getTransaction);
router.put('/transactions/:id', requirePermission(PERMISSIONS.BOOKKEEPING_UPDATE), validate(idSchema), validate(updateTransactionSchema), bookkeepingController.updateTransaction);
router.delete('/transactions/:id', requirePermission(PERMISSIONS.BOOKKEEPING_DELETE), validate(idSchema), bookkeepingController.deleteTransaction);
router.post('/transactions/:id/void', requirePermission(PERMISSIONS.BOOKKEEPING_DELETE), validate(idSchema), bookkeepingController.voidTransaction);
router.post('/transactions/:id/attach-receipt', requirePermission(PERMISSIONS.BOOKKEEPING_UPDATE), validate(idSchema), validate(attachReceiptSchema), bookkeepingController.attachReceipt);
router.post('/transactions/:id/reconcile', requirePermission(PERMISSIONS.BOOKKEEPING_RECONCILE), validate(idSchema), validate(reconcileTransactionSchema), bookkeepingController.reconcileTransaction);
router.post('/transactions/:id/unreconcile', requirePermission(PERMISSIONS.BOOKKEEPING_RECONCILE), validate(idSchema), bookkeepingController.unreconcileTransaction);

router.post('/transfers', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), validate(createTransferSchema), bookkeepingController.createTransfer);
router.get('/transfers', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listTransfers);

router.get('/journal-entries', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listJournalEntries);
router.post('/journal-entries', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), validate(createJournalEntrySchema), bookkeepingController.createJournalEntry);
router.get('/journal-entries/:id', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(idSchema), bookkeepingController.getJournalEntry);
router.put('/journal-entries/:id', requirePermission(PERMISSIONS.BOOKKEEPING_UPDATE), validate(idSchema), validate(updateJournalEntrySchema), bookkeepingController.updateJournalEntry);
router.post('/journal-entries/:id/post', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), validate(idSchema), bookkeepingController.postJournalEntry);
router.post('/journal-entries/:id/void', requirePermission(PERMISSIONS.BOOKKEEPING_DELETE), validate(idSchema), bookkeepingController.voidJournalEntry);

router.get('/reconciliations', requirePermission(PERMISSIONS.BOOKKEEPING_RECONCILE), validate(listQuerySchema), bookkeepingController.listReconciliations);
router.post('/reconciliations', requirePermission(PERMISSIONS.BOOKKEEPING_RECONCILE), validate(createReconciliationSchema), bookkeepingController.createReconciliation);
router.get('/reconciliations/:id', requirePermission(PERMISSIONS.BOOKKEEPING_RECONCILE), validate(idSchema), bookkeepingController.getReconciliation);
router.put('/reconciliations/:id', requirePermission(PERMISSIONS.BOOKKEEPING_RECONCILE), validate(idSchema), validate(updateReconciliationSchema), bookkeepingController.updateReconciliation);
router.post('/reconciliations/:id/complete', requirePermission(PERMISSIONS.BOOKKEEPING_RECONCILE), validate(idSchema), bookkeepingController.completeReconciliation);

router.get('/recurring-rules', requirePermission(PERMISSIONS.BOOKKEEPING_VIEW), validate(listQuerySchema), bookkeepingController.listRecurringRules);
router.post('/recurring-rules', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), validate(createRecurringRuleSchema), bookkeepingController.createRecurringRule);
router.put('/recurring-rules/:id', requirePermission(PERMISSIONS.BOOKKEEPING_UPDATE), validate(idSchema), validate(updateRecurringRuleSchema), bookkeepingController.updateRecurringRule);
router.delete('/recurring-rules/:id', requirePermission(PERMISSIONS.BOOKKEEPING_DELETE), validate(idSchema), bookkeepingController.deleteRecurringRule);
router.post('/recurring-rules/run-due', requirePermission(PERMISSIONS.BOOKKEEPING_CREATE), bookkeepingController.runDueRecurringRules);

router.get('/reports/profit-loss', requirePermission(PERMISSIONS.BOOKKEEPING_REPORTS), validate(reportQuerySchema), bookkeepingController.profitLoss);
router.get('/reports/cash-flow', requirePermission(PERMISSIONS.BOOKKEEPING_REPORTS), validate(reportQuerySchema), bookkeepingController.cashFlow);
router.get('/reports/tax-summary', requirePermission(PERMISSIONS.BOOKKEEPING_REPORTS), validate(reportQuerySchema), bookkeepingController.taxSummary);
router.get('/reports/balance-sheet', requirePermission(PERMISSIONS.BOOKKEEPING_REPORTS), bookkeepingController.balanceSheet);
router.get('/reports/transactions-export', requirePermission(PERMISSIONS.BOOKKEEPING_EXPORT), validate(reportQuerySchema), bookkeepingController.transactionsExport);
router.get('/reports/profit-loss-export', requirePermission(PERMISSIONS.BOOKKEEPING_EXPORT), validate(reportQuerySchema), bookkeepingController.profitLossExport);

export default router;
