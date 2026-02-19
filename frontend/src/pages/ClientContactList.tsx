// src/pages/ClientContactList.tsx
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
import { Label } from "@/components/ui/label";
import { getClients as getClientEntities } from "@/features/clients";
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
  Upload,
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
  FileSpreadsheet,
  FileText,
  Columns,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// CONFIGURATION
// ============================================

// ============================================
// TYPES
// ============================================

interface Contact {
  id: number;
  type: string;
  clientName: string;
  clientId?: number;
  contactPerson: string;
  designation: string;
  department?: string;
  contactEmail: string;
  contactNo: string;
  mobile?: string;
  linkedin?: string;
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
  { value: "Lead", label: "Lead" },
  { value: "Partner", label: "Partner" },
  { value: "Vendor", label: "Vendor" },
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
    Client: { bg: "bg-[#23D3EE]/10", text: "text-[#23D3EE]", dot: "bg-[#23D3EE]" },
    Lead: { bg: "bg-[#FBBF23]/10", text: "text-[#FBBF23]", dot: "bg-[#FBBF23]" },
    Partner: { bg: "bg-purple-500/10", text: "text-purple-500", dot: "bg-purple-500" },
    Vendor: { bg: "bg-blue-500/10", text: "text-blue-500", dot: "bg-blue-500" },
  };
  return colors[type] || colors.Client;
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
    teal: { bg: "bg-[#23D3EE]", light: "bg-[#23D3EE]/10", text: "text-[#23D3EE]" },
    gold: { bg: "bg-[#FBBF23]", light: "bg-[#FBBF23]/10", text: "text-[#FBBF23]" },
    navy: { bg: "bg-[#0F172A]", light: "bg-[#0F172A]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
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
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.light)}>
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
          {contact.isFavorite ? (
            <Star size={16} className="text-[#FBBF23] fill-[#FBBF23]" />
          ) : (
            <StarOff size={16} className="text-slate-300 group-hover:text-slate-400" />
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
                  className="w-10 h-10 rounded-xl object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(contact.contactPerson)}
                </div>
              )}
              {contact.isPrimary && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#23D3EE] rounded-full flex items-center justify-center">
                  <CheckCircle2 size={10} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors flex items-center gap-2">
                {contact.contactPerson || "Unknown"}
                {contact.isPrimary && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#23D3EE]/10 text-[#23D3EE]">
                    Primary
                  </span>
                )}
              </div>
              {contact.department && (
                <div className="text-xs text-slate-400">{contact.department}</div>
              )}
            </div>
          </div>
        </td>
      )}

      {/* Company */}
      {columns.find((c) => c.key === "clientName")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">
              {contact.clientName}
            </span>
          </div>
        </td>
      )}

      {/* Designation */}
      {columns.find((c) => c.key === "designation")?.visible && (
        <td className="py-4 px-4">
          <span className="text-sm text-slate-600">
            {contact.designation || "-"}
          </span>
        </td>
      )}

      {/* Email */}
      {columns.find((c) => c.key === "contactEmail")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-slate-400" />
            <a
              href={`mailto:${contact.contactEmail}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-slate-600 hover:text-[#23D3EE] transition-colors"
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
            <Phone size={14} className="text-slate-400" />
            <a
              href={`tel:${contact.contactNo}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-slate-600 hover:text-[#23D3EE] transition-colors"
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
            isOverdue ? "text-red-600" : "text-slate-600"
          )}>
            <Clock size={14} className={isOverdue ? "text-red-400" : "text-slate-400"} />
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
            className="p-2 rounded-lg hover:bg-[#23D3EE]/10 text-[#23D3EE] transition-colors"
            title="Send Email"
          >
            <Send size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCall}
            className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
            title="Call"
          >
            <PhoneCall size={16} />
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
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                <Pencil size={14} className="mr-2" />
                Edit Contact
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg">
                <Video size={14} className="mr-2" />
                Schedule Meeting
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <MessageSquare size={14} className="mr-2" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Copy size={14} className="mr-2" />
                Copy Email
              </DropdownMenuItem>
              {contact.linkedin && (
                <DropdownMenuItem className="rounded-lg">
                  <Linkedin size={14} className="mr-2" />
                  View LinkedIn
                </DropdownMenuItem>
              )}
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
            {contact.avatar ? (
              <img
                src={contact.avatar}
                alt={contact.contactPerson}
                className="w-14 h-14 rounded-xl object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#23D3EE] to-[#6366F1] flex items-center justify-center text-white font-bold text-lg">
                {getInitials(contact.contactPerson)}
              </div>
            )}
            {contact.isPrimary && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#23D3EE] rounded-full flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {contact.isFavorite ? (
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
              <DropdownMenuItem onClick={onView} className="rounded-lg">
                <Eye size={14} className="mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                <Pencil size={14} className="mr-2" />
                Edit
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
      </div>

      {/* Contact Info */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-[#0F172A] group-hover:text-[#23D3EE] transition-colors">
            {contact.contactPerson || "Unknown"}
          </h3>
          {contact.isPrimary && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#23D3EE]/10 text-[#23D3EE]">
              Primary
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">{contact.designation || "No title"}</p>
        <div className="flex items-center gap-2 mt-1">
          <Building2 size={12} className="text-slate-400" />
          <span className="text-xs text-slate-500">{contact.clientName}</span>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-2 mb-4">
        <a
          href={`mailto:${contact.contactEmail}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#23D3EE] transition-colors"
        >
          <Mail size={14} className="text-slate-400" />
          <span className="truncate">{contact.contactEmail || "-"}</span>
        </a>
        <a
          href={`tel:${contact.contactNo}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#23D3EE] transition-colors"
        >
          <Phone size={14} className="text-slate-400" />
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
        <span className="text-xs text-slate-400">
          {getRelativeTime(contact.lastContacted)}
        </span>
      </div>

      {/* Quick Actions */}
      <div
        className="flex gap-2 pt-4 border-t border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          onClick={onSendEmail}
          className="flex-1 bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-lg h-9"
        >
          <Send size={14} className="mr-1" />
          Email
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCall}
          className="flex-1 rounded-lg h-9 border-slate-200"
        >
          <PhoneCall size={14} className="mr-1" />
          Call
        </Button>
      </div>
    </motion.div>
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
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Contact>) => void;
  contact?: Contact | null;
  clients: { id: number; clientName: string }[];
}) => {
  const [formData, setFormData] = useState({
    contactPerson: "",
    clientId: "",
    designation: "",
    department: "",
    contactEmail: "",
    contactNo: "",
    mobile: "",
    type: "Client",
    isPrimary: false,
    linkedin: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        contactPerson: contact.contactPerson || "",
        clientId: contact.clientId?.toString() || "",
        designation: contact.designation || "",
        department: contact.department || "",
        contactEmail: contact.contactEmail || "",
        contactNo: contact.contactNo || "",
        mobile: contact.mobile || "",
        type: contact.type || "Client",
        isPrimary: contact.isPrimary || false,
        linkedin: contact.linkedin || "",
        notes: contact.notes || "",
      });
    } else {
      setFormData({
        contactPerson: "",
        clientId: "",
        designation: "",
        department: "",
        contactEmail: "",
        contactNo: "",
        mobile: "",
        type: "Client",
        isPrimary: false,
        linkedin: "",
        notes: "",
      });
    }
  }, [contact, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await onSubmit({
      ...formData,
      clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
    });

    setIsLoading(false);
    onClose();
  };

  const isEditMode = Boolean(contact);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#23D3EE]/10 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {isEditMode ? "Edit Contact" : "Add New Contact"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Contact Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-sm font-medium text-slate-600">
                Contact Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                />
              </div>
            </div>
          </div>

          {/* Company & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Company</Label>
              <Select
                value={formData.clientId}
                onValueChange={(val) => setFormData({ ...formData, clientId: val })}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)} className="rounded-lg">
                      {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {typeOptions.filter((t) => t.value !== "all").map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Designation & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Job Title</Label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="CEO, Manager..."
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Sales, Marketing..."
                className="h-11 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">
              Email <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="john@company.com"
                required
                className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
              />
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Office Phone</Label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={formData.contactNo}
                  onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Mobile</Label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                />
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">LinkedIn URL</Label>
            <div className="relative">
              <Linkedin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="h-11 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
              />
            </div>
          </div>

          {/* Primary Contact Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-[#0F172A]">Primary Contact</p>
              <p className="text-xs text-slate-500">Set as the main contact for this company</p>
            </div>
            <Checkbox
              checked={formData.isPrimary}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPrimary: checked as boolean })
              }
              className="border-slate-300 data-[state=checked]:bg-[#23D3EE] data-[state=checked]:border-[#23D3EE]"
            />
          </div>

          {/* Actions */}
          <DialogFooter className="gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.contactPerson.trim() || !formData.contactEmail.trim()}
              className="bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-xl shadow-lg shadow-[#23D3EE]/25"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : null}
              {isEditMode ? "Update Contact" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
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

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<{ id: number; clientName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [user, setUser] = useState<User | null>(null);

  // Dialogs
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, []);

  // ============================================
  // API CALLS
  // ============================================

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const data = await getClientEntities();
      const mapped = (data || []).map((c: any, index: number) => ({
        id: c.id ?? c.Id ?? index,
        type: c.type ?? c.Type ?? "Client",
        clientName: c.clientName ?? c.ClientName ?? c.name ?? c.Name ?? "",
        clientId: c.clientId ?? c.ClientId,
        contactPerson: c.primaryContactName ?? c.contactPerson ?? c.ContactPerson ?? "",
        designation: c.primaryContactDesignation ?? c.designation ?? c.Designation ?? "",
        department: c.department ?? "",
        contactEmail: c.primaryEmail ?? c.contactEmail ?? c.ContactEmail ?? c.email ?? "",
        contactNo: c.primaryContactPhone ?? c.contactNo ?? c.ContactNo ?? c.phone ?? "",
        mobile: c.mobile ?? "",
        isPrimary: c.isPrimary ?? true,
        isFavorite: Math.random() > 0.7,
        lastContacted: c.lastInteractionDate ?? c.lastContacted,
        linkedin: c.linkedin ?? "",
        notes: c.notes ?? "",
      }));
      setContacts(mapped);
    } catch (error) {
      console.error("Network error:", error);
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
          id: c.id ?? c.Id,
          clientName: c.clientName ?? c.ClientName ?? c.name ?? "",
        }))
      );
    } catch (error) {
      console.error("Failed to fetch clients for dropdown");
    }
  };

  const handleAddContact = async (data: Partial<Contact>) => {
    try {
      // API call here
      const newContact: Contact = {
        id: Date.now(),
        type: data.type || "Client",
        clientName: clients.find((c) => c.id === data.clientId)?.clientName || "",
        clientId: data.clientId,
        contactPerson: data.contactPerson || "",
        designation: data.designation || "",
        department: data.department,
        contactEmail: data.contactEmail || "",
        contactNo: data.contactNo || "",
        mobile: data.mobile,
        isPrimary: data.isPrimary,
        isFavorite: false,
        linkedin: data.linkedin,
        notes: data.notes,
      };
      setContacts((prev) => [newContact, ...prev]);
      toast({
        title: "Success",
        description: "Contact added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
    }
  };

  const handleUpdateContact = async (data: Partial<Contact>) => {
    if (!editingContact) return;
    try {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === editingContact.id
            ? {
                ...c,
                ...data,
                clientName: data.clientId
                  ? clients.find((cl) => cl.id === data.clientId)?.clientName || c.clientName
                  : c.clientName,
              }
            : c
        )
      );
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id));
      toast({
        title: "Deleted",
        description: `${contactToDelete.contactPerson} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete contact",
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

  // Stats
  const stats = useMemo(() => ({
    total: contacts.length,
    clients: contacts.filter((c) => c.type === "Client").length,
    leads: contacts.filter((c) => c.type === "Lead").length,
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

  const handleSelectContact = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedContacts((prev) => [...prev, id]);
    } else {
      setSelectedContacts((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleToggleFavorite = (id: number) => {
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

  const openAddDialog = () => {
    setEditingContact(null);
    setContactDialogOpen(true);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setContactDialogOpen(true);
  };

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
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="flex h-20 items-center justify-between px-6">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-slate-400 hover:text-[#23D3EE] transition-colors"
              >
                Dashboard
              </button>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="font-semibold text-[#23D3EE]">Contacts</span>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openAddDialog}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#23D3EE] text-white text-sm font-medium rounded-xl shadow-lg shadow-[#23D3EE]/25 hover:bg-[#23D3EE]/90 transition-colors"
              >
                <UserPlus size={16} />
                <span>Add Contact</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  2
                </span>
              </motion.button>

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

        {/* Main Content */}
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
                    Contact Management
                  </span>
                </motion.div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  Client <span className="text-[#23D3EE]">Contacts</span>
                </h1>
                <p className="text-slate-300 text-lg max-w-xl">
                  Manage your business contacts. You have{" "}
                  <span className="text-[#23D3EE] font-semibold">
                    {stats.total} contacts
                  </span>{" "}
                  in your directory.
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
                    <DropdownMenuItem className="rounded-lg">
                      <FileText size={14} className="mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-lg">
                      <FileSpreadsheet size={14} className="mr-2" />
                      Export as Excel
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              title="Lead Contacts"
              value={stats.leads}
              subtitle="Potential clients"
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
            className="bg-white rounded-2xl border border-slate-200 p-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 h-10 pl-10 rounded-xl border-slate-200 focus:border-[#23D3EE] focus:ring-2 focus:ring-[#23D3EE]/20"
                  />
                </div>

                {/* Type Filter */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-36 h-10 rounded-xl border-slate-200">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear */}
                {(searchTerm || filterType !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterType("all");
                    }}
                    className="h-10 text-slate-500 hover:text-red-600"
                  >
                    <X size={14} className="mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Bulk Actions */}
                <AnimatePresence>
                  {selectedContacts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#23D3EE]/10 rounded-xl"
                    >
                      <span className="text-sm font-medium text-[#23D3EE]">
                        {selectedContacts.length} selected
                      </span>
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

                {/* Columns */}
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
                  onClick={fetchContacts}
                  disabled={isLoading}
                  className="h-10 w-10 rounded-xl border-slate-200"
                >
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                </Button>
              </div>
            </div>
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
                <p className="text-slate-500">Loading contacts...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Users size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                  No contacts found
                </h3>
                <p className="text-slate-500 mb-4">
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
                  className="bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white rounded-xl"
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
                            paginatedContacts.length > 0 &&
                            selectedContacts.length === paginatedContacts.length
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
                        <th key={col.key} className="py-4 px-4 text-left">
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
                      {paginatedContacts.map((contact) => (
                        <ContactRow
                          key={contact.id}
                          contact={contact}
                          isSelected={selectedContacts.includes(contact.id)}
                          onSelect={(checked) => handleSelectContact(contact.id, checked)}
                          onView={() => navigate(`/client-list/${contact.clientId || contact.id}`)}
                          onEdit={() => openEditDialog(contact)}
                          onDelete={() => {
                            setContactToDelete(contact);
                            setDeleteDialogOpen(true);
                          }}
                          onToggleFavorite={() => handleToggleFavorite(contact.id)}
                          onSendEmail={() => handleSendEmail(contact)}
                          onCall={() => handleCall(contact)}
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
                    {paginatedContacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        isSelected={selectedContacts.includes(contact.id)}
                        onSelect={(checked) => handleSelectContact(contact.id, checked)}
                        onView={() => navigate(`/client-list/${contact.clientId || contact.id}`)}
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
                      {Math.min(currentPage * pageSize, filteredContacts.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-[#0F172A]">
                      {filteredContacts.length}
                    </span>{" "}
                    contacts
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
      />

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
              Delete Contact
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
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
              className="rounded-xl border-slate-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
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
