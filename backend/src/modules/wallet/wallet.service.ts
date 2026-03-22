import { walletRepository } from './wallet.repository';
import { WalletTransactionQueryDto } from './wallet.dto';

const ESTIMATE_COST = 20; // $20 per AI estimate

export class WalletService {
    /**
     * Get wallet details for a tenant.
     */
    async getWallet(tenantId: string) {
        const wallet = await walletRepository.getOrCreateWallet(tenantId);
        return {
            id: wallet.id,
            balance: wallet.balance,
            currency: wallet.currency,
            estimateCost: ESTIMATE_COST,
        };
    }

    /**
     * Add funds to the wallet.
     */
    async addFunds(tenantId: string, amount: number, description?: string, createdBy?: string) {
        return walletRepository.addFunds(
            tenantId,
            amount,
            description || `Added $${amount.toFixed(2)} to wallet`,
            createdBy,
        );
    }

    /**
     * Check if tenant has sufficient balance for an amount.
     */
    async checkBalance(tenantId: string, amount: number) {
        const balance = await walletRepository.getBalance(tenantId);
        return {
            sufficient: balance >= amount,
            currentBalance: balance,
            requiredAmount: amount,
            shortfall: balance < amount ? amount - balance : 0,
        };
    }

    /**
     * Charge for an AI estimate generation.
     * Deducts $20 from wallet.
     */
    async chargeForEstimate(tenantId: string, estimateId: string, createdBy?: string) {
        // Check balance first
        const balance = await walletRepository.getBalance(tenantId);
        if (balance < ESTIMATE_COST) {
            throw new Error(
                `Insufficient wallet balance for AI estimate. Current: $${balance.toFixed(2)}, Cost: $${ESTIMATE_COST.toFixed(2)}. Please add funds.`,
            );
        }

        return walletRepository.deductFunds(
            tenantId,
            ESTIMATE_COST,
            `AI Estimate generation — EST-${estimateId?.slice(0, 8)?.toUpperCase() || 'NEW'}`,
            'estimate',
            estimateId,
            createdBy,
        );
    }

    /**
     * Get paginated transaction history.
     */
    async getTransactions(tenantId: string, query: WalletTransactionQueryDto) {
        return walletRepository.getTransactions(tenantId, query);
    }
}

export const walletService = new WalletService();
