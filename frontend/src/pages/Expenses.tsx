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
import { getExpenses } from "@/features/expenses";
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
  { id: "software", name: "Software & Tools", icon: Monitor, color: "#23D3EE", budget: 3000, spent: 2100 },
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

const initialExpenses: Expense[] = [
  {
    id: "exp_001",
    item: "Flight to Toronto - Client Meeting",
    description: "Round trip flight for quarterly client review",
    category: "travel",
    amount: 850.00,
    currency: "CAD",
    date: "2024-01-20",
    vendor: "Air Canada",
    paymentMethod: "company_card",
    status: "approved",
    tags: ["client", "quarterly"],
    submittedBy: "John Smith",
    approvedBy: "Sarah Johnson",
    project: "Client Review Q1",
    client: "Acme Corp",
    createdAt: "2024-01-18T10:30:00Z",
  },
  {
    id: "exp_002",
    item: "Team Lunch - Project Celebration",
    description: "Team lunch to celebrate project completion",
    category: "meals",
    amount: 245.50,
    currency: "CAD",
    date: "2024-01-19",
    vendor: "The Keg Steakhouse",
    paymentMethod: "credit_card",
    status: "pending",
    tags: ["team", "celebration"],
    submittedBy: "Emily Davis",
    project: "Website Redesign",
    createdAt: "2024-01-19T14:00:00Z",
  },
  {
    id: "exp_003",
    item: "Adobe Creative Cloud - Annual",
    description: "Annual subscription for design team",
    category: "software",
    amount: 599.88,
    currency: "CAD",
    date: "2024-01-15",
    vendor: "Adobe Inc.",
    paymentMethod: "company_card",
    status: "approved",
    tags: ["subscription", "design"],
    submittedBy: "Sarah Johnson",
    approvedBy: "John Smith",
    createdAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "exp_004",
    item: "Office Supplies - Stationery",
    description: "Notebooks, pens, and general office supplies",
    category: "office",
    amount: 125.75,
    currency: "CAD",
    date: "2024-01-18",
    vendor: "Staples",
    paymentMethod: "debit_card",
    status: "reimbursed",
    submittedBy: "Mike Chen",
    approvedBy: "Emily Davis",
    createdAt: "2024-01-18T11:30:00Z",
  },
  {
    id: "exp_005",
    item: "Uber Rides - Client Visits",
    description: "Transportation for multiple client site visits",
    category: "travel",
    amount: 156.80,
    currency: "CAD",
    date: "2024-01-17",
    vendor: "Uber",
    paymentMethod: "credit_card",
    status: "approved",
    tags: ["client"],
    submittedBy: "David Wilson",
    approvedBy: "John Smith",
    client: "TechStart Inc.",
    createdAt: "2024-01-17T16:45:00Z",
  },
  {
    id: "exp_006",
    item: "AWS Monthly - Cloud Services",
    description: "Monthly cloud infrastructure costs",
    category: "software",
    amount: 1250.00,
    currency: "CAD",
    date: "2024-01-01",
    vendor: "Amazon Web Services",
    paymentMethod: "company_card",
    status: "approved",
    tags: ["recurring", "infrastructure"],
    submittedBy: "System",
    approvedBy: "John Smith",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "exp_007",
    item: "Marketing Campaign - Social Ads",
    description: "Q1 social media advertising spend",
    category: "marketing",
    amount: 2500.00,
    currency: "CAD",
    date: "2024-01-10",
    vendor: "Meta Platforms",
    paymentMethod: "company_card",
    status: "approved",
    tags: ["advertising", "q1"],
    submittedBy: "Lisa Brown",
    approvedBy: "Sarah Johnson",
    project: "Q1 Marketing",
    createdAt: "2024-01-10T10:00:00Z",
  },
  {
    id: "exp_008",
    item: "Conference Registration",
    description: "TechConf 2024 - 2 attendees",
    category: "travel",
    amount: 1200.00,
    currency: "CAD",
    date: "2024-01-12",
    vendor: "TechConf Events",
    paymentMethod: "credit_card",
    status: "pending",
    tags: ["conference", "training"],
    submittedBy: "Amanda Lee",
    createdAt: "2024-01-12T15:30:00Z",
  },
  {
    id: "exp_009",
    item: "Internet - Office",
    description: "Monthly internet service",
    category: "utilities",
    amount: 150.00,
    currency: "CAD",
    date: "2024-01-05",
    vendor: "Bell Canada",
    paymentMethod: "bank_transfer",
    status: "approved",
    tags: ["recurring"],
    submittedBy: "System",
    approvedBy: "John Smith",
    createdAt: "2024-01-05T00:00:00Z",
  },
  {
    id: "exp_010",
    item: "Client Dinner",
    description: "Business dinner with potential client",
    category: "meals",
    amount: 385.00,
    currency: "CAD",
    date: "2024-01-16",
    vendor: "Canoe Restaurant",
    paymentMethod: "credit_card",
    status: "rejected",
    notes: "Missing receipt - please resubmit",
    submittedBy: "Robert Brown",
    client: "NewClient Ltd.",
    createdAt: "2024-01-16T20:00:00Z",
  },
];

