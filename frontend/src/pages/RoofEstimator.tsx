// src/pages/RoofEstimator.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    getEstimates as fetchEstimatesApi,
    getEstimateSettings,
    getEstimateStatistics,
    checkAiHealth as checkAiHealthApi,
    fetchSatelliteImage,
    detectRoof as detectRoofApi,
    saveEstimate as saveEstimateApi,
    deleteEstimate as deleteEstimateApi,
    updateEstimateSettings,
    generateEstimate as generateEstimateApi,
    autocompleteAddress as autocompleteAddressApi,
} from "@/features/roof-estimator/services/roof-estimator-service";
import type { GeneratedEstimate } from "@/features/roof-estimator/services/roof-estimator-service";
import { getClients } from "@/features/clients/services/clients-service";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
    MapPin,
    Satellite,
    Brain,
    DollarSign,
    Save,
    Trash2,
    Loader2,
    CheckCircle2,
    Snowflake,
    Ruler,
    Clock,
    TrendingUp,
    Activity,
    BarChart3,
    RefreshCw,
    Settings,
    FileText,
    Zap,
    Eye,
    MoreVertical,
    ArrowUpRight,
    Search,
    Sparkles,
    Hammer,
    type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface RoofEstimate {
    id: string;
    address: string;
    latitude: number;
    longitude: number;
    satelliteImageUrl: string | null;
    roofAreaSqft: number;
    confidence: number;
    processingTimeSec: number;
    aiModel: string;
    pricePerSqft: number;
    manualAdjustment: number;
    totalEstimate: number;
    snowMode: boolean;
    notes: string | null;
    clientId: string | null;
    createdAt: string;
    client?: { id: string; clientName: string; companyName: string | null } | null;
}

interface EstimateSettings {
    defaultPricePerSqft: number;
    currency: string;
    snowModeDefault: boolean;
    companyName: string | null;
}

interface ClientOption {
    id: string;
    clientName: string;
    companyName: string | null;
}

interface DetectionResult {
    roofAreaSqft: number;
    confidence: number;
    processingTimeSec: number;
    aiModel: string;
}

interface SatelliteResult {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    satelliteImageUrl: string;
}

interface Statistics {
    totalEstimates: number;
    totalRevenue: number;
    avgRoofArea: number;
    avgConfidence: number;
}

// ============================================
// STAT CARD
// ============================================

