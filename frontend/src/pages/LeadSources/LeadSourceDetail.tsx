// src/pages/LeadSources/LeadSourceDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Phone,
    Mail,
    Chrome,
    UserPlus,
    Share2,
    Presentation,
    MapPin,
    Globe,
    ArrowLeft,
    Copy,
    RefreshCw,
    Loader2,
    TestTube,
    Pause,
    Play,
    Trash2,
    Save,
    CheckCircle2,
    WifiOff,
    XCircle,
    AlertTriangle,
    Wifi,
    Clock,
    Activity,
    TrendingUp,
    DollarSign,
    Users,
    Settings,
    FileText,
    Zap,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── ICON & COLOR MAPS ──────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = { Phone, Mail, Chrome, UserPlus, Share2, Presentation, MapPin, Globe };
const sourceTypeIcons: Record<string, React.ElementType> = {
    COLD_CALL: Phone, EMAIL_CAMPAIGN: Mail, GOOGLE_ADS: Chrome, REFERRAL: UserPlus,
    SOCIAL_MEDIA: Share2, TRADE_SHOW: Presentation, WALK_IN: MapPin, WEBSITE: Globe,
};
const sourceTypeColors: Record<string, string> = {
    COLD_CALL: "#6366F1", EMAIL_CAMPAIGN: "#EC4899", GOOGLE_ADS: "#4285F4", REFERRAL: "#10B981",
    SOCIAL_MEDIA: "#3B82F6", TRADE_SHOW: "#F59E0B", WALK_IN: "#8B5CF6", WEBSITE: "#6637F4",
};
const sourceTypeLabels: Record<string, string> = {
    COLD_CALL: "Cold Call", EMAIL_CAMPAIGN: "Email Campaign", GOOGLE_ADS: "Google Ads",
    REFERRAL: "Referral", SOCIAL_MEDIA: "Social Media", TRADE_SHOW: "Trade Show",
    WALK_IN: "Walk-In", WEBSITE: "Website",
};

const connectionConfig: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    CONNECTED: { color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2, label: "Connected" },
    DISCONNECTED: { color: "#94A3B8", bg: "#F1F5F9", icon: WifiOff, label: "Disconnected" },
    CONNECTING: { color: "#3B82F6", bg: "#EFF6FF", icon: Wifi, label: "Connecting..." },
    ERROR: { color: "#EF4444", bg: "#FEF2F2", icon: XCircle, label: "Error" },
    EXPIRED: { color: "#F59E0B", bg: "#FFFBEB", icon: AlertTriangle, label: "Expired" },
};

// ── TYPES ──────────────────────────────────────────────────────
interface SourceDetail {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    sourceType: string;
    category: string;
    icon?: string;
    color?: string;
    integrationStatus: string;
    integrationConfig?: any;
    webhookUrl?: string;
    status: string;
    totalLeads: number;
    convertedLeads: number;
    totalRevenue?: number;
    costPerLead?: number;
    monthlyBudget?: number;
    autoAssign: boolean;
    assignmentMethod: string;
    assignedUserId?: string;
    sendWelcomeEmail: boolean;
    sendWelcomeSms: boolean;
    createFollowupTask: boolean;
    followupDelayMinutes: number;
    notifyAssignee: boolean;
    notificationChannels: string[];
    fieldMapping?: any;
    lastLeadAt?: string;
    lastSyncAt?: string;
    lastError?: string;
    lastErrorAt?: string;
    errorCount: number;
    createdAt: string;
    updatedAt: string;
}

interface LogEntry {
    id: string;
    eventType: string;
    status: string;
    direction: string;
    errorMessage?: string;
    processingTimeMs?: number;
    leadId?: string;
    createdAt: string;
}

