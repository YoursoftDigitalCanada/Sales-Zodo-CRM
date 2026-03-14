// src/pages/LeadSources/LeadSources.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    Phone,
    Mail,
    Chrome,
    UserPlus,
    Share2,
    Presentation,
    MapPin,
    Globe,
    Search,
    Plus,
    TrendingUp,
    Users,
    Target,
    DollarSign,
    MoreVertical,
    Pencil,
    Trash2,
    Pause,
    Play,
    TestTube,
    Eye,
    Loader2,
    Wifi,
    WifiOff,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Sparkles,
    BarChart3,
    ArrowUpRight,
    ChevronRight,
    Bell,
    Zap,
    Activity,
    Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AddSourceDialog from "./AddSourceDialog";

// ── TYPES ──────────────────────────────────────────────────────────
interface LeadSourceItem {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    sourceType: string;
    category: string;
    icon?: string;
    color?: string;
    integrationStatus: string;
    status: string;
    totalLeads: number;
    convertedLeads: number;
    totalRevenue?: number;
    costPerLead?: number;
    lastLeadAt?: string;
    webhookUrl?: string;
    autoAssign: boolean;
    sendWelcomeEmail: boolean;
    createFollowupTask: boolean;
    leadCount?: number;
    createdAt: string;
}

interface StatsSummary {
    totalSources: number;
    activeSources: number;
    totalLeads: number;
    totalConverted: number;
    totalRevenue: number;
    avgConversionRate: number;
}

// ── ICON MAP ──────────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
    Phone, Mail, Chrome, UserPlus, Share2, Presentation, MapPin, Globe,
};

const sourceTypeIcons: Record<string, React.ElementType> = {
    COLD_CALL: Phone,
    EMAIL_CAMPAIGN: Mail,
    GOOGLE_ADS: Chrome,
    REFERRAL: UserPlus,
    SOCIAL_MEDIA: Share2,
    TRADE_SHOW: Presentation,
    WALK_IN: MapPin,
    WEBSITE: Globe,
};

const sourceTypeColors: Record<string, string> = {
    COLD_CALL: "#6366F1",
    EMAIL_CAMPAIGN: "#EC4899",
    GOOGLE_ADS: "#4285F4",
    REFERRAL: "#10B981",
    SOCIAL_MEDIA: "#3B82F6",
    TRADE_SHOW: "#F59E0B",
    WALK_IN: "#8B5CF6",
    WEBSITE: "#6637F4",
};

const sourceTypeLabels: Record<string, string> = {
    COLD_CALL: "Cold Call",
    EMAIL_CAMPAIGN: "Email Campaign",
    GOOGLE_ADS: "Google Ads",
    REFERRAL: "Referral",
    SOCIAL_MEDIA: "Social Media",
    TRADE_SHOW: "Trade Show",
    WALK_IN: "Walk-In",
    WEBSITE: "Website",
};

const integrationMethods: Record<string, string> = {
    COLD_CALL: "Manual entry",
    EMAIL_CAMPAIGN: "Email parser / Manual",
    GOOGLE_ADS: "API / Webhook",
    REFERRAL: "Manual entry",
    SOCIAL_MEDIA: "Meta API / Webhook",
    TRADE_SHOW: "Manual entry / Import",
    WALK_IN: "Manual entry",
    WEBSITE: "Webhook / Form embed",
};

