export interface AddFundsDto {
    amount: number;
    description?: string;
}

export interface DeductFundsDto {
    amount: number;
    description: string;
    referenceType?: string;
    referenceId?: string;
}

export interface WalletTransactionQueryDto {
    page?: number;
    limit?: number;
}
