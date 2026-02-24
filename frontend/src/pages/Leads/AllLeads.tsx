import React, { useState, useEffect, useMemo } from "react";
import { getLeads, createLead, updateLead, deleteLead, updateLeadStatus } from "@/features/leads";
import { createCalendarEvent } from "@/features/calendar";
import { getEmployees } from "@/features/users";
import { Sidebar } from "@/components/Sidebar";
import { AiInsightBadge, getLeadInsights } from "@/components/ai/AiInsightBadge";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
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
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  Briefcase,
  User,
  Users,
  UserPlus,
  UserCheck,
  Star,
  StarOff,
  Heart,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  PieChart,
  BarChart3,
  Activity,
  Zap,
  Sparkles,
  Tag,
  MessageSquare,
  Send,
  ExternalLink,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  ArrowRight,
  Flame,
  Thermometer,
  ThermometerSun,
  Snowflake,
  Video,
  MapPin,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// ============================================
// TYPES
// ============================================

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website?: string;
  location: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  score: number;
  temperature: "hot" | "warm" | "cold";
  value: number;
  currency: string;
  assignedTo: string;
  assignedToId?: string;
  tags?: string[];
  notes?: string;
  lastContact?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt?: string;
  avatar?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

interface LeadStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  totalValue: number;
  avgDealSize: number;
  hotLeads: number;
  coldLeads: number;
}

// ============================================
// CONSTANTS & DATA
// ============================================

