import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
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
import { getLeadById, updateLead, convertLead } from "@/features/leads";
import { getFiles, getDownloadUrl } from "@/features/files/services/files-service";
import { getProjects } from "@/features/projects/services/projects-service";
import { getTasks } from "@/features/tasks/services/tasks-service";
import { getQuotes } from "@/features/quotes/services/quotes-service";
import { getEmails } from "@/features/emails/services/emails-service";
import { ComposeEmailSheet } from "@/features/emails/components/ComposeEmailSheet";
import { WhatsAppActionButton } from "@/features/whatsapp/components/WhatsAppActionButton";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
    readLeadDetailNavigationState,
    saveLeadDetailNavigationState,
    type LeadDetailNavigationState,
} from "@/features/leads/lead-detail-navigation";
import {
    ArrowLeft, Loader2, Mail, Phone, MapPin, Building2, Globe, Briefcase, Target,
    Tag, Calendar, Clock, DollarSign, TrendingUp, Thermometer, User, Users,
    FileText, MessageSquare, CheckSquare, Activity, MoreHorizontal,
    UserPlus, ArrowRightLeft, Star, Pencil, Send, ExternalLink, Flame, Search, Plus, Trash2, Eye,
    Snowflake, Zap, X, CheckCircle2, Home, Wrench, Shield, HardHat,
    ClipboardList, Banknote, AlertTriangle, FolderOpen, Download, Sparkles
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
    industry?: string | null;
    companySize?: string | null;
    useCase?: string | null;
    status: string;
    temperature: string;
    potentialValue: number | string | null;
    notes: string | null;
    convertedAt: string | null;
    convertedToClientId: string | null;
    convertedToContactId?: string | null;
    convertedToDealId?: string | null;
    convertedToClient?: { id: string; clientName: string; primaryEmail?: string | null } | null;
    convertedToContact?: { id: string; contactName: string; email?: string | null } | null;
    convertedToDeal?: { id: string; name: string; dealStatus?: string | null; dealValue?: number | string | null } | null;
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
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
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
    isDecisionMaker?: string | null;
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
    qualificationCallNotes?: string | null;
}

interface NoteEntry {
    id: number;
    content: string;
    date: string;
    author: string;
}

const STRUCTURED_NOTE_REGEX = /^\[(.+?) \| (.+?)\]\n([\s\S]+)$/;

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

const formatDateTime = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
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

const dedupeById = <T extends { id: string }>(items: T[]) => {
    const seen = new Map<string, T>();
    for (const item of items) {
        seen.set(item.id, item);
    }
    return Array.from(seen.values());
};

const sortByNewest = <T extends Record<string, any>>(items: T[], ...fields: string[]) =>
    [...items].sort((a, b) => {
        const aTime = fields.map((field) => a?.[field]).find(Boolean);
        const bTime = fields.map((field) => b?.[field]).find(Boolean);
        return new Date(bTime || 0).getTime() - new Date(aTime || 0).getTime();
    });

const getStoredUserName = () => {
    if (typeof window === "undefined") return "ZODO Team";
    try {
        const storedUser = JSON.parse(window.localStorage.getItem("user") || "{}");
        const firstName = String(storedUser?.firstName || storedUser?.user?.firstName || "").trim();
        const lastName = String(storedUser?.lastName || storedUser?.user?.lastName || "").trim();
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName || "ZODO Team";
    } catch {
        return "ZODO Team";
    }
};

const parseLeadNotes = (
    rawNotes: string | null | undefined,
    fallbackAuthor: string,
    fallbackDate: string,
): NoteEntry[] => {
    const normalizedNotes = String(rawNotes || "").trim();
    if (!normalizedNotes) return [];

    const blocks = normalizedNotes.split(/\n{2,}(?=\[[^\n]+\s\|\s[^\n]+\]\n)/);

    return blocks
        .map((block, index) => {
            const trimmedBlock = block.trim();
            const match = trimmedBlock.match(STRUCTURED_NOTE_REGEX);

            if (match) {
                return {
                    id: index + 1,
                    date: match[1].trim(),
                    author: match[2].trim(),
                    content: match[3].trim(),
                };
            }

            return {
                id: index + 1,
                date: fallbackDate,
                author: fallbackAuthor,
                content: trimmedBlock,
            };
        })
        .filter((entry) => entry.content);
};

