import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { downloadFile } from "@/features/files/services/files-service";
import {
    Search,
    Plus,
    Download,
    Upload,
    Eye,
    Pencil,
    Trash2,
    MoreHorizontal,
    Calendar,
    CalendarDays,
    Clock,
    CheckCircle2,
    AlertCircle,
    ClipboardList,
    Target,
    FileText,
    UserCheck,
    MapPin,
    Phone,
    Mail,
    type LucideIcon,
    ArrowUpRight,
    ArrowDownRight,
    Flame,
    X,
    Loader2,
} from "lucide-react";
import { getAllInspections, type InspectionEntity } from "@/features/leads/services/inspections-service";
import type { CompanyProfile } from "@/features/settings/services/settings-service";
import { getCompanyProfile } from "@/features/settings/services/settings-service";
import InspectionReportPreviewDialog from "@/components/inspections/InspectionReportPreviewDialog";
import { ensureInspectionReportFile } from "@/features/leads/utils/ensure-inspection-report-file";

// ============================================
// TYPES
// ============================================

type InspectionStatus = "scheduled" | "in_progress" | "pending_report" | "completed" | "follow_up" | "cancelled";

interface Inspection {
    id: string;
    leadId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    address: string;
    inspectorName: string;
    date: string;
    time: string;
    status: InspectionStatus;
    damageRating: string | null;
    estimateStatus: string | null;
    totalEstimate: number | null;
    insuranceCompany: string | null;
    claimNumber: string | null;
    stormDamage: boolean;
    inspectionType: string;
}

// ============================================
// HELPERS
// ============================================

const statusConfig: Record<InspectionStatus, { label: string; color: string; bgColor: string; icon: LucideIcon }> = {
    scheduled: { label: "Scheduled", color: "#3B82F6", bgColor: "#EFF6FF", icon: CalendarDays },
    in_progress: { label: "In Progress", color: "#F59E0B", bgColor: "#FFFBEB", icon: Clock },
    pending_report: { label: "Pending Report", color: "#F97316", bgColor: "#FFF7ED", icon: FileText },
    completed: { label: "Completed", color: "#10B981", bgColor: "#ECFDF5", icon: CheckCircle2 },
    follow_up: { label: "Follow Up", color: "#EF4444", bgColor: "#FEF2F2", icon: AlertCircle },
    cancelled: { label: "Cancelled", color: "#6B7280", bgColor: "#F3F4F6", icon: X },
};

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return dateStr;
    }
}

function formatTime(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
        return "";
    }
}

function mapInspectionStatus(raw: InspectionEntity): InspectionStatus {
    const est = (raw.estimateStatus || "").toLowerCase();
    if (est === "completed" || est === "done") return "completed";
    if (est === "pending" || est === "pending_report") return "pending_report";
    if (est === "in_progress") return "in_progress";
    if (est === "follow_up") return "follow_up";
    if (est === "cancelled") return "cancelled";
    // If has inspection date in the future → scheduled
    if (raw.inspectionDate) {
        const d = new Date(raw.inspectionDate);
        if (d > new Date()) return "scheduled";
    }
    return "scheduled";
}

