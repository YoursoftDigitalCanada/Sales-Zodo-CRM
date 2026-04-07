// src/pages/Leads/Pipeline.tsx

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { getLeads, getLeadById, createLead, updateLead, deleteLead, updateLeadStatus, convertLead } from "@/features/leads";
import { createCalendarEvent } from "@/features/calendar";
import { autocompleteAddress } from "@/features/roof-estimator/services/roof-estimator-service";
import { saveLeadDetailNavigationState } from "@/features/leads/lead-detail-navigation";
import { LeadFormDialog } from "@/pages/Leads/AllLeads";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { useCanPerformAction } from "@/hooks/usePermissionAccess";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import api from "@/lib/axios";
import { ComposeEmailSheet } from "@/features/emails/components/ComposeEmailSheet";
import { ListCardSkeleton, SwipeActionCard } from "@/features/clients/components/responsive-helpers";
import {
  normalizeCanadianPostalCode,
  normalizeEmailAddress,
  normalizeWhitespace,
} from "@contracts/contact";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  ChevronRight,
  Users,
  Target,
  Flame,
  ThermometerSun,
  Snowflake,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Loader2,
  ArrowRightLeft,
  X,
  Building2,
  Briefcase,
  Globe,
  User,
  Video,
  CalendarDays,
  RefreshCw,
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
  company: string;
  jobTitle: string;
  location: string;
  source: string;
  status: string;
  score: number;
  temperature: "hot" | "warm" | "cold";
  value: number;
  currency: string;
  assignedTo: string;
  avatar?: string;
  createdAt: string;
  daysInStage: number;
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  leads: Lead[];
}

type LeadFormLead = React.ComponentProps<typeof LeadFormDialog>["lead"];

// ============================================
// PIPELINE STAGE DEFINITIONS
// ============================================

const pipelineStageConfig: Omit<PipelineStage, "leads">[] = [
  { id: "new", name: "New Leads", color: "#3B82F6", bgColor: "#EFF6FF", icon: Sparkles },
  { id: "contacted", name: "Contacted", color: "#8B5CF6", bgColor: "#F5F3FF", icon: Mail },
  { id: "qualified", name: "Qualified", color: "#F59E0B", bgColor: "#FFFBEB", icon: Target },
  { id: "proposal", name: "Proposal Sent", color: "#6637F4", bgColor: "#F0EEFF", icon: Clock },
  { id: "negotiation", name: "Negotiation", color: "#EC4899", bgColor: "#FDF2F8", icon: TrendingUp },
  { id: "won", name: "Won", color: "#10B981", bgColor: "#ECFDF5", icon: CheckCircle2 },
  { id: "lost", name: "Lost", color: "#EF4444", bgColor: "#FEF2F2", icon: XCircle },
];

const statusToStageId: Record<string, string> = {
  NEW: "new", CONTACTED: "contacted", QUALIFIED: "qualified",
  PROPOSAL: "proposal", NEGOTIATION: "negotiation", WON: "won", LOST: "lost",
};

const stageIdToStatus: Record<string, string> = {
  new: "NEW", contacted: "CONTACTED", qualified: "QUALIFIED",
  proposal: "PROPOSAL", negotiation: "NEGOTIATION", won: "WON", lost: "LOST",
};

/** Map API lead to pipeline Lead */
function mapApiLeadToPipeline(apiLead: any): Lead {
  const assignee = apiLead.assignedTo?.user;
  const assignedToName = assignee
    ? `${assignee.firstName || ""} ${assignee.lastName || ""} `.trim()
    : "Unassigned";
  const createdDate = new Date(apiLead.createdAt);
  const daysInStage = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 86400000));

  return {
    id: apiLead.id,
    firstName: apiLead.firstName || "",
    lastName: apiLead.lastName || "",
    email: apiLead.email || "",
    phone: apiLead.phone || "",
    company: apiLead.companyName || "",
    jobTitle: apiLead.jobTitle || "",
    location: "",
    source: apiLead.leadSource?.name || "",
    status: (apiLead.status || "NEW").toLowerCase(),
    score: apiLead.score ?? 50,
    temperature: (apiLead.temperature || "warm").toLowerCase() as "hot" | "warm" | "cold",
    value: apiLead.potentialValue || 0,
    currency: "CAD",
    assignedTo: assignedToName,
    createdAt: apiLead.createdAt,
    daysInStage,
  };
}

function buildEmptyPipeline(): PipelineStage[] {
  return pipelineStageConfig.map((cfg) => ({ ...cfg, leads: [] }));
}

function mapApiLeadToDialogLead(apiLead: any): NonNullable<LeadFormLead> {
  return {
    id: apiLead.id,
    firstName: apiLead.firstName || "",
    lastName: apiLead.lastName || "",
    email: apiLead.email || "",
    phone: apiLead.phone || "",
    companyName: (() => {
      const companyName = apiLead.companyName || "";
      if (companyName && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyName)) {
        return "";
      }
      return companyName;
    })(),
    jobTitle: apiLead.jobTitle || "",
    website: apiLead.website || "",
    location: apiLead.location || "",
    leadSourceName: (apiLead.leadSource?.name || "other").toLowerCase().replace(/\s+/g, "_"),
    status: apiLead.status || "NEW",
    displayScore: apiLead.leadScore != null ? Math.min(apiLead.leadScore * 10, 100) : 50,
    temperature: apiLead.temperature || "WARM",
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
    tags: apiLead.tags?.map((tag: any) => tag.name) || [],
    notes: apiLead.notes || "",
    lastContact: apiLead.lastContact || "",
    nextFollowUp: apiLead.nextFollowUp || "",
    createdAt: apiLead.createdAt,
    updatedAt: apiLead.updatedAt || "",
    avatar: apiLead.avatar || "",
    propertyAddress: apiLead.propertyAddress || "",
    city: apiLead.city || "",
    state: apiLead.state || "",
    zipCode: apiLead.zipCode || "",
    propertyType: apiLead.propertyType || "",
    serviceType: apiLead.serviceType || "",
    isInsuranceClaim: apiLead.isInsuranceClaim || "",
    urgencyLevel: apiLead.urgencyLevel || "",
    preferredContactMethod: apiLead.preferredContactMethod || "",
    bestTimeToContact: apiLead.bestTimeToContact || "",
    issueDescription: apiLead.issueDescription || "",
    confirmedName: apiLead.confirmedName || false,
    confirmedPhone: apiLead.confirmedPhone || false,
    confirmedEmail: apiLead.confirmedEmail || false,
    confirmedAddress: apiLead.confirmedAddress || false,
    secondaryPhone: apiLead.secondaryPhone || "",
    spouseCoOwnerName: apiLead.spouseCoOwnerName || "",
    isHomeowner: apiLead.isHomeowner || "",
    isDecisionMaker: apiLead.isDecisionMaker || "",
    ownershipType: apiLead.ownershipType || "",
    roofAge: apiLead.roofAge || "",
    currentRoofMaterial: apiLead.currentRoofMaterial || "",
    numberOfStories: apiLead.numberOfStories || "",
    knownDamageType: apiLead.knownDamageType || [],
    damageOccurrenceDate: apiLead.damageOccurrenceDate || "",
    previousRoofWork: apiLead.previousRoofWork || "",
    previousRoofWorkDetails: apiLead.previousRoofWorkDetails || "",
    insuranceCompanyName: apiLead.insuranceCompanyName || "",
    hasClaimBeenFiled: apiLead.hasClaimBeenFiled || "",
    claimNumber: apiLead.claimNumber || "",
    adjusterAssigned: apiLead.adjusterAssigned || "",
    adjusterName: apiLead.adjusterName || "",
    adjusterPhone: apiLead.adjusterPhone || "",
    adjusterEmail: apiLead.adjusterEmail || "",
    adjusterMeetingDate: apiLead.adjusterMeetingDate || "",
    budgetRange: apiLead.budgetRange || "",
    workTimeline: apiLead.workTimeline || "",
    financingNeeded: apiLead.financingNeeded || "",
    gettingOtherQuotes: apiLead.gettingOtherQuotes || "",
    numberOfOtherQuotes: apiLead.numberOfOtherQuotes || undefined,
    topPriority: apiLead.topPriority || "",
    isHOA: apiLead.isHOA || "",
    hoaRestrictions: apiLead.hoaRestrictions || "",
    leadScore: apiLead.leadScore || undefined,
    disqualifiedReason: apiLead.disqualifiedReason || "",
    nextStep: apiLead.nextStep || "",
    followUpDateTime: apiLead.followUpDateTime || "",
    inspectionAppointmentDate: apiLead.inspectionAppointmentDate || "",
    qualificationCallNotes: apiLead.qualificationCallNotes || "",
    closureReason: apiLead.closureReason || "",
    duplicateOfLeadId: apiLead.duplicateOfLeadId || "",
    closedAt: apiLead.closedAt || "",
    reactivateAt: apiLead.reactivateAt || "",
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount: number, currency: string = "CAD"): string =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const getTemperatureInfo = (temp: string) => {
  switch (temp) {
    case "hot": return { icon: Flame, color: "#EF4444", bg: "#FEF2F2", label: "Hot" };
    case "warm": return { icon: ThermometerSun, color: "#F59E0B", bg: "#FFFBEB", label: "Warm" };
    case "cold": return { icon: Snowflake, color: "#3B82F6", bg: "#EFF6FF", label: "Cold" };
    default: return { icon: Target, color: "#64748B", bg: "#F1F5F9", label: "Unknown" };
  }
};

