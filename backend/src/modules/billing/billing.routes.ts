import { Router } from 'express';
import { z } from 'zod';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { billingController } from './billing.controller';

const router = Router();
const idSchema = z.object({ params: z.object({ id: z.string().uuid() }) }).passthrough();
const bodySchema = z.object({ body: z.object({}).passthrough() }).passthrough();
const PAYMENT_METHODS = [
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'E_TRANSFER',
  'CHECK',
  'PAYPAL',
  'STRIPE',
  'OTHER',
] as const;
const PAYMENT_METHOD_ALIASES: Record<string, typeof PAYMENT_METHODS[number]> = {
  CARD: 'CREDIT_CARD',
  CREDITCARD: 'CREDIT_CARD',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBITCARD: 'DEBIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  BANK: 'BANK_TRANSFER',
  TRANSFER: 'BANK_TRANSFER',
  WIRE: 'BANK_TRANSFER',
  WIRE_TRANSFER: 'BANK_TRANSFER',
  BANK_TRANSFER: 'BANK_TRANSFER',
  ETRANSFER: 'E_TRANSFER',
  E_TRANSFER: 'E_TRANSFER',
  INTERAC: 'E_TRANSFER',
  CHEQUE: 'CHECK',
  CHECK: 'CHECK',
  CASH: 'CASH',
  PAYPAL: 'PAYPAL',
  STRIPE: 'STRIPE',
  OTHER: 'OTHER',
};
const paymentMethodSchema = z.preprocess((value) => {
  const normalized = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return PAYMENT_METHOD_ALIASES[normalized] || PAYMENT_METHOD_ALIASES[normalized.replaceAll('_', '')] || normalized;
}, z.enum(PAYMENT_METHODS));
const paymentBodySchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive(),
    paymentMethod: paymentMethodSchema,
    paymentDate: z.coerce.date().optional(),
    reference: z.string().trim().max(255).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
  }),
}).passthrough();

router.use(authenticate);
router.use(loadEmployee);

router.get('/subscriptions', requirePermission(PERMISSIONS.SUBSCRIPTIONS_VIEW), billingController.listSubscriptions.bind(billingController));
router.post('/subscriptions', requirePermission(PERMISSIONS.SUBSCRIPTIONS_CREATE), validate(bodySchema), billingController.createSubscription.bind(billingController));
router.get('/subscriptions/:id', requirePermission(PERMISSIONS.SUBSCRIPTIONS_VIEW), validate(idSchema), billingController.getSubscription.bind(billingController));
router.put('/subscriptions/:id', requirePermission(PERMISSIONS.SUBSCRIPTIONS_UPDATE), validate(idSchema), validate(bodySchema), billingController.updateSubscription.bind(billingController));
router.patch('/subscriptions/:id/pause', requirePermission(PERMISSIONS.SUBSCRIPTIONS_UPDATE), validate(idSchema), billingController.pauseSubscription.bind(billingController));
router.patch('/subscriptions/:id/cancel', requirePermission(PERMISSIONS.SUBSCRIPTIONS_UPDATE), validate(idSchema), billingController.cancelSubscription.bind(billingController));
router.patch('/subscriptions/:id/reactivate', requirePermission(PERMISSIONS.SUBSCRIPTIONS_UPDATE), validate(idSchema), billingController.reactivateSubscription.bind(billingController));

router.get('/pricing-plans', requirePermission(PERMISSIONS.PRICING_PLANS_VIEW), billingController.listPricingPlans.bind(billingController));
router.post('/pricing-plans', requirePermission(PERMISSIONS.PRICING_PLANS_CREATE), validate(bodySchema), billingController.createPricingPlan.bind(billingController));
router.put('/pricing-plans/:id', requirePermission(PERMISSIONS.PRICING_PLANS_UPDATE), validate(idSchema), validate(bodySchema), billingController.updatePricingPlan.bind(billingController));

router.get('/invoices', requirePermission(PERMISSIONS.INVOICES_VIEW), billingController.listInvoices.bind(billingController));
router.post('/invoices', requirePermission(PERMISSIONS.INVOICES_CREATE), validate(bodySchema), billingController.createInvoice.bind(billingController));
router.patch('/invoices/:id/sent', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(idSchema), billingController.markInvoiceSent.bind(billingController));
router.patch('/invoices/:id/paid', requirePermission(PERMISSIONS.INVOICES_MARK_PAID), validate(idSchema), validate(bodySchema), billingController.markInvoicePaid.bind(billingController));

router.get('/payments', requirePermission(PERMISSIONS.PAYMENTS_VIEW), billingController.listPayments.bind(billingController));
router.post('/payments', requirePermission(PERMISSIONS.PAYMENTS_CREATE), validate(paymentBodySchema), billingController.recordPayment.bind(billingController));
router.get('/payments/:id', requirePermission(PERMISSIONS.PAYMENTS_VIEW), validate(idSchema), billingController.getPayment.bind(billingController));
router.put('/payments/:id', requirePermission(PERMISSIONS.PAYMENTS_UPDATE), validate(idSchema), validate(paymentBodySchema), billingController.updatePayment.bind(billingController));
router.delete('/payments/:id', requirePermission(PERMISSIONS.PAYMENTS_DELETE), validate(idSchema), billingController.voidPayment.bind(billingController));

router.post('/renewal-reminders', requirePermission(PERMISSIONS.SUBSCRIPTIONS_UPDATE), validate(bodySchema), billingController.renewalReminders.bind(billingController));

export default router;