// ── STAT CARD ──────────────────────────────────────────────────────
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
    color: string;
    delay?: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white rounded-2xl p-5 border border-[rgba(15,23,42,0.06)] hover:shadow-lg transition-all duration-300 group"
    >
        <div className="flex items-start justify-between mb-3">
            <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${color}15` }}
            >
                <Icon size={20} style={{ color }} />
            </div>
            <ArrowUpRight size={16} className="text-[#94A3B8] group-hover:text-[#6637F4] transition-colors" />
        </div>
        <p className="text-2xl font-bold text-[#0F172A] mb-1">{value}</p>
        <p className="text-sm text-[#475569]">{title}</p>
        <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>
    </motion.div>
);

// ── CONNECTION STATUS BADGE ────────────────────────────────────────
const ConnectionBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
        CONNECTED: { color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2, label: "Connected" },
        DISCONNECTED: { color: "#94A3B8", bg: "#F1F5F9", icon: WifiOff, label: "Disconnected" },
        CONNECTING: { color: "#3B82F6", bg: "#EFF6FF", icon: Wifi, label: "Connecting..." },
        ERROR: { color: "#EF4444", bg: "#FEF2F2", icon: XCircle, label: "Error" },
        EXPIRED: { color: "#F59E0B", bg: "#FFFBEB", icon: AlertTriangle, label: "Expired" },
    };
    const c = config[status] || config.DISCONNECTED;
    const StatusIcon = c.icon;

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: c.bg, color: c.color }}
        >
            <StatusIcon size={12} />
            {c.label}
        </span>
    );
};

// ── SOURCE CARD ────────────────────────────────────────────────────
const SourceCard = ({
    source,
    onEdit,
    onPause,
    onResume,
    onDelete,
    onTest,
    onView,
}: {
    source: LeadSourceItem;
    onEdit: () => void;
    onPause: () => void;
    onResume: () => void;
    onDelete: () => void;
    onTest: () => void;
    onView: () => void;
}) => {
    const Icon = sourceTypeIcons[source.sourceType] || Globe;
    const color = source.color || sourceTypeColors[source.sourceType] || "#6637F4";
    const conversionRate = source.totalLeads > 0
        ? Math.round((source.convertedLeads / source.totalLeads) * 100)
        : 0;
    const isPaused = source.status === "PAUSED";
    const isActive = source.status === "ACTIVE";

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className={cn(
                "bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-5 cursor-pointer transition-all duration-300 hover:shadow-lg group relative overflow-hidden",
                isPaused && "opacity-70"
            )}
            onClick={onView}
        >
            {/* Color accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }} />

            {/* Header */}
            <div className="flex items-start justify-between mt-1">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${color}15` }}
                    >
                        <Icon size={22} style={{ color }} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[#0F172A] text-sm">{source.name}</h3>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                            {sourceTypeLabels[source.sourceType] || source.sourceType}
                        </p>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors opacity-0 group-hover:opacity-100">
                            <MoreVertical size={16} className="text-[#475569]" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={onView} className="rounded-lg">
                            <Eye size={14} className="mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onEdit} className="rounded-lg">
                            <Pencil size={14} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onTest} className="rounded-lg">
                            <TestTube size={14} className="mr-2" /> Test Connection
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {isActive ? (
                            <DropdownMenuItem onClick={onPause} className="rounded-lg">
                                <Pause size={14} className="mr-2" /> Pause
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={onResume} className="rounded-lg">
                                <Play size={14} className="mr-2" /> Resume
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onDelete} className="rounded-lg text-red-600 focus:text-red-600">
                            <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-4">
                <ConnectionBadge status={source.integrationStatus} />
                <Badge
                    variant="outline"
                    className={cn(
                        "text-xs rounded-full border-0",
                        source.category === "DIGITAL"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-amber-50 text-amber-600"
                    )}
                >
                    {source.category === "DIGITAL" ? "Digital" : "Manual"}
                </Badge>
                {isPaused && (
                    <Badge variant="outline" className="text-xs rounded-full border-0 bg-orange-50 text-orange-600">
                        Paused
                    </Badge>
                )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-[rgba(15,23,42,0.06)]">
                <div>
                    <p className="text-lg font-bold text-[#0F172A]">{source.totalLeads}</p>
                    <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Leads</p>
                </div>
                <div>
                    <p className="text-lg font-bold text-[#0F172A]">{conversionRate}%</p>
                    <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Conv.</p>
                </div>
                <div>
                    <p className="text-lg font-bold text-[#0F172A]">
                        ${source.totalRevenue ? Math.round(Number(source.totalRevenue)).toLocaleString() : "0"}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Revenue</p>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                <span className="text-[10px] text-[#94A3B8]">
                    {integrationMethods[source.sourceType] || "—"}
                </span>
                {source.lastLeadAt && (
                    <span className="text-[10px] text-[#94A3B8]">
                        Last lead: {new Date(source.lastLeadAt).toLocaleDateString()}
                    </span>
                )}
            </div>
        </motion.div>
    );
};

