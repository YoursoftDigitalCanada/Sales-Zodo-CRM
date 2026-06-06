import { Request, Response, NextFunction } from 'express';
import { billingService } from './billing.service';
import { sendCreated, sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class BillingController {
  async listSubscriptions(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.listSubscriptions(req.context.tenantId, req.query as any)); } catch (error) { next(error); }
  }

  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.getSubscription(req.params.id, req.context.tenantId)); } catch (error) { next(error); }
  }

  async createSubscription(req: Request, res: Response, next: NextFunction) {
    try { sendCreated(res, await billingService.createSubscription(req.context.tenantId, sanitizeBody(req.body), req.user?.userId), 'Subscription created'); } catch (error) { next(error); }
  }

  async updateSubscription(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.updateSubscription(req.params.id, req.context.tenantId, sanitizeBody(req.body), req.user?.userId), 'Subscription updated'); } catch (error) { next(error); }
  }

  async pauseSubscription(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.setSubscriptionStatus(req.params.id, req.context.tenantId, 'PAUSED', req.user?.userId), 'Subscription paused'); } catch (error) { next(error); }
  }

  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.setSubscriptionStatus(req.params.id, req.context.tenantId, 'CANCELLED', req.user?.userId), 'Subscription cancelled'); } catch (error) { next(error); }
  }

  async reactivateSubscription(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.setSubscriptionStatus(req.params.id, req.context.tenantId, 'ACTIVE', req.user?.userId), 'Subscription reactivated'); } catch (error) { next(error); }
  }

  async listPricingPlans(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.listPricingPlans(req.context.tenantId, req.query as any)); } catch (error) { next(error); }
  }

  async createPricingPlan(req: Request, res: Response, next: NextFunction) {
    try { sendCreated(res, await billingService.upsertPricingPlan(req.context.tenantId, sanitizeBody(req.body)), 'Pricing plan saved'); } catch (error) { next(error); }
  }

  async updatePricingPlan(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.updatePricingPlan(req.params.id, req.context.tenantId, sanitizeBody(req.body)), 'Pricing plan updated'); } catch (error) { next(error); }
  }

  async listInvoices(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.listInvoices(req.context.tenantId, req.query as any)); } catch (error) { next(error); }
  }

  async createInvoice(req: Request, res: Response, next: NextFunction) {
    try { sendCreated(res, await billingService.createInvoice(req.context.tenantId, sanitizeBody(req.body), req.user?.userId), 'Invoice created'); } catch (error) { next(error); }
  }

  async markInvoiceSent(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.markInvoiceSent(req.params.id, req.context.tenantId, req.user?.userId), 'Invoice marked sent'); } catch (error) { next(error); }
  }

  async markInvoicePaid(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.markInvoicePaid(req.params.id, req.context.tenantId, sanitizeBody(req.body), req.user?.userId), 'Invoice marked paid'); } catch (error) { next(error); }
  }

  async listPayments(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.listPayments(req.context.tenantId, req.query as any)); } catch (error) { next(error); }
  }

  async getPayment(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.getPayment(req.params.id, req.context.tenantId)); } catch (error) { next(error); }
  }

  async recordPayment(req: Request, res: Response, next: NextFunction) {
    try { sendCreated(res, await billingService.recordPayment(req.context.tenantId, sanitizeBody(req.body), req.user?.userId), 'Payment recorded'); } catch (error) { next(error); }
  }

  async updatePayment(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.updatePayment(req.params.id, req.context.tenantId, sanitizeBody(req.body), req.user?.userId), 'Payment updated'); } catch (error) { next(error); }
  }

  async voidPayment(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.voidPayment(req.params.id, req.context.tenantId, req.user?.userId), 'Payment voided'); } catch (error) { next(error); }
  }

  async renewalReminders(req: Request, res: Response, next: NextFunction) {
    try { sendSuccess(res, await billingService.createRenewalReminders(req.context.tenantId, Number(req.body?.days || req.query?.days || 30), req.user?.userId), 'Renewal reminders prepared'); } catch (error) { next(error); }
  }
}

export const billingController = new BillingController();
