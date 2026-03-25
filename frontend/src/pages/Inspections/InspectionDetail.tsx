import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
    ArrowLeft,
    Save,
    CheckCircle2,
    Share2,
    Phone,
    Mail,
    MapPin,
    Building2,
    FileText,
    ClipboardList,
    Camera,
    Plus,
    Home,
    ArrowRight,
    Calendar,
    Sun,
    CloudLightning,
    Eye,
    Trash2,
    Loader2,
} from "lucide-react";
import {
    getAllInspections,
    updateInspection,
    type InspectionEntity,
} from "@/features/leads/services/inspections-service";

// ============================================
// SUB-COMPONENTS
// ============================================

const RadioGroup = ({
    options,
    value,
    onChange,
    name,
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (val: string) => void;
    name: string;
}) => (
    <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
            <label
                key={opt.value}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${value === opt.value
                    ? "border-[#1E40AF] bg-blue-50 text-[#1E40AF]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
            >
                <input
                    type="radio"
                    name={name}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={() => onChange(opt.value)}
                    className="sr-only"
                />
                <span
                    className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${value === opt.value ? "border-[#1E40AF]" : "border-gray-300"
                        }`}
                >
                    {value === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF]" />}
                </span>
                {opt.label}
            </label>
        ))}
    </div>
);

const SectionCard = ({
    title,
    icon,
    children,
    className = "",
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={`bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow ${className}`}>
        <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span>{icon}</span>
                {title}
            </h3>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// ============================================
// HELPERS
// ============================================

function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getSeverityFromRating(rating: string | null): { label: string; color: string; bgColor: string; score: number } {
    if (!rating) return { label: "N/A", color: "#6B7280", bgColor: "#F3F4F6", score: 0 };
    const upper = rating.toUpperCase();
    if (upper === "HIGH" || upper === "SEVERE") return { label: "HIGH", color: "#DC2626", bgColor: "#FEE2E2", score: 8 };
    if (upper === "MODERATE" || upper === "MEDIUM") return { label: "MODERATE", color: "#F59E0B", bgColor: "#FEF3C7", score: 5 };
    if (upper === "LOW" || upper === "MINOR") return { label: "LOW", color: "#10B981", bgColor: "#D1FAE5", score: 2 };
    // If it's a number
    const num = parseInt(rating);
    if (!isNaN(num)) {
        if (num >= 7) return { label: "HIGH", color: "#DC2626", bgColor: "#FEE2E2", score: num };
        if (num >= 4) return { label: "MODERATE", color: "#F59E0B", bgColor: "#FEF3C7", score: num };
        return { label: "LOW", color: "#10B981", bgColor: "#D1FAE5", score: num };
    }
    return { label: rating, color: "#6B7280", bgColor: "#F3F4F6", score: 0 };
}

// ============================================
// MAIN COMPONENT
// ============================================

const InspectionDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToast();

    // Data state
    const [inspection, setInspection] = useState<InspectionEntity | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state — populated from API data
    const [measurementSource, setMeasurementSource] = useState("manual");
    const [measurements, setMeasurements] = useState({
        totalSquares: "", pitch: "", stories: "", predominant: "",
        hipRidge: "", valley: "", eavesRakes: "", flashing: "", gutters: "",
    });
    const [recommendation, setRecommendation] = useState("full_replacement");
    const [inspectorNotes, setInspectorNotes] = useState("");

    // Damage assessment state
    const [roofField, setRoofField] = useState({ condition: "good", hailSize: "", hitCount: "" });
    const [flashings, setFlashings] = useState({ step: "good", pipeBoots: "good" });
    const [ridgeHip, setRidgeHip] = useState({ ridgeCap: "good", hipShingles: "good" });
    const [guttersState, setGuttersState] = useState({ condition: "good", downspouts: "good" });
    const [ventilation, setVentilation] = useState({ ridgeVent: false, soffitVent: false, boxVents: false, recommendation: "" });
    const [decking, setDecking] = useState({ condition: "Good", softSpots: "0", replacementSq: "0" });
    const [damageChecks, setDamageChecks] = useState({
        hail: false, wind: false, flashing: false, gutter: false, deck: false,
    });

    // Customer/lead info (from inspection.lead)
    const [customer, setCustomer] = useState({
        name: "", initials: "", phone: "", email: "", address: "",
        insurance: "", claimNumber: "",
    });
    const [inspDetails, setInspDetails] = useState({
        inspector: "", date: "", time: "", weather: "",
        cause: "", dateOfLoss: "", inspectionType: "",
    });

    // ---------- Load Data ----------
    useEffect(() => {
        const loadInspection = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const allInspections = await getAllInspections();
                const found = allInspections.find(i => i.id === id);
                if (!found) {
                    toast({ title: "Not Found", description: "Inspection not found.", variant: "destructive" });
                    navigate("/inspections");
                    return;
                }
                setInspection(found);
                populateForm(found);
            } catch (err) {
                toast({ title: "Error", description: "Failed to load inspection.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        loadInspection();
    }, [id]);

    const populateForm = (data: InspectionEntity) => {
        const lead = data.lead;
        const customerName = lead ? `${lead.firstName} ${lead.lastName}` : "Unknown";
        const address = lead
            ? [lead.propertyAddress, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ")
            : "";

        setCustomer({
            name: customerName,
            initials: getInitials(customerName),
            phone: lead?.phone || "",
            email: lead?.email || "",
            address,
            insurance: lead?.insuranceCompanyName || "",
            claimNumber: lead?.claimNumber || "",
        });

        const inspDate = data.inspectionDate ? new Date(data.inspectionDate) : null;
        setInspDetails({
            inspector: data.inspectorName || "Unassigned",
            date: inspDate ? inspDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not set",
            time: inspDate ? inspDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "",
            weather: (data.weatherConditions as string) || "",
            cause: (data.inspectionType as string) || "",
            dateOfLoss: "",
            inspectionType: (data.inspectionType as string) || "",
        });

        setMeasurements({
            totalSquares: data.totalSquares?.toString() || "",
            pitch: data.roofPitch || "",
            stories: "",
            predominant: "",
            hipRidge: data.ridgeLength?.toString() || "",
            valley: data.valleyLength?.toString() || "",
            eavesRakes: ((data.eaveLength || 0) + (data.rakeLength || 0)).toString() || "",
            flashing: "",
            gutters: "",
        });

        setInspectorNotes(data.inspectorNotes || "");

        // Damage assessment
        const stormDamage = data.stormDamageFound || false;
        setDamageChecks({
            hail: !!data.hailDamageDetails || !!data.hailSizeFound,
            wind: !!data.windDamageDetails,
            flashing: data.flashingCondition === "damaged" || data.flashingCondition === "replace",
            gutter: data.gutterCondition === "damaged" || data.gutterCondition === "replace",
            deck: data.deckingCondition === "damaged" || data.deckingCondition === "replace",
        });

        setRoofField({
            condition: data.overallCondition || "good",
            hailSize: data.hailSizeFound || "",
            hitCount: data.overallDamageRating || "",
        });

        setFlashings({
            step: data.flashingCondition || "good",
            pipeBoots: "good",
        });

        setRidgeHip({ ridgeCap: "good", hipShingles: "good" });

        setGuttersState({
            condition: data.gutterCondition || "good",
            downspouts: "good",
        });

        setVentilation({
            ridgeVent: data.ventilationType?.includes("ridge") || false,
            soffitVent: data.ventilationType?.includes("soffit") || false,
            boxVents: data.ventilationType?.includes("box") || false,
            recommendation: "",
        });

        setDecking({
            condition: data.deckingCondition || "Good",
            softSpots: "0",
            replacementSq: "0",
        });

        // Recommendation
        const est = (data.estimateStatus || "").toLowerCase();
        if (est.includes("replace")) setRecommendation("full_replacement");
        else if (est.includes("repair")) setRecommendation("partial_repair");
    };

    // ---------- Save ----------
    const handleSave = async (isComplete = false) => {
        if (!inspection) return;
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                inspectorNotes,
                overallCondition: roofField.condition,
                hailSizeFound: roofField.hailSize,
                overallDamageRating: roofField.hitCount || (damageChecks.hail ? "HIGH" : damageChecks.wind ? "MODERATE" : "LOW"),
                flashingCondition: flashings.step,
                gutterCondition: guttersState.condition,
                deckingCondition: decking.condition,
                stormDamageFound: damageChecks.hail || damageChecks.wind,
                windDamageDetails: damageChecks.wind ? "Wind damage observed" : null,
                hailDamageDetails: damageChecks.hail ? `Hail size: ${roofField.hailSize}` : null,
                totalSquares: measurements.totalSquares ? parseFloat(measurements.totalSquares) : null,
                roofPitch: measurements.pitch || null,
                ridgeLength: measurements.hipRidge ? parseFloat(measurements.hipRidge) : null,
                valleyLength: measurements.valley ? parseFloat(measurements.valley) : null,
                eaveLength: measurements.eavesRakes ? parseFloat(measurements.eavesRakes) : null,
                ventilationType: [
                    ventilation.ridgeVent ? "ridge" : null,
                    ventilation.soffitVent ? "soffit" : null,
                    ventilation.boxVents ? "box" : null,
                ].filter(Boolean).join(", ") || null,
                estimateStatus: isComplete ? "completed" : "pending",
            };

            await updateInspection(inspection.leadId, inspection.id, payload);
            toast({
                title: isComplete ? "Report Completed" : "Report Saved",
                description: isComplete ? "Inspection report marked as complete." : "Inspection report has been saved.",
            });
        } catch (err) {
            toast({ title: "Error", description: "Failed to save inspection.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    // ---------- Loading State ----------
    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1E40AF] mb-3" />
                    <p className="text-gray-500">Loading inspection...</p>
                </div>
            </div>
        );
    }

    if (!inspection) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
                <div className="text-center">
                    <ClipboardList size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Inspection not found</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate("/inspections")}>
                        Back to Inspections
                    </Button>
                </div>
            </div>
        );
    }

    const severity = getSeverityFromRating(inspection.overallDamageRating);

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            {/* Top Header Bar */}
            <header className="crm-module-header bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-gray-500 hover:text-gray-900 gap-1.5"
                            onClick={() => navigate("/inspections")}
                        >
                            <ArrowLeft size={16} />
                            Back
                        </Button>
                        <div className="h-6 w-px bg-gray-200" />
                        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList size={20} className="text-[#1E40AF]" />
                            Inspection Report
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg gap-1.5 border-gray-200"
                            onClick={() => handleSave(false)}
                            disabled={saving}
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            <span className="hidden sm:inline">Save Draft</span>
                        </Button>
                        <Button
                            size="sm"
                            className="rounded-lg gap-1.5 bg-[#16A34A] hover:bg-[#16A34A]/90 text-white"
                            onClick={() => handleSave(true)}
                            disabled={saving}
                        >
                            <CheckCircle2 size={14} />
                            <span className="hidden sm:inline">Complete</span>
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg gap-1.5 border-gray-200">
                            <Share2 size={14} />
                            <span className="hidden sm:inline">Share</span>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 mb-6">
                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                        {/* Customer Info */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <Avatar className="h-14 w-14">
                                    <AvatarFallback className="bg-[#1E40AF] text-white text-lg font-bold">
                                        {customer.initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>
                                    <p className="text-xs text-gray-400">Lead Customer</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {customer.phone && (
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <Phone size={15} className="text-gray-400" />
                                        <a href={`tel:${customer.phone}`} className="text-gray-700 hover:text-[#1E40AF]">{customer.phone}</a>
                                    </div>
                                )}
                                {customer.email && (
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <Mail size={15} className="text-gray-400" />
                                        <a href={`mailto:${customer.email}`} className="text-gray-700 hover:text-[#1E40AF]">{customer.email}</a>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-start gap-2.5 text-sm">
                                        <MapPin size={15} className="text-gray-400 mt-0.5" />
                                        <span className="text-gray-700">{customer.address}</span>
                                    </div>
                                )}
                                {(customer.insurance || customer.claimNumber) && (
                                    <>
                                        <div className="h-px bg-gray-100 my-2" />
                                        {customer.insurance && (
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <Building2 size={15} className="text-gray-400" />
                                                <span className="text-gray-700">{customer.insurance}</span>
                                            </div>
                                        )}
                                        {customer.claimNumber && (
                                            <div className="flex items-center gap-2.5 text-sm">
                                                <FileText size={15} className="text-gray-400" />
                                                <span className="text-gray-700">Claim# {customer.claimNumber}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>

                        {/* Damage Summary */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
                        >
                            <h3 className="font-semibold text-gray-900 mb-3">Damage Summary</h3>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-sm text-gray-600">Severity:</span>
                                <Badge style={{ backgroundColor: severity.bgColor, color: severity.color }} className="font-semibold rounded-lg hover:opacity-90">
                                    {severity.label === "HIGH" ? "🔴" : severity.label === "MODERATE" ? "🟡" : "🟢"} {severity.label}
                                </Badge>
                            </div>
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-500">Damage Rating</span>
                                    <span className="text-xs font-semibold text-gray-700">{severity.score}/10</span>
                                </div>
                                <Progress value={severity.score * 10} className="h-2 rounded-full" />
                            </div>
                            <div className="space-y-2.5">
                                {[
                                    { key: "hail" as const, label: "Hail Damage" },
                                    { key: "wind" as const, label: "Wind Damage" },
                                    { key: "flashing" as const, label: "Flashing Damage" },
                                    { key: "gutter" as const, label: "Gutter Damage" },
                                    { key: "deck" as const, label: "Deck Damage" },
                                ].map((item) => (
                                    <label
                                        key={item.key}
                                        className="flex items-center gap-2.5 cursor-pointer"
                                        onClick={() => setDamageChecks(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${damageChecks[item.key] ? "bg-[#16A34A] border-[#16A34A]" : "bg-white border-gray-300"}`}>
                                            {damageChecks[item.key] && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                        <span className={`text-sm ${damageChecks[item.key] ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                                            {item.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                        {/* Inspection Details */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
                        >
                            <h3 className="font-semibold text-gray-900 mb-4">Inspection Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-400 mb-1">Inspector</p>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="bg-blue-100 text-[#1E40AF] text-xs font-medium">
                                                {getInitials(inspDetails.inspector)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-gray-900">{inspDetails.inspector}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-400 mb-1">Date & Time</p>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-gray-400" />
                                        <span className="text-sm font-medium text-gray-900">
                                            {inspDetails.date}{inspDetails.time ? ` | ${inspDetails.time}` : ""}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-400 mb-1">Weather</p>
                                    <div className="flex items-center gap-1.5">
                                        <Sun size={14} className="text-yellow-500" />
                                        <span className="text-sm font-medium text-gray-900">{inspDetails.weather || "Not recorded"}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-400 mb-1">Type</p>
                                    <div className="flex items-center gap-1.5">
                                        <CloudLightning size={14} className="text-yellow-600" />
                                        <span className="text-sm font-medium text-gray-900">{inspDetails.cause || "General"}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Roof Measurements */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Roof Measurements</h3>
                                <div className="flex gap-1">
                                    {[
                                        { id: "eagleview", label: "📷 EagleView" },
                                        { id: "hover", label: "📡 Hover" },
                                        { id: "manual", label: "✏️ Manual" },
                                    ].map((src) => (
                                        <button
                                            key={src.id}
                                            onClick={() => setMeasurementSource(src.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${measurementSource === src.id
                                                ? "bg-[#1E40AF] text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                        >
                                            {src.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                    { key: "totalSquares", label: "Total Squares", suffix: "sq" },
                                    { key: "pitch", label: "Pitch", suffix: "" },
                                    { key: "stories", label: "Stories", suffix: "" },
                                    { key: "predominant", label: "Predominant", suffix: "sq" },
                                    { key: "hipRidge", label: "Hip/Ridge", suffix: "LF" },
                                    { key: "valley", label: "Valley", suffix: "LF" },
                                    { key: "eavesRakes", label: "Eaves/Rakes", suffix: "LF" },
                                    { key: "flashing", label: "Flashing", suffix: "LF" },
                                    { key: "gutters", label: "Gutters", suffix: "LF" },
                                ].map((field) => (
                                    <div key={field.key}>
                                        <Label className="text-xs text-gray-500 mb-1">{field.label}</Label>
                                        <div className="relative">
                                            <Input
                                                value={measurements[field.key as keyof typeof measurements]}
                                                onChange={(e) => setMeasurements(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                className="h-9 rounded-lg border-gray-200 text-sm pr-8"
                                            />
                                            {field.suffix && (
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                                    {field.suffix}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* FULL WIDTH: Damage Assessment */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                >
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Damage Assessment</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Card 1: Roof Field */}
                        <SectionCard title="ROOF FIELD" icon="🏠">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Shingles Condition</Label>
                                    <RadioGroup name="roof-condition" options={[{ value: "good", label: "Good" }, { value: "damaged", label: "Damaged" }, { value: "replace", label: "Replace" }]} value={roofField.condition} onChange={(v) => setRoofField(p => ({ ...p, condition: v }))} />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1">Hail Size</Label>
                                    <Input value={roofField.hailSize} onChange={(e) => setRoofField(p => ({ ...p, hailSize: e.target.value }))} className="h-8 rounded-lg border-gray-200 text-sm" placeholder="e.g. 1.5 inch" />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1">Hit Count</Label>
                                    <Input value={roofField.hitCount} onChange={(e) => setRoofField(p => ({ ...p, hitCount: e.target.value }))} className="h-8 rounded-lg border-gray-200 text-sm" placeholder="e.g. HIGH" />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Card 2: Flashings */}
                        <SectionCard title="FLASHINGS" icon="📐">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Step Flashing</Label>
                                    <RadioGroup name="step-flashing" options={[{ value: "good", label: "Good" }, { value: "damaged", label: "Damaged" }, { value: "replace", label: "Replace" }]} value={flashings.step} onChange={(v) => setFlashings(p => ({ ...p, step: v }))} />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Pipe Boots</Label>
                                    <RadioGroup name="pipe-boots" options={[{ value: "good", label: "Good" }, { value: "replace_all", label: "Replace All" }]} value={flashings.pipeBoots} onChange={(v) => setFlashings(p => ({ ...p, pipeBoots: v }))} />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Card 3: Ridge/Hip */}
                        <SectionCard title="RIDGE/HIP" icon="🏔️">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Ridge Cap</Label>
                                    <RadioGroup name="ridge-cap" options={[{ value: "good", label: "Good" }, { value: "damaged", label: "Damaged" }, { value: "replace", label: "Replace" }]} value={ridgeHip.ridgeCap} onChange={(v) => setRidgeHip(p => ({ ...p, ridgeCap: v }))} />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Hip Shingles</Label>
                                    <RadioGroup name="hip-shingles" options={[{ value: "good", label: "Good" }, { value: "replace", label: "Replace" }]} value={ridgeHip.hipShingles} onChange={(v) => setRidgeHip(p => ({ ...p, hipShingles: v }))} />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Card 4: Gutters */}
                        <SectionCard title="GUTTERS" icon="💧">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Condition</Label>
                                    <RadioGroup name="gutter-condition" options={[{ value: "replace", label: "Replace" }, { value: "repair", label: "Repair" }, { value: "clean_only", label: "Clean Only" }]} value={guttersState.condition} onChange={(v) => setGuttersState(p => ({ ...p, condition: v }))} />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Downspouts</Label>
                                    <RadioGroup name="downspouts" options={[{ value: "replace_all", label: "Replace All" }, { value: "repair", label: "Repair" }]} value={guttersState.downspouts} onChange={(v) => setGuttersState(p => ({ ...p, downspouts: v }))} />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Card 5: Ventilation */}
                        <SectionCard title="VENTILATION" icon="🌡️">
                            <div className="space-y-3">
                                {[
                                    { label: "Ridge Vent", key: "ridgeVent" as const },
                                    { label: "Soffit Vent", key: "soffitVent" as const },
                                    { label: "Box Vents", key: "boxVents" as const },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{item.label}</span>
                                        <Switch checked={ventilation[item.key]} onCheckedChange={(val) => setVentilation(p => ({ ...p, [item.key]: val }))} />
                                    </div>
                                ))}
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1">Recommendation</Label>
                                    <Input value={ventilation.recommendation} onChange={(e) => setVentilation(p => ({ ...p, recommendation: e.target.value }))} className="h-8 rounded-lg border-gray-200 text-sm" placeholder="e.g. Add Ridge Vent" />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Card 6: Decking */}
                        <SectionCard title="DECKING" icon="🪵">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1">Decking Condition</Label>
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-lg">{decking.condition}</Badge>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1">Soft Spots</Label>
                                    <Input type="number" value={decking.softSpots} onChange={(e) => setDecking(p => ({ ...p, softSpots: e.target.value }))} className="h-8 rounded-lg border-gray-200 text-sm w-24" />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1">Replacement Squares</Label>
                                    <Input type="number" value={decking.replacementSq} onChange={(e) => setDecking(p => ({ ...p, replacementSq: e.target.value }))} className="h-8 rounded-lg border-gray-200 text-sm w-24" />
                                </div>
                            </div>
                        </SectionCard>
                    </div>
                </motion.div>

                {/* PHOTOS SECTION */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">📸 Photos</h3>
                        <Button variant="outline" size="sm" className="rounded-lg gap-1.5 border-gray-200">
                            <Camera size={14} /> Upload Photos
                        </Button>
                    </div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Before / Damage Photos</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {["Overall View", "Hail Damage", "Flashing Damage", "Close-up"].map((label) => (
                            <div key={label} className="group relative aspect-square bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center overflow-hidden hover:border-[#1E40AF]/30 transition-colors cursor-pointer">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                    <Camera size={20} className="text-gray-400" />
                                </div>
                                <span className="text-xs text-gray-500 text-center px-2">{label}</span>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"><Eye size={14} className="text-gray-700" /></button>
                                    <button className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"><Trash2 size={14} className="text-red-500" /></button>
                                </div>
                            </div>
                        ))}
                        <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#1E40AF] hover:bg-blue-50/30 transition-colors">
                            <Plus size={24} className="text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Add Photo</span>
                        </div>
                    </div>
                </motion.div>

                {/* INSPECTOR NOTES */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6"
                >
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">📝 Inspector Notes</h3>
                    <div className="relative">
                        <Textarea
                            value={inspectorNotes}
                            onChange={(e) => setInspectorNotes(e.target.value)}
                            className="min-h-[120px] rounded-lg border-gray-200 text-sm resize-y"
                            maxLength={2000}
                        />
                        <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                            {inspectorNotes.length}/2000
                        </span>
                    </div>
                    <div className="mt-5">
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">Recommendation:</Label>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { value: "full_replacement", label: "Full Replacement" },
                                { value: "partial_repair", label: "Partial Repair" },
                                { value: "no_action", label: "No Action" },
                            ].map((opt) => (
                                <label
                                    key={opt.value}
                                    className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl text-sm font-medium text-center cursor-pointer transition-all border-2 ${recommendation === opt.value
                                        ? "border-[#1E40AF] bg-blue-50 text-[#1E40AF]"
                                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                        }`}
                                >
                                    <input type="radio" name="recommendation" value={opt.value} checked={recommendation === opt.value} onChange={() => setRecommendation(opt.value)} className="sr-only" />
                                    {recommendation === opt.value && "● "}{opt.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* ACTION BUTTONS */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap items-center gap-3"
                >
                    <Button className="rounded-xl bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white gap-2 px-6"
                        onClick={() => navigate("/roof-estimator")}
                    >
                        Generate Estimate <ArrowRight size={16} />
                    </Button>
                    <Button variant="outline" className="rounded-xl gap-2 border-gray-200 px-6">
                        <Calendar size={16} /> Schedule Adjuster Meeting
                    </Button>
                    <Button variant="ghost" className="rounded-xl text-gray-600" onClick={() => handleSave(false)} disabled={saving}>
                        {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                        Save Report
                    </Button>
                    <Button variant="link" className="text-gray-400 hover:text-gray-600" onClick={() => navigate("/inspections")}>
                        Cancel
                    </Button>
                </motion.div>
            </div>
        </div>
    );
};

export default InspectionDetail;