const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    delay = 0,
}: {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: "teal" | "gold" | "purple" | "green";
    delay?: number;
}) => {
    const colorClasses = {
        teal: { light: "bg-[#0891B2]/10", text: "text-[#0891B2]", bg: "bg-[#0891B2]" },
        gold: { light: "bg-[#D97706]/10", text: "text-[#D97706]", bg: "bg-[#D97706]" },
        purple: { light: "bg-purple-500/10", text: "text-purple-500", bg: "bg-purple-500" },
        green: { light: "bg-green-500/10", text: "text-green-500", bg: "bg-green-500" },
    };
    const colors = colorClasses[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -4 }}
            className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg transition-all overflow-hidden group"
        >
            <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />
            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                        {typeof value === "number" ? value.toLocaleString() : value}
                    </p>
                </div>
                <div className={cn("w-12 h-12 rounded-md flex items-center justify-center", colors.light)}>
                    <Icon size={22} className={colors.text} />
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const RoofEstimator: React.FC = () => {
    const { toast } = useToast();
    const navigate = useNavigate();

    // ---- State ----
    const [address, setAddress] = useState("");
    const [satellite, setSatellite] = useState<SatelliteResult | null>(null);
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [pricePerSqft, setPricePerSqft] = useState(5.5);
    const [manualAdjustment, setManualAdjustment] = useState(0);
    const [snowMode, setSnowMode] = useState(true);
    const [notes, setNotes] = useState("");
    const [selectedClientId, setSelectedClientId] = useState<string>("");

    // Loading
    const [loadingSatellite, setLoadingSatellite] = useState(false);
    const [loadingDetection, setLoadingDetection] = useState(false);
    const [savingEstimate, setSavingEstimate] = useState(false);
    const [generatingEstimate, setGeneratingEstimate] = useState(false);

    // AI Estimate
    const [aiEstimate, setAiEstimate] = useState<GeneratedEstimate | null>(null);
    const [roofType, setRoofType] = useState("Gable");
    const [material, setMaterial] = useState("Asphalt Shingles");
    const [stories, setStories] = useState(1);
    const [pitch, setPitch] = useState("Standard (4/12 to 6/12)");
    const [currentCondition, setCurrentCondition] = useState("Fair");

    // Data
    const [estimates, setEstimates] = useState<RoofEstimate[]>([]);
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [settings, setSettings] = useState<EstimateSettings | null>(null);
    const [aiHealthy, setAiHealthy] = useState<boolean | null>(null);

    // Autocomplete
    const [suggestions, setSuggestions] = useState<Array<{ description: string; placeId: string }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // UI
    const [activeTab, setActiveTab] = useState<"estimator" | "history" | "settings">("history");
    const [viewEstimate, setViewEstimate] = useState<RoofEstimate | null>(null);

    // Computed
    const adjustedArea = detection
        ? Math.round(detection.roofAreaSqft * (1 + manualAdjustment / 100))
        : 0;
    const totalEstimate = adjustedArea * pricePerSqft;

    // ---- Effects ----
    useEffect(() => {
        fetchEstimates();
        fetchClients();
        fetchSettings();
        fetchStatistics();
        checkAiHealth();
    }, []);

    useEffect(() => {
        if (settings) {
            setPricePerSqft(settings.defaultPricePerSqft);
            setSnowMode(settings.snowModeDefault);
        }
    }, [settings]);

    // Close autocomplete on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced autocomplete
    const handleAddressChange = useCallback((value: string) => {
        setAddress(value);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (value.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        debounceTimer.current = setTimeout(async () => {
            try {
                const results = await autocompleteAddressApi(value);
                setSuggestions(results);
                setShowSuggestions(results.length > 0);
            } catch {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);
    }, []);

    const selectSuggestion = (description: string) => {
        setAddress(description);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // ---- API ----
    const fetchEstimates = async () => {
        try {
            const data = await fetchEstimatesApi();
            setEstimates(data);
        } catch { /* ignore */ }
    };

    const fetchClients = async () => {
        try {
            const data = await getClients();
            setClients(
                (data || []).map((c: any) => ({
                    id: c.id,
                    clientName: c.clientName,
                    companyName: c.companyName,
                }))
            );
        } catch { /* ignore */ }
    };

    const fetchSettings = async () => {
        try {
            const data = await getEstimateSettings();
            setSettings(data);
        } catch { /* ignore */ }
    };

    const fetchStatistics = async () => {
        try {
            const data = await getEstimateStatistics();
            setStatistics(data);
        } catch { /* ignore */ }
    };

    const checkAiHealth = async () => {
        try {
            const healthy = await checkAiHealthApi();
            setAiHealthy(healthy);
        } catch {
            setAiHealthy(false);
        }
    };

    // ---- Workflow ----
    const handleLoadSatellite = async () => {
        if (!address.trim()) {
            toast({ title: "Enter an address", description: "Please type a valid Canadian address", variant: "destructive" });
            return;
        }
        setLoadingSatellite(true);
        setSatellite(null);
        setDetection(null);
        try {
            const data = await fetchSatelliteImage(address.trim());
            setSatellite(data);
            toast({ title: "Satellite image loaded", description: data?.formattedAddress });
        } catch (err: any) {
            toast({ title: "Failed to load satellite", description: err.response?.data?.message || err.message, variant: "destructive" });
        } finally {
            setLoadingSatellite(false);
        }
    };

    const handleDetectRoof = async () => {
        if (!satellite) return;
        setLoadingDetection(true);
        setDetection(null);
        try {
            const data = await detectRoofApi({
                satelliteImageUrl: satellite.satelliteImageUrl,
                latitude: satellite.latitude,
                longitude: satellite.longitude,
            });
            setDetection(data);
            toast({ title: "Roof detected!", description: `${data?.roofAreaSqft} sq ft at ${data?.confidence}% confidence` });
        } catch (err: any) {
            toast({ title: "Detection failed", description: err.response?.data?.message || err.message, variant: "destructive" });
        } finally {
            setLoadingDetection(false);
        }
    };

    const handleSaveEstimate = async () => {
        if (!satellite || !detection) return;
        setSavingEstimate(true);
        try {
            await saveEstimateApi({
                address: satellite.formattedAddress,
                latitude: satellite.latitude,
                longitude: satellite.longitude,
                satelliteImageUrl: satellite.satelliteImageUrl,
                roofAreaSqft: adjustedArea,
                confidence: detection.confidence,
                processingTimeSec: detection.processingTimeSec,
                aiModel: detection.aiModel,
                pricePerSqft,
                manualAdjustment,
                totalEstimate,
                snowMode,
                notes: notes || undefined,
                clientId: selectedClientId || undefined,
            });
            toast({ title: "Estimate saved!", description: `$${totalEstimate.toLocaleString()} estimate saved.` });
            fetchEstimates();
            fetchStatistics();
            setAddress(""); setSatellite(null); setDetection(null);
            setManualAdjustment(0); setNotes(""); setSelectedClientId("");
        } catch (err: any) {
            toast({ title: "Save failed", description: err.response?.data?.message || err.message, variant: "destructive" });
        } finally {
            setSavingEstimate(false);
        }
    };

    const handleDeleteEstimate = async (id: string) => {
        try {
            await deleteEstimateApi(id);
            toast({ title: "Estimate deleted" });
            fetchEstimates();
            fetchStatistics();
        } catch {
            toast({ title: "Delete failed", variant: "destructive" });
        }
    };

    const handleGenerateEstimate = async () => {
        if (!detection) return;
        setGeneratingEstimate(true);
        setAiEstimate(null);
        try {
            const result = await generateEstimateApi({
                roofAreaSqft: adjustedArea,
                roofType,
                material,
                location: satellite?.formattedAddress,
                stories,
                pitch,
                currentCondition,
            });
            setAiEstimate(result);
            toast({ title: "AI Estimate Generated!", description: `Total: $${result.totalEstimate?.toLocaleString()} CAD` });
        } catch (err: any) {
            toast({ title: "Estimate generation failed", description: err.response?.data?.message || err.message, variant: "destructive" });
        } finally {
            setGeneratingEstimate(false);
        }
    };

    // Helpers
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

    const getConfidenceBadge = (confidence: number) => {
        if (confidence >= 70) return { label: "High Confidence", bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500" };
        if (confidence >= 40) return { label: "Moderate Confidence", bg: "bg-yellow-50", text: "text-yellow-600", dot: "bg-yellow-500" };
        return { label: "Low Confidence", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" };
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-30 bg-white border-b border-[rgba(15,23,42,0.06)]">
                    <div className="px-8 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-[#0891B2]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight">AI Roof Estimator</h1>
                                <p className="text-xs text-[#94A3B8] mt-0.5">Satellite imagery × AI-powered roof area estimation</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* AI Health */}
                            <div className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
                                aiHealthy === null ? "bg-[#F8FAFC] text-[#94A3B8]" :
                                    aiHealthy ? "bg-green-50 text-green-600" :
                                        "bg-red-50 text-red-600"
                            )}>
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    aiHealthy === null ? "bg-[#94A3B8]" : aiHealthy ? "bg-green-500" : "bg-red-500"
                                )} />
                                {aiHealthy === null ? "Checking AI..." : aiHealthy ? "AI Online" : "AI Offline"}
                            </div>

                            <Button
                                type="button"
                                onClick={() => navigate("/roof-estimator/editor")}
                                className="h-9 bg-[#0891B2] px-4 text-xs font-semibold text-white hover:bg-[#0891B2]/90"
                            >
                                <Sparkles className="mr-2 h-3.5 w-3.5" />
                                Create AI Estimate
                            </Button>

                            {/* Tabs */}
                            <div className="flex bg-[#F8FAFC] rounded-md border border-[rgba(15,23,42,0.06)] p-0.5">
                                {(["history", "settings"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                            activeTab === tab
                                                ? "bg-white text-[#0891B2] shadow-sm border border-[rgba(15,23,42,0.06)]"
                                                : "text-[#94A3B8] hover:text-[#475569]"
                                        )}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-8">
                    <AnimatePresence mode="wait">
                        {/* ============================================ */}
                        {/* ESTIMATOR TAB */}
                        {/* ============================================ */}
                        {activeTab === "estimator" && (
                            <motion.div key="estimator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                {/* Stats */}
                                {statistics && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                                        <StatCard title="Total Estimates" value={statistics.totalEstimates} icon={BarChart3} color="teal" delay={0} />
                                        <StatCard title="Total Revenue" value={formatCurrency(statistics.totalRevenue)} icon={DollarSign} color="green" delay={0.05} />
                                        <StatCard title="Avg Roof Area" value={`${statistics.avgRoofArea.toLocaleString()} sqft`} icon={Ruler} color="gold" delay={0.1} />
                                        <StatCard title="Avg Confidence" value={`${statistics.avgConfidence}%`} icon={Activity} color="purple" delay={0.15} />
                                    </div>
                                )}

                                <div className="grid grid-cols-12 gap-6">
                                    {/* LEFT — Address + Satellite */}
                                    <div className="col-span-5 space-y-5">
                                        {/* Address Card */}
                                        <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <MapPin className="w-4 h-4 text-[#0891B2]" />
                                                <h3 className="text-sm font-semibold text-[#0F172A]">Property Address</h3>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs text-[#94A3B8]">Street Address</Label>
                                                <div className="relative" ref={autocompleteRef}>
                                                    <div className="relative">
                                                        <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                        <Input
                                                            placeholder="e.g. 123 Main St, Toronto, ON"
                                                            value={address}
                                                            onChange={(e) => handleAddressChange(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    setShowSuggestions(false);
                                                                    handleLoadSatellite();
                                                                }
                                                            }}
                                                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                                            className="pl-9 border-[rgba(15,23,42,0.1)] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20"
                                                            autoComplete="off"
                                                        />
                                                    </div>
                                                    {/* Autocomplete dropdown */}
                                                    {showSuggestions && suggestions.length > 0 && (
                                                        <div className="absolute z-50 w-full mt-1 bg-white rounded-md border border-[rgba(15,23,42,0.1)] shadow-lg max-h-[240px] overflow-y-auto">
                                                            {suggestions.map((s, i) => (
                                                                <button
                                                                    key={s.placeId || i}
                                                                    type="button"
                                                                    onClick={() => selectSuggestion(s.description)}
                                                                    className="w-full text-left px-3 py-2.5 text-sm text-[#0F172A] hover:bg-[#F0FDFA] flex items-center gap-2.5 transition-colors border-b border-[rgba(15,23,42,0.04)] last:border-b-0"
                                                                >
                                                                    <MapPin className="w-3.5 h-3.5 text-[#0891B2] flex-shrink-0" />
                                                                    <span className="truncate">{s.description}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    onClick={handleLoadSatellite}
                                                    disabled={loadingSatellite || !address.trim()}
                                                    className="w-full bg-[#0891B2] hover:bg-[#0891B2]/90 text-white font-medium"
                                                >
                                                    {loadingSatellite ? (
                                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                                                    ) : (
                                                        <><Satellite className="w-4 h-4 mr-2" /> Load Satellite Image</>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Satellite Preview */}
                                        <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
                                            <div className="p-4 border-b border-[rgba(15,23,42,0.06)] flex items-center gap-2">
                                                <Satellite className="w-4 h-4 text-[#0891B2]" />
                                                <h3 className="text-sm font-semibold text-[#0F172A]">Satellite Preview</h3>
                                                {satellite && (
                                                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-green-50 text-green-600">
                                                        <CheckCircle2 className="w-3 h-3" /> Loaded
                                                    </span>
                                                )}
                                            </div>
                                            <div className="aspect-square bg-[#F8FAFC] flex items-center justify-center">
                                                {loadingSatellite ? (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-16 h-16 rounded-full border-2 border-[#0891B2]/20 border-t-[#0891B2] animate-spin" />
                                                            <Satellite className="w-6 h-6 text-[#0891B2] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                        </div>
                                                        <span className="text-xs text-[#94A3B8]">Fetching satellite imagery...</span>
                                                    </div>
                                                ) : satellite ? (
                                                    <img
                                                        src={satellite.satelliteImageUrl}
                                                        alt="Satellite view"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-3 text-[#CBD5E1]">
                                                        <Satellite className="w-12 h-12" />
                                                        <span className="text-xs">Enter an address to load satellite imagery</span>
                                                    </div>
                                                )}
                                            </div>
                                            {satellite && (
                                                <div className="px-4 py-2.5 border-t border-[rgba(15,23,42,0.06)] flex items-center gap-2 text-[11px] text-[#94A3B8]">
                                                    <MapPin className="w-3 h-3" />
                                                    {satellite.formattedAddress}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT — AI Detection + Results */}
                                    <div className="col-span-7 space-y-5">
                                        {/* Detect CTA */}
                                        <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Brain className="w-4 h-4 text-purple-500" />
                                                <h3 className="text-sm font-semibold text-[#0F172A]">AI Roof Detection</h3>
                                                {detection && (
                                                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-green-50 text-green-600">
                                                        <CheckCircle2 className="w-3 h-3" /> Complete
                                                    </span>
                                                )}
                                            </div>
                                            <Button
                                                size="lg"
                                                onClick={handleDetectRoof}
                                                disabled={!satellite || loadingDetection}
                                                className="w-full h-14 bg-gradient-to-r from-[#0891B2] to-[#6366F1] hover:from-[#0891B2]/90 hover:to-[#6366F1]/90 text-white font-semibold text-base shadow-md disabled:opacity-30"
                                            >
                                                {loadingDetection ? (
                                                    <div className="flex items-center gap-3">
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        <span>Analyzing roof structure...</span>
                                                    </div>
                                                ) : (
                                                    <><Zap className="w-5 h-5 mr-2" /> Detect Roof Area (AI)</>
                                                )}
                                            </Button>
                                            {!satellite && (
                                                <p className="text-[11px] text-[#CBD5E1] mt-2 text-center">Load a satellite image first</p>
                                            )}
                                        </div>

                                        {/* Detection Results */}
                                        <AnimatePresence>
                                            {detection && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="space-y-5"
                                                >
                                                    {/* Results Grid */}
                                                    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <Activity className="w-4 h-4 text-[#0891B2]" />
                                                            <h3 className="text-sm font-semibold text-[#0F172A]">Detection Results</h3>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                                            {[
                                                                { label: "Roof Area (sq ft)", value: detection.roofAreaSqft.toLocaleString(), icon: Ruler, color: "#0891B2" },
                                                                { label: "Confidence", value: `${detection.confidence}%`, icon: TrendingUp, color: "#22C55E" },
                                                                { label: "Processing Time", value: `${detection.processingTimeSec}s`, icon: Clock, color: "#6366F1" },
                                                            ].map((item) => (
                                                                <div key={item.label} className="bg-[#F8FAFC] rounded-md border border-[rgba(15,23,42,0.06)] p-4 text-center">
                                                                    <item.icon className="w-5 h-5 mx-auto mb-2" style={{ color: item.color }} />
                                                                    <div className="text-xl sm:text-2xl font-bold text-[#0F172A]">{item.value}</div>
                                                                    <div className="text-[10px] text-[#94A3B8] mt-1">{item.label}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Confidence badge */}
                                                        {(() => {
                                                            const badge = getConfidenceBadge(detection.confidence);
                                                            return (
                                                                <div className="flex items-center gap-2 mt-3">
                                                                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium", badge.bg, badge.text)}>
                                                                        <span className={cn("w-1.5 h-1.5 rounded-full", badge.dot)} />
                                                                        {badge.label}
                                                                    </span>
                                                                    <span className="text-[10px] text-[#94A3B8]">Model: {detection.aiModel}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Adjustments */}
                                                    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <Settings className="w-4 h-4 text-[#D97706]" />
                                                                <h3 className="text-sm font-semibold text-[#0F172A]">Adjustments</h3>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Snowflake className={cn("w-4 h-4", snowMode ? "text-[#0891B2]" : "text-[#CBD5E1]")} />
                                                                <span className="text-xs text-[#94A3B8]">Snow Mode</span>
                                                                <Switch checked={snowMode} onCheckedChange={setSnowMode} />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <Label className="text-xs text-[#94A3B8]">Area Adjustment</Label>
                                                                    <span className="text-xs font-mono text-[#0891B2] font-semibold">
                                                                        {manualAdjustment > 0 ? "+" : ""}{manualAdjustment}%
                                                                    </span>
                                                                </div>
                                                                <Slider
                                                                    value={[manualAdjustment]}
                                                                    onValueChange={(v) => setManualAdjustment(v[0])}
                                                                    min={-30} max={50} step={1}
                                                                    className="w-full"
                                                                />
                                                                <div className="flex justify-between text-[10px] text-[#CBD5E1] mt-1">
                                                                    <span>-30%</span>
                                                                    <span>Adjusted: {adjustedArea.toLocaleString()} sqft</span>
                                                                    <span>+50%</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-[#94A3B8]">Price per sq ft (CAD)</Label>
                                                                <div className="relative mt-1">
                                                                    <DollarSign className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                                                                    <Input
                                                                        type="number" step="0.25" min="0"
                                                                        value={pricePerSqft}
                                                                        onChange={(e) => setPricePerSqft(parseFloat(e.target.value) || 0)}
                                                                        className="pl-9 border-[rgba(15,23,42,0.1)] focus:border-[#22D3EE]"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Total Estimate */}
                                                    <div className="bg-white rounded-md border-2 border-[#22D3EE]/30 p-6">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="text-xs text-[#94A3B8] mb-1">Quick Estimate</div>
                                                                <div className="text-4xl font-bold text-[#0F172A]">
                                                                    {formatCurrency(totalEstimate)}
                                                                </div>
                                                                <div className="text-xs text-[#94A3B8] mt-1">
                                                                    {adjustedArea.toLocaleString()} sqft × ${pricePerSqft.toFixed(2)}/sqft
                                                                </div>
                                                            </div>
                                                            <div className="text-right space-y-2">
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#0891B2]/10 text-[#0891B2]">CAD</span>
                                                                {snowMode && (
                                                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-600">
                                                                        <Snowflake className="w-3 h-3" /> Snow Mode
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ── AI-Powered Estimate Generation ── */}
                                                    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                                            <h3 className="text-sm font-semibold text-[#0F172A]">AI Cost Estimate (OpenAI)</h3>
                                                            {aiEstimate && (
                                                                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-600">
                                                                    <CheckCircle2 className="w-3 h-3" /> Generated
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Materials & Config Form */}
                                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                                            <div>
                                                                <Label className="text-xs text-[#94A3B8]">Roof Type</Label>
                                                                <Select value={roofType} onValueChange={setRoofType}>
                                                                    <SelectTrigger className="mt-1 border-[rgba(15,23,42,0.1)]">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {["Gable", "Hip", "Flat", "Mansard", "Gambrel", "Shed", "Butterfly", "Dormer"].map(t => (
                                                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-[#94A3B8]">Material</Label>
                                                                <Select value={material} onValueChange={setMaterial}>
                                                                    <SelectTrigger className="mt-1 border-[rgba(15,23,42,0.1)]">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {["Asphalt Shingles", "Metal Roofing", "Cedar Shakes", "Slate", "Clay Tiles", "TPO Membrane", "EPDM Rubber", "Standing Seam Metal"].map(m => (
                                                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-[#94A3B8]">Pitch</Label>
                                                                <Select value={pitch} onValueChange={setPitch}>
                                                                    <SelectTrigger className="mt-1 border-[rgba(15,23,42,0.1)]">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {["Low (2/12 to 3/12)", "Standard (4/12 to 6/12)", "Moderate (7/12 to 9/12)", "Steep (10/12 to 12/12)", "Flat"].map(p => (
                                                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-[#94A3B8]">Condition</Label>
                                                                <Select value={currentCondition} onValueChange={setCurrentCondition}>
                                                                    <SelectTrigger className="mt-1 border-[rgba(15,23,42,0.1)]">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {["New", "Good", "Fair", "Poor", "Damaged", "Leaking"].map(c => (
                                                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>

                                                        <Button
                                                            onClick={handleGenerateEstimate}
                                                            disabled={generatingEstimate || !detection}
                                                            className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-md"
                                                        >
                                                            {generatingEstimate ? (
                                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating AI estimate...</>
                                                            ) : (
                                                                <><Sparkles className="w-4 h-4 mr-2" /> Generate Detailed AI Estimate</>
                                                            )}
                                                        </Button>
                                                    </div>

                                                    {/* AI Estimate Results */}
                                                    <AnimatePresence>
                                                        {aiEstimate && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 20 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0 }}
                                                                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-md border-2 border-amber-200 p-6 space-y-5"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                                                    <h3 className="text-base font-bold text-[#0F172A]">AI-Generated Estimate</h3>
                                                                </div>

                                                                <p className="text-sm text-[#475569]">{aiEstimate.summary}</p>

                                                                {/* Cost Summary */}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                    {[
                                                                        { label: "Labor", value: aiEstimate.laborCost, icon: Hammer, color: "#6366F1" },
                                                                        { label: "Materials", value: aiEstimate.materialCost, icon: Ruler, color: "#0891B2" },
                                                                        { label: "Total", value: aiEstimate.totalEstimate, icon: DollarSign, color: "#16A34A" },
                                                                    ].map(item => (
                                                                        <div key={item.label} className="bg-white rounded-md border border-amber-100 p-4 text-center">
                                                                            <item.icon className="w-5 h-5 mx-auto mb-2" style={{ color: item.color }} />
                                                                            <div className="text-xl font-bold text-[#0F172A]">{formatCurrency(item.value)}</div>
                                                                            <div className="text-[10px] text-[#94A3B8] mt-1">{item.label}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Breakdown Table */}
                                                                {aiEstimate.breakdown?.length > 0 && (
                                                                    <div className="bg-white rounded-md border border-amber-100 overflow-hidden">
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow className="hover:bg-transparent">
                                                                                    <TableHead className="text-[#94A3B8] text-xs">Item</TableHead>
                                                                                    <TableHead className="text-[#94A3B8] text-xs">Qty</TableHead>
                                                                                    <TableHead className="text-[#94A3B8] text-xs">Unit Price</TableHead>
                                                                                    <TableHead className="text-[#94A3B8] text-xs text-right">Total</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {aiEstimate.breakdown.map((row, i) => (
                                                                                    <TableRow key={i} className="hover:bg-amber-50/50">
                                                                                        <TableCell className="text-sm font-medium text-[#0F172A]">{row.item}</TableCell>
                                                                                        <TableCell className="text-sm text-[#94A3B8]">{row.quantity || "—"}</TableCell>
                                                                                        <TableCell className="text-sm text-[#94A3B8]">{row.unitPrice ? formatCurrency(row.unitPrice) : "—"}</TableCell>
                                                                                        <TableCell className="text-sm font-semibold text-[#0F172A] text-right">{formatCurrency(row.total)}</TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                )}

                                                                {/* Timeline & Notes */}
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="bg-white rounded-md border border-amber-100 p-4">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <Clock className="w-4 h-4 text-[#6366F1]" />
                                                                            <span className="text-xs font-semibold text-[#0F172A]">Timeline</span>
                                                                        </div>
                                                                        <p className="text-sm text-[#475569]">{aiEstimate.timeline}</p>
                                                                    </div>
                                                                    {aiEstimate.notes?.length > 0 && (
                                                                        <div className="bg-white rounded-md border border-amber-100 p-4">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <FileText className="w-4 h-4 text-amber-500" />
                                                                                <span className="text-xs font-semibold text-[#0F172A]">Important Notes</span>
                                                                            </div>
                                                                            <ul className="space-y-1">
                                                                                {aiEstimate.notes.map((note, i) => (
                                                                                    <li key={i} className="text-xs text-[#475569] flex items-start gap-1.5">
                                                                                        <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                                                                        {note}
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    {/* Save */}
                                                    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5 space-y-3">
                                                        <div>
                                                            <Label className="text-xs text-[#94A3B8]">Assign to Client (Optional)</Label>
                                                            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                                                <SelectTrigger className="mt-1 border-[rgba(15,23,42,0.1)]">
                                                                    <SelectValue placeholder="Select a client..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">No client</SelectItem>
                                                                    {clients.map((c) => (
                                                                        <SelectItem key={c.id} value={c.id}>
                                                                            {c.clientName}{c.companyName ? ` — ${c.companyName}` : ""}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs text-[#94A3B8]">Notes</Label>
                                                            <textarea
                                                                placeholder="Add notes about this estimate..."
                                                                value={notes}
                                                                onChange={(e) => setNotes(e.target.value)}
                                                                rows={2}
                                                                className="w-full mt-1 px-3 py-2 rounded-md border border-[rgba(15,23,42,0.1)] text-sm placeholder:text-[#CBD5E1] focus:border-[#22D3EE] focus:outline-none focus:ring-1 focus:ring-[#22D3EE]/20 resize-none"
                                                            />
                                                        </div>
                                                        <Button
                                                            onClick={handleSaveEstimate}
                                                            disabled={savingEstimate}
                                                            className="w-full bg-green-600 hover:bg-green-500 text-white font-medium"
                                                        >
                                                            {savingEstimate ? (
                                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                                            ) : (
                                                                <><Save className="w-4 h-4 mr-2" /> Save Estimate</>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ============================================ */}
                        {/* HISTORY TAB */}
                        {/* ============================================ */}
                        {activeTab === "history" && (
                            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
                                    <div className="p-5 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-[#0891B2]" />
                                            <h3 className="text-sm font-semibold text-[#0F172A]">Estimate History</h3>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F8FAFC] text-[#94A3B8] border border-[rgba(15,23,42,0.06)]">{estimates.length}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={fetchEstimates} className="text-[#94A3B8] hover:text-[#0F172A]">
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>

                                    {estimates.length === 0 ? (
                                        <div className="p-16 text-center text-[#CBD5E1]">
                                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                            <p className="text-sm text-[#94A3B8]">No estimates yet</p>
                                            <p className="text-xs text-[#CBD5E1] mt-1">Create your first estimate to get started</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="text-[#94A3B8]">Address</TableHead>
                                                    <TableHead className="text-[#94A3B8]">Client</TableHead>
                                                    <TableHead className="text-[#94A3B8]">Roof Area</TableHead>
                                                    <TableHead className="text-[#94A3B8]">Confidence</TableHead>
                                                    <TableHead className="text-[#94A3B8]">Total</TableHead>
                                                    <TableHead className="text-[#94A3B8]">Date</TableHead>
                                                    <TableHead className="text-[#94A3B8] text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {estimates.map((est, i) => {
                                                    const confBadge = getConfidenceBadge(est.confidence);
                                                    return (
                                                        <TableRow key={est.id} className="group hover:bg-[#F8FAFC]">
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-md overflow-hidden bg-[#F8FAFC] flex-shrink-0 border border-[rgba(15,23,42,0.06)]">
                                                                        {est.satelliteImageUrl ? (
                                                                            <img src={est.satelliteImageUrl} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Satellite className="w-4 h-4 m-auto text-[#CBD5E1] mt-2.5" />
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-[#0F172A] truncate max-w-[200px] group-hover:text-[#0891B2] transition-colors">
                                                                        {est.address}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm text-[#94A3B8]">
                                                                    {est.client?.clientName || "—"}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm font-medium text-[#0F172A]">{est.roofAreaSqft.toLocaleString()} sqft</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium", confBadge.bg, confBadge.text)}>
                                                                    <span className={cn("w-1.5 h-1.5 rounded-full", confBadge.dot)} />
                                                                    {est.confidence}%
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm font-semibold text-[#0F172A]">{formatCurrency(est.totalEstimate)}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm text-[#94A3B8]">{formatDate(est.createdAt)}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setViewEstimate(est)}>
                                                                                    <Eye size={16} className="text-[#475569]" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>View Details</TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => handleDeleteEstimate(est.id)}>
                                                                                    <Trash2 size={16} className="text-[#475569]" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Delete</TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ============================================ */}
                        {/* SETTINGS TAB */}
                        {/* ============================================ */}
                        {activeTab === "settings" && (
                            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <SettingsPanel
                                    settings={settings}
                                    onSave={async (data) => {
                                        try {
                                            await updateEstimateSettings(data);
                                            toast({ title: "Settings saved" });
                                            fetchSettings();
                                        } catch {
                                            toast({ title: "Save failed", variant: "destructive" });
                                        }
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* View Estimate Dialog */}
                <Dialog open={!!viewEstimate} onOpenChange={(open) => !open && setViewEstimate(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-lg text-[#0F172A]">Estimate Details</DialogTitle>
                        </DialogHeader>
                        {viewEstimate && (
                            <div className="space-y-4">
                                {viewEstimate.satelliteImageUrl && (
                                    <img src={viewEstimate.satelliteImageUrl} alt="" className="w-full rounded-md" />
                                )}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        { label: "Address", value: viewEstimate.address },
                                        { label: "Total Estimate", value: formatCurrency(viewEstimate.totalEstimate), bold: true },
                                        { label: "Roof Area", value: `${viewEstimate.roofAreaSqft.toLocaleString()} sqft` },
                                        { label: "Confidence", value: `${viewEstimate.confidence}%` },
                                        { label: "Price/sqft", value: `$${viewEstimate.pricePerSqft}` },
                                        { label: "Adjustment", value: `${viewEstimate.manualAdjustment}%` },
                                    ].map((item) => (
                                        <div key={item.label} className="bg-[#F8FAFC] rounded-md p-3">
                                            <div className="text-[10px] text-[#94A3B8]">{item.label}</div>
                                            <div className={cn("text-[#0F172A] mt-0.5", item.bold && "font-bold")}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                                {viewEstimate.notes && (
                                    <div className="bg-[#F8FAFC] rounded-md p-3 text-sm">
                                        <div className="text-[10px] text-[#94A3B8] mb-1">Notes</div>
                                        <div className="text-[#475569]">{viewEstimate.notes}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
};

// ============================================
// SETTINGS PANEL
// ============================================

const SettingsPanel: React.FC<{
    settings: EstimateSettings | null;
    onSave: (data: any) => Promise<void>;
}> = ({ settings, onSave }) => {
    const [form, setForm] = useState({
        defaultPricePerSqft: settings?.defaultPricePerSqft || 5.5,
        currency: settings?.currency || "CAD",
        snowModeDefault: settings?.snowModeDefault ?? true,
        companyName: settings?.companyName || "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setForm({
                defaultPricePerSqft: settings.defaultPricePerSqft,
                currency: settings.currency,
                snowModeDefault: settings.snowModeDefault,
                companyName: settings.companyName || "",
            });
        }
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    return (
        <div className="max-w-xl">
            <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-[#0891B2]" />
                    <h3 className="text-sm font-semibold text-[#0F172A]">Estimator Settings</h3>
                </div>

                <div>
                    <Label className="text-xs text-[#94A3B8]">Default Price per sq ft (CAD)</Label>
                    <Input
                        type="number" step="0.25"
                        value={form.defaultPricePerSqft}
                        onChange={(e) => setForm({ ...form, defaultPricePerSqft: parseFloat(e.target.value) || 0 })}
                        className="mt-1 border-[rgba(15,23,42,0.1)]"
                    />
                </div>

                <div>
                    <Label className="text-xs text-[#94A3B8]">Company Name (for PDF)</Label>
                    <Input
                        value={form.companyName}
                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                        placeholder="Your Roofing Company Inc."
                        className="mt-1 border-[rgba(15,23,42,0.1)]"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-xs text-[#94A3B8]">Snow Mode Default</Label>
                        <p className="text-[10px] text-[#CBD5E1] mt-0.5">Enable snow mode by default for new estimates</p>
                    </div>
                    <Switch checked={form.snowModeDefault} onCheckedChange={(v) => setForm({ ...form, snowModeDefault: v })} />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0891B2] hover:bg-[#0891B2]/90 text-white">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Settings
                </Button>
            </div>
        </div>
    );
};

export default RoofEstimator;
