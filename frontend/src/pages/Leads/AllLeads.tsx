import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getLeads, createLead, updateLead, deleteLead, updateLeadStatus, checkDuplicates, mergeLeads } from "@/features/leads";
import { getLeadSources } from "@/features/leads/services/lead-sources-service";
import { LeadStatus, LeadTemperature } from "@/types/lead-contracts";
import { createCalendarEvent } from "@/features/calendar";
import { autocompleteAddress } from "@/features/roof-estimator/services/roof-estimator-service";
import { getEmployees } from "@/features/users";
import api from "@/lib/axios";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import AddressAutocompleteInput from "@/components/address/AddressAutocompleteInput";
import { ComposeEmailSheet } from "@/features/emails/components/ComposeEmailSheet";
import {
  ListCardSkeleton,
  PullToRefreshIndicator,
  SwipeActionCard,
  usePullToRefresh,
} from "@/features/clients/components/responsive-helpers";
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
  Ban,
  PhoneOff,
  MapPinOff,
  CalendarClock,
  FileX2,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

// ============================================
// TYPES
// ============================================

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  jobTitle: string;
  website?: string;
  location: string;
  leadSourceName: string;
  status: LeadStatus;
  displayScore: number;
  temperature: LeadTemperature;
  potentialValue: number;
  currency: string;
  assignedTo?: string;
  assignedToName: string;
  assignedToId?: string;
  leadSourceId?: string;
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

  // ── Stage 1: Property Info ───────────────────────────────────────────
  propertyAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;

  // ── Stage 1: Service Request ─────────────────────────────────────────
  serviceType?: string;
  isInsuranceClaim?: string;
  urgencyLevel?: string;
  preferredContactMethod?: string;
  bestTimeToContact?: string;
  issueDescription?: string;

  // ── Stage 2: Verification ────────────────────────────────────────────
  confirmedName?: boolean;
  confirmedPhone?: boolean;
  confirmedEmail?: boolean;
  confirmedAddress?: boolean;
  secondaryPhone?: string;
  spouseCoOwnerName?: string;

  // ── Stage 2: Ownership ───────────────────────────────────────────────
  isHomeowner?: string;
  isDecisionMaker?: string;
  ownershipType?: string;

  // ── Stage 2: Roof Details ────────────────────────────────────────────
  roofAge?: string;
  currentRoofMaterial?: string;
  numberOfStories?: string;
  knownDamageType?: string[];
  damageOccurrenceDate?: string;
  previousRoofWork?: string;
  previousRoofWorkDetails?: string;

  // ── Stage 2: Insurance ───────────────────────────────────────────────
  insuranceCompanyName?: string;
  hasClaimBeenFiled?: string;
  claimNumber?: string;
  adjusterAssigned?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  adjusterMeetingDate?: string;

  // ── Stage 2: Budget & Timeline ───────────────────────────────────────
  budgetRange?: string;
  workTimeline?: string;
  financingNeeded?: string;
  gettingOtherQuotes?: string;
  numberOfOtherQuotes?: number;
  topPriority?: string;

  // ── Stage 2: HOA ─────────────────────────────────────────────────────
  isHOA?: string;
  hoaRestrictions?: string;

  // ── Stage 2: Sales Assessment ────────────────────────────────────────
  leadScore?: number;
  disqualifiedReason?: string;
  nextStep?: string;
  followUpDateTime?: string;
  inspectionAppointmentDate?: string;
  qualificationCallNotes?: string;

  // ── Closure / Inactive State Fields ───────────────────────────────────
  closureReason?: string;
  duplicateOfLeadId?: string;
  closedAt?: string;
  reactivateAt?: string;
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

interface TagOption {
  id: string;
  name: string;
  color?: string | null;
}

// ============================================
// CONSTANTS & DATA
// ============================================

// Lead sources: fallback icons/colors for dynamic sources loaded from API
const sourceIconMap: Record<string, { icon: any; color: string }> = {
  website: { icon: Globe, color: "#3B82F6" },
  referral: { icon: Users, color: "#10B981" },
  linkedin: { icon: Linkedin, color: "#0A66C2" },
  cold_call: { icon: Phone, color: "#F59E0B" },
  email_campaign: { icon: Mail, color: "#8B5CF6" },
  trade_show: { icon: Building2, color: "#EC4899" },
  social_media: { icon: Twitter, color: "#06B6D4" },
  other: { icon: Target, color: "#64748B" },
};

const leadStatuses = [
  { id: LeadStatus.NEW, name: "New", color: "#3B82F6", bgColor: "#EFF6FF", icon: Sparkles },
  { id: LeadStatus.CONTACTED, name: "Contacted", color: "#8B5CF6", bgColor: "#F5F3FF", icon: Phone },
  { id: LeadStatus.QUALIFIED, name: "Qualified", color: "#F59E0B", bgColor: "#FFFBEB", icon: UserCheck },
  { id: LeadStatus.PROPOSAL, name: "Proposal", color: "#6637F4", bgColor: "#F0EEFF", icon: Send },
  { id: LeadStatus.NEGOTIATION, name: "Negotiation", color: "#F97316", bgColor: "#FFF7ED", icon: Clock },
  { id: LeadStatus.WON, name: "Won", color: "#10B981", bgColor: "#ECFDF5", icon: CheckCircle2 },
  { id: LeadStatus.LOST, name: "Lost", color: "#EF4444", bgColor: "#FEF2F2", icon: AlertCircle },
  // ── Inactive / Closure statuses ──
  { id: LeadStatus.DUPLICATE, name: "Duplicate", color: "#64748B", bgColor: "#F1F5F9", icon: Copy },
  { id: LeadStatus.UNQUALIFIED, name: "Unqualified", color: "#475569", bgColor: "#F1F5F9", icon: Ban },
  { id: LeadStatus.NO_RESPONSE, name: "No Response", color: "#D97706", bgColor: "#FFFBEB", icon: PhoneOff },
  { id: LeadStatus.OUT_OF_SERVICE_AREA, name: "Out of Area", color: "#FF7B36", bgColor: "#FFF7ED", icon: MapPinOff },
  { id: LeadStatus.FUTURE_FOLLOW_UP, name: "Future Follow-Up", color: "#6637F4", bgColor: "#ECFEFF", icon: CalendarClock },
  { id: LeadStatus.DORMANT_PROPOSAL, name: "Dormant Proposal", color: "#7C3AED", bgColor: "#F5F3FF", icon: FileX2 },
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

const csvEscape = (value: unknown): string => {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
};

const downloadCsv = (rows: Array<Array<unknown>>, fileName: string) => {
  const csvContent = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
};

const normalizeLookupKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const normalizeLeadStatusValue = (value?: string | null): LeadStatus => {
  if (!value) return LeadStatus.NEW;

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const match = leadStatuses.find(
    (status) => status.id === normalized || status.name.toUpperCase().replace(/[\s-]+/g, "_") === normalized
  );

  return (match?.id || LeadStatus.NEW) as LeadStatus;
};

const normalizeLeadTemperatureValue = (value?: string | null): LeadTemperature => {
  if (!value) return LeadTemperature.WARM;

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === LeadTemperature.HOT) return LeadTemperature.HOT;
  if (normalized === LeadTemperature.COLD) return LeadTemperature.COLD;
  return LeadTemperature.WARM;
};

