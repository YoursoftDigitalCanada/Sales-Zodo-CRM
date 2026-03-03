import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getLeadById, convertLead, getInspectionsByLeadId, createInspection, updateInspection, deleteInspection, getInsuranceClaimsByLeadId, createInsuranceClaim, updateInsuranceClaim, deleteInsuranceClaim } from "@/features/leads";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import {
    ArrowLeft, Loader2, Mail, Phone, MapPin, Building2, Globe, Briefcase,
    Tag, Calendar, Clock, DollarSign, TrendingUp, Thermometer, User, Users,
    FileText, MessageSquare, CheckSquare, Activity, MoreHorizontal,
    UserPlus, ArrowRightLeft, Star, Pencil, Send, ExternalLink, Flame, Search, Plus, Trash2, Eye,
    Snowflake, Zap, X, CheckCircle2, Home, Wrench, Shield, HardHat,
    ClipboardList, Banknote, AlertTriangle
} from "lucide-react";

// ── Interfaces ──────────────────────────────────────────────────────────

interface LeadData {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    location: string | null;
    companyName: string | null;
    jobTitle: string | null;
    website: string | null;
    status: string;
    temperature: string;
    potentialValue: number | string | null;
    notes: string | null;
    convertedAt: string | null;
    convertedToClientId: string | null;
    createdAt: string;
    updatedAt: string;
    leadSource: { id: string; name: string } | null;
    assignedTo: {
        id: string;
        user: { id: string; firstName: string; lastName: string; email: string; avatar: string | null };
    } | null;
    createdBy: {
        id: string;
        user: { id: string; firstName: string; lastName: string };
    } | null;
    tags: Array<{ tag: { id: string; name: string; color?: string } }>;
    activities?: Array<{
        id: string;
        type: string;
        description: string;
        createdAt: string;
        createdBy?: { user: { firstName: string; lastName: string } };
    }>;
    // Stage 1: Property
    propertyAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    propertyType?: string | null;
    // Stage 1: Service
    serviceType?: string | null;
    isInsuranceClaim?: string | null;
    urgencyLevel?: string | null;
    preferredContactMethod?: string | null;
    bestTimeToContact?: string | null;
    issueDescription?: string | null;
    // Stage 2: Verification
    confirmedName?: boolean | null;
    confirmedPhone?: boolean | null;
    confirmedEmail?: boolean | null;
    confirmedAddress?: boolean | null;
    secondaryPhone?: string | null;
    spouseCoOwnerName?: string | null;
    // Stage 2: Ownership
    isHomeowner?: string | null;
    isDecisionMaker?: string | null;
    ownershipType?: string | null;
    // Stage 2: Roof
    roofAge?: string | null;
    currentRoofMaterial?: string | null;
    numberOfStories?: string | null;
    knownDamageType?: string[] | null;
    damageOccurrenceDate?: string | null;
    previousRoofWork?: string | null;
    previousRoofWorkDetails?: string | null;
    // Stage 2: Insurance
    insuranceCompanyName?: string | null;
    hasClaimBeenFiled?: string | null;
    claimNumber?: string | null;
    adjusterAssigned?: string | null;
    adjusterName?: string | null;
    adjusterPhone?: string | null;
    adjusterEmail?: string | null;
    adjusterMeetingDate?: string | null;
    // Stage 2: Budget
    budgetRange?: string | null;
    workTimeline?: string | null;
    financingNeeded?: string | null;
    gettingOtherQuotes?: string | null;
    numberOfOtherQuotes?: number | null;
    topPriority?: string | null;
    // Stage 2: HOA
    isHOA?: string | null;
    hoaRestrictions?: string | null;
    // Stage 2: Assessment
    leadScore?: number | null;
    disqualifiedReason?: string | null;
    nextStep?: string | null;
    followUpDateTime?: string | null;
    inspectionAppointmentDate?: string | null;
    qualificationCallNotes?: string | null;
}