function mapApiInspection(raw: InspectionEntity): Inspection {
    const lead = raw.lead;
    const customerName = lead ? `${lead.firstName} ${lead.lastName}` : "Unknown";
    const address = lead
        ? [lead.propertyAddress, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ")
        : "";

    return {
        id: raw.id,
        leadId: raw.leadId,
        customerName,
        customerEmail: lead?.email || "",
        customerPhone: lead?.phone || "",
        address,
        inspectorName: raw.inspectorName || "Unassigned",
        date: raw.inspectionDate || raw.createdAt,
        time: raw.inspectionDate || raw.createdAt,
        status: mapInspectionStatus(raw),
        damageRating: raw.overallDamageRating,
        estimateStatus: raw.estimateStatus,
        totalEstimate: raw.totalEstimate,
        insuranceCompany: lead?.insuranceCompanyName || null,
        claimNumber: lead?.claimNumber || null,
        stormDamage: raw.stormDamageFound || false,
        inspectionType: raw.inspectionType || "Initial",
    };
}



// ============================================
// STAT CARD
// ============================================

const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    change,
    delay = 0,
}: {
    title: string;
    value: number;
    icon: LucideIcon;
    color: string;
    change?: number;
    delay?: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        whileHover={{ y: -4 }}
        className="relative bg-white rounded-lg p-5 border border-gray-100 hover:border-cyan-200 hover:shadow-lg transition-all overflow-hidden group"
    >
        <div
            className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all"
            style={{ backgroundColor: color }}
        />
        <div className="relative flex items-start justify-between">
            <div>
                <p className="text-sm text-gray-400 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {change !== undefined && (
                    <div className="flex items-center gap-1 mt-2">
                        {change >= 0 ? (
                            <ArrowUpRight size={14} className="text-green-500" />
                        ) : (
                            <ArrowDownRight size={14} className="text-red-500" />
                        )}
                        <span className={`text-xs font-semibold ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {Math.abs(change)}%
                        </span>
                    </div>
                )}
            </div>
            <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}15` }}
            >
                <Icon size={22} style={{ color }} />
            </div>
        </div>
    </motion.div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const InspectionList = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    // State
    const [inspectionRecords, setInspectionRecords] = useState<InspectionEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterInspector, setFilterInspector] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterDamageType, setFilterDamageType] = useState("all");
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [reportGeneratingId, setReportGeneratingId] = useState<string | null>(null);
    const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
    const [reportPreviewUrl, setReportPreviewUrl] = useState<string | null>(null);
    const [reportFileId, setReportFileId] = useState<string | null>(null);
    const [reportFileName, setReportFileName] = useState("inspection-report.pdf");
    const [reportSubtitle, setReportSubtitle] = useState("Inspection report");
    const companyProfileRef = React.useRef<CompanyProfile | null>(null);
    const reportPreviewUrlRef = React.useRef<string | null>(null);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getAllInspections();
                setInspectionRecords(data);
            } catch {
                setInspectionRecords([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        return () => {
            if (reportPreviewUrlRef.current) {
                URL.revokeObjectURL(reportPreviewUrlRef.current);
                reportPreviewUrlRef.current = null;
            }
        };
    }, []);

    const inspections = useMemo(() => inspectionRecords.map(mapApiInspection), [inspectionRecords]);

    const ensureCompanyProfile = async () => {
        if (companyProfileRef.current) return companyProfileRef.current;
        const profile = await getCompanyProfile();
        companyProfileRef.current = profile;
        return profile;
    };

    const updateReportPreview = (previewUrl: string, fileId: string, fileName: string, subtitle: string) => {
        if (reportPreviewUrlRef.current) {
            URL.revokeObjectURL(reportPreviewUrlRef.current);
        }
        reportPreviewUrlRef.current = previewUrl;
        setReportFileId(fileId);
        setReportFileName(fileName);
        setReportSubtitle(subtitle);
        setReportPreviewUrl(previewUrl);
    };

    const handleDownloadReport = async () => {
        if (!reportFileId) return;

        try {
            await downloadFile(reportFileId, reportFileName);
        } catch {
            toast({
                title: "Download failed",
                description: "We couldn't download the inspection PDF right now.",
                variant: "destructive",
            });
        }
    };

    const handlePreviewReport = async (inspection: Inspection) => {
        const rawInspection = inspectionRecords.find((record) => record.id === inspection.id);
        if (!rawInspection) {
            toast({
                title: "Inspection not found",
                description: "We couldn't find the inspection details needed to build the PDF.",
                variant: "destructive",
            });
            return;
        }

        setReportGeneratingId(inspection.id);
        setReportPreviewOpen(true);
        if (reportPreviewUrlRef.current) {
            URL.revokeObjectURL(reportPreviewUrlRef.current);
            reportPreviewUrlRef.current = null;
        }
        setReportPreviewUrl(null);
        setReportFileId(null);

        try {
            const companyProfile = await ensureCompanyProfile();
            const result = await ensureInspectionReportFile({
                inspection: rawInspection,
                companyProfile,
                reuseExisting: true,
                snapshotOverrides: {
                    customerName: inspection.customerName,
                    customerEmail: inspection.customerEmail,
                    customerPhone: inspection.customerPhone,
                    propertyAddress: inspection.address,
                    insuranceCompany: inspection.insuranceCompany,
                    claimNumber: inspection.claimNumber,
                },
            });
            updateReportPreview(
                result.previewUrl,
                result.fileId,
                result.fileName,
                inspection.customerName || "Inspection report",
            );
            toast({
                title: result.created ? "Inspection PDF ready" : "Inspection PDF opened",
                description: result.created
                    ? "The report was generated, saved to CRM files, and opened here for review."
                    : "The saved inspection PDF is open here for review.",
            });
        } catch {
            setReportPreviewOpen(false);
            toast({
                title: "PDF generation failed",
                description: "We couldn't open the inspection PDF right now.",
                variant: "destructive",
            });
        } finally {
            setReportGeneratingId(null);
        }
    };

    // Computed values
    const inspectors = useMemo(() => {
        const names = new Set(inspections.map((i) => i.inspectorName));
        return Array.from(names).filter(Boolean);
    }, [inspections]);

    const stats = useMemo(() => {
        const today = new Date().toDateString();
        return {
            total: inspections.length,
            todayScheduled: inspections.filter((i) => new Date(i.date).toDateString() === today && i.status === "scheduled").length,
            pendingReport: inspections.filter((i) => i.status === "pending_report").length,
            completed: inspections.filter((i) => i.status === "completed").length,
            followUp: inspections.filter((i) => i.status === "follow_up").length,
        };
    }, [inspections]);

    const filteredInspections = useMemo(() => {
        let list = [...inspections];

        // Tab filter
        if (activeTab === "today") {
            const today = new Date().toDateString();
            list = list.filter((i) => new Date(i.date).toDateString() === today);
        } else if (activeTab === "this_week") {
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            list = list.filter((i) => {
                const d = new Date(i.date);
                return d >= weekStart && d < weekEnd;
            });
        } else if (activeTab === "pending_report") {
            list = list.filter((i) => i.status === "pending_report");
        } else if (activeTab === "completed") {
            list = list.filter((i) => i.status === "completed");
        }

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (i) =>
                    i.customerName.toLowerCase().includes(q) ||
                    i.address.toLowerCase().includes(q) ||
                    i.inspectorName.toLowerCase().includes(q) ||
                    i.customerEmail.toLowerCase().includes(q)
            );
        }

        // Filters
        if (filterInspector !== "all") list = list.filter((i) => i.inspectorName === filterInspector);
        if (filterStatus !== "all") list = list.filter((i) => i.status === filterStatus);
        if (filterDamageType !== "all") {
            if (filterDamageType === "storm") list = list.filter((i) => i.stormDamage);
            else if (filterDamageType === "hail") list = list.filter((i) => i.damageRating === "HIGH");
            else if (filterDamageType === "insurance") list = list.filter((i) => i.insuranceCompany);
        }

        return list;
    }, [inspections, activeTab, searchQuery, filterInspector, filterStatus, filterDamageType]);

    const toggleSelectAll = () => {
        if (selectedRows.size === filteredInspections.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(filteredInspections.map((i) => i.id)));
        }
    };

    const toggleSelectRow = (id: string) => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const tabs = [
        { id: "all", label: "All", count: stats.total },
        { id: "today", label: "Today", count: stats.todayScheduled },
        { id: "this_week", label: "This Week", count: null },
        { id: "pending_report", label: "Pending Report", count: stats.pendingReport },
        { id: "completed", label: "Completed", count: stats.completed },
    ];

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            {/* Header */}
            <header className="crm-module-header bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                    <div className="crm-toolbar-row">
                        <div className="crm-toolbar-meta">
                            <h1 className="crm-toolbar-title flex items-center gap-2 text-gray-900">
                                <ClipboardList size={24} className="text-[#1E40AF]" />
                                Inspections
                            </h1>
                            <p className="crm-toolbar-copy">Manage roof inspections and damage assessments</p>
                        </div>
                        <div className="crm-toolbar-actions gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="crm-toolbar-button crm-toolbar-button-secondary crm-toolbar-icon-button">
                                            <Upload size={16} className="text-gray-500" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Import</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="crm-toolbar-button crm-toolbar-button-secondary crm-toolbar-icon-button">
                                            <Download size={16} className="text-gray-500" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Export</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Button
                                className="crm-toolbar-button crm-toolbar-button-primary gap-2"
                                onClick={() => navigate("/inspections/new")}
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline">Schedule Inspection</span>
                                <span className="sm:hidden">Schedule</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-4 sm:p-6 lg:p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6">
                    <StatCard title="Total Inspections" value={stats.total} icon={ClipboardList} color="#3B82F6" />
                    <StatCard title="Today Scheduled" value={stats.todayScheduled} icon={CalendarDays} color="#F59E0B" delay={0.1} />
                    <StatCard title="Pending Report" value={stats.pendingReport} icon={FileText} color="#F97316" delay={0.2} />
                    <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="#10B981" delay={0.3} />
                    <StatCard title="Follow Up" value={stats.followUp} icon={AlertCircle} color="#EF4444" delay={0.4} />
                </div>

                {/* Main Content Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm"
                >
                    {/* Tabs */}
                    <div className="px-4 pt-4 border-b border-gray-100">
                        <div className="flex items-center gap-1 overflow-x-auto pb-0">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.id
                                            ? "text-[#1E40AF] border-[#1E40AF] bg-blue-50/50"
                                            : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    {tab.label}
                                    {tab.count !== null && (
                                        <span
                                            className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-[#1E40AF] text-white" : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="p-4 border-b border-gray-50">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="relative flex-1 sm:max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search inspections..."
                                    className="pl-9 h-10 rounded-lg border-gray-200"
                                />
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto">
                                <Select value={filterInspector} onValueChange={setFilterInspector}>
                                    <SelectTrigger className="w-[150px] h-10 rounded-lg border-gray-200 text-sm">
                                        <SelectValue placeholder="Inspector" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                        <SelectItem value="all" className="rounded-lg">All Inspectors</SelectItem>
                                        {inspectors.map((name) => (
                                            <SelectItem key={name} value={name} className="rounded-lg">{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-[140px] h-10 rounded-lg border-gray-200 text-sm">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                        <SelectItem value="all" className="rounded-lg">All Statuses</SelectItem>
                                        {Object.entries(statusConfig).map(([key, val]) => (
                                            <SelectItem key={key} value={key} className="rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: val.color }} />
                                                    {val.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={filterDamageType} onValueChange={setFilterDamageType}>
                                    <SelectTrigger className="w-[150px] h-10 rounded-lg border-gray-200 text-sm">
                                        <SelectValue placeholder="Damage Type" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                        <SelectItem value="all" className="rounded-lg">All Types</SelectItem>
                                        <SelectItem value="storm" className="rounded-lg">
                                            <div className="flex items-center gap-2"><Flame size={14} className="text-red-500" /> Storm Damage</div>
                                        </SelectItem>
                                        <SelectItem value="hail" className="rounded-lg">High Damage</SelectItem>
                                        <SelectItem value="insurance" className="rounded-lg">Insurance Claims</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    <AnimatePresence>
                        {selectedRows.size > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-3"
                            >
                                <span className="text-sm font-medium text-[#1E40AF]">
                                    {selectedRows.size} selected
                                </span>
                                <Button size="sm" variant="outline" className="rounded-lg text-xs h-7" onClick={() => setSelectedRows(new Set())}>
                                    Clear
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-lg text-xs h-7">
                                    <Trash2 size={12} className="mr-1" />
                                    Delete
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-gray-50/50">
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedRows.size === filteredInspections.length && filteredInspections.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                            className="data-[state=checked]:bg-[#1E40AF] data-[state=checked]:border-[#1E40AF]"
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-gray-600">Customer</TableHead>
                                    <TableHead className="font-semibold text-gray-600">Address</TableHead>
                                    <TableHead className="font-semibold text-gray-600">Inspector</TableHead>
                                    <TableHead className="font-semibold text-gray-600">Date / Time</TableHead>
                                    <TableHead className="font-semibold text-gray-600">Status</TableHead>
                                    <TableHead className="w-28 font-semibold text-gray-600">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin mb-3" />
                                                <p className="text-gray-400">Loading inspections...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredInspections.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16">
                                            <div className="flex flex-col items-center">
                                                <ClipboardList size={48} className="text-gray-300 mb-3" />
                                                <p className="text-gray-400 font-medium">No inspections found</p>
                                                <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInspections.map((inspection) => {
                                        const status = statusConfig[inspection.status];
                                        const StatusIcon = status.icon;
                                        return (
                                            <TableRow
                                                key={inspection.id}
                                                className="group hover:bg-blue-50/30 transition-colors cursor-pointer border-l-2 border-l-transparent hover:border-l-[#1E40AF]"
                                                onClick={() => navigate(`/inspections/${inspection.id}`)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedRows.has(inspection.id)}
                                                        onCheckedChange={() => toggleSelectRow(inspection.id)}
                                                        className="data-[state=checked]:bg-[#1E40AF] data-[state=checked]:border-[#1E40AF]"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9">
                                                            <AvatarFallback className="bg-blue-50 text-[#1E40AF] font-medium text-xs">
                                                                {getInitials(inspection.customerName)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-gray-900 group-hover:text-[#1E40AF] transition-colors">
                                                                {inspection.customerName}
                                                            </p>
                                                            <p className="text-xs text-gray-400">{inspection.customerPhone}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-start gap-1.5 max-w-[240px]">
                                                        <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-gray-600 truncate">{inspection.address}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                                                                {getInitials(inspection.inspectorName)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm text-gray-700">{inspection.inspectorName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">{formatDate(inspection.date)}</p>
                                                        <p className="text-xs text-gray-400">{formatTime(inspection.time)}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                                                        style={{ backgroundColor: status.bgColor, color: status.color }}
                                                    >
                                                        <StatusIcon size={12} />
                                                        {status.label}
                                                    </span>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-[#1E40AF]"
                                                                        onClick={() => void handlePreviewReport(inspection)}
                                                                        disabled={reportGeneratingId === inspection.id}
                                                                    >
                                                                        {reportGeneratingId === inspection.id ? (
                                                                            <Loader2 size={14} className="animate-spin" />
                                                                        ) : (
                                                                            <Eye size={14} />
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>View PDF</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-[#1E40AF]"
                                                                        onClick={() => navigate(`/inspections/${inspection.id}`)}
                                                                    >
                                                                        <Pencil size={14} />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Edit</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                                                                    <MoreHorizontal size={14} />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-lg w-44">
                                                                <DropdownMenuItem className="rounded-lg" onClick={() => void handlePreviewReport(inspection)}>
                                                                    <Eye size={14} className="mr-2" /> View Report
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="rounded-lg">
                                                                    <Mail size={14} className="mr-2" /> Email Report
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="rounded-lg text-red-600">
                                                                    <Trash2 size={14} className="mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </motion.div>
            </div>

            <InspectionReportPreviewDialog
                open={reportPreviewOpen}
                onOpenChange={setReportPreviewOpen}
                pdfUrl={reportPreviewUrl}
                fileName={reportFileName}
                title="Inspection Report Preview"
                subtitle={reportSubtitle}
                loading={reportGeneratingId !== null}
                onDownload={() => void handleDownloadReport()}
            />
        </div>
    );
};

export default InspectionList;
