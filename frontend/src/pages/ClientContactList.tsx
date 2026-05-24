// src/pages/ClientContactList.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import FieldErrorMessage from "@/components/forms/FieldErrorMessage";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { NotificationBell } from "@/components/NotificationBell";
import { ActivityTimeline } from "@/components/ActivityTimeline";
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
import { Label } from "@/components/ui/label";
import { getClients as getClientEntities } from "@/features/clients";
import { getProjects } from "@/features/projects/services/projects-service";
import { getEmployees } from "@/features/users";
import api from "@/lib/axios";
import {
  getCanadianPhoneError,
  getEmailAddressError,
  getPersonNameError,
  normalizeEmailAddress,
  normalizeWhitespace,
} from "@contracts/contact";
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
  Users,
  UserPlus,
  Building2,
  Mail,
  Phone,
  Briefcase,
  MoreHorizontal,
  MoreVertical,
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
  RefreshCw,
  X,
  Sparkles,
  ArrowUpDown,
  Copy,
  ExternalLink,
  MessageSquare,
  Video,
  Calendar,
  Star,
  StarOff,
  Send,
  PhoneCall,
  AtSign,
  Hash,
  Globe,
  Linkedin,
  Twitter,
  CheckCircle2,
  Clock,
  FileText,
  Columns,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ListCardSkeleton,
  PullToRefreshIndicator,
  SwipeActionCard,
  usePullToRefresh,
} from "@/features/clients/components/responsive-helpers";

// ============================================
// CONFIGURATION
// ============================================

// ============================================
// TYPES
// ============================================

interface Contact {
  id: string;
  type: string;
  clientName: string;
  clientId?: string;
  dealId?: string;
  dealName?: string;
  contactPerson: string;
  firstName?: string;
  lastName?: string;
  designation: string;
  department?: string;
  contactEmail: string;
  contactNo: string;
  mobile?: string;
  linkedin?: string;
  relationshipStatus?: string;
  roleInBuyingProcess?: string;
  seniorityLevel?: string;
  buyingAuthorityScore?: string;
  secondaryEmail?: string;
  alternatePhone?: string;
  preferredContactMethod?: string;
  timeZone?: string;
  tags?: string[];
  assignedToId?: string;
  assignedToName?: string;
  totalInteractions?: number;
  lastActivityType?: string;
  deals?: Array<{ id: string; dealId: string; dealName: string; role?: string; isPrimary?: boolean }>;
  isPrimary?: boolean;
  isFavorite?: boolean;
  lastContacted?: string;
  notes?: string;
  avatar?: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
}

interface User {
  firstName: string;
  lastName: string;
}

function ContactDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[rgba(15,23,42,0.06)] py-2 last:border-b-0">
      <span className="text-[#64748B]">{label}</span>
      <span className="text-right font-medium text-[#0F172A]">{value}</span>
    </div>
  );
}

function LinkedContactBox({ label, value, action }: { label: string; value: string; action?: () => void }) {
  const content = (
    <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-3 text-left">
      <p className="text-[11px] font-semibold uppercase text-[#64748B]">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#0F172A]">{value}</p>
      {action ? <p className="mt-2 text-xs font-semibold text-[#0891B2]">Open</p> : null}
    </div>
  );
  return action ? <button type="button" onClick={action}>{content}</button> : content;
}

// ============================================
// CONSTANTS
// ============================================

const defaultColumns: ColumnConfig[] = [
  { key: "contactPerson", label: "Contact", visible: true, sortable: true },
  { key: "clientName", label: "Company", visible: true, sortable: true },
  { key: "designation", label: "Role", visible: true, sortable: true },
  { key: "contactEmail", label: "Email", visible: true, sortable: true },
  { key: "contactNo", label: "Phone", visible: true, sortable: false },
  { key: "lastContacted", label: "Last Contact", visible: true, sortable: true },
  { key: "type", label: "Type", visible: true, sortable: true },
];

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "Client", label: "Client" },
  { value: "Prospect", label: "Prospect" },
];

const relationshipStatusOptions = ["Active", "Inactive"];
const buyingRoleOptions = ["Decision Maker", "Influencer", "User", "Gatekeeper"];
const seniorityOptions = ["Manager", "Director", "VP", "CXO", "Owner", "Individual Contributor"];
const authorityScoreOptions = ["1", "2", "3", "4", "5"];
const preferredContactOptions = ["Email", "Call", "WhatsApp"];

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

const getTypeColor = (type: string) => {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    Client: { bg: "bg-[#0891B2]/10", text: "text-[#0891B2]", dot: "bg-[#0891B2]" },
    Prospect: { bg: "bg-[#D97706]/10", text: "text-[#D97706]", dot: "bg-[#D97706]" },
  };
  return colors[type] || colors.Client;
};

const toContactTypeLabel = (type?: string | null) => {
  if (type === "LEAD" || type === "Prospect") return "Prospect";
  return "Client";
};

const toContactTypePayload = (type?: string | null) => {
  return type === "Prospect" ? "LEAD" : "CLIENT";
};