// ── MAIN COMPONENT ──────────────────────────────────────────────
const LeadSourceDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [source, setSource] = useState<SourceDetail | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    // Editable fields
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editCostPerLead, setEditCostPerLead] = useState("");
    const [editMonthlyBudget, setEditMonthlyBudget] = useState("");
    const [editAutoAssign, setEditAutoAssign] = useState(false);
    const [editAssignmentMethod, setEditAssignmentMethod] = useState("MANUAL_ASSIGN");
    const [editSendWelcomeEmail, setEditSendWelcomeEmail] = useState(false);
    const [editCreateFollowupTask, setEditCreateFollowupTask] = useState(true);
    const [editNotifyAssignee, setEditNotifyAssignee] = useState(true);

    const fetchSource = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [sourceRes, logsRes] = await Promise.all([
                api.get(`/lead-sources/${id}`),
                api.get(`/lead-sources/${id}/logs`, { params: { limit: 20 } }),
            ]);
            const data = sourceRes.data?.data;
            if (data) {
                setSource(data);
                setEditName(data.name);
                setEditDescription(data.description || "");
                setEditCostPerLead(data.costPerLead?.toString() || "");
                setEditMonthlyBudget(data.monthlyBudget?.toString() || "");
                setEditAutoAssign(data.autoAssign);
                setEditAssignmentMethod(data.assignmentMethod);
                setEditSendWelcomeEmail(data.sendWelcomeEmail);
                setEditCreateFollowupTask(data.createFollowupTask);
                setEditNotifyAssignee(data.notifyAssignee);
            }
            setLogs(logsRes.data?.data || []);
        } catch {
            toast({ title: "Error", description: "Failed to load source details", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSource(); }, [id]);

    const handleSave = async () => {
        if (!id) return;
        setSaving(true);
        try {
            await api.put(`/lead-sources/${id}`, {
                name: editName,
                description: editDescription || null,
                costPerLead: editCostPerLead ? parseFloat(editCostPerLead) : null,
                monthlyBudget: editMonthlyBudget ? parseFloat(editMonthlyBudget) : null,
                autoAssign: editAutoAssign,
                assignmentMethod: editAssignmentMethod,
                sendWelcomeEmail: editSendWelcomeEmail,
                createFollowupTask: editCreateFollowupTask,
                notifyAssignee: editNotifyAssignee,
            });
            toast({ title: "Saved", description: "Settings updated successfully" });
            fetchSource();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.response?.data?.message || "Failed to save",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAction = async (action: string) => {
        if (!id) return;
        try {
            if (action === "pause") await api.post(`/lead-sources/${id}/pause`);
            if (action === "resume") await api.post(`/lead-sources/${id}/resume`);
            if (action === "test") {
                const res = await api.post(`/lead-sources/${id}/test`);
                toast({ title: res.data?.data?.success ? "OK" : "Issue", description: res.data?.data?.message });
                fetchSource();
                return;
            }
            toast({ title: "Success", description: `Source ${action}d` });
            fetchSource();
        } catch {
            toast({ title: "Error", description: `Failed to ${action}`, variant: "destructive" });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 size={32} className="animate-spin text-[#6637F4]" />
            </div>
        );
    }

    if (!source) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-[#475569] mb-4">Source not found</p>
                <Button onClick={() => navigate("/leads/sources")} className="rounded-xl">Go Back</Button>
            </div>
        );
    }

    const Icon = sourceTypeIcons[source.sourceType] || Globe;
    const color = source.color || sourceTypeColors[source.sourceType] || "#6637F4";
    const conn = connectionConfig[source.integrationStatus] || connectionConfig.DISCONNECTED;
    const ConnIcon = conn.icon;
    const conversionRate = source.totalLeads > 0 ? Math.round((source.convertedLeads / source.totalLeads) * 100) : 0;

    return (
        <div className="min-h-screen bg-[#F7F7FB]">
            {/* Breadcrumb Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
                <div className="flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-2 text-sm">
                        <button onClick={() => navigate("/leads/sources")} className="text-[#475569] hover:text-[#6637F4] transition-colors flex items-center gap-1">
                            <ArrowLeft size={14} />
                            Lead Sources
                        </button>
                        <ChevronRight size={14} className="text-[#CBD5E1]" />
                        <span className="font-semibold text-[#6637F4] truncate max-w-[200px]">{source.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleAction("test")} className="rounded-xl text-xs">
                            <TestTube size={14} className="mr-1.5" /> Test
                        </Button>
                        {source.status === "ACTIVE" ? (
                            <Button variant="outline" size="sm" onClick={() => handleAction("pause")} className="rounded-xl text-xs">
                                <Pause size={14} className="mr-1.5" /> Pause
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => handleAction("resume")} className="rounded-xl text-xs">
                                <Play size={14} className="mr-1.5" /> Resume
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <div className="p-4 md:p-6 space-y-6">
                {/* Hero Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-6"
                >
                    <div className="flex items-start gap-4">
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: `${color}15` }}
                        >
                            <Icon size={28} style={{ color }} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-xl font-bold text-[#0F172A]">{source.name}</h1>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: conn.bg, color: conn.color }}>
                                    <ConnIcon size={12} />
                                    {conn.label}
                                </span>
                                {source.status !== "ACTIVE" && (
                                    <Badge variant="outline" className="text-xs rounded-full border-0 bg-orange-50 text-orange-600">
                                        {source.status}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-[#475569]">
                                {sourceTypeLabels[source.sourceType]} • {source.category === "DIGITAL" ? "Digital" : "Manual"}
                                {source.description && ` — ${source.description}`}
                            </p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-[rgba(15,23,42,0.06)]">
                        <div className="flex items-center gap-3">
                            <Users size={18} className="text-[#6366F1]" />
                            <div>
                                <p className="text-lg font-bold text-[#0F172A]">{source.totalLeads}</p>
                                <p className="text-xs text-[#94A3B8]">Total Leads</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <TrendingUp size={18} className="text-[#10B981]" />
                            <div>
                                <p className="text-lg font-bold text-[#0F172A]">{conversionRate}%</p>
                                <p className="text-xs text-[#94A3B8]">Conversion Rate</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <DollarSign size={18} className="text-[#F59E0B]" />
                            <div>
                                <p className="text-lg font-bold text-[#0F172A]">
                                    ${source.totalRevenue ? Math.round(Number(source.totalRevenue)).toLocaleString() : "0"}
                                </p>
                                <p className="text-xs text-[#94A3B8]">Revenue</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-[#6637F4]" />
                            <div>
                                <p className="text-sm font-bold text-[#0F172A]">
                                    {source.lastLeadAt ? new Date(source.lastLeadAt).toLocaleDateString() : "—"}
                                </p>
                                <p className="text-xs text-[#94A3B8]">Last Lead</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="bg-white rounded-xl border border-[rgba(15,23,42,0.06)] p-1 h-auto">
                        <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-[#6637F4] data-[state=active]:text-white">
                            <Settings size={14} className="mr-1.5" /> Settings
                        </TabsTrigger>
                        <TabsTrigger value="connection" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-[#6637F4] data-[state=active]:text-white">
                            <Zap size={14} className="mr-1.5" /> Connection
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-[#6637F4] data-[state=active]:text-white">
                            <FileText size={14} className="mr-1.5" /> Logs ({logs.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* ── SETTINGS TAB ─────────────────────────── */}
                    <TabsContent value="overview" className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-6 space-y-5"
                        >
                            <h3 className="font-semibold text-[#0F172A]">General Settings</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm text-[#475569]">Source Name</Label>
                                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-[#475569]">Description</Label>
                                    <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="h-10 rounded-xl" placeholder="Optional" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm text-[#475569]">Cost Per Lead ($)</Label>
                                    <Input type="number" value={editCostPerLead} onChange={(e) => setEditCostPerLead(e.target.value)} className="h-10 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-[#475569]">Monthly Budget ($)</Label>
                                    <Input type="number" value={editMonthlyBudget} onChange={(e) => setEditMonthlyBudget(e.target.value)} className="h-10 rounded-xl" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[rgba(15,23,42,0.06)] space-y-3">
                                <h4 className="font-medium text-sm text-[#0F172A]">Assignment</h4>
                                <div className="flex items-center justify-between p-3 bg-[#F7F7FB] rounded-xl">
                                    <span className="text-sm text-[#475569]">Auto-Assign Leads</span>
                                    <Checkbox checked={editAutoAssign} onCheckedChange={(c) => setEditAutoAssign(c as boolean)} className="border-slate-300 data-[state=checked]:bg-[#6637F4]" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[rgba(15,23,42,0.06)] space-y-3">
                                <h4 className="font-medium text-sm text-[#0F172A]">Automation</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-[#F7F7FB] rounded-xl">
                                        <span className="text-sm text-[#475569]">Send Welcome Email</span>
                                        <Checkbox checked={editSendWelcomeEmail} onCheckedChange={(c) => setEditSendWelcomeEmail(c as boolean)} className="border-slate-300 data-[state=checked]:bg-[#6637F4]" />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-[#F7F7FB] rounded-xl">
                                        <span className="text-sm text-[#475569]">Create Follow-Up Task</span>
                                        <Checkbox checked={editCreateFollowupTask} onCheckedChange={(c) => setEditCreateFollowupTask(c as boolean)} className="border-slate-300 data-[state=checked]:bg-[#6637F4]" />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-[#F7F7FB] rounded-xl">
                                        <span className="text-sm text-[#475569]">Notify Assigned Rep</span>
                                        <Checkbox checked={editNotifyAssignee} onCheckedChange={(c) => setEditNotifyAssignee(c as boolean)} className="border-slate-300 data-[state=checked]:bg-[#6637F4]" />
                                    </div>
                                </div>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-xl">
                                {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                                Save Changes
                            </Button>
                        </motion.div>
                    </TabsContent>

                    {/* ── CONNECTION TAB ─────────────────────────── */}
                    <TabsContent value="connection" className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-6 space-y-5"
                        >
                            <h3 className="font-semibold text-[#0F172A]">Connection Details</h3>

                            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: conn.bg }}>
                                <ConnIcon size={20} style={{ color: conn.color }} />
                                <div>
                                    <p className="font-medium text-sm" style={{ color: conn.color }}>{conn.label}</p>
                                    {source.lastError && (
                                        <p className="text-xs text-red-500 mt-0.5">Last error: {source.lastError}</p>
                                    )}
                                </div>
                            </div>

                            {/* Webhook URL */}
                            {source.webhookUrl && (
                                <div className="space-y-2">
                                    <Label className="text-sm text-[#475569]">Webhook URL</Label>
                                    <div className="flex items-center gap-2">
                                        <Input value={source.webhookUrl} readOnly className="h-10 rounded-xl bg-[#F7F7FB] font-mono text-xs" />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyToClipboard(source.webhookUrl || "")}
                                            className="rounded-xl"
                                        >
                                            {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-[#94A3B8]">
                                        Send a POST request with lead data to this URL to create leads automatically.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-[#94A3B8] text-xs">Source Type</p>
                                    <p className="text-[#0F172A] font-medium">{sourceTypeLabels[source.sourceType]}</p>
                                </div>
                                <div>
                                    <p className="text-[#94A3B8] text-xs">Category</p>
                                    <p className="text-[#0F172A] font-medium">{source.category}</p>
                                </div>
                                <div>
                                    <p className="text-[#94A3B8] text-xs">Created</p>
                                    <p className="text-[#0F172A] font-medium">{new Date(source.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-[#94A3B8] text-xs">Error Count</p>
                                    <p className="text-[#0F172A] font-medium">{source.errorCount}</p>
                                </div>
                            </div>
                        </motion.div>
                    </TabsContent>

                    {/* ── LOGS TAB ─────────────────────────────────── */}
                    <TabsContent value="logs" className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-6"
                        >
                            <h3 className="font-semibold text-[#0F172A] mb-4">Webhook & Event Logs</h3>

                            {logs.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText size={32} className="mx-auto text-[#94A3B8] mb-3" />
                                    <p className="text-[#475569]">No logs yet</p>
                                    <p className="text-xs text-[#94A3B8]">Events will appear here when webhooks are received or actions are taken.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F7F7FB] transition-colors"
                                        >
                                            <div className={cn(
                                                "w-2 h-2 rounded-full flex-shrink-0",
                                                log.status === "success" ? "bg-green-500" :
                                                    log.status === "failed" ? "bg-red-500" :
                                                        "bg-yellow-500"
                                            )} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-[#0F172A] capitalize">
                                                        {log.eventType.replace(/_/g, " ")}
                                                    </span>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] rounded-full border-0",
                                                        log.status === "success" ? "bg-green-50 text-green-600" :
                                                            log.status === "failed" ? "bg-red-50 text-red-600" :
                                                                "bg-yellow-50 text-yellow-600"
                                                    )}>
                                                        {log.status}
                                                    </Badge>
                                                </div>
                                                {log.errorMessage && (
                                                    <p className="text-xs text-red-500 mt-0.5 truncate">{log.errorMessage}</p>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-[11px] text-[#94A3B8]">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </p>
                                                {log.processingTimeMs != null && (
                                                    <p className="text-[10px] text-[#CBD5E1]">{log.processingTimeMs}ms</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default LeadSourceDetail;
