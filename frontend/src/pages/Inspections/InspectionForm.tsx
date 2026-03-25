import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    ArrowLeft,
    Save,
    CheckCircle2,
    ClipboardList,
    Camera,
    Plus,
    ArrowRight,
    Calendar,
    Loader2,
    Users,
    Search,
} from "lucide-react";
import api from "@/lib/axios";
import { createInspection } from "@/features/leads/services/inspections-service";

// ============================================
// TYPES
// ============================================

interface LeadOption {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    insurance: string;
    claimNumber: string;
}

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
                <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} className="sr-only" />
                <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${value === opt.value ? "border-[#1E40AF]" : "border-gray-300"}`}>
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
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
}) => (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
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
// MAIN COMPONENT
// ============================================

const InspectionForm = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Leads
    const [leads, setLeads] = useState<LeadOption[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [selectedLeadId, setSelectedLeadId] = useState("");
    const [leadSearch, setLeadSearch] = useState("");
    const [saving, setSaving] = useState(false);

    // Form fields
    const [inspectorName, setInspectorName] = useState("");
    const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().slice(0, 16));
    const [inspectionType, setInspectionType] = useState("Initial");
    const [weatherConditions, setWeatherConditions] = useState("");
    const [accessMethod, setAccessMethod] = useState("Ladder");

    // Measurements
    const [measurements, setMeasurements] = useState({
        totalSquares: "", pitch: "", stories: "", predominant: "",
        hipRidge: "", valley: "", eavesRakes: "", flashing: "", gutters: "",
    });

    // Damage
    const [overallCondition, setOverallCondition] = useState("good");
    const [hailSize, setHailSize] = useState("");
    const [hitCount, setHitCount] = useState("");
    const [flashingCond, setFlashingCond] = useState("good");
    const [gutterCond, setGutterCond] = useState("good");
    const [deckingCond, setDeckingCond] = useState("good");
    const [ventilation, setVentilation] = useState({ ridgeVent: false, soffitVent: false, boxVents: false, recommendation: "" });
    const [damageChecks, setDamageChecks] = useState({ hail: false, wind: false, flashing: false, gutter: false, deck: false });
    const [inspectorNotes, setInspectorNotes] = useState("");
    const [recommendation, setRecommendation] = useState("full_replacement");

    // Load leads
    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const res = await api.get("/leads", { params: { limit: 200 } });
                const data = res.data?.data || [];
                setLeads(data.map((l: any) => ({
                    id: l.id,
                    name: `${l.firstName || ""} ${l.lastName || ""}`.trim() || "Unnamed",
                    email: l.email || "",
                    phone: l.phone || "",
                    address: [l.propertyAddress, l.city, l.state, l.zipCode].filter(Boolean).join(", "),
                    insurance: l.insuranceCompanyName || "",
                    claimNumber: l.claimNumber || "",
                })));
            } catch {
                toast({ title: "Error", description: "Failed to load leads.", variant: "destructive" });
            } finally {
                setLoadingLeads(false);
            }
        };
        fetchLeads();

        // Pre-fill inspector from localStorage
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            if (user.firstName) setInspectorName(`${user.firstName} ${user.lastName || ""}`.trim());
        } catch { /* ignore */ }
    }, []);

    const filteredLeads = leadSearch
        ? leads.filter(l => l.name.toLowerCase().includes(leadSearch.toLowerCase()) || l.address.toLowerCase().includes(leadSearch.toLowerCase()))
        : leads;

    const selectedLead = leads.find(l => l.id === selectedLeadId);

    // Submit
    const handleSubmit = async (isDraft = true) => {
        if (!selectedLeadId) {
            toast({ title: "Select a Lead", description: "Please select a lead/customer for this inspection.", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                inspectorName,
                inspectionDate: inspectionDate ? new Date(inspectionDate).toISOString() : null,
                inspectionType,
                weatherConditions: weatherConditions || null,
                accessMethod: accessMethod || null,
                overallCondition,
                hailSizeFound: hailSize || null,
                overallDamageRating: hitCount || (damageChecks.hail ? "HIGH" : damageChecks.wind ? "MODERATE" : "LOW"),
                flashingCondition: flashingCond,
                gutterCondition: gutterCond,
                deckingCondition: deckingCond,
                stormDamageFound: damageChecks.hail || damageChecks.wind,
                windDamageDetails: damageChecks.wind ? "Wind damage observed" : null,
                hailDamageDetails: damageChecks.hail ? `Hail size: ${hailSize}` : null,
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
                inspectorNotes: inspectorNotes || null,
                estimateStatus: isDraft ? "pending" : "completed",
            };

            const result = await createInspection(selectedLeadId, payload);
            toast({
                title: isDraft ? "Inspection Saved" : "Inspection Completed",
                description: `Inspection for ${selectedLead?.name || "customer"} ${isDraft ? "saved as draft" : "marked as complete"}.`,
            });
            navigate(`/inspections/${result.id}`);
        } catch (err) {
            toast({ title: "Error", description: "Failed to create inspection.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            {/* Header */}
            <header className="crm-module-header bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="rounded-lg text-gray-500 hover:text-gray-900 gap-1.5" onClick={() => navigate("/inspections")}>
                            <ArrowLeft size={16} /> Back
                        </Button>
                        <div className="h-6 w-px bg-gray-200" />
                        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList size={20} className="text-[#1E40AF]" />
                            New Inspection
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg gap-1.5 border-gray-200" onClick={() => handleSubmit(true)} disabled={saving}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            <span className="hidden sm:inline">Save Draft</span>
                        </Button>
                        <Button size="sm" className="rounded-lg gap-1.5 bg-[#16A34A] hover:bg-[#16A34A]/90 text-white" onClick={() => handleSubmit(false)} disabled={saving}>
                            <CheckCircle2 size={14} />
                            <span className="hidden sm:inline">Save & Complete</span>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
                {/* STEP 1: Select Lead */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <Users size={18} className="text-[#1E40AF]" />
                        Select Customer / Lead
                    </h3>
                    {loadingLeads ? (
                        <div className="flex items-center gap-2 py-4"><Loader2 className="w-5 h-5 animate-spin text-[#1E40AF]" /><span className="text-gray-500 text-sm">Loading leads...</span></div>
                    ) : (
                        <>
                            <div className="relative mb-3">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} placeholder="Search leads by name or address..." className="pl-9 h-10 rounded-lg border-gray-200" />
                            </div>
                            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                                {filteredLeads.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">No leads found</p>
                                ) : filteredLeads.slice(0, 20).map((lead) => (
                                    <label
                                        key={lead.id}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selectedLeadId === lead.id ? "bg-blue-50 border-l-2 border-l-[#1E40AF]" : "hover:bg-gray-50"}`}
                                        onClick={() => setSelectedLeadId(lead.id)}
                                    >
                                        <input type="radio" name="lead" value={lead.id} checked={selectedLeadId === lead.id} onChange={() => setSelectedLeadId(lead.id)} className="sr-only" />
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarFallback className="bg-blue-100 text-[#1E40AF] text-xs font-medium">
                                                {lead.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{lead.address || lead.email || lead.phone}</p>
                                        </div>
                                        {selectedLeadId === lead.id && <CheckCircle2 size={16} className="text-[#1E40AF] flex-shrink-0" />}
                                    </label>
                                ))}
                            </div>
                            {selectedLead && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-xs text-[#1E40AF] font-medium">Selected: {selectedLead.name}</p>
                                    {selectedLead.address && <p className="text-xs text-gray-600 mt-0.5">{selectedLead.address}</p>}
                                    {selectedLead.insurance && <p className="text-xs text-gray-600 mt-0.5">Insurance: {selectedLead.insurance} — Claim# {selectedLead.claimNumber}</p>}
                                </div>
                            )}
                        </>
                    )}
                </motion.div>

                {/* STEP 2: Inspection Details */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Inspection Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-xs text-gray-500 mb-1">Inspector Name</Label>
                            <Input value={inspectorName} onChange={e => setInspectorName(e.target.value)} className="h-9 rounded-lg border-gray-200 text-sm" placeholder="Enter name" />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500 mb-1">Date & Time</Label>
                            <Input type="datetime-local" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} className="h-9 rounded-lg border-gray-200 text-sm" />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500 mb-1">Inspection Type</Label>
                            <Select value={inspectionType} onValueChange={setInspectionType}>
                                <SelectTrigger className="h-9 rounded-lg border-gray-200 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    <SelectItem value="Initial" className="rounded-lg">Initial</SelectItem>
                                    <SelectItem value="Follow-up" className="rounded-lg">Follow-up</SelectItem>
                                    <SelectItem value="Re-inspection" className="rounded-lg">Re-inspection</SelectItem>
                                    <SelectItem value="Storm Damage" className="rounded-lg">Storm Damage</SelectItem>
                                    <SelectItem value="Maintenance" className="rounded-lg">Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500 mb-1">Weather</Label>
                            <Input value={weatherConditions} onChange={e => setWeatherConditions(e.target.value)} className="h-9 rounded-lg border-gray-200 text-sm" placeholder="e.g. Sunny, 72°F" />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500 mb-1">Access Method</Label>
                            <Select value={accessMethod} onValueChange={setAccessMethod}>
                                <SelectTrigger className="h-9 rounded-lg border-gray-200 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    <SelectItem value="Ladder" className="rounded-lg">Ladder</SelectItem>
                                    <SelectItem value="Drone" className="rounded-lg">Drone</SelectItem>
                                    <SelectItem value="Binoculars" className="rounded-lg">Binoculars</SelectItem>
                                    <SelectItem value="Walk-on" className="rounded-lg">Walk-on</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </motion.div>

                {/* STEP 3: Roof Measurements */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Roof Measurements</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                                        placeholder="0"
                                    />
                                    {field.suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{field.suffix}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* STEP 4: Damage Assessment */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Damage Assessment</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <SectionCard title="ROOF FIELD" icon="🏠">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Shingles Condition</Label>
                                    <RadioGroup name="roof-cond" options={[{ value: "good", label: "Good" }, { value: "damaged", label: "Damaged" }, { value: "replace", label: "Replace" }]} value={overallCondition} onChange={setOverallCondition} />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1">Hail Size</Label>
                                    <Input value={hailSize} onChange={e => setHailSize(e.target.value)} className="h-8 rounded-lg border-gray-200 text-sm" placeholder="e.g. 1.5 inch" />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1">Hit Count</Label>
                                    <Input value={hitCount} onChange={e => setHitCount(e.target.value)} className="h-8 rounded-lg border-gray-200 text-sm" placeholder="e.g. HIGH" />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="FLASHINGS" icon="📐">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Step Flashing</Label>
                                    <RadioGroup name="flash-cond" options={[{ value: "good", label: "Good" }, { value: "damaged", label: "Damaged" }, { value: "replace", label: "Replace" }]} value={flashingCond} onChange={setFlashingCond} />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="GUTTERS" icon="💧">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Condition</Label>
                                    <RadioGroup name="gutter-cond" options={[{ value: "good", label: "Good" }, { value: "replace", label: "Replace" }, { value: "repair", label: "Repair" }]} value={gutterCond} onChange={setGutterCond} />
                                </div>
                            </div>
                        </SectionCard>

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

                        <SectionCard title="DECKING" icon="🪵">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-1.5 block">Condition</Label>
                                    <RadioGroup name="deck-cond" options={[{ value: "good", label: "Good" }, { value: "damaged", label: "Damaged" }, { value: "replace", label: "Replace" }]} value={deckingCond} onChange={setDeckingCond} />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Damage Checklist */}
                        <SectionCard title="DAMAGE TYPES" icon="⚡">
                            <div className="space-y-2.5">
                                {[
                                    { key: "hail" as const, label: "Hail Damage" },
                                    { key: "wind" as const, label: "Wind Damage" },
                                    { key: "flashing" as const, label: "Flashing Damage" },
                                    { key: "gutter" as const, label: "Gutter Damage" },
                                    { key: "deck" as const, label: "Deck Damage" },
                                ].map((item) => (
                                    <label key={item.key} className="flex items-center gap-2.5 cursor-pointer" onClick={() => setDamageChecks(prev => ({ ...prev, [item.key]: !prev[item.key] }))}>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${damageChecks[item.key] ? "bg-[#16A34A] border-[#16A34A]" : "bg-white border-gray-300"}`}>
                                            {damageChecks[item.key] && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                        <span className={`text-sm ${damageChecks[item.key] ? "text-gray-900 font-medium" : "text-gray-500"}`}>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </SectionCard>
                    </div>
                </motion.div>

                {/* STEP 5: Notes & Recommendation */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">📝 Inspector Notes</h3>
                    <Textarea
                        value={inspectorNotes}
                        onChange={(e) => setInspectorNotes(e.target.value)}
                        className="min-h-[120px] rounded-lg border-gray-200 text-sm resize-y"
                        maxLength={2000}
                        placeholder="Describe your findings, observations, and recommendations..."
                    />
                    <span className="text-xs text-gray-400 mt-1 block text-right">{inspectorNotes.length}/2000</span>
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

                {/* Action Buttons */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap items-center gap-3">
                    <Button className="rounded-xl bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white gap-2 px-6" onClick={() => handleSubmit(false)} disabled={saving}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Save & Complete
                    </Button>
                    <Button variant="outline" className="rounded-xl gap-2 border-gray-200 px-6" onClick={() => handleSubmit(true)} disabled={saving}>
                        <Save size={14} /> Save as Draft
                    </Button>
                    <Button variant="link" className="text-gray-400 hover:text-gray-600" onClick={() => navigate("/inspections")}>
                        Cancel
                    </Button>
                </motion.div>
            </div>
        </div>
    );
};

export default InspectionForm;