interface NoteEntry {
    id: number;
    content: string;
    date: string;
    author: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    NEW: { label: "New", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
    CONTACTED: { label: "Contacted", color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200" },
    QUALIFIED: { label: "Qualified", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
    PROPOSAL: { label: "Proposal", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
    NEGOTIATION: { label: "Negotiation", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
    WON: { label: "Won", color: "text-green-700", bg: "bg-green-50 border-green-200" },
    LOST: { label: "Lost", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const TEMP_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    COLD: { label: "Cold", icon: Snowflake, color: "text-blue-600", bg: "bg-blue-50" },
    WARM: { label: "Warm", icon: Flame, color: "text-amber-600", bg: "bg-amber-50" },
    HOT: { label: "Hot", icon: Zap, color: "text-red-600", bg: "bg-red-50" },
};

const formatCurrency = (val: number | string | null | undefined) => {
    if (!val) return "$0";
    const n = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
    catch { return "—"; }
};

const timeAgo = (d: string | null | undefined) => {
    if (!d) return "—";
    try {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        return formatDate(d);
    } catch { return "—"; }
};

const getInitials = (first: string, last: string) =>
    `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "LD";

// ── Pipeline Progress ───────────────────────────────────────────────────

const PIPELINE_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];

const PipelineProgress = ({ currentStatus }: { currentStatus: string }) => {
    const idx = PIPELINE_STAGES.indexOf(currentStatus);
    const isTerminal = currentStatus === "WON" || currentStatus === "LOST";

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                {PIPELINE_STAGES.map((stage, i) => {
                    const active = !isTerminal && i <= idx;
                    const cfg = STATUS_CONFIG[stage];
                    return (
                        <div key={stage} className="flex items-center flex-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${active ? "bg-[#0891B2] text-white shadow-sm" : "bg-gray-100 text-gray-400"
                                }`}>
                                {i + 1}
                            </div>
                            {i < PIPELINE_STAGES.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1 ${active && i < idx ? "bg-[#0891B2]" : "bg-gray-200"}`} />
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between px-0.5">
                {PIPELINE_STAGES.map(s => (
                    <span key={s} className="text-[9px] text-gray-400 text-center" style={{ width: "20%" }}>
                        {STATUS_CONFIG[s]?.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

// ── Convert Dialog ──────────────────────────────────────────────────────

interface ConvertDialogProps {
    open: boolean;
    onClose: () => void;
    lead: LeadData;
    onSuccess: (clientId: string) => void;
}

const ConvertLeadDialog = ({ open, onClose, lead, onSuccess }: ConvertDialogProps) => {
    const [clientType, setClientType] = useState<"INDIVIDUAL" | "COMPANY">(lead.companyName ? "COMPANY" : "INDIVIDUAL");
    const [createContact, setCreateContact] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const handleConvert = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await convertLead(lead.id, { clientType, createContact });
            toast({
                title: "🎉 Lead Converted!",
                description: `${lead.firstName} ${lead.lastName} is now a client.`,
            });
            onSuccess(data.clientId);
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Conversion failed. Please try again.";
            setError(msg);
            toast({ title: "Conversion Failed", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <ArrowRightLeft className="h-5 w-5 text-[#0891B2]" />
                        Convert Lead to Client
                    </DialogTitle>
                    <DialogDescription>
                        This will create a new client from <strong>{lead.firstName} {lead.lastName}</strong>
                        {lead.companyName && <> at <strong>{lead.companyName}</strong></>}.
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
                                onClick={() => setClientType("INDIVIDUAL")}
                                className={`p-4 rounded-lg border-2 text-center transition-all ${clientType === "INDIVIDUAL"
                                    ? "border-[#0891B2] bg-[#0891B2]/5 shadow-sm"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <User className={`h-6 w-6 mx-auto mb-2 ${clientType === "INDIVIDUAL" ? "text-[#0891B2]" : "text-gray-400"}`} />
                                <p className={`text-sm font-medium ${clientType === "INDIVIDUAL" ? "text-[#0891B2]" : "text-gray-600"}`}>Individual</p>
                                <p className="text-xs text-gray-400 mt-1">Person / Freelancer</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setClientType("COMPANY")}
                                className={`p-4 rounded-lg border-2 text-center transition-all ${clientType === "COMPANY"
                                    ? "border-[#0891B2] bg-[#0891B2]/5 shadow-sm"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <Building2 className={`h-6 w-6 mx-auto mb-2 ${clientType === "COMPANY" ? "text-[#0891B2]" : "text-gray-400"}`} />
                                <p className={`text-sm font-medium ${clientType === "COMPANY" ? "text-[#0891B2]" : "text-gray-600"}`}>Company</p>
                                <p className="text-xs text-gray-400 mt-1">Business / Organization</p>
                            </button>
                        </div>
                    </div>

                    {/* Create Contact Toggle */}
                    {clientType === "COMPANY" && (
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#F8FAFC] border">
                            <div>
                                <Label className="text-sm font-medium text-[#0F172A]">Create Primary Contact</Label>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Add {lead.firstName} {lead.lastName} as the contact person
                                </p>
                            </div>
                            <Switch checked={createContact} onCheckedChange={setCreateContact} />
                        </div>
                    )}

                    {/* Preview */}
                    <div className="p-4 rounded-lg border bg-gray-50/50 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">What will be created</p>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>New <strong>{clientType === "COMPANY" ? "Company" : "Individual"}</strong> client</span>
                            </div>
                            {clientType === "COMPANY" && createContact && (
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span>Primary contact: <strong>{lead.firstName} {lead.lastName}</strong></span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>Lead marked as <strong>Won</strong></span>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button
                        onClick={handleConvert}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                        {loading ? "Converting..." : "Convert to Client"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ── Main Page ───────────────────────────────────────────────────────────

const LeadDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [lead, setLead] = useState<LeadData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [showConvertDialog, setShowConvertDialog] = useState(false);

    // Notes state
    const [notes, setNotes] = useState<NoteEntry[]>([]);
    const [newNote, setNewNote] = useState("");

    // Inspections state
    const [inspections, setInspections] = useState<any[]>([]);
    const [inspectionsLoading, setInspectionsLoading] = useState(false);
    const [showInspectionDialog, setShowInspectionDialog] = useState(false);
    const [editingInspection, setEditingInspection] = useState<any | null>(null);

    // Insurance Claims state
    const [insuranceClaims, setInsuranceClaims] = useState<any[]>([]);
    const [claimsLoading, setClaimsLoading] = useState(false);
    const [showClaimDialog, setShowClaimDialog] = useState(false);
    const [editingClaim, setEditingClaim] = useState<any | null>(null);

    const fetchLead = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getLeadById(id!);
            setLead(data);

            // Parse notes from lead
            if (data.notes) {
                setNotes([{ id: 1, content: data.notes, date: formatDate(data.createdAt), author: "System" }]);
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to load lead details.", variant: "destructive" });
            console.error("Failed to fetch lead:", err);
        } finally {
            setIsLoading(false);
        }
    }, [id, toast]);

    useEffect(() => { fetchLead(); }, [fetchLead]);

    // ── Inspections CRUD ─────────────────────────────────────────────────
    const fetchInspections = useCallback(async () => {
        if (!id) return;
        try {
            setInspectionsLoading(true);
            const data = await getInspectionsByLeadId(id);
            setInspections(data);
        } catch {
            console.error("Failed to fetch inspections");
        } finally {
            setInspectionsLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchInspections(); }, [fetchInspections]);

    const handleSaveInspection = async (data: Record<string, unknown>) => {
        try {
            if (editingInspection) {
                await updateInspection(id!, editingInspection.id, data);
                toast({ title: "Inspection updated" });
            } else {
                await createInspection(id!, data);
                toast({ title: "Inspection created" });
            }
            setShowInspectionDialog(false);
            setEditingInspection(null);
            fetchInspections();
        } catch {
            toast({ title: "Error", description: "Failed to save inspection.", variant: "destructive" });
        }
    };

    const handleDeleteInspection = async (inspectionId: string) => {
        if (!confirm("Delete this inspection?")) return;
        try {
            await deleteInspection(id!, inspectionId);
            toast({ title: "Inspection deleted" });
            fetchInspections();
        } catch {
            toast({ title: "Error", description: "Failed to delete inspection.", variant: "destructive" });
        }
    };

    // ── Insurance Claims CRUD ────────────────────────────────────────────
    const fetchClaims = useCallback(async () => {
        if (!id) return;
        try {
            setClaimsLoading(true);
            const data = await getInsuranceClaimsByLeadId(id);
            setInsuranceClaims(data);
        } catch {
            console.error("Failed to fetch insurance claims");
        } finally {
            setClaimsLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchClaims(); }, [fetchClaims]);

    const handleSaveClaim = async (data: Record<string, unknown>) => {
        try {
            if (editingClaim) {
                await updateInsuranceClaim(id!, editingClaim.id, data);
                toast({ title: "Insurance claim updated" });
            } else {
                await createInsuranceClaim(id!, data);
                toast({ title: "Insurance claim created" });
            }
            setShowClaimDialog(false);
            setEditingClaim(null);
            fetchClaims();
        } catch {
            toast({ title: "Error", description: "Failed to save insurance claim.", variant: "destructive" });
        }
    };

    const handleDeleteClaim = async (claimId: string) => {
        if (!confirm("Delete this insurance claim?")) return;
        try {
            await deleteInsuranceClaim(id!, claimId);
            toast({ title: "Insurance claim deleted" });
            fetchClaims();
        } catch {
            toast({ title: "Error", description: "Failed to delete insurance claim.", variant: "destructive" });
        }
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        setNotes(prev => [{ id: Date.now(), content: newNote, date: "Just now", author: "You" }, ...prev]);
        setNewNote("");
    };

    const handleConvertSuccess = (clientId: string) => {
        setShowConvertDialog(false);
        navigate(`/client-list/${clientId}`);
    };

    // ── Loading / Error ───────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#14B8A6]" size={40} />
            </div>
        );
    }

    if (!lead) return null;

    const fullName = `${lead.firstName} ${lead.lastName}`;
    const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
    const tempCfg = TEMP_CONFIG[lead.temperature] || TEMP_CONFIG.WARM;
    const TempIcon = tempCfg.icon;
    const isConverted = lead.status === "WON" && !!lead.convertedToClientId;
    const canConvert = lead.status !== "WON" && lead.status !== "LOST";
    const ownerName = lead.assignedTo
        ? `${lead.assignedTo.user.firstName} ${lead.assignedTo.user.lastName}`
        : "Unassigned";
    const leadAge = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
    const propertyAddr = [lead.propertyAddress, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ");

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            <style>{`
                @keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
            `}</style>

            {/* ═══════════ STICKY HEADER ═══════════ */}
            <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
                <div className="px-6 pt-3 pb-1">
                    <Breadcrumb><BreadcrumbList>
                        <BreadcrumbItem><BreadcrumbLink href="/dashboard" className="text-xs">Dashboard</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem><BreadcrumbLink href="/leads" className="text-xs">Leads</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem><BreadcrumbPage className="text-xs font-semibold text-[#14B8A6]">{fullName}</BreadcrumbPage></BreadcrumbItem>
                    </BreadcrumbList></Breadcrumb>
                </div>
                <div className="px-6 pb-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => navigate('/leads')} className="p-1.5 rounded-lg hover:bg-[#F9FAFB] text-[#6B7280] transition-colors flex-shrink-0"><ArrowLeft size={18} /></button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                            {getInitials(lead.firstName, lead.lastName)}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-bold text-[#111827] truncate">{fullName}</h1>
                                <Badge variant="outline" className={`${statusCfg.bg} ${statusCfg.color} font-medium text-[10px]`}>{statusCfg.label}</Badge>
                                <Badge variant="outline" className={`${tempCfg.bg} ${tempCfg.color} font-medium text-[10px] gap-0.5`}><TempIcon className="h-3 w-3" />{tempCfg.label}</Badge>
                                {isConverted && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCFCE7] text-[#166534]">✓ Converted</span>}
                            </div>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                                {lead.companyName && <><Building2 className="inline h-3 w-3 mr-0.5" />{lead.companyName} · </>}
                                {ownerName !== "Unassigned" && <>Assigned to <span className="font-medium text-[#6B7280]">{ownerName}</span> · </>}
                                Created {formatDate(lead.createdAt)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {lead.phone && <a href={`tel:${lead.phone}`} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] transition-all"><Phone size={14} className="text-[#14B8A6]" />Call</a>}
                        {lead.email && <a href={`mailto:${lead.email}`} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] transition-all"><Mail size={14} className="text-[#14B8A6]" />Email</a>}
                        {isConverted && <Link to={`/client-list/${lead.convertedToClientId}`}><Button variant="outline" size="sm" className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50 text-xs"><ExternalLink size={14} />View Client</Button></Link>}
                        {canConvert && <Button size="sm" onClick={() => setShowConvertDialog(true)} className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs shadow-sm"><ArrowRightLeft size={14} />Convert</Button>}
                    </div>
                </div>
                {/* Pipeline Progress Bar */}
                {!isConverted && lead.status !== "LOST" && (
                    <div className="px-6 pb-3"><PipelineProgress currentStatus={lead.status} /></div>
                )}
            </header>

            {/* ═══════════ MAIN CONTENT ═══════════ */}
            <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">

                {/* Convert/Converted Banner */}
                {canConvert && (
                    <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 flex items-center justify-between" style={{ animation: 'fadeSlideUp 0.35s ease both' }}>
                        <div><h3 className="font-semibold text-green-800 text-sm">Ready to convert?</h3><p className="text-xs text-green-600 mt-0.5">Turn this lead into a client to unlock projects, invoicing, and more.</p></div>
                        <Button size="sm" onClick={() => setShowConvertDialog(true)} className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"><ArrowRightLeft size={14} />Convert to Client</Button>
                    </div>
                )}
                {isConverted && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between" style={{ animation: 'fadeSlideUp 0.35s ease both' }}>
                        <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><h3 className="font-semibold text-green-800 text-sm">Lead Converted</h3><p className="text-xs text-green-600">Converted on {formatDate(lead.convertedAt)}</p></div></div>
                        <Link to={`/client-list/${lead.convertedToClientId}`}><Button variant="outline" size="sm" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100 text-xs"><ExternalLink size={14} />View Client</Button></Link>
                    </div>
                )}

                {/* ═══════════ KPI STATS ROW ═══════════ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ animation: 'fadeSlideUp 0.35s ease both' }}>
                    {[
                        { icon: <DollarSign size={18} />, bg: "bg-[#CCFBF1]", color: "text-[#0D9488]", label: "Deal Value", value: formatCurrency(lead.potentialValue) },
                        { icon: <TempIcon size={18} />, bg: tempCfg.bg, color: tempCfg.color, label: "Temperature", value: tempCfg.label },
                        { icon: <TrendingUp size={18} />, bg: "bg-[#EDE9FE]", color: "text-[#7C3AED]", label: "Lead Source", value: lead.leadSource?.name || "Direct" },
                        { icon: <Clock size={18} />, bg: "bg-[#EFF6FF]", color: "text-[#2563EB]", label: "Lead Age", value: `${leadAge} day${leadAge !== 1 ? 's' : ''}` },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5" style={{ animation: `fadeSlideUp 0.4s ease ${100 + i * 80}ms both` }}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</div>
                                <div><div className="text-xl font-bold text-[#111827]">{s.value}</div><div className="text-[11px] text-[#6B7280] font-medium">{s.label}</div></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ═══════════ CARD GRID ═══════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* CARD 1: Contact & Lead Info */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 200ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#CCFBF1] flex items-center justify-center"><User size={14} className="text-[#0D9488]" /></div><h3 className="text-sm font-semibold text-[#111827]">Contact Information</h3></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {[
                                { l: "Full Name", v: fullName }, { l: "Email", v: lead.email, href: lead.email ? `mailto:${lead.email}` : undefined },
                                { l: "Phone", v: lead.phone, href: lead.phone ? `tel:${lead.phone}` : undefined }, { l: "Secondary Phone", v: lead.secondaryPhone },
                                { l: "Company", v: lead.companyName }, { l: "Job Title", v: lead.jobTitle },
                                { l: "Location", v: lead.location }, { l: "Website", v: lead.website, href: lead.website || undefined },
                                { l: "Preferred Contact", v: lead.preferredContactMethod }, { l: "Best Time", v: lead.bestTimeToContact },
                                { l: "Spouse/Co-Owner", v: lead.spouseCoOwnerName }, { l: "Assigned To", v: ownerName },
                            ].filter(r => r.v).map((r, i) => (
                                <div key={i} className="py-1"><p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium">{r.l}</p>
                                    {r.href ? <a href={r.href} className="text-[#14B8A6] hover:underline font-medium text-sm" target={r.href.startsWith('http') ? '_blank' : undefined} rel={r.href.startsWith('http') ? 'noreferrer' : undefined}>{r.v}</a> : <p className="font-medium text-[#111827]">{r.v}</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CARD 2: Property & Service */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 280ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center"><Home size={14} className="text-[#D97706]" /></div><h3 className="text-sm font-semibold text-[#111827]">Property & Service</h3></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {[
                                { l: "Property Address", v: propertyAddr }, { l: "Property Type", v: lead.propertyType },
                                { l: "Service Type", v: lead.serviceType }, { l: "Insurance Claim?", v: lead.isInsuranceClaim },
                                { l: "Urgency", v: lead.urgencyLevel }, { l: "Homeowner?", v: lead.isHomeowner },
                                { l: "Roof Age", v: lead.roofAge }, { l: "Roof Material", v: lead.currentRoofMaterial },
                                { l: "Stories", v: lead.numberOfStories }, { l: "Previous Work", v: lead.previousRoofWork },
                            ].filter(r => r.v).map((r, i) => (
                                <div key={i} className="py-1"><p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium">{r.l}</p><p className="font-medium text-[#111827]">{r.v}</p></div>
                            ))}
                        </div>
                        {lead.issueDescription && <div className="mt-3 pt-3 border-t border-[#F1F5F9]"><p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-1">Issue Description</p><p className="text-sm text-[#111827] bg-[#F9FAFB] p-3 rounded-lg">{lead.issueDescription}</p></div>}
                        {lead.knownDamageType && lead.knownDamageType.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{lead.knownDamageType.map(d => <span key={d} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEE2E2] text-[#DC2626] flex items-center gap-0.5"><AlertTriangle size={10} />{d}</span>)}</div>}
                    </div>

                    {/* CARD 3: Qualification & Budget */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 360ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#DBEAFE] flex items-center justify-center"><ClipboardList size={14} className="text-[#2563EB]" /></div><h3 className="text-sm font-semibold text-[#111827]">Qualification & Budget</h3></div>
                        </div>
                        {/* Verification badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {[{ k: lead.confirmedName, l: "Name" }, { k: lead.confirmedPhone, l: "Phone" }, { k: lead.confirmedEmail, l: "Email" }, { k: lead.confirmedAddress, l: "Address" }].map(item => (
                                <span key={item.l} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${item.k ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                                    {item.k ? <CheckCircle2 size={10} /> : <X size={10} />}{item.l}
                                </span>
                            ))}
                        </div>
                        <div className="space-y-0">
                            {[
                                { l: "Budget Range", v: lead.budgetRange }, { l: "Timeline", v: lead.workTimeline },
                                { l: "Decision Maker?", v: lead.isDecisionMaker }, { l: "Financing Needed?", v: lead.financingNeeded },
                                { l: "Getting Other Quotes?", v: lead.gettingOtherQuotes }, { l: "# Other Quotes", v: lead.numberOfOtherQuotes != null ? String(lead.numberOfOtherQuotes) : undefined },
                                { l: "Top Priority", v: lead.topPriority }, { l: "HOA?", v: lead.isHOA },
                                { l: "HOA Restrictions", v: lead.hoaRestrictions },
                            ].filter(r => r.v).map((r, i, arr) => (
                                <div key={i} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-dashed border-[#F1F5F9]' : ''}`}>
                                    <span className="text-xs text-[#6B7280]">{r.l}</span><span className="text-sm font-medium text-[#374151]">{r.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CARD 4: Insurance & Assessment */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 440ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#FCE7F3] flex items-center justify-center"><Shield size={14} className="text-[#DB2777]" /></div><h3 className="text-sm font-semibold text-[#111827]">Insurance & Assessment</h3></div>
                            <button onClick={() => { setEditingClaim(null); setShowClaimDialog(true); }} className="text-xs font-medium text-[#14B8A6] hover:text-[#0D9488]">+ New Claim</button>
                        </div>
                        <div className="space-y-0">
                            {[
                                { l: "Insurance Company", v: lead.insuranceCompanyName }, { l: "Claim Filed?", v: lead.hasClaimBeenFiled },
                                { l: "Claim Number", v: lead.claimNumber }, { l: "Adjuster Assigned?", v: lead.adjusterAssigned },
                                { l: "Adjuster Name", v: lead.adjusterName }, { l: "Adjuster Phone", v: lead.adjusterPhone },
                                { l: "Adjuster Meeting", v: lead.adjusterMeetingDate ? formatDate(lead.adjusterMeetingDate) : undefined },
                                { l: "Lead Score", v: lead.leadScore != null ? `${lead.leadScore}/10` : undefined },
                                { l: "Next Step", v: lead.nextStep }, { l: "Follow-Up", v: lead.followUpDateTime ? formatDate(lead.followUpDateTime) : undefined },
                                { l: "Inspection Date", v: lead.inspectionAppointmentDate ? formatDate(lead.inspectionAppointmentDate) : undefined },
                            ].filter(r => r.v).map((r, i, arr) => (
                                <div key={i} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-dashed border-[#F1F5F9]' : ''}`}>
                                    <span className="text-xs text-[#6B7280]">{r.l}</span><span className="text-sm font-medium text-[#374151]">{r.v}</span>
                                </div>
                            ))}
                        </div>
                        {lead.disqualifiedReason && <div className="mt-3 p-2 rounded-lg bg-[#FEE2E2] text-xs text-[#DC2626] font-medium">⚠️ Disqualified: {lead.disqualifiedReason}</div>}
                        {lead.qualificationCallNotes && <div className="mt-3 pt-3 border-t border-[#F1F5F9]"><p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-1">Qualification Notes</p><p className="text-sm text-[#111827] bg-[#F9FAFB] p-3 rounded-lg whitespace-pre-wrap">{lead.qualificationCallNotes}</p></div>}
                    </div>

                    {/* CARD 5: Inspections */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 520ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#FFF7ED] flex items-center justify-center"><ClipboardList size={14} className="text-[#EA580C]" /></div><h3 className="text-sm font-semibold text-[#111827]">Inspections</h3><span className="text-xs bg-[#F1F5F9] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">{inspections.length}</span></div>
                            <button onClick={() => { setEditingInspection(null); setShowInspectionDialog(true); }} className="text-xs font-medium text-[#14B8A6] hover:text-[#0D9488]">+ New</button>
                        </div>
                        {inspectionsLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div> :
                            inspections.length === 0 ? <div className="text-center py-8"><ClipboardList size={24} className="text-[#D1D5DB] mx-auto mb-2" /><p className="text-xs text-[#9CA3AF]">No inspections yet</p></div> :
                                <div className="space-y-2">{inspections.slice(0, 4).map((insp: any) => (
                                    <div key={insp.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#F9FAFB] transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{insp.inspectionType || "General"}</Badge>{insp.overallCondition && <Badge variant="outline" className="text-[10px]">{insp.overallCondition}</Badge>}</div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-[#6B7280]"><span>{insp.inspectionDate ? formatDate(insp.inspectionDate) : '—'}</span>{insp.inspectorName && <span>by {insp.inspectorName}</span>}{insp.totalEstimate && <span className="font-medium text-[#111827]">${Number(insp.totalEstimate).toLocaleString()}</span>}</div>
                                        </div>
                                        <div className="flex gap-1"><button onClick={() => { setEditingInspection(insp); setShowInspectionDialog(true); }} className="p-1 rounded hover:bg-[#E5E7EB]"><Pencil size={12} className="text-[#6B7280]" /></button><button onClick={() => handleDeleteInspection(insp.id)} className="p-1 rounded hover:bg-[#FEE2E2]"><Trash2 size={12} className="text-[#EF4444]" /></button></div>
                                    </div>
                                ))}</div>}
                    </div>

                    {/* CARD 6: Insurance Claims */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 600ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center"><Shield size={14} className="text-[#7C3AED]" /></div><h3 className="text-sm font-semibold text-[#111827]">Insurance Claims</h3><span className="text-xs bg-[#F1F5F9] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">{insuranceClaims.length}</span></div>
                            <button onClick={() => { setEditingClaim(null); setShowClaimDialog(true); }} className="text-xs font-medium text-[#14B8A6] hover:text-[#0D9488]">+ New</button>
                        </div>
                        {claimsLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div> :
                            insuranceClaims.length === 0 ? <div className="text-center py-8"><Shield size={24} className="text-[#D1D5DB] mx-auto mb-2" /><p className="text-xs text-[#9CA3AF]">No insurance claims yet</p></div> :
                                <div className="space-y-2">{insuranceClaims.map((claim: any) => (
                                    <div key={claim.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#F9FAFB] transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">{claim.claimStatus && <Badge className={`text-[10px] ${claim.claimStatus === 'Approved' ? 'bg-green-100 text-green-700' : claim.claimStatus === 'Denied' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{claim.claimStatus}</Badge>}{claim.supplementNeeded && <Badge variant="outline" className="text-[10px] text-orange-600">Supplement</Badge>}</div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-[#6B7280]"><span>#{claim.claimNumber || '—'}</span>{claim.insuranceEstimateACV && <span>ACV: ${Number(claim.insuranceEstimateACV).toLocaleString()}</span>}{claim.deductibleAmount && <span>Ded: ${Number(claim.deductibleAmount).toLocaleString()}</span>}</div>
                                        </div>
                                        <div className="flex gap-1"><button onClick={() => { setEditingClaim(claim); setShowClaimDialog(true); }} className="p-1 rounded hover:bg-[#E5E7EB]"><Pencil size={12} className="text-[#6B7280]" /></button><button onClick={() => handleDeleteClaim(claim.id)} className="p-1 rounded hover:bg-[#FEE2E2]"><Trash2 size={12} className="text-[#EF4444]" /></button></div>
                                    </div>
                                ))}</div>}
                    </div>

                    {/* CARD 7: Notes */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 680ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#FEF9C3] flex items-center justify-center"><FileText size={14} className="text-[#CA8A04]" /></div><h3 className="text-sm font-semibold text-[#111827]">Notes</h3></div>
                        </div>
                        <div className="bg-[#F9FAFB] p-3 rounded-lg mb-3 border border-[#E5E7EB]">
                            <Textarea placeholder="Type your note here..." className="resize-none min-h-[60px] bg-white text-sm" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                            <div className="flex justify-end mt-2"><Button size="sm" className="bg-[#14B8A6] text-white hover:bg-[#0D9488] text-xs" onClick={handleAddNote} disabled={!newNote.trim()}>Save Note</Button></div>
                        </div>
                        {notes.length === 0 ? <p className="text-center text-xs text-[#9CA3AF] py-4">No notes yet</p> :
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">{notes.map(note => (
                                <div key={note.id} className="bg-[#FFFBEB] p-3 rounded-lg border border-[#FDE68A]/50"><p className="text-sm text-[#111827]">{note.content}</p><p className="text-[10px] text-[#9CA3AF] mt-1">{note.author} · {note.date}</p></div>
                            ))}</div>}
                    </div>

                    {/* CARD 8: Activity Timeline */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 760ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center"><Clock size={14} className="text-[#2563EB]" /></div><h3 className="text-sm font-semibold text-[#111827]">Recent Activity</h3></div>
                        </div>
                        <div className="max-h-[280px] overflow-y-auto -mx-1 px-1"><ActivityTimeline entityType="Lead" entityId={id!} /></div>
                    </div>

                    {/* Tags card (full width) */}
                    {lead.tags && lead.tags.length > 0 && (
                        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] lg:col-span-2" style={{ animation: 'fadeSlideUp 0.4s ease 840ms both' }}>
                            <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-[#CCFBF1] flex items-center justify-center"><Tag size={14} className="text-[#0D9488]" /></div><h3 className="text-sm font-semibold text-[#111827]">Tags</h3></div>
                            <div className="flex flex-wrap gap-2">{lead.tags.map((t, i) => <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#14B8A6]/10 text-[#0D9488]"><Tag size={10} className="mr-1" />{t.tag.name}</span>)}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Convert Dialog */}
            {showConvertDialog && lead && (
                <ConvertLeadDialog open={showConvertDialog} onClose={() => setShowConvertDialog(false)} lead={lead} onSuccess={handleConvertSuccess} />
            )}

            {/* Inspection Form Dialog */}
            {showInspectionDialog && (
                <InspectionFormDialog open={showInspectionDialog} onClose={() => { setShowInspectionDialog(false); setEditingInspection(null); }} onSave={handleSaveInspection} inspection={editingInspection} />
            )}

            {/* Insurance Claim Form Dialog */}
            {showClaimDialog && (
                <InsuranceClaimFormDialog open={showClaimDialog} onClose={() => { setShowClaimDialog(false); setEditingClaim(null); }} onSave={handleSaveClaim} claim={editingClaim} />
            )}
        </div>
    );
};





// ── Small Components ────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-[#475569]">{label}</span>
        <span className="text-sm font-medium text-[#0F172A]">{value}</span>
    </div>
);

export default LeadDetailPage;

// ── Inspection Form Dialog ──────────────────────────────────────────────

interface InspectionFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    inspection?: any;
}

const INSP_TABS = [
    { id: 'general', label: 'General' },
    { id: 'roof', label: 'Roof Assessment' },
    { id: 'damage', label: 'Damage' },
    { id: 'materials', label: 'Materials' },
    { id: 'estimate', label: 'Estimate' },
    { id: 'scheduling', label: 'Scheduling' },
];

const InspectionFormDialog = ({ open, onClose, onSave, inspection }: InspectionFormDialogProps) => {
    const [activeTab, setActiveTab] = useState('general');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<Record<string, any>>(() => inspection || {});

    const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        setSaving(true);
        // Clean empty strings to undefined
        const payload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(form)) {
            if (v === '' || v === undefined || v === null) continue;
            if (k === 'id' || k === 'leadId' || k === 'tenantId' || k === 'createdAt' || k === 'updatedAt' || k === 'createdById') continue;
            payload[k] = v;
        }
        await onSave(payload);
        setSaving(false);
    };

    const F = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => (
        <div className="space-y-1">
            <Label className="text-xs text-[#475569]">{label}</Label>
            {type === 'textarea' ? (
                <Textarea
                    value={form[field] || ''}
                    onChange={e => set(field, e.target.value)}
                    className="resize-none min-h-[60px] text-sm"
                />
            ) : type === 'select' ? null : (
                <Input
                    type={type}
                    value={form[field] ?? ''}
                    onChange={e => set(field, type === 'number' ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value)}
                    className="text-sm"
                />
            )}
        </div>
    );

    const Sel = ({ label, field, options }: { label: string; field: string; options: string[] }) => (
        <div className="space-y-1">
            <Label className="text-xs text-[#475569]">{label}</Label>
            <select
                value={form[field] || ''}
                onChange={e => set(field, e.target.value || undefined)}
                className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm"
            >
                <option value="">Select...</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );

    const Bool = ({ label, field }: { label: string; field: string }) => (
        <div className="flex items-center justify-between py-1">
            <Label className="text-xs text-[#475569]">{label}</Label>
            <Switch checked={!!form[field]} onCheckedChange={v => set(field, v)} />
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{inspection ? 'Edit Inspection' : 'New Inspection'}</DialogTitle>
                    <DialogDescription>Fill in the inspection details across the tabs below.</DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 flex-wrap border-b pb-2 mb-4">
                    {INSP_TABS.map(tab => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTab(tab.id)}
                            className={activeTab === tab.id ? 'bg-[#0891B2] text-white' : ''}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>

                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Inspection Date" field="inspectionDate" type="date" />
                        <F label="Inspector Name" field="inspectorName" />
                        <Sel label="Inspection Type" field="inspectionType" options={['Initial', 'Re-inspect', 'Insurance', 'Final']} />
                        <F label="Weather Conditions" field="weatherConditions" />
                        <Sel label="Access Method" field="accessMethod" options={['Ladder', 'Drone', 'Walk-on', 'Binoculars']} />
                        <Sel label="Overall Condition" field="overallCondition" options={['Poor', 'Fair', 'Good', 'Excellent']} />
                        <div className="col-span-full">
                            <F label="Inspector Notes" field="inspectorNotes" type="textarea" />
                        </div>
                        <div className="col-span-full">
                            <F label="Customer Feedback" field="customerFeedback" type="textarea" />
                        </div>
                        <div className="col-span-full">
                            <F label="Internal Notes" field="internalNotes" type="textarea" />
                        </div>
                    </div>
                )}

                {activeTab === 'roof' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Sel label="Roof Style" field="roofStyle" options={['Gable', 'Hip', 'Flat', 'Mansard', 'Gambrel', 'Shed']} />
                        <Sel label="Roof Pitch" field="roofPitch" options={['Low (2-4)', 'Medium (5-7)', 'Steep (8-12)']} />
                        <F label="Total Squares" field="totalSquares" type="number" />
                        <F label="Ridge Length (ft)" field="ridgeLength" type="number" />
                        <F label="Valley Length (ft)" field="valleyLength" type="number" />
                        <F label="Eave Length (ft)" field="eaveLength" type="number" />
                        <F label="Rake Length (ft)" field="rakeLength" type="number" />
                        <F label="Number of Layers" field="numberOfLayers" type="number" />
                        <Sel label="Decking Type" field="deckingType" options={['Plywood', 'OSB', '1x6', 'Skip']} />
                        <Sel label="Decking Condition" field="deckingCondition" options={['Good', 'Needs Repair', 'Needs Replace']} />
                        <Sel label="Underlayment Type" field="underlaymentType" options={['Felt', 'Synthetic', 'Ice & Water']} />
                        <Sel label="Ventilation Type" field="ventilationType" options={['Ridge', 'Box', 'Turbine', 'Power', 'Soffit']} />
                        <F label="Ventilation Count" field="ventilationCount" type="number" />
                        <Sel label="Flashing Condition" field="flashingCondition" options={['Good', 'Repair', 'Replace']} />
                        <Sel label="Gutter Condition" field="gutterCondition" options={['Good', 'Repair', 'Replace', 'None']} />
                        <F label="Skylight Count" field="skylightCount" type="number" />
                        <F label="Skylight Condition" field="skylightCondition" />
                        <Bool label="Chimney Present" field="chimneyPresent" />
                        <F label="Chimney Condition" field="chimneyCondition" />
                        <Sel label="Soffit/Fascia Condition" field="soffitFasciaCondition" options={['Good', 'Repair', 'Replace']} />
                        <Bool label="Drip Edge Present" field="dripEdgePresent" />
                        <F label="Drip Edge Condition" field="dripEdgeCondition" />
                        <Bool label="Ice/Water Shield Present" field="iceWaterShieldPresent" />
                    </div>
                )}

                {activeTab === 'damage' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Bool label="Storm Damage Found" field="stormDamageFound" />
                        <Sel label="Hail Size Found" field="hailSizeFound" options={['Pea', 'Marble', 'Quarter', 'Golf Ball', 'Baseball']} />
                        <div className="col-span-full"><F label="Wind Damage Details" field="windDamageDetails" type="textarea" /></div>
                        <div className="col-span-full"><F label="Hail Damage Details" field="hailDamageDetails" type="textarea" /></div>
                        <div className="col-span-full"><F label="Test Square Results" field="testSquareResults" type="textarea" /></div>
                        <Bool label="Interior Damage Found" field="interiorDamageFound" />
                        <F label="Photos Taken Count" field="photosTakenCount" type="number" />
                        <div className="col-span-full"><F label="Interior Damage Details" field="interiorDamageDetails" type="textarea" /></div>
                        <Sel label="Overall Damage Rating" field="overallDamageRating" options={['None', 'Minor', 'Moderate', 'Severe', 'Total Loss']} />
                    </div>
                )}

                {activeTab === 'materials' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Sel label="Proposed Material" field="proposedMaterial" options={['Asphalt', 'Metal', 'Tile', 'Flat', 'Wood', 'Slate']} />
                        <F label="Shingle Brand" field="shingleBrand" />
                        <F label="Shingle Line" field="shingleLine" />
                        <F label="Shingle Color" field="shingleColor" />
                        <F label="Underlayment Choice" field="underlaymentChoice" />
                        <F label="Ridge Cap Type" field="ridgeCapType" />
                        <F label="Ventilation Plan" field="ventilationPlan" />
                        <F label="Drip Edge Color" field="dripEdgeColor" />
                        <Sel label="Warranty Type" field="warrantyType" options={['Manufacturer', 'Workmanship', 'Extended']} />
                        <F label="Warranty Years" field="warrantyYears" type="number" />
                    </div>
                )}

                {activeTab === 'estimate' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <F label="Material Cost ($)" field="materialCost" type="number" />
                        <F label="Labor Cost ($)" field="laborCost" type="number" />
                        <F label="Tear-Off Cost ($)" field="tearOffCost" type="number" />
                        <F label="Permit Cost ($)" field="permitCost" type="number" />
                        <F label="Dumpster Cost ($)" field="dumpsterCost" type="number" />
                        <F label="Misc Cost ($)" field="miscCost" type="number" />
                        <F label="Subtotal ($)" field="subtotal" type="number" />
                        <F label="Overhead %" field="overheadPercent" type="number" />
                        <F label="Profit %" field="profitPercent" type="number" />
                        <F label="Total Estimate ($)" field="totalEstimate" type="number" />
                        <F label="Customer Price ($)" field="customerPrice" type="number" />
                        <F label="Deposit Required ($)" field="depositRequired" type="number" />
                        <Bool label="Deposit Collected" field="depositCollected" />
                        <Sel label="Payment Method" field="paymentMethod" options={['Cash', 'Check', 'Card', 'Financing', 'Insurance']} />
                        <Sel label="Estimate Status" field="estimateStatus" options={['Draft', 'Sent', 'Accepted', 'Rejected', 'Revised']} />
                    </div>
                )}

                {activeTab === 'scheduling' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Tentative Start Date" field="tentativeStartDate" type="date" />
                        <Sel label="Estimated Duration" field="estimatedDuration" options={['1 Day', '2-3 Days', '1 Week', '2 Weeks', '3+ Weeks']} />
                        <F label="Crew Size" field="crewSize" type="number" />
                        <F label="Crew Lead Name" field="crewLeadName" />
                        <Bool label="Materials Ordered" field="materialsOrdered" />
                        <F label="Materials Delivery Date" field="materialsDeliveryDate" type="date" />
                        <Bool label="Permit Pulled" field="permitPulled" />
                        <F label="Permit Number" field="permitNumber" />
                        <Bool label="Dumpster Ordered" field="dumpsterOrdered" />
                        <F label="Dumpster Delivery Date" field="dumpsterDeliveryDate" type="date" />
                    </div>
                )}

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-[#0891B2] hover:bg-[#0891B2]/80 text-white gap-2"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {inspection ? 'Update' : 'Create'} Inspection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ── Insurance Claim Form Dialog ──────────────────────────────────────────

interface InsuranceClaimFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    claim?: any;
}

const InsuranceClaimFormDialog = ({ open, onClose, onSave, claim }: InsuranceClaimFormDialogProps) => {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<Record<string, any>>(() => claim || {});

    const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        setSaving(true);
        const payload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(form)) {
            if (v === '' || v === undefined || v === null) continue;
            if (k === 'id' || k === 'leadId' || k === 'tenantId' || k === 'createdAt' || k === 'updatedAt' || k === 'createdById') continue;
            payload[k] = v;
        }
        await onSave(payload);
        setSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{claim ? 'Edit Insurance Claim' : 'New Insurance Claim'}</DialogTitle>
                    <DialogDescription>Enter the insurance claim details.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Claim Number</Label>
                        <Input value={form.claimNumber || ''} onChange={e => set('claimNumber', e.target.value)} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Claim Status</Label>
                        <select value={form.claimStatus || ''} onChange={e => set('claimStatus', e.target.value || undefined)}
                            className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm">
                            <option value="">Select...</option>
                            {['Open', 'In Review', 'Approved', 'Denied', 'Supplement'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Insurance Estimate (ACV) $</Label>
                        <Input type="number" value={form.insuranceEstimateACV ?? ''} onChange={e => set('insuranceEstimateACV', e.target.value ? Number(e.target.value) : undefined)} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Recoverable Depreciation $</Label>
                        <Input type="number" value={form.recoverableDepreciation ?? ''} onChange={e => set('recoverableDepreciation', e.target.value ? Number(e.target.value) : undefined)} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Full RCV Amount $</Label>
                        <Input type="number" value={form.fullRCVAmount ?? ''} onChange={e => set('fullRCVAmount', e.target.value ? Number(e.target.value) : undefined)} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Deductible Amount $</Label>
                        <Input type="number" value={form.deductibleAmount ?? ''} onChange={e => set('deductibleAmount', e.target.value ? Number(e.target.value) : undefined)} className="text-sm" />
                    </div>
                    <div className="flex items-center justify-between py-1">
                        <Label className="text-xs text-[#475569]">Supplement Needed</Label>
                        <Switch checked={!!form.supplementNeeded} onCheckedChange={v => set('supplementNeeded', v)} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Supplement Amount $</Label>
                        <Input type="number" value={form.supplementAmount ?? ''} onChange={e => set('supplementAmount', e.target.value ? Number(e.target.value) : undefined)} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Supplement Status</Label>
                        <select value={form.supplementStatus || ''} onChange={e => set('supplementStatus', e.target.value || undefined)}
                            className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm">
                            <option value="">Select...</option>
                            {['Pending', 'Submitted', 'Approved', 'Denied'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Mortgage Company</Label>
                        <Input value={form.mortgageCompanyName || ''} onChange={e => set('mortgageCompanyName', e.target.value)} className="text-sm" />
                    </div>
                    <div className="space-y-1 col-span-full">
                        <Label className="text-xs text-[#475569]">Mortgage Company Address</Label>
                        <Input value={form.mortgageCompanyAddress || ''} onChange={e => set('mortgageCompanyAddress', e.target.value)} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-[#475569]">Mortgage Loan Number</Label>
                        <Input value={form.mortgageLoanNumber || ''} onChange={e => set('mortgageLoanNumber', e.target.value)} className="text-sm" />
                    </div>
                    <div className="space-y-1 col-span-full">
                        <Label className="text-xs text-[#475569]">Claim Notes</Label>
                        <Textarea value={form.claimNotes || ''} onChange={e => set('claimNotes', e.target.value)} className="resize-none min-h-[60px] text-sm" />
                    </div>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving} className="bg-[#0891B2] hover:bg-[#0891B2]/80 text-white gap-2">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {claim ? 'Update' : 'Create'} Claim
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
