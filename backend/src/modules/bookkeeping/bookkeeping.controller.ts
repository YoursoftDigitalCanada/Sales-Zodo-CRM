import { NextFunction, Request, Response } from 'express';
import { sendCreated, sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { bookkeepingService } from './bookkeeping.service';

function tenant(req: Request) {
  return req.context.tenantId;
}

function actor(req: Request) {
  return req.user?.userId || req.user?.employeeId;
}

export class BookkeepingController {
  setup = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.setup(tenant(req), actor(req)), 'Bookkeeping initialized'); } catch (error) { next(error); } };
  sync = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.sync(tenant(req), actor(req)), 'Bookkeeping synced'); } catch (error) { next(error); } };
  dashboard = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.dashboard(tenant(req), req.query)); } catch (error) { next(error); } };

  listAccounts = async (req: Request, res: Response, next: NextFunction) => { try { const result = await bookkeepingService.listAccounts(tenant(req), req.query); sendSuccess(res, result.data, undefined, 200, result.meta); } catch (error) { next(error); } };
  createAccount = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await bookkeepingService.createAccount(tenant(req), sanitizeBody(req.body), actor(req)), 'Account created'); } catch (error) { next(error); } };
  getAccount = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.getAccount(req.params.id, tenant(req))); } catch (error) { next(error); } };
  updateAccount = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.updateAccount(req.params.id, tenant(req), sanitizeBody(req.body), actor(req)), 'Account updated'); } catch (error) { next(error); } };
  deleteAccount = async (req: Request, res: Response, next: NextFunction) => { try { await bookkeepingService.deleteAccount(req.params.id, tenant(req), actor(req)); sendNoContent(res); } catch (error) { next(error); } };

  listCategories = async (req: Request, res: Response, next: NextFunction) => { try { const result = await bookkeepingService.listCategories(tenant(req), req.query); sendSuccess(res, result.data, undefined, 200, result.meta); } catch (error) { next(error); } };
  createCategory = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await bookkeepingService.createCategory(tenant(req), sanitizeBody(req.body), actor(req)), 'Category created'); } catch (error) { next(error); } };
  updateCategory = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.updateCategory(req.params.id, tenant(req), sanitizeBody(req.body), actor(req)), 'Category updated'); } catch (error) { next(error); } };
  deleteCategory = async (req: Request, res: Response, next: NextFunction) => { try { await bookkeepingService.deleteCategory(req.params.id, tenant(req)); sendNoContent(res); } catch (error) { next(error); } };

  listVendors = async (req: Request, res: Response, next: NextFunction) => { try { const result = await bookkeepingService.listVendors(tenant(req), req.query); sendSuccess(res, result.data, undefined, 200, result.meta); } catch (error) { next(error); } };
  createVendor = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await bookkeepingService.createVendor(tenant(req), sanitizeBody(req.body), actor(req)), 'Vendor created'); } catch (error) { next(error); } };
  getVendor = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.getVendor(req.params.id, tenant(req))); } catch (error) { next(error); } };
  updateVendor = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.updateVendor(req.params.id, tenant(req), sanitizeBody(req.body), actor(req)), 'Vendor updated'); } catch (error) { next(error); } };
  deleteVendor = async (req: Request, res: Response, next: NextFunction) => { try { await bookkeepingService.deleteVendor(req.params.id, tenant(req), actor(req)); sendNoContent(res); } catch (error) { next(error); } };

  listTransactions = async (req: Request, res: Response, next: NextFunction) => { try { const result = await bookkeepingService.listTransactions(tenant(req), req.query); sendSuccess(res, result.data, undefined, 200, result.meta); } catch (error) { next(error); } };
  createTransaction = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await bookkeepingService.createTransaction(tenant(req), sanitizeBody(req.body), actor(req)), 'Transaction created'); } catch (error) { next(error); } };
  importTransactions = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await bookkeepingService.importTransactions(tenant(req), sanitizeBody(req.body), actor(req)), 'Transactions imported'); } catch (error) { next(error); } };
  getTransaction = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.getTransaction(req.params.id, tenant(req))); } catch (error) { next(error); } };
  updateTransaction = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.updateTransaction(req.params.id, tenant(req), sanitizeBody(req.body), actor(req)), 'Transaction updated'); } catch (error) { next(error); } };
  deleteTransaction = async (req: Request, res: Response, next: NextFunction) => { try { await bookkeepingService.deleteTransaction(req.params.id, tenant(req), actor(req)); sendNoContent(res); } catch (error) { next(error); } };
  voidTransaction = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.voidTransaction(req.params.id, tenant(req), actor(req)), 'Transaction voided'); } catch (error) { next(error); } };
  attachReceipt = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.attachReceipt(req.params.id, tenant(req), req.body.fileId, actor(req)), 'Receipt attached'); } catch (error) { next(error); } };
  reconcileTransaction = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.reconcileTransaction(req.params.id, tenant(req), actor(req)), 'Transaction reconciled'); } catch (error) { next(error); } };
  unreconcileTransaction = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.unreconcileTransaction(req.params.id, tenant(req)), 'Transaction unreconciled'); } catch (error) { next(error); } };

  createTransfer = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await bookkeepingService.createTransfer(tenant(req), sanitizeBody(req.body), actor(req)), 'Transfer created'); } catch (error) { next(error); } };
  listTransfers = async (req: Request, res: Response, next: NextFunction) => { try { const result = await bookkeepingService.listTransfers(tenant(req), req.query); sendSuccess(res, result.data, undefined, 200, result.meta); } catch (error) { next(error); } };

  listJournalEntries = async (req: Request, res: Response, next: NextFunction) => { try { const result = await bookkeepingService.listJournalEntries(tenant(req), req.query); sendSuccess(res, result.data, undefined, 200, result.meta); } catch (error) { next(error); } };
  createJournalEntry = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await bookkeepingService.createJournalEntry(tenant(req), sanitizeBody(req.body), actor(req)), 'Journal entry created'); } catch (error) { next(error); } };
  getJournalEntry = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.getJournalEntry(req.params.id, tenant(req))); } catch (error) { next(error); } };
  updateJournalEntry = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.updateJournalEntry(req.params.id, tenant(req), sanitizeBody(req.body)), 'Journal entry updated'); } catch (error) { next(error); } };
  postJournalEntry = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.postJournalEntry(req.params.id, tenant(req), actor(req)), 'Journal entry posted'); } catch (error) { next(error); } };
  voidJournalEntry = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.voidJournalEntry(req.params.id, tenant(req), actor(req)), 'Journal entry voided'); } catch (error) { next(error); } };

  listReconciliations = async (req: Request, res: Response, next: NextFunction) => { try { const result = await bookkeepingService.listReconciliations(tenant(req), req.query); sendSuccess(res, result.data, undefined, 200, result.meta); } catch (error) { next(error); } };
  createReconciliation = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await bookkeepingService.createReconciliation(tenant(req), sanitizeBody(req.body), actor(req)), 'Reconciliation created'); } catch (error) { next(error); } };
  getReconciliation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.getReconciliation(req.params.id, tenant(req))); } catch (error) { next(error); } };
  updateReconciliation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.updateReconciliation(req.params.id, tenant(req), sanitizeBody(req.body), actor(req)), 'Reconciliation updated'); } catch (error) { next(error); } };
  deleteReconciliation = async (req: Request, res: Response, next: NextFunction) => { try { await bookkeepingService.deleteReconciliation(req.params.id, tenant(req), actor(req)); sendNoContent(res); } catch (error) { next(error); } };
  completeReconciliation = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.completeReconciliation(req.params.id, tenant(req), actor(req)), 'Reconciliation completed'); } catch (error) { next(error); } };

  listRecurringRules = async (req: Request, res: Response, next: NextFunction) => { try { const result = await bookkeepingService.listRecurringRules(tenant(req), req.query); sendSuccess(res, result.data, undefined, 200, result.meta); } catch (error) { next(error); } };
  createRecurringRule = async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, await bookkeepingService.createRecurringRule(tenant(req), sanitizeBody(req.body), actor(req)), 'Recurring rule created'); } catch (error) { next(error); } };
  updateRecurringRule = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.updateRecurringRule(req.params.id, tenant(req), sanitizeBody(req.body), actor(req)), 'Recurring rule updated'); } catch (error) { next(error); } };
  deleteRecurringRule = async (req: Request, res: Response, next: NextFunction) => { try { await bookkeepingService.deleteRecurringRule(req.params.id, tenant(req), actor(req)); sendNoContent(res); } catch (error) { next(error); } };
  runDueRecurringRules = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.runDueRecurringRules(tenant(req), actor(req)), 'Due recurring rules processed'); } catch (error) { next(error); } };

  profitLoss = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.profitLoss(tenant(req), req.query)); } catch (error) { next(error); } };
  cashFlow = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.cashFlow(tenant(req), req.query)); } catch (error) { next(error); } };
  taxSummary = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.taxSummary(tenant(req), req.query)); } catch (error) { next(error); } };
  balanceSheet = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await bookkeepingService.balanceSheet(tenant(req))); } catch (error) { next(error); } };
  transactionsExport = async (req: Request, res: Response, next: NextFunction) => { try { res.type('text/csv').send(await bookkeepingService.transactionsCsv(tenant(req), req.query)); } catch (error) { next(error); } };
  profitLossExport = async (req: Request, res: Response, next: NextFunction) => { try { res.type('text/csv').send(await bookkeepingService.profitLossCsv(tenant(req), req.query)); } catch (error) { next(error); } };
}

export const bookkeepingController = new BookkeepingController();