const expenseStats: ExpenseStats = {
  totalExpenses: 24890.50,
  totalRevenue: 125840.00,
  netProfit: 100949.50,
  pendingApprovals: 3,
  thisMonthExpenses: 7463.93,
  lastMonthExpenses: 6850.00,
  expenseChange: 8.9,
  revenueChange: 12.5,
  profitChange: 15.2,
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
      return { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" };
    default:
      return { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-500" };
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
    teal: { bg: "bg-[#23D3EE]", light: "bg-[#23D3EE]/10", text: "text-[#23D3EE]" },
    gold: { bg: "bg-[#FBBF23]", light: "bg-[#FBBF23]/10", text: "text-[#FBBF23]" },
    navy: { bg: "bg-[#0F172A]", light: "bg-[#0F172A]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    blue: { bg: "bg-blue-500", light: "bg-blue-500/10", text: "text-blue-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#23D3EE]/30 hover:shadow-xl hover:shadow-[#23D3EE]/5 transition-all overflow-hidden group"
    >
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
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
              {changeLabel && <span className="text-xs text-slate-400">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colors.light)}>
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
    <TableRow className="group hover:bg-slate-50">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3 cursor-pointer" onClick={onView}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${categoryInfo.color}15` }}
          >
            <CategoryIcon size={18} style={{ color: categoryInfo.color }} />
          </div>
          <div>
            <p className="font-medium text-[#0F172A] group-hover:text-[#23D3EE] transition-colors">
              {expense.item}
            </p>
            <p className="text-sm text-slate-500">{expense.vendor}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
          style={{ backgroundColor: `${categoryInfo.color}15`, color: categoryInfo.color }}
        >
          {categoryInfo.name}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-slate-600">{formatDate(expense.date)}</span>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-[#0F172A]">
          {formatCurrency(expense.amount, expense.currency)}
        </span>
      </TableCell>
      <TableCell>
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize",
          statusColors.bg, statusColors.text
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", statusColors.dot)} />
          {expense.status}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-slate-500">{expense.submittedBy}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onView}>
                  <Eye size={16} className="text-slate-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onEdit}>
                  <Pencil size={16} className="text-slate-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <MoreVertical size={16} className="text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={onView} className="rounded-lg">
                <Eye size={14} className="mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Copy size={14} className="mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Receipt size={14} className="mr-2" /> View Receipt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {expense.status === "pending" && (
                <>
                  <DropdownMenuItem
                    onClick={() => onStatusChange("approved")}
                    className="rounded-lg text-green-600"
                  >
                    <CheckCircle2 size={14} className="mr-2" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onStatusChange("rejected")}
                    className="rounded-lg text-red-600"
                  >
                    <X size={14} className="mr-2" /> Reject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onDelete} className="rounded-lg text-red-600 focus:text-red-600">
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
        "relative bg-white rounded-2xl border overflow-hidden transition-all group cursor-pointer",
        isSelected
          ? "border-[#23D3EE] ring-2 ring-[#23D3EE]/20"
          : "border-slate-200 hover:border-[#23D3EE]/30 hover:shadow-xl hover:shadow-[#23D3EE]/5"
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
          className="data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE] bg-white"
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
              className="h-8 w-8 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white"
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem onClick={onView} className="rounded-lg">
              <Eye size={14} className="mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="rounded-lg">
              <Pencil size={14} className="mr-2" /> Edit
            </DropdownMenuItem>
            {expense.status === "pending" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onStatusChange("approved")}
                  className="rounded-lg text-green-600"
                >
                  <CheckCircle2 size={14} className="mr-2" /> Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusChange("rejected")}
                  className="rounded-lg text-red-600"
                >
                  <X size={14} className="mr-2" /> Reject
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="rounded-lg text-red-600 focus:text-red-600">
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
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${categoryInfo.color}15` }}
          >
            <CategoryIcon size={24} style={{ color: categoryInfo.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-[#23D3EE] transition-colors">
              {expense.item}
            </h3>
            <p className="text-sm text-slate-500 truncate">{expense.vendor}</p>
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
          <span className="text-xs text-slate-400">{formatDate(expense.date)}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span
            className="text-xs font-medium px-2 py-1 rounded-md"
            style={{ backgroundColor: `${categoryInfo.color}10`, color: categoryInfo.color }}
          >
            {categoryInfo.name}
          </span>
          <span className="text-xs text-slate-400">{expense.submittedBy}</span>
        </div>

        {/* Tags */}
        {expense.tags && expense.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {expense.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs"
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
      <DialogContent className="sm:max-w-[600px] p-0 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#23D3EE]/10 to-transparent sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {expense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {expense ? "Update expense details" : "Record a new business expense"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Item Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">
              Expense Item <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Receipt size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                placeholder="e.g., Office Supplies, Travel, Software"
                required
                className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this expense..."
              rows={2}
              className="rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20 resize-none"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">
                Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">
                Date <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                />
              </div>
            </div>
          </div>

          {/* Vendor & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">
                Vendor <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Company or vendor name"
                  required
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
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
              <Label className="text-sm font-medium text-slate-600">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <method.icon size={14} className="text-slate-500" />
                        {method.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(val) => setFormData({ ...formData, currency: val })}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="CAD" className="rounded-lg">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="USD" className="rounded-lg">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR" className="rounded-lg">EUR - Euro</SelectItem>
                  <SelectItem value="GBP" className="rounded-lg">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project & Client */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Project (Optional)</Label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  placeholder="Associated project"
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Client (Optional)</Label>
              <div className="relative">
                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  placeholder="Associated client"
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Tags</Label>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Add tags separated by commas"
                className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
              />
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Receipt</Label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[#23D3EE] transition-colors cursor-pointer">
              <label className="cursor-pointer">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Paperclip size={24} className="text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 mb-1">
                  {receiptFile ? receiptFile.name : "Click to upload receipt"}
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, PDF up to 10MB</p>
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
            <Label className="text-sm font-medium text-slate-600">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
              className="rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20 resize-none"
            />
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.item || !formData.amount || !formData.vendor}
              className="bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-xl"
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
      <DialogContent className="sm:max-w-[600px] p-0 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#23D3EE]/10 to-transparent">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-[#0F172A]">
                Expense Details
              </DialogTitle>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium capitalize",
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
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${categoryInfo.color}15` }}
            >
              <CategoryIcon size={28} style={{ color: categoryInfo.color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#0F172A]">{expense.item}</h3>
              <p className="text-slate-500">{expense.vendor}</p>
              {expense.description && (
                <p className="text-sm text-slate-400 mt-1">{expense.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#0F172A]">
                {formatCurrency(expense.amount, expense.currency)}
              </p>
              <p className="text-sm text-slate-400">{formatDate(expense.date)}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Category</p>
              <div className="flex items-center gap-2">
                <CategoryIcon size={16} style={{ color: categoryInfo.color }} />
                <span className="font-medium text-[#0F172A]">{categoryInfo.name}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Payment Method</p>
              <div className="flex items-center gap-2">
                <PaymentIcon size={16} className="text-slate-500" />
                <span className="font-medium text-[#0F172A]">{paymentInfo.name}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Submitted By</p>
              <span className="font-medium text-[#0F172A]">{expense.submittedBy}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Approved By</p>
              <span className="font-medium text-[#0F172A]">
                {expense.approvedBy || "Pending"}
              </span>
            </div>
          </div>

          {/* Project & Client */}
          {(expense.project || expense.client) && (
            <div className="grid grid-cols-2 gap-4">
              {expense.project && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Project</p>
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-[#23D3EE]" />
                    <span className="font-medium text-[#0F172A]">{expense.project}</span>
                  </div>
                </div>
              )}
              {expense.client && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Client</p>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-[#FBBF23]" />
                    <span className="font-medium text-[#0F172A]">{expense.client}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {expense.tags && expense.tags.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {expense.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#23D3EE]/10 text-[#23D3EE] rounded-lg text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
              <p className="text-xs text-yellow-600 font-medium mb-1">Notes</p>
              <p className="text-sm text-yellow-800">{expense.notes}</p>
            </div>
          )}

          {/* Receipt */}
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 mb-2">Receipt</p>
            {expense.receiptUrl ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                  <ImageIcon size={20} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0F172A]">receipt.pdf</p>
                  <p className="text-xs text-slate-400">Uploaded on {formatDate(expense.createdAt)}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Download size={14} className="mr-1" />
                  Download
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No receipt attached</p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs text-slate-400 mb-3">Activity</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#23D3EE]/10 flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-[#23D3EE]" />
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]">Expense created</p>
                  <p className="text-xs text-slate-400">{getRelativeTime(expense.createdAt)}</p>
                </div>
              </div>
              {expense.status === "approved" && expense.approvedBy && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#0F172A]">Approved by {expense.approvedBy}</p>
                    <p className="text-xs text-slate-400">{getRelativeTime(expense.updatedAt || expense.createdAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 border-t border-slate-100">
          {expense.status === "pending" && (
            <>
              <Button
                variant="outline"
                onClick={() => onStatusChange("rejected")}
                className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
              >
                <X size={16} className="mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => onStatusChange("approved")}
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl"
              >
                <CheckCircle2 size={16} className="mr-2" />
                Approve
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onEdit} className="rounded-xl">
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
        className="bg-white rounded-2xl border border-slate-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#0F172A]">Monthly Budget Overview</h3>
            <p className="text-sm text-slate-500">January 2024</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#0F172A]">{formatCurrency(totalSpent)}</p>
            <p className="text-sm text-slate-500">of {formatCurrency(totalBudget)}</p>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                totalPercentage > 90
                  ? "bg-gradient-to-r from-red-500 to-red-400"
                  : totalPercentage > 75
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                    : "bg-gradient-to-r from-[#23D3EE] to-[#23D3EE]/80"
              )}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-slate-500">{totalPercentage}% used</span>
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
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${category.color}15` }}
                >
                  <category.icon size={18} style={{ color: category.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#0F172A] truncate">
                      {item.category}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
                    "text-xs font-medium px-2 py-1 rounded-lg",
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
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
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
            item: e.description || e.item || "Expense",
            description: e.notes || e.description || "",
            category: e.category?.toLowerCase() || "other",
            amount: e.amount || 0,
            currency: e.currency || "CAD",
            date: e.expenseDate || e.date || new Date().toISOString(),
            vendor: e.vendor || e.merchant || "",
            paymentMethod:
              e.paymentMethod?.toLowerCase().replace(" ", "_") || "credit_card",
            status: e.status?.toLowerCase() || "pending",
            submittedBy: e.submittedBy?.user?.firstName
              ? `${e.submittedBy.user.firstName} ${e.submittedBy.user.lastName || ""}`
              : "Unknown",
            approvedBy: e.approvedBy?.user?.firstName
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
  const handleAddExpense = async (data: Partial<Expense>) => {
    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      item: data.item!,
      description: data.description,
      category: data.category!,
      amount: data.amount!,
      currency: data.currency || "CAD",
      date: data.date!,
      vendor: data.vendor!,
      paymentMethod: data.paymentMethod || "credit_card",
      status: "pending",
      tags: data.tags,
      notes: data.notes,
      submittedBy: "Current User",
      project: data.project,
      client: data.client,
      createdAt: new Date().toISOString(),
    };

    setExpenses((prev) => [newExpense, ...prev]);
    toast({
      title: "Expense Added",
      description: "Your expense has been submitted for approval.",
    });
  };

  const handleEditExpense = async (data: Partial<Expense>) => {
    if (!currentExpense) return;

    setExpenses((prev) =>
      prev.map((e) =>
        e.id === currentExpense.id
          ? { ...e, ...data, updatedAt: new Date().toISOString() }
          : e
      )
    );
    toast({
      title: "Expense Updated",
      description: "The expense has been updated successfully.",
    });
  };

  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;

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
  };

  const handleStatusChange = (expense: Expense, status: Expense["status"]) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expense.id
          ? {
            ...e,
            status,
            approvedBy: status === "approved" ? "Current User" : e.approvedBy,
            updatedAt: new Date().toISOString(),
          }
          : e
      )
    );
    toast({
      title: `Expense ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      description: `The expense has been ${status}.`,
    });
    setIsDetailsOpen(false);
  };

  const handleBulkAction = (action: "approve" | "reject" | "delete") => {
    if (selectedExpenses.size === 0) return;

    if (action === "delete") {
      setExpenses((prev) => prev.filter((e) => !selectedExpenses.has(e.id)));
      toast({
        title: "Expenses Deleted",
        description: `${selectedExpenses.size} expense(s) have been removed.`,
        variant: "destructive",
      });
    } else {
      const status = action === "approve" ? "approved" : "rejected";
      setExpenses((prev) =>
        prev.map((e) =>
          selectedExpenses.has(e.id) && e.status === "pending"
            ? {
              ...e,
              status,
              approvedBy: action === "approve" ? "Current User" : undefined,
              updatedAt: new Date().toISOString(),
            }
            : e
        )
      );
      toast({
        title: `Expenses ${action === "approve" ? "Approved" : "Rejected"}`,
        description: `${selectedExpenses.size} expense(s) have been ${status}.`,
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
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">Expenses</h1>
                <p className="text-slate-500">Track and manage business expenses</p>
              </div>

              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-xl">
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
                  className="bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-xl gap-2"
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
              value={formatCurrency(expenseStats.totalExpenses)}
              change={expenseStats.expenseChange}
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
              value={formatCurrency(expenseStats.thisMonthExpenses)}
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
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                {/* Tabs & Filters */}
                <div className="p-4 border-b border-slate-100">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between mb-4">
                      <TabsList className="bg-slate-100 rounded-xl p-1">
                        <TabsTrigger
                          value="all"
                          className="rounded-lg data-[state=active]:bg-white"
                        >
                          All ({expenses.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="pending"
                          className="rounded-lg data-[state=active]:bg-white"
                        >
                          Pending ({pendingCount})
                        </TabsTrigger>
                        <TabsTrigger
                          value="approved"
                          className="rounded-lg data-[state=active]:bg-white"
                        >
                          Approved ({approvedCount})
                        </TabsTrigger>
                        <TabsTrigger
                          value="rejected"
                          className="rounded-lg data-[state=active]:bg-white"
                        >
                          Rejected ({rejectedCount})
                        </TabsTrigger>
                      </TabsList>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={viewMode === "list" ? "secondary" : "ghost"}
                          size="icon"
                          className="rounded-lg h-9 w-9"
                          onClick={() => setViewMode("list")}
                        >
                          <List size={16} />
                        </Button>
                        <Button
                          variant={viewMode === "grid" ? "secondary" : "ghost"}
                          size="icon"
                          className="rounded-lg h-9 w-9"
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
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search expenses..."
                          className="pl-9 h-10 rounded-xl border-slate-200"
                        />
                      </div>

                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[160px] h-10 rounded-xl border-slate-200">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all" className="rounded-lg">
                            All Categories
                          </SelectItem>
                          {expenseCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="rounded-xl gap-2">
                            <Filter size={16} />
                            Sort
                            {sortOrder === "asc" ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => {
                              setSortBy("date");
                              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                            }}
                            className="rounded-lg"
                          >
                            <Calendar size={14} className="mr-2" />
                            Date
                            {sortBy === "date" && (
                              <Check size={14} className="ml-auto text-[#23D3EE]" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSortBy("amount");
                              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                            }}
                            className="rounded-lg"
                          >
                            <DollarSign size={14} className="mr-2" />
                            Amount
                            {sortBy === "amount" && (
                              <Check size={14} className="ml-auto text-[#23D3EE]" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSortBy("status");
                              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                            }}
                            className="rounded-lg"
                          >
                            <Activity size={14} className="mr-2" />
                            Status
                            {sortBy === "status" && (
                              <Check size={14} className="ml-auto text-[#23D3EE]" />
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
                        className="flex items-center gap-3 mt-4 p-3 bg-[#23D3EE]/10 rounded-xl"
                      >
                        <span className="text-sm font-medium text-[#0F172A]">
                          {selectedExpenses.size} selected
                        </span>
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkAction("approve")}
                          className="rounded-lg text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <CheckCircle2 size={14} className="mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkAction("reject")}
                          className="rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X size={14} className="mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBulkAction("delete")}
                          className="rounded-lg text-red-600 border-red-200 hover:bg-red-50"
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
                                className="data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
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
                                  <Receipt size={48} className="text-slate-300 mb-3" />
                                  <p className="text-slate-500 font-medium">No expenses found</p>
                                  <p className="text-slate-400 text-sm">
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
                          <Receipt size={48} className="text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No expenses found</p>
                          <p className="text-slate-400 text-sm">Try adjusting your filters</p>
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
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
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