const getInitials = (firstName: string, lastName: string): string =>
  `${(firstName || "?")[0]}${(lastName || "?")[0]} `.toUpperCase();

const getScoreColor = (score: number): string => {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
};

const normalizeLookupKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const pickTagColor = (tagName: string): string => {
  const palette = ["#14B8A6", "#6637F4", "#F59E0B", "#EF4444", "#0EA5E9", "#8B5CF6"];
  const hash = [...tagName].reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

const parseTagNames = (input: string[] | string | undefined): string[] => {
  if (Array.isArray(input)) {
    return [...new Set(input.map((tag) => tag.trim()).filter(Boolean))];
  }

  if (typeof input !== "string") {
    return [];
  }

  return [...new Set(input.split(",").map((tag) => tag.trim()).filter(Boolean))];
};

// ============================================
// LEAD CARD COMPONENT (Draggable)
// ============================================

const PipelineLeadCard = ({
  lead, stageColor, onOpenRecord, onPreview, onEdit, onDelete, isMobile = false, enableNativeDrag = true,
}: {
  lead: Lead; stageColor: string;
  onOpenRecord: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isMobile?: boolean;
  enableNativeDrag?: boolean;
}) => {
  const tempInfo = getTemperatureInfo(lead.temperature);
  const TempIcon = tempInfo.icon;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/lead-id", lead.id);
    e.dataTransfer.effectAllowed = "move";
    // Add a slight delay to allow the drag image to form
    (e.target as HTMLElement).style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
  };

  const content = (
    <div
      draggable={enableNativeDrag}
      onDragStart={enableNativeDrag ? handleDragStart : undefined}
      onDragEnd={enableNativeDrag ? handleDragEnd : undefined}
      className={cn(
        "bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 hover:shadow-lg hover:border-slate-300 transition-all group",
        enableNativeDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      )}
      onClick={onOpenRecord}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white shadow">
            <AvatarImage src={lead.avatar} />
            <AvatarFallback className="bg-[#F1F5F9]/70 text-[#0F172A] font-medium text-sm">
              {getInitials(lead.firstName, lead.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold text-[#0F172A] text-sm group-hover:text-[#6637F4] transition-colors">
              {lead.firstName} {lead.lastName}
            </h4>
            <p className="text-xs text-[#94A3B8]">{lead.company}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: tempInfo.bg, color: tempInfo.color }}
          >
            <TempIcon size={10} />
          </span>
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-md">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(); }} className="rounded-md text-sm">
                  <Eye size={14} className="mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-md text-sm">
                  <Pencil size={14} className="mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-md text-sm text-red-600">
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="mb-3">
        <span className="text-lg font-bold text-[#0F172A]">
          {formatCurrency(lead.value, lead.currency)}
        </span>
      </div>

      {/* Score Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#475569]">Score</span>
          <span className="text-xs font-semibold" style={{ color: getScoreColor(lead.score) }}>
            {lead.score}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${lead.score}% `, backgroundColor: getScoreColor(lead.score) }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-[#475569]">
          <User size={12} />
          <span className="truncate max-w-[100px]">{lead.assignedTo}</span>
        </div>
        <div className="flex items-center gap-1 text-[#475569]">
          <Clock size={12} />
          <span>{lead.daysInStage}d</span>
        </div>
      </div>
    </div>
  );

  if (isMobile && !enableNativeDrag) {
    return <SwipeActionCard onView={onPreview} onDelete={onDelete}>{content}</SwipeActionCard>;
  }

  return content;
};

// ============================================
// PIPELINE COLUMN COMPONENT (Drop Target)
// ============================================

const PipelineColumn = ({
  stage, onLeadOpenRecord, onLeadPreview, onLeadEdit, onLeadDelete, onAddLead, onDropLead, canCreate = true, isMobile = false, enableNativeDrag = true,
}: {
  stage: PipelineStage;
  onLeadOpenRecord: (lead: Lead) => void;
  onLeadPreview: (lead: Lead) => void;
  onLeadEdit: (lead: Lead) => void;
  onLeadDelete: (lead: Lead) => void;
  onAddLead: (stageId: string) => void;
  onDropLead: (leadId: string, targetStageId: string) => void;
  canCreate?: boolean;
  isMobile?: boolean;
  enableNativeDrag?: boolean;
}) => {
  const StageIcon = stage.icon;
  const totalValue = stage.leads.reduce((acc, lead) => acc + lead.value, 0);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set false if we're leaving the column entirely, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData("application/lead-id");
    if (leadId) {
      onDropLead(leadId, stage.id);
    }
  };

  return (
    <div className="flex-shrink-0 w-[320px]">
      {/* Column Header */}
      <div
        className="rounded-t-xl p-4 border border-b-0"
        style={{ backgroundColor: stage.bgColor, borderColor: `${stage.color} 30` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${stage.color} 20` }}>
              <StageIcon size={16} style={{ color: stage.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-[#0F172A] text-sm">{stage.name}</h3>
              <p className="text-xs text-[#94A3B8]">{stage.leads.length} leads</p>
            </div>
          </div>
          <span className="px-2 py-1 rounded-md text-xs font-bold" style={{ backgroundColor: `${stage.color} 20`, color: stage.color }}>
            {stage.leads.length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#0F172A]">{formatCurrency(totalValue)}</span>
          {canCreate ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md hover:bg-white/50" onClick={() => onAddLead(stage.id)}>
                    <Plus size={14} style={{ color: stage.color }} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Lead to {stage.name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      {/* Column Body (Drop Zone) */}
      <div
        className={cn(
          "min-h-[500px] max-h-[calc(100vh-350px)] overflow-y-auto p-3 space-y-3 rounded-b-xl border border-t-0 transition-all duration-200",
          isDragOver
            ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200 ring-inset"
            : "bg-[#F7F7FB]/50"
        )}
        style={{ borderColor: isDragOver ? undefined : `${stage.color} 20` }}
        onDragOver={enableNativeDrag ? handleDragOver : undefined}
        onDragLeave={enableNativeDrag ? handleDragLeave : undefined}
        onDrop={enableNativeDrag ? handleDrop : undefined}
      >
        {isDragOver && (
          <div className="flex items-center justify-center py-3 px-4 bg-blue-100/60 rounded-md border-2 border-dashed border-blue-300 text-[#6637F4] text-sm font-medium">
            Drop here to move to {stage.name}
          </div>
        )}

        <AnimatePresence>
          {stage.leads.map((lead) => (
            <PipelineLeadCard
              key={lead.id}
              lead={lead}
              stageColor={stage.color}
              onOpenRecord={() => onLeadOpenRecord(lead)}
              onPreview={() => onLeadPreview(lead)}
              onEdit={() => onLeadEdit(lead)}
              onDelete={() => onLeadDelete(lead)}
              isMobile={isMobile}
              enableNativeDrag={enableNativeDrag}
            />
          ))}
        </AnimatePresence>

        {stage.leads.length === 0 && !isDragOver && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${stage.color} 10` }}>
              <StageIcon size={20} style={{ color: stage.color }} />
            </div>
            <p className="text-sm text-[#94A3B8] mb-2">No leads in this stage</p>
            {canCreate ? (
              <Button size="sm" variant="outline" className="rounded-md text-xs" onClick={() => onAddLead(stage.id)}>
                <Plus size={12} className="mr-1" />
                Add Lead
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// LEAD DETAIL PANEL
// ============================================

const LeadDetailPanel = ({
  lead,
  onClose,
  onEmail,
  onCall,
  stageColor,
}: {
  lead: Lead;
  onClose: () => void;
  onEmail: () => void;
  onCall: () => void;
  stageColor: string;
}) => {
  const tempInfo = getTemperatureInfo(lead.temperature);
  const TempIcon = tempInfo.icon;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 right-0 h-full w-full sm:w-[420px] glass-2xl border-l border-[rgba(15,23,42,0.06)] z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-[rgba(15,23,42,0.06)]" style={{ background: `linear - gradient(135deg, ${stageColor}10, transparent)` }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0F172A]">Lead Details</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 shadow-md" style={{ borderColor: stageColor }}>
            <AvatarImage src={lead.avatar} />
            <AvatarFallback className="bg-[#F1F5F9]/70 text-[#0F172A] font-bold text-xl">
              {getInitials(lead.firstName, lead.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-bold text-[#0F172A]">{lead.firstName} {lead.lastName}</h3>
            <p className="text-sm text-[#94A3B8]">{lead.jobTitle}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize px-2 py-0.5 rounded-full" style={{ borderColor: stageColor, color: stageColor }}>
                {lead.status}
              </Badge>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: tempInfo.bg, color: tempInfo.color }}>
                <TempIcon size={10} /> {tempInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Value & Score */}
        <div className="grid grid-cols-2 gap-4">
          <div className="r from-green-50 to-emerald-50 rounded-md p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-green-600" />
              <span className="text-xs text-green-600 font-medium">Deal Value</span>
            </div>
            <p className="text-xl font-bold text-green-700">{formatCurrency(lead.value, lead.currency)}</p>
          </div>
          <div className="r from-blue-50 to-indigo-50 rounded-md p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-[#6637F4]" />
              <span className="text-xs text-[#6637F4] font-medium">Lead Score</span>
            </div>
            <p className="text-xl font-bold" style={{ color: getScoreColor(lead.score) }}>{lead.score}%</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-[#0F172A] mb-3">Contact Information</h4>
          <div className="space-y-3">
            {lead.email && (
              <div className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md">
                <Mail size={16} className="text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#475569]">Email</p>
                  <a href={`mailto:${lead.email} `} className="text-sm text-[#6637F4] hover:underline">{lead.email}</a>
                </div>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md">
                <Phone size={16} className="text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#475569]">Phone</p>
                  <a href={`tel:${lead.phone} `} className="text-sm text-[#0F172A]">{lead.phone}</a>
                </div>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md">
                <Building2 size={16} className="text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#475569]">Company</p>
                  <p className="text-sm text-[#0F172A]">{lead.company}</p>
                </div>
              </div>
            )}
            {lead.jobTitle && (
              <div className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md">
                <Briefcase size={16} className="text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#475569]">Job Title</p>
                  <p className="text-sm text-[#0F172A]">{lead.jobTitle}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Details */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-[#0F172A] mb-3">Details</h4>
          <div className="space-y-3">
            {lead.source && (
              <div className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md">
                <Globe size={16} className="text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#475569]">Lead Source</p>
                  <p className="text-sm text-[#0F172A] capitalize">{lead.source}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md">
              <User size={16} className="text-[#475569] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#475569]">Assigned To</p>
                <p className="text-sm text-[#0F172A]">{lead.assignedTo}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md">
              <Calendar size={16} className="text-[#475569] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#475569]">Created</p>
                <p className="text-sm text-[#0F172A]">{formatDate(lead.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F7F7FB] rounded-md">
              <Clock size={16} className="text-[#475569] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#475569]">Days in Stage</p>
                <p className="text-sm text-[#0F172A]">{lead.daysInStage} days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[rgba(15,23,42,0.06)] flex gap-3">
        <Button className="flex-1 bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-md gap-2" onClick={onEmail}>
          <Mail size={16} /> Send Email
        </Button>
        <Button variant="outline" className="flex-1 rounded-md gap-2" onClick={onCall}>
          <Phone size={16} /> Call
        </Button>
      </div>
    </motion.div>
  );
};

// ============================================
// MAIN PIPELINE PAGE COMPONENT
// ============================================

const Pipeline = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useIsMobile();
  const canCreateLeads = useCanPerformAction("leads", "create");
  const [pipeline, setPipeline] = useState<PipelineStage[]>(buildEmptyPipeline());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTemperature, setFilterTemperature] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);
  const [pendingAddStageId, setPendingAddStageId] = useState<string | null>(null);
  const [leadDialogMode, setLeadDialogMode] = useState<"create" | "edit">("create");
  const [editingLead, setEditingLead] = useState<LeadFormLead>(null);
  const [emailComposerTarget, setEmailComposerTarget] = useState<{ to: string; name: string; leadId?: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Conversion dialog state ──
  const [convertingLead, setConvertingLead] = useState<{ lead: Lead; sourceStageId: string } | null>(null);
  const [convertClientType, setConvertClientType] = useState<"INDIVIDUAL" | "COMPANY">("INDIVIDUAL");
  const [convertCreateContact, setConvertCreateContact] = useState(true);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  // ── Meeting dialog state (Qualified prompt) ──
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [qualifyingLead, setQualifyingLead] = useState<{ lead: Lead; sourceStageId: string } | null>(null);
  const [meetingType, setMeetingType] = useState<"online" | "offline">("online");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingDuration, setMeetingDuration] = useState("30");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [locSuggestions, setLocSuggestions] = useState<Array<{ description: string; placeId: string }>>([]);
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const locAutocompleteRef = useRef<HTMLDivElement>(null);
  const locDebounceTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Debounced location autocomplete handler
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

  const loadPipeline = useCallback(async (options?: { showSpinner?: boolean }) => {
    const showSpinner = options?.showSpinner ?? true;

    try {
      if (showSpinner) {
        setLoading(true);
      }

      const apiLeads = await getLeads();
      const stages = buildEmptyPipeline();
      const leads: Lead[] = Array.isArray(apiLeads) ? apiLeads.map(mapApiLeadToPipeline) : [];

      leads.forEach((lead) => {
        const stageId = statusToStageId[(lead.status || "new").toUpperCase()] || "new";
        const stage = stages.find((item) => item.id === stageId);
        if (stage) {
          stage.leads.push(lead);
        }
      });

      setPipeline(stages);
      setSelectedLead((prev) => {
        if (!prev) {
          return prev;
        }

        const refreshedLead = stages.flatMap((stage) => stage.leads).find((lead) => lead.id === prev.id);
        return refreshedLead || null;
      });
    } catch (error) {
      console.error("Failed to fetch pipeline leads:", error);
      toast({ title: "Error", description: "Failed to load pipeline data.", variant: "destructive" });
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    void loadPipeline();
  }, [loadPipeline]);

  const displayedPipeline = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return pipeline.map((stage) => ({
      ...stage,
      leads: stage.leads.filter((lead) => {
        const matchesSearch = !normalizedQuery || [
          lead.firstName,
          lead.lastName,
          lead.email,
          lead.phone,
          lead.company,
          lead.jobTitle,
          lead.assignedTo,
          lead.source,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

        const matchesTemperature = filterTemperature === "all" || lead.temperature === filterTemperature;
        const matchesSource = filterSource === "all" || lead.source === filterSource;

        return matchesSearch && matchesTemperature && matchesSource;
      }),
    }));
  }, [filterSource, filterTemperature, pipeline, searchQuery]);

  const totalLeads = displayedPipeline.reduce((acc, stage) => acc + stage.leads.length, 0);
  const totalValue = displayedPipeline.reduce((acc, stage) => acc + stage.leads.reduce((sum, lead) => sum + lead.value, 0), 0);
  const wonValue = displayedPipeline.find((stage) => stage.id === "won")?.leads.reduce((acc, lead) => acc + lead.value, 0) || 0;
  const sourceOptions = useMemo(
    () => [...new Set(pipeline.flatMap((stage) => stage.leads.map((lead) => lead.source).filter(Boolean)))].sort((a, b) => a.localeCompare(b)),
    [pipeline]
  );
  const activeFilterCount = Number(filterTemperature !== "all") + Number(filterSource !== "all");
  const hasDisplayedLeads = displayedPipeline.some((stage) => stage.leads.length > 0);
  // Match the responsive Kanban board behavior by always using the board's
  // native drag-and-drop path instead of switching mobile cards into swipe mode.
  const enableNativePipelineDrag = true;

  // Find the stage color for the selected lead
  const selectedLeadStageColor = selectedLead
    ? pipeline.find((s) => s.leads.some((l) => l.id === selectedLead.id))?.color || "#6637F4"
    : "#6637F4";

  const leadDetailNavigationState = useMemo(
    () => ({
      from: `${location.pathname}${location.search}${location.hash}`,
      fromLabel: "Pipeline",
    }),
    [location.hash, location.pathname, location.search],
  );

  const handleLeadOpenRecord = (lead: Lead) => {
    saveLeadDetailNavigationState(lead.id, leadDetailNavigationState);
    navigate(`/leads/${lead.id}`, { state: leadDetailNavigationState });
  };

  const handleLeadPreview = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const resolveTagIdsByNames = useCallback(async (tagInput: string[] | string | undefined) => {
    const tagNames = parseTagNames(tagInput);
    if (tagNames.length === 0) {
      return [];
    }

    const tagResponse = await api.get("/tags/all");
    const tagData = tagResponse.data?.data || tagResponse.data || [];
    const tagMap = new Map(
      (Array.isArray(tagData) ? tagData : []).map((tag: any) => [normalizeLookupKey(String(tag.name || "")), tag])
    );

    const missingNames = tagNames.filter((name) => !tagMap.has(normalizeLookupKey(name)));
    if (missingNames.length > 0) {
      const createdTags = await Promise.all(
        missingNames.map(async (name) => {
          const response = await api.post("/tags", { name, color: pickTagColor(name) });
          return response.data?.data || response.data;
        })
      );

      createdTags.forEach((tag: any) => {
        tagMap.set(normalizeLookupKey(String(tag.name || "")), tag);
      });
    }

    return tagNames
      .map((name) => tagMap.get(normalizeLookupKey(name))?.id)
      .filter((id): id is string => Boolean(id));
  }, []);

  const buildLeadMutationPayload = useCallback(async (data: Record<string, any>, options?: { requestedStageId?: string | null }) => {
    const requestedStatus = options?.requestedStageId ? stageIdToStatus[options.requestedStageId] : undefined;
    const selectedStatus = data.status ? String(data.status).toUpperCase() : undefined;
    const resolvedStatus = requestedStatus && (!selectedStatus || selectedStatus === "NEW")
      ? requestedStatus
      : (selectedStatus || "NEW");

    const apiData: Record<string, any> = {
      firstName: normalizeWhitespace(data.firstName),
      lastName: normalizeWhitespace(data.lastName),
      email: data.email ? normalizeEmailAddress(data.email) : undefined,
      phone: data.phone?.trim() || undefined,
      companyName: data.companyName?.trim() || "",
      jobTitle: data.jobTitle?.trim() || undefined,
      website: data.website && data.website.trim() ? data.website.trim() : undefined,
      location: data.location?.trim() || undefined,
      status: resolvedStatus,
      temperature: String(data.temperature || "WARM").toUpperCase(),
      potentialValue: data.potentialValue || 0,
      notes: data.notes?.trim() || undefined,
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

    const tagIds = await resolveTagIdsByNames(data.tags);
    if (tagIds.length > 0 || "tags" in data) {
      apiData.tagIds = tagIds;
    }

    return apiData;
  }, [resolveTagIdsByNames]);

  const handleLeadEdit = async (lead: Lead) => {
    try {
      const apiLead = await getLeadById(lead.id);
      setLeadDialogMode("edit");
      setEditingLead(mapApiLeadToDialogLead(apiLead));
      setPendingAddStageId(null);
      setIsAddLeadDialogOpen(true);
    } catch (error) {
      console.error("Failed to load lead for editing:", error);
      toast({
        title: "Error",
        description: "Failed to load that lead for editing.",
        variant: "destructive",
      });
    }
  };

  const handleLeadDelete = async (lead: Lead) => {
    try {
      await deleteLead(lead.id);
      setPipeline((prev) => prev.map((stage) => ({ ...stage, leads: stage.leads.filter((l) => l.id !== lead.id) })));
      if (selectedLead?.id === lead.id) setSelectedLead(null);
      toast({ title: "Lead Deleted", description: `${lead.firstName} ${lead.lastName} has been removed.`, variant: "destructive" });
    } catch (error) {
      console.error("Failed to delete lead:", error);
      toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" });
    }
  };

  const buildNewFieldsPayload = (data: Record<string, any>) => {
    const opt = (value: any) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      }

      return value && value !== "" ? value : undefined;
    };

    return {
      propertyAddress: opt(data.propertyAddress),
      city: opt(data.city),
      state: opt(data.state),
      zipCode: data.zipCode ? normalizeCanadianPostalCode(data.zipCode) : undefined,
      propertyType: opt(data.propertyType),
      serviceType: opt(data.serviceType),
      isInsuranceClaim: opt(data.isInsuranceClaim),
      urgencyLevel: opt(data.urgencyLevel),
      preferredContactMethod: opt(data.preferredContactMethod),
      bestTimeToContact: opt(data.bestTimeToContact),
      issueDescription: opt(data.issueDescription),
      confirmedName: data.confirmedName || false,
      confirmedPhone: data.confirmedPhone || false,
      confirmedEmail: data.confirmedEmail || false,
      confirmedAddress: data.confirmedAddress || false,
      secondaryPhone: opt(data.secondaryPhone),
      spouseCoOwnerName: data.spouseCoOwnerName ? normalizeWhitespace(data.spouseCoOwnerName) : undefined,
      isHomeowner: opt(data.isHomeowner),
      isDecisionMaker: opt(data.isDecisionMaker),
      ownershipType: opt(data.ownershipType),
      roofAge: opt(data.roofAge),
      currentRoofMaterial: opt(data.currentRoofMaterial),
      numberOfStories: opt(data.numberOfStories),
      knownDamageType: Array.isArray(data.knownDamageType) && data.knownDamageType.length > 0 ? data.knownDamageType : undefined,
      damageOccurrenceDate: opt(data.damageOccurrenceDate),
      previousRoofWork: opt(data.previousRoofWork),
      previousRoofWorkDetails: opt(data.previousRoofWorkDetails),
      insuranceCompanyName: opt(data.insuranceCompanyName),
      hasClaimBeenFiled: opt(data.hasClaimBeenFiled),
      claimNumber: opt(data.claimNumber),
      adjusterAssigned: opt(data.adjusterAssigned),
      adjusterName: data.adjusterName ? normalizeWhitespace(data.adjusterName) : undefined,
      adjusterPhone: opt(data.adjusterPhone),
      adjusterEmail: data.adjusterEmail ? normalizeEmailAddress(data.adjusterEmail) : undefined,
      adjusterMeetingDate: opt(data.adjusterMeetingDate),
      budgetRange: opt(data.budgetRange),
      workTimeline: opt(data.workTimeline),
      financingNeeded: opt(data.financingNeeded),
      gettingOtherQuotes: opt(data.gettingOtherQuotes),
      numberOfOtherQuotes: data.numberOfOtherQuotes || undefined,
      topPriority: opt(data.topPriority),
      isHOA: opt(data.isHOA),
      hoaRestrictions: opt(data.hoaRestrictions),
      leadScore: data.leadScore || undefined,
      disqualifiedReason: opt(data.disqualifiedReason),
      nextStep: opt(data.nextStep),
      followUpDateTime: opt(data.followUpDateTime),
      inspectionAppointmentDate: opt(data.inspectionAppointmentDate),
      qualificationCallNotes: opt(data.qualificationCallNotes),
    };
  };

  const openAddLeadDialog = (stageId?: string | null) => {
    if (!canCreateLeads) {
      toast({
        title: "Access denied",
        description: "You no longer have permission to create leads.",
        variant: "destructive",
      });
      return;
    }

    setLeadDialogMode("create");
    setEditingLead(null);
    setPendingAddStageId(stageId ?? null);
    setIsAddLeadDialogOpen(true);
  };

  const closeAddLeadDialog = () => {
    setIsAddLeadDialogOpen(false);
    setPendingAddStageId(null);
    setEditingLead(null);
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

  const handleCreateLeadFromDialog = async (data: any) => {
    if (!canCreateLeads) {
      toast({
        title: "Access denied",
        description: "You no longer have permission to create leads.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const apiData = await buildLeadMutationPayload(data, { requestedStageId: pendingAddStageId });
      const responseData = await createLead(apiData);
      const newLead = mapApiLeadToPipeline(responseData);
      await loadPipeline({ showSpinner: false });
      const targetStageId = statusToStageId[(newLead.status || "new").toUpperCase()] || "new";
      const stageName = pipelineStageConfig.find((stage) => stage.id === targetStageId)?.name || "the pipeline";
      toast({
        title: "Lead Added",
        description: `${newLead.firstName} ${newLead.lastName} was added to ${stageName}.`,
      });
      return true;
    } catch (error: any) {
      console.error("Failed to add lead from pipeline:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to add lead."),
        variant: "destructive",
      });
      return false;
    }
  };

  const handleUpdateLeadFromDialog = async (data: any) => {
    if (!editingLead?.id) {
      return false;
    }

    try {
      const apiData = await buildLeadMutationPayload(data);
      const responseData = await updateLead(editingLead.id, apiData as any);
      const updatedLead = mapApiLeadToPipeline(responseData);
      await loadPipeline({ showSpinner: false });
      toast({
        title: "Lead Updated",
        description: `${updatedLead.firstName} ${updatedLead.lastName} was updated successfully.`,
      });
      return true;
    } catch (error: any) {
      console.error("Failed to update lead from pipeline:", error);
      toast({
        title: "Error",
        description: getLeadErrorMessage(error, "Failed to update lead."),
        variant: "destructive",
      });
      return false;
    }
  };

  const handleLeadDialogSubmit = async (data: any) =>
    leadDialogMode === "edit" ? handleUpdateLeadFromDialog(data) : handleCreateLeadFromDialog(data);

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

  const handleAddLead = (stageId: string) => {
    openAddLeadDialog(stageId);
  };

  // Drag & Drop: move lead to a new stage and update backend status
  const handleDropLead = async (leadId: string, targetStageId: string) => {
    // Find the lead and its current stage
    let movedLead: Lead | null = null;
    let sourceStageId: string | null = null;

    for (const stage of pipeline) {
      const found = stage.leads.find((l) => l.id === leadId);
      if (found) {
        movedLead = found;
        sourceStageId = stage.id;
        break;
      }
    }

    if (!movedLead || sourceStageId === targetStageId) return;

    const newStatus = stageIdToStatus[targetStageId];
    if (!newStatus) return;

    // ── Special handling: dropping into "Won" triggers conversion dialog ──
    if (targetStageId === "won") {
      setConvertClientType(movedLead.company ? "COMPANY" : "INDIVIDUAL");
      setConvertCreateContact(true);
      setConvertError(null);
      setConvertingLead({ lead: movedLead, sourceStageId: sourceStageId! });
      return;
    }

    // ── Special handling: dropping into "Qualified" triggers meeting dialog ──
    if (targetStageId === "qualified" && sourceStageId !== "qualified") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      setMeetingType("online");
      setMeetingTitle(`Meeting with ${movedLead.firstName} ${movedLead.lastName}`);
      setMeetingDate(tomorrow.toISOString().split("T")[0]);
      setMeetingTime("10:00");
      setMeetingDuration("30");
      setMeetingLocation("");
      setMeetingLink("");
      setMeetingNotes("");
      setQualifyingLead({ lead: movedLead, sourceStageId: sourceStageId! });
      setMeetingDialogOpen(true);
      return;
    }

    // Optimistically update the UI
    setPipeline((prev) =>
      prev.map((stage) => {
        if (stage.id === sourceStageId) {
          return { ...stage, leads: stage.leads.filter((l) => l.id !== leadId) };
        }
        if (stage.id === targetStageId) {
          return { ...stage, leads: [...stage.leads, { ...movedLead!, status: targetStageId, daysInStage: 0 }] };
        }
        return stage;
      })
    );

    // Call backend to update status
    try {
      await updateLeadStatus(leadId, newStatus);
      const targetStageName = pipelineStageConfig.find((s) => s.id === targetStageId)?.name || targetStageId;
      toast({
        title: "Lead Moved",
        description: `${movedLead.firstName} ${movedLead.lastName} moved to ${targetStageName}`,
      });
    } catch (error) {
      console.error("Failed to update lead status:", error);
      // Revert on failure
      setPipeline((prev) =>
        prev.map((stage) => {
          if (stage.id === targetStageId) {
            return { ...stage, leads: stage.leads.filter((l) => l.id !== leadId) };
          }
          if (stage.id === sourceStageId) {
            return { ...stage, leads: [...stage.leads, movedLead!] };
          }
          return stage;
        })
      );
      toast({ title: "Error", description: "Failed to update lead status. Change has been reverted.", variant: "destructive" });
    }
  };

  // ── Conversion handlers ──
  const handleConvertConfirm = async () => {
    if (!convertingLead) return;
    const { lead, sourceStageId } = convertingLead;

    setConvertLoading(true);
    setConvertError(null);
    try {
      await convertLead(lead.id, { clientType: convertClientType, createContact: convertCreateContact });

      // Move lead to Won in UI
      setPipeline((prev) =>
        prev.map((stage) => {
          if (stage.id === sourceStageId) {
            return { ...stage, leads: stage.leads.filter((l) => l.id !== lead.id) };
          }
          if (stage.id === "won") {
            return { ...stage, leads: [...stage.leads, { ...lead, status: "won", daysInStage: 0 }] };
          }
          return stage;
        })
      );

      toast({
        title: "🎉 Lead Converted!",
        description: `${lead.firstName} ${lead.lastName} is now a client.`,
      });
      setConvertingLead(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Conversion failed. Please try again.";
      setConvertError(msg);
      toast({ title: "Conversion Failed", description: msg, variant: "destructive" });
    } finally {
      setConvertLoading(false);
    }
  };

  const handleConvertCancel = () => {
    setConvertingLead(null);
    setConvertError(null);
  };

  // ── Meeting (Qualified) handlers ──
  const handleMeetingSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualifyingLead || !meetingDate || !meetingTime) return;
    const { lead, sourceStageId } = qualifyingLead;

    setMeetingSubmitting(true);
    try {
      // 1) Update lead status to QUALIFIED
      await updateLeadStatus(lead.id, "QUALIFIED");

      // 2) Move lead in pipeline UI
      setPipeline((prev) =>
        prev.map((stage) => {
          if (stage.id === sourceStageId) {
            return { ...stage, leads: stage.leads.filter((l) => l.id !== lead.id) };
          }
          if (stage.id === "qualified") {
            return { ...stage, leads: [...stage.leads, { ...lead, status: "qualified", daysInStage: 0 }] };
          }
          return stage;
        })
      );

      // 3) Create calendar event
      const startTime = new Date(`${meetingDate}T${meetingTime}:00`);
      const endTime = new Date(startTime.getTime() + parseInt(meetingDuration) * 60000);
      await createCalendarEvent({
        title: meetingTitle || `Meeting with ${lead.firstName} ${lead.lastName}`,
        description: `Qualification meeting with ${lead.firstName} ${lead.lastName}${lead.company ? ` from ${lead.company}` : ""}. ${meetingNotes ? `\n\nNotes: ${meetingNotes}` : ""}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        eventType: "MEETING",
        category: "client",
        location: meetingType === "offline" ? meetingLocation : undefined,
        meetingLink: meetingType === "online" ? (meetingLink || "https://meet.google.com/new") : undefined,
        leadId: lead.id,
        priority: "HIGH",
      });

      toast({
        title: "\ud83c\udf89 Lead Qualified & Meeting Scheduled!",
        description: `${lead.firstName} ${lead.lastName} moved to Qualified with meeting.`,
      });
      setMeetingDialogOpen(false);
      setQualifyingLead(null);
    } catch (error: any) {
      console.error("Failed to qualify lead with meeting:", error);
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to schedule meeting.", variant: "destructive" });
    } finally {
      setMeetingSubmitting(false);
    }
  };

  const handleMeetingSkip = async () => {
    if (!qualifyingLead) return;
    const { lead, sourceStageId } = qualifyingLead;

    try {
      await updateLeadStatus(lead.id, "QUALIFIED");
      setPipeline((prev) =>
        prev.map((stage) => {
          if (stage.id === sourceStageId) {
            return { ...stage, leads: stage.leads.filter((l) => l.id !== lead.id) };
          }
          if (stage.id === "qualified") {
            return { ...stage, leads: [...stage.leads, { ...lead, status: "qualified", daysInStage: 0 }] };
          }
          return stage;
        })
      );
      toast({
        title: "Lead Qualified",
        description: `${lead.firstName} ${lead.lastName} moved to Qualified (no meeting scheduled).`,
      });
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to update status.", variant: "destructive" });
    }
    setMeetingDialogOpen(false);
    setQualifyingLead(null);
  };

  const handleMeetingCancel = () => {
    setMeetingDialogOpen(false);
    setQualifyingLead(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F7FB] overflow-x-hidden">

      <main className="flex-1">
        {/* Header */}
        <header className="crm-module-header sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <Link to="/dashboard" className="hover:text-[#6637F4]">Dashboard</Link>
                  <ChevronRight size={14} />
                  <Link to="/leads" className="hover:text-[#6637F4]">Leads</Link>
                  <ChevronRight size={14} />
                  <span className="text-[#0F172A] font-medium">Pipeline</span>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Sales Pipeline</h1>
                  <span className="px-2 py-1 bg-[#6637F4]/10 text-[#6637F4] text-xs font-bold rounded-md">LIVE</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={cn("hidden md:flex items-center gap-4 mr-4", isMobile && "hidden")}>
                  <div className="text-center">
                    <p className="text-xs text-[#94A3B8]">Total Leads</p>
                    <p className="text-lg font-bold text-[#0F172A]">{totalLeads}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <p className="text-xs text-[#94A3B8]">Pipeline Value</p>
                    <p className="text-lg font-bold text-[#6637F4]">{formatCurrency(totalValue)}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <p className="text-xs text-[#94A3B8]">Won</p>
                    <p className="text-lg font-bold text-green-500">{formatCurrency(wonValue)}</p>
                  </div>
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search leads..."
                    className="pl-9 h-10 w-full sm:w-64 rounded-md border-[rgba(15,23,42,0.06)]"
                  />
                </div>

                {isMobile ? (
                  <Button variant="outline" className="rounded-md gap-2" onClick={() => setFiltersOpen(true)}>
                    <Filter size={16} />
                    {activeFilterCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-[#6637F4]/10 text-[#6637F4] text-xs font-semibold">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="rounded-md gap-2">
                        <Filter size={16} />
                        Filter
                        {activeFilterCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-[#6637F4]/10 text-[#6637F4] text-xs font-semibold">
                            {activeFilterCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 rounded-md p-4 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-[#0F172A]">Filter Pipeline</h3>
                        <p className="text-xs text-[#64748B]">Narrow the board by temperature or source.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-[#475569]">Temperature</Label>
                        <Select value={filterTemperature} onValueChange={setFilterTemperature}>
                          <SelectTrigger className="rounded-md">
                            <SelectValue placeholder="All temperatures" />
                          </SelectTrigger>
                          <SelectContent className="rounded-md">
                            <SelectItem value="all" className="rounded-md">All Temperatures</SelectItem>
                            <SelectItem value="hot" className="rounded-md">Hot</SelectItem>
                            <SelectItem value="warm" className="rounded-md">Warm</SelectItem>
                            <SelectItem value="cold" className="rounded-md">Cold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-[#475569]">Lead Source</Label>
                        <Select value={filterSource} onValueChange={setFilterSource}>
                          <SelectTrigger className="rounded-md">
                            <SelectValue placeholder="All sources" />
                          </SelectTrigger>
                          <SelectContent className="rounded-md">
                            <SelectItem value="all" className="rounded-md">All Sources</SelectItem>
                            {sourceOptions.map((source) => (
                              <SelectItem key={source} value={source} className="rounded-md">
                                {source}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-center rounded-md"
                        onClick={() => {
                          setFilterTemperature("all");
                          setFilterSource("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </PopoverContent>
                  </Popover>
                )}

                <Button
                  className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-md gap-2"
                  onClick={() => openAddLeadDialog(null)}
                  size={isMobile ? "icon" : "default"}
                  disabled={!canCreateLeads}
                >
                  <Plus size={18} />
                  {!isMobile && "Add Lead"}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Pipeline Board */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Pipeline Flow Indicator */}
          <div className={cn("mb-6 flex items-center justify-center", isMobile && "justify-start overflow-x-auto")}>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
              {displayedPipeline.map((stage, index) => (
                <React.Fragment key={stage.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-medium text-[#475569]">{stage.name}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>
                      {stage.leads.length}
                    </span>
                  </div>
                  {index < pipeline.length - 1 && (
                    <ArrowRight size={14} className="text-[#475569] mx-1" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Pipeline Columns */}
          {loading ? (
            <div className="space-y-4">
              <ListCardSkeleton rows={3} />
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
              {displayedPipeline.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  onLeadOpenRecord={handleLeadOpenRecord}
                  onLeadPreview={handleLeadPreview}
                  onLeadEdit={handleLeadEdit}
                  onLeadDelete={handleLeadDelete}
                  onAddLead={handleAddLead}
                  onDropLead={handleDropLead}
                  canCreate={canCreateLeads}
                  isMobile={isMobile}
                  enableNativeDrag={enableNativePipelineDrag}
                />
              ))}
            </div>
          )}

          {!hasDisplayedLeads && !loading && (
            <div className="mt-4 rounded-xl border border-dashed border-[#D8D5F8] bg-white p-6 text-center">
              <p className="text-sm font-medium text-[#0F172A]">No leads match your current search or filters.</p>
              <p className="mt-1 text-xs text-[#64748B]">Try clearing the filters or searching with a different name, company, phone, or email.</p>
            </div>
          )}
        </div>
      </main>

      {isMobile && (
        <Button
          size="icon"
          className="fixed bottom-6 right-5 z-40 h-14 w-14 rounded-full bg-[#6637F4] shadow-[0_16px_36px_rgba(102,55,244,0.35)] hover:bg-[#6637F4]/90"
          onClick={() => openAddLeadDialog(null)}
          disabled={!canCreateLeads}
        >
          <Plus size={22} />
        </Button>
      )}

      {/* Lead Detail Slide-over Panel */}
      <AnimatePresence>
        {selectedLead && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setSelectedLead(null)}
            />
            <LeadDetailPanel
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onEmail={() => openLeadEmailComposer(selectedLead)}
              onCall={() => handleCallLead(selectedLead)}
              stageColor={selectedLeadStageColor}
            />
          </>
        )}
      </AnimatePresence>

      <LeadFormDialog
        isOpen={isAddLeadDialogOpen}
        onClose={closeAddLeadDialog}
        lead={editingLead}
        onSubmit={handleLeadDialogSubmit}
      />

      <ComposeEmailSheet
        isOpen={Boolean(emailComposerTarget)}
        onClose={() => setEmailComposerTarget(null)}
        defaultRecipientEmail={emailComposerTarget?.to || null}
        defaultRecipientName={emailComposerTarget?.name || null}
        leadId={emailComposerTarget?.leadId}
      />

      <Drawer open={isMobile && filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader>
            <DrawerTitle>Filter Pipeline</DrawerTitle>
            <DrawerDescription>Narrow the board by temperature or source.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#475569]">Temperature</Label>
              <Select value={filterTemperature} onValueChange={setFilterTemperature}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="All temperatures" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all" className="rounded-md">All Temperatures</SelectItem>
                  <SelectItem value="hot" className="rounded-md">Hot</SelectItem>
                  <SelectItem value="warm" className="rounded-md">Warm</SelectItem>
                  <SelectItem value="cold" className="rounded-md">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#475569]">Lead Source</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="all" className="rounded-md">All Sources</SelectItem>
                  {sourceOptions.map((source) => (
                    <SelectItem key={source} value={source} className="rounded-md">
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter className="border-t bg-white">
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => {
                setFilterTemperature("all");
                setFilterSource("all");
              }}
            >
              Clear Filters
            </Button>
            <Button className="rounded-md bg-[#6637F4] hover:bg-[#6637F4]/90" onClick={() => setFiltersOpen(false)}>
              Apply Filters
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Convert Lead to Client Dialog */}
      <Dialog open={!!convertingLead} onOpenChange={(open) => { if (!open) handleConvertCancel(); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5 text-[#6637F4]" />
              Convert Lead to Client
            </DialogTitle>
            <DialogDescription>
              This will create a new client from <strong>{convertingLead?.lead.firstName} {convertingLead?.lead.lastName}</strong>
              {convertingLead?.lead.company && <> at <strong>{convertingLead.lead.company}</strong></>}.
              The lead will be marked as <strong>Won</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Client Type */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-[#0F172A]">Client Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConvertClientType("INDIVIDUAL")}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${convertClientType === "INDIVIDUAL"
                    ? "border-[#6637F4] bg-[#6637F4]/5 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <User size={24} className={`mx-auto mb-2 ${convertClientType === "INDIVIDUAL" ? "text-[#6637F4]" : "text-gray-400"}`} />
                  <p className={`text-sm font-medium ${convertClientType === "INDIVIDUAL" ? "text-[#6637F4]" : "text-gray-600"}`}>Individual</p>
                  <p className="text-xs text-gray-400 mt-1">Person / Freelancer</p>
                </button>
                <button
                  type="button"
                  onClick={() => setConvertClientType("COMPANY")}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${convertClientType === "COMPANY"
                    ? "border-[#6637F4] bg-[#6637F4]/5 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <Building2 size={24} className={`mx-auto mb-2 ${convertClientType === "COMPANY" ? "text-[#6637F4]" : "text-gray-400"}`} />
                  <p className={`text-sm font-medium ${convertClientType === "COMPANY" ? "text-[#6637F4]" : "text-gray-600"}`}>Company</p>
                  <p className="text-xs text-gray-400 mt-1">Business / Organization</p>
                </button>
              </div>
            </div>

            {/* Create Contact Toggle */}
            {convertClientType === "COMPANY" && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#F7F7FB] border">
                <div>
                  <Label className="text-sm font-medium text-[#0F172A]">Create Primary Contact</Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Add {convertingLead?.lead.firstName} {convertingLead?.lead.lastName} as the contact person
                  </p>
                </div>
                <Switch checked={convertCreateContact} onCheckedChange={setConvertCreateContact} />
              </div>
            )}

            {/* Preview */}
            <div className="p-4 rounded-lg border bg-gray-50/50 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">What will be created</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>New <strong>{convertClientType === "COMPANY" ? "Company" : "Individual"}</strong> client</span>
                </div>
                {convertClientType === "COMPANY" && convertCreateContact && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Primary contact: <strong>{convertingLead?.lead.firstName} {convertingLead?.lead.lastName}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Lead marked as <strong>Won</strong></span>
                </div>
              </div>
            </div>

            {convertError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{convertError}</div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleConvertCancel} disabled={convertLoading}>Cancel</Button>
            <Button
              onClick={handleConvertConfirm}
              disabled={convertLoading}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {convertLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              {convertLoading ? "Converting..." : "Convert to Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog (Qualified Prompt) */}
      <Dialog open={meetingDialogOpen} onOpenChange={(open) => { if (!open) handleMeetingCancel(); }}>
        <DialogContent className="sm:max-w-[520px] rounded-xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#6637F4] to-[#06B6D4] p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarDays size={22} />
                Schedule Meeting
              </DialogTitle>
              <DialogDescription className="text-white/80 mt-1">
                <span className="font-semibold text-white">{qualifyingLead?.lead.firstName} {qualifyingLead?.lead.lastName}</span> has been qualified!
                Schedule a meeting to move forward.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleMeetingSchedule} className="p-6 space-y-5">
            {/* Meeting Type */}
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
                      <CheckCircle2 size={16} className="text-[#6637F4]" />
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
                      <CheckCircle2 size={16} className="text-[#F59E0B]" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Meeting Title */}
            <div>
              <Label htmlFor="pipeMeetingTitle" className="text-sm font-medium text-[#475569]">Meeting Title</Label>
              <Input
                id="pipeMeetingTitle"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Discovery Call"
                className="mt-1.5 rounded-lg"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="pipeMeetingDate" className="text-sm font-medium text-[#475569]">Date</Label>
                <Input id="pipeMeetingDate" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="mt-1.5 rounded-lg" required />
              </div>
              <div>
                <Label htmlFor="pipeMeetingTime" className="text-sm font-medium text-[#475569]">Time</Label>
                <Input id="pipeMeetingTime" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="mt-1.5 rounded-lg" required />
              </div>
              <div>
                <Label htmlFor="pipeMeetingDuration" className="text-sm font-medium text-[#475569]">Duration</Label>
                <select value={meetingDuration} onChange={(e) => setMeetingDuration(e.target.value)} className="mt-1.5 w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white">
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
            </div>

            {/* Conditional fields */}
            {meetingType === "online" ? (
              <div>
                <Label htmlFor="pipeMeetingLink" className="text-sm font-medium text-[#475569]">Meeting Link</Label>
                <div className="relative mt-1.5">
                  <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6637F4]" />
                  <Input id="pipeMeetingLink" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/... (auto if empty)" className="pl-9 rounded-lg" />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="pipeMeetingLoc" className="text-sm font-medium text-[#475569]">Location</Label>
                <div className="relative mt-1.5" ref={locAutocompleteRef}>
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F59E0B] z-10" />
                  <Input
                    id="pipeMeetingLoc"
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
              <Label htmlFor="pipeMeetingNotes" className="text-sm font-medium text-[#475569]">Notes (optional)</Label>
              <Textarea id="pipeMeetingNotes" value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} placeholder="Agenda, topics..." rows={2} className="mt-1.5 rounded-lg resize-none" />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleMeetingSkip} className="text-gray-500 hover:text-gray-700">
                Skip for now
              </Button>
              <Button
                type="submit"
                disabled={meetingSubmitting}
                className={`rounded-lg gap-2 text-white ${meetingType === "online" ? "bg-[#6637F4] hover:bg-[#6637F4]/90" : "bg-[#F59E0B] hover:bg-[#F59E0B]/90"
                  }`}
              >
                {meetingSubmitting ? <RefreshCw size={16} className="animate-spin" /> : meetingType === "online" ? <Video size={16} /> : <MapPin size={16} />}
                {meetingSubmitting ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Pipeline;