const serializeLeadNotes = (entries: NoteEntry[]) =>
    entries
        .map((entry) => `[${entry.date} | ${entry.author}]\n${entry.content.trim()}`)
        .join("\n\n");

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
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${active ? "bg-[#6637F4] text-white shadow-sm" : "bg-gray-100 text-gray-400"
                                }`}>
                                {i + 1}
                            </div>
                            {i < PIPELINE_STAGES.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1 ${active && i < idx ? "bg-[#6637F4]" : "bg-gray-200"}`} />
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
    onSuccess: (result: { clientId: string; dealId?: string }) => void;
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
                description: `${lead.firstName} ${lead.lastName} is now linked to an account, contact, and deal.`,
            });
            onSuccess(data);
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
                        <ArrowRightLeft className="h-5 w-5 text-[#6637F4]" />
                        Convert Lead to Deal
                    </DialogTitle>
                    <DialogDescription>
                        This will create an account, contact, and deal from <strong>{lead.firstName} {lead.lastName}</strong>
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
                                    ? "border-[#6637F4] bg-[#6637F4]/5 shadow-sm"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <User className={`h-6 w-6 mx-auto mb-2 ${clientType === "INDIVIDUAL" ? "text-[#6637F4]" : "text-gray-400"}`} />
                                <p className={`text-sm font-medium ${clientType === "INDIVIDUAL" ? "text-[#6637F4]" : "text-gray-600"}`}>Individual</p>
                                <p className="text-xs text-gray-400 mt-1">Person / Freelancer</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setClientType("COMPANY")}
                                className={`p-4 rounded-lg border-2 text-center transition-all ${clientType === "COMPANY"
                                    ? "border-[#6637F4] bg-[#6637F4]/5 shadow-sm"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <Building2 className={`h-6 w-6 mx-auto mb-2 ${clientType === "COMPANY" ? "text-[#6637F4]" : "text-gray-400"}`} />
                                <p className={`text-sm font-medium ${clientType === "COMPANY" ? "text-[#6637F4]" : "text-gray-600"}`}>Company</p>
                                <p className="text-xs text-gray-400 mt-1">Business / Organization</p>
                            </button>
                        </div>
                    </div>

                    {/* Create Contact Toggle */}
                    {clientType === "COMPANY" && (
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#F7F7FB] border">
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
                                <span>New <strong>{clientType === "COMPANY" ? "Company" : "Individual"}</strong> account</span>
                            </div>
                            {clientType === "COMPANY" && createContact && (
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span>Primary contact: <strong>{lead.firstName} {lead.lastName}</strong></span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>Sales deal linked to this lead</span>
                            </div>
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
                        {loading ? "Converting..." : "Convert to Deal"}
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
    const location = useLocation();
    const { toast } = useToast();
    const { isMobile } = useIsMobile();
    const [lead, setLead] = useState<LeadData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [showConvertDialog, setShowConvertDialog] = useState(false);
    const infoSectionRef = useRef<HTMLDivElement | null>(null);
    const notesSectionRef = useRef<HTMLDivElement | null>(null);
    const activitySectionRef = useRef<HTMLDivElement | null>(null);

    // Notes state
    const [notes, setNotes] = useState<NoteEntry[]>([]);
    const [newNote, setNewNote] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);

    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [relatedProjects, setRelatedProjects] = useState<any[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [relatedTasks, setRelatedTasks] = useState<any[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loadingQuotes, setLoadingQuotes] = useState(false);
    const [emails, setEmails] = useState<any[]>([]);
    const [loadingEmails, setLoadingEmails] = useState(false);
    const [showComposeEmail, setShowComposeEmail] = useState(false);

    const navigationState = (location.state as LeadDetailNavigationState | null) ?? null;
    const persistedNavigationState = id ? readLeadDetailNavigationState(id) : null;
    const effectiveNavigationState = navigationState?.from ? navigationState : persistedNavigationState;
    const sourcePath = typeof effectiveNavigationState?.from === "string" ? effectiveNavigationState.from : "";
    const backLabel = effectiveNavigationState?.fromLabel || (sourcePath.startsWith("/leads/pipeline") ? "Pipeline" : "Leads");

    useEffect(() => {
        if (id && navigationState?.from) {
            saveLeadDetailNavigationState(id, navigationState);
        }
    }, [id, navigationState]);

    const handleBackNavigation = useCallback(() => {
        const currentPath = `${location.pathname}${location.search}${location.hash}`;

        if (sourcePath && sourcePath !== currentPath) {
            navigate(sourcePath);
            return;
        }

        if (typeof window !== "undefined" && window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate("/leads");
    }, [location.hash, location.pathname, location.search, navigate, sourcePath]);

    const applyLeadState = useCallback((data: LeadData) => {
        setLead(data);

        const fallbackAuthor = data.createdBy
            ? `${data.createdBy.user.firstName} ${data.createdBy.user.lastName}`.trim() || "ZODO Team"
            : "ZODO Team";
        const fallbackDate = formatDateTime(data.updatedAt || data.createdAt);

        setNotes(parseLeadNotes(data.notes, fallbackAuthor, fallbackDate));
    }, []);

    const fetchLead = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getLeadById(id!);
            applyLeadState(data as LeadData);
        } catch (err) {
            toast({ title: "Error", description: "Failed to load lead details.", variant: "destructive" });
            console.error("Failed to fetch lead:", err);
        } finally {
            setIsLoading(false);
        }
    }, [applyLeadState, id, toast]);

    useEffect(() => { fetchLead(); }, [fetchLead]);

    const fetchDocuments = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingDocs(true);
            const data = await getFiles({ leadId: id, limit: 100 });
            setDocuments(Array.isArray(data) ? data : []);
        } catch {
            console.error("Failed to fetch lead documents");
        } finally {
            setLoadingDocs(false);
        }
    }, [id]);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    const fetchProjects = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingProjects(true);
            const data = await getProjects({ leadId: id, limit: 100 });
            setRelatedProjects(sortByNewest(Array.isArray(data) ? data : [], "updatedAt", "createdAt"));
        } catch {
            console.error("Failed to fetch lead projects");
        } finally {
            setLoadingProjects(false);
        }
    }, [id]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const fetchTasks = useCallback(async () => {
        if (!relatedProjects.length) {
            setRelatedTasks([]);
            setLoadingTasks(false);
            return;
        }

        try {
            setLoadingTasks(true);
            const taskLists = await Promise.all(
                relatedProjects
                    .map((project) => project?.id)
                    .filter(Boolean)
                    .map((projectId) => getTasks({ projectId, limit: 100 }) as Promise<any[]>),
            );
            const merged = dedupeById(taskLists.flat());
            setRelatedTasks(
                [...merged].sort((a, b) => {
                    const aTime = a?.dueDate || a?.updatedAt || a?.createdAt;
                    const bTime = b?.dueDate || b?.updatedAt || b?.createdAt;
                    return new Date(aTime || 0).getTime() - new Date(bTime || 0).getTime();
                }),
            );
        } catch {
            console.error("Failed to fetch lead tasks");
        } finally {
            setLoadingTasks(false);
        }
    }, [relatedProjects]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const fetchQuotes = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingQuotes(true);
            const data = await getQuotes({ leadId: id, limit: 100 });
            setQuotes(sortByNewest(Array.isArray(data?.data) ? data.data : [], "updatedAt", "createdAt"));
        } catch {
            console.error("Failed to fetch lead quotes");
        } finally {
            setLoadingQuotes(false);
        }
    }, [id]);

    useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

    const fetchEmails = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingEmails(true);
            const data = await getEmails({ leadId: id, limit: 50 });
            setEmails(sortByNewest(Array.isArray(data) ? data : [], "sentAt", "receivedAt", "createdAt"));
        } catch {
            console.error("Failed to fetch lead emails");
        } finally {
            setLoadingEmails(false);
        }
    }, [id]);

    useEffect(() => { fetchEmails(); }, [fetchEmails]);

    const scrollToSection = useCallback((section: "overview" | "notes" | "activity") => {
        setActiveTab(section);
        const targetMap = {
            overview: infoSectionRef,
            notes: notesSectionRef,
            activity: activitySectionRef,
        } as const;
        targetMap[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    const handleAddNote = async () => {
        if (!id || !lead || !newNote.trim() || isSavingNote) return;

        const noteEntry: NoteEntry = {
            id: Date.now(),
            content: newNote.trim(),
            date: formatDateTime(new Date()),
            author: getStoredUserName(),
        };
        const nextNotes = [noteEntry, ...notes];

        try {
            setIsSavingNote(true);
            const updatedLead = await updateLead(id, {
                notes: serializeLeadNotes(nextNotes),
            });
            applyLeadState(updatedLead as LeadData);
            setNewNote("");
            toast({ title: "Note saved" });
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to save note.",
                variant: "destructive",
            });
            console.error("Failed to save lead note:", err);
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleConvertSuccess = (result: { clientId: string; dealId?: string }) => {
        setShowConvertDialog(false);
        navigate(result.dealId ? `/deals?dealId=${result.dealId}` : `/client-list/${result.clientId}`);
    };

    const handleQualifyLead = async () => {
        if (!id || !lead) return;
        try {
            const updatedLead = await updateLead(id, { status: "QUALIFIED" } as any);
            applyLeadState(updatedLead as LeadData);
            await fetchProjects();
            toast({ title: "Lead qualified", description: "A qualification deal and schedule-demo task will be prepared automatically." });
        } catch (error: any) {
            toast({
                title: "Could not qualify lead",
                description: error?.response?.data?.message || "Please try again.",
                variant: "destructive",
            });
        }
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
    const creatorName = lead.createdBy
        ? `${lead.createdBy.user.firstName} ${lead.createdBy.user.lastName}`.trim() || "ZODO Team"
        : "ZODO Team";
    const leadAge = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);
    const companyAddress = [lead.location, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ");
    const openRelatedTasks = relatedTasks.filter((task) => !["DONE", "COMPLETED"].includes(String(task.status || "").toUpperCase())).length;

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#F9FAFB] pb-24 md:pb-0">
            <style>{`
                @keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
            `}</style>

            {/* ═══════════ STICKY HEADER ═══════════ */}
            <header className="crm-module-header sticky top-0 z-30 bg-white border-b border-[#E5E7EB] shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
                <div className="px-6 pt-3 pb-1">
                    <Breadcrumb><BreadcrumbList>
                        <BreadcrumbItem><BreadcrumbLink href="/dashboard" className="text-xs">Dashboard</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                href={sourcePath || "/leads"}
                                className="text-xs"
                                onClick={(event) => {
                                    event.preventDefault();
                                    handleBackNavigation();
                                }}
                            >
                                {backLabel}
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem><BreadcrumbPage className="text-xs font-semibold text-[#14B8A6]">{fullName}</BreadcrumbPage></BreadcrumbItem>
                    </BreadcrumbList></Breadcrumb>
                </div>
                <div className="px-6 pb-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={handleBackNavigation} className="p-1.5 rounded-lg hover:bg-[#F9FAFB] text-[#6B7280] transition-colors flex-shrink-0"><ArrowLeft size={18} /></button>
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
                                Created by <span className="font-medium text-[#6B7280]">{creatorName}</span> · {formatDate(lead.createdAt)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/ai/sales-assistant?leadId=${lead.id}`)} className="hidden lg:inline-flex gap-1.5 text-xs"><Sparkles size={14} />Ask AI</Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/ai/lead-scoring?leadId=${lead.id}`)} className="hidden lg:inline-flex gap-1.5 text-xs"><Target size={14} />Score Lead</Button>
                        {lead.status !== "QUALIFIED" && lead.status !== "WON" && lead.status !== "LOST" && <Button size="sm" onClick={handleQualifyLead} className="hidden md:inline-flex bg-[#0891B2] text-white hover:bg-[#0E7490] gap-1.5 text-xs"><TrendingUp size={14} />Qualify Lead</Button>}
                        <Button variant="outline" size="sm" onClick={() => navigate(`/tasks?leadId=${lead.id}`)} className="hidden lg:inline-flex gap-1.5 text-xs"><CheckSquare size={14} />Create Task</Button>
                        <Button variant="outline" size="sm" onClick={() => lead.convertedToDealId ? navigate(`/deals?dealId=${lead.convertedToDealId}`) : handleQualifyLead()} className="hidden lg:inline-flex gap-1.5 text-xs"><Calendar size={14} />Schedule Demo</Button>
                        {lead.phone && <a href={`tel:${lead.phone}`} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] transition-all"><Phone size={14} className="text-[#14B8A6]" />Call</a>}
                        {lead.email && <button type="button" onClick={() => setShowComposeEmail(true)} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] transition-all"><Mail size={14} className="text-[#14B8A6]" />Email</button>}
                        <WhatsAppActionButton
                            contactName={fullName}
                            phoneNumber={lead.phone}
                            className="hidden sm:inline-flex h-auto px-3 py-2"
                        />
                        {isConverted && lead.convertedToDealId && <Link to={`/deals?dealId=${lead.convertedToDealId}`}><Button variant="outline" size="sm" className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50 text-xs"><ExternalLink size={14} />View Deal</Button></Link>}
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
                        <div><h3 className="font-semibold text-green-800 text-sm">Ready to convert?</h3><p className="text-xs text-green-600 mt-0.5">Turn this lead into an account, contact, and sales deal.</p></div>
                        <Button size="sm" onClick={() => setShowConvertDialog(true)} className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"><ArrowRightLeft size={14} />Convert to Deal</Button>
                    </div>
                )}
                {isConverted && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between" style={{ animation: 'fadeSlideUp 0.35s ease both' }}>
                        <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><h3 className="font-semibold text-green-800 text-sm">Lead Converted</h3><p className="text-xs text-green-600">Account, contact, and deal linked on {formatDate(lead.convertedAt)}</p></div></div>
                        <div className="flex items-center gap-2">
                            {lead.convertedToClientId && <Link to={`/client-list/${lead.convertedToClientId}`}><Button variant="outline" size="sm" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100 text-xs"><ExternalLink size={14} />Account</Button></Link>}
                            {lead.convertedToDealId && <Link to={`/deals?dealId=${lead.convertedToDealId}`}><Button variant="outline" size="sm" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100 text-xs"><ExternalLink size={14} />Deal</Button></Link>}
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-[#B2F5EA] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]" style={{ animation: 'fadeSlideUp 0.35s ease both' }}>
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-[#0F172A]">Automation Links</h3>
                            <p className="text-xs text-[#64748B]">New leads prepare the account, primary contact, and first follow-up. A deal is created only after qualification.</p>
                        </div>
                        <span className="rounded-full bg-[#F0FDFA] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#0F766E]">Sales flow</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                            <p className="text-[11px] font-semibold uppercase text-[#64748B]">Organization</p>
                            <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]">{lead.convertedToClient?.clientName || lead.companyName || "Preparing account"}</p>
                            {lead.convertedToClientId ? <Link to={`/client-list/${lead.convertedToClientId}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0891B2]"><ExternalLink size={12} />Open account</Link> : <p className="mt-2 text-xs text-[#64748B]">Created/reused when lead is saved.</p>}
                        </div>
                        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                            <p className="text-[11px] font-semibold uppercase text-[#64748B]">Primary Contact</p>
                            <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]">{lead.convertedToContact?.contactName || fullName || "Preparing contact"}</p>
                            <p className="mt-2 text-xs text-[#64748B]">{lead.convertedToContact?.email || lead.email || "Linked to the organization"}</p>
                        </div>
                        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                            <p className="text-[11px] font-semibold uppercase text-[#64748B]">Deal</p>
                            <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]">{lead.convertedToDeal?.name || (lead.status === "QUALIFIED" ? "Qualification deal ready" : "Not created yet")}</p>
                            {lead.convertedToDealId ? <Link to={`/deals?dealId=${lead.convertedToDealId}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0891B2]"><ExternalLink size={12} />Open deal</Link> : <p className="mt-2 text-xs text-[#64748B]">Created only when status becomes Qualified.</p>}
                        </div>
                    </div>
                </div>

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

                {isMobile && (
                    <div className="sticky top-[78px] z-20 -mx-1 overflow-x-auto rounded-2xl bg-white/95 px-1 py-2 shadow-sm backdrop-blur">
                        <div className="flex gap-2 px-1">
                            {[
                                { id: "overview", label: "Info" },
                                { id: "notes", label: "Notes" },
                                { id: "activity", label: "Activity" },
                            ].map((tab) => (
                                <Button
                                    key={tab.id}
                                    type="button"
                                    variant={activeTab === tab.id ? "default" : "outline"}
                                    size="sm"
                                    className={activeTab === tab.id ? "bg-[#14B8A6] hover:bg-[#0D9488]" : ""}
                                    onClick={() => scrollToSection(tab.id as "overview" | "notes" | "activity")}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════ CARD GRID ═══════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* CARD 1: Contact & Lead Info */}
                    <div ref={infoSectionRef} className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 200ms both' }}>
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
                                { l: "Created By", v: creatorName },
                            ].filter(r => r.v).map((r, i) => (
                                <div key={i} className="py-1"><p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium">{r.l}</p>
                                    {r.href ? <a href={r.href} className="text-[#14B8A6] hover:underline font-medium text-sm" target={r.href.startsWith('http') ? '_blank' : undefined} rel={r.href.startsWith('http') ? 'noreferrer' : undefined}>{r.v}</a> : <p className="font-medium text-[#111827]">{r.v}</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CARD 2: Company & Sales Need */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 280ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center"><Building2 size={14} className="text-[#D97706]" /></div><h3 className="text-sm font-semibold text-[#111827]">Company & Sales Need</h3></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {[
                                { l: "Company Address", v: companyAddress }, { l: "Industry", v: lead.industry },
                                { l: "Company Size", v: lead.companySize }, { l: "Sales Need", v: lead.productInterest },
                                { l: "Buying Urgency", v: lead.urgencyLevel }, { l: "Current Solution", v: lead.currentSolution },
                                { l: "Users / Seats", v: lead.numberOfUsers != null ? String(lead.numberOfUsers) : undefined },
                                { l: "Preferred Contact", v: lead.preferredContactMethod },
                            ].filter(r => r.v).map((r, i) => (
                                <div key={i} className="py-1"><p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium">{r.l}</p><p className="font-medium text-[#111827]">{r.v}</p></div>
                            ))}
                        </div>
                        {lead.useCase && <div className="mt-3 pt-3 border-t border-[#F1F5F9]"><p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-1">Use Case</p><p className="text-sm text-[#111827] bg-[#F9FAFB] p-3 rounded-lg">{lead.useCase}</p></div>}
                        {lead.issueDescription && <div className="mt-3 pt-3 border-t border-[#F1F5F9]"><p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-1">Pain Points</p><p className="text-sm text-[#111827] bg-[#F9FAFB] p-3 rounded-lg">{lead.issueDescription}</p></div>}
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
                                { l: "Decision Maker?", v: lead.isDecisionMaker }, { l: "Subscription Approved?", v: lead.financingNeeded },
                                { l: "Evaluating Vendors?", v: lead.gettingOtherQuotes }, { l: "# Vendors", v: lead.numberOfOtherQuotes != null ? String(lead.numberOfOtherQuotes) : undefined },
                                { l: "Top Priority", v: lead.topPriority }, { l: "Procurement Review?", v: lead.isHOA },
                                { l: "Procurement Notes", v: lead.hoaRestrictions },
                            ].filter(r => r.v).map((r, i, arr) => (
                                <div key={i} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-dashed border-[#F1F5F9]' : ''}`}>
                                    <span className="text-xs text-[#6B7280]">{r.l}</span><span className="text-sm font-medium text-[#374151]">{r.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CARD 4: Sales Assessment */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 440ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#FCE7F3] flex items-center justify-center"><Shield size={14} className="text-[#DB2777]" /></div><h3 className="text-sm font-semibold text-[#111827]">Sales Assessment</h3></div>
                        </div>
                        <div className="space-y-0">
                            {[
                                { l: "Lead Score", v: lead.leadScore != null ? `${lead.leadScore}/10` : undefined },
                                { l: "Next Step", v: lead.nextStep }, { l: "Follow-Up", v: lead.followUpDateTime ? formatDate(lead.followUpDateTime) : undefined },
                            ].filter(r => r.v).map((r, i, arr) => (
                                <div key={i} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-dashed border-[#F1F5F9]' : ''}`}>
                                    <span className="text-xs text-[#6B7280]">{r.l}</span><span className="text-sm font-medium text-[#374151]">{r.v}</span>
                                </div>
                            ))}
                        </div>
                        {lead.disqualifiedReason && <div className="mt-3 p-2 rounded-lg bg-[#FEE2E2] text-xs text-[#FF2E2D] font-medium">⚠️ Disqualified: {lead.disqualifiedReason}</div>}
                        {lead.qualificationCallNotes && <div className="mt-3 pt-3 border-t border-[#F1F5F9]"><p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-1">Qualification Notes</p><p className="text-sm text-[#111827] bg-[#F9FAFB] p-3 rounded-lg whitespace-pre-wrap">{lead.qualificationCallNotes}</p></div>}
                    </div>

                    {/* CARD 5: Related Deals */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 520ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#CCFBF1] flex items-center justify-center"><DollarSign size={14} className="text-[#0D9488]" /></div><h3 className="text-sm font-semibold text-[#111827]">Related Deals</h3><span className="text-xs bg-[#F1F5F9] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">{relatedProjects.length}</span></div>
                            <button onClick={() => navigate('/deals')} className="text-xs font-medium text-[#14B8A6] hover:text-[#0D9488]">View All →</button>
                        </div>
                        {loadingProjects ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div> :
                            relatedProjects.length === 0 ? <div className="text-center py-8"><DollarSign size={24} className="text-[#D1D5DB] mx-auto mb-2" /><p className="text-xs text-[#9CA3AF]">No deals linked to this lead yet</p></div> :
                                <div className="space-y-2">{relatedProjects.slice(0, 4).map((project: any) => {
                                    const status = String(project.status || 'PENDING').toUpperCase();
                                    const statusColor = status === 'COMPLETED' ? 'bg-[#DCFCE7] text-[#166534]' : status === 'ON_HOLD' ? 'bg-[#FEF3C7] text-[#92400E]' : status === 'CANCELLED' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#DBEAFE] text-[#1E40AF]';
                                    const value = Number(project.contractValue || project.budget || 0);
                                    return (
                                        <div key={project.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer" onClick={() => navigate(`/deals?dealId=${project.id}`)}>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-[#111827] truncate">{project.name}</p>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-[#6B7280]">
                                                    {project.projectNumber && <span>{project.projectNumber}</span>}
                                                    {value > 0 && <span>{formatCurrency(value)}</span>}
                                                    {project._count?.projectTasks ? <span>{project._count.projectTasks} tasks</span> : null}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>{status.replace(/_/g, ' ')}</span>
                                        </div>
                                    );
                                })}</div>}
                    </div>

                    {/* CARD 6: Related Tasks */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 600ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#FFF7ED] flex items-center justify-center"><CheckSquare size={14} className="text-[#EA580C]" /></div><h3 className="text-sm font-semibold text-[#111827]">Deal Tasks</h3><span className="text-xs bg-[#F1F5F9] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">{relatedTasks.length}</span></div>
                            <button onClick={() => navigate('/tasks')} className="text-xs font-medium text-[#14B8A6] hover:text-[#0D9488]">{openRelatedTasks} open</button>
                        </div>
                        {loadingTasks ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div> :
                            relatedTasks.length === 0 ? <div className="text-center py-8"><CheckSquare size={24} className="text-[#D1D5DB] mx-auto mb-2" /><p className="text-xs text-[#9CA3AF]">No deal tasks linked to this lead yet</p></div> :
                                <div className="space-y-2">{relatedTasks.slice(0, 4).map((task: any) => (
                                    <div key={task.id} className="py-2 px-2 rounded-lg hover:bg-[#F9FAFB] transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-[#111827] truncate">{task.title}</p>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${String(task.status || '').toUpperCase() === 'DONE' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#DBEAFE] text-[#1E40AF]'}`}>{String(task.status || 'TODO').replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-[#6B7280]">
                                            {task.project?.name && <span>{task.project.name}</span>}
                                            {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                                        </div>
                                    </div>
                                ))}</div>}
                    </div>

                    {/* CARD 7: Quotes */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 680ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#FEF9C3] flex items-center justify-center"><FileText size={14} className="text-[#CA8A04]" /></div><h3 className="text-sm font-semibold text-[#111827]">Quotes</h3><span className="text-xs bg-[#F1F5F9] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">{quotes.length}</span></div>
                            <button onClick={() => navigate('/quotes')} className="text-xs font-medium text-[#14B8A6] hover:text-[#0D9488]">View All →</button>
                        </div>
                        {loadingQuotes ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div> :
                            quotes.length === 0 ? <div className="text-center py-8"><FileText size={24} className="text-[#D1D5DB] mx-auto mb-2" /><p className="text-xs text-[#9CA3AF]">No quotes linked to this lead yet</p></div> :
                                <div className="space-y-2">{quotes.slice(0, 4).map((quote: any) => (
                                    <div key={quote.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer" onClick={() => navigate('/quotes')}>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-[#111827] truncate">{quote.quoteNumber}</p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-[#6B7280]">
                                                <span>{formatCurrency(quote.total)}</span>
                                                {quote.validUntil && <span>Valid until {formatDate(quote.validUntil)}</span>}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">{String(quote.status || 'DRAFT').replace(/_/g, ' ')}</span>
                                    </div>
                                ))}</div>}
                    </div>

                    {/* CARD 8: Emails */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 760ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center"><Mail size={14} className="text-[#2563EB]" /></div><h3 className="text-sm font-semibold text-[#111827]">Emails</h3><span className="text-xs bg-[#F1F5F9] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">{emails.length}</span></div>
                            <button onClick={() => navigate('/letterbox')} className="text-xs font-medium text-[#14B8A6] hover:text-[#0D9488]">Open Zodo Mail →</button>
                        </div>
                        {loadingEmails ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div> :
                            emails.length === 0 ? <div className="text-center py-8"><Mail size={24} className="text-[#D1D5DB] mx-auto mb-2" /><p className="text-xs text-[#9CA3AF]">No mailbox emails linked to this lead yet</p></div> :
                                <div className="space-y-2">{emails.slice(0, 4).map((email: any) => (
                                    <div key={email.id} className="py-2 px-2 rounded-lg hover:bg-[#F9FAFB] transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-[#111827] truncate">{email.subject || "(No subject)"}</p>
                                            {!email.isRead && <span className="w-2 h-2 rounded-full bg-[#14B8A6] flex-shrink-0" />}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-[#6B7280]">
                                            <span className="truncate">{email.fromAddress || email.fromName || "Unknown sender"}</span>
                                            <span>{timeAgo(email.sentAt || email.receivedAt || email.createdAt)}</span>
                                        </div>
                                    </div>
                                ))}</div>}
                    </div>

                    {/* CARD 11: Documents */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 1000ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center"><FolderOpen size={14} className="text-[#7C3AED]" /></div><h3 className="text-sm font-semibold text-[#111827]">Documents</h3><span className="text-xs bg-[#F1F5F9] text-[#6B7280] px-2 py-0.5 rounded-full font-medium">{documents.length}</span></div>
                        </div>
                        {loadingDocs ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#14B8A6]" size={20} /></div> :
                            documents.length === 0 ? <div className="text-center py-8"><FolderOpen size={24} className="text-[#D1D5DB] mx-auto mb-2" /><p className="text-xs text-[#9CA3AF]">No documents linked to this lead yet</p></div> :
                                <div className="space-y-2">{documents.slice(0, 4).map((doc: any) => {
                                    const ext = doc.extension || doc.name?.split('.').pop() || '';
                                    const sizeKb = doc.size ? (Number(doc.size) / 1024).toFixed(1) : '—';
                                    return (
                                        <div key={doc.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[#F9FAFB] transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                                                <FileText size={14} className="text-[#7C3AED]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#111827] truncate">{doc.originalName || doc.name}</p>
                                                <p className="text-[10px] text-[#9CA3AF]">{sizeKb} KB · {String(ext).toUpperCase()} · {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}</p>
                                            </div>
                                            <a href={getDownloadUrl(doc.id)} target="_blank" rel="noreferrer" className="text-[#14B8A6] hover:text-[#0D9488] p-1"><Download size={14} /></a>
                                        </div>
                                    );
                                })}</div>}
                    </div>

                    {/* CARD 12: Notes */}
                    <div ref={notesSectionRef} className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 1080ms both' }}>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#FEF9C3] flex items-center justify-center"><FileText size={14} className="text-[#CA8A04]" /></div><h3 className="text-sm font-semibold text-[#111827]">Notes</h3></div>
                        </div>
                        <div className="bg-[#F9FAFB] p-3 rounded-lg mb-3 border border-[#E5E7EB]">
                            <Textarea placeholder="Type your note here..." className="resize-none min-h-[60px] bg-white text-sm" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                            <div className="flex justify-end mt-2"><Button size="sm" className="bg-[#14B8A6] text-white hover:bg-[#0D9488] text-xs" onClick={handleAddNote} disabled={!newNote.trim() || isSavingNote}>{isSavingNote && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Save Note</Button></div>
                        </div>
                        {notes.length === 0 ? <p className="text-center text-xs text-[#9CA3AF] py-4">No notes yet</p> :
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">{notes.map(note => (
                                <div key={note.id} className="bg-[#FFFBEB] p-3 rounded-lg border border-[#FDE68A]/50"><p className="text-sm text-[#111827] whitespace-pre-wrap">{note.content}</p><p className="text-[10px] text-[#9CA3AF] mt-1">{note.author} · {note.date}</p></div>
                            ))}</div>}
                    </div>

                    {/* CARD 13: Activity Timeline */}
                    <div ref={activitySectionRef} className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all" style={{ animation: 'fadeSlideUp 0.4s ease 1160ms both' }}>
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

            {isMobile && (
                <div className="fixed inset-x-4 bottom-4 z-40 grid grid-cols-3 gap-2 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/95 p-2 shadow-2xl backdrop-blur">
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        disabled={!lead.phone}
                        onClick={() => lead.phone && (window.location.href = `tel:${lead.phone}`)}
                    >
                        <Phone size={15} className="mr-1.5" />
                        Call
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        disabled={!lead.email}
                        onClick={() => setShowComposeEmail(true)}
                    >
                        <Mail size={15} className="mr-1.5" />
                        Email
                    </Button>
                    <Button
                        type="button"
                        className="rounded-xl bg-[#14B8A6] hover:bg-[#0D9488]"
                        onClick={() => navigate("/leads", { state: { editLeadId: lead.id } })}
                    >
                        <Pencil size={15} className="mr-1.5" />
                        Edit
                    </Button>
                </div>
            )}

            {/* Convert Dialog */}
            {showConvertDialog && lead && (
                <ConvertLeadDialog open={showConvertDialog} onClose={() => setShowConvertDialog(false)} lead={lead} onSuccess={handleConvertSuccess} />
            )}

            <ComposeEmailSheet
                isOpen={showComposeEmail}
                onClose={() => setShowComposeEmail(false)}
                defaultRecipientEmail={lead.email}
                defaultRecipientName={fullName}
                leadId={lead.id}
                onSent={fetchEmails}
            />
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
