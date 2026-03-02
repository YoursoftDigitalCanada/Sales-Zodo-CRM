/**
 * Material Takeoff & Pricing Panel
 *
 * This component provides the full material takeoff, labor calculator,
 * scenario comparison, and pricing/markup UI. It's rendered as a panel
 * within the roof estimate detail view or as a standalone tab.
 */

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    Loader2,
    Package,
    Hammer,
    DollarSign,
    TrendingUp,
    Layers,
    Ruler,
    Trash2,
    Plus,
    BarChart3,
    ArrowRight,
    CheckCircle2,
    Snowflake,
    Wrench,
    Calculator,
} from "lucide-react";
import type {
    RoofEstimate,
    TakeoffResult,
    RoofTakeoff,
} from "@/features/roof-estimator/services/roof-estimator-service";
import {
    generateTakeoff,
    generateScenarios,
    getTakeoffsByEstimate,
    deleteTakeoff,
    calculateLabor,
    calculateTotal,
    calculateArea,
} from "@/features/roof-estimator/services/roof-estimator-service";

// ── Types ────────────────────────────────────────────────────────────────

interface TakeoffPanelProps {
    estimate: RoofEstimate;
    onUpdate?: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────

const MATERIAL_TYPES = [
    { value: "asphalt", label: "Asphalt Shingles", icon: "🏠", color: "bg-amber-50 text-amber-700" },
    { value: "metal", label: "Standing Seam Metal", icon: "🔩", color: "bg-slate-50 text-slate-700" },
    { value: "tile", label: "Concrete / Clay Tile", icon: "🧱", color: "bg-orange-50 text-orange-700" },
    { value: "tpo", label: "TPO Membrane (Flat)", icon: "📋", color: "bg-blue-50 text-blue-700" },
];

const PITCH_OPTIONS = [
    "0/12", "1/12", "2/12", "3/12", "4/12", "5/12", "6/12",
    "7/12", "8/12", "9/12", "10/12", "11/12", "12/12",
    "14/12", "16/12", "18/12",
];

const ROOF_TYPES = [
    { value: "gable", label: "Gable" },
    { value: "hip", label: "Hip" },
    { value: "flat", label: "Flat" },
    { value: "mansard", label: "Mansard" },
    { value: "gambrel", label: "Gambrel" },
    { value: "shed", label: "Shed" },
];

// ── Helpers ──────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) => `$${v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNumber = (v: number, decimals = 1) => v.toLocaleString("en-CA", { maximumFractionDigits: decimals });

// ── Component ────────────────────────────────────────────────────────────

const TakeoffPricingPanel: React.FC<TakeoffPanelProps> = ({ estimate, onUpdate }) => {
    const { toast } = useToast();

    // Tab state
    const [activeSubTab, setActiveSubTab] = useState<"measure" | "takeoff" | "price" | "compare">("measure");

    // Measure state
    const [pitch, setPitch] = useState(estimate.pitch || "6/12");
    const [roofType, setRoofType] = useState(estimate.roofType || "gable");
    const [stories, setStories] = useState(estimate.stories || 1);
    const [layers, setLayers] = useState(estimate.layers || 1);
    const [tearOff, setTearOff] = useState(estimate.tearOffRequired || false);
    const [trueArea, setTrueArea] = useState(estimate.trueSurfaceAreaSqft || estimate.roofAreaSqft);
    const [pitchDegrees, setPitchDegrees] = useState(estimate.pitchDegrees || 0);
    const [multiplier, setMultiplier] = useState(1);

    // Takeoff state
    const [selectedMaterialType, setSelectedMaterialType] = useState("asphalt");
    const [wasteFactor, setWasteFactor] = useState(10);
    const [markupPercent, setMarkupPercent] = useState(20);
    const [generatingTakeoff, setGeneratingTakeoff] = useState(false);
    const [currentTakeoff, setCurrentTakeoff] = useState<TakeoffResult | null>(null);

    // Scenario comparison
    const [selectedScenarios, setSelectedScenarios] = useState<string[]>(["asphalt", "metal"]);
    const [scenarioResults, setScenarioResults] = useState<TakeoffResult[]>([]);
    const [generatingScenarios, setGeneratingScenarios] = useState(false);

    // Saved takeoffs
    const [savedTakeoffs, setSavedTakeoffs] = useState<RoofTakeoff[]>([]);
    const [loadingTakeoffs, setLoadingTakeoffs] = useState(false);

    // Labor
    const [laborResult, setLaborResult] = useState<any>(null);
    const [loadingLabor, setLoadingLabor] = useState(false);

    // ── Effects ──────────────────────────────────────────────────────────

    useEffect(() => {
        loadSavedTakeoffs();
    }, [estimate.id]);

    useEffect(() => {
        handleCalculateArea();
    }, [pitch]);

    // ── Handlers ─────────────────────────────────────────────────────────

    const handleCalculateArea = useCallback(async () => {
        if (!pitch) return;
        try {
            const result = await calculateArea(estimate.roofAreaSqft, pitch);
            setTrueArea(result.trueSurfaceAreaSqft);
            setPitchDegrees(result.pitchDegrees);
            setMultiplier(result.multiplier);
        } catch {
            // silently fail; user can still manually enter
        }
    }, [estimate.roofAreaSqft, pitch]);

    const handleGenerateTakeoff = useCallback(async () => {
        setGeneratingTakeoff(true);
        try {
            const result = await generateTakeoff({
                estimateId: estimate.id,
                materialType: selectedMaterialType,
                wasteFactor,
                markupPercent,
            });
            setCurrentTakeoff(result);
            loadSavedTakeoffs();
            toast({ title: "Takeoff Generated", description: `${result.scenarioName}: ${fmtCurrency(result.totalPrice)} total` });
        } catch (err: any) {
            toast({ title: "Takeoff failed", description: err?.response?.data?.message || err.message, variant: "destructive" });
        } finally {
            setGeneratingTakeoff(false);
        }
    }, [estimate.id, selectedMaterialType, wasteFactor, markupPercent, toast]);

    const handleGenerateScenarios = useCallback(async () => {
        if (selectedScenarios.length < 2) {
            toast({ title: "Select at least 2 materials", variant: "destructive" });
            return;
        }
        setGeneratingScenarios(true);
        try {
            const results = await generateScenarios({
                estimateId: estimate.id,
                materialTypes: selectedScenarios,
                wasteFactor,
                markupPercent,
            });
            setScenarioResults(results);
            loadSavedTakeoffs();
            toast({ title: "Scenarios generated", description: `${results.length} scenarios compared` });
        } catch (err: any) {
            toast({ title: "Scenario gen failed", description: err?.response?.data?.message || err.message, variant: "destructive" });
        } finally {
            setGeneratingScenarios(false);
        }
    }, [estimate.id, selectedScenarios, wasteFactor, markupPercent, toast]);

    const handleCalculateLabor = useCallback(async () => {
        setLoadingLabor(true);
        try {
            const result = await calculateLabor({
                areaSqft: trueArea,
                pitch,
                stories,
                tearOff,
                layers,
                materialType: selectedMaterialType,
            });
            setLaborResult(result);
        } catch {
            toast({ title: "Labor calc failed", variant: "destructive" });
        } finally {
            setLoadingLabor(false);
        }
    }, [trueArea, pitch, stories, tearOff, layers, selectedMaterialType, toast]);

    const loadSavedTakeoffs = useCallback(async () => {
        setLoadingTakeoffs(true);
        try {
            const data = await getTakeoffsByEstimate(estimate.id);
            setSavedTakeoffs(data);
        } catch { /* ignore */ }
        finally { setLoadingTakeoffs(false); }
    }, [estimate.id]);

    const handleDeleteTakeoff = useCallback(async (id: string) => {
        try {
            await deleteTakeoff(id);
            toast({ title: "Takeoff deleted" });
            loadSavedTakeoffs();
        } catch {
            toast({ title: "Delete failed", variant: "destructive" });
        }
    }, [toast, loadSavedTakeoffs]);

    const toggleScenario = (type: string) => {
        setSelectedScenarios(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    // ── Sub-tabs ─────────────────────────────────────────────────────────

    const subTabs = [
        { id: "measure" as const, label: "Measure", icon: Ruler },
        { id: "takeoff" as const, label: "Takeoff", icon: Package },
        { id: "price" as const, label: "Price", icon: DollarSign },
        { id: "compare" as const, label: "Compare", icon: BarChart3 },
    ];

    return (
        <div className="space-y-4">
            {/* Sub-tab navigation */}
            <div className="flex bg-[#F1F5F9] rounded-lg p-1 gap-0.5">
                {subTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all",
                            activeSubTab === tab.id
                                ? "bg-white text-[#0891B2] shadow-sm"
                                : "text-[#64748B] hover:text-[#334155]"
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* ═══════════════════════════════════════════════════════════ */}
                {/* MEASURE TAB */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeSubTab === "measure" && (
                    <motion.div key="measure" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                        {/* Plan vs True Area */}
                        <div className="bg-gradient-to-r from-[#0891B2]/5 to-[#22D3EE]/5 rounded-lg p-4 border border-[#0891B2]/10">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-[#0F172A]">Roof Measurements</h4>
                                <Badge variant="outline" className="text-[10px]">
                                    {estimate.measurementSource === "manual" ? "Manual Entry" :
                                        estimate.measurementSource === "ai_photo" ? "AI Photo" :
                                            "AI Satellite"}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white rounded-md p-3 text-center border border-[rgba(15,23,42,0.06)]">
                                    <p className="text-[10px] text-[#94A3B8] mb-1">Plan Area</p>
                                    <p className="text-lg font-bold text-[#0F172A]">{fmtNumber(estimate.roofAreaSqft, 0)}</p>
                                    <p className="text-[10px] text-[#94A3B8]">sq ft</p>
                                </div>
                                <div className="bg-white rounded-md p-3 text-center border border-[#0891B2]/20">
                                    <p className="text-[10px] text-[#0891B2] mb-1">True Surface</p>
                                    <p className="text-lg font-bold text-[#0891B2]">{fmtNumber(trueArea, 0)}</p>
                                    <p className="text-[10px] text-[#94A3B8]">sq ft ({fmtNumber(multiplier, 3)}×)</p>
                                </div>
                                <div className="bg-white rounded-md p-3 text-center border border-[rgba(15,23,42,0.06)]">
                                    <p className="text-[10px] text-[#94A3B8] mb-1">Confidence</p>
                                    <p className="text-lg font-bold text-green-600">{estimate.confidence}%</p>
                                    <p className="text-[10px] text-[#94A3B8]">{estimate.aiModel}</p>
                                </div>
                            </div>
                        </div>

                        {/* Pitch & Roof Type selectors */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-[#64748B] mb-1.5 block">Roof Pitch</Label>
                                <Select value={pitch} onValueChange={setPitch}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PITCH_OPTIONS.map(p => (
                                            <SelectItem key={p} value={p}>{p} ({pitchDegrees && pitch === p ? `${pitchDegrees}°` : ""})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-[#64748B] mb-1.5 block">Roof Type</Label>
                                <Select value={roofType} onValueChange={setRoofType}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROOF_TYPES.map(rt => (
                                            <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs text-[#64748B] mb-1.5 block">Stories</Label>
                                <Select value={String(stories)} onValueChange={(v) => setStories(Number(v))}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4].map(s => (
                                            <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-[#64748B] mb-1.5 block">Existing Layers</Label>
                                <Select value={String(layers)} onValueChange={(v) => setLayers(Number(v))}>
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3].map(l => (
                                            <SelectItem key={l} value={String(l)}>{l} layer{l > 1 ? "s" : ""}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer p-2">
                                    <input
                                        type="checkbox"
                                        checked={tearOff}
                                        onChange={(e) => setTearOff(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]"
                                    />
                                    <span className="text-xs text-[#475569]">Tear-off needed</span>
                                </label>
                            </div>
                        </div>

                        <Button
                            onClick={() => setActiveSubTab("takeoff")}
                            className="w-full bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
                        >
                            Continue to Takeoff <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAKEOFF TAB */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeSubTab === "takeoff" && (
                    <motion.div key="takeoff" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                        {/* Material type selector */}
                        <div>
                            <Label className="text-xs text-[#64748B] mb-2 block">Material Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {MATERIAL_TYPES.map(mt => (
                                    <button
                                        key={mt.value}
                                        onClick={() => setSelectedMaterialType(mt.value)}
                                        className={cn(
                                            "p-3 rounded-lg border-2 text-left transition-all",
                                            selectedMaterialType === mt.value
                                                ? "border-[#0891B2] bg-[#0891B2]/5"
                                                : "border-transparent bg-[#F8FAFC] hover:bg-[#F1F5F9]"
                                        )}
                                    >
                                        <span className="text-lg mr-2">{mt.icon}</span>
                                        <span className="text-xs font-medium text-[#334155]">{mt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Waste factor slider */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label className="text-xs text-[#64748B]">Waste Factor</Label>
                                <Badge variant="outline" className="text-xs">{wasteFactor}%</Badge>
                            </div>
                            <Slider
                                value={[wasteFactor]}
                                onValueChange={([v]) => setWasteFactor(v)}
                                min={5}
                                max={30}
                                step={1}
                                className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                                <span>5% (simple)</span>
                                <span>15% (avg)</span>
                                <span>30% (complex)</span>
                            </div>
                        </div>

                        {/* Generate button */}
                        <Button
                            onClick={handleGenerateTakeoff}
                            disabled={generatingTakeoff}
                            className="w-full bg-[#0891B2] hover:bg-[#0891B2]/90 text-white font-medium"
                        >
                            {generatingTakeoff ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculating...</>
                            ) : (
                                <><Calculator className="w-4 h-4 mr-2" /> Generate Material Takeoff</>
                            )}
                        </Button>

                        {/* Takeoff results table */}
                        {currentTakeoff && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-[#0F172A]">{currentTakeoff.scenarioName}</h4>
                                    <Badge className="bg-[#0891B2]/10 text-[#0891B2] text-[10px]">
                                        {currentTakeoff.items.length} items
                                    </Badge>
                                </div>

                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-[#F8FAFC]">
                                                <TableHead className="text-[10px] font-semibold text-[#64748B]">Material</TableHead>
                                                <TableHead className="text-[10px] font-semibold text-[#64748B] text-right">Qty</TableHead>
                                                <TableHead className="text-[10px] font-semibold text-[#64748B] text-right">Unit $</TableHead>
                                                <TableHead className="text-[10px] font-semibold text-[#64748B] text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {currentTakeoff.items.map((item, i) => (
                                                <TableRow key={i} className="text-xs">
                                                    <TableCell className="py-2">
                                                        <div>
                                                            <p className="font-medium text-[#334155]">{item.description}</p>
                                                            <p className="text-[10px] text-[#94A3B8]">
                                                                {item.category} · +{item.wasteFactor}% waste
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-[#475569]">
                                                        {fmtNumber(item.totalQuantity, 0)} {item.unit}
                                                    </TableCell>
                                                    <TableCell className="text-right text-[#475569]">
                                                        {fmtCurrency(item.unitPrice)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-[#0F172A]">
                                                        {fmtCurrency(item.totalPrice)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Cost summary */}
                                <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-2 text-xs">
                                    <div className="flex justify-between text-[#64748B]">
                                        <span>Materials</span>
                                        <span>{fmtCurrency(currentTakeoff.materialCost)}</span>
                                    </div>
                                    <div className="flex justify-between text-[#64748B]">
                                        <span>Accessories</span>
                                        <span>{fmtCurrency(currentTakeoff.accessoryCost)}</span>
                                    </div>
                                    <div className="flex justify-between text-[#64748B]">
                                        <span>Labor ({fmtNumber(currentTakeoff.laborHours)} hrs)</span>
                                        <span>{fmtCurrency(currentTakeoff.laborCost)}</span>
                                    </div>
                                    {currentTakeoff.tearOffCost > 0 && (
                                        <div className="flex justify-between text-[#64748B]">
                                            <span>Tear-off</span>
                                            <span>{fmtCurrency(currentTakeoff.tearOffCost)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-[rgba(15,23,42,0.08)] pt-2 flex justify-between text-[#475569] font-medium">
                                        <span>Subtotal</span>
                                        <span>{fmtCurrency(currentTakeoff.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600 font-medium">
                                        <span>Profit ({currentTakeoff.markupPercent}% markup)</span>
                                        <span>+{fmtCurrency(currentTakeoff.profit)}</span>
                                    </div>
                                    <div className="border-t border-[rgba(15,23,42,0.08)] pt-2 flex justify-between text-[#0F172A] font-bold text-sm">
                                        <span>Total Price</span>
                                        <span>{fmtCurrency(currentTakeoff.totalPrice)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PRICE TAB */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeSubTab === "price" && (
                    <motion.div key="price" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                        {/* Markup slider */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    Markup & Profit
                                </h4>
                                <Badge variant="outline" className="text-xs bg-white">{markupPercent}%</Badge>
                            </div>
                            <Slider
                                value={[markupPercent]}
                                onValueChange={([v]) => setMarkupPercent(v)}
                                min={0}
                                max={60}
                                step={1}
                                className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                                <span>0% (cost)</span>
                                <span>20% (standard)</span>
                                <span>60% (premium)</span>
                            </div>
                        </div>

                        {/* Labor calculator */}
                        <div className="bg-white rounded-lg p-4 border border-[rgba(15,23,42,0.06)]">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                    <Hammer className="w-4 h-4 text-[#0891B2]" />
                                    Labor Calculator
                                </h4>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCalculateLabor}
                                    disabled={loadingLabor}
                                    className="h-7 text-xs"
                                >
                                    {loadingLabor ? <Loader2 className="w-3 h-3 animate-spin" /> : "Calculate"}
                                </Button>
                            </div>

                            {laborResult && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-[#F8FAFC] rounded-md p-2.5 text-center">
                                            <p className="text-[10px] text-[#94A3B8]">Crew Hours</p>
                                            <p className="text-sm font-bold text-[#0F172A]">{laborResult.crewHours}h</p>
                                        </div>
                                        <div className="bg-[#F8FAFC] rounded-md p-2.5 text-center">
                                            <p className="text-[10px] text-[#94A3B8]">Rate / sqft</p>
                                            <p className="text-sm font-bold text-[#0F172A]">{fmtCurrency(laborResult.laborRatePerSqft)}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between bg-[#F8FAFC] rounded-md p-2.5">
                                        <span className="text-[#64748B]">Install Labor</span>
                                        <span className="font-medium text-[#0F172A]">{fmtCurrency(laborResult.laborCost)}</span>
                                    </div>
                                    {laborResult.tearOff && (
                                        <div className="flex justify-between bg-orange-50 rounded-md p-2.5">
                                            <span className="text-orange-700">Tear-off + disposal</span>
                                            <span className="font-medium text-orange-700">{fmtCurrency(laborResult.tearOff.total)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between bg-[#0891B2]/5 rounded-md p-2.5 font-semibold">
                                        <span className="text-[#0891B2]">Total Labor</span>
                                        <span className="text-[#0891B2]">{fmtCurrency(laborResult.grossTotalLabor)}</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Saved takeoffs */}
                        {savedTakeoffs.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-[rgba(15,23,42,0.06)]">
                                <h4 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[#0891B2]" />
                                    Saved Takeoffs
                                </h4>
                                <div className="space-y-2">
                                    {savedTakeoffs.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded-md">
                                            <div>
                                                <p className="text-xs font-medium text-[#334155]">{t.scenarioName}</p>
                                                <p className="text-[10px] text-[#94A3B8]">
                                                    {t.items?.length || 0} items · {t.wasteFactor}% waste
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-[#0F172A]">{fmtCurrency(t.totalPrice || 0)}</span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteTakeoff(t.id)}
                                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* COMPARE TAB */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {activeSubTab === "compare" && (
                    <motion.div key="compare" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                        <div>
                            <Label className="text-xs text-[#64748B] mb-2 block">Select Materials to Compare</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {MATERIAL_TYPES.map(mt => (
                                    <button
                                        key={mt.value}
                                        onClick={() => toggleScenario(mt.value)}
                                        className={cn(
                                            "p-2.5 rounded-lg border-2 text-left text-xs transition-all flex items-center gap-2",
                                            selectedScenarios.includes(mt.value)
                                                ? "border-[#0891B2] bg-[#0891B2]/5"
                                                : "border-transparent bg-[#F8FAFC]"
                                        )}
                                    >
                                        {selectedScenarios.includes(mt.value) && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0891B2]" />
                                        )}
                                        <span>{mt.icon} {mt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button
                            onClick={handleGenerateScenarios}
                            disabled={generatingScenarios || selectedScenarios.length < 2}
                            className="w-full bg-[#0891B2] hover:bg-[#0891B2]/90 text-white font-medium"
                        >
                            {generatingScenarios ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Comparing...</>
                            ) : (
                                <><BarChart3 className="w-4 h-4 mr-2" /> Compare {selectedScenarios.length} Scenarios</>
                            )}
                        </Button>

                        {/* Scenario comparison cards */}
                        {scenarioResults.length > 0 && (
                            <div className="space-y-3">
                                {scenarioResults.map((s, i) => {
                                    const isLowest = s.totalPrice === Math.min(...scenarioResults.map(r => r.totalPrice));
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className={cn(
                                                "rounded-lg p-4 border-2 transition-all",
                                                isLowest ? "border-green-300 bg-green-50/50" : "border-[rgba(15,23,42,0.06)] bg-white"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-[#0F172A]">{s.scenarioName}</h4>
                                                    {isLowest && (
                                                        <Badge className="bg-green-100 text-green-700 text-[10px]">Best Value</Badge>
                                                    )}
                                                </div>
                                                <span className="text-lg font-bold text-[#0891B2]">{fmtCurrency(s.totalPrice)}</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                                                <div className="bg-[#F8FAFC] rounded p-1.5">
                                                    <p className="text-[#94A3B8]">Material</p>
                                                    <p className="font-semibold text-[#334155]">{fmtCurrency(s.materialCost)}</p>
                                                </div>
                                                <div className="bg-[#F8FAFC] rounded p-1.5">
                                                    <p className="text-[#94A3B8]">Labor</p>
                                                    <p className="font-semibold text-[#334155]">{fmtCurrency(s.laborCost)}</p>
                                                </div>
                                                <div className="bg-[#F8FAFC] rounded p-1.5">
                                                    <p className="text-[#94A3B8]">Profit</p>
                                                    <p className="font-semibold text-green-600">+{fmtCurrency(s.profit)}</p>
                                                </div>
                                                <div className="bg-[#F8FAFC] rounded p-1.5">
                                                    <p className="text-[#94A3B8]">Items</p>
                                                    <p className="font-semibold text-[#334155]">{s.items.length}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TakeoffPricingPanel;
