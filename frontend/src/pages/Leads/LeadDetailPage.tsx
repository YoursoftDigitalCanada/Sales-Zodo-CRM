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
import { getLeadById, convertLead } from "@/features/leads";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import {
    ArrowLeft, Loader2, Mail, Phone, MapPin, Building2, Globe, Briefcase,
    Tag, Calendar, Clock, DollarSign, TrendingUp, Thermometer, User, Users,
    FileText, MessageSquare, CheckSquare, Activity, MoreHorizontal,
    UserPlus, ArrowRightLeft, Star, Pencil, Send, ExternalLink, Flame,
    Snowflake, Zap, X, CheckCircle2
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
