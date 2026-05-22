export type BookkeepingRecord = Record<string, any>;

export interface BookkeepingListResult<T = BookkeepingRecord> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const BOOKKEEPING_ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const;
export const BOOKKEEPING_CATEGORY_TYPES = ['INCOME', 'EXPENSE'] as const;
export const BOOKKEEPING_TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT', 'REFUND'] as const;
export const BOOKKEEPING_TRANSACTION_STATUSES = ['PENDING', 'POSTED', 'VOID', 'RECONCILED'] as const;
export const BOOKKEEPING_JOURNAL_STATUSES = ['DRAFT', 'POSTED', 'VOID'] as const;
export const BOOKKEEPING_RECONCILIATION_STATUSES = ['DRAFT', 'RECONCILED', 'VOID'] as const;
export const BOOKKEEPING_RECURRING_FREQUENCIES = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

export function toNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function toDate(value: any, fallback = new Date()): Date {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function serializeMoney(value: any): number {
  return Number(Number(value || 0).toFixed(2));
}

export function buildPagination(page = 1, limit = 50, total = 0) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
