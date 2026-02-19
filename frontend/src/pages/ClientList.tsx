// src/pages/ClientList.tsx
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
import {
  Bell,
  Plus,
  FileDown,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Search,
  User,
  Calendar,
  Tag,
  MoreHorizontal,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Upload,
  Mail,
  Phone,
  Building2,
  MapPin,
  DollarSign,
  Users,
  UserCheck,
  UserX,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Columns,
  ArrowUpDown,
  ExternalLink,
  Copy,
  Star,
  StarOff,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";

// ============================================
// TYPES
// ============================================

interface Client {
  id: string | number;
  clientName: string;
  clientType: string;
  primaryContactName: string;
  primaryEmail: string;
  phone: string;
  city: string;
  state?: string;
  status: string;
  assignedOwner?: string;
  outstandingBalance?: number;
  totalRevenue?: number;
  lastInteractionDate?: string;
  createdAt?: string;
  tags?: string;
  leadSource?: string;
  clientCategory?: string;
  profileImage?: string;
  isFavorite?: boolean;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
}

interface FilterState {
  status: string;
  owner: string;
  category: string;
  dateRange: string;
}

// ============================================
// CONSTANTS
// ============================================

const defaultColumns: ColumnConfig[] = [
  { key: "clientName", label: "Client", visible: true, sortable: true },
  { key: "assignedOwner", label: "Owner", visible: true, sortable: true },
  { key: "outstandingBalance", label: "Balance", visible: true, sortable: true },
  { key: "totalRevenue", label: "Revenue", visible: true, sortable: true },
  { key: "lastInteractionDate", label: "Last Contact", visible: true, sortable: true },
  { key: "tags", label: "Tags", visible: true, sortable: false },
  { key: "primaryContactName", label: "Contact", visible: true, sortable: true },
  { key: "phone", label: "Phone", visible: true, sortable: false },
  { key: "status", label: "Status", visible: true, sortable: true },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Pending", label: "Pending" },
];

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "VIP", label: "VIP" },
  { value: "Regular", label: "Regular" },
  { value: "New", label: "New" },
];

const dateRangeOptions = [
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

const formatCurrency = (amount?: number) => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const toClientTypeLabel = (clientType?: string) => {
  if (!clientType) return "Business";

  const normalized = clientType.toUpperCase();
  if (normalized === "BUSINESS") return "Business";
  if (normalized === "INDIVIDUAL") return "Individual";

  return clientType;
};

const toClientStatusLabel = (status?: string) => {
  if (!status) return "Active";

  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "INACTIVE") return "Inactive";
  if (normalized === "PENDING") return "Pending";

  return status;
};

const normalizeClientTags = (tags: unknown) => {
  if (Array.isArray(tags)) {
    return tags.join(", ");
  }

  return typeof tags === "string" ? tags : "";
};

const formatAssignedOwner = (assignedOwner: unknown): string => {
  if (!assignedOwner) return "";
  if (typeof assignedOwner === "string") return assignedOwner;

  const owner = assignedOwner as {
    firstName?: string;
    lastName?: string;
    user?: { firstName?: string; lastName?: string };
  };

  const firstName = owner.firstName || owner.user?.firstName || "";
  const lastName = owner.lastName || owner.user?.lastName || "";
  return `${firstName} ${lastName}`.trim();
};

const mapClientFromApi = (client: any): Client => ({
  id: client.id,
  clientName: client.clientName || "Unnamed Client",
  clientType: toClientTypeLabel(client.clientType),
  primaryContactName: client.contactName || client.primaryContactName || "-",
  primaryEmail: client.primaryEmail || "",
  phone: client.primaryPhone || client.phone || "",
  city: client.city || "",
  state: client.province || client.state || "",
  status: toClientStatusLabel(client.status),
  assignedOwner: formatAssignedOwner(client.assignedOwner),
  outstandingBalance: Number(client.outstandingBalance || 0),
  totalRevenue: Number(client.totalRevenue || 0),
  lastInteractionDate: client.lastInteractionDate || client.updatedAt || client.createdAt,
  createdAt: client.createdAt,
  tags: normalizeClientTags(client.tags),
  leadSource: client.leadSource || "",
  clientCategory: client.clientCategory || "",
  profileImage: client.clientLogo || client.profileImage || "",
});

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: number;
  icon: React.ElementType;
  color: "teal" | "gold" | "navy" | "purple" | "green" | "red";
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#23D3EE]", light: "bg-[#23D3EE]/10", text: "text-[#23D3EE]" },
    gold: { bg: "bg-[#FBBF23]", light: "bg-[#FBBF23]/10", text: "text-[#FBBF23]" },
    navy: { bg: "bg-[#0F172A]", light: "bg-[#0F172A]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-emerald-500", light: "bg-emerald-500/10", text: "text-emerald-500" },
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
          <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.light)}>
            <Icon size={18} className={colors.text} />
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// CLIENT ROW COMPONENT
// ============================================

