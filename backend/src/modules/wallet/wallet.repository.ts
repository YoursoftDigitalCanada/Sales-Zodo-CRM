import { PrismaClient } from '@prisma/client';
import { AddFundsDto, WalletTransactionQueryDto } from './wallet.dto';

const prisma = new PrismaClient();

export class WalletRepository {
    /**
     * Get or create a wallet for a tenant (auto-creates with $500 default).
     */
    async getOrCreateWallet(tenantId: string) {
        let wallet = await prisma.wallet.findUnique({ where: { tenantId } });
        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: {
                    tenantId,
                    balance: 500, // Default testing balance
                    currency: 'CAD',
                },
            });

            // Log the initial credit
            await prisma.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'credit',
                    amount: 500,
                    description: 'Initial testing balance',
                    balanceAfter: 500,
                    referenceType: 'topup',
                },
            });
        }
        return wallet;
    }

    /**
     * Get wallet balance for a tenant.
     */
    async getBalance(tenantId: string): Promise<number> {
        const wallet = await this.getOrCreateWallet(tenantId);
        return wallet.balance;
    }

    /**
     * Add funds to wallet (credit).
     * Returns updated wallet.
     */
    async addFunds(
        tenantId: string,
        amount: number,
        description: string,
        createdBy?: string,
    ) {
        const wallet = await this.getOrCreateWallet(tenantId);
        const newBalance = wallet.balance + amount;

        // Atomic update + transaction log
        const [updatedWallet, transaction] = await prisma.$transaction([
            prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: newBalance },
            }),
            prisma.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'credit',
                    amount,
                    description: description || `Added $${amount.toFixed(2)}`,
                    balanceAfter: newBalance,
                    referenceType: 'topup',
                    createdBy,
                },
            }),
        ]);

        return { wallet: updatedWallet, transaction };
    }

    /**
     * Deduct funds from wallet (debit).
     * Throws if insufficient balance.
     */
    async deductFunds(
        tenantId: string,
        amount: number,
        description: string,
        referenceType?: string,
        referenceId?: string,
        createdBy?: string,
    ) {
        const wallet = await this.getOrCreateWallet(tenantId);

        if (wallet.balance < amount) {
            throw new Error(
                `Insufficient wallet balance. Current: $${wallet.balance.toFixed(2)}, Required: $${amount.toFixed(2)}`,
            );
        }

        const newBalance = wallet.balance - amount;

        const [updatedWallet, transaction] = await prisma.$transaction([
            prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: newBalance },
            }),
            prisma.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'debit',
                    amount,
                    description,
                    balanceAfter: newBalance,
                    referenceType: referenceType || null,
                    referenceId: referenceId || null,
                    createdBy,
                },
            }),
        ]);

        return { wallet: updatedWallet, transaction };
    }

    /**
     * Get paginated transaction history.
     */
    async getTransactions(tenantId: string, query: WalletTransactionQueryDto) {
        const { page = 1, limit = 20 } = query;
        const wallet = await this.getOrCreateWallet(tenantId);

        const [data, total] = await Promise.all([
            prisma.walletTransaction.findMany({
                where: { walletId: wallet.id },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.walletTransaction.count({
                where: { walletId: wallet.id },
            }),
        ]);

        return { data, total, page, limit };
    }
}

export const walletRepository = new WalletRepository();
