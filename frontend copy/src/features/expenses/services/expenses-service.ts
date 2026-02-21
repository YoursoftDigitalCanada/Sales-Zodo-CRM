import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface ExpenseEntity {
  id: string;
  description?: string;
  item?: string;
  notes?: string;
  category?: string;
  amount?: number;
  currency?: string;
  expenseDate?: string;
  date?: string;
  vendor?: string;
  merchant?: string;
  paymentMethod?: string;
  status?: string;
  submittedBy?: {
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };
  approvedBy?: {
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };
  project?: { name?: string };
  createdAt?: string;
}

export async function getExpenses(): Promise<ExpenseEntity[]> {
  const response = await api.get("/expenses");
  return extractApiArray<ExpenseEntity>(response.data);
}
