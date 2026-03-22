import { Router } from 'express';
import { walletController } from './wallet.controller';
import {
    authenticate,
    loadEmployee,
} from '../../common/middleware/auth.middleware';
import { requireAnyPermission, requirePermission } from '../../common/middleware/permission.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { PERMISSIONS } from '../../common/constants/permissions';
import {
    addFundsSchema,
    checkBalanceSchema,
    transactionQuerySchema,
} from './wallet.validators';

const router = Router();

router.use(authenticate);
router.use(loadEmployee);

// ── Get wallet info (balance, currency) ──────────────────────────────────
router.get(
    '/',
    requireAnyPermission([PERMISSIONS.ROOF_ESTIMATOR_VIEW, PERMISSIONS.ROOF_ESTIMATOR_CREATE]),
    walletController.getWallet.bind(walletController)
);

// ── Add funds (admin / settings permission) ──────────────────────────────
router.post(
    '/add-funds',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_SETTINGS),
    validate(addFundsSchema),
    walletController.addFunds.bind(walletController)
);

// ── Check if balance is sufficient ───────────────────────────────────────
router.post(
    '/check-balance',
    requireAnyPermission([PERMISSIONS.ROOF_ESTIMATOR_VIEW, PERMISSIONS.ROOF_ESTIMATOR_CREATE]),
    validate(checkBalanceSchema),
    walletController.checkBalance.bind(walletController)
);

// ── Charge for AI estimate ($20) ─────────────────────────────────────────
router.post(
    '/charge-estimate',
    requirePermission(PERMISSIONS.ROOF_ESTIMATOR_CREATE),
    walletController.chargeEstimate.bind(walletController)
);

// ── Transaction history (paginated) ──────────────────────────────────────
router.get(
    '/transactions',
    requireAnyPermission([PERMISSIONS.ROOF_ESTIMATOR_VIEW, PERMISSIONS.ROOF_ESTIMATOR_CREATE]),
    validate(transactionQuerySchema),
    walletController.getTransactions.bind(walletController)
);

export default router;
