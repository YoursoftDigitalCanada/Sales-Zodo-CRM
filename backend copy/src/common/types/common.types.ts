export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface QueryFilters {
  search?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  [key: string]: any;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export type ID = string;

export interface TenantContext {
  tenantId: string;
  userId: string;
  employeeId?: string;
  permissions: string[];
}