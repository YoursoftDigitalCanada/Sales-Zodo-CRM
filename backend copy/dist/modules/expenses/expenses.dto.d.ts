import { Expense, ExpenseStatus } from '@prisma/client';
export interface CreateExpenseDto {
    category: string;
    description: string;
    amount: number;
    currency?: string;
    expenseDate: Date | string;
    status?: ExpenseStatus;
    receipt?: string | null;
    projectId?: string | null;
    clientId?: string | null;
    notes?: string | null;
}
export interface UpdateExpenseDto extends Partial<CreateExpenseDto> {
}
export interface ExpenseQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: ExpenseStatus;
    category?: string;
    sortBy?: 'expenseDate' | 'amount' | 'category' | 'status';
    sortOrder?: 'asc' | 'desc';
}
export interface ExpenseResponseDto {
    id: string;
    category: string;
    description: string;
    amount: number;
    currency: string;
    expenseDate: Date;
    status: ExpenseStatus;
    receipt: string | null;
    notes: string | null;
    submittedBy: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    project: {
        id: string;
        name: string;
    } | null;
    client: {
        id: string;
        displayName: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}
type ExpenseWithRelations = Expense & {
    submittedBy?: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
        };
    } | null;
    project?: {
        id: string;
        name: string;
    } | null;
    client?: {
        id: string;
        companyName: string | null;
        firstName: string | null;
        lastName: string | null;
        clientType: string;
    } | null;
};
export declare function toExpenseResponseDto(exp: ExpenseWithRelations): ExpenseResponseDto;
export {};
//# sourceMappingURL=expenses.dto.d.ts.map