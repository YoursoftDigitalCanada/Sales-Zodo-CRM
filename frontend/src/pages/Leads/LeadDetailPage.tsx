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
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#0891B2]" size={40} />
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

    const tabs = [
        { id: "overview", label: "Overview", icon: Activity },
        { id: "inspections", label: "Inspections", icon: ClipboardList },
        { id: "insurance", label: "Insurance Claims", icon: Shield },
        { id: "notes", label: "Notes", icon: FileText },
        { id: "timeline", label: "Timeline", icon: Clock },
    ];

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <main className="min-h-screen transition-all duration-300" style={{ marginLeft: "var(--sidebar-width, 16rem)" }}>

                {/* Header */}
                <header className="sticky top-0 z-30 border-b bg-white px-6 h-16 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/leads")} className="hover:bg-[#F8FAFC]">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem><BreadcrumbLink href="/leads">Leads</BreadcrumbLink></BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem><BreadcrumbPage className="font-semibold text-[#0891B2]">{fullName}</BreadcrumbPage></BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-3">
                        {isConverted && (
                            <Link to={`/client-list/${lead.convertedToClientId}`}>
                                <Button variant="outline" className="gap-2 text-green-600 border-green-200 hover:bg-green-50">
                                    <ExternalLink className="h-4 w-4" /> View Client
                                </Button>
                            </Link>
                        )}
                        {canConvert && (
                            <Button
                                onClick={() => setShowConvertDialog(true)}
                                className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm"
                            >
                                <ArrowRightLeft className="h-4 w-4" /> Convert to Client
                            </Button>
                        )}
                    </div>
                </header>

                <div className="p-4 md:p-6">
                    <div className="grid grid-cols-12 gap-4 md:gap-6">

                        {/* ── Left Sidebar ────────────────────────────────────── */}
                        <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4 md:space-y-5">

                            {/* Profile Card */}
                            <Card className="overflow-hidden border-none shadow-md">
                                <div className="h-20 bg-gradient-to-br from-[#0891B2] to-[#06B6D4]" />
                                <CardContent className="pt-0 -mt-10">
                                    <div className="flex flex-col items-center text-center">
                                        <Avatar className="h-20 w-20 border-4 border-white shadow-md bg-white">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`} />
                                            <AvatarFallback className="bg-[#0891B2]/10 text-[#0891B2] text-xl font-bold">
                                                {getInitials(lead.firstName, lead.lastName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <h2 className="text-lg font-bold text-[#0F172A] mt-2">{fullName}</h2>
                                        {lead.jobTitle && <p className="text-sm text-[#475569]">{lead.jobTitle}</p>}
                                        {lead.companyName && (
                                            <p className="text-sm text-[#475569] flex items-center gap-1 mt-0.5">
                                                <Building2 className="h-3.5 w-3.5" /> {lead.companyName}
                                            </p>
                                        )}

                                        {/* Status + Temp */}
                                        <div className="flex items-center gap-2 mt-3">
                                            <Badge variant="outline" className={`${statusCfg.bg} ${statusCfg.color} font-medium`}>
                                                {statusCfg.label}
                                            </Badge>
                                            <Badge variant="outline" className={`${tempCfg.bg} ${tempCfg.color} font-medium gap-1`}>
                                                <TempIcon className="h-3 w-3" /> {tempCfg.label}
                                            </Badge>
                                        </div>

                                        {/* Converted badge */}
                                        {isConverted && (
                                            <Link to={`/client-list/${lead.convertedToClientId}`}
                                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Converted to Client
                                            </Link>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pipeline Progress */}
                            {!isConverted && lead.status !== "LOST" && (
                                <Card className="shadow-sm">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-[#0F172A]">Pipeline Stage</CardTitle></CardHeader>
                                    <CardContent><PipelineProgress currentStatus={lead.status} /></CardContent>
                                </Card>
                            )}

                            {/* Contact Details */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-semibold text-[#0F172A]">Contact Details</CardTitle></CardHeader>
                                <CardContent className="space-y-3.5 pt-4">
                                    {lead.email && (
                                        <div className="flex items-start gap-3 group">
                                            <div className="p-2 bg-[#F8FAFC] rounded-md group-hover:bg-[#0891B2]/10 transition-colors"><Mail className="h-4 w-4 text-[#475569] group-hover:text-[#0891B2]" /></div>
                                            <div className="min-w-0 flex-1"><p className="text-xs text-[#475569]">Email</p><p className="text-sm font-medium text-[#0F172A] truncate">{lead.email}</p></div>
                                        </div>
                                    )}
                                    {lead.phone && (
                                        <div className="flex items-start gap-3 group">
                                            <div className="p-2 bg-[#F8FAFC] rounded-md group-hover:bg-[#0891B2]/10 transition-colors"><Phone className="h-4 w-4 text-[#475569] group-hover:text-[#0891B2]" /></div>
                                            <div><p className="text-xs text-[#475569]">Phone</p><p className="text-sm font-medium text-[#0F172A]">{lead.phone}</p></div>
                                        </div>
                                    )}
                                    {lead.location && (
                                        <div className="flex items-start gap-3 group">
                                            <div className="p-2 bg-[#F8FAFC] rounded-md group-hover:bg-[#0891B2]/10 transition-colors"><MapPin className="h-4 w-4 text-[#475569] group-hover:text-[#0891B2]" /></div>
                                            <div><p className="text-xs text-[#475569]">Location</p><p className="text-sm font-medium text-[#0F172A]">{lead.location}</p></div>
                                        </div>
                                    )}
                                    {lead.website && (
                                        <div className="flex items-start gap-3 group">
                                            <div className="p-2 bg-[#F8FAFC] rounded-md group-hover:bg-[#0891B2]/10 transition-colors"><Globe className="h-4 w-4 text-[#475569] group-hover:text-[#0891B2]" /></div>
                                            <div className="min-w-0 flex-1"><p className="text-xs text-[#475569]">Website</p><a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#0891B2] hover:underline truncate block">{lead.website}</a></div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Tags */}
                            {lead.tags && lead.tags.length > 0 && (
                                <Card className="shadow-sm">
                                    <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-[#0F172A]">Tags</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                            {lead.tags.map((t, i) => (
                                                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#0891B2]/5 text-[#0891B2] border border-[#0891B2]/10">
                                                    <Tag size={10} className="mr-1.5 opacity-60" /> {t.tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Quick Stats */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-[#0F172A]">Quick Info</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#475569] flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Potential Value</span>
                                        <span className="font-semibold text-[#0F172A]">{formatCurrency(lead.potentialValue)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#475569] flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Owner</span>
                                        <span className="font-medium text-[#0F172A]">{ownerName}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#475569] flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Source</span>
                                        <span className="font-medium text-[#0F172A]">{lead.leadSource?.name || "Direct"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#475569] flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Created</span>
                                        <span className="font-medium text-[#0F172A]">{formatDate(lead.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[#475569] flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Updated</span>
                                        <span className="font-medium text-[#0F172A]">{timeAgo(lead.updatedAt)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Right Panel — Tabs ──────────────────────────────── */}
                        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
                            <Card className="h-full border-none shadow-md bg-white">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                                    <CardHeader className="pb-0 border-b px-0">
                                        <div className="px-6 overflow-x-auto scrollbar-hide">
                                            <TabsList className="bg-transparent h-auto p-0 gap-6 inline-flex w-max min-w-full justify-start">
                                                {tabs.map(tab => (
                                                    <TabsTrigger
                                                        key={tab.id}
                                                        value={tab.id}
                                                        className="px-0 py-4 rounded-none border-b-2 bg-transparent text-sm font-medium text-[#475569]
                              data-[state=active]:border-[#0891B2] data-[state=active]:text-[#0891B2]
                              hover:text-[#0F172A] transition-colors gap-2"
                                                    >
                                                        <tab.icon className="h-4 w-4" />{tab.label}
                                                    </TabsTrigger>
                                                ))}
                                            </TabsList>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-6 flex-1 bg-[#F8FAFC]/30">

                                        {/* Overview Tab */}
                                        <TabsContent value="overview" className="m-0 space-y-6">

                                            {/* Convert CTA Banner (for convertible leads) */}
                                            {canConvert && (
                                                <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-5 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-green-800 text-base">Ready to convert?</h3>
                                                        <p className="text-sm text-green-600 mt-0.5">
                                                            Turn this lead into a client and unlock projects, invoicing, and more.
                                                        </p>
                                                    </div>
                                                    <Button
                                                        onClick={() => setShowConvertDialog(true)}
                                                        className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm"
                                                    >
                                                        <ArrowRightLeft className="h-4 w-4" /> Convert to Client
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Converted Banner */}
                                            {isConverted && (
                                                <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                        <div>
                                                            <h3 className="font-semibold text-green-800">Lead Converted</h3>
                                                            <p className="text-sm text-green-600">Converted on {formatDate(lead.convertedAt)}</p>
                                                        </div>
                                                    </div>
                                                    <Link to={`/client-list/${lead.convertedToClientId}`}>
                                                        <Button variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-100">
                                                            <ExternalLink className="h-4 w-4" /> View Client Record
                                                        </Button>
                                                    </Link>
                                                </div>
                                            )}

                                            {/* Key Metrics Cards */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <Card className="shadow-sm border-none">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                                                                <DollarSign className="h-5 w-5 text-[#0891B2]" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-[#475569]">Deal Value</p>
                                                                <p className="text-lg font-bold text-[#0F172A]">{formatCurrency(lead.potentialValue)}</p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                                <Card className="shadow-sm border-none">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-lg ${tempCfg.bg} flex items-center justify-center`}>
                                                                <TempIcon className={`h-5 w-5 ${tempCfg.color}`} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-[#475569]">Temperature</p>
                                                                <p className="text-lg font-bold text-[#0F172A]">{tempCfg.label}</p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                                <Card className="shadow-sm border-none">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                                                                <TrendingUp className="h-5 w-5 text-violet-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-[#475569]">Source</p>
                                                                <p className="text-lg font-bold text-[#0F172A]">{lead.leadSource?.name || "Direct"}</p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Lead Details Grid */}
                                            <Card className="shadow-sm border-none">
                                                <CardHeader className="pb-3 border-b">
                                                    <CardTitle className="text-sm font-semibold text-[#0F172A]">Lead Details</CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <InfoRow label="Full Name" value={fullName} />
                                                        <InfoRow label="Email" value={lead.email || "—"} />
                                                        <InfoRow label="Phone" value={lead.phone || "—"} />
                                                        <InfoRow label="Company" value={lead.companyName || "—"} />
                                                        <InfoRow label="Job Title" value={lead.jobTitle || "—"} />
                                                        <InfoRow label="Location" value={lead.location || "—"} />
                                                        <InfoRow label="Website" value={lead.website || "—"} />
                                                        <InfoRow label="Assigned To" value={ownerName} />
                                                        <InfoRow label="Created By" value={
                                                            lead.createdBy ? `${lead.createdBy.user.firstName} ${lead.createdBy.user.lastName}` : "—"
                                                        } />
                                                        <InfoRow label="Pipeline Stage" value={statusCfg.label} />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Property Information */}
                                            {(lead.propertyAddress || lead.city || lead.propertyType) && (
                                                <Card className="shadow-sm border-none">
                                                    <CardHeader className="pb-3 border-b">
                                                        <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                                            <Home className="h-4 w-4 text-[#0891B2]" /> Property Information
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <InfoRow label="Property Address" value={lead.propertyAddress || "—"} />
                                                            <InfoRow label="City" value={lead.city || "—"} />
                                                            <InfoRow label="State / Province" value={lead.state || "—"} />
                                                            <InfoRow label="Zip Code" value={lead.zipCode || "—"} />
                                                            <InfoRow label="Property Type" value={lead.propertyType || "—"} />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Service Request */}
                                            {(lead.serviceType || lead.urgencyLevel || lead.issueDescription) && (
                                                <Card className="shadow-sm border-none">
                                                    <CardHeader className="pb-3 border-b">
                                                        <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                                            <Wrench className="h-4 w-4 text-[#0891B2]" /> Service Request
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <InfoRow label="Service Type" value={lead.serviceType || "—"} />
                                                            <InfoRow label="Insurance Claim?" value={lead.isInsuranceClaim || "—"} />
                                                            <InfoRow label="Urgency" value={lead.urgencyLevel || "—"} />
                                                            <InfoRow label="Preferred Contact" value={lead.preferredContactMethod || "—"} />
                                                            <InfoRow label="Best Time to Contact" value={lead.bestTimeToContact || "—"} />
                                                        </div>
                                                        {lead.issueDescription && (
                                                            <div className="mt-4">
                                                                <span className="text-xs text-[#475569]">Issue Description</span>
                                                                <p className="text-sm text-[#0F172A] mt-1 p-3 bg-[#F8FAFC] rounded-md">{lead.issueDescription}</p>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Qualification Details */}
                                            {(lead.isHomeowner || lead.roofAge || lead.budgetRange || lead.isHOA) && (
                                                <Card className="shadow-sm border-none">
                                                    <CardHeader className="pb-3 border-b">
                                                        <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                                            <ClipboardList className="h-4 w-4 text-[#0891B2]" /> Qualification Details
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4 space-y-5">
                                                        {/* Verification */}
                                                        <div>
                                                            <p className="text-xs font-semibold text-[#475569] mb-2 uppercase tracking-wider">Verification</p>
                                                            <div className="flex flex-wrap gap-3">
                                                                {[
                                                                    { key: lead.confirmedName, label: "Name" },
                                                                    { key: lead.confirmedPhone, label: "Phone" },
                                                                    { key: lead.confirmedEmail, label: "Email" },
                                                                    { key: lead.confirmedAddress, label: "Address" },
                                                                ].map((item) => (
                                                                    <span key={item.label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${item.key ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-400 border border-gray-200"
                                                                        }`}>
                                                                        {item.key ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                                                        {item.label}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Ownership + Roof */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <InfoRow label="Homeowner?" value={lead.isHomeowner || "—"} />
                                                            <InfoRow label="Decision Maker?" value={lead.isDecisionMaker || "—"} />
                                                            <InfoRow label="Spouse / Co-Owner" value={lead.spouseCoOwnerName || "—"} />
                                                            <InfoRow label="Secondary Phone" value={lead.secondaryPhone || "—"} />
                                                            <InfoRow label="Roof Age" value={lead.roofAge || "—"} />
                                                            <InfoRow label="Roof Material" value={lead.currentRoofMaterial || "—"} />
                                                            <InfoRow label="Stories" value={lead.numberOfStories || "—"} />
                                                            <InfoRow label="Previous Roof Work" value={lead.previousRoofWork || "—"} />
                                                        </div>

                                                        {lead.knownDamageType && lead.knownDamageType.length > 0 && (
                                                            <div>
                                                                <span className="text-xs text-[#475569]">Damage Types</span>
                                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                                    {lead.knownDamageType.map((d: string) => (
                                                                        <span key={d} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                                            <AlertTriangle className="h-3 w-3 mr-1" />{d}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {lead.damageOccurrenceDate && (
                                                            <InfoRow label="Damage Occurred" value={lead.damageOccurrenceDate} />
                                                        )}

                                                        {/* Budget & Timeline */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <InfoRow label="Budget Range" value={lead.budgetRange || "—"} />
                                                            <InfoRow label="Timeline" value={lead.workTimeline || "—"} />
                                                            <InfoRow label="Financing Needed?" value={lead.financingNeeded || "—"} />
                                                            <InfoRow label="Getting Other Quotes?" value={lead.gettingOtherQuotes || "—"} />
                                                            {lead.numberOfOtherQuotes != null && (
                                                                <InfoRow label="# Other Quotes" value={String(lead.numberOfOtherQuotes)} />
                                                            )}
                                                            <InfoRow label="Top Priority" value={lead.topPriority || "—"} />
                                                        </div>

                                                        {/* HOA */}
                                                        {lead.isHOA && lead.isHOA !== "" && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <InfoRow label="HOA Community?" value={lead.isHOA} />
                                                                {lead.hoaRestrictions && (
                                                                    <InfoRow label="HOA Restrictions" value={lead.hoaRestrictions} />
                                                                )}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Insurance Details */}
                                            {lead.isInsuranceClaim === "Yes" && (
                                                <Card className="shadow-sm border-none">
                                                    <CardHeader className="pb-3 border-b">
                                                        <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                                            <Shield className="h-4 w-4 text-[#0891B2]" /> Insurance Details
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <InfoRow label="Insurance Company" value={lead.insuranceCompanyName || "—"} />
                                                            <InfoRow label="Claim Filed?" value={lead.hasClaimBeenFiled || "—"} />
                                                            <InfoRow label="Claim Number" value={lead.claimNumber || "—"} />
                                                            <InfoRow label="Adjuster Assigned?" value={lead.adjusterAssigned || "—"} />
                                                            {lead.adjusterAssigned === "Yes" && (
                                                                <>
                                                                    <InfoRow label="Adjuster Name" value={lead.adjusterName || "—"} />
                                                                    <InfoRow label="Adjuster Phone" value={lead.adjusterPhone || "—"} />
                                                                    <InfoRow label="Adjuster Email" value={lead.adjusterEmail || "—"} />
                                                                </>
                                                            )}
                                                            <InfoRow label="Adjuster Meeting" value={lead.adjusterMeetingDate ? formatDate(lead.adjusterMeetingDate) : "—"} />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Sales Assessment */}
                                            {(lead.leadScore || lead.nextStep || lead.qualificationCallNotes) && (
                                                <Card className="shadow-sm border-none">
                                                    <CardHeader className="pb-3 border-b">
                                                        <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                                            <HardHat className="h-4 w-4 text-[#0891B2]" /> Sales Assessment
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {lead.leadScore != null && <InfoRow label="Lead Score" value={`${lead.leadScore}/10`} />}
                                                            <InfoRow label="Next Step" value={lead.nextStep || "—"} />
                                                            <InfoRow label="Follow-Up Date" value={lead.followUpDateTime ? formatDate(lead.followUpDateTime) : "—"} />
                                                            <InfoRow label="Inspection Date" value={lead.inspectionAppointmentDate ? formatDate(lead.inspectionAppointmentDate) : "—"} />
                                                            {lead.disqualifiedReason && (
                                                                <InfoRow label="Disqualified Reason" value={lead.disqualifiedReason} />
                                                            )}
                                                        </div>
                                                        {lead.qualificationCallNotes && (
                                                            <div className="mt-4">
                                                                <span className="text-xs text-[#475569]">Qualification Notes</span>
                                                                <p className="text-sm text-[#0F172A] mt-1 p-3 bg-[#F8FAFC] rounded-md whitespace-pre-wrap">{lead.qualificationCallNotes}</p>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </TabsContent>

                                        {/* Insurance Claims Tab */}
                                        <TabsContent value="insurance" className="m-0 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-base font-semibold text-[#0F172A]">Insurance Claims</h3>
                                                <Button
                                                    size="sm"
                                                    className="bg-[#0891B2] hover:bg-[#0891B2]/80 text-white gap-2"
                                                    onClick={() => { setEditingClaim(null); setShowClaimDialog(true); }}
                                                >
                                                    <Plus className="h-4 w-4" /> New Claim
                                                </Button>
                                            </div>
                                            {claimsLoading ? (
                                                <div className="flex items-center justify-center py-10">
                                                    <Loader2 className="animate-spin text-[#0891B2]" size={24} />
                                                </div>
                                            ) : insuranceClaims.length === 0 ? (
                                                <div className="text-center py-16">
                                                    <Shield className="h-12 w-12 text-[#CBD5E1] mx-auto mb-3" />
                                                    <p className="text-[#94A3B8] text-sm">No insurance claims yet.</p>
                                                    <p className="text-[#94A3B8] text-xs mt-1">Click "New Claim" to add one.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {insuranceClaims.map((claim: any) => (
                                                        <Card key={claim.id} className="border shadow-sm hover:shadow-md transition-shadow">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            {claim.claimStatus && (
                                                                                <Badge className={`text-xs ${claim.claimStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                                                                                    claim.claimStatus === 'Open' ? 'bg-blue-100 text-blue-700' :
                                                                                        claim.claimStatus === 'Denied' ? 'bg-red-100 text-red-700' :
                                                                                            claim.claimStatus === 'In Review' ? 'bg-yellow-100 text-yellow-700' :
                                                                                                'bg-gray-100 text-gray-700'
                                                                                    }`}>
                                                                                    {claim.claimStatus}
                                                                                </Badge>
                                                                            )}
                                                                            {claim.supplementNeeded && (
                                                                                <Badge variant="outline" className="text-xs text-orange-600">
                                                                                    Supplement Needed
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                                                            <div>
                                                                                <span className="text-xs text-[#475569]">Claim #</span>
                                                                                <p className="font-medium">{claim.claimNumber || '—'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-xs text-[#475569]">ACV Estimate</span>
                                                                                <p className="font-medium">{claim.insuranceEstimateACV ? `$${Number(claim.insuranceEstimateACV).toLocaleString()}` : '—'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-xs text-[#475569]">Full RCV</span>
                                                                                <p className="font-medium">{claim.fullRCVAmount ? `$${Number(claim.fullRCVAmount).toLocaleString()}` : '—'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-xs text-[#475569]">Deductible</span>
                                                                                <p className="font-medium">{claim.deductibleAmount ? `$${Number(claim.deductibleAmount).toLocaleString()}` : '—'}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-1 ml-3">
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8"
                                                                            onClick={() => { setEditingClaim(claim); setShowClaimDialog(true); }}>
                                                                            <Pencil className="h-4 w-4 text-[#475569]" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8"
                                                                            onClick={() => handleDeleteClaim(claim.id)}>
                                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* Notes Tab */}
                                        <TabsContent value="notes" className="m-0 space-y-6">
                                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                                                <label className="text-sm font-medium text-[#0F172A] mb-2 block">Add a new note</label>
                                                <Textarea
                                                    placeholder="Type your note here..."
                                                    className="resize-none min-h-[80px]"
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                />
                                                <div className="flex justify-end mt-3">
                                                    <Button size="sm" className="bg-[#0891B2] hover:bg-[#0891B2]/80 text-white" onClick={handleAddNote}>
                                                        Save Note
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {notes.length === 0 ? (
                                                    <div className="text-center py-10 text-[#94A3B8]">No notes yet.</div>
                                                ) : notes.map(note => (
                                                    <div key={note.id} className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-100">
                                                        <p className="text-[#0F172A] text-sm">{note.content}</p>
                                                        <div className="mt-2 text-xs text-[#94A3B8]">{note.author} · {note.date}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </TabsContent>

                                        {/* Inspections Tab */}
                                        <TabsContent value="inspections" className="m-0 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-base font-semibold text-[#0F172A]">Inspections</h3>
                                                <Button
                                                    size="sm"
                                                    className="bg-[#0891B2] hover:bg-[#0891B2]/80 text-white gap-2"
                                                    onClick={() => { setEditingInspection(null); setShowInspectionDialog(true); }}
                                                >
                                                    <Plus className="h-4 w-4" /> New Inspection
                                                </Button>
                                            </div>
                                            {inspectionsLoading ? (
                                                <div className="flex items-center justify-center py-10">
                                                    <Loader2 className="animate-spin text-[#0891B2]" size={24} />
                                                </div>
                                            ) : inspections.length === 0 ? (
                                                <div className="text-center py-16">
                                                    <ClipboardList className="h-12 w-12 text-[#CBD5E1] mx-auto mb-3" />
                                                    <p className="text-[#94A3B8] text-sm">No inspections yet.</p>
                                                    <p className="text-[#94A3B8] text-xs mt-1">Click "New Inspection" to add one.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {inspections.map((insp: any) => (
                                                        <Card key={insp.id} className="border shadow-sm hover:shadow-md transition-shadow">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {insp.inspectionType || "General"}
                                                                            </Badge>
                                                                            {insp.estimateStatus && (
                                                                                <Badge className={`text-xs ${insp.estimateStatus === 'Accepted' ? 'bg-green-100 text-green-700' :
                                                                                    insp.estimateStatus === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                                                                        insp.estimateStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                                                            'bg-gray-100 text-gray-700'
                                                                                    }`}>
                                                                                    {insp.estimateStatus}
                                                                                </Badge>
                                                                            )}
                                                                            {insp.overallCondition && (
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    {insp.overallCondition}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                                                            <div>
                                                                                <span className="text-xs text-[#475569]">Date</span>
                                                                                <p className="font-medium">{insp.inspectionDate ? formatDate(insp.inspectionDate) : '—'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-xs text-[#475569]">Inspector</span>
                                                                                <p className="font-medium">{insp.inspectorName || '—'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-xs text-[#475569]">Total Estimate</span>
                                                                                <p className="font-medium">{insp.totalEstimate ? `$${Number(insp.totalEstimate).toLocaleString()}` : '—'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-xs text-[#475569]">Roof Style</span>
                                                                                <p className="font-medium">{insp.roofStyle || '—'}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-1 ml-3">
                                                                        <Button
                                                                            variant="ghost" size="icon" className="h-8 w-8"
                                                                            onClick={() => { setEditingInspection(insp); setShowInspectionDialog(true); }}
                                                                        >
                                                                            <Pencil className="h-4 w-4 text-[#475569]" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost" size="icon" className="h-8 w-8"
                                                                            onClick={() => handleDeleteInspection(insp.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* Timeline Tab */}
                                        <TabsContent value="timeline" className="m-0 px-2">
                                            <ActivityTimeline entityType="Lead" entityId={id!} />
                                        </TabsContent>

                                    </CardContent>
                                </Tabs>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            {/* Convert Dialog */}
            {showConvertDialog && lead && (
                <ConvertLeadDialog
                    open={showConvertDialog}
                    onClose={() => setShowConvertDialog(false)}
                    lead={lead}
                    onSuccess={handleConvertSuccess}
                />
            )}

            {/* Inspection Form Dialog */}
            {showInspectionDialog && (
                <InspectionFormDialog
                    open={showInspectionDialog}
                    onClose={() => { setShowInspectionDialog(false); setEditingInspection(null); }}
                    onSave={handleSaveInspection}
                    inspection={editingInspection}
                />
            )}

            {/* Insurance Claim Form Dialog */}
            {showClaimDialog && (
                <InsuranceClaimFormDialog
                    open={showClaimDialog}
                    onClose={() => { setShowClaimDialog(false); setEditingClaim(null); }}
                    onSave={handleSaveClaim}
                    claim={editingClaim}
                />
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