const ClientRow = ({
  client,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  columns,
}: {
  client: Client;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  columns: ColumnConfig[];
}) => {
  const isOverdue = client.lastInteractionDate
    ? new Date().getTime() - new Date(client.lastInteractionDate).getTime() > 30 * 24 * 60 * 60 * 1000
    : false;

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

      {/* Favorite */}
      <td className="py-4 px-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleFavorite}
          className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {client.isFavorite ? (
            <Star size={16} className="text-[#FBBF23] fill-[#FBBF23]" />
          ) : (
            <StarOff size={16} className="text-slate-300 group-hover:text-slate-400" />
          )}
        </button>
      </td>

      {/* Client Name & Info */}
      {columns.find((c) => c.key === "clientName")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              {client.profileImage ? (
                <img
                  src={client.profileImage}
                  alt={client.clientName}
                  className="w-10 h-10 rounded-xl object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#23D3EE]/70 flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(client.clientName)}
                </div>
              )}
              {/* Status Dot */}
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                  client.status === "Active" ? "bg-emerald-500" :
                    client.status === "Pending" ? "bg-[#FBBF23]" : "bg-slate-400"
                )}
              />
            </div>
            <div>
              <div className="font-semibold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors">
                {client.clientName}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{client.clientType}</span>
                {client.clientCategory && (
                  <>
                    <span>•</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full font-medium",
                      client.clientCategory === "VIP" ? "bg-[#FBBF23]/10 text-[#FBBF23]" :
                        client.clientCategory === "New" ? "bg-[#23D3EE]/10 text-[#23D3EE]" :
                          "bg-slate-100 text-slate-500"
                    )}>
                      {client.clientCategory}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </td>
      )}

      {/* Owner */}
      {columns.find((c) => c.key === "assignedOwner")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
              <User size={12} className="text-slate-500" />
            </div>
            <span className="text-sm text-slate-600">
              {client.assignedOwner || "Unassigned"}
            </span>
          </div>
        </td>
      )}

      {/* Balance */}
      {columns.find((c) => c.key === "outstandingBalance")?.visible && (
        <td className="py-4 px-4">
          <span className={cn(
            "font-semibold",
            (client.outstandingBalance || 0) > 0 ? "text-red-600" : "text-emerald-600"
          )}>
            {formatCurrency(client.outstandingBalance)}
          </span>
        </td>
      )}

      {/* Revenue */}
      {columns.find((c) => c.key === "totalRevenue")?.visible && (
        <td className="py-4 px-4">
          <span className="font-medium text-[#0F172A]">
            {formatCurrency(client.totalRevenue)}
          </span>
        </td>
      )}

      {/* Last Interaction */}
      {columns.find((c) => c.key === "lastInteractionDate")?.visible && (
        <td className="py-4 px-4">
          <div className={cn(
            "flex items-center gap-2 text-sm",
            isOverdue ? "text-red-600" : "text-slate-600"
          )}>
            <Clock size={14} className={isOverdue ? "text-red-400" : "text-slate-400"} />
            <span>{getRelativeTime(client.lastInteractionDate)}</span>
            {isOverdue && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-semibold">
                OVERDUE
              </span>
            )}
          </div>
        </td>
      )}

      {/* Tags */}
      {columns.find((c) => c.key === "tags")?.visible && (
        <td className="py-4 px-4">
          <div className="flex flex-wrap gap-1">
            {client.tags ? (
              client.tags.split(",").slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#23D3EE]/10 text-[#23D3EE]"
                >
                  {tag.trim()}
                </span>
              ))
            ) : (
              <span className="text-slate-300 text-xs">-</span>
            )}
            {client.tags && client.tags.split(",").length > 2 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                +{client.tags.split(",").length - 2}
              </span>
            )}
          </div>
        </td>
      )}

      {/* Contact */}
      {columns.find((c) => c.key === "primaryContactName")?.visible && (
        <td className="py-4 px-4">
          <div className="text-sm text-slate-600">
            {client.primaryContactName || "-"}
          </div>
          <div className="text-xs text-slate-400">{client.primaryEmail}</div>
        </td>
      )}

      {/* Phone */}
      {columns.find((c) => c.key === "phone")?.visible && (
        <td className="py-4 px-4">
          <span className="text-sm text-slate-600">{client.phone || "-"}</span>
        </td>
      )}

      {/* Status */}
      {columns.find((c) => c.key === "status")?.visible && (
        <td className="py-4 px-4">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
            client.status === "Active" ? "bg-emerald-100 text-emerald-700" :
              client.status === "Pending" ? "bg-[#FBBF23]/10 text-[#FBBF23]" :
                "bg-slate-100 text-slate-600"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              client.status === "Active" ? "bg-emerald-500" :
                client.status === "Pending" ? "bg-[#FBBF23]" :
                  "bg-slate-400"
            )} />
            {client.status}
          </span>
        </td>
      )}

      {/* Actions */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onView}
            className="p-2 rounded-lg hover:bg-[#23D3EE]/10 text-[#23D3EE] transition-colors"
            title="View"
          >
            <Eye size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-[#FBBF23]/10 text-[#FBBF23] transition-colors"
            title="Edit"
          >
            <Pencil size={16} />
          </motion.button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem className="rounded-lg">
                <Mail size={14} className="mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Phone size={14} className="mr-2" />
                Call Client
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Copy size={14} className="mr-2" />
                Duplicate
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
// CLIENT CARD COMPONENT (Grid View)
// ============================================

const ClientCard = ({
  client,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  client: Client;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer group",
        "hover:border-[#23D3EE]/30 hover:shadow-xl hover:shadow-[#23D3EE]/5 transition-all",
        isSelected && "border-[#23D3EE] bg-[#23D3EE]/5"
      )}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
          />
          <div className="relative">
            {client.profileImage ? (
              <img
                src={client.profileImage}
                alt={client.clientName}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#23D3EE]/70 flex items-center justify-center text-white font-semibold">
                {getInitials(client.clientName)}
              </div>
            )}
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                client.status === "Active" ? "bg-emerald-500" :
                  client.status === "Pending" ? "bg-[#FBBF23]" : "bg-slate-400"
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {client.isFavorite ? (
              <Star size={16} className="text-[#FBBF23] fill-[#FBBF23]" />
            ) : (
              <StarOff size={16} className="text-slate-300" />
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem className="rounded-lg" onClick={onView}>
                <Eye size={14} className="mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg" onClick={onEdit}>
                <Pencil size={14} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg text-red-600 focus:text-red-600"
                onClick={onDelete}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Client Info */}
      <div className="mb-4">
        <h3 className="font-semibold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors mb-1">
          {client.clientName}
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{client.clientType}</span>
          {client.clientCategory && (
            <>
              <span>•</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full font-medium",
                client.clientCategory === "VIP" ? "bg-[#FBBF23]/10 text-[#FBBF23]" :
                  client.clientCategory === "New" ? "bg-[#23D3EE]/10 text-[#23D3EE]" :
                    "bg-slate-100 text-slate-500"
              )}>
                {client.clientCategory}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Mail size={14} className="text-slate-400" />
          <span className="truncate">{client.primaryEmail}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Phone size={14} className="text-slate-400" />
          <span>{client.phone || "-"}</span>
        </div>
        {client.city && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={14} className="text-slate-400" />
            <span>{client.city}{client.state ? `, ${client.state}` : ""}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {client.tags && (
        <div className="flex flex-wrap gap-1 mb-4">
          {client.tags.split(",").slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#23D3EE]/10 text-[#23D3EE]"
            >
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Footer Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-400">Revenue</p>
          <p className="font-semibold text-[#0F172A]">
            {formatCurrency(client.totalRevenue)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Balance</p>
          <p className={cn(
            "font-semibold",
            (client.outstandingBalance || 0) > 0 ? "text-red-600" : "text-emerald-600"
          )}>
            {formatCurrency(client.outstandingBalance)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const ClientListPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedClients, setSelectedClients] = useState<Array<Client["id"]>>(
    []
  );
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    owner: "all",
    category: "all",
    dateRange: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Quick View
  const [quickViewClient, setQuickViewClient] = useState<Client | null>(null);

  // User
  const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null);

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
    fetchClients();
  }, []);

  // ============================================
  // API CALLS
  // ============================================

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/clients");
      const payload = response.data;
      const clientsData = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : [];

      const enrichedData = clientsData.map((client: any) => {
        const mappedClient = mapClientFromApi(client);
        return {
          ...mappedClient,
          totalRevenue:
            mappedClient.totalRevenue || Math.floor(Math.random() * 50000),
          isFavorite: Math.random() > 0.7,
        };
      });
      setClients(enrichedData);
    } catch (error: any) {
      console.error("Network error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Could not connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/clients/${clientToDelete.id}`);
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      toast({
        title: "Deleted",
        description: `${clientToDelete.clientName} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete client",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(
        selectedClients.map((id) => api.delete(`/clients/${id}`))
      );

      setClients((prev) => prev.filter((c) => !selectedClients.includes(c.id)));
      setSelectedClients([]);
      toast({
        title: "Deleted",
        description: `${selectedClients.length} clients have been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete some clients",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  // ============================================
  // FILTERING & SORTING
  // ============================================

  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.clientName.toLowerCase().includes(term) ||
          c.primaryEmail.toLowerCase().includes(term) ||
          c.assignedOwner?.toLowerCase().includes(term) ||
          c.tags?.toLowerCase().includes(term)
      );
    }

    // Status Filter
    if (filters.status !== "all") {
      result = result.filter((c) => c.status === filters.status);
    }

    // Category Filter
    if (filters.category !== "all") {
      result = result.filter((c) => c.clientCategory === filters.category);
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof Client] || "";
        const bVal = b[sortConfig.key as keyof Client] || "";

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        return sortConfig.direction === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return result;
  }, [clients, searchTerm, filters, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / pageSize);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Stats
  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === "Active").length;
    const totalRevenue = clients.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
    const totalOutstanding = clients.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
    const newThisMonth = clients.filter((c) => {
      if (!c.createdAt) return false;
      const created = new Date(c.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    return { total: clients.length, active, totalRevenue, totalOutstanding, newThisMonth };
  }, [clients]);

  // Unique owners for filter
  const uniqueOwners = useMemo(() => {
    const owners = new Set(clients.map((c) => c.assignedOwner).filter(Boolean));
    return Array.from(owners);
  }, [clients]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc"
          ? { key, direction: "desc" }
          : null;
      }
      return { key, direction: "asc" };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(paginatedClients.map((c) => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (id: Client["id"], checked: boolean) => {
    if (checked) {
      setSelectedClients((prev) => [...prev, id]);
    } else {
      setSelectedClients((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleToggleFavorite = (id: Client["id"]) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
      )
    );
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    toast({
      title: "Exporting...",
      description: `Exporting ${filteredClients.length} clients to ${format.toUpperCase()}`,
    });
    // Implement actual export logic here
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      owner: "all",
      category: "all",
      dateRange: "all",
    });
    setSearchTerm("");
  };

  const activeFiltersCount = Object.values(filters).filter((v) => v !== "all").length;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-30"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="flex h-20 items-center justify-between px-6">
            {/* Left - Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-slate-400 hover:text-[#23D3EE] transition-colors"
              >
                Dashboard
              </button>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="font-semibold text-[#23D3EE]">Clients</span>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/client-list/add")}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#23D3EE] text-white text-sm font-medium rounded-xl shadow-lg shadow-[#23D3EE]/25 hover:bg-[#23D3EE]/90 transition-colors"
              >
                <Plus size={16} />
                <span>Add Client</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </motion.button>

              {/* User */}
              <div className="flex items-center gap-3 pl-3 ml-3 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                  </p>
                  <p className="text-xs text-slate-400">Administrator</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#23D3EE] via-[#23D3EE]/80 to-[#FBBF23] flex items-center justify-center text-white font-bold shadow-lg">
                  {user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : "GU"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* MAIN CONTENT */}
        {/* ============================================ */}
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#0F172A] to-[#23D3EE]/30 p-8"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#23D3EE]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-[#FBBF23]/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mb-3"
                >
                  <Sparkles size={20} className="text-[#FBBF23]" />
                  <span className="text-[#FBBF23] text-sm font-medium">
                    Client Management
                  </span>
                </motion.div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  Client <span className="text-[#23D3EE]">Directory</span>
                </h1>
                <p className="text-slate-300 text-lg max-w-xl">
                  Manage your client relationships. You have{" "}
                  <span className="text-[#23D3EE] font-semibold">
                    {stats.total} clients
                  </span>{" "}
                  in your database.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                    >
                      <Download size={16} />
                      Export
                      <ChevronDown size={14} />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-xl">
                    <DropdownMenuItem onClick={() => handleExport("csv")} className="rounded-lg">
                      <FileText size={14} className="mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("excel")} className="rounded-lg">
                      <FileSpreadsheet size={14} className="mr-2" />
                      Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="rounded-lg">
                      <FileDown size={14} className="mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  <Upload size={16} />
                  Import
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Clients"
              value={stats.total}
              subtitle="All registered clients"
              trend={12}
              icon={Users}
              color="teal"
              delay={0}
            />
            <StatCard
              title="Active Clients"
              value={stats.active}
              subtitle={`${Math.round((stats.active / stats.total) * 100)}% of total`}
              trend={8}
              icon={UserCheck}
              color="green"
              delay={0.1}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              subtitle="Lifetime earnings"
              trend={15}
              icon={DollarSign}
              color="gold"
              delay={0.2}
            />
            <StatCard
              title="Outstanding"
              value={formatCurrency(stats.totalOutstanding)}
              subtitle="Pending payments"
              trend={-5}
              icon={AlertCircle}
              color="red"
              delay={0.3}
            />
          </div>

          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200 p-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left - Search & Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 h-10 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                  />
                </div>

                {/* Status Filter */}
                <Select
                  value={filters.status}
                  onValueChange={(val) => setFilters({ ...filters, status: val })}
                >
                  <SelectTrigger className="w-36 h-10 rounded-xl border-slate-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Category Filter */}
                <Select
                  value={filters.category}
                  onValueChange={(val) => setFilters({ ...filters, category: val })}
                >
                  <SelectTrigger className="w-36 h-10 rounded-xl border-slate-200">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* More Filters */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "h-10 rounded-xl border-slate-200",
                    showFilters && "border-[#23D3EE] bg-[#23D3EE]/5"
                  )}
                >
                  <SlidersHorizontal size={14} className="mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#23D3EE] text-white text-[10px] font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>

                {/* Clear Filters */}
                {(activeFiltersCount > 0 || searchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-10 text-slate-500 hover:text-red-600"
                  >
                    <X size={14} className="mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Right - View Options */}
              <div className="flex items-center gap-3">
                {/* Bulk Actions */}
                <AnimatePresence>
                  {selectedClients.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#23D3EE]/10 rounded-xl"
                    >
                      <span className="text-sm font-medium text-[#23D3EE]">
                        {selectedClients.length} selected
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        className="h-7 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedClients([])}
                        className="h-7"
                      >
                        <X size={14} />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Column Visibility */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 rounded-xl border-slate-200">
                      <Columns size={14} className="mr-2" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 rounded-xl">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    {columns.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={col.visible}
                        onCheckedChange={(checked) => {
                          setColumns((prev) =>
                            prev.map((c) =>
                              c.key === col.key ? { ...c, visible: checked } : c
                            )
                          );
                        }}
                        className="rounded-lg"
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View Toggle */}
                <div className="flex items-center bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      viewMode === "table"
                        ? "bg-white text-[#23D3EE] shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      viewMode === "grid"
                        ? "bg-white text-[#23D3EE] shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchClients}
                  disabled={isLoading}
                  className="h-10 w-10 rounded-xl border-slate-200"
                >
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                </Button>
              </div>
            </div>

            {/* Active Filter Chips */}
            <AnimatePresence>
              {(activeFiltersCount > 0 || searchTerm) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100"
                >
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#23D3EE]/10 text-[#23D3EE] text-sm">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm("")}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filters.status !== "all" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#23D3EE]/10 text-[#23D3EE] text-sm">
                      Status: {filters.status}
                      <button onClick={() => setFilters({ ...filters, status: "all" })}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filters.category !== "all" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#23D3EE]/10 text-[#23D3EE] text-sm">
                      Category: {filters.category}
                      <button onClick={() => setFilters({ ...filters, category: "all" })}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-[#23D3EE]/10 flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 text-[#23D3EE] animate-spin" />
                </div>
                <p className="text-slate-500">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Users size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                  No clients found
                </h3>
                <p className="text-slate-500 mb-4">
                  {searchTerm || activeFiltersCount > 0
                    ? "Try adjusting your filters"
                    : "Get started by adding your first client"}
                </p>
                <Button
                  onClick={() =>
                    searchTerm || activeFiltersCount > 0
                      ? clearFilters()
                      : navigate("/client-list/add")
                  }
                  className="bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-xl"
                >
                  {searchTerm || activeFiltersCount > 0 ? (
                    <>
                      <X size={16} className="mr-2" />
                      Clear Filters
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Add Client
                    </>
                  )}
                </Button>
              </div>
            ) : viewMode === "table" ? (
              /* Table View */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      {/* Checkbox Header */}
                      <th className="py-4 px-4 text-left">
                        <Checkbox
                          checked={
                            paginatedClients.length > 0 &&
                            selectedClients.length === paginatedClients.length
                          }
                          onCheckedChange={handleSelectAll}
                          className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
                        />
                      </th>

                      {/* Favorite Header */}
                      <th className="py-4 px-2 text-left">
                        <Star size={14} className="text-slate-400" />
                      </th>

                      {/* Dynamic Column Headers */}
                      {columns.filter((c) => c.visible).map((col) => (
                        <th
                          key={col.key}
                          className="py-4 px-4 text-left"
                        >
                          {col.sortable ? (
                            <button
                              onClick={() => handleSort(col.key)}
                              className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-[#23D3EE] transition-colors group"
                            >
                              {col.label}
                              <ArrowUpDown
                                size={12}
                                className={cn(
                                  "transition-colors",
                                  sortConfig?.key === col.key
                                    ? "text-[#23D3EE]"
                                    : "text-slate-300 group-hover:text-slate-400"
                                )}
                              />
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              {col.label}
                            </span>
                          )}
                        </th>
                      ))}

                      {/* Actions Header */}
                      <th className="py-4 px-4 text-right">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Actions
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {paginatedClients.map((client) => (
                        <ClientRow
                          key={client.id}
                          client={client}
                          isSelected={selectedClients.includes(client.id)}
                          onSelect={(checked) => handleSelectClient(client.id, checked)}
                          onView={() => navigate(`/client-list/${client.id}`)}
                          onEdit={() => navigate(`/client-list/${client.id}/edit`)}
                          onDelete={() => {
                            setClientToDelete(client);
                            setDeleteDialogOpen(true);
                          }}
                          onToggleFavorite={() => handleToggleFavorite(client.id)}
                          columns={columns}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {paginatedClients.map((client, index) => (
                      <ClientCard
                        key={client.id}
                        client={client}
                        isSelected={selectedClients.includes(client.id)}
                        onSelect={(checked) => handleSelectClient(client.id, checked)}
                        onView={() => navigate(`/client-list/${client.id}`)}
                        onEdit={() => navigate(`/client-list/${client.id}/edit`)}
                        onDelete={() => {
                          setClientToDelete(client);
                          setDeleteDialogOpen(true);
                        }}
                        onToggleFavorite={() => handleToggleFavorite(client.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Pagination */}
            {filteredClients.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-slate-50/50">
                {/* Results Info */}
                <div className="flex items-center gap-4">
                  <p className="text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-[#0F172A]">
                      {(currentPage - 1) * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-[#0F172A]">
                      {Math.min(currentPage * pageSize, filteredClients.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-[#0F172A]">
                      {filteredClients.length}
                    </span>{" "}
                    results
                  </p>

                  {/* Page Size Selector */}
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-8 rounded-lg border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {[10, 25, 50, 100].map((size) => (
                        <SelectItem key={size} value={String(size)} className="rounded-lg">
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                  {/* First Page */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg border-slate-200"
                  >
                    <ChevronsLeft size={14} />
                  </Button>

                  {/* Previous Page */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg border-slate-200"
                  >
                    <ChevronLeft size={14} />
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
                            "h-8 w-8 rounded-lg text-sm font-medium transition-colors",
                            currentPage === pageNum
                              ? "bg-[#23D3EE] text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-lg border-slate-200"
                  >
                    <ChevronRight size={14} />
                  </Button>

                  {/* Last Page */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-lg border-slate-200"
                  >
                    <ChevronsRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-semibold text-[#0F172A]">Yoursoft</span>
              <span className="text-[#23D3EE] font-semibold">Digital</span>
              <span>• All rights reserved</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[#23D3EE] transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-[#23D3EE] transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-[#23D3EE] transition-colors">
                Support
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* ============================================ */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ============================================ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-[#0F172A]">
              Delete Client
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#0F172A]">
                {clientToDelete?.clientName}
              </span>
              ? This action cannot be undone and will permanently remove all
              associated data including invoices, projects, and contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Client
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================ */}
      {/* BULK DELETE DIALOG */}
      {/* ============================================ */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-[#0F172A]">
              Delete {selectedClients.length} Clients
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#0F172A]">
                {selectedClients.length} clients
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================ */}
      {/* QUICK VIEW DIALOG */}
      {/* ============================================ */}
      <Dialog
        open={!!quickViewClient}
        onOpenChange={() => setQuickViewClient(null)}
      >
        <DialogContent className="sm:max-w-[600px] rounded-2xl p-0 overflow-hidden">
          {quickViewClient && (
            <>
              {/* Header */}
              <div className="relative p-6 bg-gradient-to-r from-[#0F172A] to-[#23D3EE]/30">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#23D3EE]/10 rounded-full blur-2xl" />
                <div className="relative flex items-center gap-4">
                  {quickViewClient.profileImage ? (
                    <img
                      src={quickViewClient.profileImage}
                      alt={quickViewClient.clientName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-xl">
                      {getInitials(quickViewClient.clientName)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {quickViewClient.clientName}
                    </h2>
                    <p className="text-white/70">{quickViewClient.clientType}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                          quickViewClient.status === "Active"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-500/20 text-slate-300"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            quickViewClient.status === "Active"
                              ? "bg-emerald-400"
                              : "bg-slate-400"
                          )}
                        />
                        {quickViewClient.status}
                      </span>
                      {quickViewClient.clientCategory && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FBBF23]/20 text-[#FBBF23] text-xs font-semibold">
                          {quickViewClient.clientCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      Primary Contact
                    </p>
                    <p className="font-medium text-[#0F172A]">
                      {quickViewClient.primaryContactName || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      Email
                    </p>
                    <p className="font-medium text-[#0F172A]">
                      {quickViewClient.primaryEmail}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      Phone
                    </p>
                    <p className="font-medium text-[#0F172A]">
                      {quickViewClient.phone || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      Location
                    </p>
                    <p className="font-medium text-[#0F172A]">
                      {quickViewClient.city}
                      {quickViewClient.state && `, ${quickViewClient.state}`}
                    </p>
                  </div>
                </div>

                {/* Financial Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-xs text-emerald-600 uppercase tracking-wider mb-1">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatCurrency(quickViewClient.totalRevenue)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "p-4 rounded-xl",
                      (quickViewClient.outstandingBalance || 0) > 0
                        ? "bg-red-50"
                        : "bg-emerald-50"
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs uppercase tracking-wider mb-1",
                        (quickViewClient.outstandingBalance || 0) > 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      )}
                    >
                      Outstanding Balance
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-bold",
                        (quickViewClient.outstandingBalance || 0) > 0
                          ? "text-red-700"
                          : "text-emerald-700"
                      )}
                    >
                      {formatCurrency(quickViewClient.outstandingBalance)}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {quickViewClient.tags && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickViewClient.tags.split(",").map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full bg-[#23D3EE]/10 text-[#23D3EE] text-sm font-medium"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button
                    onClick={() => {
                      setQuickViewClient(null);
                      navigate(`/client-list/${quickViewClient.id}`);
                    }}
                    className="flex-1 bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-xl"
                  >
                    <Eye size={16} className="mr-2" />
                    View Full Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuickViewClient(null);
                      navigate(`/client-list/${quickViewClient.id}/edit`);
                    }}
                    className="flex-1 rounded-xl border-slate-200"
                  >
                    <Pencil size={16} className="mr-2" />
                    Edit Client
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(23, 195, 178, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(23, 195, 178, 0.5);
        }
      `}</style>
    </div>
  );
};

export default ClientListPage;