const parseCsvText = (content: string): string[][] => {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentField);
      if (currentRow.some((field) => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);
  if (currentRow.some((field) => field.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
};

const pickTagColor = (tagName: string): string => {
  const palette = ["#14B8A6", "#6637F4", "#F59E0B", "#EF4444", "#0EA5E9", "#8B5CF6"];
  const hash = [...tagName].reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
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

const getSourceInfo = (sourceSlug: string) => {
  const mapping = sourceIconMap[sourceSlug] || sourceIconMap["other"];
  return { id: sourceSlug, name: sourceSlug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon: mapping.icon, color: mapping.color };
};

const getTemperatureInfo = (temp: string) => {
  switch (temp) {
    case "HOT":
      return { icon: Flame, color: "#EF4444", bg: "#FEF2F2", label: "Hot" };
    case "WARM":
      return { icon: ThermometerSun, color: "#F59E0B", bg: "#FFFBEB", label: "Warm" };
    case "COLD":
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
  sparklineData,
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
  sparklineData?: number[];
}) => {
  // Generate sparkline path from data
  const sparklinePath = useMemo(() => {
    const data = sparklineData || [];
    if (data.length < 2) return "";
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 30;
    const step = width / (data.length - 1);
    return data
      .map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [sparklineData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#6637F4]/30 hover:shadow-lg  transition-all overflow-hidden group"
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

      {/* Sparkline Chart */}
      {sparklinePath && (
        <div className="mt-3 -mx-1">
          <svg width="120" height="30" viewBox="0 0 120 30" className="w-full">
            <defs>
              <linearGradient id={`sparkGrad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={sparklinePath + ` L 120 30 L 0 30 Z`}
              fill={`url(#sparkGrad-${title.replace(/\s+/g, "")})`}
            />
            <path
              d={sparklinePath}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-60"
            />
          </svg>
        </div>
      )}
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
  onEmail,
  onCall,
  onStatusChange,
  delay = 0,
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEmail: () => void;
  onCall: () => void;
  onStatusChange: (status: Lead["status"]) => void;
  delay?: number;
}) => {
  const statusInfo = getStatusInfo(lead.status);
  const sourceInfo = getSourceInfo(lead.leadSourceName);
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
          ? "border-[#6637F4] ring-2 ring-[#6637F4]/20"
          : "border-[rgba(15,23,42,0.06)] hover:border-[#6637F4]/30 hover:shadow-lg "
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
          className="data-[state=checked]:bg-[#6637F4] data-[state=checked]:border-[#6637F4] bg-white"
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
            <DropdownMenuItem onClick={onEmail} className="rounded-md">
              <Mail size={14} className="mr-2" /> Send Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCall} className="rounded-md">
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
          <h3 className="font-semibold text-[#0F172A] group-hover:text-[#6637F4] transition-colors">
            {lead.firstName} {lead.lastName}
          </h3>
          <p className="text-sm text-[#94A3B8]">{lead.jobTitle}</p>
          <p className="text-xs text-[#475569]">{lead.companyName}</p>
        </div>

        {/* Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#94A3B8]">Lead Score</span>
            <span className="text-sm font-bold" style={{ color: getScoreColor(lead.leadScore) }}>
              {lead.leadScore}%
            </span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${lead.leadScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: getScoreColor(lead.leadScore) }}
            />
          </div>
        </div>

        {/* Value */}
        <div className="text-center mb-4">
          <span className="text-xl sm:text-2xl font-bold text-[#0F172A]">
            {formatCurrency(lead.potentialValue, lead.currency)}
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
            {lead.assignedTo ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-[#F1F5F9]">{lead.assignedTo.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-[#475569]">{lead.assignedTo}</span>
              </>
            ) : (
              <span className="text-xs text-[#94A3B8] italic">Unassigned</span>
            )}
          </div>
          <span className="text-xs text-[#475569]">{getRelativeTime(lead.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
};

const MobileLeadCard = ({
  lead,
  isSelected,
  onSelect,
  onOpen,
  onQualify,
  onArchive,
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onQualify: () => void;
  onArchive: () => void;
}) => {
  const statusInfo = getStatusInfo(lead.status);
  const tempInfo = getTemperatureInfo(lead.temperature);
  const TempIcon = tempInfo.icon;

  return (
    <SwipeActionCard
      onView={onQualify}
      onDelete={onArchive}
      onLongPress={onSelect}
      primaryLabel="Qualify"
      secondaryLabel="Archive"
      primaryIcon={CheckCircle2}
      secondaryIcon={FileX2}
    >
      <div
        className={cn(
          "rounded-2xl border bg-white p-4 shadow-sm transition-all",
          isSelected
            ? "border-[#6637F4] ring-2 ring-[#6637F4]/15"
            : "border-[rgba(15,23,42,0.06)]"
        )}
        onClick={onOpen}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border border-white shadow-sm">
            <AvatarImage src={lead.avatar} />
            <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] font-semibold">
              {getInitials(lead.firstName, lead.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[#0F172A]">
                  {lead.firstName} {lead.lastName}
                </p>
                <p className="truncate text-sm text-[#475569]">
                  {lead.companyName || "No company"}
                </p>
              </div>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                onClick={(event) => event.stopPropagation()}
                className="mt-0.5 data-[state=checked]:bg-[#6637F4] data-[state=checked]:border-[#6637F4]"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusInfo.color }} />
                {statusInfo.name}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: tempInfo.bg, color: tempInfo.color }}
              >
                <TempIcon size={12} />
                {tempInfo.label}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Value</p>
                <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                  {formatCurrency(lead.potentialValue, lead.currency)}
                </p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Stage</p>
                <p className="mt-1 text-sm font-semibold text-[#0F172A]">{statusInfo.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SwipeActionCard>
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
  onEmail,
  onCall,
  onDuplicate,
  onScheduleFollowUp,
  onStatusChange,
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEmail: () => void;
  onCall: () => void;
  onDuplicate: () => void;
  onScheduleFollowUp: () => void;
  onStatusChange: (status: Lead["status"]) => void;
}) => {
  const statusInfo = getStatusInfo(lead.status);
  const sourceInfo = getSourceInfo(lead.leadSourceName);
  const tempInfo = getTemperatureInfo(lead.temperature);
  const TempIcon = tempInfo.icon;
  const SourceIcon = sourceInfo.icon;

  return (
    <TableRow className="group hover:bg-[#F0EEFF] transition-colors cursor-pointer border-l-2 border-l-transparent hover:border-l-[#6637F4]">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#6637F4] data-[state=checked]:border-[#6637F4]"
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
            <p className="font-medium text-[#0F172A] group-hover:text-[#6637F4] transition-colors">
              {lead.firstName} {lead.lastName}
            </p>
            <p className="text-sm text-[#94A3B8]">{lead.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-[#0F172A]">{lead.companyName || <span className="text-[#CBD5E1]">—</span>}</p>
          <p className="text-sm text-[#94A3B8]">{lead.jobTitle}</p>
        </div>
      </TableCell>
      <TableCell>
        {lead.phone ? (
          <a href={`tel:${lead.phone}`} className="text-sm text-[#475569] hover:text-[#6637F4] transition-colors">
            {lead.phone}
          </a>
        ) : (
          <span className="text-sm text-[#CBD5E1]">—</span>
        )}
      </TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
        >
          {statusInfo.icon && <statusInfo.icon size={12} />}
          {statusInfo.name}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-[80px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium" style={{ color: getScoreColor(lead.leadScore) }}>
                {lead.leadScore}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${lead.leadScore}%`,
                  backgroundColor: getScoreColor(lead.leadScore),
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
          {formatCurrency(lead.potentialValue, lead.currency)}
        </span>
      </TableCell>
      <TableCell>
        {lead.assignedTo ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-[#F1F5F9]">{lead.assignedTo.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-[#475569]">{lead.assignedTo}</span>
          </div>
        ) : (
          <span className="text-sm text-[#94A3B8] italic">Unassigned</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-[#94A3B8]">{getRelativeTime(lead.createdAt)}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onEmail}>
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
              <DropdownMenuItem onClick={onDuplicate} className="rounded-md">
                <Copy size={14} className="mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEmail} className="rounded-md">
                <Mail size={14} className="mr-2" /> Send Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCall} className="rounded-md">
                <Phone size={14} className="mr-2" /> Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onScheduleFollowUp} className="rounded-md">
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

export const LeadFormDialog = ({
  isOpen,
  onClose,
  lead,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSubmit: (data: Partial<Lead>) => Promise<boolean>;
}) => {
  const { isMobile } = useIsMobile();
  type LeadFormTab = "basic" | "property" | "service" | "qualification" | "insurance" | "assessment" | "details";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    jobTitle: "",
    website: "",
    location: "",
    source: "website",
    leadSourceId: "",
    status: LeadStatus.NEW as Lead["status"],
    temperature: LeadTemperature.WARM as Lead["temperature"],
    potentialValue: "",
    assignedToId: "",
    tags: "",
    notes: "",
    // Stage 1: Property Info
    propertyAddress: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "",
    // Stage 1: Service Request
    serviceType: "",
    isInsuranceClaim: "",
    urgencyLevel: "",
    preferredContactMethod: "",
    bestTimeToContact: "",
    issueDescription: "",
    // Stage 2: Verification
    confirmedName: false,
    confirmedPhone: false,
    confirmedEmail: false,
    confirmedAddress: false,
    secondaryPhone: "",
    spouseCoOwnerName: "",
    // Stage 2: Ownership
    isHomeowner: "",
    isDecisionMaker: "",
    ownershipType: "",
    // Stage 2: Roof Details
    roofAge: "",
    currentRoofMaterial: "",
    numberOfStories: "",
    knownDamageType: [] as string[],
    damageOccurrenceDate: "",
    previousRoofWork: "",
    previousRoofWorkDetails: "",
    // Stage 2: Insurance
    insuranceCompanyName: "",
    hasClaimBeenFiled: "",
    claimNumber: "",
    adjusterAssigned: "",
    adjusterName: "",
    adjusterPhone: "",
    adjusterEmail: "",
    adjusterMeetingDate: "",
    // Stage 2: Budget & Timeline
    budgetRange: "",
    workTimeline: "",
    financingNeeded: "",
    gettingOtherQuotes: "",
    numberOfOtherQuotes: "",
    topPriority: "",
    // Stage 2: HOA
    isHOA: "",
    hoaRestrictions: "",
    // Stage 2: Sales Assessment
    leadScore: "",
    disqualifiedReason: "",
    nextStep: "",
    followUpDateTime: "",
    inspectionAppointmentDate: "",
    qualificationCallNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [leadSourceOptions, setLeadSourceOptions] = useState<{ id: string; name: string }[]>([]);

  const tabOrder = useMemo<LeadFormTab[]>(
    () => (
      formData.isInsuranceClaim === "Yes"
        ? ["basic", "property", "service", "qualification", "insurance", "assessment", "details"]
        : ["basic", "property", "service", "qualification", "assessment", "details"]
    ),
    [formData.isInsuranceClaim]
  );
  const activeTabIndex = tabOrder.indexOf(activeTab as LeadFormTab);
  const isLastTab = activeTabIndex === tabOrder.length - 1;

  const getTabErrorFields = useCallback((tab: LeadFormTab) => {
    switch (tab) {
      case "basic":
        return ["firstName", "lastName", "phone", "email"];
      case "property":
        return ["propertyAddress"];
      case "service":
        return ["serviceType", "issueDescription"];
      case "qualification":
        return ["numberOfOtherQuotes"];
      case "insurance":
        return ["insuranceCompanyName", "adjusterEmail"];
      case "assessment":
        return ["leadScore", "qualificationCallNotes"];
      case "details":
        return ["potentialValue", "website"];
      default:
        return [];
    }
  }, []);

  const setFieldValue = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const fieldsToClear = [field];

      if (field === "isInsuranceClaim" && value !== "Yes") {
        fieldsToClear.push("insuranceCompanyName", "adjusterEmail");
      }

      if (field === "gettingOtherQuotes" && value !== "Yes") {
        fieldsToClear.push("numberOfOtherQuotes");
      }

      if (field === "adjusterAssigned" && value !== "Yes") {
        fieldsToClear.push("adjusterEmail");
      }

      if (!fieldsToClear.some((item) => prev[item])) {
        return prev;
      }

      const next = { ...prev };
      fieldsToClear.forEach((item) => {
        delete next[item];
      });
      return next;
    });
  }, []);

  const getFieldErrorClass = useCallback(
    (field: string) => (errors[field] ? "border-red-500 focus-visible:ring-red-500 focus:ring-red-500" : ""),
    [errors]
  );

  const validateTab = useCallback((tab: LeadFormTab) => {
    const nextErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    switch (tab) {
      case "basic":
        if (!formData.firstName.trim()) {
          nextErrors.firstName = "First name is required.";
        }
        if (!formData.lastName.trim()) {
          nextErrors.lastName = "Last name is required.";
        }
        if (!formData.phone.trim()) {
          nextErrors.phone = "Phone number is required.";
        }
        if (formData.email.trim() && !emailRegex.test(formData.email.trim())) {
          nextErrors.email = "Enter a valid email address.";
        }
        break;
      case "property":
        if (!formData.propertyAddress.trim()) {
          nextErrors.propertyAddress = "Property address is required.";
        }
        break;
      case "service":
        if (!formData.serviceType.trim()) {
          nextErrors.serviceType = "Select the requested service.";
        }
        if (formData.issueDescription.trim().length > 500) {
          nextErrors.issueDescription = "Issue description must be 500 characters or less.";
        }
        break;
      case "qualification":
        if (formData.gettingOtherQuotes === "Yes") {
          const quoteCount = Number(formData.numberOfOtherQuotes);
          if (!formData.numberOfOtherQuotes.trim()) {
            nextErrors.numberOfOtherQuotes = "Enter how many other quotes the lead is getting.";
          } else if (!Number.isInteger(quoteCount) || quoteCount < 1 || quoteCount > 10) {
            nextErrors.numberOfOtherQuotes = "Other quotes must be a whole number between 1 and 10.";
          }
        }
        break;
      case "insurance":
        if (formData.isInsuranceClaim === "Yes" && !formData.insuranceCompanyName.trim()) {
          nextErrors.insuranceCompanyName = "Insurance company name is required.";
        }
        if (formData.adjusterEmail.trim() && !emailRegex.test(formData.adjusterEmail.trim())) {
          nextErrors.adjusterEmail = "Enter a valid adjuster email address.";
        }
        break;
      case "assessment":
        if (formData.leadScore.trim()) {
          const leadScore = Number(formData.leadScore);
          if (!Number.isInteger(leadScore) || leadScore < 1 || leadScore > 10) {
            nextErrors.leadScore = "Lead score must be a whole number between 1 and 10.";
          }
        }
        if (!formData.qualificationCallNotes.trim()) {
          nextErrors.qualificationCallNotes = "Qualification notes are required.";
        }
        break;
      case "details":
        if (formData.potentialValue.trim()) {
          const potentialValue = Number(formData.potentialValue);
          if (Number.isNaN(potentialValue) || potentialValue < 0) {
            nextErrors.potentialValue = "Potential value must be zero or greater.";
          }
        }
        if (formData.website.trim()) {
          try {
            new URL(formData.website);
          } catch {
            nextErrors.website = "Enter a valid website URL, including http:// or https://";
          }
        }
        break;
    }

    return nextErrors;
  }, [formData]);

  const validateAndSetTabErrors = useCallback((tab: LeadFormTab) => {
    const tabErrors = validateTab(tab);

    setErrors((prev) => {
      const next = { ...prev };
      getTabErrorFields(tab).forEach((field) => {
        delete next[field];
      });
      return { ...next, ...tabErrors };
    });

    return Object.keys(tabErrors).length === 0;
  }, [getTabErrorFields, validateTab]);

  const handleNext = useCallback(() => {
    const currentTab = tabOrder[activeTabIndex];
    const nextTab = tabOrder[activeTabIndex + 1];

    if (!currentTab || !nextTab) {
      return;
    }

    if (validateAndSetTabErrors(currentTab)) {
      setActiveTab(nextTab);
    }
  }, [activeTabIndex, tabOrder, validateAndSetTabErrors]);

  const handlePrevious = useCallback(() => {
    const previousTab = tabOrder[activeTabIndex - 1];
    if (previousTab) {
      setActiveTab(previousTab);
    }
  }, [activeTabIndex, tabOrder]);

  const handleTabChange = useCallback((nextValue: string) => {
    const nextTab = nextValue as LeadFormTab;
    const nextTabIndex = tabOrder.indexOf(nextTab);

    if (nextTabIndex === -1 || nextTab === activeTab) {
      return;
    }

    if (nextTabIndex < activeTabIndex) {
      setActiveTab(nextTab);
      return;
    }

    const currentTab = tabOrder[activeTabIndex];
    const immediateNextTab = tabOrder[activeTabIndex + 1];

    if (currentTab && immediateNextTab && validateAndSetTabErrors(currentTab)) {
      setActiveTab(immediateNextTab);
    }
  }, [activeTab, activeTabIndex, tabOrder, validateAndSetTabErrors]);

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

      // Fetch lead sources
      api.get("/lead-sources/active")
        .then((res) => {
          const sources = res.data?.data || [];
          setLeadSourceOptions(sources.map((s: any) => ({ id: s.id, name: s.name })));
        })
        .catch(() => setLeadSourceOptions([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (lead) {
      setFormData({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        companyName: lead.companyName,
        jobTitle: lead.jobTitle,
        website: lead.website || "",
        location: lead.location,
        source: lead.leadSourceName,
        leadSourceId: lead.leadSourceId || "",
        status: lead.status,
        temperature: lead.temperature,
        potentialValue: lead.potentialValue.toString(),
        assignedToId: lead.assignedToId || "",
        tags: lead.tags?.join(", ") || "",
        notes: lead.notes || "",
        // Stage 1
        propertyAddress: lead.propertyAddress || "",
        city: lead.city || "",
        state: lead.state || "",
        zipCode: lead.zipCode || "",
        propertyType: lead.propertyType || "",
        serviceType: lead.serviceType || "",
        isInsuranceClaim: lead.isInsuranceClaim || "",
        urgencyLevel: lead.urgencyLevel || "",
        preferredContactMethod: lead.preferredContactMethod || "",
        bestTimeToContact: lead.bestTimeToContact || "",
        issueDescription: lead.issueDescription || "",
        // Stage 2
        confirmedName: lead.confirmedName || false,
        confirmedPhone: lead.confirmedPhone || false,
        confirmedEmail: lead.confirmedEmail || false,
        confirmedAddress: lead.confirmedAddress || false,
        secondaryPhone: lead.secondaryPhone || "",
        spouseCoOwnerName: lead.spouseCoOwnerName || "",
        isHomeowner: lead.isHomeowner || "",
        isDecisionMaker: lead.isDecisionMaker || "",
        ownershipType: lead.ownershipType || "",
        roofAge: lead.roofAge || "",
        currentRoofMaterial: lead.currentRoofMaterial || "",
        numberOfStories: lead.numberOfStories || "",
        knownDamageType: lead.knownDamageType || [],
        damageOccurrenceDate: lead.damageOccurrenceDate || "",
        previousRoofWork: lead.previousRoofWork || "",
        previousRoofWorkDetails: lead.previousRoofWorkDetails || "",
        insuranceCompanyName: lead.insuranceCompanyName || "",
        hasClaimBeenFiled: lead.hasClaimBeenFiled || "",
        claimNumber: lead.claimNumber || "",
        adjusterAssigned: lead.adjusterAssigned || "",
        adjusterName: lead.adjusterName || "",
        adjusterPhone: lead.adjusterPhone || "",
        adjusterEmail: lead.adjusterEmail || "",
        adjusterMeetingDate: lead.adjusterMeetingDate || "",
        budgetRange: lead.budgetRange || "",
        workTimeline: lead.workTimeline || "",
        financingNeeded: lead.financingNeeded || "",
        gettingOtherQuotes: lead.gettingOtherQuotes || "",
        numberOfOtherQuotes: lead.numberOfOtherQuotes?.toString() || "",
        topPriority: lead.topPriority || "",
        isHOA: lead.isHOA || "",
        hoaRestrictions: lead.hoaRestrictions || "",
        leadScore: lead.leadScore?.toString() || "",
        disqualifiedReason: lead.disqualifiedReason || "",
        nextStep: lead.nextStep || "",
        followUpDateTime: lead.followUpDateTime || "",
        inspectionAppointmentDate: lead.inspectionAppointmentDate || "",
        qualificationCallNotes: lead.qualificationCallNotes || "",
      });
    } else {
      setFormData({
        firstName: "", lastName: "", email: "", phone: "",
        companyName: "", jobTitle: "", website: "", location: "",
        source: "website", leadSourceId: "", status: LeadStatus.NEW, temperature: LeadTemperature.WARM,
        potentialValue: "", assignedToId: "", tags: "", notes: "",
        propertyAddress: "", city: "", state: "", zipCode: "", propertyType: "",
        serviceType: "", isInsuranceClaim: "", urgencyLevel: "",
        preferredContactMethod: "", bestTimeToContact: "", issueDescription: "",
        confirmedName: false, confirmedPhone: false, confirmedEmail: false, confirmedAddress: false,
        secondaryPhone: "", spouseCoOwnerName: "",
        isHomeowner: "", isDecisionMaker: "", ownershipType: "",
        roofAge: "", currentRoofMaterial: "", numberOfStories: "",
        knownDamageType: [], damageOccurrenceDate: "", previousRoofWork: "", previousRoofWorkDetails: "",
        insuranceCompanyName: "", hasClaimBeenFiled: "", claimNumber: "",
        adjusterAssigned: "", adjusterName: "", adjusterPhone: "", adjusterEmail: "", adjusterMeetingDate: "",
        budgetRange: "", workTimeline: "", financingNeeded: "",
        gettingOtherQuotes: "", numberOfOtherQuotes: "", topPriority: "",
        isHOA: "", hoaRestrictions: "",
        leadScore: "", disqualifiedReason: "", nextStep: "",
        followUpDateTime: "", inspectionAppointmentDate: "", qualificationCallNotes: "",
      });
    }
    setActiveTab("basic");
    setErrors({});
  }, [lead, isOpen]);

  useEffect(() => {
    if (formData.isInsuranceClaim !== "Yes" && activeTab === "insurance") {
      setActiveTab("assessment");
    }
  }, [activeTab, formData.isInsuranceClaim]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLastTab) {
      handleNext();
      return;
    }

    const combinedErrors: Record<string, string> = {};
    let firstInvalidTab: LeadFormTab | null = null;

    tabOrder.forEach((tab) => {
      const tabErrors = validateTab(tab);
      if (!firstInvalidTab && Object.keys(tabErrors).length > 0) {
        firstInvalidTab = tab;
      }
      Object.assign(combinedErrors, tabErrors);
    });

    setErrors(combinedErrors);

    if (firstInvalidTab) {
      setActiveTab(firstInvalidTab);
      return;
    }

    setSaving(true);
    try {
      const didSave = await onSubmit({
        ...formData,
        potentialValue: parseFloat(formData.potentialValue) || 0,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        numberOfOtherQuotes: formData.numberOfOtherQuotes ? parseInt(formData.numberOfOtherQuotes) : undefined,
        leadScore: formData.leadScore ? parseInt(formData.leadScore) : undefined,
      });

      if (didSave) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper for toggling multi-select values (knownDamageType)
  const toggleDamageType = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      knownDamageType: prev.knownDamageType.includes(val)
        ? prev.knownDamageType.filter((v) => v !== val)
        : [...prev.knownDamageType, val],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "overflow-hidden p-0",
          isMobile
            ? "max-h-[92dvh] w-[calc(100vw-16px)] max-w-none rounded-t-[24px] rounded-b-none border-none p-0 sm:max-w-none"
            : "sm:max-w-[780px] rounded-md max-h-[90vh] overflow-y-auto"
        )}
      >
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0EEFF] sticky top-0 bg-white z-10">
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
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-6 flex w-full flex-wrap gap-1 overflow-x-auto bg-white/5 p-1 rounded-md">
              <TabsTrigger value="basic" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm">
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="property" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm">
                Property
              </TabsTrigger>
              <TabsTrigger value="service" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm">
                Service
              </TabsTrigger>
              <TabsTrigger value="qualification" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm">
                Qualification
              </TabsTrigger>
              {formData.isInsuranceClaim === "Yes" && (
                <TabsTrigger value="insurance" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm">
                  Insurance
                </TabsTrigger>
              )}
              <TabsTrigger value="assessment" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm">
                Assessment
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm">
                Lead Details
              </TabsTrigger>
            </TabsList>

            {/* ── TAB: Basic Info (existing) ─────────────────────────────── */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFieldValue("firstName", e.target.value)}
                    placeholder="John"
                    required
                    className={cn("h-11 rounded-md", getFieldErrorClass("firstName"))}
                  />
                  {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
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
                    className={cn("h-11 rounded-md", getFieldErrorClass("lastName"))}
                  />
                  {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Email Address</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFieldValue("email", e.target.value)}
                    placeholder="john@company.com"
                    className={cn("h-11 pl-10 rounded-md", getFieldErrorClass("email"))}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFieldValue("phone", e.target.value)}
                      placeholder="+1 (416) 555-0123"
                      className={cn("h-11 pl-10 rounded-md", getFieldErrorClass("phone"))}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Secondary Phone</Label>
                  <Input
                    value={formData.secondaryPhone}
                    onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                    placeholder="Alt phone number"
                    className="h-11 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Spouse / Co-Owner Name</Label>
                <Input
                  value={formData.spouseCoOwnerName}
                  onChange={(e) => setFormData({ ...formData, spouseCoOwnerName: e.target.value })}
                  placeholder="Jane Doe"
                  className="h-11 rounded-md"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Company</Label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Acme Inc."
                    className="h-11 pl-10 rounded-md"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── TAB: Property Info ──────────────────────────────────────── */}
            <TabsContent value="property" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">
                  Property Address <span className="text-red-500">*</span>
                </Label>
                <AddressAutocompleteInput
                  value={formData.propertyAddress}
                  onValueChange={(value) => setFieldValue("propertyAddress", value)}
                  onSelectAddress={(details) => {
                    setFormData((current) => ({
                      ...current,
                      propertyAddress: details.addressLine1 || details.formattedAddress || current.propertyAddress,
                      city: details.city || current.city,
                      state: details.state || current.state,
                      zipCode: details.postalCode || current.zipCode,
                    }));
                  }}
                  placeholder="123 Main Street"
                  className={cn("h-11 rounded-md", getFieldErrorClass("propertyAddress"))}
                />
                {errors.propertyAddress && <p className="text-xs text-red-500">{errors.propertyAddress}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Toronto"
                    className="h-11 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">State / Province</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="ON"
                    className="h-11 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Zip Code</Label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="M5V 2H1"
                    className="h-11 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Property Type</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(val) => setFormData({ ...formData, propertyType: val })}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="Residential" className="rounded-md">Residential</SelectItem>
                    <SelectItem value="Commercial" className="rounded-md">Commercial</SelectItem>
                    <SelectItem value="Multi-Family" className="rounded-md">Multi-Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Location (General)</Label>
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

            {/* ── TAB: Service Details ────────────────────────────────────── */}
            <TabsContent value="service" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">
                  What Service Do You Need? <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(val) => setFieldValue("serviceType", val)}
                >
                  <SelectTrigger className={cn("h-11 rounded-md", getFieldErrorClass("serviceType"))}>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {["Roof Replacement", "Roof Repair", "Storm/Hail Damage", "Roof Inspection",
                      "Leak Repair (Emergency)", "Gutters", "Siding", "Other"].map((s) => (
                        <SelectItem key={s} value={s} className="rounded-md">{s}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.serviceType && <p className="text-xs text-red-500">{errors.serviceType}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Is This an Insurance Claim?</Label>
                <Select
                  value={formData.isInsuranceClaim}
                  onValueChange={(val) => setFieldValue("isInsuranceClaim", val)}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="Yes" className="rounded-md">Yes</SelectItem>
                    <SelectItem value="No" className="rounded-md">No</SelectItem>
                    <SelectItem value="Not Sure" className="rounded-md">Not Sure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">How Urgent Is This?</Label>
                <Select
                  value={formData.urgencyLevel}
                  onValueChange={(val) => setFormData({ ...formData, urgencyLevel: val })}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {["Emergency (Leaking Now!)", "ASAP (Within a few days)", "Within a couple weeks",
                      "Just getting quotes / planning ahead"].map((u) => (
                        <SelectItem key={u} value={u} className="rounded-md">{u}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Preferred Contact Method</Label>
                  <Select
                    value={formData.preferredContactMethod}
                    onValueChange={(val) => setFormData({ ...formData, preferredContactMethod: val })}
                  >
                    <SelectTrigger className="h-11 rounded-md">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="Phone Call" className="rounded-md">Phone Call</SelectItem>
                      <SelectItem value="Text" className="rounded-md">Text</SelectItem>
                      <SelectItem value="Email" className="rounded-md">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Best Time to Reach</Label>
                  <Select
                    value={formData.bestTimeToContact}
                    onValueChange={(val) => setFormData({ ...formData, bestTimeToContact: val })}
                  >
                    <SelectTrigger className="h-11 rounded-md">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {["Morning (8am-12pm)", "Afternoon (12pm-5pm)", "Evening (5pm-8pm)", "Anytime"].map((t) => (
                        <SelectItem key={t} value={t} className="rounded-md">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Describe the Issue</Label>
                <Textarea
                  value={formData.issueDescription}
                  onChange={(e) => setFieldValue("issueDescription", e.target.value)}
                  placeholder="Describe what you're seeing — leaks, missing shingles, storm damage, etc."
                  rows={3}
                  className={cn("rounded-md resize-none", getFieldErrorClass("issueDescription"))}
                />
                {errors.issueDescription && <p className="text-xs text-red-500">{errors.issueDescription}</p>}
                <p className="text-xs text-[#94A3B8]">Max 500 characters</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">How Did You Hear About Us?</Label>
                <Select
                  value={formData.leadSourceName}
                  onValueChange={(val) => setFormData({ ...formData, leadSourceName: val })}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {Object.entries(sourceIconMap).map(([key, { icon: Icon, color }]) => (
                      <SelectItem key={key} value={key} className="rounded-md">
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color }} />
                          {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* ── TAB: Qualification ──────────────────────────────────────── */}
            <TabsContent value="qualification" className="space-y-6 mt-0">
              {/* Verification Checkboxes */}
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] mb-3">Verify Contact Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "confirmedName" as const, label: "Name Confirmed" },
                    { key: "confirmedPhone" as const, label: "Phone Confirmed" },
                    { key: "confirmedEmail" as const, label: "Email Confirmed" },
                    { key: "confirmedAddress" as const, label: "Address Confirmed" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 p-2 rounded-md hover:bg-[#F7F7FB] cursor-pointer">
                      <Checkbox
                        checked={formData[item.key]}
                        onCheckedChange={(checked) => setFormData({ ...formData, [item.key]: !!checked })}
                        className="data-[state=checked]:bg-[#6637F4] data-[state=checked]:border-[#6637F4]"
                      />
                      <span className="text-sm text-[#475569]">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ownership */}
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] mb-3">Ownership Verification</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Are You the Homeowner?</Label>
                    <Select value={formData.isHomeowner} onValueChange={(val) => setFormData({ ...formData, isHomeowner: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="Yes" className="rounded-md">Yes</SelectItem>
                        <SelectItem value="No" className="rounded-md">No</SelectItem>
                        <SelectItem value="Tenant" className="rounded-md">Tenant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Are You the Decision Maker?</Label>
                    <Select value={formData.isDecisionMaker} onValueChange={(val) => setFormData({ ...formData, isDecisionMaker: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="Yes" className="rounded-md">Yes</SelectItem>
                        <SelectItem value="No" className="rounded-md">No</SelectItem>
                        <SelectItem value="Need Spouse Approval" className="rounded-md">Need Spouse Approval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Roof Details */}
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] mb-3">Roof Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Approximate Roof Age</Label>
                    <Select value={formData.roofAge} onValueChange={(val) => setFormData({ ...formData, roofAge: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        {["0-5 years", "5-10 years", "10-15 years", "15-20 years", "20+ years", "Unknown"].map((a) => (
                          <SelectItem key={a} value={a} className="rounded-md">{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Current Roof Material</Label>
                    <Select value={formData.currentRoofMaterial} onValueChange={(val) => setFormData({ ...formData, currentRoofMaterial: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        {["Asphalt Shingle", "Metal", "Tile/Clay", "Flat/TPO/EPDM", "Wood Shake", "Slate", "Unknown"].map((m) => (
                          <SelectItem key={m} value={m} className="rounded-md">{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Number of Stories</Label>
                    <Select value={formData.numberOfStories} onValueChange={(val) => setFormData({ ...formData, numberOfStories: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="1" className="rounded-md">1 Story</SelectItem>
                        <SelectItem value="2" className="rounded-md">2 Stories</SelectItem>
                        <SelectItem value="3+" className="rounded-md">3+ Stories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Previous Roof Work?</Label>
                    <Select value={formData.previousRoofWork} onValueChange={(val) => setFormData({ ...formData, previousRoofWork: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="Yes" className="rounded-md">Yes</SelectItem>
                        <SelectItem value="No" className="rounded-md">No</SelectItem>
                        <SelectItem value="Unknown" className="rounded-md">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.previousRoofWork === "Yes" && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm font-medium text-[#475569]">Previous Work Details</Label>
                    <Input
                      value={formData.previousRoofWorkDetails}
                      onChange={(e) => setFormData({ ...formData, previousRoofWorkDetails: e.target.value })}
                      placeholder="Describe previous work done..."
                      className="h-11 rounded-md"
                    />
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium text-[#475569]">Known Damage Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Leak", "Missing Shingles", "Storm Damage", "Hail Damage", "Wind Damage", "Age/Wear", "Sagging/Structural", "Unknown"].map((dtype) => (
                      <label key={dtype} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs cursor-pointer border transition-colors ${formData.knownDamageType.includes(dtype)
                        ? "bg-[#6637F4]/10 border-[#6637F4] text-[#6637F4]"
                        : "bg-[#F7F7FB] border-[#E2E8F0] text-[#475569] hover:border-[#94A3B8]"
                        }`}>
                        <Checkbox
                          checked={formData.knownDamageType.includes(dtype)}
                          onCheckedChange={() => toggleDamageType(dtype)}
                          className="h-3.5 w-3.5 data-[state=checked]:bg-[#6637F4] data-[state=checked]:border-[#6637F4]"
                        />
                        {dtype}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium text-[#475569]">When Did Damage Occur?</Label>
                  <Input
                    value={formData.damageOccurrenceDate}
                    onChange={(e) => setFormData({ ...formData, damageOccurrenceDate: e.target.value })}
                    placeholder="e.g., Last week, June 2024 storm"
                    className="h-11 rounded-md"
                  />
                </div>
              </div>

              {/* Budget & Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] mb-3">Budget & Timeline</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Budget Range</Label>
                    <Select value={formData.budgetRange} onValueChange={(val) => setFormData({ ...formData, budgetRange: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        {["Under $5,000", "$5,000 - $10,000", "$10,000 - $20,000", "$20,000+", "Insurance Covering", "Not Sure"].map((b) => (
                          <SelectItem key={b} value={b} className="rounded-md">{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Timeline for Work</Label>
                    <Select value={formData.workTimeline} onValueChange={(val) => setFormData({ ...formData, workTimeline: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        {["ASAP", "1-2 Weeks", "Within 1 Month", "2-3 Months", "Flexible / Just Exploring"].map((t) => (
                          <SelectItem key={t} value={t} className="rounded-md">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Financing Needed?</Label>
                    <Select value={formData.financingNeeded} onValueChange={(val) => setFormData({ ...formData, financingNeeded: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="Yes" className="rounded-md">Yes</SelectItem>
                        <SelectItem value="No" className="rounded-md">No</SelectItem>
                        <SelectItem value="Maybe" className="rounded-md">Maybe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Getting Other Quotes?</Label>
                    <Select value={formData.gettingOtherQuotes} onValueChange={(val) => setFieldValue("gettingOtherQuotes", val)}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="Yes" className="rounded-md">Yes</SelectItem>
                        <SelectItem value="No" className="rounded-md">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Top Priority</Label>
                    <Select value={formData.topPriority} onValueChange={(val) => setFormData({ ...formData, topPriority: val })}>
                      <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-md">
                        {["Price", "Quality of Materials", "Speed/Timeline", "Warranty", "Company Reputation"].map((p) => (
                          <SelectItem key={p} value={p} className="rounded-md">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.gettingOtherQuotes === "Yes" && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm font-medium text-[#475569]">How Many Other Quotes?</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.numberOfOtherQuotes}
                      onChange={(e) => setFieldValue("numberOfOtherQuotes", e.target.value)}
                      placeholder="1-10"
                      className={cn("h-11 rounded-md w-32", getFieldErrorClass("numberOfOtherQuotes"))}
                    />
                    {errors.numberOfOtherQuotes && <p className="text-xs text-red-500">{errors.numberOfOtherQuotes}</p>}
                  </div>
                )}
              </div>

              {/* HOA */}
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] mb-3">HOA Information</h4>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">HOA Community?</Label>
                  <Select value={formData.isHOA} onValueChange={(val) => setFormData({ ...formData, isHOA: val })}>
                    <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="Yes" className="rounded-md">Yes</SelectItem>
                      <SelectItem value="No" className="rounded-md">No</SelectItem>
                      <SelectItem value="Not Sure" className="rounded-md">Not Sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.isHOA === "Yes" && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm font-medium text-[#475569]">HOA Restrictions Details</Label>
                    <Textarea
                      value={formData.hoaRestrictions}
                      onChange={(e) => setFormData({ ...formData, hoaRestrictions: e.target.value })}
                      placeholder="Color restrictions, material requirements, approval process..."
                      rows={2}
                      className="rounded-md resize-none"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── TAB: Insurance (conditional) ────────────────────────────── */}
            {formData.isInsuranceClaim === "Yes" && (
              <TabsContent value="insurance" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">
                    Insurance Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.insuranceCompanyName}
                    onChange={(e) => setFieldValue("insuranceCompanyName", e.target.value)}
                    placeholder="e.g., State Farm, Allstate, USAA..."
                    className={cn("h-11 rounded-md", getFieldErrorClass("insuranceCompanyName"))}
                  />
                  {errors.insuranceCompanyName && <p className="text-xs text-red-500">{errors.insuranceCompanyName}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Has Claim Been Filed?</Label>
                  <Select value={formData.hasClaimBeenFiled} onValueChange={(val) => setFormData({ ...formData, hasClaimBeenFiled: val })}>
                    <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="Yes" className="rounded-md">Yes</SelectItem>
                      <SelectItem value="No" className="rounded-md">No</SelectItem>
                      <SelectItem value="Planning To" className="rounded-md">Planning To</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Claim Number</Label>
                  <Input
                    value={formData.claimNumber}
                    onChange={(e) => setFormData({ ...formData, claimNumber: e.target.value })}
                    placeholder="Claim #"
                    className="h-11 rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Adjuster Assigned?</Label>
                  <Select value={formData.adjusterAssigned} onValueChange={(val) => setFieldValue("adjusterAssigned", val)}>
                    <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="Yes" className="rounded-md">Yes</SelectItem>
                      <SelectItem value="No" className="rounded-md">No</SelectItem>
                      <SelectItem value="Not Yet" className="rounded-md">Not Yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.adjusterAssigned === "Yes" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#475569]">Adjuster Name</Label>
                        <Input
                          value={formData.adjusterName}
                          onChange={(e) => setFormData({ ...formData, adjusterName: e.target.value })}
                          placeholder="Adjuster name"
                          className="h-11 rounded-md"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#475569]">Adjuster Phone</Label>
                        <Input
                          value={formData.adjusterPhone}
                          onChange={(e) => setFormData({ ...formData, adjusterPhone: e.target.value })}
                          placeholder="Phone number"
                          className="h-11 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">Adjuster Email</Label>
                      <Input
                        type="email"
                        value={formData.adjusterEmail}
                        onChange={(e) => setFieldValue("adjusterEmail", e.target.value)}
                        placeholder="adjuster@insurance.com"
                        className={cn("h-11 rounded-md", getFieldErrorClass("adjusterEmail"))}
                      />
                      {errors.adjusterEmail && <p className="text-xs text-red-500">{errors.adjusterEmail}</p>}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Adjuster Meeting Date</Label>
                  <Input
                    type="date"
                    value={formData.adjusterMeetingDate ? formData.adjusterMeetingDate.split("T")[0] : ""}
                    onChange={(e) => setFormData({ ...formData, adjusterMeetingDate: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                    className="h-11 rounded-md"
                  />
                </div>
              </TabsContent>
            )}

            {/* ── TAB: Sales Assessment ───────────────────────────────────── */}
            <TabsContent value="assessment" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Lead Score (1-10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.leadScore}
                    onChange={(e) => setFieldValue("leadScore", e.target.value)}
                    placeholder="1-10"
                    className={cn("h-11 rounded-md", getFieldErrorClass("leadScore"))}
                  />
                  {errors.leadScore && <p className="text-xs text-red-500">{errors.leadScore}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Next Step</Label>
                  <Select value={formData.nextStep} onValueChange={(val) => setFormData({ ...formData, nextStep: val })}>
                    <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select next step" /></SelectTrigger>
                    <SelectContent className="rounded-md">
                      {["Schedule Inspection", "Send More Info", "Follow Up Later", "Needs Insurance Filed First", "Dead Lead"].map((s) => (
                        <SelectItem key={s} value={s} className="rounded-md">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Follow-Up Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.followUpDateTime ? formData.followUpDateTime.slice(0, 16) : ""}
                    onChange={(e) => setFormData({ ...formData, followUpDateTime: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                    className="h-11 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Inspection Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.inspectionAppointmentDate ? formData.inspectionAppointmentDate.slice(0, 16) : ""}
                    onChange={(e) => setFormData({ ...formData, inspectionAppointmentDate: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                    className="h-11 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Disqualified Reason</Label>
                <Select value={formData.disqualifiedReason} onValueChange={(val) => setFormData({ ...formData, disqualifiedReason: val })}>
                  <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Only if disqualified" /></SelectTrigger>
                  <SelectContent className="rounded-md">
                    {["Not Homeowner", "No Budget", "Tire Kicker", "Outside Service Area", "No Authority", "Unreachable", "Other"].map((r) => (
                      <SelectItem key={r} value={r} className="rounded-md">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">
                  Qualification Notes <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={formData.qualificationCallNotes}
                  onChange={(e) => setFieldValue("qualificationCallNotes", e.target.value)}
                  placeholder="Notes from the call or visit..."
                  rows={4}
                  className={cn("rounded-md resize-none", getFieldErrorClass("qualificationCallNotes"))}
                />
                {errors.qualificationCallNotes && <p className="text-xs text-red-500">{errors.qualificationCallNotes}</p>}
              </div>
            </TabsContent>

            {/* ── TAB: Lead Details (existing — status/temp/value/assignee) ── */}
            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Potential Value</Label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    type="number"
                    value={formData.potentialValue}
                    onChange={(e) => setFieldValue("potentialValue", e.target.value)}
                    placeholder="50000"
                    className={cn("h-11 pl-10 rounded-md", getFieldErrorClass("potentialValue"))}
                  />
                </div>
                {errors.potentialValue && <p className="text-xs text-red-500">{errors.potentialValue}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Assigned To</Label>
                <Select
                  value={formData.assignedToId}
                  onValueChange={(val) => setFormData({ ...formData, assignedToId: val })}
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
                <Label className="text-sm font-medium text-[#475569]">Lead Source</Label>
                <Select
                  value={formData.leadSourceId}
                  onValueChange={(val) => setFormData({ ...formData, leadSourceId: val })}
                >
                  <SelectTrigger className="h-11 rounded-md">
                    <div className="flex items-center gap-2">
                      <Target size={16} className="text-[#475569]" />
                      <SelectValue placeholder="Select source" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="none" className="rounded-md">
                      <span className="text-[#94A3B8]">No Source</span>
                    </SelectItem>
                    {leadSourceOptions.map((src) => (
                      <SelectItem key={src.id} value={src.id} className="rounded-md">
                        {src.name}
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

              <div className="grid grid-cols-2 gap-4">
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
                      onChange={(e) => setFieldValue("website", e.target.value)}
                      placeholder="https://company.com"
                      className={cn("h-11 pl-10 rounded-md", getFieldErrorClass("website"))}
                    />
                  </div>
                  {errors.website && <p className="text-xs text-red-500">{errors.website}</p>}
                </div>
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

          <DialogFooter className={cn("gap-3 pt-6 sm:justify-between", isMobile && "sticky bottom-0 -mx-6 -mb-6 border-t bg-white px-6 py-4")}>
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            {activeTabIndex > 0 && (
              <Button type="button" variant="outline" onClick={handlePrevious} className="rounded-md">
                Previous
              </Button>
            )}
            <Button
              type={isLastTab ? "submit" : "button"}
              onClick={isLastTab ? undefined : handleNext}
              disabled={saving}
              className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-md"
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : !isLastTab ? (
                <>
                  Next
                  <ArrowRight size={16} className="ml-2" />
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
  const sourceInfo = getSourceInfo(lead.leadSourceName);
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
              <p className="text-sm text-[#94A3B8]">{lead.companyName}</p>
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

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Score & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#F7F7FB] rounded-md">
              <p className="text-xs text-[#475569] mb-2">Lead Score</p>
              <div className="flex items-center gap-3">
                <span
                  className="text-3xl font-bold"
                  style={{ color: getScoreColor(lead.leadScore) }}
                >
                  {lead.leadScore}
                </span>
                <div className="flex-1">
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${lead.leadScore}%`,
                        backgroundColor: getScoreColor(lead.leadScore),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#F7F7FB] rounded-md">
              <p className="text-xs text-[#475569] mb-2">Potential Value</p>
              <span className="text-3xl font-bold text-[#0F172A]">
                {formatCurrency(lead.potentialValue, lead.currency)}
              </span>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center">
                  <Mail size={18} className="text-[#6637F4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#475569]">Email</p>
                  <p className="text-sm font-medium text-[#0F172A] truncate">{lead.email}</p>
                </div>
              </a>
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-green-100 flex items-center justify-center">
                  <Phone size={18} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#475569]">Phone</p>
                  <p className="text-sm font-medium text-[#0F172A] truncate">{lead.phone}</p>
                </div>
              </a>
              <div className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md">
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
                  className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-md bg-[#6637F4]/10 flex items-center justify-center">
                    <Globe size={18} className="text-[#6637F4]" />
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
            <div className="p-4 bg-[#F7F7FB] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Lead Source</p>
              <div className="flex items-center gap-2">
                <SourceIcon size={16} style={{ color: sourceInfo.color }} />
                <span className="font-medium text-[#0F172A]">{sourceInfo.name}</span>
              </div>
            </div>
            <div className="p-4 bg-[#F7F7FB] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Assigned To</p>
              <div className="flex items-center gap-2">
                {lead.assignedTo ? (
                  <>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs bg-slate-200">{lead.assignedTo.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-[#0F172A]">{lead.assignedTo}</span>
                  </>
                ) : (
                  <span className="font-medium text-[#94A3B8] italic">Unassigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Follow-up Dates */}
          {(lead.lastContact || lead.nextFollowUp) && (
            <div className="grid grid-cols-2 gap-4">
              {lead.lastContact && (
                <div className="p-4 bg-[#F7F7FB] rounded-md">
                  <p className="text-xs text-[#475569] mb-1">Last Contact</p>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[#94A3B8]" />
                    <span className="font-medium text-[#0F172A]">{formatDate(lead.lastContact)}</span>
                  </div>
                </div>
              )}
              {lead.nextFollowUp && (
                <div className="p-4 bg-[#6637F4]/10 rounded-md border border-[#6637F4]/20">
                  <p className="text-xs text-[#6637F4] mb-1">Next Follow-up</p>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-[#6637F4]" />
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
                    className="px-3 py-1 bg-[#6637F4]/10 text-[#6637F4] rounded-md text-sm font-medium"
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
              <div className="p-4 bg-[#F7F7FB] rounded-md">
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
                  <Sparkles size={14} className="text-[#6637F4]" />
                  <h3 className="text-sm font-semibold text-[#0F172A]">AI Insights</h3>
                  <span className="ai-tag">AI</span>
                </div>
                <div className="p-4 bg-[#F0EEFF] rounded-md border border-[#6637F4]/15 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {insights.map((type) => (
                      <AiInsightBadge key={type} type={type} size="md" />
                    ))}
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    {lead.leadScore >= 80
                      ? `High-value lead with ${lead.leadScore}% score. Recommend prioritizing engagement.`
                      : lead.leadScore >= 50
                        ? `Moderate lead score (${lead.leadScore}%). Consider nurturing through targeted outreach.`
                        : `Lead needs attention — score at ${lead.leadScore}%. Review qualification criteria.`}
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
                <div className="w-8 h-8 rounded-full bg-[#6637F4]/10 flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-[#6637F4]" />
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]">Lead created</p>
                  <p className="text-xs text-[#475569]">{getRelativeTime(lead.createdAt)}</p>
                </div>
              </div>
              {lead.lastContact && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={14} className="text-[#6637F4]" />
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
          <Button onClick={onEdit} className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-md gap-2">
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
  mode = "qualification",
}: {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSchedule: (meetingData: Record<string, unknown>) => Promise<void>;
  onSkip: () => void;
  mode?: "qualification" | "followUp";
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
  const [locSuggestions, setLocSuggestions] = useState<Array<{ description: string; placeId: string }>>([]);
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const locAutocompleteRef = useRef<HTMLDivElement>(null);
  const locDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isFollowUpMode = mode === "followUp";

  // Close location autocomplete on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locAutocompleteRef.current && !locAutocompleteRef.current.contains(e.target as Node)) {
        setShowLocSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocationChange = useCallback((value: string) => {
    setMeetingLocation(value);
    if (locDebounceTimer.current) clearTimeout(locDebounceTimer.current);
    if (value.length < 3) {
      setLocSuggestions([]);
      setShowLocSuggestions(false);
      return;
    }
    locDebounceTimer.current = setTimeout(async () => {
      try {
        const results = await autocompleteAddress(value);
        setLocSuggestions(results);
        setShowLocSuggestions(results.length > 0);
      } catch {
        setLocSuggestions([]);
        setShowLocSuggestions(false);
      }
    }, 300);
  }, []);

  const selectLocSuggestion = (description: string) => {
    setMeetingLocation(description);
    setLocSuggestions([]);
    setShowLocSuggestions(false);
  };

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
      setMeetingTitle(`${isFollowUpMode ? "Follow-up" : "Meeting"} with ${lead.firstName} ${lead.lastName}`);
      setMeetingType("online");
      setMeetingTime("10:00");
      setMeetingDuration("30");
      setMeetingLocation("");
      setMeetingLink("");
      setMeetingNotes("");
    }
  }, [isFollowUpMode, isOpen, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingDate || !meetingTime || !lead) return;
    setIsSubmitting(true);
    try {
      const startTime = new Date(`${meetingDate}T${meetingTime}:00`);
      const endTime = new Date(startTime.getTime() + parseInt(meetingDuration) * 60000);

      await onSchedule({
        title: meetingTitle || `${isFollowUpMode ? "Follow-up" : "Meeting"} with ${lead.firstName} ${lead.lastName}`,
        description: `${isFollowUpMode ? "Follow-up" : "Qualification meeting"} with lead ${lead.firstName} ${lead.lastName}${lead.companyName ? ` from ${lead.companyName}` : ""}. ${meetingNotes ? `\n\nNotes: ${meetingNotes}` : ""}`,
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
        <div className="bg-gradient-to-r from-[#6637F4] to-[#06B6D4] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarDays size={22} />
              {isFollowUpMode ? "Schedule Follow-up" : "Schedule Meeting"}
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-1">
              {isFollowUpMode ? (
                <>
                  Schedule the next touchpoint for{" "}
                  <span className="font-semibold text-white">{lead.firstName} {lead.lastName}</span>.
                </>
              ) : (
                <>
                  <span className="font-semibold text-white">{lead.firstName} {lead.lastName}</span> has been qualified!
                  Schedule a meeting to move forward.
                </>
              )}
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
                  ? "border-[#6637F4] bg-[#6637F4]/5 shadow-sm"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${meetingType === "online" ? "bg-[#6637F4]/10" : "bg-gray-100"
                  }`}>
                  <Video size={24} className={meetingType === "online" ? "text-[#6637F4]" : "text-gray-400"} />
                </div>
                <span className={`font-semibold text-sm ${meetingType === "online" ? "text-[#6637F4]" : "text-gray-600"
                  }`}>Online Meeting</span>
                <span className="text-xs text-gray-400">Video call / Google Meet</span>
                {meetingType === "online" && (
                  <div className="absolute top-2 right-2">
                    <Check size={16} className="text-[#6637F4]" />
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
                <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6637F4]" />
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
              <div className="relative mt-1.5" ref={locAutocompleteRef}>
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F59E0B] z-10" />
                <Input
                  id="meetingLocation"
                  value={meetingLocation}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  placeholder="Start typing an address..."
                  className="pl-9 rounded-lg"
                  autoComplete="off"
                  required
                />
                {showLocSuggestions && locSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {locSuggestions.map((s, i) => (
                      <button
                        key={s.placeId || i}
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#f0fdfa] transition-colors flex items-center gap-2 border-b last:border-b-0 border-gray-100"
                        onClick={() => selectLocSuggestion(s.description)}
                      >
                        <MapPin size={14} className="text-[#F59E0B] flex-shrink-0" />
                        <span className="truncate">{s.description}</span>
                      </button>
                    ))}
                  </div>
                )}
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
              {isFollowUpMode ? "Cancel" : "Skip for now"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-lg gap-2 text-white ${meetingType === "online"
                ? "bg-[#6637F4] hover:bg-[#6637F4]/90"
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
              {isSubmitting ? "Scheduling..." : isFollowUpMode ? "Schedule Follow-up" : "Schedule Meeting"}
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
  companyName: (() => {
    const cn = apiLead.companyName || "";
    if (cn && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cn)) return "";
    return cn;
  })(),
  jobTitle: apiLead.jobTitle || "",
  website: apiLead.website,
  location: apiLead.location || "",
  leadSourceName: (apiLead.leadSource?.name || "other").toLowerCase().replace(/\s+/g, "_"),
  status: (apiLead.status || "NEW") as LeadStatus,
  displayScore: (() => {
    if (apiLead.leadScore != null) return Math.min(apiLead.leadScore * 10, 100);
    let s = 20;
    if (apiLead.email) s += 10;
    if (apiLead.phone) s += 10;
    if (apiLead.companyName) s += 5;
    if (apiLead.propertyAddress) s += 10;
    if (apiLead.serviceType) s += 10;
    if (apiLead.potentialValue && Number(apiLead.potentialValue) > 0) s += 10;
    if (apiLead.temperature === "HOT") s += 15;
    else if (apiLead.temperature === "WARM") s += 5;
    if (apiLead.assignedToId) s += 5;
    return Math.min(s, 100);
  })(),
  temperature: (apiLead.temperature || "WARM") as LeadTemperature,
  potentialValue: apiLead.potentialValue || 0,
  currency: "CAD",
  assignedTo: apiLead.assignedTo
    ? `${apiLead.assignedTo.user?.firstName || ""} ${apiLead.assignedTo.user?.lastName || ""}`.trim()
    : "",
  assignedToName: apiLead.assignedTo
    ? `${apiLead.assignedTo.user?.firstName || ""} ${apiLead.assignedTo.user?.lastName || ""}`.trim()
    : "",
  assignedToId: apiLead.assignedToId || apiLead.assignedTo?.id || "",
  leadSourceId: apiLead.leadSourceId || "",
  tags: apiLead.tags?.map((t: any) => t.name) || [],
  notes: apiLead.notes,
  lastContact: apiLead.lastContact,
  nextFollowUp: apiLead.nextFollowUp,
  createdAt: apiLead.createdAt,
  updatedAt: apiLead.updatedAt,

  // ── Stage 1: Property Info ─────────────────────────────────────────
  propertyAddress: apiLead.propertyAddress || "",
  city: apiLead.city || "",
  state: apiLead.state || "",
  zipCode: apiLead.zipCode || "",
  propertyType: apiLead.propertyType || "",

  // ── Stage 1: Service Request ───────────────────────────────────────
  serviceType: apiLead.serviceType || "",
  isInsuranceClaim: apiLead.isInsuranceClaim || "",
  urgencyLevel: apiLead.urgencyLevel || "",
  preferredContactMethod: apiLead.preferredContactMethod || "",
  bestTimeToContact: apiLead.bestTimeToContact || "",
  issueDescription: apiLead.issueDescription || "",

  // ── Stage 2: Verification ─────────────────────────────────────────
  confirmedName: apiLead.confirmedName || false,
  confirmedPhone: apiLead.confirmedPhone || false,
  confirmedEmail: apiLead.confirmedEmail || false,
  confirmedAddress: apiLead.confirmedAddress || false,
  secondaryPhone: apiLead.secondaryPhone || "",
  spouseCoOwnerName: apiLead.spouseCoOwnerName || "",

  // ── Stage 2: Ownership ────────────────────────────────────────────
  isHomeowner: apiLead.isHomeowner || "",
  isDecisionMaker: apiLead.isDecisionMaker || "",
  ownershipType: apiLead.ownershipType || "",

  // ── Stage 2: Roof Details ─────────────────────────────────────────
  roofAge: apiLead.roofAge || "",
  currentRoofMaterial: apiLead.currentRoofMaterial || "",
  numberOfStories: apiLead.numberOfStories || "",
  knownDamageType: apiLead.knownDamageType || [],
  damageOccurrenceDate: apiLead.damageOccurrenceDate || "",
  previousRoofWork: apiLead.previousRoofWork || "",
  previousRoofWorkDetails: apiLead.previousRoofWorkDetails || "",

  // ── Stage 2: Insurance ────────────────────────────────────────────
  insuranceCompanyName: apiLead.insuranceCompanyName || "",
  hasClaimBeenFiled: apiLead.hasClaimBeenFiled || "",
  claimNumber: apiLead.claimNumber || "",
  adjusterAssigned: apiLead.adjusterAssigned || "",
  adjusterName: apiLead.adjusterName || "",
  adjusterPhone: apiLead.adjusterPhone || "",
  adjusterEmail: apiLead.adjusterEmail || "",
  adjusterMeetingDate: apiLead.adjusterMeetingDate || "",

  // ── Stage 2: Budget & Timeline ────────────────────────────────────
  budgetRange: apiLead.budgetRange || "",
  workTimeline: apiLead.workTimeline || "",
  financingNeeded: apiLead.financingNeeded || "",
  gettingOtherQuotes: apiLead.gettingOtherQuotes || "",
  numberOfOtherQuotes: apiLead.numberOfOtherQuotes || undefined,
  topPriority: apiLead.topPriority || "",

  // ── Stage 2: HOA ──────────────────────────────────────────────────
  isHOA: apiLead.isHOA || "",
  hoaRestrictions: apiLead.hoaRestrictions || "",

  // ── Stage 2: Sales Assessment ─────────────────────────────────────
  leadScore: apiLead.leadScore || undefined,
  disqualifiedReason: apiLead.disqualifiedReason || "",
  nextStep: apiLead.nextStep || "",
  followUpDateTime: apiLead.followUpDateTime || "",
  inspectionAppointmentDate: apiLead.inspectionAppointmentDate || "",
  qualificationCallNotes: apiLead.qualificationCallNotes || "",
});

const AllLeads = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const { isMobile, isTablet } = useIsMobile();

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
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [leadSources, setLeadSources] = useState<{ id: string; name: string }[]>([]);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [emailComposerTarget, setEmailComposerTarget] = useState<{ to: string; name: string; leadId?: string } | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState<null | "assign" | "tags" | "status" | "temperature" | "export" | "delete" | "import" | "duplicate">(null);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkAssignedToId, setBulkAssignedToId] = useState("");
  const [isBulkTagsOpen, setIsBulkTagsOpen] = useState(false);
  const [bulkTagsInput, setBulkTagsInput] = useState("");

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [meetingDialogMode, setMeetingDialogMode] = useState<"qualification" | "followUp">("qualification");
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [pendingQualifiedLead, setPendingQualifiedLead] = useState<Lead | null>(null);

  // Duplicate detection states
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [pendingLeadData, setPendingLeadData] = useState<Record<string, any> | null>(null);

  // Side panel state
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [sidePanelLead, setSidePanelLead] = useState<Lead | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !window.navigator.onLine : false
  );

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getLeads();
      const apiLeads = Array.isArray(response) ? response : [];
      setLeads(apiLeads.map(mapApiLead));
      setLoadError(null);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      setLoadError("Failed to load leads.");
      toast({ title: "Error", description: "Failed to load leads.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadLookupData = useCallback(async () => {
    try {
      const [employeeData, leadSourceData, tagsResponse] = await Promise.all([
        getEmployees().catch(() => []),
        getLeadSources({ limit: 200 }).catch(() => []),
        api.get("/tags/all").catch(() => ({ data: { data: [] } })),
      ]);

      setEmployees(
        (Array.isArray(employeeData) ? employeeData : []).map((employee: any) => ({
          id: employee.id,
          name: `${employee.user?.firstName || ""} ${employee.user?.lastName || ""}`.trim() || employee.email || "Employee",
        }))
      );
      setLeadSources(
        (Array.isArray(leadSourceData) ? leadSourceData : []).map((source: any) => ({
          id: String(source.id),
          name: String(source.name || ""),
        }))
      );

      const tagData = tagsResponse?.data?.data || tagsResponse?.data || [];
      setAvailableTags(
        (Array.isArray(tagData) ? tagData : []).map((tag: any) => ({
          id: String(tag.id),
          name: String(tag.name || ""),
          color: typeof tag.color === "string" ? tag.color : null,
        }))
      );
    } catch (error) {
      console.error("Failed to load lead lookup data:", error);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
    void loadLookupData();
  }, [loadLeads, loadLookupData]);

  useEffect(() => {
    const editLeadId = (location.state as { editLeadId?: string } | null)?.editLeadId;
    if (!editLeadId || leads.length === 0) {
      return;
    }

    const leadToEdit = leads.find((lead) => lead.id === editLeadId);
    if (leadToEdit) {
      setCurrentLead(leadToEdit);
      setIsFormOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [leads, location.state]);

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

  const { handlers, pullDistance, isRefreshing } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: loadLeads,
  });

  // Filtered and sorted leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Filter by tab
    if (activeTab === "new") {
      result = result.filter((l) => l.status === "NEW");
    } else if (activeTab === "qualified") {
      result = result.filter((l) => l.status === "QUALIFIED");
    } else if (activeTab === "hot") {
      result = result.filter((l) => l.temperature === "HOT");
    } else if (activeTab === "won") {
      result = result.filter((l) => l.status === "WON");
    } else if (activeTab === "lost") {
      result = result.filter((l) => l.status === "LOST");
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.firstName.toLowerCase().includes(query) ||
          l.lastName.toLowerCase().includes(query) ||
          l.email.toLowerCase().includes(query) ||
          l.companyName.toLowerCase().includes(query) ||
          l.jobTitle.toLowerCase().includes(query)
      );
    }

    // Filter by source
    if (selectedSource !== "all") {
      result = result.filter((l) => l.leadSourceName === selectedSource);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((l) => l.status === selectedStatus);
    }

    // Filter by temperature
    if (selectedTemperature !== "all") {
      result = result.filter((l) => l.temperature === normalizeLeadTemperatureValue(selectedTemperature));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "score":
          comparison = (a.leadScore ?? a.displayScore ?? 0) - (b.leadScore ?? b.displayScore ?? 0);
          break;
        case "value":
          comparison = a.potentialValue - b.potentialValue;
          break;
        case "name":
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [leads, activeTab, searchQuery, selectedSource, selectedStatus, selectedTemperature, sortBy, sortOrder]);

  const closeMeetingDialog = useCallback(() => {
    setIsMeetingDialogOpen(false);
    setPendingQualifiedLead(null);
    setMeetingDialogMode("qualification");
  }, []);

  const ensureTagOptionsLoaded = useCallback(async () => {
    if (availableTags.length > 0) {
      return availableTags;
    }

    const response = await api.get("/tags/all");
    const tagData = response.data?.data || response.data || [];
    const mappedTags = (Array.isArray(tagData) ? tagData : []).map((tag: any) => ({
      id: String(tag.id),
      name: String(tag.name || ""),
      color: typeof tag.color === "string" ? tag.color : null,
    }));
    setAvailableTags(mappedTags);
    return mappedTags;
  }, [availableTags]);

  const parseTagNames = useCallback((input: string[] | string | undefined): string[] => {
    if (Array.isArray(input)) {
      return [...new Set(input.map((tag) => tag.trim()).filter(Boolean))];
    }

    if (typeof input !== "string") {
      return [];
    }

    return [...new Set(input.split(",").map((tag) => tag.trim()).filter(Boolean))];
  }, []);

  const resolveTagIdsByNames = useCallback(async (tagNames: string[]) => {
    const uniqueTagNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
    if (uniqueTagNames.length === 0) {
      return [];
    }

    let tagOptions = await ensureTagOptionsLoaded();
    const tagMap = new Map(tagOptions.map((tag) => [normalizeLookupKey(tag.name), tag]));
    const missingNames = uniqueTagNames.filter((name) => !tagMap.has(normalizeLookupKey(name)));

    if (missingNames.length > 0) {
      const createdTags = await Promise.all(
        missingNames.map(async (name) => {
          const response = await api.post("/tags", { name, color: pickTagColor(name) });
          const created = response.data?.data || response.data;
          return {
            id: String(created.id),
            name: String(created.name || name),
            color: typeof created.color === "string" ? created.color : pickTagColor(name),
          } as TagOption;
        })
      );

      tagOptions = [...tagOptions, ...createdTags];
      setAvailableTags(tagOptions);
      createdTags.forEach((tag) => {
        tagMap.set(normalizeLookupKey(tag.name), tag);
      });
    }

    return uniqueTagNames
      .map((name) => tagMap.get(normalizeLookupKey(name))?.id)
      .filter((id): id is string => Boolean(id));
  }, [ensureTagOptionsLoaded]);

  const buildLeadMutationPayload = useCallback(async (data: Partial<Lead>) => {
    const apiData: Record<string, any> = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone || undefined,
      companyName: data.companyName,
      jobTitle: data.jobTitle || undefined,
      website: data.website && data.website.trim() ? data.website.trim() : undefined,
      location: data.location || undefined,
      status: normalizeLeadStatusValue(String(data.status || LeadStatus.NEW)),
      temperature: normalizeLeadTemperatureValue(String(data.temperature || LeadTemperature.WARM)),
      potentialValue: data.potentialValue || 0,
      notes: data.notes || undefined,
      ...buildNewFieldsPayload(data),
    };

    if (data.leadSourceId && data.leadSourceId !== "none" && data.leadSourceId !== "") {
      apiData.leadSourceId = data.leadSourceId;
    } else if ("leadSourceId" in data) {
      apiData.leadSourceId = null;
    }

    if (data.assignedToId && data.assignedToId !== "unassigned" && data.assignedToId !== "") {
      apiData.assignedToId = data.assignedToId;
    } else if ("assignedToId" in data) {
      apiData.assignedToId = null;
    }

    const tagIds = await resolveTagIdsByNames(parseTagNames(data.tags));
    if (tagIds.length > 0 || "tags" in data) {
      apiData.tagIds = tagIds;
    }

    return apiData;
  }, [parseTagNames, resolveTagIdsByNames]);

  const syncLeadRecord = useCallback((updatedLead: Lead) => {
    setLeads((prev) => prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)));
    setCurrentLead((prev) => (prev?.id === updatedLead.id ? updatedLead : prev));
    setSidePanelLead((prev) => (prev?.id === updatedLead.id ? updatedLead : prev));
  }, []);

  const openLeadEmailComposer = useCallback((lead: Lead) => {
    if (!lead.email) {
      toast({
        title: "Email Missing",
        description: "This lead does not have an email address yet.",
        variant: "destructive",
      });
      return;
    }

    setEmailComposerTarget({
      to: lead.email,
      name: `${lead.firstName} ${lead.lastName}`.trim() || lead.email,
      leadId: lead.id,
    });
  }, [toast]);

  const handleCallLead = useCallback((lead: Lead) => {
    if (!lead.phone) {
      toast({
        title: "Phone Missing",
        description: "This lead does not have a phone number yet.",
        variant: "destructive",
      });
      return;
    }

    window.location.href = `tel:${lead.phone}`;
  }, [toast]);

  const exportLeadRecords = useCallback((records: Lead[], baseFileName: string) => {
    if (records.length === 0) {
      toast({
        title: "Nothing to Export",
        description: "There are no leads matching your current selection.",
      });
      return;
    }

    const rows: Array<Array<unknown>> = [
      [
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Company Name",
        "Job Title",
        "Location",
        "Status",
        "Temperature",
        "Potential Value",
        "Assigned To",
        "Lead Source",
        "Property Address",
        "City",
        "State",
        "Zip Code",
        "Service Type",
        "Insurance Claim",
        "Notes",
        "Tags",
      ],
      ...records.map((lead) => [
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.phone,
        lead.companyName,
        lead.jobTitle,
        lead.location,
        lead.status,
        lead.temperature,
        lead.potentialValue,
        lead.assignedToName,
        getSourceInfo(lead.leadSourceName).name,
        lead.propertyAddress,
        lead.city,
        lead.state,
        lead.zipCode,
        lead.serviceType,
        lead.isInsuranceClaim,
        lead.notes,
        (lead.tags || []).join(", "),
      ]),
    ];

    downloadCsv(rows, `${baseFileName}-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [toast]);

  // Handlers
  // Helper to build the new-fields portion of the API payload
  const buildNewFieldsPayload = (data: Partial<Lead>) => {
    const opt = (v: any) => (v && v !== "" ? v : undefined);
    return {
      // Stage 1: Property
      propertyAddress: opt(data.propertyAddress),
      city: opt(data.city),
      state: opt(data.state),
      zipCode: opt(data.zipCode),
      propertyType: opt(data.propertyType),
      // Stage 1: Service
      serviceType: opt(data.serviceType),
      isInsuranceClaim: opt(data.isInsuranceClaim),
      urgencyLevel: opt(data.urgencyLevel),
      preferredContactMethod: opt(data.preferredContactMethod),
      bestTimeToContact: opt(data.bestTimeToContact),
      issueDescription: opt(data.issueDescription),
      // Stage 2: Verification
      confirmedName: data.confirmedName || false,
      confirmedPhone: data.confirmedPhone || false,
      confirmedEmail: data.confirmedEmail || false,
      confirmedAddress: data.confirmedAddress || false,
      secondaryPhone: opt(data.secondaryPhone),
      spouseCoOwnerName: opt(data.spouseCoOwnerName),
      // Stage 2: Ownership
      isHomeowner: opt(data.isHomeowner),
      isDecisionMaker: opt(data.isDecisionMaker),
      ownershipType: opt(data.ownershipType),
      // Stage 2: Roof
      roofAge: opt(data.roofAge),
      currentRoofMaterial: opt(data.currentRoofMaterial),
      numberOfStories: opt(data.numberOfStories),
      knownDamageType: data.knownDamageType?.length ? data.knownDamageType : undefined,
      damageOccurrenceDate: opt(data.damageOccurrenceDate),
      previousRoofWork: opt(data.previousRoofWork),
      previousRoofWorkDetails: opt(data.previousRoofWorkDetails),
      // Stage 2: Insurance
      insuranceCompanyName: opt(data.insuranceCompanyName),
      hasClaimBeenFiled: opt(data.hasClaimBeenFiled),
      claimNumber: opt(data.claimNumber),
      adjusterAssigned: opt(data.adjusterAssigned),
      adjusterName: opt(data.adjusterName),
      adjusterPhone: opt(data.adjusterPhone),
      adjusterEmail: opt(data.adjusterEmail),
      adjusterMeetingDate: opt(data.adjusterMeetingDate),
      // Stage 2: Budget
      budgetRange: opt(data.budgetRange),
      workTimeline: opt(data.workTimeline),
      financingNeeded: opt(data.financingNeeded),
      gettingOtherQuotes: opt(data.gettingOtherQuotes),
      numberOfOtherQuotes: data.numberOfOtherQuotes || undefined,
      topPriority: opt(data.topPriority),
      // Stage 2: HOA
      isHOA: opt(data.isHOA),
      hoaRestrictions: opt(data.hoaRestrictions),
      // Stage 2: Assessment
      leadScore: data.leadScore || undefined,
      disqualifiedReason: opt(data.disqualifiedReason),
      nextStep: opt(data.nextStep),
      followUpDateTime: opt(data.followUpDateTime),
      inspectionAppointmentDate: opt(data.inspectionAppointmentDate),
      qualificationCallNotes: opt(data.qualificationCallNotes),
    };
  };

  const getLeadErrorMessage = (error: any, fallback: string) => {
    const responseData = error?.response?.data;

    if (
      typeof responseData?.message === "string" &&
      responseData.message.trim() &&
      responseData.message !== "Validation failed"
    ) {
      return responseData.message;
    }

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

  const handleAddLead = async (data: Partial<Lead>) => {
    try {
      const apiData = await buildLeadMutationPayload(data);
      const responseData = await createLead(apiData);
      const newLead = mapApiLead(responseData);
      setLeads((prev) => [newLead, ...prev]);
      toast({
        title: "Lead Added",
        description: `${newLead.firstName} ${newLead.lastName} has been added to your leads.`,
      });
      return true;
    } catch (error: any) {
      if (error.response?.status === 409 && error.response?.data?.error === 'DUPLICATE_LEAD_DETECTED') {
        setDuplicateMatches(error.response.data.duplicates || []);
        setPendingLeadData(apiData);
        setIsDuplicateWarningOpen(true);
        return false;
      }
      console.error("Failed to add lead:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to add lead."),
        variant: "destructive",
      });
      return false;
    }
  };

  // Create lead anyway (skip duplicate check)
  const handleCreateAnyway = async () => {
    if (!pendingLeadData) return;
    try {
      const responseData = await createLead({ ...pendingLeadData, skipDuplicateCheck: true });
      const newLead = mapApiLead(responseData);
      setLeads((prev) => [newLead, ...prev]);
      setIsDuplicateWarningOpen(false);
      setIsFormOpen(false);
      setCurrentLead(null);
      setPendingLeadData(null);
      setDuplicateMatches([]);
      toast({
        title: "Lead Added",
        description: `${newLead.firstName} ${newLead.lastName} has been added (duplicate check skipped).`,
      });
    } catch (error: any) {
      console.error("Failed to create lead:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to add lead."),
        variant: "destructive",
      });
    }
  };

  // Merge with an existing duplicate lead
  const handleMergeWithDuplicate = async (targetLeadId: string) => {
    if (!pendingLeadData) return;
    try {
      // First create the lead (skip check), then merge it into the target
      const responseData = await createLead({ ...pendingLeadData, skipDuplicateCheck: true });
      const newLeadId = (responseData as any).id;
      const mergeResult = await mergeLeads(targetLeadId, newLeadId);

      // Refresh leads list
      const response = await getLeads();
      const apiLeads = Array.isArray(response) ? response : [];
      setLeads(apiLeads.map(mapApiLead));

      setIsDuplicateWarningOpen(false);
      setIsFormOpen(false);
      setCurrentLead(null);
      setPendingLeadData(null);
      setDuplicateMatches([]);
      toast({
        title: "Leads Merged",
        description: `Lead data merged into existing record. ${mergeResult.fieldsMerged?.length || 0} fields updated.`,
      });
    } catch (error: any) {
      console.error("Failed to merge leads:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to merge leads."),
        variant: "destructive",
      });
    }
  };

  const handleEditLead = async (data: Partial<Lead>) => {
    if (!currentLead) return false;
    try {
      const apiData = await buildLeadMutationPayload(data);
      const responseData = await updateLead(currentLead.id, apiData);
      const updatedLead = mapApiLead(responseData);
      syncLeadRecord(updatedLead);
      toast({
        title: "Lead Updated",
        description: "The lead has been updated successfully.",
      });
      return true;
    } catch (error: any) {
      console.error("Failed to update lead:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to update lead."),
        variant: "destructive",
      });
      return false;
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

  const handleDuplicateLead = async (lead: Lead) => {
    try {
      setBulkActionLoading("duplicate");
      const apiData = await buildLeadMutationPayload({
        ...lead,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
      });
      const responseData = await createLead({ ...apiData, skipDuplicateCheck: true });
      const duplicatedLead = mapApiLead(responseData);
      setLeads((prev) => [duplicatedLead, ...prev]);
      toast({
        title: "Lead Duplicated",
        description: `${lead.firstName} ${lead.lastName} was duplicated successfully.`,
      });
    } catch (error: any) {
      console.error("Failed to duplicate lead:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to duplicate lead."),
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(null);
    }
  };

  const handleStatusChange = async (lead: Lead, status: Lead["status"]) => {
    // Intercept QUALIFIED status → show meeting scheduling dialog
    if (status === LeadStatus.QUALIFIED && lead.status !== LeadStatus.QUALIFIED) {
      setPendingQualifiedLead(lead);
      setMeetingDialogMode("qualification");
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

  const handleArchiveLead = useCallback((lead: Lead) => {
    void handleStatusChange(lead, LeadStatus.LOST);
  }, [handleStatusChange]);

  // Handle meeting scheduled after QUALIFIED prompt
  const handleMeetingSchedule = async (meetingData: Record<string, unknown>) => {
    if (!pendingQualifiedLead) return;
    try {
      if (meetingDialogMode === "followUp") {
        await createCalendarEvent(meetingData);
        const responseData = await updateLead(pendingQualifiedLead.id, {
          followUpDateTime: String(meetingData.startTime || ""),
          nextStep: pendingQualifiedLead.nextStep || "Follow-up scheduled",
        } as any);
        const updatedLead = mapApiLead(responseData);
        syncLeadRecord(updatedLead);
        toast({
          title: "Follow-up Scheduled",
          description: `Follow-up scheduled for ${pendingQualifiedLead.firstName} ${pendingQualifiedLead.lastName}.`,
        });
        closeMeetingDialog();
        return;
      }

      const responseData = await updateLeadStatus(pendingQualifiedLead.id, "QUALIFIED");
      syncLeadRecord(mapApiLead(responseData));

      await createCalendarEvent(meetingData);

      toast({
        title: "🎉 Lead Qualified & Meeting Scheduled!",
        description: `Meeting scheduled with ${pendingQualifiedLead.firstName} ${pendingQualifiedLead.lastName}.`,
      });
      closeMeetingDialog();
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
    if (meetingDialogMode === "followUp") {
      closeMeetingDialog();
      return;
    }

    try {
      const responseData = await updateLeadStatus(pendingQualifiedLead.id, "QUALIFIED");
      syncLeadRecord(mapApiLead(responseData));
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
    closeMeetingDialog();
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

  const handleScheduleFollowUp = useCallback((lead: Lead) => {
    setPendingQualifiedLead(lead);
    setMeetingDialogMode("followUp");
    setIsMeetingDialogOpen(true);
  }, []);

  const handleBulkEmail = useCallback(() => {
    const recipients = leads.filter((lead) => selectedLeads.has(lead.id) && lead.email);
    if (recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Select at least one lead with an email address.",
        variant: "destructive",
      });
      return;
    }

    setEmailComposerTarget({
      to: recipients.map((lead) => lead.email).join(", "),
      name: recipients.length === 1
        ? `${recipients[0].firstName} ${recipients[0].lastName}`.trim() || recipients[0].email
        : `${recipients.length} leads`,
    });
  }, [leads, selectedLeads, toast]);

  const handleBulkAssign = useCallback(async () => {
    if (!bulkAssignedToId) {
      toast({
        title: "Assignee Required",
        description: "Choose who these leads should be assigned to.",
        variant: "destructive",
      });
      return;
    }

    const leadIds = Array.from(selectedLeads);
    if (leadIds.length === 0) {
      return;
    }

    try {
      setBulkActionLoading("assign");
      await api.post("/leads/bulk/assign", { leadIds, assignedToId: bulkAssignedToId });
      const assigneeName = employees.find((employee) => employee.id === bulkAssignedToId)?.name || "Assigned";
      setLeads((prev) =>
        prev.map((lead) =>
          selectedLeads.has(lead.id)
            ? { ...lead, assignedToId: bulkAssignedToId, assignedTo: assigneeName, assignedToName: assigneeName }
            : lead
        )
      );
      setSelectedLeads(new Set());
      setBulkAssignedToId("");
      setIsBulkAssignOpen(false);
      toast({
        title: "Leads Assigned",
        description: `${leadIds.length} lead(s) assigned to ${assigneeName}.`,
      });
    } catch (error: any) {
      console.error("Failed to bulk assign leads:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to assign selected leads."),
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(null);
    }
  }, [bulkAssignedToId, employees, selectedLeads, toast]);

  const handleBulkStatusUpdate = useCallback(async (status: Lead["status"]) => {
    const leadIds = Array.from(selectedLeads);
    if (leadIds.length === 0) {
      return;
    }

    try {
      setBulkActionLoading("status");
      await api.post("/leads/bulk/status", { leadIds, status });
      setLeads((prev) =>
        prev.map((lead) =>
          selectedLeads.has(lead.id)
            ? { ...lead, status, updatedAt: new Date().toISOString() }
            : lead
        )
      );
      setSelectedLeads(new Set());
      toast({
        title: "Status Updated",
        description: `${leadIds.length} lead(s) updated successfully.`,
      });
    } catch (error: any) {
      console.error("Failed to bulk update lead status:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to update selected lead statuses."),
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(null);
    }
  }, [selectedLeads, toast]);

  const handleBulkTemperatureUpdate = useCallback(async (temperature: Lead["temperature"]) => {
    const leadIds = Array.from(selectedLeads);
    if (leadIds.length === 0) {
      return;
    }

    try {
      setBulkActionLoading("temperature");
      const results = await Promise.allSettled(
        leadIds.map((leadId) => updateLead(leadId, { temperature } as any))
      );
      const successfulLeadIds = leadIds.filter((_, index) => results[index]?.status === "fulfilled");

      if (successfulLeadIds.length > 0) {
        setLeads((prev) =>
          prev.map((lead) =>
            successfulLeadIds.includes(lead.id)
              ? { ...lead, temperature, updatedAt: new Date().toISOString() }
              : lead
          )
        );
        setSelectedLeads(new Set());
      }

      toast({
        title: successfulLeadIds.length === leadIds.length ? "Temperature Updated" : "Temperature Partially Updated",
        description:
          successfulLeadIds.length === leadIds.length
            ? `${successfulLeadIds.length} lead(s) updated successfully.`
            : `${successfulLeadIds.length} of ${leadIds.length} lead(s) were updated.`,
        variant: successfulLeadIds.length === leadIds.length ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error("Failed to bulk update lead temperature:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to update selected lead temperatures."),
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(null);
    }
  }, [selectedLeads, toast]);

  const handleBulkAddTags = useCallback(async () => {
    const leadIds = Array.from(selectedLeads);
    const inputTagNames = parseTagNames(bulkTagsInput);

    if (leadIds.length === 0) {
      return;
    }

    if (inputTagNames.length === 0) {
      toast({
        title: "Tags Required",
        description: "Enter at least one tag to add to the selected leads.",
        variant: "destructive",
      });
      return;
    }

    try {
      setBulkActionLoading("tags");
      await resolveTagIdsByNames(inputTagNames);
      const tagResponse = await api.get("/tags/all");
      const tagOptions = (tagResponse.data?.data || tagResponse.data || []).map((tag: any) => ({
        id: String(tag.id),
        name: String(tag.name || ""),
      }));
      const tagMap = new Map(tagOptions.map((tag) => [normalizeLookupKey(tag.name), tag.id]));
      const selectedLeadRecords = leads.filter((lead) => selectedLeads.has(lead.id));

      const results = await Promise.allSettled(
        selectedLeadRecords.map(async (lead) => {
          const mergedTagNames = [...new Set([...(lead.tags || []), ...inputTagNames])];
          const tagIds = mergedTagNames
            .map((name) => tagMap.get(normalizeLookupKey(name)))
            .filter((id): id is string => Boolean(id));
          await updateLead(lead.id, { tagIds } as any);
          return { leadId: lead.id, tags: mergedTagNames };
        })
      );

      const successfulUpdates = results
        .filter((result): result is PromiseFulfilledResult<{ leadId: string; tags: string[] }> => result.status === "fulfilled")
        .map((result) => result.value);

      if (successfulUpdates.length > 0) {
        const updateMap = new Map(successfulUpdates.map((result) => [result.leadId, result.tags]));
        setLeads((prev) =>
          prev.map((lead) =>
            updateMap.has(lead.id)
              ? { ...lead, tags: updateMap.get(lead.id) }
              : lead
          )
        );
      }

      setSelectedLeads(new Set());
      setBulkTagsInput("");
      setIsBulkTagsOpen(false);
      toast({
        title: successfulUpdates.length === selectedLeadRecords.length ? "Tags Added" : "Tags Partially Added",
        description:
          successfulUpdates.length === selectedLeadRecords.length
            ? `${successfulUpdates.length} lead(s) updated with the new tags.`
            : `${successfulUpdates.length} of ${selectedLeadRecords.length} lead(s) were updated.`,
        variant: successfulUpdates.length === selectedLeadRecords.length ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error("Failed to bulk add tags:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to add tags to selected leads."),
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(null);
    }
  }, [bulkTagsInput, ensureTagOptionsLoaded, leads, parseTagNames, resolveTagIdsByNames, selectedLeads, toast]);

  const handleBulkExport = useCallback(() => {
    const selectedLeadRecords = leads.filter((lead) => selectedLeads.has(lead.id));
    exportLeadRecords(selectedLeadRecords, "selected-leads");
  }, [exportLeadRecords, leads, selectedLeads]);

  const handleBulkDelete = useCallback(async () => {
    const leadIds = Array.from(selectedLeads);
    if (leadIds.length === 0) {
      return;
    }

    if (!window.confirm(`Delete ${leadIds.length} selected lead(s)? This cannot be undone.`)) {
      return;
    }

    try {
      setBulkActionLoading("delete");
      const results = await Promise.allSettled(leadIds.map((leadId) => deleteLead(leadId)));
      const successfulLeadIds = leadIds.filter((_, index) => results[index]?.status === "fulfilled");

      if (successfulLeadIds.length > 0) {
        setLeads((prev) => prev.filter((lead) => !successfulLeadIds.includes(lead.id)));
        setSelectedLeads(new Set());
      }

      toast({
        title: successfulLeadIds.length === leadIds.length ? "Leads Deleted" : "Leads Partially Deleted",
        description:
          successfulLeadIds.length === leadIds.length
            ? `${successfulLeadIds.length} lead(s) removed.`
            : `${successfulLeadIds.length} of ${leadIds.length} lead(s) were removed.`,
        variant: successfulLeadIds.length === leadIds.length ? "destructive" : "destructive",
      });
    } catch (error: any) {
      console.error("Failed to bulk delete leads:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to delete selected leads."),
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(null);
    }
  }, [selectedLeads, toast]);

  const handleImportLeads = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setBulkActionLoading("import");
      const content = await file.text();
      let importedRows: Record<string, string>[] = [];

      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(content);
        importedRows = Array.isArray(parsed) ? parsed as Record<string, string>[] : [];
      } else {
        const csvRows = parseCsvText(content);
        if (csvRows.length < 2) {
          throw new Error("The selected CSV file is empty.");
        }

        const [rawHeaders, ...dataRows] = csvRows;
        const headers = rawHeaders.map((header) => normalizeLookupKey(header));
        importedRows = dataRows.map((row) =>
          headers.reduce<Record<string, string>>((accumulator, header, index) => {
            accumulator[header] = row[index] || "";
            return accumulator;
          }, {})
        );
      }

      const employeeMap = new Map(
        employees.flatMap((employee) => [
          [normalizeLookupKey(employee.name), employee.id],
          [normalizeLookupKey(employee.id), employee.id],
        ])
      );
      const leadSourceMap = new Map(
        leadSources.flatMap((source) => [
          [normalizeLookupKey(source.name), source.id],
          [normalizeLookupKey(source.id), source.id],
        ])
      );

      const parsedLeads = importedRows.map((row, index) => {
        const firstName = row["first name"] || row["firstname"] || row["first_name"] || row["firstName"] || "";
        const lastName = row["last name"] || row["lastname"] || row["last_name"] || row["lastName"] || "";
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error(`Row ${index + 2}: first name and last name are required.`);
        }

        const rawTags = row["tags"] || "";
        const parsedTagNames = rawTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);

        return {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: (row["email"] || "").trim() || undefined,
          phone: (row["phone"] || "").trim() || undefined,
          companyName: (row["company name"] || row["company"] || row["companyName"] || "").trim(),
          jobTitle: (row["job title"] || row["jobtitle"] || row["jobTitle"] || "").trim() || undefined,
          location: (row["location"] || "").trim() || undefined,
          status: normalizeLeadStatusValue(row["status"]),
          temperature: normalizeLeadTemperatureValue(row["temperature"]),
          potentialValue: Number((row["potential value"] || row["value"] || row["potentialValue"] || "0").replace(/[^0-9.-]/g, "")) || 0,
          assignedToId: employeeMap.get(normalizeLookupKey(row["assigned to"] || row["assignedto"] || row["assignedToId"] || "")) || undefined,
          leadSourceId: leadSourceMap.get(normalizeLookupKey(row["lead source"] || row["source"] || row["leadSourceId"] || "")) || undefined,
          propertyAddress: (row["property address"] || row["propertyaddress"] || row["propertyAddress"] || "").trim() || undefined,
          city: (row["city"] || "").trim() || undefined,
          state: (row["state"] || "").trim() || undefined,
          zipCode: (row["zip code"] || row["zipcode"] || row["postal code"] || row["zipCode"] || "").trim() || undefined,
          serviceType: (row["service type"] || row["servicetype"] || row["serviceType"] || "").trim() || undefined,
          isInsuranceClaim: (row["insurance claim"] || row["isinsuranceclaim"] || row["isInsuranceClaim"] || "").trim() || undefined,
          notes: (row["notes"] || "").trim() || undefined,
          tagNames: parsedTagNames,
        };
      });

      const uniqueImportTagNames = [...new Set(parsedLeads.flatMap((lead) => lead.tagNames))];
      await resolveTagIdsByNames(uniqueImportTagNames);
      const tagResponse = await api.get("/tags/all");
      const tagOptions = (tagResponse.data?.data || tagResponse.data || []).map((tag: any) => ({
        id: String(tag.id),
        name: String(tag.name || ""),
      }));
      const tagMap = new Map(tagOptions.map((tag) => [normalizeLookupKey(tag.name), tag.id]));

      const payload = parsedLeads.map((lead) => ({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        companyName: lead.companyName,
        jobTitle: lead.jobTitle,
        location: lead.location,
        status: lead.status,
        temperature: lead.temperature,
        potentialValue: lead.potentialValue,
        assignedToId: lead.assignedToId,
        leadSourceId: lead.leadSourceId,
        propertyAddress: lead.propertyAddress,
        city: lead.city,
        state: lead.state,
        zipCode: lead.zipCode,
        serviceType: lead.serviceType,
        isInsuranceClaim: lead.isInsuranceClaim,
        notes: lead.notes,
        tagIds: lead.tagNames
          .map((tagName) => tagMap.get(normalizeLookupKey(tagName)))
          .filter((id): id is string => Boolean(id)),
      }));

      const response = await api.post("/leads/import", { leads: payload });
      const result = response.data?.data || response.data || {};
      await loadLeads();

      toast({
        title: "Import Completed",
        description: `${result.imported || payload.length} imported, ${result.failed || 0} failed, ${result.duplicates || 0} duplicates handled.`,
      });
    } catch (error: any) {
      console.error("Failed to import leads:", error);
      toast({
        title: "Import Failed",
        description: getLeadErrorMessage(error, "Failed to import leads from the selected file."),
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(null);
    }
  }, [employees, ensureTagOptionsLoaded, leadSources, loadLeads, resolveTagIdsByNames, toast]);

  // Stats calculations
  const newCount = leads.filter((l) => l.status === "NEW").length;
  const qualifiedCount = leads.filter((l) => l.status === "QUALIFIED").length;
  const hotCount = leads.filter((l) => l.temperature === "HOT").length;
  const wonCount = leads.filter((l) => l.status === "WON").length;
  const lostCount = leads.filter((l) => l.status === "LOST").length;
  const totalValue = leads.reduce((acc, l) => acc + l.potentialValue, 0);
  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedSource !== "all" ||
    selectedStatus !== "all" ||
    selectedTemperature !== "all";

  return (
    <div
      className="min-h-screen bg-[#F7F7FB]"
      {...(isMobile ? handlers : {})}
    >
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <main className="flex-1 pb-24 md:pb-0">
        {/* Header */}
        <header className="crm-module-header sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <Link to="/dashboard" className="hover:text-[#6637F4]">
                    Dashboard
                  </Link>
                  <ChevronRight size={14} />
                  <span className="text-[#0F172A] font-medium">Leads</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold text-[#0F172A]">All Leads</h1>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-md hidden sm:inline-flex"
                        onClick={() => importFileInputRef.current?.click()}
                        disabled={bulkActionLoading === "import"}
                      >
                        <Upload size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Import Leads</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-md hidden sm:inline-flex"
                        onClick={() => exportLeadRecords(filteredLeads, "leads")}
                        disabled={bulkActionLoading === "export"}
                      >
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
                  className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-md gap-2"
                  size="sm"
                >
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">Add Lead</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {isOffline && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You’re offline. Showing the latest cached leads until the connection comes back.
            </div>
          )}

          {/* Stats Cards */}
          <div
            className={cn(
              "mb-4 lg:mb-8",
              isMobile
                ? "flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]"
                : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6"
            )}
          >
            {[
              {
                title: "Total Leads",
                value: leads.length,
                change: 12.5,
                changeLabel: "vs last month",
                icon: Target,
                color: "#6637F4",
                sparklineData: [3, 5, 4, 7, 6, 8, leads.length || 10],
              },
              {
                title: "Hot Leads",
                value: hotCount,
                icon: Flame,
                color: "#EF4444",
                delay: 0.1,
                sparklineData: [1, 2, 1, 3, 2, 4, hotCount || 1],
              },
              {
                title: "Qualified",
                value: qualifiedCount,
                icon: UserCheck,
                color: "#F59E0B",
                delay: 0.2,
                sparklineData: [0, 1, 2, 1, 3, 2, qualifiedCount || 1],
              },
              {
                title: "Won Deals",
                value: wonCount,
                change: 8.3,
                changeLabel: "this month",
                icon: CheckCircle2,
                color: "#10B981",
                delay: 0.3,
                sparklineData: [0, 1, 0, 2, 1, 2, wonCount || 1],
              },
              {
                title: "Total Value",
                value: formatCurrency(totalValue),
                change: 15.2,
                icon: DollarSign,
                color: "#FBBF24",
                delay: 0.4,
                sparklineData: [1000, 2500, 1800, 3200, 2800, 4100, totalValue || 1000],
              },
            ].map((card) => (
              <div key={card.title} className={cn(isMobile && "min-w-[220px] flex-shrink-0")}>
                <StatCard {...card} />
              </div>
            ))}
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
          >
            {/* Tabs & Filters */}
            <div className="p-3 sm:p-4 border-b border-[rgba(15,23,42,0.06)]">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="overflow-x-auto -mx-1 px-1 flex-1 min-w-0">
                    <TabsList className="bg-white/5 rounded-md p-1 inline-flex w-max">
                      <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        All ({leads.length})
                      </TabsTrigger>
                      <TabsTrigger value="new" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        New ({newCount})
                      </TabsTrigger>
                      <TabsTrigger value="qualified" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        <span className="hidden sm:inline">Qualified</span><span className="sm:hidden">Qual</span> ({qualifiedCount})
                      </TabsTrigger>
                      <TabsTrigger value="hot" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        <Flame size={14} className="mr-1 text-red-500" />
                        Hot ({hotCount})
                      </TabsTrigger>
                      <TabsTrigger value="won" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        Won ({wonCount})
                      </TabsTrigger>
                      <TabsTrigger value="lost" className="rounded-md data-[state=active]:bg-white text-xs sm:text-sm px-2 sm:px-3">
                        Lost ({lostCount})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className={cn("flex items-center gap-1 sm:gap-2 flex-shrink-0", isMobile && "hidden")}>
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="icon"
                      className="rounded-md h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => setViewMode("list")}
                    >
                      <List size={16} />
                    </Button>
                    <Button
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      size="icon"
                      className="rounded-md h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid size={16} />
                    </Button>
                  </div>
                </div>

                {/* Search & Filters */}
                {isMobile ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search leads..."
                          className="h-10 rounded-md border-[rgba(15,23,42,0.06)] pl-9"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-md border-[rgba(15,23,42,0.06)]"
                        onClick={() => setIsFilterDrawerOpen(true)}
                      >
                        <Filter size={16} />
                      </Button>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      Swipe right to qualify, swipe left to archive, long press to multi-select.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="relative flex-1 sm:max-w-md">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search leads..."
                        className="pl-9 h-10 rounded-md border-[rgba(15,23,42,0.06)] w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto">
                      <Select value={selectedSource} onValueChange={setSelectedSource}>
                        <SelectTrigger className="w-[120px] sm:w-[150px] h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)] text-xs sm:text-sm flex-shrink-0">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md">
                          <SelectItem value="all" className="rounded-md">All Sources</SelectItem>
                          {Object.entries(sourceIconMap).map(([key, { icon: Icon, color }]) => (
                            <SelectItem key={key} value={key} className="rounded-md">
                              <div className="flex items-center gap-2">
                                <Icon size={14} style={{ color }} />
                                {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-[110px] sm:w-[140px] h-9 sm:h-10 rounded-md border-[rgba(15,23,42,0.06)] text-xs sm:text-sm flex-shrink-0">
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
                        <SelectTrigger className="hidden sm:flex w-[130px] h-10 rounded-md border-[rgba(15,23,42,0.06)]">
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
                          <Button variant="outline" className="rounded-md gap-1 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0">
                            <Filter size={14} />
                            <span className="hidden sm:inline">Sort</span>
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
                            {sortBy === "date" && <Check size={14} className="ml-auto text-[#6637F4]" />}
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
                            {sortBy === "score" && <Check size={14} className="ml-auto text-[#6637F4]" />}
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
                            {sortBy === "value" && <Check size={14} className="ml-auto text-[#6637F4]" />}
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
                            {sortBy === "name" && <Check size={14} className="ml-auto text-[#6637F4]" />}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}

                {/* Active Filter Chips */}
                {(selectedSource !== "all" || selectedStatus !== "all" || selectedTemperature !== "all" || searchQuery) && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="text-xs text-[#94A3B8] font-medium">Active filters:</span>
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] text-[#475569] rounded-md text-xs">
                        <Search size={10} />
                        "{searchQuery}"
                        <button onClick={() => setSearchQuery("")} className="ml-0.5 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </span>
                    )}
                    {selectedSource !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] text-[#475569] rounded-md text-xs">
                        Source: {getSourceInfo(selectedSource).name}
                        <button onClick={() => setSelectedSource("all")} className="ml-0.5 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </span>
                    )}
                    {selectedStatus !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] text-[#475569] rounded-md text-xs">
                        Status: {leadStatuses.find(s => s.id === selectedStatus)?.name}
                        <button onClick={() => setSelectedStatus("all")} className="ml-0.5 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </span>
                    )}
                    {selectedTemperature !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] text-[#475569] rounded-md text-xs">
                        Temp: {selectedTemperature.charAt(0).toUpperCase() + selectedTemperature.slice(1)}
                        <button onClick={() => setSelectedTemperature("all")} className="ml-0.5 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#94A3B8] hover:text-red-500 h-7 px-2"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedSource("all");
                        setSelectedStatus("all");
                        setSelectedTemperature("all");
                      }}
                    >
                      <X size={12} className="mr-1" />
                      Clear all
                    </Button>
                  </div>
                )}

                {/* Bulk Actions */}
                {selectedLeads.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 sm:mt-4 p-2 sm:p-3 bg-[#6637F4]/10 rounded-md"
                  >
                    <span className="text-sm font-medium text-[#0F172A]">
                      {selectedLeads.size} selected
                    </span>
                    <div className="flex-1" />
                    <Button size="sm" variant="outline" className="rounded-md" onClick={handleBulkEmail}>
                      <Mail size={14} className="mr-1" />
                      Email
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-md" onClick={() => setIsBulkTagsOpen(true)}>
                      <Tag size={14} className="mr-1" />
                      Add Tags
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-md" onClick={() => setIsBulkAssignOpen(true)}>
                      <UserCheck size={14} className="mr-1" />
                      Assign
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="rounded-md" disabled={bulkActionLoading === "status"}>
                          <RefreshCw size={14} className="mr-1" />
                          Status
                          <ChevronDown size={12} className="ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-md">
                        {leadStatuses.map((status) => (
                          <DropdownMenuItem
                            key={status.id}
                            className="rounded-md"
                            onClick={() => void handleBulkStatusUpdate(status.id as Lead["status"])}
                          >
                            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: status.color }} />
                            {status.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="rounded-md" disabled={bulkActionLoading === "temperature"}>
                          <Thermometer size={14} className="mr-1" />
                          Temp
                          <ChevronDown size={12} className="ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-md">
                        <DropdownMenuItem className="rounded-md" onClick={() => void handleBulkTemperatureUpdate(LeadTemperature.HOT)}>
                          <Flame size={14} className="mr-2 text-red-500" /> Hot
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-md" onClick={() => void handleBulkTemperatureUpdate(LeadTemperature.WARM)}>
                          <ThermometerSun size={14} className="mr-2 text-yellow-500" /> Warm
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-md" onClick={() => void handleBulkTemperatureUpdate(LeadTemperature.COLD)}>
                          <Snowflake size={14} className="mr-2 text-blue-500" /> Cold
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="outline" className="rounded-md" onClick={handleBulkExport}>
                      <Download size={14} className="mr-1" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => void handleBulkDelete()}
                    >
                      <Trash2 size={14} className="mr-1" />
                      Delete
                    </Button>
                  </motion.div>
                )}
              </Tabs>
            </div>

            {/* Content */}
            {loading ? (
              <div className="p-3 sm:p-6">
                <ListCardSkeleton rows={isMobile ? 4 : 3} />
              </div>
            ) : loadError ? (
              <div className="p-6">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                  <AlertCircle size={28} className="mx-auto mb-3 text-red-500" />
                  <p className="font-semibold text-red-900">Couldn’t load leads</p>
                  <p className="mt-1 text-sm text-red-700">{loadError}</p>
                  <Button className="mt-4 rounded-md" onClick={() => void loadLeads()}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : isMobile ? (
              <div className="p-3 space-y-3">
                {filteredLeads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] px-4 py-12 text-center">
                    <Target size={40} className="mx-auto mb-3 text-[#94A3B8]" />
                    <p className="font-semibold text-[#0F172A]">
                      {hasActiveFilters ? "No matching leads" : "No leads yet"}
                    </p>
                    <p className="mt-1 text-sm text-[#475569]">
                      {hasActiveFilters
                        ? "Try clearing a filter or changing your search."
                        : "Add your first lead to start building the pipeline."}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          className="rounded-md"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedSource("all");
                            setSelectedStatus("all");
                            setSelectedTemperature("all");
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                      {!hasActiveFilters && (
                        <Button
                          className="rounded-md bg-[#6637F4] hover:bg-[#6637F4]/90"
                          onClick={() => {
                            setCurrentLead(null);
                            setIsFormOpen(true);
                          }}
                        >
                          <Plus size={16} className="mr-2" />
                          Add Lead
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  filteredLeads.map((lead) => (
                    <MobileLeadCard
                      key={lead.id}
                      lead={lead}
                      isSelected={selectedLeads.has(lead.id)}
                      onSelect={() => toggleSelectLead(lead.id)}
                      onOpen={() => {
                        setSidePanelLead(lead);
                        setIsSidePanelOpen(true);
                      }}
                      onQualify={() => handleStatusChange(lead, LeadStatus.QUALIFIED)}
                      onArchive={() => handleArchiveLead(lead)}
                    />
                  ))
                )}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {viewMode === "list" ? (
                <div className="responsive-table">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedLeads.size === filteredLeads.length && filteredLeads.length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                            className="data-[state=checked]:bg-[#6637F4] data-[state=checked]:border-[#6637F4]"
                          />
                        </TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Phone</TableHead>
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
                          <TableCell colSpan={10} className="text-center py-12">
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
                              setSidePanelLead(lead);
                              setIsSidePanelOpen(true);
                            }}
                            onEdit={() => {
                              setCurrentLead(lead);
                              setIsFormOpen(true);
                            }}
                            onDelete={() => {
                              setLeadToDelete(lead);
                              setIsDeleteAlertOpen(true);
                            }}
                            onEmail={() => openLeadEmailComposer(lead)}
                            onCall={() => handleCallLead(lead)}
                            onDuplicate={() => void handleDuplicateLead(lead)}
                            onScheduleFollowUp={() => handleScheduleFollowUp(lead)}
                            onStatusChange={(status) => handleStatusChange(lead, status)}
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                ) : (
                  <div className="p-3 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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
                            setSidePanelLead(lead);
                            setIsSidePanelOpen(true);
                          }}
                          onEdit={() => {
                            setCurrentLead(lead);
                            setIsFormOpen(true);
                          }}
                          onDelete={() => {
                            setLeadToDelete(lead);
                            setIsDeleteAlertOpen(true);
                          }}
                          onEmail={() => openLeadEmailComposer(lead)}
                          onCall={() => handleCallLead(lead)}
                          onStatusChange={(status) => handleStatusChange(lead, status)}
                          delay={index * 0.05}
                        />
                      ))
                    )}
                  </div>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      </main>

      {isMobile && (
        <>
          {selectedLeads.size > 0 && (
            <div className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/95 p-3 shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0F172A]">
                  {selectedLeads.size} selected
                </span>
                <button
                  onClick={() => setSelectedLeads(new Set())}
                  className="text-xs font-medium text-[#94A3B8]"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={handleBulkEmail}>
                  <Mail size={14} className="mr-1" />
                  Email
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setIsBulkAssignOpen(true)}>
                  <UserCheck size={14} className="mr-1" />
                  Assign
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-red-600 border-red-200"
                  onClick={() => void handleBulkDelete()}
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {selectedLeads.size === 0 && (
            <Button
              onClick={() => {
                setCurrentLead(null);
                setIsFormOpen(true);
              }}
              size="icon"
              className="fixed bottom-6 right-5 z-40 h-14 w-14 rounded-full bg-[#6637F4] shadow-[0_16px_36px_rgba(102,55,244,0.35)] hover:bg-[#6637F4]/90"
            >
              <Plus size={22} />
            </Button>
          )}
        </>
      )}

      {/* Dialogs */}
      <input
        ref={importFileInputRef}
        type="file"
        accept=".csv,application/json,.json"
        className="hidden"
        onChange={(event) => void handleImportLeads(event)}
      />

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

      {/* ── Duplicate Warning Dialog ── */}
      <AlertDialog open={isDuplicateWarningOpen} onOpenChange={setIsDuplicateWarningOpen}>
        <AlertDialogContent className="rounded-md max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle size={20} />
              Potential Duplicate Detected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-[#475569]">
                  We found {duplicateMatches.length} existing lead{duplicateMatches.length > 1 ? 's' : ''} that may be a duplicate. Review before creating.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {duplicateMatches.map((match: any) => (
                    <div key={match.leadId} className="flex items-center justify-between p-3 bg-[#FFFBEB] border border-amber-200 rounded-md">
                      <div className="flex-1">
                        <p className="font-medium text-[#0F172A] text-sm">{match.leadName}</p>
                        {match.leadNumber && <p className="text-xs text-[#94A3B8]">{match.leadNumber}</p>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {match.matchedFields?.map((f: string) => (
                            <span key={f} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                              {f}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-[#64748B] mt-1">Confidence: {match.confidenceScore}%</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2 rounded-md text-xs"
                        onClick={() => handleMergeWithDuplicate(match.leadId)}
                      >
                        Merge
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md" onClick={() => {
              setIsDuplicateWarningOpen(false);
              setPendingLeadData(null);
              setDuplicateMatches([]);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateAnyway}
              className="bg-amber-500 hover:bg-amber-600 rounded-md"
            >
              Create Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScheduleMeetingDialog
        isOpen={isMeetingDialogOpen}
        onClose={closeMeetingDialog}
        lead={pendingQualifiedLead}
        onSchedule={handleMeetingSchedule}
        onSkip={handleSkipMeeting}
        mode={meetingDialogMode}
      />

      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent className="rounded-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Selected Leads</DialogTitle>
            <DialogDescription>
              Choose the team member who should own these {selectedLeads.size} lead(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="bulkAssignedToId">Assign to</Label>
            <Select value={bulkAssignedToId} onValueChange={setBulkAssignedToId}>
              <SelectTrigger id="bulkAssignedToId" className="rounded-md">
                <SelectValue placeholder="Select employee" />
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
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-md" onClick={() => setIsBulkAssignOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-md" onClick={() => void handleBulkAssign()} disabled={bulkActionLoading === "assign"}>
              {bulkActionLoading === "assign" ? "Assigning..." : "Assign Leads"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkTagsOpen} onOpenChange={setIsBulkTagsOpen}>
        <DialogContent className="rounded-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Tags</DialogTitle>
            <DialogDescription>
              Add one or more comma-separated tags to the {selectedLeads.size} selected lead(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="bulkTagsInput">Tags</Label>
            <Input
              id="bulkTagsInput"
              value={bulkTagsInput}
              onChange={(event) => setBulkTagsInput(event.target.value)}
              placeholder="Insurance Claim, High Value, Repeat Customer"
              className="rounded-md"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-md" onClick={() => setIsBulkTagsOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-md" onClick={() => void handleBulkAddTags()} disabled={bulkActionLoading === "tags"}>
              {bulkActionLoading === "tags" ? "Saving..." : "Add Tags"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={isMobile && isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader>
            <DrawerTitle>Filter Leads</DrawerTitle>
            <DrawerDescription>Refine the mobile lead list and sort order.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#475569]">Lead Source</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all" className="rounded-md">All Sources</SelectItem>
                  {Object.entries(sourceIconMap).map(([key, { icon: Icon, color }]) => (
                    <SelectItem key={key} value={key} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color }} />
                        {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#475569]">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all" className="rounded-md">All Statuses</SelectItem>
                  {leadStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id} className="rounded-md">
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#475569]">Temperature</Label>
              <Select value={selectedTemperature} onValueChange={setSelectedTemperature}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="All Temperatures" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all" className="rounded-md">All</SelectItem>
                  <SelectItem value="hot" className="rounded-md">Hot</SelectItem>
                  <SelectItem value="warm" className="rounded-md">Warm</SelectItem>
                  <SelectItem value="cold" className="rounded-md">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#475569]">Sort By</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="date" className="rounded-md">Date Added</SelectItem>
                  <SelectItem value="score" className="rounded-md">Lead Score</SelectItem>
                  <SelectItem value="value" className="rounded-md">Value</SelectItem>
                  <SelectItem value="name" className="rounded-md">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#475569]">Sort Order</Label>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="desc" className="rounded-md">Descending</SelectItem>
                  <SelectItem value="asc" className="rounded-md">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter className="border-t bg-white">
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => {
                setSearchQuery("");
                setSelectedSource("all");
                setSelectedStatus("all");
                setSelectedTemperature("all");
                setSortBy("date");
                setSortOrder("desc");
              }}
            >
              Clear Filters
            </Button>
            <Button className="rounded-md bg-[#6637F4] hover:bg-[#6637F4]/90" onClick={() => setIsFilterDrawerOpen(false)}>
              Apply Filters
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Lead Side Panel */}
      <Sheet open={isSidePanelOpen} onOpenChange={setIsSidePanelOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {sidePanelLead && (() => {
            const lead = sidePanelLead;
            const statusInfo = getStatusInfo(lead.status);
            const tempInfo = getTemperatureInfo(lead.temperature);
            const TempIcon = tempInfo.icon;
            return (
              <>
                <SheetHeader className="pb-4 border-b border-[rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] font-medium">
                        {getInitials(lead.firstName, lead.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-lg">{lead.firstName} {lead.lastName}</SheetTitle>
                      <p className="text-sm text-[#94A3B8]">{lead.companyName || lead.email}</p>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-5 pt-5">
                  {/* Status & Temperature */}
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
                    >
                      {statusInfo.icon && <statusInfo.icon size={12} />}
                      {statusInfo.name}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                    )} style={{ color: tempInfo.color, backgroundColor: tempInfo.bg }}>
                      <TempIcon size={12} />
                      {tempInfo.label}
                    </span>
                    <span className="ml-auto text-sm font-semibold" style={{ color: getScoreColor(lead.leadScore) }}>
                      Score: {lead.leadScore}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Contact</h4>
                    <div className="space-y-2">
                      {lead.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-[#94A3B8]" />
                          <a href={`mailto:${lead.email}`} className="text-[#475569] hover:text-[#6637F4]">{lead.email}</a>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={14} className="text-[#94A3B8]" />
                          <a href={`tel:${lead.phone}`} className="text-[#475569] hover:text-[#6637F4]">{lead.phone}</a>
                        </div>
                      )}
                      {lead.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={14} className="text-[#94A3B8]" />
                          <span className="text-[#475569]">{lead.location}</span>
                        </div>
                      )}
                      {lead.companyName && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 size={14} className="text-[#94A3B8]" />
                          <span className="text-[#475569]">{lead.companyName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Value */}
                  {lead.potentialValue > 0 && (
                    <div className="p-3 bg-[#F7F7FB] rounded-md">
                      <p className="text-xs text-[#94A3B8] mb-1">Potential Value</p>
                      <p className="text-lg font-bold text-[#0F172A]">{formatCurrency(lead.potentialValue)}</p>
                    </div>
                  )}

                  {/* Assigned To */}
                  <div className="p-3 bg-[#F7F7FB] rounded-md">
                    <p className="text-xs text-[#94A3B8] mb-1">Assigned To</p>
                    {lead.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-[#F1F5F9]">
                            {lead.assignedTo.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-[#0F172A]">{lead.assignedTo}</span>
                      </div>
                    ) : (
                      <span className="font-medium text-[#94A3B8] italic">Unassigned</span>
                    )}
                  </div>

                  {/* Property Info (if available) */}
                  {(lead.propertyAddress || lead.serviceType) && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Property & Service</h4>
                      {lead.propertyAddress && (
                        <p className="text-sm text-[#475569]">
                          <MapPin size={14} className="inline mr-1 text-[#94A3B8]" />
                          {lead.propertyAddress}{lead.city ? `, ${lead.city}` : ""}{lead.state ? ` ${lead.state}` : ""} {lead.zipCode || ""}
                        </p>
                      )}
                      {lead.serviceType && (
                        <p className="text-sm text-[#475569]">
                          <Briefcase size={14} className="inline mr-1 text-[#94A3B8]" />
                          {lead.serviceType}
                        </p>
                      )}
                      {lead.isInsuranceClaim && (
                        <p className="text-sm text-[#475569]">
                          Insurance Claim: <span className="font-medium">{lead.isInsuranceClaim}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {lead.notes && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Notes</h4>
                      <p className="text-sm text-[#475569] whitespace-pre-line">{lead.notes}</p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                    <Button
                      className="flex-1 rounded-md"
                      variant="outline"
                      onClick={() => {
                        setIsSidePanelOpen(false);
                        navigate(`/leads/${lead.id}`);
                      }}
                    >
                      <ExternalLink size={14} className="mr-1" />
                      Full Details
                    </Button>
                    <Button
                      className="flex-1 rounded-md bg-[#6637F4] hover:bg-[#6637F4]/90 text-white"
                      onClick={() => {
                        setIsSidePanelOpen(false);
                        setCurrentLead(lead);
                        setIsFormOpen(true);
                      }}
                    >
                      <Pencil size={14} className="mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <ComposeEmailSheet
        isOpen={Boolean(emailComposerTarget)}
        onClose={() => setEmailComposerTarget(null)}
        defaultRecipientEmail={emailComposerTarget?.to || null}
        defaultRecipientName={emailComposerTarget?.name || null}
        leadId={emailComposerTarget?.leadId}
      />
    </div>
  );
};

export default AllLeads;
