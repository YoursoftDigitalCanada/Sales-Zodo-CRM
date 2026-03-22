import { Request, Response, NextFunction } from 'express';
import { walletService } from './wallet.service';

export class WalletController {
    /**
     * GET /wallet — Get wallet balance and info
     */
    async getWallet(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = (req as any).context.tenantId;
            const wallet = await walletService.getWallet(tenantId);
            res.json({ success: true, data: wallet });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /wallet/add-funds — Add credit to wallet
     */
    async addFunds(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = (req as any).context.tenantId;
            const userId = (req as any).user?.employeeId || (req as any).user?.userId;
            const { amount, description } = req.body;

            const result = await walletService.addFunds(tenantId, amount, description, userId);
            res.json({
                success: true,
                data: {
                    balance: result.wallet.balance,
                    transaction: result.transaction,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /wallet/check-balance — Check if balance is sufficient
     */
    async checkBalance(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = (req as any).context.tenantId;
            const { amount } = req.body;

            const result = await walletService.checkBalance(tenantId, amount);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /wallet/charge-estimate — Deduct $20 for AI estimate
     */
    async chargeEstimate(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = (req as any).context.tenantId;
            const userId = (req as any).user?.employeeId || (req as any).user?.userId;
            const { estimateId } = req.body;

            const result = await walletService.chargeForEstimate(tenantId, estimateId, userId);
            res.json({
                success: true,
                data: {
                    balance: result.wallet.balance,
                    amountCharged: 20,
                    transaction: result.transaction,
                },
            });
        } catch (error: any) {
            if (error.message?.includes('Insufficient')) {
                res.status(402).json({
                    success: false,
                    message: error.message,
                    code: 'INSUFFICIENT_BALANCE',
                });
            } else {
                next(error);
            }
        }
    }

    /**
     * GET /wallet/transactions — Paginated transaction history
     */
    async getTransactions(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = (req as any).context.tenantId;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const result = await walletService.getTransactions(tenantId, { page, limit });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}

export const walletController = new WalletController();