// ── MAIN PAGE COMPONENT ────────────────────────────────────────────
const LeadSourcesPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [sources, setSources] = useState<LeadSourceItem[]>([]);
    const [stats, setStats] = useState<StatsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sourceToDelete, setSourceToDelete] = useState<LeadSourceItem | null>(null);

    // Fetch sources and stats
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [sourcesRes, statsRes] = await Promise.all([
                api.get("/lead-sources", { params: { limit: 100 } }),
                api.get("/lead-sources/stats/summary"),
            ]);
            setSources(sourcesRes.data?.data || []);
            setStats(statsRes.data?.data || null);
        } catch (error) {
            console.error("Failed to fetch lead sources:", error);
            toast({ title: "Error", description: "Failed to load lead sources", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Filtered sources
    const filteredSources = useMemo(() => {
        let result = [...sources];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (s) =>
                    s.name.toLowerCase().includes(term) ||
                    (s.description || "").toLowerCase().includes(term) ||
                    sourceTypeLabels[s.sourceType]?.toLowerCase().includes(term)
            );
        }
        if (filterType !== "all") result = result.filter((s) => s.sourceType === filterType);
        if (filterStatus !== "all") result = result.filter((s) => s.status === filterStatus);
        return result;
    }, [sources, searchTerm, filterType, filterStatus]);

    // Actions
    const handlePause = async (id: string) => {
        try {
            await api.post(`/lead-sources/${id}/pause`);
            toast({ title: "Paused", description: "Lead source paused successfully" });
            fetchData();
        } catch { toast({ title: "Error", description: "Failed to pause", variant: "destructive" }); }
    };

    const handleResume = async (id: string) => {
        try {
            await api.post(`/lead-sources/${id}/resume`);
            toast({ title: "Resumed", description: "Lead source resumed" });
            fetchData();
        } catch { toast({ title: "Error", description: "Failed to resume", variant: "destructive" }); }
    };

    const handleTest = async (id: string) => {
        try {
            const res = await api.post(`/lead-sources/${id}/test`);
            const data = res.data?.data;
            toast({
                title: data?.success ? "Connection OK" : "Connection Issue",
                description: data?.message || "Test completed",
                variant: data?.success ? "default" : "destructive",
            });
        } catch { toast({ title: "Error", description: "Test failed", variant: "destructive" }); }
    };

    const handleDelete = async () => {
        if (!sourceToDelete) return;
        try {
            await api.delete(`/lead-sources/${sourceToDelete.id}`);
            toast({ title: "Deleted", description: `"${sourceToDelete.name}" has been deleted` });
            fetchData();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.response?.data?.message || "Failed to delete",
                variant: "destructive",
            });
        } finally {
            setDeleteDialogOpen(false);
            setSourceToDelete(null);
        }
    };

    const handleSourceCreated = () => {
        setAddDialogOpen(false);
        fetchData();
    };

    // ── RENDER ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#F7F7FB]">
            <main className="flex-1 transition-all duration-300">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
                    <div className="flex h-16 items-center justify-between px-6">
                        <div className="flex items-center gap-2 text-sm">
                            <button onClick={() => navigate("/dashboard")} className="text-[#475569] hover:text-[#6637F4] transition-colors">
                                Dashboard
                            </button>
                            <ChevronRight size={14} className="text-[#475569]" />
                            <span className="font-semibold text-[#6637F4]">Lead Sources</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setAddDialogOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#6637F4] text-white text-sm font-medium rounded-xl hover:bg-[#6637F4]/90 transition-colors shadow-sm shadow-[#6637F4]/25"
                            >
                                <Plus size={16} />
                                Add Source
                            </motion.button>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-6 space-y-6">
                    {/* Page Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F0EEFF] to-[#F1F5F9] p-8"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#6637F4]/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-[#D97706]/10 rounded-full blur-3xl" />

                        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex items-center gap-2 mb-3"
                                >
                                    <Sparkles size={20} className="text-[#D97706]" />
                                    <span className="text-[#D97706] text-sm font-medium">Lead Source Management</span>
                                </motion.div>
                                <h1 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-2">
                                    Lead <span className="text-[#6637F4]">Sources</span>
                                </h1>
                                <p className="text-[#475569] text-lg max-w-xl">
                                    Connect and manage your lead channels. Track performance across{" "}
                                    <span className="text-[#6637F4] font-semibold">{stats?.totalSources || 0} sources</span>.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Cards */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <StatCard title="Total Sources" value={stats.totalSources} subtitle="All channels" icon={Target} color="#6637F4" delay={0} />
                            <StatCard title="Active Sources" value={stats.activeSources} subtitle="Receiving leads" icon={Activity} color="#10B981" delay={0.05} />
                            <StatCard title="Total Leads" value={stats.totalLeads} subtitle="All time" icon={Users} color="#6366F1" delay={0.1} />
                            <StatCard title="Converted" value={stats.totalConverted} subtitle="Won leads" icon={TrendingUp} color="#F59E0B" delay={0.15} />
                            <StatCard title="Revenue" value={`$${Math.round(stats.totalRevenue).toLocaleString()}`} subtitle="Total attributed" icon={DollarSign} color="#10B981" delay={0.2} />
                            <StatCard title="Conversion" value={`${stats.avgConversionRate}%`} subtitle="Avg rate" icon={BarChart3} color="#EC4899" delay={0.25} />
                        </div>
                    )}

                    {/* Filter Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl p-4 border border-[rgba(15,23,42,0.06)] flex flex-wrap items-center gap-3"
                    >
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search sources..."
                                className="h-10 pl-10 rounded-xl border-[rgba(15,23,42,0.08)] focus:border-[#6637F4] focus:ring-1 focus:ring-[#6637F4]/20 bg-[#F7F7FB]"
                            />
                        </div>

                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="h-10 w-[160px] rounded-xl border-[rgba(15,23,42,0.08)] bg-[#F7F7FB]">
                                <Filter size={14} className="mr-2 text-[#94A3B8]" />
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all" className="rounded-lg">All Types</SelectItem>
                                {Object.entries(sourceTypeLabels).map(([key, label]) => (
                                    <SelectItem key={key} value={key} className="rounded-lg">{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-10 w-[140px] rounded-xl border-[rgba(15,23,42,0.08)] bg-[#F7F7FB]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all" className="rounded-lg">All Status</SelectItem>
                                <SelectItem value="ACTIVE" className="rounded-lg">Active</SelectItem>
                                <SelectItem value="PAUSED" className="rounded-lg">Paused</SelectItem>
                                <SelectItem value="INACTIVE" className="rounded-lg">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </motion.div>

                    {/* Source Cards Grid */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={32} className="animate-spin text-[#6637F4]" />
                        </div>
                    ) : filteredSources.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-2xl border border-[rgba(15,23,42,0.06)] p-12 text-center"
                        >
                            <Target size={48} className="mx-auto text-[#94A3B8] mb-4" />
                            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                                {sources.length === 0 ? "No lead sources yet" : "No matching sources"}
                            </h3>
                            <p className="text-[#475569] mb-6 max-w-md mx-auto">
                                {sources.length === 0
                                    ? "Add your first lead source to start tracking where your leads come from."
                                    : "Try adjusting your search or filters."}
                            </p>
                            {sources.length === 0 && (
                                <Button
                                    onClick={() => setAddDialogOpen(true)}
                                    className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-xl"
                                >
                                    <Plus size={16} className="mr-2" />
                                    Add Your First Source
                                </Button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <AnimatePresence>
                                {filteredSources.map((source) => (
                                    <SourceCard
                                        key={source.id}
                                        source={source}
                                        onView={() => navigate(`/lead-sources/${source.id}`)}
                                        onEdit={() => navigate(`/lead-sources/${source.id}`)}
                                        onPause={() => handlePause(source.id)}
                                        onResume={() => handleResume(source.id)}
                                        onTest={() => handleTest(source.id)}
                                        onDelete={() => {
                                            setSourceToDelete(source);
                                            setDeleteDialogOpen(true);
                                        }}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* Add Source Dialog */}
            <AddSourceDialog
                isOpen={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onCreated={handleSourceCreated}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lead Source</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{sourceToDelete?.name}"? This cannot be undone.
                            Sources with existing leads cannot be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-xl">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default LeadSourcesPage;