const leadSources = [
  { id: "website", name: "Website", icon: Globe, color: "#3B82F6" },
  { id: "referral", name: "Referral", icon: Users, color: "#10B981" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { id: "cold_call", name: "Cold Call", icon: Phone, color: "#F59E0B" },
  { id: "email_campaign", name: "Email Campaign", icon: Mail, color: "#8B5CF6" },
  { id: "trade_show", name: "Trade Show", icon: Building2, color: "#EC4899" },
  { id: "social_media", name: "Social Media", icon: Twitter, color: "#06B6D4" },
  { id: "other", name: "Other", icon: Target, color: "#64748B" },
];

const leadStatuses = [
  { id: "new", name: "New", color: "#3B82F6", bgColor: "#EFF6FF" },
  { id: "contacted", name: "Contacted", color: "#8B5CF6", bgColor: "#F5F3FF" },
  { id: "qualified", name: "Qualified", color: "#F59E0B", bgColor: "#FFFBEB" },
  { id: "proposal", name: "Proposal", color: "#22D3EE", bgColor: "#F0FDFA" },
  { id: "negotiation", name: "Negotiation", color: "#EC4899", bgColor: "#FDF2F8" },
  { id: "won", name: "Won", color: "#10B981", bgColor: "#ECFDF5" },
  { id: "lost", name: "Lost", color: "#EF4444", bgColor: "#FEF2F2" },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount: number, currency: string = "CAD"): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

const getStatusInfo = (statusId: string) => {
  return leadStatuses.find((s) => s.id === statusId) || leadStatuses[0];
};

const getSourceInfo = (sourceId: string) => {
  return leadSources.find((s) => s.id === sourceId) || leadSources[7];
};

const getTemperatureInfo = (temp: string) => {
  switch (temp) {
    case "hot":
      return { icon: Flame, color: "#EF4444", bg: "#FEF2F2", label: "Hot" };
    case "warm":
      return { icon: ThermometerSun, color: "#F59E0B", bg: "#FFFBEB", label: "Warm" };
    case "cold":
      return { icon: Snowflake, color: "#3B82F6", bg: "#EFF6FF", label: "Cold" };
    default:
      return { icon: Thermometer, color: "#64748B", bg: "#F1F5F9", label: "Unknown" };
  }
};

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
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
  suffix = "",
  delay = 0,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all overflow-hidden group"
    >
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">
            {prefix}
            {typeof value === "number" ? value.toLocaleString() : value}
            {suffix}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <ArrowUpRight size={14} className="text-green-500" />
              ) : (
                <ArrowDownRight size={14} className="text-red-500" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  change >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {Math.abs(change)}%
              </span>
              {changeLabel && <span className="text-xs text-[#475569]">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// LEAD CARD COMPONENT (GRID VIEW)
// ============================================

const LeadCard = ({
  lead,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  delay = 0,
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Lead["status"]) => void;
  delay?: number;
}) => {
  const statusInfo = getStatusInfo(lead.status);
  const sourceInfo = getSourceInfo(lead.source);
  const tempInfo = getTemperatureInfo(lead.temperature);
  const TempIcon = tempInfo.icon;
  const SourceIcon = sourceInfo.icon;

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
      {/* Selection & Actions */}
      <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => {
            onSelect();
          }}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE] bg-white"
        />
      </div>

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
              <Pencil size={14} className="mr-2" /> Edit Lead
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-md">
              <Mail size={14} className="mr-2" /> Send Email
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-md">
              <Phone size={14} className="mr-2" /> Call
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Temperature Badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: tempInfo.bg, color: tempInfo.color }}
        >
          <TempIcon size={12} />
          {tempInfo.label}
        </span>
      </div>

      {/* Card Content */}
      <div className="p-5 pt-12">
        {/* Avatar & Basic Info */}
        <div className="text-center mb-4">
          <div className="relative inline-block mb-3">
            <Avatar className="h-16 w-16 border-2 border-white card-shadow">
              <AvatarImage src={lead.avatar} />
              <AvatarFallback className="bg-[#F1F5F9]/70 text-[#0F172A] font-bold">
                {getInitials(lead.firstName, lead.lastName)}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
              style={{ backgroundColor: sourceInfo.color }}
            >
              <SourceIcon size={12} className="text-[#0F172A]" />
            </div>
          </div>
          <h3 className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
            {lead.firstName} {lead.lastName}
          </h3>
          <p className="text-sm text-[#94A3B8]">{lead.jobTitle}</p>
          <p className="text-xs text-[#475569]">{lead.company}</p>
        </div>

        {/* Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#94A3B8]">Lead Score</span>
            <span className="text-sm font-bold" style={{ color: getScoreColor(lead.score) }}>
              {lead.score}%
            </span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${lead.score}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: getScoreColor(lead.score) }}
            />
          </div>
        </div>

        {/* Value */}
        <div className="text-center mb-4">
          <span className="text-xl sm:text-2xl font-bold text-[#0F172A]">
            {formatCurrency(lead.value, lead.currency)}
          </span>
          <p className="text-xs text-[#475569]">Potential Value</p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center mb-4">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium"
            style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: statusInfo.color }}
            />
            {statusInfo.name}
          </span>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <Mail size={14} className="text-[#475569]" />
            <span className="truncate">{lead.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <MapPin size={14} className="text-[#475569]" />
            <span className="truncate">{lead.location}</span>
          </div>
        </div>

        {/* Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {lead.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-white/5 text-[#94A3B8] rounded-md text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* AI Insight Badges */}
        {(() => {
          const insights = getLeadInsights(lead);
          return insights.length > 0 ? (
            <div className="flex flex-wrap gap-1 mb-4 justify-center">
              {insights.map((type) => (
                <AiInsightBadge key={type} type={type} />
              ))}
            </div>
          ) : null;
        })()}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-white/5">{lead.assignedTo?.split(" ").map((n: string) => n[0]).join("") || "?"}</AvatarFallback>

            </Avatar>
            <span className="text-xs text-[#475569]">{lead.assignedTo}</span>
          </div>
          <span className="text-xs text-[#475569]">{getRelativeTime(lead.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// LEAD ROW COMPONENT (TABLE VIEW)
// ============================================

const LeadRow = ({
  lead,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Lead["status"]) => void;
}) => {
  const statusInfo = getStatusInfo(lead.status);
  const sourceInfo = getSourceInfo(lead.source);
  const tempInfo = getTemperatureInfo(lead.temperature);
  const TempIcon = tempInfo.icon;
  const SourceIcon = sourceInfo.icon;

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
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={lead.avatar} />
              <AvatarFallback className="bg-[#F1F5F9]/70 text-[#0F172A] font-medium text-sm">
                {getInitials(lead.firstName, lead.lastName)}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border border-white"
              style={{ backgroundColor: sourceInfo.color }}
            >
              <SourceIcon size={10} className="text-[#0F172A]" />
            </div>
          </div>
          <div>
            <p className="font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
              {lead.firstName} {lead.lastName}
            </p>
            <p className="text-sm text-[#94A3B8]">{lead.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-[#0F172A]">{lead.company}</p>
          <p className="text-sm text-[#94A3B8]">{lead.jobTitle}</p>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusInfo.color }} />
          {statusInfo.name}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-[80px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium" style={{ color: getScoreColor(lead.score) }}>
                {lead.score}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${lead.score}%`,
                  backgroundColor: getScoreColor(lead.score),
                }}
              />
            </div>
          </div>
          <span
            className="p-1 rounded-md"
            style={{ backgroundColor: tempInfo.bg }}
          >
            <TempIcon size={14} style={{ color: tempInfo.color }} />
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-[#0F172A]">
          {formatCurrency(lead.value, lead.currency)}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {getLeadInsights(lead).map((type) => (
            <AiInsightBadge key={type} type={type} size="sm" />
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-white/5">{lead.assignedTo?.split(" ").map((n: string) => n[0]).join("") || "?"}</AvatarFallback>

          </Avatar>
          <span className="text-sm text-[#475569]">{lead.assignedTo}</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-[#94A3B8]">{getRelativeTime(lead.createdAt)}</span>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                  <Mail size={16} className="text-[#475569]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send Email</TooltipContent>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-md">
                <Mail size={14} className="mr-2" /> Send Email
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Phone size={14} className="mr-2" /> Call
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <CalendarDays size={14} className="mr-2" /> Schedule Follow-up
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
// ADD/EDIT LEAD DIALOG
// ============================================

const LeadFormDialog = ({
  isOpen,
  onClose,
  lead,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSubmit: (data: Partial<Lead>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    website: "",
    location: "",
    source: "website",
    status: "new" as Lead["status"],
    temperature: "warm" as Lead["temperature"],
    value: "",
    assignedTo: "",
    tags: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  // Fetch employees for the Assigned To dropdown
  useEffect(() => {
    if (isOpen) {
      getEmployees()
        .then((emps) => {
          setEmployees(
            emps.map((emp: any) => ({
              id: emp.id,
              name: `${emp.user?.firstName || ""} ${emp.user?.lastName || ""}`.trim() || "Employee",
            }))
          );
        })
        .catch(() => setEmployees([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (lead) {
      setFormData({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        jobTitle: lead.jobTitle,
        website: lead.website || "",
        location: lead.location,
        source: lead.source,
        status: lead.status,
        temperature: lead.temperature,
        value: lead.value.toString(),
        assignedTo: lead.assignedToId || "",
        tags: lead.tags?.join(", ") || "",
        notes: lead.notes || "",
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        jobTitle: "",
        website: "",
        location: "",
        source: "website",
        status: "new",
        temperature: "warm",
        value: "",
        assignedTo: "",
        tags: "",
        notes: "",
      });
    }
  }, [lead, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.company) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        ...formData,
        value: parseFloat(formData.value) || 0,
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
      <DialogContent className="sm:max-w-[700px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {lead ? "Edit Lead" : "Add New Lead"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {lead ? "Update lead information" : "Capture a new potential customer"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white/5 rounded-md p-1 mb-6">
              <TabsTrigger value="basic" className="rounded-md data-[state=active]:bg-white">
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="company" className="rounded-md data-[state=active]:bg-white">
                Company
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-md data-[state=active]:bg-white">
                Lead Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    required
                    className="h-11 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                    className="h-11 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@company.com"
                    required
                    className="h-11 pl-10 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Phone Number</Label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (416) 555-0123"
                    className="h-11 pl-10 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Location</Label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Toronto, ON"
                    className="h-11 pl-10 rounded-md"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Acme Inc."
                    required
                    className="h-11 pl-10 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Job Title</Label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="VP of Sales"
                    className="h-11 pl-10 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Website</Label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://company.com"
                    className="h-11 pl-10 rounded-md"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Lead Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(val) => setFormData({ ...formData, source: val })}
                  >
                    <SelectTrigger className="h-11 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {leadSources.map((source) => (
                        <SelectItem key={source.id} value={source.id} className="rounded-md">
                          <div className="flex items-center gap-2">
                            <source.icon size={14} style={{ color: source.color }} />
                            {source.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val as Lead["status"] })}
                  >
                    <SelectTrigger className="h-11 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {leadStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id} className="rounded-md">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Temperature</Label>
                  <Select
                    value={formData.temperature}
                    onValueChange={(val) => setFormData({ ...formData, temperature: val as Lead["temperature"] })}
                  >
                    <SelectTrigger className="h-11 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="hot" className="rounded-md">
                        <div className="flex items-center gap-2">
                          <Flame size={14} className="text-red-500" /> Hot
                        </div>
                      </SelectItem>
                      <SelectItem value="warm" className="rounded-md">
                        <div className="flex items-center gap-2">
                          <ThermometerSun size={14} className="text-yellow-500" /> Warm
                        </div>
                      </SelectItem>
                      <SelectItem value="cold" className="rounded-md">
                        <div className="flex items-center gap-2">
                          <Snowflake size={14} className="text-blue-500" /> Cold
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Potential Value</Label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="50000"
                      className="h-11 pl-10 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Assigned To</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(val) => setFormData({ ...formData, assignedTo: val })}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#475569]" />
                      <SelectValue placeholder="Select employee" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="unassigned" className="rounded-md">
                      <span className="text-[#94A3B8]">Unassigned</span>
                    </SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id} className="rounded-md">
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Tags</Label>
                <div className="relative">
                  <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="enterprise, priority, tech"
                    className="h-11 pl-10 rounded-md"
                  />
                </div>
                <p className="text-xs text-[#475569]">Separate tags with commas</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any relevant notes about this lead..."
                  rows={3}
                  className="rounded-md resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-6 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.firstName || !formData.lastName || !formData.email || !formData.company}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {lead ? <Check size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
                  {lead ? "Update Lead" : "Add Lead"}
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
// LEAD DETAILS DIALOG
// ============================================

const LeadDetailsDialog = ({
  isOpen,
  onClose,
  lead,
  onEdit,
  onStatusChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: () => void;
  onStatusChange: (status: Lead["status"]) => void;
}) => {
  if (!lead) return null;

  const statusInfo = getStatusInfo(lead.status);
  const sourceInfo = getSourceInfo(lead.source);
  const tempInfo = getTemperatureInfo(lead.temperature);
  const TempIcon = tempInfo.icon;
  const SourceIcon = sourceInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 border-b border-[rgba(15,23,42,0.06)] /10 via-transparent/10">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-white card-shadow">
                <AvatarImage src={lead.avatar} />
                <AvatarFallback className="bg-[#F1F5F9]/70 text-[#0F172A] font-bold text-lg">
                  {getInitials(lead.firstName, lead.lastName)}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
                style={{ backgroundColor: sourceInfo.color }}
              >
                <SourceIcon size={12} className="text-[#0F172A]" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-[#0F172A]">
                  {lead.firstName} {lead.lastName}
                </h2>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: tempInfo.bg, color: tempInfo.color }}
                >
                  <TempIcon size={12} />
                  {tempInfo.label}
                </span>
              </div>
              <p className="text-[#475569]">{lead.jobTitle}</p>
              <p className="text-sm text-[#94A3B8]">{lead.company}</p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium"
              style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusInfo.color }} />
              {statusInfo.name}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Score & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-xs text-[#475569] mb-2">Lead Score</p>
              <div className="flex items-center gap-3">
                <span
                  className="text-3xl font-bold"
                  style={{ color: getScoreColor(lead.score) }}
                >
                  {lead.score}
                </span>
                <div className="flex-1">
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${lead.score}%`,
                        backgroundColor: getScoreColor(lead.score),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-xs text-[#475569] mb-2">Potential Value</p>
              <span className="text-3xl font-bold text-[#0F172A]">
                {formatCurrency(lead.value, lead.currency)}
              </span>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center">
                  <Mail size={18} className="text-[#0891B2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#475569]">Email</p>
                  <p className="text-sm font-medium text-[#0F172A] truncate">{lead.email}</p>
                </div>
              </a>
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-green-100 flex items-center justify-center">
                  <Phone size={18} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#475569]">Phone</p>
                  <p className="text-sm font-medium text-[#0F172A] truncate">{lead.phone}</p>
                </div>
              </a>
              <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md">
                <div className="w-10 h-10 rounded-md bg-purple-100 flex items-center justify-center">
                  <MapPin size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#475569]">Location</p>
                  <p className="text-sm font-medium text-[#0F172A] truncate">{lead.location}</p>
                </div>
              </div>
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                    <Globe size={18} className="text-[#0891B2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#475569]">Website</p>
                    <p className="text-sm font-medium text-[#0F172A] truncate">{lead.website}</p>
                  </div>
                  <ExternalLink size={14} className="text-[#475569]" />
                </a>
              )}
            </div>
          </div>

          {/* Social Links */}
          {lead.socialLinks && Object.keys(lead.socialLinks).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Social Profiles</h3>
              <div className="flex items-center gap-2">
                {lead.socialLinks.linkedin && (
                  <a
                    href={lead.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#0A66C2]/10 rounded-md hover:bg-[#0A66C2]/20 transition-colors"
                  >
                    <Linkedin size={20} className="text-[#0A66C2]" />
                  </a>
                )}
                {lead.socialLinks.twitter && (
                  <a
                    href={lead.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#1DA1F2]/10 rounded-md hover:bg-[#1DA1F2]/20 transition-colors"
                  >
                    <Twitter size={20} className="text-[#1DA1F2]" />
                  </a>
                )}
                {lead.socialLinks.facebook && (
                  <a
                    href={lead.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#1877F2]/10 rounded-md hover:bg-[#1877F2]/20 transition-colors"
                  >
                    <Facebook size={20} className="text-[#1877F2]" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Lead Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Lead Source</p>
              <div className="flex items-center gap-2">
                <SourceIcon size={16} style={{ color: sourceInfo.color }} />
                <span className="font-medium text-[#0F172A]">{sourceInfo.name}</span>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Assigned To</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs bg-slate-200">{lead.assignedTo?.split(" ").map((n: string) => n[0]).join("") || "?"}</AvatarFallback>

                </Avatar>
                <span className="font-medium text-[#0F172A]">{lead.assignedTo}</span>
              </div>
            </div>
          </div>

          {/* Follow-up Dates */}
          {(lead.lastContact || lead.nextFollowUp) && (
            <div className="grid grid-cols-2 gap-4">
              {lead.lastContact && (
                <div className="p-4 bg-[#F8FAFC] rounded-md">
                  <p className="text-xs text-[#475569] mb-1">Last Contact</p>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[#94A3B8]" />
                    <span className="font-medium text-[#0F172A]">{formatDate(lead.lastContact)}</span>
                  </div>
                </div>
              )}
              {lead.nextFollowUp && (
                <div className="p-4 bg-[#0891B2]/10 rounded-md border border-[#22D3EE]/20">
                  <p className="text-xs text-[#0891B2] mb-1">Next Follow-up</p>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-[#0891B2]" />
                    <span className="font-medium text-[#0F172A]">{formatDate(lead.nextFollowUp)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((tag) => (
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
          {lead.notes && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Notes</h3>
              <div className="p-4 bg-[#F8FAFC] rounded-md">
                <p className="text-sm text-[#475569]">{lead.notes}</p>
              </div>
            </div>
          )}

          {/* AI Insights Section */}
          {(() => {
            const insights = getLeadInsights(lead);
            return insights.length > 0 ? (
              <div className="ai-insight-enter">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-[#0891B2]" />
                  <h3 className="text-sm font-semibold text-[#0F172A]">AI Insights</h3>
                  <span className="ai-tag">AI</span>
                </div>
                <div className="p-4 bg-[#F0FDFA] rounded-md border border-[#22D3EE]/15 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {insights.map((type) => (
                      <AiInsightBadge key={type} type={type} size="md" />
                    ))}
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    {lead.score >= 80
                      ? `High-value lead with ${lead.score}% score. Recommend prioritizing engagement.`
                      : lead.score >= 50
                        ? `Moderate lead score (${lead.score}%). Consider nurturing through targeted outreach.`
                        : `Lead needs attention — score at ${lead.score}%. Review qualification criteria.`}
                  </p>
                </div>
              </div>
            ) : null;
          })()}

          {/* Activity Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Activity</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-[#0891B2]" />
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]">Lead created</p>
                  <p className="text-xs text-[#475569]">{getRelativeTime(lead.createdAt)}</p>
                </div>
              </div>
              {lead.lastContact && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={14} className="text-[#0891B2]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#0F172A]">Last contacted</p>
                    <p className="text-xs text-[#475569]">{formatDate(lead.lastContact)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 border-t border-[rgba(15,23,42,0.06)]">
          <Button variant="outline" className="rounded-md gap-2">
            <Mail size={16} />
            Send Email
          </Button>
          <Button variant="outline" className="rounded-md gap-2">
            <Phone size={16} />
            Call
          </Button>
          <Button onClick={onEdit} className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md gap-2">
            <Pencil size={16} />
            Edit Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// SCHEDULE MEETING DIALOG (Qualified Prompt)
// ============================================

const ScheduleMeetingDialog = ({
  isOpen,
  onClose,
  lead,
  onSchedule,
  onSkip,
}: {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSchedule: (meetingData: Record<string, unknown>) => Promise<void>;
  onSkip: () => void;
}) => {
  const [meetingType, setMeetingType] = useState<"online" | "offline">("online");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingDuration, setMeetingDuration] = useState("30");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen && lead) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      // Skip weekends
      while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      setMeetingDate(tomorrow.toISOString().split("T")[0]);
      setMeetingTitle(`Meeting with ${lead.firstName} ${lead.lastName}`);
      setMeetingType("online");
      setMeetingTime("10:00");
      setMeetingDuration("30");
      setMeetingLocation("");
      setMeetingLink("");
      setMeetingNotes("");
    }
  }, [isOpen, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingDate || !meetingTime || !lead) return;
    setIsSubmitting(true);
    try {
      const startTime = new Date(`${meetingDate}T${meetingTime}:00`);
      const endTime = new Date(startTime.getTime() + parseInt(meetingDuration) * 60000);

      await onSchedule({
        title: meetingTitle || `Meeting with ${lead.firstName} ${lead.lastName}`,
        description: `Qualification meeting with lead ${lead.firstName} ${lead.lastName}${lead.company ? ` from ${lead.company}` : ""}. ${meetingNotes ? `\n\nNotes: ${meetingNotes}` : ""}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        eventType: "MEETING",
        category: "client",
        location: meetingType === "offline" ? meetingLocation : undefined,
        meetingLink: meetingType === "online" ? (meetingLink || "https://meet.google.com/new") : undefined,
        leadId: lead.id,
        priority: "HIGH",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] rounded-xl p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#0891B2] to-[#06B6D4] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarDays size={22} />
              Schedule Meeting
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-1">
              <span className="font-semibold text-white">{lead.firstName} {lead.lastName}</span> has been qualified!
              Schedule a meeting to move forward.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Meeting Type Selection */}
          <div>
            <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Meeting Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMeetingType("online")}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${meetingType === "online"
                    ? "border-[#0891B2] bg-[#0891B2]/5 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${meetingType === "online" ? "bg-[#0891B2]/10" : "bg-gray-100"
                  }`}>
                  <Video size={24} className={meetingType === "online" ? "text-[#0891B2]" : "text-gray-400"} />
                </div>
                <span className={`font-semibold text-sm ${meetingType === "online" ? "text-[#0891B2]" : "text-gray-600"
                  }`}>Online Meeting</span>
                <span className="text-xs text-gray-400">Video call / Google Meet</span>
                {meetingType === "online" && (
                  <div className="absolute top-2 right-2">
                    <Check size={16} className="text-[#0891B2]" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMeetingType("offline")}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${meetingType === "offline"
                    ? "border-[#F59E0B] bg-[#F59E0B]/5 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${meetingType === "offline" ? "bg-[#F59E0B]/10" : "bg-gray-100"
                  }`}>
                  <MapPin size={24} className={meetingType === "offline" ? "text-[#F59E0B]" : "text-gray-400"} />
                </div>
                <span className={`font-semibold text-sm ${meetingType === "offline" ? "text-[#F59E0B]" : "text-gray-600"
                  }`}>Offline Meeting</span>
                <span className="text-xs text-gray-400">In-person / On-site</span>
                {meetingType === "offline" && (
                  <div className="absolute top-2 right-2">
                    <Check size={16} className="text-[#F59E0B]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Meeting Title */}
          <div>
            <Label htmlFor="meetingTitle" className="text-sm font-medium text-[#475569]">Meeting Title</Label>
            <Input
              id="meetingTitle"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g. Discovery Call"
              className="mt-1.5 rounded-lg"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="meetingDate" className="text-sm font-medium text-[#475569]">Date</Label>
              <Input
                id="meetingDate"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="mt-1.5 rounded-lg"
                required
              />
            </div>
            <div>
              <Label htmlFor="meetingTime" className="text-sm font-medium text-[#475569]">Time</Label>
              <Input
                id="meetingTime"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="mt-1.5 rounded-lg"
                required
              />
            </div>
            <div>
              <Label htmlFor="meetingDuration" className="text-sm font-medium text-[#475569]">Duration</Label>
              <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                <SelectTrigger className="mt-1.5 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional: Online → Meeting Link, Offline → Location */}
          {meetingType === "online" ? (
            <div>
              <Label htmlFor="meetingLink" className="text-sm font-medium text-[#475569]">Meeting Link</Label>
              <div className="relative mt-1.5">
                <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0891B2]" />
                <Input
                  id="meetingLink"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/... (auto-generated if empty)"
                  className="pl-9 rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="meetingLocation" className="text-sm font-medium text-[#475569]">Location</Label>
              <div className="relative mt-1.5">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F59E0B]" />
                <Input
                  id="meetingLocation"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder="Office address or venue"
                  className="pl-9 rounded-lg"
                  required
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="meetingNotes" className="text-sm font-medium text-[#475569]">Notes (optional)</Label>
            <Textarea
              id="meetingNotes"
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="Agenda, topics to discuss..."
              rows={2}
              className="mt-1.5 rounded-lg resize-none"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-lg gap-2 text-white ${meetingType === "online"
                  ? "bg-[#0891B2] hover:bg-[#0891B2]/90"
                  : "bg-[#F59E0B] hover:bg-[#F59E0B]/90"
                }`}
            >
              {isSubmitting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : meetingType === "online" ? (
                <Video size={16} />
              ) : (
                <MapPin size={16} />
              )}
              {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN ALL LEADS PAGE COMPONENT
// ============================================

// Helper: map API lead response to frontend Lead type
const mapApiLead = (apiLead: any): Lead => ({
  id: apiLead.id,
  firstName: apiLead.firstName || "",
  lastName: apiLead.lastName || "",
  email: apiLead.email || "",
  phone: apiLead.phone || "",
  company: apiLead.companyName || "",
  jobTitle: apiLead.jobTitle || "",
  website: apiLead.website,
  location: apiLead.location || "",
  source: (apiLead.leadSource?.name || "website").toLowerCase().replace(/\s+/g, "_"),
  status: (apiLead.status || "NEW").toLowerCase(),
  score: apiLead.score || 50,
  temperature: (apiLead.temperature || "COLD").toLowerCase(),
  value: apiLead.potentialValue || 0,
  currency: "CAD",
  assignedTo: apiLead.assignedTo
    ? `${apiLead.assignedTo.user?.firstName || ""} ${apiLead.assignedTo.user?.lastName || ""}`.trim()
    : "",
  assignedToId: apiLead.assignedToId || apiLead.assignedTo?.id || "",
  tags: apiLead.tags?.map((t: any) => t.name) || [],
  notes: apiLead.notes,
  lastContact: apiLead.lastContact,
  nextFollowUp: apiLead.nextFollowUp,
  createdAt: apiLead.createdAt,
  updatedAt: apiLead.updatedAt,
});

const AllLeads = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTemperature, setSelectedTemperature] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "value" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [pendingQualifiedLead, setPendingQualifiedLead] = useState<Lead | null>(null);

  // Fetch leads from API
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const response = await getLeads();
        const apiLeads = Array.isArray(response) ? response : [];
        const mapped = apiLeads.map(mapApiLead);
        setLeads(mapped);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
        toast({ title: "Error", description: "Failed to load leads.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  // Filtered and sorted leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Filter by tab
    if (activeTab === "new") {
      result = result.filter((l) => l.status === "new");
    } else if (activeTab === "qualified") {
      result = result.filter((l) => l.status === "qualified");
    } else if (activeTab === "hot") {
      result = result.filter((l) => l.temperature === "hot");
    } else if (activeTab === "won") {
      result = result.filter((l) => l.status === "won");
    } else if (activeTab === "lost") {
      result = result.filter((l) => l.status === "lost");
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.firstName.toLowerCase().includes(query) ||
          l.lastName.toLowerCase().includes(query) ||
          l.email.toLowerCase().includes(query) ||
          l.company.toLowerCase().includes(query) ||
          l.jobTitle.toLowerCase().includes(query)
      );
    }

    // Filter by source
    if (selectedSource !== "all") {
      result = result.filter((l) => l.source === selectedSource);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((l) => l.status === selectedStatus);
    }

    // Filter by temperature
    if (selectedTemperature !== "all") {
      result = result.filter((l) => l.temperature === selectedTemperature);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "score":
          comparison = a.score - b.score;
          break;
        case "value":
          comparison = a.value - b.value;
          break;
        case "name":
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [leads, activeTab, searchQuery, selectedSource, selectedStatus, selectedTemperature, sortBy, sortOrder]);

  // Handlers
  const handleAddLead = async (data: Partial<Lead>) => {
    try {
      const apiData: Record<string, any> = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        companyName: data.company,
        jobTitle: data.jobTitle || undefined,
        website: data.website && data.website.trim() ? data.website.trim() : undefined,
        location: data.location || undefined,
        status: (data.status || "new").toUpperCase(),
        temperature: (data.temperature || "warm").toUpperCase(),
        potentialValue: data.value || 0,
        notes: data.notes || undefined,
      };
      // Only send assignedToId if a valid employee is selected
      if (data.assignedTo && data.assignedTo !== "unassigned" && data.assignedTo !== "") {
        apiData.assignedToId = data.assignedTo;
      }

      const responseData = await createLead(apiData);
      const newLead = mapApiLead(responseData);
      setLeads((prev) => [newLead, ...prev]);
      toast({
        title: "Lead Added",
        description: `${newLead.firstName} ${newLead.lastName} has been added to your leads.`,
      });
    } catch (error: any) {
      console.error("Failed to add lead:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add lead.",
        variant: "destructive",
      });
    }
  };

  const handleEditLead = async (data: Partial<Lead>) => {
    if (!currentLead) return;
    try {
      const apiData: Record<string, any> = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        companyName: data.company,
        jobTitle: data.jobTitle || undefined,
        website: data.website && data.website.trim() ? data.website.trim() : undefined,
        location: data.location || undefined,
        status: data.status?.toUpperCase(),
        temperature: data.temperature?.toUpperCase(),
        potentialValue: data.value || 0,
        notes: data.notes || undefined,
      };
      // Only send assignedToId if a valid employee is selected
      if (data.assignedTo && data.assignedTo !== "unassigned" && data.assignedTo !== "") {
        apiData.assignedToId = data.assignedTo;
      } else {
        apiData.assignedToId = null;
      }

      const responseData = await updateLead(currentLead.id, apiData);
      const updatedLead = mapApiLead(responseData);
      setLeads((prev) =>
        prev.map((l) => (l.id === currentLead.id ? updatedLead : l))
      );
      toast({
        title: "Lead Updated",
        description: "The lead has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Failed to update lead:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update lead.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    try {
      await deleteLead(leadToDelete.id);
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
      setSelectedLeads((prev) => {
        const newSet = new Set(prev);
        newSet.delete(leadToDelete.id);
        return newSet;
      });
      setIsDeleteAlertOpen(false);
      setLeadToDelete(null);
      toast({
        title: "Lead Deleted",
        description: "The lead has been removed.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("Failed to delete lead:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete lead.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (lead: Lead, status: Lead["status"]) => {
    // Intercept QUALIFIED status → show meeting scheduling dialog
    if (status === "qualified" && lead.status !== "qualified") {
      setPendingQualifiedLead(lead);
      setIsMeetingDialogOpen(true);
      return;
    }

    try {
      await updateLeadStatus(lead.id, status.toUpperCase());
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? { ...l, status, updatedAt: new Date().toISOString() }
            : l
        )
      );
      toast({
        title: "Status Updated",
        description: `Lead status changed to ${status}.`,
      });
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  // Handle meeting scheduled after QUALIFIED prompt
  const handleMeetingSchedule = async (meetingData: Record<string, unknown>) => {
    if (!pendingQualifiedLead) return;
    try {
      // 1. Update lead status to QUALIFIED
      await updateLeadStatus(pendingQualifiedLead.id, "QUALIFIED");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === pendingQualifiedLead.id
            ? { ...l, status: "qualified" as Lead["status"], updatedAt: new Date().toISOString() }
            : l
        )
      );

      // 2. Create calendar event
      await createCalendarEvent(meetingData);

      toast({
        title: "🎉 Lead Qualified & Meeting Scheduled!",
        description: `Meeting scheduled with ${pendingQualifiedLead.firstName} ${pendingQualifiedLead.lastName}.`,
      });
      setIsMeetingDialogOpen(false);
      setPendingQualifiedLead(null);
    } catch (error: any) {
      console.error("Failed to schedule meeting:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to schedule meeting.",
        variant: "destructive",
      });
    }
  };

  // Handle skip meeting (still qualify the lead)
  const handleSkipMeeting = async () => {
    if (!pendingQualifiedLead) return;
    try {
      await updateLeadStatus(pendingQualifiedLead.id, "QUALIFIED");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === pendingQualifiedLead.id
            ? { ...l, status: "qualified" as Lead["status"], updatedAt: new Date().toISOString() }
            : l
        )
      );
      toast({
        title: "Status Updated",
        description: `Lead marked as qualified (no meeting scheduled).`,
      });
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status.",
        variant: "destructive",
      });
    }
    setIsMeetingDialogOpen(false);
    setPendingQualifiedLead(null);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) => {
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
  const newCount = leads.filter((l) => l.status === "new").length;
  const qualifiedCount = leads.filter((l) => l.status === "qualified").length;
  const hotCount = leads.filter((l) => l.temperature === "hot").length;
  const wonCount = leads.filter((l) => l.status === "won").length;
  const lostCount = leads.filter((l) => l.status === "lost").length;
  const totalValue = leads.reduce((acc, l) => acc + l.value, 0);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <main className="flex-1 ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <Link to="/dashboard" className="hover:text-[#0891B2]">
                    Dashboard
                  </Link>
                  <ChevronRight size={14} />
                  <span className="text-[#0F172A] font-medium">Leads</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">All Leads</h1>
              </div>

              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-md">
                        <Upload size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Import Leads</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-md">
                        <Download size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export Leads</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  onClick={() => {
                    setCurrentLead(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md gap-2"
                >
                  <UserPlus size={18} />
                  Add Lead
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-4 lg:gap-6 mb-4 lg:mb-8">
            <StatCard
              title="Total Leads"
              value={leads.length}
              change={12.5}
              changeLabel="vs last month"
              icon={Target}
              color="#22D3EE"
            />
            <StatCard
              title="Hot Leads"
              value={hotCount}
              icon={Flame}
              color="#EF4444"
              delay={0.1}
            />
            <StatCard
              title="Qualified"
              value={qualifiedCount}
              icon={UserCheck}
              color="#F59E0B"
              delay={0.2}
            />
            <StatCard
              title="Won Deals"
              value={wonCount}
              change={8.3}
              changeLabel="this month"
              icon={CheckCircle2}
              color="#10B981"
              delay={0.3}
            />
            <StatCard
              title="Total Value"
              value={formatCurrency(totalValue)}
              change={15.2}
              icon={DollarSign}
              color="#FBBF24"
              delay={0.4}
            />
          </div>

          {/* Main Content */}
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
                    <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white">
                      All ({leads.length})
                    </TabsTrigger>
                    <TabsTrigger value="new" className="rounded-md data-[state=active]:bg-white">
                      New ({newCount})
                    </TabsTrigger>
                    <TabsTrigger value="qualified" className="rounded-md data-[state=active]:bg-white">
                      Qualified ({qualifiedCount})
                    </TabsTrigger>
                    <TabsTrigger value="hot" className="rounded-md data-[state=active]:bg-white">
                      <Flame size={14} className="mr-1 text-red-500" />
                      Hot ({hotCount})
                    </TabsTrigger>
                    <TabsTrigger value="won" className="rounded-md data-[state=active]:bg-white">
                      Won ({wonCount})
                    </TabsTrigger>
                    <TabsTrigger value="lost" className="rounded-md data-[state=active]:bg-white">
                      Lost ({lostCount})
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
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search leads..."
                      className="pl-9 h-10 rounded-md border-[rgba(15,23,42,0.06)]"
                    />
                  </div>

                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger className="w-[150px] h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All Sources</SelectItem>
                      {leadSources.map((source) => (
                        <SelectItem key={source.id} value={source.id} className="rounded-md">
                          <div className="flex items-center gap-2">
                            <source.icon size={14} style={{ color: source.color }} />
                            {source.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[140px] h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All Statuses</SelectItem>
                      {leadStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id} className="rounded-md">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedTemperature} onValueChange={setSelectedTemperature}>
                    <SelectTrigger className="w-[130px] h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Temperature" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All</SelectItem>
                      <SelectItem value="hot" className="rounded-md">
                        <div className="flex items-center gap-2">
                          <Flame size={14} className="text-red-500" /> Hot
                        </div>
                      </SelectItem>
                      <SelectItem value="warm" className="rounded-md">
                        <div className="flex items-center gap-2">
                          <ThermometerSun size={14} className="text-yellow-500" /> Warm
                        </div>
                      </SelectItem>
                      <SelectItem value="cold" className="rounded-md">
                        <div className="flex items-center gap-2">
                          <Snowflake size={14} className="text-blue-500" /> Cold
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="rounded-md gap-2">
                        <Filter size={16} />
                        Sort
                        {sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
                        Date Added
                        {sortBy === "date" && <Check size={14} className="ml-auto text-[#0891B2]" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSortBy("score");
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        }}
                        className="rounded-md"
                      >
                        <Target size={14} className="mr-2" />
                        Lead Score
                        {sortBy === "score" && <Check size={14} className="ml-auto text-[#0891B2]" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSortBy("value");
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        }}
                        className="rounded-md"
                      >
                        <DollarSign size={14} className="mr-2" />
                        Value
                        {sortBy === "value" && <Check size={14} className="ml-auto text-[#0891B2]" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSortBy("name");
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        }}
                        className="rounded-md"
                      >
                        <User size={14} className="mr-2" />
                        Name
                        {sortBy === "name" && <Check size={14} className="ml-auto text-[#0891B2]" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Bulk Actions */}
                {selectedLeads.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mt-4 p-3 bg-[#0891B2]/10 rounded-md"
                  >
                    <span className="text-sm font-medium text-[#0F172A]">
                      {selectedLeads.size} selected
                    </span>
                    <div className="flex-1" />
                    <Button size="sm" variant="outline" className="rounded-md">
                      <Mail size={14} className="mr-1" />
                      Email
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-md">
                      <Tag size={14} className="mr-1" />
                      Add Tags
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-md">
                      <UserCheck size={14} className="mr-1" />
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        // Delete selected leads
                        setLeads((prev) => prev.filter((l) => !selectedLeads.has(l.id)));
                        setSelectedLeads(new Set());
                        toast({
                          title: "Leads Deleted",
                          description: `${selectedLeads.size} lead(s) have been removed.`,
                          variant: "destructive",
                        });
                      }}
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
                              selectedLeads.size === filteredLeads.length && filteredLeads.length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                            className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                          />
                        </TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="flex flex-col items-center">
                              <Target size={48} className="text-[#475569] mb-3" />
                              <p className="text-[#94A3B8] font-medium">No leads found</p>
                              <p className="text-[#475569] text-sm">Try adjusting your filters</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLeads.map((lead) => (
                          <LeadRow
                            key={lead.id}
                            lead={lead}
                            isSelected={selectedLeads.has(lead.id)}
                            onSelect={() => toggleSelectLead(lead.id)}
                            onView={() => {
                              navigate(`/leads/${lead.id}`);
                            }}
                            onEdit={() => {
                              setCurrentLead(lead);
                              setIsFormOpen(true);
                            }}
                            onDelete={() => {
                              setLeadToDelete(lead);
                              setIsDeleteAlertOpen(true);
                            }}
                            onStatusChange={(status) => handleStatusChange(lead, status)}
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {filteredLeads.length === 0 ? (
                    <div className="col-span-3 text-center py-12">
                      <Target size={48} className="text-[#475569] mx-auto mb-3" />
                      <p className="text-[#94A3B8] font-medium">No leads found</p>
                      <p className="text-[#475569] text-sm">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filteredLeads.map((lead, index) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        isSelected={selectedLeads.has(lead.id)}
                        onSelect={() => toggleSelectLead(lead.id)}
                        onView={() => {
                          navigate(`/leads/${lead.id}`);
                        }}
                        onEdit={() => {
                          setCurrentLead(lead);
                          setIsFormOpen(true);
                        }}
                        onDelete={() => {
                          setLeadToDelete(lead);
                          setIsDeleteAlertOpen(true);
                        }}
                        onStatusChange={(status) => handleStatusChange(lead, status)}
                        delay={index * 0.05}
                      />
                    ))
                  )}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Dialogs */}
      <LeadFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCurrentLead(null);
        }}
        lead={currentLead}
        onSubmit={currentLead ? handleEditLead : handleAddLead}
      />

      <LeadDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setCurrentLead(null);
        }}
        lead={currentLead}
        onEdit={() => {
          setIsDetailsOpen(false);
          setIsFormOpen(true);
        }}
        onStatusChange={(status) => {
          if (currentLead) {
            handleStatusChange(currentLead, status);
          }
        }}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              className="bg-red-500 hover:bg-red-600 rounded-md"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScheduleMeetingDialog
        isOpen={isMeetingDialogOpen}
        onClose={() => {
          setIsMeetingDialogOpen(false);
          setPendingQualifiedLead(null);
        }}
        lead={pendingQualifiedLead}
        onSchedule={handleMeetingSchedule}
        onSkip={handleSkipMeeting}
      />
    </div>
  );
};

export default AllLeads;