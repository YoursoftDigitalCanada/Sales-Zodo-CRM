import { Expense, ExpenseStatus, ExpenseCategory, Currency, PaymentMethod } from '@prisma/client';

// ============================================================================
// EXPENSES DTOs - Matching Prisma Schema
// ============================================================================

export interface CreateExpenseDto {
    title: string;
    description?: string | null;
    category: ExpenseCategory;
    amount: number;
    currency?: Currency;
    paymentMethod: PaymentMethod;
    paymentDate: Date | string;
    vendor?: string | null;
    receiptNumber?: string | null;
    status?: ExpenseStatus;
    isReimbursable?: boolean;
    budgetId?: string | null;
}

export interface UpdateExpenseDto extends Partial<CreateExpenseDto> { }

export interface ExpenseQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: ExpenseStatus;
    category?: ExpenseCategory;
    sortBy?: 'paymentDate' | 'amount' | 'category' | 'status';
    sortOrder?: 'asc' | 'desc';
}

export interface ExpenseResponseDto {
    id: string;
    title: string;
    description: string | null;
    category: ExpenseCategory;
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    paymentDate: Date;
    vendor: string | null;
    receiptNumber: string | null;
    status: ExpenseStatus;
    isReimbursable: boolean;
    createdBy: { id: string; firstName: string; lastName: string } | null;
    approvedBy: { id: string; firstName: string; lastName: string } | null;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

type ExpenseWithRelations = Expense & {
    createdBy?: { id: string; user: { firstName: string; lastName: string } } | null;
    approvedBy?: { id: string; user: { firstName: string; lastName: string } } | null;
};

export function toExpenseResponseDto(exp: ExpenseWithRelations): ExpenseResponseDto {
    return {
        id: exp.id,
        title: exp.title,
        description: exp.description,
        category: exp.category,
        amount: Number(exp.amount),
        currency: exp.currency,
        paymentMethod: exp.paymentMethod,
        paymentDate: exp.paymentDate,
        vendor: exp.vendor,
        receiptNumber: exp.receiptNumber,
        status: exp.status,
        isReimbursable: exp.isReimbursable,
        createdBy: exp.createdBy ? { id: exp.createdBy.id, firstName: exp.createdBy.user.firstName, lastName: exp.createdBy.user.lastName } : null,
        approvedBy: exp.approvedBy ? { id: exp.approvedBy.id, firstName: exp.approvedBy.user.firstName, lastName: exp.approvedBy.user.lastName } : null,
        approvedAt: exp.approvedAt,
        createdAt: exp.createdAt,
        updatedAt: exp.updatedAt,
    };
}
