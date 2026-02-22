import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface ExpenseEntity {
  id: string;
  // Backend DTO fields (primary)
  title?: string;
  description?: string | null;
  category?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentDate?: string;
  vendor?: string;
  receiptNumber?: string | null;
  status?: string;
  isReimbursable?: boolean;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Legacy aliases (backwards compat with older mappers)
  item?: string;
  notes?: string;
  expenseDate?: string;
  date?: string;
  merchant?: string;
  submittedBy?: {
    user?: { firstName?: string; lastName?: string };
  };
  project?: { name?: string };
}

export async function getExpenses(): Promise<ExpenseEntity[]> {
  const response = await api.get("/expenses");
  return extractApiArray<ExpenseEntity>(response.data);
}

export async function createExpense(data: Record<string, unknown>): Promise<ExpenseEntity> {
  const response = await api.post("/expenses", data);
  return response.data?.data || response.data;
}

export async function updateExpense(id: string, data: Record<string, unknown>): Promise<ExpenseEntity> {
  const response = await api.put(`/expenses/${id}`, data);
  return response.data?.data || response.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/expenses/${id}`);
}

export async function approveExpense(id: string): Promise<ExpenseEntity> {
  const response = await api.patch(`/expenses/${id}/approve`);
  return response.data?.data || response.data;
}
