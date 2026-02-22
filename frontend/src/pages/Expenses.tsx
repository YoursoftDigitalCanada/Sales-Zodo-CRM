// src/pages/Expenses.tsx

import React, { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getExpenses, createExpense, updateExpense, deleteExpense, approveExpense } from "@/features/expenses";
import {
  Bell,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  MoreVertical,
  MoreHorizontal,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  Trash2,
  Copy,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  CalendarDays,
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  FileText,
  Paperclip,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  PieChart,
  BarChart3,
  Activity,
  Building2,
  Briefcase,
  Car,
  Coffee,
  Utensils,
  Plane,
  Home,
  ShoppingCart,
  Wifi,
  Phone,
  Monitor,
  Zap,
  Sparkles,
  Tag,
  Users,
  UserCheck,
  CircleDollarSign,
  Banknote,
  ArrowLeftRight,
  FileSpreadsheet,
  Printer,
  Send,
  type LucideIcon,
} from "lucide-react";

// ============================================
// CONFIGURATION
// ============================================

// ============================================
// TYPES
// ============================================

interface Expense {
  id: string;
  item: string;
  description?: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string;
  paymentMethod: string;
  status: "pending" | "approved" | "rejected" | "reimbursed";
  receipt?: string;
  receiptUrl?: string;
  tags?: string[];
  notes?: string;
  submittedBy: string;
  approvedBy?: string;
  project?: string;
  client?: string;
  createdAt: string;
  updatedAt?: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  budget?: number;
  spent?: number;
}

interface ExpenseStats {
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  pendingApprovals: number;
  thisMonthExpenses: number;
  lastMonthExpenses: number;
  expenseChange: number;
  revenueChange: number;
  profitChange: number;
}

interface BudgetItem {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
}

// ============================================
// CONSTANTS & DATA
// ============================================

const expenseCategories: ExpenseCategory[] = [
  { id: "travel", name: "Travel & Transport", icon: Plane, color: "#3B82F6", budget: 5000, spent: 3200 },
  { id: "meals", name: "Meals & Entertainment", icon: Utensils, color: "#F97316", budget: 2000, spent: 1450 },
  { id: "office", name: "Office Supplies", icon: Briefcase, color: "#8B5CF6", budget: 1500, spent: 890 },
  { id: "software", name: "Software & Tools", icon: Monitor, color: "#22D3EE", budget: 3000, spent: 2100 },
  { id: "utilities", name: "Utilities", icon: Zap, color: "#EAB308", budget: 1000, spent: 750 },
  { id: "marketing", name: "Marketing", icon: TrendingUp, color: "#EC4899", budget: 4000, spent: 2800 },
  { id: "rent", name: "Rent & Facilities", icon: Building2, color: "#6B7280", budget: 8000, spent: 8000 },
  { id: "other", name: "Other", icon: Receipt, color: "#64748B", budget: 1500, spent: 600 },
];

const paymentMethods = [
  { id: "credit_card", name: "Credit Card", icon: CreditCard },
  { id: "debit_card", name: "Debit Card", icon: CreditCard },
  { id: "cash", name: "Cash", icon: Banknote },
  { id: "bank_transfer", name: "Bank Transfer", icon: ArrowLeftRight },
  { id: "company_card", name: "Company Card", icon: Wallet },
  { id: "reimbursement", name: "Reimbursement", icon: CircleDollarSign },
];

// Initial state removed — data is fetched from API on mount

const defaultExpenseStats: ExpenseStats = {
  totalExpenses: 0,
  totalRevenue: 0,
  netProfit: 0,
  pendingApprovals: 0,
  thisMonthExpenses: 0,
  lastMonthExpenses: 0,
  expenseChange: 0,
  revenueChange: 0,
  profitChange: 0,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount: number, currency: string = "CAD"): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return formatDate(dateString);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500" };
    case "pending":
      return { bg: "bg-yellow-50", text: "text-yellow-600", dot: "bg-yellow-500" };
    case "rejected":
      return { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" };
    case "reimbursed":
      return { bg: "bg-blue-50", text: "text-[#0891B2]", dot: "bg-[#0891B2]" };
    default:
      return { bg: "bg-[#F8FAFC]", text: "text-[#475569]", dot: "bg-[#F8FAFC]0" };
  }
};

const getCategoryInfo = (categoryId: string): ExpenseCategory => {
  return expenseCategories.find((c) => c.id === categoryId) || expenseCategories[7];
};

