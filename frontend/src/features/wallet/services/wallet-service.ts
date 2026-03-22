import api from "@/lib/axios";

// ── Types ────────────────────────────────────────────────────────────────

export interface WalletInfo {
    id: string;
    balance: number;
    currency: string;
    estimateCost: number;
}

export interface WalletTransaction {
    id: string;
    walletId: string;
    type: "credit" | "debit";
    amount: number;
    description: string;
    balanceAfter: number;
    referenceType: string | null;
    referenceId: string | null;
    createdBy: string | null;
    createdAt: string;
}

export interface BalanceCheck {
    sufficient: boolean;
    currentBalance: number;
    requiredAmount: number;
    shortfall: number;
}

export interface TransactionPage {
    data: WalletTransaction[];
    total: number;
    page: number;
    limit: number;
}

// ── Service Functions ────────────────────────────────────────────────────

/**
 * Get wallet info (balance, currency, estimate cost).
 */
export async function getWallet(): Promise<WalletInfo> {
    const res = await api.get("/wallet");
    return res.data?.data;
}

/**
 * Add funds to wallet.
 */
export async function addFunds(
    amount: number,
    description?: string,
): Promise<{ balance: number; transaction: WalletTransaction }> {
    const res = await api.post("/wallet/add-funds", { amount, description });
    return res.data?.data;
}

/**
 * Check if balance is sufficient for a given amount.
 */
export async function checkBalance(amount: number): Promise<BalanceCheck> {
    const res = await api.post("/wallet/check-balance", { amount });
    return res.data?.data;
}

/**
 * Charge wallet for an AI estimate ($20).
 */
export async function chargeEstimate(estimateId: string): Promise<{
    balance: number;
    amountCharged: number;
    transaction: WalletTransaction;
}> {
    const res = await api.post("/wallet/charge-estimate", { estimateId });
    return res.data?.data;
}

/**
 * Get paginated transaction history.
 */
export async function getTransactions(
    page = 1,
    limit = 20,
): Promise<TransactionPage> {
    const res = await api.get("/wallet/transactions", {
        params: { page, limit },
    });
    return res.data?.data;
}