const getEmployeeName = (employee: any) => {
  const user = employee?.user || {};
  return (
    employee?.fullName ||
    employee?.name ||
    [user.firstName || employee?.firstName, user.lastName || employee?.lastName].filter(Boolean).join(" ") ||
    user.email ||
    employee?.email ||
    "Sales Rep"
  );
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
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: "teal" | "gold" | "navy" | "purple";
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#F8FAFC]", light: "bg-[#F8FAFC]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative min-w-[220px] flex-1 bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg transition-all overflow-hidden group md:min-w-0"
    >
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{value}</p>
          <p className="text-xs text-[#475569] mt-1">{subtitle}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", colors.light)}>
          <Icon size={18} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// CONTACT ROW COMPONENT
// ============================================

const ContactRow = ({
  contact,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onSendEmail,
  onCall,
  columns,
}: {
  contact: Contact;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onSendEmail: () => void;
  onCall: () => void;
  columns: ColumnConfig[];
}) => {
  const typeColor = getTypeColor(contact.type);
  const isOverdue = contact.lastContacted
    ? new Date().getTime() - new Date(contact.lastContacted).getTime() > 30 * 24 * 60 * 60 * 1000
    : false;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "group hover:bg-[#F8FAFC]/80 transition-colors cursor-pointer border-b border-[rgba(15,23,42,0.06)] last:border-0",
        isSelected && "bg-[#0891B2]/5"
      )}
      onClick={onView}
    >
      {/* Checkbox */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
        />
      </td>

      {/* Favorite */}
      <td className="py-4 px-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleFavorite}
          className="p-1 rounded-md hover:bg-white/10 transition-colors"
        >
          {contact.isFavorite ? (
            <Star size={16} className="text-[#D97706] fill-[#FBBF24]" />
          ) : (
            <StarOff size={16} className="text-[#475569] group-hover:text-[#475569]" />
          )}
        </button>
      </td>

      {/* Contact Person */}
      {columns.find((c) => c.key === "contactPerson")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {contact.avatar ? (
                <img
                  src={contact.avatar}
                  alt={contact.contactPerson}
                  className="w-10 h-10 rounded-md object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-semibold text-sm">
                  {getInitials(contact.contactPerson)}
                </div>
              )}
              {contact.isPrimary && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0891B2] rounded-full flex items-center justify-center">
                  <CheckCircle2 size={10} className="text-[#0F172A]" />
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors flex items-center gap-2">
                {contact.contactPerson || "Unknown"}
                {contact.isPrimary && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#0891B2]/10 text-[#0891B2]">
                    Primary
                  </span>
                )}
              </div>
              {contact.department && (
                <div className="text-xs text-[#475569]">{contact.department}</div>
              )}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {contact.clientId ? (
                  <span className="rounded border border-[#B2F5EA] bg-[#F0FDFA] px-1.5 py-0.5 text-[10px] font-medium text-[#0F766E]">
                    Account linked
                  </span>
                ) : null}
                {contact.dealId ? (
                  <span className="rounded border border-[#DDD6FE] bg-[#F5F3FF] px-1.5 py-0.5 text-[10px] font-medium text-[#6D28D9]">
                    Deal linked
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </td>
      )}

      {/* Company */}
      {columns.find((c) => c.key === "clientName")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[#475569]" />
            <span className="text-sm text-[#475569] font-medium">
              {contact.clientName}
            </span>
          </div>
        </td>
      )}

      {/* Designation */}
      {columns.find((c) => c.key === "designation")?.visible && (
        <td className="py-4 px-4">
          <span className="text-sm text-[#475569]">
            {contact.designation || "-"}
          </span>
        </td>
      )}

      {/* Email */}
      {columns.find((c) => c.key === "contactEmail")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-[#475569]" />
            <a
              href={`mailto:${contact.contactEmail}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-[#475569] hover:text-[#0891B2] transition-colors"
            >
              {contact.contactEmail || "-"}
            </a>
          </div>
        </td>
      )}

      {/* Phone */}
      {columns.find((c) => c.key === "contactNo")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-[#475569]" />
            <a
              href={`tel:${contact.contactNo}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-[#475569] hover:text-[#0891B2] transition-colors"
            >
              {contact.contactNo || "-"}
            </a>
          </div>
        </td>
      )}

      {/* Last Contacted */}
      {columns.find((c) => c.key === "lastContacted")?.visible && (
        <td className="py-4 px-4">
          <div className={cn(
            "flex items-center gap-2 text-sm",
            isOverdue ? "text-red-600" : "text-[#475569]"
          )}>
            <Clock size={14} className={isOverdue ? "text-red-400" : "text-[#475569]"} />
            <span>{getRelativeTime(contact.lastContacted)}</span>
            {isOverdue && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-semibold">
                OVERDUE
              </span>
            )}
          </div>
        </td>
      )}

      {/* Type */}
      {columns.find((c) => c.key === "type")?.visible && (
        <td className="py-4 px-4">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
            typeColor.bg,
            typeColor.text
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", typeColor.dot)} />
            {contact.type}
          </span>
        </td>
      )}

      {/* Actions */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Quick Actions */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSendEmail}
            className="p-2 rounded-md hover:bg-[#0891B2]/10 text-[#0891B2] transition-colors"
            title="Send Email"
          >
            <Send size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCall}
            className="p-2 rounded-md hover:bg-emerald-100 text-emerald-600 transition-colors"
            title="Call"
          >
            <PhoneCall size={16} />
          </motion.button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-md">
                <Pencil size={14} className="mr-2" />
                Edit Contact
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-md">
                <Video size={14} className="mr-2" />
                Schedule Meeting
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <MessageSquare size={14} className="mr-2" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Copy size={14} className="mr-2" />
                Copy Email
              </DropdownMenuItem>
              {contact.linkedin && (
                <DropdownMenuItem className="rounded-md">
                  <Linkedin size={14} className="mr-2" />
                  View LinkedIn
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-md text-red-600 focus:text-red-600 focus:bg-red-50"
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
// CONTACT CARD COMPONENT (Grid View)
// ============================================

const ContactCard = ({
  contact,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onSendEmail,
  onCall,
}: {
  contact: Contact;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onSendEmail: () => void;
  onCall: () => void;
}) => {
  const typeColor = getTypeColor(contact.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5 cursor-pointer group",
        "hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all",
        isSelected && "border-[#22D3EE] bg-[#0891B2]/5"
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
            className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
          />
          <div className="relative">
            {contact.avatar ? (
              <img
                src={contact.avatar}
                alt={contact.contactPerson}
                className="w-14 h-14 rounded-md object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold text-lg">
                {getInitials(contact.contactPerson)}
              </div>
            )}
            {contact.isPrimary && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#0891B2] rounded-full flex items-center justify-center">
                <CheckCircle2 size={12} className="text-[#0F172A]" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            {contact.isFavorite ? (
              <Star size={16} className="text-[#D97706] fill-[#FBBF24]" />
            ) : (
              <StarOff size={16} className="text-[#475569]" />
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-white/10 text-[#475569]">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-md">
                <Pencil size={14} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-md text-red-600"
                onClick={onDelete}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contact Info */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
            {contact.contactPerson || "Unknown"}
          </h3>
          {contact.isPrimary && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#0891B2]/10 text-[#0891B2]">
              Primary
            </span>
          )}
        </div>
        <p className="text-sm text-[#94A3B8]">{contact.designation || "No title"}</p>
        <div className="flex items-center gap-2 mt-1">
          <Building2 size={12} className="text-[#475569]" />
          <span className="text-xs text-[#94A3B8]">{contact.clientName}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {contact.clientId ? (
            <span className="rounded border border-[#B2F5EA] bg-[#F0FDFA] px-1.5 py-0.5 text-[10px] font-medium text-[#0F766E]">
              Account linked
            </span>
          ) : null}
          {contact.dealId ? (
            <span className="rounded border border-[#DDD6FE] bg-[#F5F3FF] px-1.5 py-0.5 text-[10px] font-medium text-[#6D28D9]">
              Deal linked
            </span>
          ) : null}
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-2 mb-4">
        <a
          href={`mailto:${contact.contactEmail}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 text-sm text-[#475569] hover:text-[#0891B2] transition-colors"
        >
          <Mail size={14} className="text-[#475569]" />
          <span className="truncate">{contact.contactEmail || "-"}</span>
        </a>
        <a
          href={`tel:${contact.contactNo}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 text-sm text-[#475569] hover:text-[#0891B2] transition-colors"
        >
          <Phone size={14} className="text-[#475569]" />
          <span>{contact.contactNo || "-"}</span>
        </a>
      </div>

      {/* Type Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
          typeColor.bg,
          typeColor.text
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", typeColor.dot)} />
          {contact.type}
        </span>
        <span className="text-xs text-[#475569]">
          {getRelativeTime(contact.lastContacted)}
        </span>
      </div>

      {/* Quick Actions */}
      <div
        className="flex gap-2 pt-4 border-t border-[rgba(15,23,42,0.06)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          onClick={onSendEmail}
          className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md h-9"
        >
          <Send size={14} className="mr-1" />
          Email
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCall}
          className="flex-1 rounded-md h-9 border-[rgba(15,23,42,0.06)]"
        >
          <PhoneCall size={14} className="mr-1" />
          Call
        </Button>
      </div>
    </motion.div>
  );
};

const MobileContactCard = ({
  contact,
  isSelected,
  onSelect,
  onView,
  onDelete,
  onSendEmail,
  onCall,
}: {
  contact: Contact;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onDelete: () => void;
  onSendEmail: () => void;
  onCall: () => void;
}) => {
  const typeColor = getTypeColor(contact.type);

  return (
    <SwipeActionCard
      onView={onView}
      onDelete={onDelete}
      onLongPress={() => onSelect(!isSelected)}
      className="shadow-sm"
    >
      <div
        className={cn(
          "rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-4",
          isSelected && "border-[#22D3EE] bg-[#0891B2]/5"
        )}
        onClick={onView}
      >
        <div className="flex items-start gap-3">
          {contact.avatar ? (
            <img src={contact.avatar} alt={contact.contactPerson} className="h-12 w-12 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F5F9] font-semibold text-[#0F172A]">
              {getInitials(contact.contactPerson)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[#0F172A]">{contact.contactPerson}</p>
                <p className="truncate text-sm text-[#475569]">{contact.clientName}</p>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", typeColor.bg, typeColor.text)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", typeColor.dot)} />
                {contact.type}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCall();
                }}
                className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-left"
              >
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Call</p>
                <p className="mt-1 truncate text-sm font-medium text-[#0F172A]">{contact.contactNo || "-"}</p>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSendEmail();
                }}
                className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-left"
              >
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Email</p>
                <p className="mt-1 truncate text-sm font-medium text-[#0F172A]">{contact.contactEmail || "-"}</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </SwipeActionCard>
  );
};

// ============================================
// ADD/EDIT CONTACT DIALOG
// ============================================

const ContactDialog = ({
  isOpen,
  onClose,
  onSubmit,
  contact,
  clients,
  deals,
  employees,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Contact>) => Promise<boolean>;
  contact?: Contact | null;
  clients: { id: string; clientName: string }[];
  deals: { id: string; name: string }[];
  employees: { id: string; name: string }[];
}) => {
  const { isMobile } = useIsMobile();
  const [formData, setFormData] = useState({
    contactPerson: "",
    firstName: "",
    lastName: "",
    clientId: "",
    dealId: "",
    designation: "",
    department: "",
    contactEmail: "",
    contactNo: "",
    mobile: "",
    type: "Client",
    relationshipStatus: "Active",
    roleInBuyingProcess: "Decision Maker",
    seniorityLevel: "",
    buyingAuthorityScore: "",
    secondaryEmail: "",
    alternatePhone: "",
    preferredContactMethod: "Email",
    timeZone: "",
    tagsText: "",
    assignedToId: "",
    isPrimary: false,
    linkedin: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  useEffect(() => {
    if (contact) {
      const nameParts = (contact.contactPerson || "").trim().split(/\s+/);
      const firstName = contact.firstName || nameParts[0] || "";
      const lastName = contact.lastName || nameParts.slice(1).join(" ") || "";
      setFormData({
        contactPerson: contact.contactPerson || "",
        firstName,
        lastName,
        clientId: contact.clientId?.toString() || "",
        dealId: contact.dealId?.toString() || "",
        designation: contact.designation || "",
        department: contact.department || "",
        contactEmail: contact.contactEmail || "",
        contactNo: contact.contactNo || "",
        mobile: contact.mobile || "",
        type: toContactTypeLabel(contact.type),
        relationshipStatus: contact.relationshipStatus || "Active",
        roleInBuyingProcess: contact.roleInBuyingProcess || "Decision Maker",
        seniorityLevel: contact.seniorityLevel || "",
        buyingAuthorityScore: contact.buyingAuthorityScore || "",
        secondaryEmail: contact.secondaryEmail || "",
        alternatePhone: contact.alternatePhone || "",
        preferredContactMethod: contact.preferredContactMethod || "Email",
        timeZone: contact.timeZone || "",
        tagsText: (contact.tags || []).join(", "),
        assignedToId: contact.assignedToId || "",
        isPrimary: contact.isPrimary || false,
        linkedin: contact.linkedin || "",
        notes: contact.notes || "",
      });
    } else {
      setFormData({
        contactPerson: "",
        firstName: "",
        lastName: "",
        clientId: "",
        dealId: "",
        designation: "",
        department: "",
        contactEmail: "",
        contactNo: "",
        mobile: "",
        type: "Client",
        relationshipStatus: "Active",
        roleInBuyingProcess: "Decision Maker",
        seniorityLevel: "",
        buyingAuthorityScore: "",
        secondaryEmail: "",
        alternatePhone: "",
        preferredContactMethod: "Email",
        timeZone: "",
        tagsText: "",
        assignedToId: "",
        isPrimary: false,
        linkedin: "",
        notes: "",
      });
    }
    setErrors({});
    setShowMoreDetails(false);
  }, [contact, isOpen]);

  const setFieldValue = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearFieldError = (field: keyof typeof formData) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    const firstNameError = getPersonNameError(formData.firstName, "First name", { required: true });
    if (firstNameError) {
      nextErrors.firstName = firstNameError;
    }

    const lastNameError = getPersonNameError(formData.lastName, "Last name", { required: true });
    if (lastNameError) {
      nextErrors.lastName = lastNameError;
    }

    const emailError = getEmailAddressError(formData.contactEmail, "Email", { required: true });
    if (emailError) {
      nextErrors.contactEmail = emailError;
    }

    const officePhoneError = getCanadianPhoneError(formData.contactNo, "Phone number", { required: true });
    if (officePhoneError) {
      nextErrors.contactNo = officePhoneError;
    }

    const mobilePhoneError = getCanadianPhoneError(formData.mobile, "Mobile");
    if (mobilePhoneError) {
      nextErrors.mobile = mobilePhoneError;
    }

    const alternatePhoneError = getCanadianPhoneError(formData.alternatePhone, "Alternate phone");
    if (alternatePhoneError) {
      nextErrors.alternatePhone = alternatePhoneError;
    }

    const secondaryEmailError = getEmailAddressError(formData.secondaryEmail, "Secondary email");
    if (secondaryEmailError) {
      nextErrors.secondaryEmail = secondaryEmailError;
    }

    if (!formData.clientId && !formData.dealId) {
      nextErrors.clientId = "Link this contact to an account or deal.";
    }

    if (formData.linkedin.trim()) {
      try {
        new URL(formData.linkedin.trim());
      } catch {
        nextErrors.linkedin = "Enter a valid LinkedIn URL, including http:// or https://";
      }
    }

    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    const firstName = normalizeWhitespace(formData.firstName) || "";
    const lastName = normalizeWhitespace(formData.lastName) || "";
    const contactPerson = normalizeWhitespace(`${firstName} ${lastName}`) || normalizeWhitespace(formData.contactPerson) || "";
    const didSave = await onSubmit({
      ...formData,
      contactPerson,
      firstName,
      lastName,
      clientId: formData.clientId || undefined,
      dealId: formData.dealId || undefined,
      tags: formData.tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    setIsLoading(false);
    if (didSave) {
      onClose();
    }
  };

  const isEditMode = Boolean(contact);

  const formBody = (
    <form onSubmit={handleSubmit} className={cn("space-y-5", isMobile ? "px-4 pb-4" : "p-6 max-h-[70vh] overflow-y-auto")}>
          {/* Basic Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                First Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFieldValue("firstName", e.target.value)}
                  placeholder="John"
                  required
                  className={cn(
                    "h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20",
                    errors.firstName && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                />
              </div>
              {errors.firstName ? (
                <FieldErrorMessage
                  message={errors.firstName}
                  onDismiss={() => clearFieldError("firstName")}
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFieldValue("lastName", e.target.value)}
                placeholder="Doe"
                required
                className={cn(
                  "h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20",
                  errors.lastName && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                )}
              />
              {errors.lastName ? (
                <FieldErrorMessage
                  message={errors.lastName}
                  onDismiss={() => clearFieldError("lastName")}
                />
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFieldValue("contactEmail", e.target.value)}
                  placeholder="john@company.com"
                  required
                  className={cn(
                    "h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20",
                    errors.contactEmail && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                />
              </div>
              {errors.contactEmail ? (
                <FieldErrorMessage
                  message={errors.contactEmail}
                  onDismiss={() => clearFieldError("contactEmail")}
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.contactNo}
                  onChange={(e) => setFieldValue("contactNo", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={cn(
                    "h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20",
                    errors.contactNo && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                />
              </div>
              {errors.contactNo ? (
                <FieldErrorMessage
                  message={errors.contactNo}
                  onDismiss={() => clearFieldError("contactNo")}
                />
              ) : null}
            </div>
          </div>

          {/* Account, Deal, Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Account / Company <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.clientId}
                onValueChange={(val) => setFieldValue("clientId", val)}
              >
                <SelectTrigger className={cn("h-11 rounded-md border-[rgba(15,23,42,0.06)]", errors.clientId && "border-red-500")}>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)} className="rounded-md">
                      {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId ? (
                <FieldErrorMessage
                  message={errors.clientId}
                  onDismiss={() => setErrors((prev) => {
                    const next = { ...prev };
                    delete next.clientId;
                    return next;
                  })}
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Deal</Label>
              <Select
                value={formData.dealId}
                onValueChange={(val) => setFieldValue("dealId", val)}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Link deal" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id} className="rounded-md">
                      {deal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Role in Buying Process</Label>
              <Select
                value={formData.roleInBuyingProcess}
                onValueChange={(val) => setFieldValue("roleInBuyingProcess", val)}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {buyingRoleOptions.map((role) => (
                    <SelectItem key={role} value={role} className="rounded-md">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Assigned Sales Rep</Label>
              <Select
                value={formData.assignedToId}
                onValueChange={(val) => setFieldValue("assignedToId", val)}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Select rep" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id} className="rounded-md">
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowMoreDetails((value) => !value)}
            className="w-full justify-between rounded-md border-[rgba(15,23,42,0.06)]"
          >
            More Details
            <ChevronDown size={16} className={cn("transition-transform", showMoreDetails && "rotate-180")} />
          </Button>

          {showMoreDetails ? (
            <div className="space-y-5 rounded-md border border-[rgba(15,23,42,0.06)] p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Job Title</Label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      value={formData.designation}
                      onChange={(e) => setFieldValue("designation", e.target.value)}
                      placeholder="CEO, Manager..."
                      className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Department</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFieldValue("department", e.target.value)}
                    placeholder="Sales, Operations..."
                    className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Contact Type</Label>
                  <Select value={formData.type} onValueChange={(val) => setFieldValue("type", val)}>
                    <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {typeOptions.filter((t) => t.value !== "all").map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="rounded-md">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Relationship Status</Label>
                  <Select value={formData.relationshipStatus} onValueChange={(val) => setFieldValue("relationshipStatus", val)}>
                    <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {relationshipStatusOptions.map((status) => (
                        <SelectItem key={status} value={status} className="rounded-md">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Seniority Level</Label>
                  <Select value={formData.seniorityLevel} onValueChange={(val) => setFieldValue("seniorityLevel", val)}>
                    <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Select seniority" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {seniorityOptions.map((level) => (
                        <SelectItem key={level} value={level} className="rounded-md">{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Buying Authority Score</Label>
                  <Select value={formData.buyingAuthorityScore} onValueChange={(val) => setFieldValue("buyingAuthorityScore", val)}>
                    <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="1-5" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {authorityScoreOptions.map((score) => (
                        <SelectItem key={score} value={score} className="rounded-md">{score}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Secondary Email</Label>
                  <Input
                    type="email"
                    value={formData.secondaryEmail}
                    onChange={(e) => setFieldValue("secondaryEmail", e.target.value)}
                    placeholder="secondary@company.com"
                    className={cn("h-11 rounded-md border-[rgba(15,23,42,0.06)]", errors.secondaryEmail && "border-red-500")}
                  />
                  {errors.secondaryEmail ? (
                    <FieldErrorMessage message={errors.secondaryEmail} onDismiss={() => clearFieldError("secondaryEmail")} />
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Alternate Phone</Label>
                  <Input
                    value={formData.alternatePhone}
                    onChange={(e) => setFieldValue("alternatePhone", e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className={cn("h-11 rounded-md border-[rgba(15,23,42,0.06)]", errors.alternatePhone && "border-red-500")}
                  />
                  {errors.alternatePhone ? (
                    <FieldErrorMessage message={errors.alternatePhone} onDismiss={() => clearFieldError("alternatePhone")} />
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">LinkedIn URL</Label>
                <div className="relative">
                  <Linkedin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={formData.linkedin}
                    onChange={(e) => setFieldValue("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className={cn(
                      "h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20",
                      errors.linkedin && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                  />
                </div>
                {errors.linkedin ? (
                  <FieldErrorMessage message={errors.linkedin} onDismiss={() => clearFieldError("linkedin")} />
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Preferred Contact Method</Label>
                  <Select value={formData.preferredContactMethod} onValueChange={(val) => setFieldValue("preferredContactMethod", val)}>
                    <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {preferredContactOptions.map((method) => (
                        <SelectItem key={method} value={method} className="rounded-md">{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Time Zone</Label>
                  <Input
                    value={formData.timeZone}
                    onChange={(e) => setFieldValue("timeZone", e.target.value)}
                    placeholder="America/Toronto"
                    className="h-11 rounded-md border-[rgba(15,23,42,0.06)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Tags</Label>
                <Input
                  value={formData.tagsText}
                  onChange={(e) => setFieldValue("tagsText", e.target.value)}
                  placeholder="Hot, VIP, Champion"
                  className="h-11 rounded-md border-[rgba(15,23,42,0.06)]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFieldValue("notes", e.target.value)}
                  placeholder="Context, preferences, objections, and next steps..."
                  className="min-h-[96px] rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
          ) : null}

          {/* Primary Contact Toggle */}
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-md">
            <div>
              <p className="font-medium text-[#0F172A]">Primary Contact</p>
              <p className="text-xs text-[#94A3B8]">Use for the main decision contact on this account or deal</p>
            </div>
            <Checkbox
              checked={formData.isPrimary}
              onCheckedChange={(checked) =>
                setFieldValue("isPrimary", checked as boolean)
              }
              className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
            />
          </div>

          {/* Actions */}
          <DialogFooter className="gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-md border-[rgba(15,23,42,0.06)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.firstName.trim() || !formData.lastName.trim() || !formData.contactEmail.trim() || !formData.contactNo.trim()}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md "
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : null}
              {isEditMode ? "Update Contact" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh] rounded-t-[24px] border-none bg-white">
          <DrawerHeader className="border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] px-4 pb-4 text-left">
            <DrawerTitle className="text-xl font-bold text-[#0F172A]">
              {isEditMode ? "Edit Contact" : "Add New Contact"}
            </DrawerTitle>
            <DrawerDescription>
              Update contact details without leaving the client module.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto py-4">{formBody}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {isEditMode ? "Edit Contact" : "Add New Contact"}
            </DialogTitle>
          </DialogHeader>
        </div>
        {formBody}
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const ClientContactListPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile, isTablet } = useIsMobile();

  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<{ id: string; clientName: string }[]>([]);
  const [deals, setDeals] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [user, setUser] = useState<User | null>(null);

  // Dialogs
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !window.navigator.onLine : false
  );

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
    fetchContacts();
    fetchClients();
    fetchDeals();
    fetchEmployees();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ============================================
  // API CALLS
  // ============================================

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/contacts", { params: { limit: 100, sortBy: "contactName", sortOrder: "asc" } });
      const apiContacts = res.data?.data?.data || res.data?.data || [];
      const mapped = (apiContacts || []).map((c: any) => ({
        id: String(c.id),
        type: toContactTypeLabel(c.type),
        clientName: c.company?.clientName || "",
        clientId: c.company?.id ? String(c.company.id) : c.companyId ? String(c.companyId) : undefined,
        contactPerson: c.contactName || "",
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        designation: c.jobTitle || "",
        department: c.department || "",
        contactEmail: c.email || "",
        contactNo: c.officePhone || "",
        mobile: c.mobilePhone || "",
        relationshipStatus: c.relationshipStatus || "Active",
        roleInBuyingProcess: c.roleInBuyingProcess || "",
        seniorityLevel: c.seniorityLevel || "",
        buyingAuthorityScore: c.buyingAuthorityScore || "",
        secondaryEmail: c.secondaryEmail || "",
        alternatePhone: c.alternatePhone || "",
        preferredContactMethod: c.preferredContactMethod || "",
        timeZone: c.timeZone || "",
        tags: Array.isArray(c.tags) ? c.tags : [],
        assignedToId: c.assignedTo?.id || c.assignedToId || "",
        assignedToName: c.assignedTo?.user
          ? [c.assignedTo.user.firstName, c.assignedTo.user.lastName].filter(Boolean).join(" ") || c.assignedTo.user.email
          : "",
        totalInteractions: c.totalInteractions || 0,
        lastActivityType: c.lastActivityType || "",
        deals: c.deals || [],
        dealId: c.deals?.[0]?.dealId || "",
        dealName: c.deals?.[0]?.dealName || "",
        isPrimary: c.isPrimaryContact || false,
        isFavorite: false,
        lastContacted: c.lastContactedAt || c.updatedAt,
        linkedin: c.linkedInUrl || "",
        notes: c.notes || "",
      }));
      setContacts(mapped);
      setLoadError(null);
    } catch (error) {
      console.error("Network error:", error);
      setLoadError("Failed to load contacts");
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const data = await getClientEntities();
      setClients(
        data.map((c: any) => ({
          id: String(c.id ?? c.Id ?? ""),
          clientName: c.clientName ?? c.ClientName ?? c.name ?? "",
        }))
      );
    } catch (error) {
      console.error("Failed to fetch clients for dropdown");
    }
  };

  const fetchDeals = async () => {
    try {
      const data = await getProjects({ limit: 200 });
      setDeals(
        (data || []).map((deal: any) => ({
          id: String(deal.id ?? ""),
          name: deal.name ?? deal.projectName ?? deal.dealName ?? "Untitled Deal",
        }))
      );
    } catch (error) {
      console.error("Failed to fetch deals for dropdown");
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees({ limit: 200 });
      setEmployees(
        (data || []).map((employee: any) => ({
          id: String(employee.id ?? ""),
          name: getEmployeeName(employee),
        }))
      );
    } catch (error) {
      console.error("Failed to fetch employees for dropdown");
    }
  };

  const getContactErrorMessage = (error: any, fallback: string) => {
    const responseData = error?.response?.data;
    const validationErrors = responseData?.details?.errors;

    if (validationErrors && typeof validationErrors === "object") {
      for (const value of Object.values(validationErrors)) {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
          return value[0];
        }
      }
    }

    return responseData?.message || error?.message || fallback;
  };

  const handleAddContact = async (data: Partial<Contact>) => {
    try {
      const payload = {
        contactName: normalizeWhitespace(data.contactPerson) || "",
        firstName: normalizeWhitespace(data.firstName) || undefined,
        lastName: normalizeWhitespace(data.lastName) || undefined,
        companyId: data.clientId ? String(data.clientId) : undefined,
        dealId: data.dealId ? String(data.dealId) : undefined,
        type: toContactTypePayload(data.type),
        jobTitle: data.designation?.trim() || undefined,
        department: data.department?.trim() || undefined,
        email: data.contactEmail ? normalizeEmailAddress(data.contactEmail) : "",
        officePhone: data.contactNo?.trim() || undefined,
        mobilePhone: data.mobile?.trim() || undefined,
        linkedInUrl: data.linkedin?.trim() || undefined,
        relationshipStatus: data.relationshipStatus || "Active",
        roleInBuyingProcess: data.roleInBuyingProcess || undefined,
        seniorityLevel: data.seniorityLevel || undefined,
        buyingAuthorityScore: data.buyingAuthorityScore || undefined,
        secondaryEmail: data.secondaryEmail ? normalizeEmailAddress(data.secondaryEmail) : undefined,
        alternatePhone: data.alternatePhone?.trim() || undefined,
        preferredContactMethod: data.preferredContactMethod || undefined,
        timeZone: data.timeZone?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        tags: data.tags || [],
        assignedToId: data.assignedToId || undefined,
        isPrimaryContact: data.isPrimary || false,
      };
      await api.post("/contacts", payload);
      toast({
        title: "Success",
        description: "Contact added successfully",
      });
      // Refresh from API to get server-generated data
      fetchContacts();
      return true;
    } catch (error: any) {
      console.error("Add contact error:", error);
      toast({
        title: "Error",
        description: getContactErrorMessage(error, "Failed to add contact."),
        variant: "destructive",
      });
      return false;
    }
  };

  const handleUpdateContact = async (data: Partial<Contact>) => {
    if (!editingContact) return false;
    try {
      const payload: Record<string, any> = {};
      if (data.contactPerson !== undefined) payload.contactName = normalizeWhitespace(data.contactPerson);
      if (data.firstName !== undefined) payload.firstName = normalizeWhitespace(data.firstName);
      if (data.lastName !== undefined) payload.lastName = normalizeWhitespace(data.lastName);
      if (data.clientId !== undefined) payload.companyId = data.clientId ? String(data.clientId) : null;
      if (data.dealId !== undefined) payload.dealId = data.dealId ? String(data.dealId) : null;
      if (data.type !== undefined) payload.type = toContactTypePayload(data.type);
      if (data.designation !== undefined) payload.jobTitle = data.designation?.trim() || null;
      if (data.department !== undefined) payload.department = data.department?.trim() || null;
      if (data.contactEmail !== undefined) payload.email = data.contactEmail ? normalizeEmailAddress(data.contactEmail) : data.contactEmail;
      if (data.contactNo !== undefined) payload.officePhone = data.contactNo?.trim() || null;
      if (data.mobile !== undefined) payload.mobilePhone = data.mobile?.trim() || null;
      if (data.linkedin !== undefined) payload.linkedInUrl = data.linkedin?.trim() || null;
      if (data.relationshipStatus !== undefined) payload.relationshipStatus = data.relationshipStatus || null;
      if (data.roleInBuyingProcess !== undefined) payload.roleInBuyingProcess = data.roleInBuyingProcess || null;
      if (data.seniorityLevel !== undefined) payload.seniorityLevel = data.seniorityLevel || null;
      if (data.buyingAuthorityScore !== undefined) payload.buyingAuthorityScore = data.buyingAuthorityScore || null;
      if (data.secondaryEmail !== undefined) payload.secondaryEmail = data.secondaryEmail ? normalizeEmailAddress(data.secondaryEmail) : null;
      if (data.alternatePhone !== undefined) payload.alternatePhone = data.alternatePhone?.trim() || null;
      if (data.preferredContactMethod !== undefined) payload.preferredContactMethod = data.preferredContactMethod || null;
      if (data.timeZone !== undefined) payload.timeZone = data.timeZone?.trim() || null;
      if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;
      if (data.tags !== undefined) payload.tags = data.tags || [];
      if (data.assignedToId !== undefined) payload.assignedToId = data.assignedToId || null;
      if (data.isPrimary !== undefined) payload.isPrimaryContact = data.isPrimary;

      await api.put(`/contacts/${editingContact.id}`, payload);
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      fetchContacts();
      return true;
    } catch (error: any) {
      console.error("Update contact error:", error);
      toast({
        title: "Error",
        description: getContactErrorMessage(error, "Failed to update contact."),
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/contacts/${contactToDelete.id}`);
      setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id));
      toast({
        title: "Deleted",
        description: `${contactToDelete.contactPerson} has been deleted.`,
      });
    } catch (error: any) {
      console.error("Delete contact error:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete contact",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  // ============================================
  // FILTERING & SORTING
  // ============================================

  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.contactPerson.toLowerCase().includes(term) ||
          c.clientName.toLowerCase().includes(term) ||
          c.contactEmail.toLowerCase().includes(term) ||
          c.designation?.toLowerCase().includes(term)
      );
    }

    // Type Filter
    if (filterType !== "all") {
      result = result.filter((c) => c.type === filterType);
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof Contact] || "";
        const bVal = b[sortConfig.key as keyof Contact] || "";
        return sortConfig.direction === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return result;
  }, [contacts, searchTerm, filterType, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const responsiveColumns = useMemo(() => {
    if (!isTablet) return columns;
    const allowed = new Set(["contactPerson", "clientName", "designation", "contactEmail", "contactNo", "type"]);
    return columns.map((column) => ({
      ...column,
      visible: column.visible && allowed.has(column.key),
    }));
  }, [columns, isTablet]);

  // Stats
  const stats = useMemo(() => ({
    total: contacts.length,
    clients: contacts.filter((c) => c.type === "Client").length,
    prospects: contacts.filter((c) => c.type === "Prospect").length,
    primary: contacts.filter((c) => c.isPrimary).length,
  }), [contacts]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc" ? { key, direction: "desc" } : null;
      }
      return { key, direction: "asc" };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(paginatedContacts.map((c) => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts((prev) => [...prev, id]);
    } else {
      setSelectedContacts((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleToggleFavorite = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
  };

  const handleSendEmail = (contact: Contact) => {
    window.location.href = `mailto:${contact.contactEmail}`;
  };

  const handleCall = (contact: Contact) => {
    window.location.href = `tel:${contact.contactNo}`;
  };

  const handleExportCsv = () => {
    const headers = ["Name", "Company", "Job Title", "Email", "Phone", "Type", "Owner", "Last Contacted"];
    const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredContacts.map((contact) => [
      contact.contactPerson,
      contact.clientName,
      contact.designation,
      contact.contactEmail,
      contact.contactNo || contact.mobile,
      contact.type,
      contact.assignedToName,
      contact.lastContacted ? new Date(contact.lastContacted).toISOString() : "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openContactClientDetail = (contact: Contact) => {
    setViewingContact(contact);
  };

  const openAddDialog = () => {
    setEditingContact(null);
    setContactDialogOpen(true);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setContactDialogOpen(true);
  };

  const { handlers, pullDistance, isRefreshing } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: fetchContacts,
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className="min-h-screen bg-[#F8FAFC]"
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
    >

      <main
        className={cn(
          "flex-1 transition-all duration-300"
        )}
      >
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
        {/* Header */}
        <header className="crm-module-header sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]/50">
          <div className="flex h-20 items-center justify-between px-6">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-[#475569] hover:text-[#0891B2] transition-colors"
              >
                Dashboard
              </button>
              <ChevronRight size={14} className="text-[#475569]" />
              <span className="font-semibold text-[#0891B2]">Contacts</span>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openAddDialog}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0891B2] text-white text-sm font-medium rounded-md  hover:bg-[#0891B2]/90 transition-colors"
              >
                <UserPlus size={16} />
                <span>{isMobile ? "Add" : "Add Contact"}</span>
              </motion.button>

              <NotificationBell
                buttonClassName="border-0 bg-white/5 p-2.5 text-[#475569] hover:bg-slate-200"
                iconSize={18}
              />

              <div className="flex items-center gap-3 pl-3 ml-3 border-l border-[rgba(15,23,42,0.06)]">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                  </p>
                  <p className="text-xs text-[#475569]">Administrator</p>
                </div>
                <div className="h-11 w-11 rounded-md bg-[#0891B2] flex items-center justify-center text-[#0F172A] font-bold card-shadow">
                  {user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : "GU"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("relative overflow-hidden rounded-3xl bg-[#F1F5F9]", isMobile ? "p-4" : "p-8")}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0891B2]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-[#D97706]/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mb-3"
                >
                  <Sparkles size={20} className="text-[#D97706]" />
                  <span className="text-[#D97706] text-sm font-medium">
                    Contact Management
                  </span>
                </motion.div>
                <div className="flex items-center justify-between gap-3">
                  <h1 className="mb-2 text-2xl font-bold text-[#0F172A] lg:text-4xl">
                    Client <span className="text-[#0891B2]">Contacts</span>
                  </h1>
                  {isMobile ? (
                    <button
                      type="button"
                      onClick={() => setIsHeroCollapsed((value) => !value)}
                      className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#0F172A]"
                    >
                      {isHeroCollapsed ? "Expand" : "Collapse"}
                    </button>
                  ) : null}
                </div>
                <p className={cn("max-w-xl text-[#475569]", isMobile ? "text-sm" : "text-lg", isHeroCollapsed && isMobile && "hidden")}>
                  Manage your business contacts. You have{" "}
                  <span className="text-[#0891B2] font-semibold">
                    {stats.total} contacts
                  </span>{" "}
                  in your directory.
                </p>
              </div>

              {/* Quick Actions */}
              <div className={cn("flex gap-3", isHeroCollapsed && isMobile && "hidden")}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-[rgba(15,23,42,0.06)] text-[#0F172A] rounded-md hover:bg-white/20 transition-colors"
                    >
                      <Download size={16} />
                      Export
                      <ChevronDown size={14} />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-md">
                    <DropdownMenuItem className="rounded-md" onSelect={handleExportCsv}>
                      <FileText size={14} className="mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className={cn("gap-4", isMobile ? "flex overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]" : "grid grid-cols-2 md:grid-cols-4")}>
            <StatCard
              title="Total Contacts"
              value={stats.total}
              subtitle="All contacts"
              icon={Users}
              color="teal"
              delay={0}
            />
            <StatCard
              title="Client Contacts"
              value={stats.clients}
              subtitle="Active clients"
              icon={Building2}
              color="navy"
              delay={0.1}
            />
            <StatCard
              title="Prospect Contacts"
              value={stats.prospects}
              subtitle="Potential customers"
              icon={UserPlus}
              color="gold"
              delay={0.2}
            />
            <StatCard
              title="Primary Contacts"
              value={stats.primary}
              subtitle="Main contacts"
              icon={Star}
              color="purple"
              delay={0.3}
            />
          </div>

          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4"
          >
            {isMobile ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 rounded-xl border-[rgba(15,23,42,0.06)] pl-10 focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className="h-10 flex-1 rounded-xl border-[rgba(15,23,42,0.06)]"
                  >
                    <Filter size={14} className="mr-2" />
                    Filters
                  </Button>
                  <div className="flex items-center rounded-xl bg-[#F8FAFC] p-1">
                    <button
                      onClick={() => setViewMode("table")}
                      className={cn("rounded-lg p-2 transition-colors", viewMode === "table" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#475569]")}
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn("rounded-lg p-2 transition-colors", viewMode === "grid" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#475569]")}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchContacts} disabled={isLoading} className="h-10 w-10 rounded-xl border-[rgba(15,23,42,0.06)]">
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64 h-10 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-36 h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="rounded-md">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(searchTerm || filterType !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterType("all");
                      }}
                      className="h-10 text-[#94A3B8] hover:text-red-600"
                    >
                      <X size={14} className="mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <AnimatePresence>
                    {selectedContacts.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#0891B2]/10 rounded-md"
                      >
                        <span className="text-sm font-medium text-[#0891B2]">{selectedContacts.length} selected</span>
                        <Button size="sm" variant="ghost" className="h-7 text-red-600 hover:bg-red-100">
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedContacts([])} className="h-7">
                          <X size={14} />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                        <Columns size={14} className="mr-2" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 rounded-md">
                      <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                      {columns.map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col.key}
                          checked={col.visible}
                          onCheckedChange={(checked) => {
                            setColumns((prev) =>
                              prev.map((c) => (c.key === col.key ? { ...c, visible: checked } : c))
                            );
                          }}
                          className="rounded-md"
                        >
                          {col.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex items-center bg-white/5 rounded-md p-1">
                    <button
                      onClick={() => setViewMode("table")}
                      className={cn("p-2 rounded-md transition-colors", viewMode === "table" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#475569] hover:text-[#475569]")}
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn("p-2 rounded-md transition-colors", viewMode === "grid" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#475569] hover:text-[#475569]")}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchContacts} disabled={isLoading} className="h-10 w-10 rounded-md border-[rgba(15,23,42,0.06)]">
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {isOffline && contacts.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You&apos;re offline. Showing the latest loaded contact data.
            </div>
          ) : null}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
          >
            {isLoading ? (
              <div className="p-4 md:p-6">
                <ListCardSkeleton rows={isMobile ? 4 : 3} />
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                  <Trash2 className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A]">Couldn&apos;t load contacts</h3>
                <p className="mt-2 text-sm text-[#94A3B8]">{loadError}</p>
                <Button onClick={fetchContacts} className="mt-5 rounded-xl bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
                  Retry
                </Button>
              </div>
            ) : isOffline && contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                  <RefreshCw className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A]">You&apos;re offline</h3>
                <p className="mt-2 text-sm text-[#94A3B8]">Reconnect to load the latest contact list.</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-md bg-white/5 flex items-center justify-center mb-4">
                  <Users size={32} className="text-[#475569]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                  No contacts found
                </h3>
                <p className="text-[#94A3B8] mb-4">
                  {searchTerm || filterType !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by adding your first contact"}
                </p>
                <Button
                  onClick={() =>
                    searchTerm || filterType !== "all"
                      ? (() => {
                        setSearchTerm("");
                        setFilterType("all");
                      })()
                      : openAddDialog()
                  }
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                >
                  {searchTerm || filterType !== "all" ? (
                    <>
                      <X size={16} className="mr-2" />
                      Clear Filters
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="mr-2" />
                      Add Contact
                    </>
                  )}
                </Button>
              </div>
            ) : isMobile ? (
              <div className="space-y-3 p-3">
                <AnimatePresence mode="popLayout">
                  {paginatedContacts.map((contact) => (
                    <MobileContactCard
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedContacts.includes(contact.id)}
                      onSelect={(checked) => handleSelectContact(contact.id, checked)}
                      onView={() => openContactClientDetail(contact)}
                      onDelete={() => {
                        setContactToDelete(contact);
                        setDeleteDialogOpen(true);
                      }}
                      onSendEmail={() => handleSendEmail(contact)}
                      onCall={() => handleCall(contact)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : viewMode === "table" ? (
              /* Table View */
              <div className="responsive-table">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F8FAFC]/80 border-b border-[rgba(15,23,42,0.06)]">
                      {/* Checkbox Header */}
                      <th className="py-4 px-4 text-left">
                        <Checkbox
                          checked={
                            paginatedContacts.length > 0 &&
                            selectedContacts.length === paginatedContacts.length
                          }
                          onCheckedChange={handleSelectAll}
                          className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                        />
                      </th>

                      {/* Favorite Header */}
                      <th className="py-4 px-2 text-left">
                        <Star size={14} className="text-[#475569]" />
                      </th>

                      {/* Dynamic Column Headers */}
                      {responsiveColumns.filter((c) => c.visible).map((col) => (
                        <th key={col.key} className="py-4 px-4 text-left">
                          {col.sortable ? (
                            <button
                              onClick={() => handleSort(col.key)}
                              className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider hover:text-[#0891B2] transition-colors group"
                            >
                              {col.label}
                              <ArrowUpDown
                                size={12}
                                className={cn(
                                  "transition-colors",
                                  sortConfig?.key === col.key
                                    ? "text-[#0891B2]"
                                    : "text-[#475569] group-hover:text-[#475569]"
                                )}
                              />
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                              {col.label}
                            </span>
                          )}
                        </th>
                      ))}

                      {/* Actions Header */}
                      <th className="py-4 px-4 text-right">
                        <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                          Actions
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {paginatedContacts.map((contact) => (
                        <ContactRow
                          key={contact.id}
                          contact={contact}
                          isSelected={selectedContacts.includes(contact.id)}
                          onSelect={(checked) => handleSelectContact(contact.id, checked)}
                          onView={() => openContactClientDetail(contact)}
                          onEdit={() => openEditDialog(contact)}
                          onDelete={() => {
                            setContactToDelete(contact);
                            setDeleteDialogOpen(true);
                          }}
                          onToggleFavorite={() => handleToggleFavorite(contact.id)}
                          onSendEmail={() => handleSendEmail(contact)}
                          onCall={() => handleCall(contact)}
                          columns={responsiveColumns}
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
                    {paginatedContacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        isSelected={selectedContacts.includes(contact.id)}
                        onSelect={(checked) => handleSelectContact(contact.id, checked)}
                        onView={() => openContactClientDetail(contact)}
                        onEdit={() => openEditDialog(contact)}
                        onDelete={() => {
                          setContactToDelete(contact);
                          setDeleteDialogOpen(true);
                        }}
                        onToggleFavorite={() => handleToggleFavorite(contact.id)}
                        onSendEmail={() => handleSendEmail(contact)}
                        onCall={() => handleCall(contact)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Pagination */}
            {filteredContacts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/50">
                {/* Results Info */}
                <div className="flex items-center gap-4">
                  <p className="text-sm text-[#94A3B8]">
                    Showing{" "}
                    <span className="font-semibold text-[#0F172A]">
                      {(currentPage - 1) * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-[#0F172A]">
                      {Math.min(currentPage * pageSize, filteredContacts.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-[#0F172A]">
                      {filteredContacts.length}
                    </span>{" "}
                    contacts
                  </p>

                  {/* Page Size Selector */}
                  {!isMobile ? (
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20 h-8 rounded-md border-[rgba(15,23,42,0.06)] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        {[10, 25, 50, 100].map((size) => (
                          <SelectItem key={size} value={String(size)} className="rounded-md">
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                  {/* First Page */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-md border-[rgba(15,23,42,0.06)]"
                  >
                    <ChevronsLeft size={14} />
                  </Button>

                  {/* Previous Page */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-md border-[rgba(15,23,42,0.06)]"
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
                            "h-8 w-8 rounded-md text-sm font-medium transition-colors",
                            currentPage === pageNum
                              ? "bg-[#0891B2] text-white"
                              : "text-[#475569] hover:bg-white/10"
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
                    className="h-8 w-8 rounded-md border-[rgba(15,23,42,0.06)]"
                  >
                    <ChevronRight size={14} />
                  </Button>

                  {/* Last Page */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-md border-[rgba(15,23,42,0.06)]"
                  >
                    <ChevronsRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-[rgba(15,23,42,0.06)] bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#475569]">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-semibold text-[#0F172A]">Yoursoft</span>
              <span className="text-[#0891B2] font-semibold">Digital</span>
              <span>• All rights reserved</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[#0891B2] transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-[#0891B2] transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-[#0891B2] transition-colors">
                Support
              </a>
            </div>
          </div>
        </footer>

        {isMobile ? (
          <>
            <button
              type="button"
              onClick={openAddDialog}
              className="mobile-create-fab fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0891B2] text-white shadow-xl transition-transform active:scale-95"
              aria-label="Add Contact"
            >
              <UserPlus size={22} />
            </button>
            <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
              <DrawerContent className="max-h-[80vh] rounded-t-[24px] border-none bg-white">
                <DrawerHeader className="px-5 pb-2 text-left">
                  <DrawerTitle className="text-[#0F172A]">Filter Contacts</DrawerTitle>
                  <DrawerDescription>
                    Narrow the contact list by contact type.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="space-y-4 px-5 pb-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-11 rounded-xl border-[rgba(15,23,42,0.06)]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        {typeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="rounded-md">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DrawerFooter className="border-t border-[rgba(15,23,42,0.06)] px-5 pb-6 pt-4">
                  <Button onClick={() => setIsFilterDrawerOpen(false)} className="h-11 rounded-xl bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
                    Apply Filters
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterType("all");
                      setIsFilterDrawerOpen(false);
                    }}
                    className="h-11 rounded-xl"
                  >
                    Clear Filters
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </>
        ) : null}
      </main>

      <Dialog open={Boolean(viewingContact)} onOpenChange={() => setViewingContact(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-md sm:max-w-[920px]">
          {viewingContact ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#0F172A]">{viewingContact.contactPerson || "Contact"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-[0.9fr,1.1fr]">
                <section className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Contact Profile</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <ContactDetailRow label="Email" value={viewingContact.contactEmail || "-"} />
                    <ContactDetailRow label="Phone" value={viewingContact.contactNo || viewingContact.mobile || "-"} />
                    <ContactDetailRow label="Job Title" value={viewingContact.designation || "-"} />
                    <ContactDetailRow label="Department" value={viewingContact.department || "-"} />
                    <ContactDetailRow label="Preferred Method" value={viewingContact.preferredContactMethod || "-"} />
                    <ContactDetailRow label="Time Zone" value={viewingContact.timeZone || "-"} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Decision Maker", "Influencer", "User", "Gatekeeper"].map((role) => (
                      <span
                        key={role}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-semibold",
                          viewingContact.roleInBuyingProcess === role
                            ? "border-[#0891B2] bg-[#F0FDFA] text-[#0F766E]"
                            : "border-[rgba(15,23,42,0.06)] bg-white text-[#64748B]",
                        )}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleSendEmail(viewingContact)}><Mail className="mr-1.5 h-4 w-4" />Send Email</Button>
                    <Button size="sm" variant="outline" onClick={() => handleCall(viewingContact)}><Phone className="mr-1.5 h-4 w-4" />Call</Button>
                    <Button size="sm" onClick={() => openEditDialog(viewingContact)} className="bg-[#0891B2] hover:bg-[#0E7490]"><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
                  </div>
                </section>
                <section className="space-y-4">
                  <div className="rounded-md border border-[#B2F5EA] bg-[#F0FDFA] p-4">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Linked Records</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <LinkedContactBox label="Organization" value={viewingContact.clientName || "Not linked"} action={viewingContact.clientId ? () => navigate(`/client-list/${viewingContact.clientId}`) : undefined} />
                      <LinkedContactBox
                        label="Primary Deal"
                        value={viewingContact.dealName || "Create Deal"}
                        action={() => navigate(viewingContact.dealId
                          ? `/deals?dealId=${viewingContact.dealId}`
                          : `/deals?create=1&contactId=${viewingContact.id}${viewingContact.clientId ? `&clientId=${viewingContact.clientId}` : ""}`)}
                      />
                      <LinkedContactBox label="Tasks" value="Create / View Tasks" action={() => navigate(`/tasks?contactId=${viewingContact.id}`)} />
                      <LinkedContactBox label="Meetings" value="Calendar" action={() => navigate("/calendar")} />
                      <LinkedContactBox label="Emails" value={viewingContact.contactEmail || "Mailbox"} action={() => navigate("/letterbox")} />
                      <LinkedContactBox label="Documents" value="Contact Documents" action={() => navigate(`/documents?linkedEntityType=Contact&linkedEntityId=${viewingContact.id}`)} />
                      <LinkedContactBox label="Proposals" value="Related Proposals" action={() => navigate(`/proposals?contactId=${viewingContact.id}`)} />
                      <LinkedContactBox label="Invoices & Payments" value="Billing History" action={() => navigate(`/invoice/list?contactId=${viewingContact.id}`)} />
                      <LinkedContactBox label="Notes" value={viewingContact.notes || "No notes yet"} />
                    </div>
                  </div>
                  <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
                    <h3 className="mb-3 text-sm font-semibold text-[#0F172A]">Activity Timeline</h3>
                    <ActivityTimeline entityType="Contact" entityId={viewingContact.id} />
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* ADD/EDIT CONTACT DIALOG */}
      {/* ============================================ */}
      <ContactDialog
        isOpen={contactDialogOpen}
        onClose={() => {
          setContactDialogOpen(false);
          setEditingContact(null);
        }}
        onSubmit={editingContact ? handleUpdateContact : handleAddContact}
        contact={editingContact}
        clients={clients}
        deals={deals}
        employees={employees}
      />

      {/* ============================================ */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ============================================ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-md bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-[#0F172A]">
              Delete Contact
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#0F172A]">
                {contactToDelete?.contactPerson}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-md border-[rgba(15,23,42,0.06)]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-[#0F172A] rounded-md"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Contact
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================ */}
      {/* CONTACT QUICK VIEW MODAL */}
      {/* ============================================ */}
      {/* You can add a quick view modal similar to ClientListPage if needed */}

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

export default ClientContactListPage;
