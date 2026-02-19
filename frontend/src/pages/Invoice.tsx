// src/pages/InvoicePage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
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
import { useToast } from "@/components/ui/use-toast";
import { getInvoices } from "@/services/invoiceService";
import {
  Bell,
  Plus,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Search,
  User,
  Users,
  Building2,
  MoreHorizontal,
  MoreVertical,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Upload,
  RefreshCw,
  X,
  Sparkles,
  ArrowUpDown,
  Copy,
  ExternalLink,
  Calendar,
  Star,
  StarOff,
  Clock,
  FileSpreadsheet,
  FileText,
  Columns,
  CalendarDays,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
  Send,
  Mail,
  Printer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock3,
  Receipt,
  CreditCard,
  Wallet,
  BanknoteIcon,
  PiggyBank,
  CircleDot,
  BadgeCheck,
  FileDown,
  FilePlus,
  History,
  AlertTriangle,
  IndianRupee,
  Hash,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId?: number;
  clientName: string;
  clientEmail?: string;
  invoiceDate: string;
  dueDate?: string;
  status: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  amountPaid?: number;
  notes?: string;
  items?: InvoiceItem[];
  createdAt?: string;
  lastSent?: string;
  paymentMethod?: string;
  currency?: string;
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface AppUser {
  firstName: string;
  lastName: string;
}

// ============================================
// CONSTANTS
// ============================================

const statusOptions = [
  { value: "all", label: "All Status", icon: CircleDot },
  { value: "draft", label: "Draft", icon: FileText, color: "slate" },
  { value: "sent", label: "Sent", icon: Send, color: "blue" },
  { value: "viewed", label: "Viewed", icon: Eye, color: "purple" },
  { value: "paid", label: "Paid", icon: CheckCircle2, color: "green" },
  { value: "partial", label: "Partially Paid", icon: Clock3, color: "amber" },
  { value: "overdue", label: "Overdue", icon: AlertTriangle, color: "red" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "slate" },
];

const dateFilterOptions = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatCurrency = (amount?: number, currency = "INR") => {
  if (amount === undefined || amount === null) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return formatDate(dateString);
};

const getDaysUntilDue = (dueDate?: string) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffInDays = Math.floor(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffInDays;
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { bg: string; text: string; dot: string; icon: LucideIcon }> = {
    draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", icon: FileText },
    sent: { bg: "bg-blue-100", text: "text-blue-600", dot: "bg-blue-500", icon: Send },
    viewed: { bg: "bg-purple-100", text: "text-purple-600", dot: "bg-purple-500", icon: Eye },
    paid: { bg: "bg-green-100", text: "text-green-600", dot: "bg-green-500", icon: CheckCircle2 },
    partial: { bg: "bg-amber-100", text: "text-amber-600", dot: "bg-amber-500", icon: Clock3 },
    overdue: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500", icon: AlertTriangle },
    cancelled: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400", icon: XCircle },
  };
  return configs[status?.toLowerCase()] || configs.draft;
};

const isOverdue = (dueDate?: string, status?: string) => {
  if (!dueDate || status?.toLowerCase() === "paid" || status?.toLowerCase() === "cancelled") {
    return false;
  }
  return new Date(dueDate) < new Date();
};

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  color: "teal" | "gold" | "navy" | "purple" | "green" | "red" | "blue";
  trend?: { value: number; positive: boolean };
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#23D3EE]", light: "bg-[#23D3EE]/10", text: "text-[#23D3EE]" },
    gold: { bg: "bg-[#FBBF23]", light: "bg-[#FBBF23]/10", text: "text-[#FBBF23]" },
    navy: { bg: "bg-[#0F172A]", light: "bg-[#0F172A]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
    blue: { bg: "bg-blue-500", light: "bg-blue-500/10", text: "text-blue-500" },
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
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
            {trend && (
              <span className={cn(
                "flex items-center text-xs font-semibold",
                trend.positive ? "text-green-600" : "text-red-600"
              )}>
                {trend.positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {trend.value}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.light)}>
          <Icon size={18} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// INVOICE ROW COMPONENT
// ============================================

const InvoiceRow = ({
  invoice,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onSend,
  onDownload,
  onDuplicate,
  onRecordPayment,
}: {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onRecordPayment: () => void;
}) => {
  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;
  const overdue = isOverdue(invoice.dueDate, invoice.status);
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);
  const amountDue = (invoice.total || 0) - (invoice.amountPaid || 0);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "group hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100 last:border-0",
        isSelected && "bg-[#23D3EE]/5"
      )}
      onClick={onView}
    >
      {/* Checkbox */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
        />
      </td>

      {/* Invoice Number */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            overdue ? "bg-red-100" : "bg-[#23D3EE]/10"
          )}>
            <Receipt size={18} className={overdue ? "text-red-600" : "text-[#23D3EE]"} />
          </div>
          <div>
            <p className="font-semibold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors">
              {invoice.invoiceNumber}
            </p>
            <p className="text-xs text-slate-400">{formatDate(invoice.invoiceDate)}</p>
          </div>
        </div>
      </td>

      {/* Client */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F172A] to-[#23D3EE] flex items-center justify-center text-white text-xs font-semibold">
            {getInitials(invoice.clientName)}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">{invoice.clientName}</p>
            {invoice.clientEmail && (
              <p className="text-xs text-slate-400">{invoice.clientEmail}</p>
            )}
          </div>
        </div>
      </td>

      {/* Due Date */}
      <td className="py-4 px-4">
        <div className={cn(
          "flex items-center gap-2",
          overdue ? "text-red-600" : "text-slate-600"
        )}>
          <CalendarDays size={14} className={overdue ? "text-red-400" : "text-slate-400"} />
          <div>
            <p className="text-sm">{invoice.dueDate ? formatDate(invoice.dueDate) : "-"}</p>
            {daysUntilDue !== null && invoice.status !== "Paid" && (
              <p className={cn(
                "text-xs",
                overdue ? "text-red-500 font-semibold" : "text-slate-400"
              )}>
                {overdue
                  ? `${Math.abs(daysUntilDue)} days overdue`
                  : daysUntilDue === 0
                  ? "Due today"
                  : `Due in ${daysUntilDue} days`}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
          overdue && invoice.status !== "Paid" ? "bg-red-100 text-red-600" : statusConfig.bg,
          overdue && invoice.status !== "Paid" ? "" : statusConfig.text
        )}>
          {overdue && invoice.status !== "Paid" ? (
            <AlertTriangle size={12} />
          ) : (
            <StatusIcon size={12} />
          )}
          {overdue && invoice.status !== "Paid" ? "Overdue" : invoice.status}
        </span>
      </td>

      {/* Amount */}
      <td className="py-4 px-4 text-right">
        <div>
          <p className="font-bold text-[#0F172A]">{formatCurrency(invoice.total)}</p>
          {invoice.amountPaid && invoice.amountPaid > 0 && invoice.amountPaid < invoice.total && (
            <p className="text-xs text-amber-600">
              Due: {formatCurrency(amountDue)}
            </p>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {invoice.status === "Draft" && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onSend}
              className="p-2 rounded-lg hover:bg-[#23D3EE]/10 text-[#23D3EE] transition-colors"
              title="Send Invoice"
            >
              <Send size={16} />
            </motion.button>
          )}
          {(invoice.status === "Sent" || invoice.status === "Partial" || invoice.status === "Overdue") && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onRecordPayment}
              className="p-2 rounded-lg hover:bg-green-100 text-green-600 transition-colors"
              title="Record Payment"
            >
              <CreditCard size={16} />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDownload}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            title="Download PDF"
          >
            <FileDown size={16} />
          </motion.button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={onView} className="rounded-lg">
                <Eye size={14} className="mr-2" />
                View Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                <Pencil size={14} className="mr-2" />
                Edit Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} className="rounded-lg">
                <Copy size={14} className="mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSend} className="rounded-lg">
                <Send size={14} className="mr-2" />
                Send Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload} className="rounded-lg">
                <FileDown size={14} className="mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Printer size={14} className="mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg">
                <History size={14} className="mr-2" />
                View History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  );
};

