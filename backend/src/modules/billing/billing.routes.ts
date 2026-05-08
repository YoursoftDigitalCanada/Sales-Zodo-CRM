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

router.use(authenticate);
router.use(loadEmployee);

router.get('/subscriptions', requirePermission(PERMISSIONS.INVOICES_VIEW), billingController.listSubscriptions.bind(billingController));
router.post('/subscriptions', requirePermission(PERMISSIONS.INVOICES_CREATE), validate(bodySchema), billingController.createSubscription.bind(billingController));
router.get('/subscriptions/:id', requirePermission(PERMISSIONS.INVOICES_VIEW), validate(idSchema), billingController.getSubscription.bind(billingController));
router.put('/subscriptions/:id', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(idSchema), validate(bodySchema), billingController.updateSubscription.bind(billingController));
router.patch('/subscriptions/:id/pause', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(idSchema), billingController.pauseSubscription.bind(billingController));
router.patch('/subscriptions/:id/cancel', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(idSchema), billingController.cancelSubscription.bind(billingController));
router.patch('/subscriptions/:id/reactivate', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(idSchema), billingController.reactivateSubscription.bind(billingController));

router.get('/pricing-plans', requirePermission(PERMISSIONS.INVOICES_VIEW), billingController.listPricingPlans.bind(billingController));
router.post('/pricing-plans', requirePermission(PERMISSIONS.INVOICES_CREATE), validate(bodySchema), billingController.createPricingPlan.bind(billingController));
router.put('/pricing-plans/:id', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(idSchema), validate(bodySchema), billingController.updatePricingPlan.bind(billingController));

router.get('/invoices', requirePermission(PERMISSIONS.INVOICES_VIEW), billingController.listInvoices.bind(billingController));
router.post('/invoices', requirePermission(PERMISSIONS.INVOICES_CREATE), validate(bodySchema), billingController.createInvoice.bind(billingController));
router.patch('/invoices/:id/sent', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(idSchema), billingController.markInvoiceSent.bind(billingController));
router.patch('/invoices/:id/paid', requirePermission(PERMISSIONS.INVOICES_MARK_PAID), validate(idSchema), validate(bodySchema), billingController.markInvoicePaid.bind(billingController));

router.get('/payments', requirePermission(PERMISSIONS.INVOICES_VIEW), billingController.listPayments.bind(billingController));
router.post('/payments', requirePermission(PERMISSIONS.INVOICES_MARK_PAID), validate(bodySchema), billingController.recordPayment.bind(billingController));

router.post('/renewal-reminders', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(bodySchema), billingController.renewalReminders.bind(billingController));

export default router;
