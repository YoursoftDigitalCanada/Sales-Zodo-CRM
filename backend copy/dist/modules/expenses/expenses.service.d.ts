import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './expenses.dto';
export declare class ExpensesService {
    create(tenantId: string, data: CreateExpenseDto, submittedById?: string): Promise<import("./expenses.dto").ExpenseResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./expenses.dto").ExpenseResponseDto>;
    getMany(tenantId: string, query: ExpenseQueryDto): Promise<{
        data: import("./expenses.dto").ExpenseResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateExpenseDto): Promise<import("./expenses.dto").ExpenseResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
    approve(id: string, tenantId: string, approvedById: string): Promise<import("./expenses.dto").ExpenseResponseDto>;
}
export declare const expensesService: ExpensesService;
//# sourceMappingURL=expenses.service.d.ts.map