// ============================================
// INVOICE CARD COMPONENT (Grid View)
// ============================================

const InvoiceCard = ({
  invoice,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onSend,
  onDownload,
}: {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
  onDownload: () => void;
}) => {
  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;
  const overdue = isOverdue(invoice.dueDate, invoice.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer group",
        "hover:border-[#23D3EE]/30 hover:shadow-xl hover:shadow-[#23D3EE]/5 transition-all",
        isSelected && "border-[#23D3EE] bg-[#23D3EE]/5",
        overdue && "border-red-200"
      )}
      onClick={onView}
    >
      {/* Status Bar */}
      <div className={cn(
        "h-1",
        overdue ? "bg-red-500" : statusConfig.dot.replace("bg-", "bg-")
      )} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
            />
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center",
              overdue ? "bg-red-100" : "bg-gradient-to-br from-[#23D3EE]/20 to-[#FBBF23]/20"
            )}>
              <Receipt size={20} className={overdue ? "text-red-600" : "text-[#23D3EE]"} />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={onView} className="rounded-lg">
                <Eye size={14} className="mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                <Pencil size={14} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSend} className="rounded-lg">
                <Send size={14} className="mr-2" />
                Send
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload} className="rounded-lg">
                <FileDown size={14} className="mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg text-red-600"
                onClick={onDelete}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Invoice Info */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors">
              {invoice.invoiceNumber}
            </h3>
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              overdue && invoice.status !== "Paid" ? "bg-red-100 text-red-600" : statusConfig.bg,
              overdue && invoice.status !== "Paid" ? "" : statusConfig.text
            )}>
              {overdue && invoice.status !== "Paid" ? (
                <AlertTriangle size={10} />
              ) : (
                <StatusIcon size={10} />
              )}
              {overdue && invoice.status !== "Paid" ? "Overdue" : invoice.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">{formatDate(invoice.invoiceDate)}</p>
        </div>

        {/* Client */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-semibold">
            {getInitials(invoice.clientName)}
          </div>
          <span className="text-sm text-slate-600">{invoice.clientName}</span>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400">Total Amount</p>
            <p className="text-lg font-bold text-[#0F172A]">{formatCurrency(invoice.total)}</p>
          </div>
          {invoice.dueDate && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Due Date</p>
              <p className={cn(
                "text-sm font-medium",
                overdue ? "text-red-600" : "text-slate-600"
              )}>
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div
          className="flex gap-2 mt-4 pt-4 border-t border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            onClick={onSend}
            className="flex-1 bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-xl h-9"
          >
            <Send size={14} className="mr-1.5" />
            Send
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDownload}
            className="flex-1 rounded-xl h-9 border-slate-200"
          >
            <FileDown size={14} className="mr-1.5" />
            PDF
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// RECORD PAYMENT DIALOG
// ============================================

const RecordPaymentDialog = ({
  isOpen,
  onClose,
  invoice,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSubmit: (invoiceId: number, amount: number, method: string, notes: string) => void;
}) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountDue = invoice ? (invoice.total - (invoice.amountPaid || 0)) : 0;

  useEffect(() => {
    if (invoice) {
      setAmount(String(amountDue));
    }
  }, [invoice, amountDue]);

  const handleSubmit = async () => {
    if (!invoice) return;
    setIsSubmitting(true);
    await onSubmit(invoice.id, parseFloat(amount), method, notes);
    setIsSubmitting(false);
    onClose();
    setAmount("");
    setMethod("bank_transfer");
    setNotes("");
  };

  const paymentMethods = [
    { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
    { value: "cash", label: "Cash", icon: BanknoteIcon },
    { value: "card", label: "Credit/Debit Card", icon: CreditCard },
    { value: "upi", label: "UPI", icon: Wallet },
    { value: "cheque", label: "Cheque", icon: FileText },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-green-500/10 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              Record Payment
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Record a payment for invoice {invoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Invoice Summary */}
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Invoice Total</span>
              <span className="font-semibold text-[#0F172A]">
                {formatCurrency(invoice?.total)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Already Paid</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(invoice?.amountPaid || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-sm font-medium text-slate-700">Amount Due</span>
              <span className="font-bold text-[#23D3EE]">
                {formatCurrency(amountDue)}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20 text-lg font-semibold"
              />
            </div>
            <button
              onClick={() => setAmount(String(amountDue))}
              className="text-xs text-[#23D3EE] hover:underline"
            >
              Pay full amount ({formatCurrency(amountDue)})
            </button>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((pm) => (
                <motion.button
                  key={pm.value}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMethod(pm.value)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                    method === pm.value
                      ? "border-[#23D3EE] bg-[#23D3EE]/5"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <pm.icon size={16} className={method === pm.value ? "text-[#23D3EE]" : "text-slate-400"} />
                  <span className={cn(
                    "text-sm font-medium",
                    method === pm.value ? "text-[#23D3EE]" : "text-slate-600"
                  )}>
                    {pm.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Notes (optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Transaction ID, reference number, etc."
              className="h-11 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
            />
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <CheckCircle2 size={16} className="mr-2" />
            )}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// SEND INVOICE DIALOG
// ============================================

const SendInvoiceDialog = ({
  isOpen,
  onClose,
  invoice,
  onSend,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSend: (invoiceId: number, email: string, message: string) => void;
}) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (invoice?.clientEmail) {
      setEmail(invoice.clientEmail);
    }
  }, [invoice]);

  const handleSend = async () => {
    if (!invoice) return;
    setIsSending(true);
    await onSend(invoice.id, email, message);
    setIsSending(false);
    onClose();
    setEmail("");
    setMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#23D3EE]/10 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              Send Invoice
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Send invoice {invoice?.invoiceNumber} to the client
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Invoice Preview */}
          <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#23D3EE]/10 flex items-center justify-center">
              <Receipt size={24} className="text-[#23D3EE]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#0F172A]">{invoice?.invoiceNumber}</p>
              <p className="text-sm text-slate-500">{invoice?.clientName}</p>
            </div>
            <p className="text-lg font-bold text-[#23D3EE]">{formatCurrency(invoice?.total)}</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
              />
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Personal Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note to include in the email..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20 resize-none text-sm"
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
            <AlertCircle size={18} className="text-blue-500 mt-0.5" />
            <p className="text-xs text-blue-700">
              A PDF copy of the invoice will be attached to the email automatically.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !email}
            className="bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-xl shadow-lg shadow-[#23D3EE]/25"
          >
            {isSending ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Send size={16} className="mr-2" />
            )}
            Send Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4"
  >
    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#23D3EE]/10 to-[#FBBF23]/10 flex items-center justify-center mb-6">
      <Receipt size={40} className="text-[#23D3EE]" />
    </div>
    <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No invoices found</h3>
    <p className="text-slate-500 text-center max-w-sm mb-6">
      Create your first invoice to start tracking payments and revenue.
    </p>
    <Button
      onClick={onAdd}
      className="bg-gradient-to-r from-[#23D3EE] to-[#23D3EE]/90 hover:from-[#23D3EE]/90 hover:to-[#23D3EE] text-white rounded-xl shadow-lg shadow-[#23D3EE]/25"
    >
      <Plus size={18} className="mr-2" />
      Create Your First Invoice
    </Button>
  </motion.div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const InvoicePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [user, setUser] = useState<AppUser | null>(null);

  // Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, []);

  // ============================================
  // API CALLS
  // ============================================

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await getInvoices();
      // Enhance invoices with additional mock data
      const enhanced = (data || []).map((inv: any) => ({
        ...inv,
        dueDate: inv.dueDate || new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        amountPaid: inv.status === "Paid" ? inv.total : (inv.status === "Partial" ? inv.total * 0.5 : 0),
        clientEmail: inv.clientEmail || `${inv.clientName?.toLowerCase().replace(/\s/g, "")}@example.com`,
      }));
      setInvoices(enhanced);
    } catch (err) {
      console.error("Failed to load invoices:", err);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      // API call here
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceToDelete.id));
      toast({
        title: "Deleted",
        description: `Invoice ${invoiceToDelete.invoiceNumber} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleRecordPayment = async (invoiceId: number, amount: number, method: string, notes: string) => {
    try {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === invoiceId) {
            const newAmountPaid = (inv.amountPaid || 0) + amount;
            const newStatus = newAmountPaid >= inv.total ? "Paid" : "Partial";
            return { ...inv, amountPaid: newAmountPaid, status: newStatus };
          }
          return inv;
        })
      );
      toast({
        title: "Payment Recorded",
        description: `Payment of ${formatCurrency(amount)} has been recorded.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const handleSendInvoice = async (invoiceId: number, email: string, message: string) => {
    try {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: "Sent", lastSent: new Date().toISOString() } : inv
        )
      );
      toast({
        title: "Invoice Sent",
        description: `Invoice has been sent to ${email}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invoice",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    toast({
      title: "Downloading",
      description: `Generating PDF for ${invoice.invoiceNumber}...`,
    });
    // Implement PDF generation
  };

  const handleDuplicate = (invoice: Invoice) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: Date.now(),
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      status: "Draft",
      invoiceDate: new Date().toISOString(),
      amountPaid: 0,
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    toast({
      title: "Duplicated",
      description: `Invoice duplicated as ${newInvoice.invoiceNumber}`,
    });
  };

  // ============================================
  // FILTERING & SORTING
  // ============================================

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(term) ||
          inv.clientName?.toLowerCase().includes(term) ||
          inv.clientEmail?.toLowerCase().includes(term)
      );
    }

    // Status Filter
    if (filterStatus !== "all") {
      if (filterStatus === "overdue") {
        result = result.filter((inv) => isOverdue(inv.dueDate, inv.status));
      } else {
        result = result.filter(
          (inv) => inv.status?.toLowerCase() === filterStatus
        );
      }
    }

    // Date Filter
    if (filterDate !== "all") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      result = result.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        switch (filterDate) {
          case "today":
            return invDate >= startOfDay;
          case "week":
            return invDate >= startOfWeek;
          case "month":
            return invDate >= startOfMonth;
          case "quarter":
            return invDate >= startOfQuarter;
          case "year":
            return invDate >= startOfYear;
          default:
            return true;
        }
      });
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

    return result;
  }, [invoices, searchTerm, filterStatus, filterDate]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Stats
  const stats = useMemo(() => {
    const total = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
    const paid = invoices
      .filter((inv) => inv.status === "Paid")
      .reduce((acc, inv) => acc + (inv.total || 0), 0);
    const pending = invoices
      .filter((inv) => inv.status !== "Paid" && inv.status !== "Cancelled")
      .reduce((acc, inv) => acc + (inv.total || 0) - (inv.amountPaid || 0), 0);
    const overdue = invoices
      .filter((inv) => isOverdue(inv.dueDate, inv.status))
      .reduce((acc, inv) => acc + (inv.total || 0) - (inv.amountPaid || 0), 0);
    const overdueCount = invoices.filter((inv) => isOverdue(inv.dueDate, inv.status)).length;

    return { total, paid, pending, overdue, overdueCount, count: invoices.length };
  }, [invoices]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(paginatedInvoices.map((inv) => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedInvoices((prev) => [...prev, id]);
    } else {
      setSelectedInvoices((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;
    try {
      setInvoices((prev) => prev.filter((inv) => !selectedInvoices.includes(inv.id)));
      toast({
        title: "Deleted",
        description: `${selectedInvoices.length} invoices have been deleted.`,
      });
      setSelectedInvoices([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoices",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const data = filteredInvoices.map((inv) => ({
      "Invoice #": inv.invoiceNumber,
      Client: inv.clientName,
      Date: formatDate(inv.invoiceDate),
      "Due Date": inv.dueDate ? formatDate(inv.dueDate) : "-",
      Status: inv.status,
      Total: inv.total,
      Paid: inv.amountPaid || 0,
      Due: (inv.total || 0) - (inv.amountPaid || 0),
    }));

    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.csv";
    a.click();

    toast({
      title: "Exported",
      description: "Invoices exported to CSV successfully.",
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-30"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Dashboard</span>
              <ChevronRight size={16} className="text-slate-300" />
              <span className="font-medium text-[#0F172A]">Invoices</span>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <Bell size={20} />
                {stats.overdueCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    {stats.overdueCount}
                  </span>
                )}
              </motion.button>

              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center text-white font-semibold text-sm">
                  {user ? getInitials(`${user.firstName} ${user.lastName}`) : "?"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* CONTENT */}
        {/* ============================================ */}
        <div className="p-6 space-y-6">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center shadow-lg shadow-[#23D3EE]/25">
                <Receipt size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">Invoices</h1>
                <p className="text-slate-500">Manage billing and payments</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadInvoices}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <RefreshCw size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <Download size={18} />
                <span className="font-medium">Export</span>
              </motion.button>

              <Button
                onClick={() => navigate("/invoice/create")}
                className="bg-gradient-to-r from-[#23D3EE] to-[#23D3EE]/90 hover:from-[#23D3EE]/90 hover:to-[#23D3EE] text-white rounded-xl shadow-lg shadow-[#23D3EE]/25 px-5"
              >
                <Plus size={18} className="mr-2" />
                New Invoice
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <StatCard
              title="Total Invoiced"
              value={formatCurrency(stats.total)}
              subtitle={`${stats.count} invoices`}
              icon={Receipt}
              color="teal"
              delay={0}
            />
            <StatCard
              title="Paid"
              value={formatCurrency(stats.paid)}
              subtitle="Received payments"
              icon={CheckCircle2}
              color="green"
              trend={{ value: 12, positive: true }}
              delay={0.1}
            />
            <StatCard
              title="Pending"
              value={formatCurrency(stats.pending)}
              subtitle="Awaiting payment"
              icon={Clock3}
              color="gold"
              delay={0.2}
            />
            <StatCard
              title="Overdue"
              value={formatCurrency(stats.overdue)}
              subtitle={`${stats.overdueCount} invoices overdue`}
              icon={AlertTriangle}
              color="red"
              delay={0.3}
            />
                        <StatCard
              title="Collection Rate"
              value={`${stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}%`}
              subtitle="Payment success rate"
              icon={TrendingUp}
              color="purple"
              trend={{ value: 5, positive: true }}
              delay={0.4}
            />
          </div>

          <div className="grid grid-cols-4 gap-6">
            {/* Main Content - 3 columns */}
            <div className="col-span-3 space-y-4">
              {/* Filters & Actions Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left Side - Search & Filters */}
                  <div className="flex items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="relative max-w-sm flex-1">
                      <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search invoices..."
                        className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Status Filter */}
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-11 w-[150px] rounded-xl border-slate-200">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {statusOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="rounded-lg"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Date Filter */}
                    <Select value={filterDate} onValueChange={setFilterDate}>
                      <SelectTrigger className="h-11 w-[140px] rounded-xl border-slate-200">
                        <SelectValue placeholder="Period" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {dateFilterOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="rounded-lg"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    {(filterStatus !== "all" || filterDate !== "all" || searchTerm) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => {
                          setSearchTerm("");
                          setFilterStatus("all");
                          setFilterDate("all");
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-[#23D3EE] hover:bg-[#23D3EE]/5 transition-colors"
                      >
                        <X size={14} />
                        Clear
                      </motion.button>
                    )}
                  </div>

                  {/* Right Side - View & Bulk Actions */}
                  <div className="flex items-center gap-2">
                    {/* Bulk Actions */}
                    <AnimatePresence>
                      {selectedInvoices.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-2 pr-3 mr-3 border-r border-slate-200"
                        >
                          <span className="text-sm text-slate-500">
                            {selectedInvoices.length} selected
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-lg border-slate-200"
                          >
                            <Send size={14} className="mr-1" />
                            Send
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleBulkDelete}
                            className="h-9 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-1" />
                            Delete
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* View Toggle */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                      <button
                        onClick={() => setViewMode("table")}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          viewMode === "table"
                            ? "bg-white text-[#23D3EE] shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <List size={18} />
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          viewMode === "grid"
                            ? "bg-white text-[#23D3EE] shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <LayoutGrid size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Invoices Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-[#23D3EE] mb-4" />
                    <p className="text-slate-500">Loading invoices...</p>
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <EmptyState onAdd={() => navigate("/invoice/create")} />
                ) : viewMode === "table" ? (
                  <>
                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="py-4 px-4 text-left">
                              <Checkbox
                                checked={
                                  selectedInvoices.length === paginatedInvoices.length &&
                                  paginatedInvoices.length > 0
                                }
                                onCheckedChange={handleSelectAll}
                                className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
                              />
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Invoice
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Client
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Due Date
                            </th>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="py-4 px-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="py-4 px-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence>
                            {paginatedInvoices.map((invoice) => (
                              <InvoiceRow
                                key={invoice.id}
                                invoice={invoice}
                                isSelected={selectedInvoices.includes(invoice.id)}
                                onSelect={(checked) => handleSelectInvoice(invoice.id, checked)}
                                onView={() => navigate(`/invoice/${invoice.id}`)}
                                onEdit={() => navigate(`/invoice/${invoice.id}/edit`)}
                                onDelete={() => {
                                  setInvoiceToDelete(invoice);
                                  setDeleteDialogOpen(true);
                                }}
                                onSend={() => {
                                  setInvoiceToSend(invoice);
                                  setSendDialogOpen(true);
                                }}
                                onDownload={() => handleDownloadPDF(invoice)}
                                onDuplicate={() => handleDuplicate(invoice)}
                                onRecordPayment={() => {
                                  setInvoiceForPayment(invoice);
                                  setPaymentDialogOpen(true);
                                }}
                              />
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>
                          Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                          {Math.min(currentPage * pageSize, filteredInvoices.length)} of{" "}
                          {filteredInvoices.length}
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(v) => {
                            setPageSize(Number(v));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[70px] rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {[10, 20, 50, 100].map((size) => (
                              <SelectItem key={size} value={String(size)} className="rounded-lg">
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>per page</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="h-9 w-9 p-0 rounded-lg"
                        >
                          <ChevronsLeft size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="h-9 w-9 p-0 rounded-lg"
                        >
                          <ChevronLeft size={16} />
                        </Button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1 mx-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={cn(
                                  "h-9 w-9 rounded-lg text-sm font-medium transition-all",
                                  currentPage === pageNum
                                    ? "bg-[#23D3EE] text-white shadow-lg shadow-[#23D3EE]/25"
                                    : "text-slate-600 hover:bg-slate-100"
                                )}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="h-9 w-9 p-0 rounded-lg"
                        >
                          <ChevronRight size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="h-9 w-9 p-0 rounded-lg"
                        >
                          <ChevronsRight size={16} />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Grid View */
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence>
                        {paginatedInvoices.map((invoice, index) => (
                          <motion.div
                            key={invoice.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <InvoiceCard
                              invoice={invoice}
                              isSelected={selectedInvoices.includes(invoice.id)}
                              onSelect={(checked) => handleSelectInvoice(invoice.id, checked)}
                              onView={() => navigate(`/invoice/${invoice.id}`)}
                              onEdit={() => navigate(`/invoice/${invoice.id}/edit`)}
                              onDelete={() => {
                                setInvoiceToDelete(invoice);
                                setDeleteDialogOpen(true);
                              }}
                              onSend={() => {
                                setInvoiceToSend(invoice);
                                setSendDialogOpen(true);
                              }}
                              onDownload={() => handleDownloadPDF(invoice)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Grid Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="rounded-xl"
                        >
                          <ChevronLeft size={16} className="mr-1" />
                          Previous
                        </Button>

                        <div className="flex items-center gap-1 mx-4">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={cn(
                                  "h-9 w-9 rounded-lg text-sm font-medium transition-all",
                                  currentPage === pageNum
                                    ? "bg-[#23D3EE] text-white shadow-lg shadow-[#23D3EE]/25"
                                    : "text-slate-600 hover:bg-slate-100"
                                )}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="rounded-xl"
                        >
                          Next
                          <ChevronRight size={16} className="ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right Sidebar - 1 column */}
            <div className="space-y-4">
              {/* Revenue Chart Mini */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0F172A]">Revenue</h3>
                  <span className="text-xs text-slate-400">This Month</span>
                </div>

                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-[#0F172A]">{formatCurrency(stats.paid)}</p>
                  <p className="text-sm text-slate-500 mt-1">Collected</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <TrendingUp size={14} className="text-green-500" />
                    <span className="text-xs font-semibold text-green-600">+12% from last month</span>
                  </div>
                </div>

                {/* Mini Bar Chart */}
                <div className="flex items-end justify-between h-20 mt-4 gap-1">
                  {[40, 65, 45, 80, 55, 90, 75].map((height, index) => (
                    <motion.div
                      key={index}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className={cn(
                        "flex-1 rounded-t-lg",
                        index === 6 ? "bg-[#23D3EE]" : "bg-[#23D3EE]/20"
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                    <span key={index} className="text-[10px] text-slate-400 flex-1 text-center">
                      {day}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Overdue Invoices Alert */}
              {stats.overdueCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-red-50 rounded-2xl border border-red-200 p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <AlertTriangle size={20} className="text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800">Overdue Invoices</h3>
                      <p className="text-sm text-red-600 mt-1">
                        {stats.overdueCount} invoice{stats.overdueCount > 1 ? "s" : ""} overdue totaling{" "}
                        <span className="font-bold">{formatCurrency(stats.overdue)}</span>
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setFilterStatus("overdue")}
                        className="mt-3 bg-red-600 hover:bg-red-700 text-white rounded-lg h-8"
                      >
                        View Overdue
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <h3 className="font-semibold text-[#0F172A] mb-4">Quick Actions</h3>

                <div className="space-y-2">
                  {[
                    { icon: FilePlus, label: "Create Invoice", color: "teal", action: () => navigate("/invoice/create") },
                    { icon: Receipt, label: "Create Quote", color: "gold", action: () => navigate("/quotes/create") },
                    { icon: CreditCard, label: "Record Payment", color: "green", action: () => {} },
                    { icon: FileSpreadsheet, label: "Generate Report", color: "purple", action: () => {} },
                    { icon: Settings, label: "Invoice Settings", color: "slate", action: () => navigate("/settings/invoice") },
                  ].map((action, index) => {
                    const colorClasses: Record<string, string> = {
                      teal: "bg-[#23D3EE]/10 text-[#23D3EE]",
                      gold: "bg-[#FBBF23]/10 text-[#FBBF23]",
                      green: "bg-green-500/10 text-green-500",
                      purple: "bg-purple-500/10 text-purple-500",
                      slate: "bg-slate-100 text-slate-600",
                    };

                    return (
                      <motion.button
                        key={index}
                        whileHover={{ x: 4 }}
                        onClick={action.action}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                      >
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colorClasses[action.color])}>
                          <action.icon size={18} />
                        </div>
                        <span className="font-medium text-slate-600 group-hover:text-[#0F172A] transition-colors">
                          {action.label}
                        </span>
                        <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0F172A]">Recent Activity</h3>
                  <button className="text-xs text-[#23D3EE] hover:underline">View All</button>
                </div>

                <div className="space-y-4">
                  {[
                    { action: "Payment received", invoice: "INV-001", amount: 15000, time: "2 hours ago", type: "payment" },
                    { action: "Invoice sent", invoice: "INV-002", amount: 8500, time: "5 hours ago", type: "sent" },
                    { action: "Invoice viewed", invoice: "INV-003", amount: 12000, time: "Yesterday", type: "viewed" },
                    { action: "Invoice created", invoice: "INV-004", amount: 25000, time: "Yesterday", type: "created" },
                  ].map((activity, index) => {
                    const typeIcons: Record<string, { icon: LucideIcon; color: string }> = {
                      payment: { icon: CheckCircle2, color: "text-green-500 bg-green-100" },
                      sent: { icon: Send, color: "text-blue-500 bg-blue-100" },
                      viewed: { icon: Eye, color: "text-purple-500 bg-purple-100" },
                      created: { icon: FilePlus, color: "text-[#23D3EE] bg-[#23D3EE]/10" },
                    };
                    const { icon: Icon, color } = typeIcons[activity.type];

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color.split(" ")[1])}>
                          <Icon size={14} className={color.split(" ")[0]} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700">{activity.action}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium text-[#23D3EE]">{activity.invoice}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">{formatCurrency(activity.amount)}</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{activity.time}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Payment Methods Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <h3 className="font-semibold text-[#0F172A] mb-4">Payment Methods</h3>

                <div className="space-y-3">
                  {[
                    { method: "Bank Transfer", percentage: 45, color: "bg-[#23D3EE]" },
                    { method: "UPI", percentage: 30, color: "bg-[#FBBF23]" },
                    { method: "Card", percentage: 15, color: "bg-purple-500" },
                    { method: "Cash", percentage: 10, color: "bg-slate-400" },
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600">{item.method}</span>
                        <span className="text-sm font-semibold text-[#0F172A]">{item.percentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                          className={cn("h-full rounded-full", item.color)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Pro Tip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="p-4 bg-gradient-to-br from-[#23D3EE]/5 to-[#FBBF23]/5 rounded-2xl border border-[#23D3EE]/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#23D3EE]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-[#23D3EE]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#0F172A] text-sm mb-1">Pro Tip</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Set up automatic payment reminders to reduce overdue invoices by up to 30%.
                    </p>
                    <button className="mt-2 text-xs font-medium text-[#23D3EE] hover:underline">
                      Configure Reminders →
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* DIALOGS */}
        {/* ============================================ */}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <AlertDialogTitle className="text-center text-[#0F172A]">
                Delete Invoice
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Are you sure you want to delete invoice{" "}
                <span className="font-semibold text-[#0F172A]">
                  {invoiceToDelete?.invoiceNumber}
                </span>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:justify-center">
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteInvoice}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 rounded-xl"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Delete Invoice
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Record Payment Dialog */}
        <RecordPaymentDialog
          isOpen={paymentDialogOpen}
          onClose={() => {
            setPaymentDialogOpen(false);
            setInvoiceForPayment(null);
          }}
          invoice={invoiceForPayment}
          onSubmit={handleRecordPayment}
        />

        {/* Send Invoice Dialog */}
        <SendInvoiceDialog
          isOpen={sendDialogOpen}
          onClose={() => {
            setSendDialogOpen(false);
            setInvoiceToSend(null);
          }}
          invoice={invoiceToSend}
          onSend={handleSendInvoice}
        />
      </main>
    </div>
  );
};

export default InvoicePage;