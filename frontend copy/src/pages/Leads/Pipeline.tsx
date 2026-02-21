// src/pages/Leads/Pipeline.tsx

import React, { useState, useCallback, useEffect, useRef } from "react";
import axios from "@/lib/axios";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
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
  X,
  Building2,
  Briefcase,
  Globe,
  User,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

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

// ============================================
// PIPELINE STAGE DEFINITIONS
// ============================================

const pipelineStageConfig: Omit<PipelineStage, "leads">[] = [
  { id: "new", name: "New Leads", color: "#3B82F6", bgColor: "#EFF6FF", icon: Sparkles },
  { id: "contacted", name: "Contacted", color: "#8B5CF6", bgColor: "#F5F3FF", icon: Mail },
  { id: "qualified", name: "Qualified", color: "#F59E0B", bgColor: "#FFFBEB", icon: Target },
  { id: "proposal", name: "Proposal Sent", color: "#22D3EE", bgColor: "#F0FDFA", icon: Clock },
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
    ? `${assignee.firstName || ""} ${assignee.lastName || ""}`.trim()
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
  `${(firstName || "?")[0]}${(lastName || "?")[0]}`.toUpperCase();

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

// ============================================
// LEAD CARD COMPONENT (Draggable)
// ============================================

const PipelineLeadCard = ({
  lead, stageColor, onView, onEdit, onDelete,
}: {
  lead: Lead; stageColor: string;
  onView: () => void; onEdit: () => void; onDelete: () => void;
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

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 cursor-grab active:cursor-grabbing hover:shadow-lg hover:border-slate-300 transition-all group"
      onClick={onView}
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
            <h4 className="font-semibold text-[#0F172A] text-sm group-hover:text-[#0891B2] transition-colors">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-md">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }} className="rounded-md text-sm">
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
            style={{ width: `${lead.score}%`, backgroundColor: getScoreColor(lead.score) }}
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
};

// ============================================
// PIPELINE COLUMN COMPONENT (Drop Target)
// ============================================

const PipelineColumn = ({
  stage, onLeadView, onLeadEdit, onLeadDelete, onAddLead, onDropLead,
}: {
  stage: PipelineStage;
  onLeadView: (lead: Lead) => void;
  onLeadEdit: (lead: Lead) => void;
  onLeadDelete: (lead: Lead) => void;
  onAddLead: (stageId: string) => void;
  onDropLead: (leadId: string, targetStageId: string) => void;
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
        style={{ backgroundColor: stage.bgColor, borderColor: `${stage.color}30` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${stage.color}20` }}>
              <StageIcon size={16} style={{ color: stage.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-[#0F172A] text-sm">{stage.name}</h3>
              <p className="text-xs text-[#94A3B8]">{stage.leads.length} leads</p>
            </div>
          </div>
          <span className="px-2 py-1 rounded-md text-xs font-bold" style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>
            {stage.leads.length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#0F172A]">{formatCurrency(totalValue)}</span>
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
        </div>
      </div>

      {/* Column Body (Drop Zone) */}
      <div
        className={cn(
          "min-h-[500px] max-h-[calc(100vh-350px)] overflow-y-auto p-3 space-y-3 rounded-b-xl border border-t-0 transition-all duration-200",
          isDragOver
            ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200 ring-inset"
            : "bg-[#F8FAFC]/50"
        )}
        style={{ borderColor: isDragOver ? undefined : `${stage.color}20` }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="flex items-center justify-center py-3 px-4 bg-blue-100/60 rounded-md border-2 border-dashed border-blue-300 text-[#0891B2] text-sm font-medium">
            Drop here to move to {stage.name}
          </div>
        )}

        <AnimatePresence>
          {stage.leads.map((lead) => (
            <PipelineLeadCard
              key={lead.id}
              lead={lead}
              stageColor={stage.color}
              onView={() => onLeadView(lead)}
              onEdit={() => onLeadEdit(lead)}
              onDelete={() => onLeadDelete(lead)}
            />
          ))}
        </AnimatePresence>

        {stage.leads.length === 0 && !isDragOver && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${stage.color}10` }}>
              <StageIcon size={20} style={{ color: stage.color }} />
            </div>
            <p className="text-sm text-[#94A3B8] mb-2">No leads in this stage</p>
            <Button size="sm" variant="outline" className="rounded-md text-xs" onClick={() => onAddLead(stage.id)}>
              <Plus size={12} className="mr-1" />
              Add Lead
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// LEAD DETAIL PANEL
// ============================================

const LeadDetailPanel = ({ lead, onClose, stageColor }: { lead: Lead; onClose: () => void; stageColor: string }) => {
  const tempInfo = getTemperatureInfo(lead.temperature);
  const TempIcon = tempInfo.icon;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 right-0 h-full w-[420px] glass-2xl border-l border-[rgba(15,23,42,0.06)] z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-[rgba(15,23,42,0.06)]" style={{ background: `linear-gradient(135deg, ${stageColor}10, transparent)` }}>
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
              <Target size={14} className="text-[#0891B2]" />
              <span className="text-xs text-[#0891B2] font-medium">Lead Score</span>
            </div>
            <p className="text-xl font-bold" style={{ color: getScoreColor(lead.score) }}>{lead.score}%</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-[#0F172A] mb-3">Contact Information</h4>
          <div className="space-y-3">
            {lead.email && (
              <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md">
                <Mail size={16} className="text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#475569]">Email</p>
                  <a href={`mailto:${lead.email}`} className="text-sm text-[#0891B2] hover:underline">{lead.email}</a>
                </div>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md">
                <Phone size={16} className="text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#475569]">Phone</p>
                  <a href={`tel:${lead.phone}`} className="text-sm text-[#0F172A]">{lead.phone}</a>
                </div>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md">
                <Building2 size={16} className="text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#475569]">Company</p>
                  <p className="text-sm text-[#0F172A]">{lead.company}</p>
                </div>
              </div>
            )}
            {lead.jobTitle && (
              <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md">
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
              <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md">
                <Globe size={16} className="text-[#475569] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#475569]">Lead Source</p>
                  <p className="text-sm text-[#0F172A] capitalize">{lead.source}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md">
              <User size={16} className="text-[#475569] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#475569]">Assigned To</p>
                <p className="text-sm text-[#0F172A]">{lead.assignedTo}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md">
              <Calendar size={16} className="text-[#475569] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#475569]">Created</p>
                <p className="text-sm text-[#0F172A]">{formatDate(lead.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md">
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
        <Button className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md gap-2">
          <Mail size={16} /> Send Email
        </Button>
        <Button variant="outline" className="flex-1 rounded-md gap-2">
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
  const [pipeline, setPipeline] = useState<PipelineStage[]>(buildEmptyPipeline());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch leads from API and distribute into pipeline stages
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/leads", { params: { limit: 100 } });
        const apiLeads = response.data?.data || response.data || [];
        const stages = buildEmptyPipeline();
        const leads: Lead[] = Array.isArray(apiLeads) ? apiLeads.map(mapApiLeadToPipeline) : [];

        leads.forEach((lead) => {
          const stageId = statusToStageId[(lead.status || "new").toUpperCase()] || "new";
          const stage = stages.find((s) => s.id === stageId);
          if (stage) stage.leads.push(lead);
        });

        setPipeline(stages);
      } catch (error) {
        console.error("Failed to fetch pipeline leads:", error);
        toast({ title: "Error", description: "Failed to load pipeline data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const totalLeads = pipeline.reduce((acc, stage) => acc + stage.leads.length, 0);
  const totalValue = pipeline.reduce((acc, stage) => acc + stage.leads.reduce((sum, lead) => sum + lead.value, 0), 0);
  const wonValue = pipeline.find((s) => s.id === "won")?.leads.reduce((acc, l) => acc + l.value, 0) || 0;

  // Find the stage color for the selected lead
  const selectedLeadStageColor = selectedLead
    ? pipeline.find((s) => s.leads.some((l) => l.id === selectedLead.id))?.color || "#22D3EE"
    : "#22D3EE";

  const handleLeadView = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const handleLeadEdit = (lead: Lead) => {
    toast({ title: "Edit Lead", description: `Editing ${lead.firstName} ${lead.lastName}` });
  };

  const handleLeadDelete = async (lead: Lead) => {
    try {
      await axios.delete(`/leads/${lead.id}`);
      setPipeline((prev) => prev.map((stage) => ({ ...stage, leads: stage.leads.filter((l) => l.id !== lead.id) })));
      if (selectedLead?.id === lead.id) setSelectedLead(null);
      toast({ title: "Lead Deleted", description: `${lead.firstName} ${lead.lastName} has been removed.`, variant: "destructive" });
    } catch (error) {
      console.error("Failed to delete lead:", error);
      toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" });
    }
  };

  const handleAddLead = (stageId: string) => {
    toast({ title: "Add Lead", description: `Adding new lead to ${stageId} stage` });
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
      await axios.patch(`/leads/${leadId}/status`, { status: newStatus });
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

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <main className="flex-1 ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <Link to="/dashboard" className="hover:text-[#0891B2]">Dashboard</Link>
                  <ChevronRight size={14} />
                  <Link to="/leads" className="hover:text-[#0891B2]">Leads</Link>
                  <ChevronRight size={14} />
                  <span className="text-[#0F172A] font-medium">Pipeline</span>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-[#0F172A]">Sales Pipeline</h1>
                  <span className="px-2 py-1 bg-[#0891B2]/10 text-[#0891B2] text-xs font-bold rounded-md">LIVE</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-4 mr-4">
                  <div className="text-center">
                    <p className="text-xs text-[#94A3B8]">Total Leads</p>
                    <p className="text-lg font-bold text-[#0F172A]">{totalLeads}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <p className="text-xs text-[#94A3B8]">Pipeline Value</p>
                    <p className="text-lg font-bold text-[#0891B2]">{formatCurrency(totalValue)}</p>
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
                    className="pl-9 h-10 w-64 rounded-md border-[rgba(15,23,42,0.06)]"
                  />
                </div>

                <Button variant="outline" className="rounded-md gap-2">
                  <Filter size={16} />
                  Filter
                </Button>

                <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md gap-2">
                  <Plus size={18} />
                  Add Lead
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Pipeline Board */}
        <div className="p-8">
          {/* Pipeline Flow Indicator */}
          <div className="mb-6 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm">
              {pipeline.map((stage, index) => (
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
          <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
            {pipeline.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                onLeadView={handleLeadView}
                onLeadEdit={handleLeadEdit}
                onLeadDelete={handleLeadDelete}
                onAddLead={handleAddLead}
                onDropLead={handleDropLead}
              />
            ))}
          </div>
        </div>
      </main>

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
              stageColor={selectedLeadStageColor}
            />
          </>
        )}
      </AnimatePresence>

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