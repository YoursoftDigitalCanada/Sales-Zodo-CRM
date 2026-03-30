import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { authenticate, loadEmployee } from '../../common/middleware/auth.middleware';
import { requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import { createInvoiceSchema, updateInvoiceSchema, invoiceQuerySchema, invoiceIdSchema } from './invoices.validators';

const router = Router();
router.use(authenticate);
router.use(loadEmployee);

router.get('/', requirePermission(PERMISSIONS.INVOICES_VIEW), validate(invoiceQuerySchema), invoicesController.getMany.bind(invoicesController));
router.post('/', requirePermission(PERMISSIONS.INVOICES_CREATE), validate(createInvoiceSchema), invoicesController.create.bind(invoicesController));
router.get('/:id', requirePermission(PERMISSIONS.INVOICES_VIEW), validate(invoiceIdSchema), invoicesController.getById.bind(invoicesController));
router.get('/:id/pdf', requirePermission(PERMISSIONS.INVOICES_VIEW), validate(invoiceIdSchema), invoicesController.downloadPdf.bind(invoicesController));
router.put('/:id', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(invoiceIdSchema), validate(updateInvoiceSchema), invoicesController.update.bind(invoicesController));
router.post('/:id/send', requirePermission(PERMISSIONS.INVOICES_UPDATE), validate(invoiceIdSchema), invoicesController.send.bind(invoicesController));
router.patch('/:id/paid', requirePermission(PERMISSIONS.INVOICES_MARK_PAID), validate(invoiceIdSchema), invoicesController.markAsPaid.bind(invoicesController));
router.delete('/:id', requirePermission(PERMISSIONS.INVOICES_DELETE), validate(invoiceIdSchema), invoicesController.delete.bind(invoicesController));

export default router;