const getPaymentMethodInfo = (methodId: string) => {
  return paymentMethods.find((m) => m.id === methodId) || paymentMethods[0];
};

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  prefix = "",
  delay = 0,
  trend,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: "teal" | "gold" | "navy" | "purple" | "green" | "blue" | "red";
  prefix?: string;
  delay?: number;
  trend?: "up" | "down";
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#F8FAFC]", light: "bg-[#F8FAFC]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    blue: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-blue-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all overflow-hidden group"
    >
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-2xl font-bold text-[#0F172A]">
            {prefix}{typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {(trend === "up" || (trend === undefined && change >= 0)) ? (
                <ArrowUpRight size={14} className="text-green-500" />
              ) : (
                <ArrowDownRight size={14} className="text-red-500" />
              )}
              <span className={cn(
                "text-xs font-semibold",
                (trend === "up" || (trend === undefined && change >= 0)) ? "text-green-600" : "text-red-600"
              )}>
                {Math.abs(change)}%
              </span>
              {changeLabel && <span className="text-xs text-[#475569]">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-md flex items-center justify-center", colors.light)}>
          <Icon size={22} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// EXPENSE ROW COMPONENT
// ============================================

const ExpenseRow = ({
  expense,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  expense: Expense;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Expense["status"]) => void;
}) => {
  const statusColors = getStatusColor(expense.status);
  const categoryInfo = getCategoryInfo(expense.category);
  const CategoryIcon = categoryInfo.icon;

  return (
    <TableRow className="group hover:bg-[#F8FAFC]">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3 cursor-pointer" onClick={onView}>
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${categoryInfo.color}15` }}
          >
            <CategoryIcon size={18} style={{ color: categoryInfo.color }} />
          </div>
          <div>
            <p className="font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
              {expense.item}
            </p>
            <p className="text-sm text-[#94A3B8]">{expense.vendor}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ backgroundColor: `${categoryInfo.color}15`, color: categoryInfo.color }}
        >
          {categoryInfo.name}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-[#475569]">{formatDate(expense.date)}</span>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-[#0F172A]">
          {formatCurrency(expense.amount, expense.currency)}
        </span>
      </TableCell>
      <TableCell>
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize",
          statusColors.bg, statusColors.text
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", statusColors.dot)} />
          {expense.status}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-[#94A3B8]">{expense.submittedBy}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onView}>
                  <Eye size={16} className="text-[#475569]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onEdit}>
                  <Pencil size={16} className="text-[#475569]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                <MoreVertical size={16} className="text-[#475569]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-md">
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Copy size={14} className="mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Receipt size={14} className="mr-2" /> View Receipt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {expense.status === "pending" && (
                <>
                  <DropdownMenuItem
                    onClick={() => onStatusChange("approved")}
                    className="rounded-md text-green-600"
                  >
                    <CheckCircle2 size={14} className="mr-2" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onStatusChange("rejected")}
                    className="rounded-md text-red-600"
                  >
                    <X size={14} className="mr-2" /> Reject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

// ============================================
// EXPENSE CARD COMPONENT (GRID VIEW)
// ============================================

const ExpenseCard = ({
  expense,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  delay = 0,
}: {
  expense: Expense;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Expense["status"]) => void;
  delay?: number;
}) => {
  const statusColors = getStatusColor(expense.status);
  const categoryInfo = getCategoryInfo(expense.category);
  const CategoryIcon = categoryInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative bg-white rounded-md border overflow-hidden transition-all group cursor-pointer",
        isSelected
          ? "border-[#22D3EE] ring-2 ring-[#22D3EE]/20"
          : "border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg "
      )}
      onClick={onView}
    >
      {/* Selection Checkbox */}
      <div
        className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE] bg-white"
        />
      </div>

      {/* Actions Menu */}
      <div
        className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md bg-white/80 backdrop-blur-sm hover:bg-white"
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-md">
            <DropdownMenuItem onClick={onView} className="rounded-md">
              <Eye size={14} className="mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="rounded-md">
              <Pencil size={14} className="mr-2" /> Edit
            </DropdownMenuItem>
            {expense.status === "pending" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onStatusChange("approved")}
                  className="rounded-md text-green-600"
                >
                  <CheckCircle2 size={14} className="mr-2" /> Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusChange("rejected")}
                  className="rounded-md text-red-600"
                >
                  <X size={14} className="mr-2" /> Reject
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${categoryInfo.color}15` }}
          >
            <CategoryIcon size={24} style={{ color: categoryInfo.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-[#0891B2] transition-colors">
              {expense.item}
            </h3>
            <p className="text-sm text-[#94A3B8] truncate">{expense.vendor}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <span className="text-2xl font-bold text-[#0F172A]">
            {formatCurrency(expense.amount, expense.currency)}
          </span>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-3 mb-4">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium capitalize",
            statusColors.bg, statusColors.text
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusColors.dot)} />
            {expense.status}
          </span>
          <span className="text-xs text-[#475569]">{formatDate(expense.date)}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(15,23,42,0.06)]">
          <span
            className="text-xs font-medium px-2 py-1 rounded-md"
            style={{ backgroundColor: `${categoryInfo.color}10`, color: categoryInfo.color }}
          >
            {categoryInfo.name}
          </span>
          <span className="text-xs text-[#475569]">{expense.submittedBy}</span>
        </div>

        {/* Tags */}
        {expense.tags && expense.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {expense.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-white/5 text-[#94A3B8] rounded-md text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// ADD/EDIT EXPENSE DIALOG
// ============================================

const ExpenseFormDialog = ({
  isOpen,
  onClose,
  expense,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onSubmit: (data: Partial<Expense>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    item: "",
    description: "",
    category: "office",
    amount: "",
    currency: "CAD",
    date: new Date().toISOString().split("T")[0],
    vendor: "",
    paymentMethod: "credit_card",
    project: "",
    client: "",
    tags: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    if (expense) {
      setFormData({
        item: expense.item,
        description: expense.description || "",
        category: expense.category,
        amount: expense.amount.toString(),
        currency: expense.currency,
        date: expense.date,
        vendor: expense.vendor,
        paymentMethod: expense.paymentMethod,
        project: expense.project || "",
        client: expense.client || "",
        tags: expense.tags?.join(", ") || "",
        notes: expense.notes || "",
      });
    } else {
      setFormData({
        item: "",
        description: "",
        category: "office",
        amount: "",
        currency: "CAD",
        date: new Date().toISOString().split("T")[0],
        vendor: "",
        paymentMethod: "credit_card",
        project: "",
        client: "",
        tags: "",
        notes: "",
      });
    }
    setReceiptFile(null);
  }, [expense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item.trim() || !formData.amount || !formData.vendor.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {expense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {expense ? "Update expense details" : "Record a new business expense"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Item Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Expense Item <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Receipt size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                placeholder="e.g., Office Supplies, Travel, Software"
                required
                className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this expense..."
              rows={2}
              className="rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Date <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
          </div>

          {/* Vendor & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Vendor <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Company or vendor name"
                  required
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <cat.icon size={14} style={{ color: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Method & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <method.icon size={14} className="text-[#94A3B8]" />
                        {method.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(val) => setFormData({ ...formData, currency: val })}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="CAD" className="rounded-md">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="USD" className="rounded-md">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR" className="rounded-md">EUR - Euro</SelectItem>
                  <SelectItem value="GBP" className="rounded-md">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project & Client */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Project (Optional)</Label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  placeholder="Associated project"
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Client (Optional)</Label>
              <div className="relative">
                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  placeholder="Associated client"
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Tags</Label>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Add tags separated by commas"
                className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Receipt</Label>
            <div className="border-2 border-dashed border-[rgba(15,23,42,0.06)] rounded-md p-6 text-center hover:border-[#22D3EE] transition-colors cursor-pointer">
              <label className="cursor-pointer">
                <div className="w-12 h-12 mx-auto mb-3 rounded-md bg-white/5 flex items-center justify-center">
                  <Paperclip size={24} className="text-[#475569]" />
                </div>
                <p className="text-sm text-[#475569] mb-1">
                  {receiptFile ? receiptFile.name : "Click to upload receipt"}
                </p>
                <p className="text-xs text-[#475569]">PNG, JPG, PDF up to 10MB</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
              className="rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
            />
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.item || !formData.amount || !formData.vendor}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {expense ? <Check size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
                  {expense ? "Update Expense" : "Add Expense"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// EXPENSE DETAILS DIALOG
// ============================================

const ExpenseDetailsDialog = ({
  isOpen,
  onClose,
  expense,
  onEdit,
  onStatusChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onEdit: () => void;
  onStatusChange: (status: Expense["status"]) => void;
}) => {
  if (!expense) return null;

  const statusColors = getStatusColor(expense.status);
  const categoryInfo = getCategoryInfo(expense.category);
  const CategoryIcon = categoryInfo.icon;
  const paymentInfo = getPaymentMethodInfo(expense.paymentMethod);
  const PaymentIcon = paymentInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-[#0F172A]">
                Expense Details
              </DialogTitle>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium capitalize",
                statusColors.bg, statusColors.text
              )}>
                <span className={cn("w-2 h-2 rounded-full", statusColors.dot)} />
                {expense.status}
              </span>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${categoryInfo.color}15` }}
            >
              <CategoryIcon size={28} style={{ color: categoryInfo.color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#0F172A]">{expense.item}</h3>
              <p className="text-[#94A3B8]">{expense.vendor}</p>
              {expense.description && (
                <p className="text-sm text-[#475569] mt-1">{expense.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#0F172A]">
                {formatCurrency(expense.amount, expense.currency)}
              </p>
              <p className="text-sm text-[#475569]">{formatDate(expense.date)}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Category</p>
              <div className="flex items-center gap-2">
                <CategoryIcon size={16} style={{ color: categoryInfo.color }} />
                <span className="font-medium text-[#0F172A]">{categoryInfo.name}</span>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Payment Method</p>
              <div className="flex items-center gap-2">
                <PaymentIcon size={16} className="text-[#94A3B8]" />
                <span className="font-medium text-[#0F172A]">{paymentInfo.name}</span>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Submitted By</p>
              <span className="font-medium text-[#0F172A]">{expense.submittedBy}</span>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Approved By</p>
              <span className="font-medium text-[#0F172A]">
                {expense.approvedBy || "Pending"}
              </span>
            </div>
          </div>

          {/* Project & Client */}
          {(expense.project || expense.client) && (
            <div className="grid grid-cols-2 gap-4">
              {expense.project && (
                <div className="p-4 bg-[#F8FAFC] rounded-md">
                  <p className="text-xs text-[#475569] mb-1">Project</p>
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-[#0891B2]" />
                    <span className="font-medium text-[#0F172A]">{expense.project}</span>
                  </div>
                </div>
              )}
              {expense.client && (
                <div className="p-4 bg-[#F8FAFC] rounded-md">
                  <p className="text-xs text-[#475569] mb-1">Client</p>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-[#D97706]" />
                    <span className="font-medium text-[#0F172A]">{expense.client}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {expense.tags && expense.tags.length > 0 && (
            <div>
              <p className="text-xs text-[#475569] mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {expense.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#0891B2]/10 text-[#0891B2] rounded-md text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div className="p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-xs text-yellow-600 font-medium mb-1">Notes</p>
              <p className="text-sm text-yellow-800">{expense.notes}</p>
            </div>
          )}

          {/* Receipt */}
          <div className="p-4 bg-[#F8FAFC] rounded-md">
            <p className="text-xs text-[#475569] mb-2">Receipt</p>
            {expense.receiptUrl ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center border border-[rgba(15,23,42,0.06)]">
                  <ImageIcon size={20} className="text-[#475569]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0F172A]">receipt.pdf</p>
                  <p className="text-xs text-[#475569]">Uploaded on {formatDate(expense.createdAt)}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-md">
                  <Download size={14} className="mr-1" />
                  Download
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">No receipt attached</p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs text-[#475569] mb-3">Activity</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-[#0891B2]" />
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]">Expense created</p>
                  <p className="text-xs text-[#475569]">{getRelativeTime(expense.createdAt)}</p>
                </div>
              </div>
              {expense.status === "approved" && expense.approvedBy && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#0F172A]">Approved by {expense.approvedBy}</p>
                    <p className="text-xs text-[#475569]">{getRelativeTime(expense.updatedAt || expense.createdAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 border-t border-[rgba(15,23,42,0.06)]">
          {expense.status === "pending" && (
            <>
              <Button
                variant="outline"
                onClick={() => onStatusChange("rejected")}
                className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
              >
                <X size={16} className="mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => onStatusChange("approved")}
                className="bg-green-500 hover:bg-green-600 text-[#0F172A] rounded-md"
              >
                <CheckCircle2 size={16} className="mr-2" />
                Approve
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onEdit} className="rounded-md">
            <Pencil size={16} className="mr-2" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// BUDGET OVERVIEW COMPONENT
// ============================================

const BudgetOverview = () => {
  const budgetItems: BudgetItem[] = expenseCategories
    .filter((c) => c.budget)
    .map((c) => ({
      category: c.name,
      budget: c.budget!,
      spent: c.spent!,
      remaining: c.budget! - c.spent!,
      percentage: Math.round((c.spent! / c.budget!) * 100),
    }));

  const totalBudget = budgetItems.reduce((acc, b) => acc + b.budget, 0);
  const totalSpent = budgetItems.reduce((acc, b) => acc + b.spent, 0);
  const totalPercentage = Math.round((totalSpent / totalBudget) * 100);

  return (
    <div className="space-y-6">
      {/* Overall Budget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#0F172A]">Monthly Budget Overview</h3>
            <p className="text-sm text-[#94A3B8]">January 2024</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#0F172A]">{formatCurrency(totalSpent)}</p>
            <p className="text-sm text-[#94A3B8]">of {formatCurrency(totalBudget)}</p>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                totalPercentage > 90
                  ? " from-red-500 to-red-400"
                  : totalPercentage > 75
                    ? " from-yellow-500 to-yellow-400"
                    : "bg-[#F1F5F9]/80"
              )}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-[#94A3B8]">{totalPercentage}% used</span>
            <span className={cn(
              "font-medium",
              totalSpent > totalBudget ? "text-red-600" : "text-green-600"
            )}>
              {formatCurrency(totalBudget - totalSpent)} remaining
            </span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          {budgetItems.map((item, index) => {
            const category = expenseCategories.find((c) => c.name === item.category)!;
            const isOverBudget = item.spent > item.budget;

            return (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${category.color}15` }}
                >
                  <category.icon size={18} style={{ color: category.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#0F172A] truncate">
                      {item.category}
                    </span>
                    <span className="text-sm text-[#94A3B8]">
                      {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(item.percentage, 100)}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: isOverBudget ? "#EF4444" : category.color,
                      }}
                    />
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-md",
                    isOverBudget
                      ? "bg-red-50 text-red-600"
                      : item.percentage > 75
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-green-50 text-green-600"
                  )}
                >
                  {item.percentage}%
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// MAIN EXPENSES PAGE COMPONENT
// ============================================

const Expenses = () => {
  const { toast } = useToast();

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Fetch expenses from API on mount
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await getExpenses();
        if (data.length > 0) {
          const mapped = data.map((e: any) => ({
            id: e.id,
            item: e.title || e.description || "Expense",
            description: e.description || e.notes || "",
            category: e.category?.toLowerCase() || "other",
            amount: e.amount || 0,
            currency: e.currency || "CAD",
            date: e.paymentDate || e.expenseDate || e.date || new Date().toISOString(),
            vendor: e.vendor || e.merchant || "",
            paymentMethod:
              e.paymentMethod?.toLowerCase().replace(" ", "_") || "credit_card",
            status: e.status?.toLowerCase() || "pending",
            submittedBy: e.createdBy?.firstName
              ? `${e.createdBy.firstName} ${e.createdBy.lastName || ""}`
              : e.submittedBy?.user?.firstName
                ? `${e.submittedBy.user.firstName} ${e.submittedBy.user.lastName || ""}`
                : "Unknown",
            approvedBy: e.approvedBy?.firstName
              ? `${e.approvedBy.firstName} ${e.approvedBy.lastName || ""}`
              : e.approvedBy?.user?.firstName
                ? `${e.approvedBy.user.firstName} ${e.approvedBy.user.lastName || ""}`
                : undefined,
            project: e.project?.name,
            createdAt: e.createdAt || new Date().toISOString(),
          }));
          setExpenses(mapped);
        }
      } catch (error) {
        console.error("Failed to fetch expenses:", error);
        toast({
          title: "Note",
          description: "Using sample data. Login to see your expenses.",
          variant: "default",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [toast]);

  // Filtered and sorted expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Filter by tab
    if (activeTab === "pending") {
      result = result.filter((e) => e.status === "pending");
    } else if (activeTab === "approved") {
      result = result.filter((e) => e.status === "approved");
    } else if (activeTab === "rejected") {
      result = result.filter((e) => e.status === "rejected");
    } else if (activeTab === "reimbursed") {
      result = result.filter((e) => e.status === "reimbursed");
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.item.toLowerCase().includes(query) ||
          e.vendor.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.submittedBy.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((e) => e.category === selectedCategory);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((e) => e.status === selectedStatus);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [expenses, activeTab, searchQuery, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Handlers
  const mapApiExpense = (e: any): Expense => ({
    id: e.id,
    item: e.title || e.description || e.item || "Expense",
    description: e.description || e.notes || "",
    category: e.category?.toLowerCase() || "other",
    amount: e.amount || 0,
    currency: e.currency || "CAD",
    date: e.paymentDate || e.expenseDate || e.date || new Date().toISOString(),
    vendor: e.vendor || e.merchant || "",
    paymentMethod: e.paymentMethod?.toLowerCase().replace(" ", "_") || "credit_card",
    status: e.status?.toLowerCase() || "pending",
    submittedBy: e.createdBy?.firstName
      ? `${e.createdBy.firstName} ${e.createdBy.lastName || ""}`
      : e.submittedBy?.user?.firstName
        ? `${e.submittedBy.user.firstName} ${e.submittedBy.user.lastName || ""}`
        : "Unknown",
    approvedBy: e.approvedBy?.firstName
      ? `${e.approvedBy.firstName} ${e.approvedBy.lastName || ""}`
      : e.approvedBy?.user?.firstName
        ? `${e.approvedBy.user.firstName} ${e.approvedBy.user.lastName || ""}`
        : undefined,
    project: e.project?.name,
    createdAt: e.createdAt || new Date().toISOString(),
  });

  const handleAddExpense = async (data: Partial<Expense>) => {
    try {
      const apiData = {
        description: data.item || data.description || "Expense",
        notes: data.notes || data.description || "",
        category: data.category?.toUpperCase() || "OTHER",
        amount: data.amount || 0,
        currency: data.currency || "CAD",
        expenseDate: data.date || new Date().toISOString(),
        vendor: data.vendor || "",
        paymentMethod: data.paymentMethod?.toUpperCase().replace("_", " ") || "CREDIT_CARD",
      };
      const created = await createExpense(apiData);
      const newExpense = mapApiExpense(created);
      setExpenses((prev) => [newExpense, ...prev]);
      toast({
        title: "Expense Added",
        description: "Your expense has been submitted for approval.",
      });
    } catch (error: any) {
      console.error("Failed to add expense:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add expense.",
        variant: "destructive",
      });
    }
  };

  const handleEditExpense = async (data: Partial<Expense>) => {
    if (!currentExpense) return;
    try {
      const apiData = {
        description: data.item || data.description || currentExpense.item,
        notes: data.notes || data.description || "",
        category: data.category?.toUpperCase() || currentExpense.category.toUpperCase(),
        amount: data.amount || currentExpense.amount,
        vendor: data.vendor || currentExpense.vendor,
        paymentMethod: data.paymentMethod?.toUpperCase().replace("_", " ") || "CREDIT_CARD",
      };
      const updated = await updateExpense(currentExpense.id, apiData);
      const mappedExpense = mapApiExpense(updated);
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === currentExpense.id ? mappedExpense : e
        )
      );
      toast({
        title: "Expense Updated",
        description: "The expense has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Failed to update expense:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update expense.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpense(expenseToDelete.id);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseToDelete.id));
      setSelectedExpenses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(expenseToDelete.id);
        return newSet;
      });
      setIsDeleteAlertOpen(false);
      setExpenseToDelete(null);
      toast({
        title: "Expense Deleted",
        description: "The expense has been removed.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("Failed to delete expense:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete expense.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (expense: Expense, status: Expense["status"]) => {
    try {
      // Call backend for "approved" status (PATCH /expenses/:id/approve)
      if (status === "approved") {
        const updated = await approveExpense(expense.id);
        const mappedExpense = mapApiExpense(updated);
        setExpenses((prev) =>
          prev.map((e) => (e.id === expense.id ? mappedExpense : e))
        );
      } else {
        // For other statuses (rejected, reimbursed) — optimistic local update
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === expense.id
              ? { ...e, status, updatedAt: new Date().toISOString() }
              : e
          )
        );
      }
      toast({
        title: `Expense ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        description: `The expense has been ${status}.`,
      });
      setIsDetailsOpen(false);
    } catch (error: any) {
      console.error("Failed to update expense status:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update expense status.",
        variant: "destructive",
      });
    }
  };

  const handleBulkAction = async (action: "approve" | "reject" | "delete") => {
    if (selectedExpenses.size === 0) return;
    const ids = Array.from(selectedExpenses);

    try {
      if (action === "delete") {
        await Promise.all(ids.map((id) => deleteExpense(id)));
        setExpenses((prev) => prev.filter((e) => !selectedExpenses.has(e.id)));
        toast({
          title: "Expenses Deleted",
          description: `${ids.length} expense(s) have been removed.`,
          variant: "destructive",
        });
      } else if (action === "approve") {
        await Promise.all(ids.map((id) => approveExpense(id)));
        setExpenses((prev) =>
          prev.map((e) =>
            selectedExpenses.has(e.id) && e.status === "pending"
              ? { ...e, status: "approved", approvedBy: "Current User", updatedAt: new Date().toISOString() }
              : e
          )
        );
        toast({
          title: "Expenses Approved",
          description: `${ids.length} expense(s) have been approved.`,
        });
      } else {
        // Reject is local-only — no backend endpoint for reject
        setExpenses((prev) =>
          prev.map((e) =>
            selectedExpenses.has(e.id) && e.status === "pending"
              ? { ...e, status: "rejected", updatedAt: new Date().toISOString() }
              : e
          )
        );
        toast({
          title: "Expenses Rejected",
          description: `${ids.length} expense(s) have been rejected.`,
        });
      }
    } catch (error: any) {
      console.error(`Failed to ${action} expenses:`, error);
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to ${action} expenses.`,
        variant: "destructive",
      });
    }

    setSelectedExpenses(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedExpenses.size === filteredExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(filteredExpenses.map((e) => e.id)));
    }
  };

  const toggleSelectExpense = (id: string) => {
    setSelectedExpenses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Stats calculations
  const pendingCount = expenses.filter((e) => e.status === "pending").length;
  const approvedCount = expenses.filter((e) => e.status === "approved").length;
  const rejectedCount = expenses.filter((e) => e.status === "rejected").length;
  const reimbursedCount = expenses.filter((e) => e.status === "reimbursed").length;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <main className="flex-1 ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">Expenses</h1>
                <p className="text-[#94A3B8]">Track and manage business expenses</p>
              </div>

              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-md">
                        <Download size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export Expenses</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  onClick={() => {
                    setCurrentExpense(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md gap-2"
                >
                  <Plus size={18} />
                  Add Expense
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Expenses"
              value={formatCurrency(defaultExpenseStats.totalExpenses)}
              change={defaultExpenseStats.expenseChange}
              changeLabel="vs last month"
              icon={Receipt}
              color="teal"
              trend="up"
            />
            <StatCard
              title="Pending Approvals"
              value={pendingCount}
              icon={Clock}
              color="gold"
              delay={0.1}
            />
            <StatCard
              title="This Month"
              value={formatCurrency(defaultExpenseStats.thisMonthExpenses)}
              change={8.9}
              changeLabel="vs last month"
              icon={CalendarDays}
              color="blue"
              delay={0.2}
              trend="up"
            />
            <StatCard
              title="Budget Used"
              value="68%"
              icon={PieChart}
              color="purple"
              delay={0.3}
            />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-3 gap-8">
            {/* Expenses List */}
            <div className="col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
              >
                {/* Tabs & Filters */}
                <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between mb-4">
                      <TabsList className="bg-white/5 rounded-md p-1">
                        <TabsTrigger
                          value="all"
                          className="rounded-md data-[state=active]:bg-white"
                        >
                          All ({expenses.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="pending"
                          className="rounded-md data-[state=active]:bg-white"
                        >
                          Pending ({pendingCount})
                        </TabsTrigger>
                        <TabsTrigger
                          value="approved"
                          className="rounded-md data-[state=active]:bg-white"
                        >
                          Approved ({approvedCount})
                        </TabsTrigger>
                        <TabsTrigger
                          value="rejected"
                          className="rounded-md data-[state=active]:bg-white"
                        >
                          Rejected ({rejectedCount})
                        </TabsTrigger>
                      </TabsList>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={viewMode === "list" ? "secondary" : "ghost"}
                          size="icon"
                          className="rounded-md h-9 w-9"
                          onClick={() => setViewMode("list")}
                        >
                          <List size={16} />
                        </Button>
                        <Button
                          variant={viewMode === "grid" ? "secondary" : "ghost"}
                          size="icon"
                          className="rounded-md h-9 w-9"
                          onClick={() => setViewMode("grid")}
                        >
                          <LayoutGrid size={16} />
                        </Button>
                      </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                        />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search expenses..."
                          className="pl-9 h-10 rounded-md border-[rgba(15,23,42,0.06)]"
                        />
                      </div>

                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[160px] h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md">
                          <SelectItem value="all" className="rounded-md">
                            All Categories
                          </SelectItem>
                          {expenseCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-md">
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="rounded-md gap-2">
                            <Filter size={16} />
                            Sort
                            {sortOrder === "asc" ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-md">
                          <DropdownMenuItem
                            onClick={() => {
                              setSortBy("date");
                              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                            }}
                            className="rounded-md"
                          >
                            <Calendar size={14} className="mr-2" />
                            Date
                            {sortBy === "date" && (
                              <Check size={14} className="ml-auto text-[#0891B2]" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSortBy("amount");
                              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                            }}
                            className="rounded-md"
                          >
                            <DollarSign size={14} className="mr-2" />
                            Amount
                            {sortBy === "amount" && (
                              <Check size={14} className="ml-auto text-[#0891B2]" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSortBy("status");
                              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                            }}
                            className="rounded-md"
                          >
                            <Activity size={14} className="mr-2" />
                            Status
                            {sortBy === "status" && (
                              <Check size={14} className="ml-auto text-[#0891B2]" />
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Bulk Actions */}
                    {selectedExpenses.size > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 mt-4 p-3 bg-[#0891B2]/10 rounded-md"
                      >
                        <span className="text-sm font-medium text-[#0F172A]">
                          {selectedExpenses.size} selected
                        </span>
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkAction("approve")}
                          className="rounded-md text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <CheckCircle2 size={14} className="mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkAction("reject")}
                          className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X size={14} className="mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkAction("delete")}
                          className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                      </motion.div>
                    )}
                  </Tabs>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                  {viewMode === "list" ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  selectedExpenses.size === filteredExpenses.length &&
                                  filteredExpenses.length > 0
                                }
                                onCheckedChange={toggleSelectAll}
                                className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                              />
                            </TableHead>
                            <TableHead>Expense</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Submitted By</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredExpenses.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-12">
                                <div className="flex flex-col items-center">
                                  <Receipt size={48} className="text-[#475569] mb-3" />
                                  <p className="text-[#94A3B8] font-medium">No expenses found</p>
                                  <p className="text-[#475569] text-sm">
                                    Try adjusting your filters
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredExpenses.map((expense) => (
                              <ExpenseRow
                                key={expense.id}
                                expense={expense}
                                isSelected={selectedExpenses.has(expense.id)}
                                onSelect={() => toggleSelectExpense(expense.id)}
                                onView={() => {
                                  setCurrentExpense(expense);
                                  setIsDetailsOpen(true);
                                }}
                                onEdit={() => {
                                  setCurrentExpense(expense);
                                  setIsFormOpen(true);
                                }}
                                onDelete={() => {
                                  setExpenseToDelete(expense);
                                  setIsDeleteAlertOpen(true);
                                }}
                                onStatusChange={(status) => handleStatusChange(expense, status)}
                              />
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="p-4 grid grid-cols-2 gap-4">
                      {filteredExpenses.length === 0 ? (
                        <div className="col-span-2 text-center py-12">
                          <Receipt size={48} className="text-[#475569] mx-auto mb-3" />
                          <p className="text-[#94A3B8] font-medium">No expenses found</p>
                          <p className="text-[#475569] text-sm">Try adjusting your filters</p>
                        </div>
                      ) : (
                        filteredExpenses.map((expense, index) => (
                          <ExpenseCard
                            key={expense.id}
                            expense={expense}
                            isSelected={selectedExpenses.has(expense.id)}
                            onSelect={() => toggleSelectExpense(expense.id)}
                            onView={() => {
                              setCurrentExpense(expense);
                              setIsDetailsOpen(true);
                            }}
                            onEdit={() => {
                              setCurrentExpense(expense);
                              setIsFormOpen(true);
                            }}
                            onDelete={() => {
                              setExpenseToDelete(expense);
                              setIsDeleteAlertOpen(true);
                            }}
                            onStatusChange={(status) => handleStatusChange(expense, status)}
                            delay={index * 0.05}
                          />
                        ))
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Sidebar - Budget Overview */}
            <div className="col-span-1">
              <BudgetOverview />
            </div>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <ExpenseFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCurrentExpense(null);
        }}
        expense={currentExpense}
        onSubmit={currentExpense ? handleEditExpense : handleAddExpense}
      />

      <ExpenseDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setCurrentExpense(null);
        }}
        expense={currentExpense}
        onEdit={() => {
          setIsDetailsOpen(false);
          setIsFormOpen(true);
        }}
        onStatusChange={(status) => {
          if (currentExpense) {
            handleStatusChange(currentExpense, status);
          }
        }}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              className="bg-red-500 hover:bg-red-600 rounded-md"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Expenses;
