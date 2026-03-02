/**
 * Materials & Labor Rates Management Panel
 *
 * CRUD interface for managing supplier pricing database (RoofMaterial)
 * and tenant-configurable labor rates (RoofLaborRate).
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    Loader2,
    Package,
    Hammer,
    Plus,
    Trash2,
    Pencil,
    DollarSign,
    Save,
    X,
} from "lucide-react";
import type {
    RoofMaterial,
    RoofLaborRate,
} from "@/features/roof-estimator/services/roof-estimator-service";
import {
    getMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getLaborRates,
    createLaborRate,
    updateLaborRate,
    deleteLaborRate,
} from "@/features/roof-estimator/services/roof-estimator-service";

// ── Constants ────────────────────────────────────────────────────────────

const MATERIAL_CATEGORIES = [
    "shingles", "underlayment", "starter", "ridge_cap", "drip_edge",
    "ice_water_shield", "flashing", "nails", "ventilation", "pipe_boot",
    "sealant", "other",
];

const UNITS = ["bundle", "roll", "piece", "linear_ft", "sq_ft", "box", "tube", "each"];

const RATE_TYPES = [
    { value: "per_sqft", label: "Per Sq Ft" },
    { value: "per_square", label: "Per Square (100 sqft)" },
    { value: "per_hour", label: "Per Hour" },
    { value: "flat", label: "Flat Rate" },
];

const fmtCurrency = (v: number) => `$${v.toFixed(2)}`;

// ── Component ────────────────────────────────────────────────────────────

const MaterialsLaborPanel: React.FC = () => {
    const { toast } = useToast();

    // Tab
    const [tab, setTab] = useState<"materials" | "labor">("materials");

    // Materials state
    const [materials, setMaterials] = useState<RoofMaterial[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [showMaterialForm, setShowMaterialForm] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<RoofMaterial | null>(null);
    const [materialForm, setMaterialForm] = useState({
        name: "", category: "shingles", unit: "bundle",
        coveragePerUnit: 33.3, defaultPrice: 0, supplier: "", sku: "",
    });
    const [savingMaterial, setSavingMaterial] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>("all");

    // Labor rates state
    const [laborRates, setLaborRates] = useState<RoofLaborRate[]>([]);
    const [loadingRates, setLoadingRates] = useState(false);
    const [showRateForm, setShowRateForm] = useState(false);
    const [editingRate, setEditingRate] = useState<RoofLaborRate | null>(null);
    const [rateForm, setRateForm] = useState({
        description: "", rateType: "per_sqft", rate: 0, condition: "",
    });
    const [savingRate, setSavingRate] = useState(false);

    // ── Load data ────────────────────────────────────────────────────────

    const loadMaterials = useCallback(async () => {
        setLoadingMaterials(true);
        try {
            const data = await getMaterials();
            setMaterials(data);
        } catch { /* ignore */ }
        finally { setLoadingMaterials(false); }
    }, []);

    const loadRates = useCallback(async () => {
        setLoadingRates(true);
        try {
            const data = await getLaborRates();
            setLaborRates(data);
        } catch { /* ignore */ }
        finally { setLoadingRates(false); }
    }, []);

    useEffect(() => {
        loadMaterials();
        loadRates();
    }, [loadMaterials, loadRates]);

    // ── Material handlers ────────────────────────────────────────────────

    const openMaterialForm = (mat?: RoofMaterial) => {
        if (mat) {
            setEditingMaterial(mat);
            setMaterialForm({
                name: mat.name, category: mat.category, unit: mat.unit,
                coveragePerUnit: mat.coveragePerUnit, defaultPrice: mat.defaultPrice,
                supplier: mat.supplier || "", sku: mat.sku || "",
            });
        } else {
            setEditingMaterial(null);
            setMaterialForm({
                name: "", category: "shingles", unit: "bundle",
                coveragePerUnit: 33.3, defaultPrice: 0, supplier: "", sku: "",
            });
        }
        setShowMaterialForm(true);
    };

    const handleSaveMaterial = async () => {
        if (!materialForm.name.trim()) {
            toast({ title: "Name required", variant: "destructive" });
            return;
        }
        setSavingMaterial(true);
        try {
            if (editingMaterial) {
                await updateMaterial(editingMaterial.id, materialForm);
                toast({ title: "Material updated" });
            } else {
                await createMaterial(materialForm);
                toast({ title: "Material added" });
            }
            setShowMaterialForm(false);
            loadMaterials();
        } catch (err: any) {
            toast({ title: "Save failed", description: err?.response?.data?.message || err.message, variant: "destructive" });
        } finally {
            setSavingMaterial(false);
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        try {
            await deleteMaterial(id);
            toast({ title: "Material deleted" });
            loadMaterials();
        } catch {
            toast({ title: "Delete failed", variant: "destructive" });
        }
    };

    // ── Labor rate handlers ──────────────────────────────────────────────

    const openRateForm = (rate?: RoofLaborRate) => {
        if (rate) {
            setEditingRate(rate);
            setRateForm({
                description: rate.description, rateType: rate.rateType,
                rate: rate.rate, condition: rate.condition || "",
            });
        } else {
            setEditingRate(null);
            setRateForm({ description: "", rateType: "per_sqft", rate: 0, condition: "" });
        }
        setShowRateForm(true);
    };

    const handleSaveRate = async () => {
        if (!rateForm.description.trim()) {
            toast({ title: "Description required", variant: "destructive" });
            return;
        }
        setSavingRate(true);
        try {
            if (editingRate) {
                await updateLaborRate(editingRate.id, rateForm);
                toast({ title: "Labor rate updated" });
            } else {
                await createLaborRate(rateForm);
                toast({ title: "Labor rate added" });
            }
            setShowRateForm(false);
            loadRates();
        } catch (err: any) {
            toast({ title: "Save failed", description: err?.response?.data?.message || err.message, variant: "destructive" });
        } finally {
            setSavingRate(false);
        }
    };

    const handleDeleteRate = async (id: string) => {
        try {
            await deleteLaborRate(id);
            toast({ title: "Rate deleted" });
            loadRates();
        } catch {
            toast({ title: "Delete failed", variant: "destructive" });
        }
    };

    // ── Filtered materials ───────────────────────────────────────────────

    const filtered = filterCategory === "all"
        ? materials
        : materials.filter(m => m.category === filterCategory);

    // ── Render ───────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Tab switcher */}
            <div className="flex bg-[#F1F5F9] rounded-lg p-1 gap-0.5">
                <button
                    onClick={() => setTab("materials")}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium transition-all",
                        tab === "materials" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#64748B] hover:text-[#334155]"
                    )}
                >
                    <Package className="w-3.5 h-3.5" /> Supplier Materials ({materials.length})
                </button>
                <button
                    onClick={() => setTab("labor")}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium transition-all",
                        tab === "labor" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#64748B] hover:text-[#334155]"
                    )}
                >
                    <Hammer className="w-3.5 h-3.5" /> Labor Rates ({laborRates.length})
                </button>
            </div>

            <AnimatePresence mode="wait">
                {/* ═══════════════════ MATERIALS ═══════════════════ */}
                {tab === "materials" && (
                    <motion.div key="materials" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-4">
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="h-8 w-[180px] text-xs">
                                    <SelectValue placeholder="All categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {MATERIAL_CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => openMaterialForm()} className="h-8 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white text-xs">
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Material
                            </Button>
                        </div>

                        {/* Table */}
                        {loadingMaterials ? (
                            <div className="flex items-center justify-center py-12 text-sm text-[#94A3B8]">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading materials...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12 text-sm text-[#94A3B8]">
                                <Package className="w-10 h-10 mx-auto mb-3 text-[#CBD5E1]" />
                                <p>No materials yet. Add your first material to get started.</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#F8FAFC]">
                                            <TableHead className="text-[10px] font-semibold text-[#64748B]">Material</TableHead>
                                            <TableHead className="text-[10px] font-semibold text-[#64748B]">Category</TableHead>
                                            <TableHead className="text-[10px] font-semibold text-[#64748B] text-right">Coverage</TableHead>
                                            <TableHead className="text-[10px] font-semibold text-[#64748B] text-right">Price</TableHead>
                                            <TableHead className="text-[10px] font-semibold text-[#64748B] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map(mat => (
                                            <TableRow key={mat.id} className="text-xs">
                                                <TableCell className="py-2">
                                                    <div>
                                                        <p className="font-medium text-[#334155]">{mat.name}</p>
                                                        {mat.supplier && <p className="text-[10px] text-[#94A3B8]">{mat.supplier}{mat.sku ? ` · ${mat.sku}` : ""}</p>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {mat.category.replace(/_/g, " ")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-[#475569]">
                                                    {mat.coveragePerUnit} {mat.unit === "bundle" ? "sqft/bdl" : mat.unit}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-[#0F172A]">
                                                    {fmtCurrency(mat.defaultPrice)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => openMaterialForm(mat)} className="h-7 w-7 p-0 text-[#64748B] hover:text-[#0891B2]">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => handleDeleteMaterial(mat.id)} className="h-7 w-7 p-0 text-[#64748B] hover:text-red-500">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ═══════════════════ LABOR RATES ═══════════════════ */}
                {tab === "labor" && (
                    <motion.div key="labor" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                        <div className="flex items-center justify-end mb-4">
                            <Button size="sm" onClick={() => openRateForm()} className="h-8 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white text-xs">
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Labor Rate
                            </Button>
                        </div>

                        {loadingRates ? (
                            <div className="flex items-center justify-center py-12 text-sm text-[#94A3B8]">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading rates...
                            </div>
                        ) : laborRates.length === 0 ? (
                            <div className="text-center py-12 text-sm text-[#94A3B8]">
                                <Hammer className="w-10 h-10 mx-auto mb-3 text-[#CBD5E1]" />
                                <p>No labor rates configured. Add rates to customize your labor costing.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {laborRates.map(rate => (
                                    <div key={rate.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[rgba(15,23,42,0.06)] hover:border-[#0891B2]/20 transition-all">
                                        <div>
                                            <p className="text-sm font-medium text-[#334155]">{rate.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[10px]">
                                                    {RATE_TYPES.find(rt => rt.value === rate.rateType)?.label || rate.rateType}
                                                </Badge>
                                                {rate.condition && (
                                                    <span className="text-[10px] text-[#94A3B8]">When: {rate.condition}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-base font-bold text-[#0891B2]">{fmtCurrency(rate.rate)}</span>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => openRateForm(rate)} className="h-7 w-7 p-0 text-[#64748B] hover:text-[#0891B2]">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteRate(rate.id)} className="h-7 w-7 p-0 text-[#64748B] hover:text-red-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════ MATERIAL FORM DIALOG ═══════════════════ */}
            <Dialog open={showMaterialForm} onOpenChange={setShowMaterialForm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingMaterial ? "Edit Material" : "Add Material"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <Label className="text-xs text-[#64748B]">Material Name *</Label>
                            <Input
                                value={materialForm.name}
                                onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                                placeholder="e.g. IKO Cambridge 30-year"
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-[#64748B]">Category</Label>
                                <Select value={materialForm.category} onValueChange={(v) => setMaterialForm({ ...materialForm, category: v })}>
                                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {MATERIAL_CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-[#64748B]">Unit</Label>
                                <Select value={materialForm.unit} onValueChange={(v) => setMaterialForm({ ...materialForm, unit: v })}>
                                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {UNITS.map(u => (
                                            <SelectItem key={u} value={u}>{u.replace(/_/g, " ")}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-[#64748B]">Coverage per Unit</Label>
                                <Input
                                    type="number" step="0.1" min={0}
                                    value={materialForm.coveragePerUnit}
                                    onChange={(e) => setMaterialForm({ ...materialForm, coveragePerUnit: parseFloat(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-[#64748B]">Default Price ($)</Label>
                                <Input
                                    type="number" step="0.01" min={0}
                                    value={materialForm.defaultPrice}
                                    onChange={(e) => setMaterialForm({ ...materialForm, defaultPrice: parseFloat(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-[#64748B]">Supplier</Label>
                                <Input
                                    value={materialForm.supplier}
                                    onChange={(e) => setMaterialForm({ ...materialForm, supplier: e.target.value })}
                                    placeholder="e.g. Home Depot"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-[#64748B]">SKU</Label>
                                <Input
                                    value={materialForm.sku}
                                    onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })}
                                    placeholder="Optional"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <Button onClick={handleSaveMaterial} disabled={savingMaterial} className="w-full bg-[#0891B2] hover:bg-[#0891B2]/90 text-white">
                            {savingMaterial ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {editingMaterial ? "Update Material" : "Add Material"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════ LABOR RATE FORM DIALOG ═══════════════════ */}
            <Dialog open={showRateForm} onOpenChange={setShowRateForm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingRate ? "Edit Labor Rate" : "Add Labor Rate"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <Label className="text-xs text-[#64748B]">Description *</Label>
                            <Input
                                value={rateForm.description}
                                onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                                placeholder="e.g. Asphalt shingle install"
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-[#64748B]">Rate Type</Label>
                                <Select value={rateForm.rateType} onValueChange={(v) => setRateForm({ ...rateForm, rateType: v })}>
                                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {RATE_TYPES.map(rt => (
                                            <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-[#64748B]">Rate ($)</Label>
                                <Input
                                    type="number" step="0.01" min={0}
                                    value={rateForm.rate}
                                    onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-[#64748B]">Condition (optional)</Label>
                            <Input
                                value={rateForm.condition}
                                onChange={(e) => setRateForm({ ...rateForm, condition: e.target.value })}
                                placeholder="e.g. pitch > 8/12, 2+ stories"
                                className="mt-1"
                            />
                        </div>
                        <Button onClick={handleSaveRate} disabled={savingRate} className="w-full bg-[#0891B2] hover:bg-[#0891B2]/90 text-white">
                            {savingRate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {editingRate ? "Update Rate" : "Add Rate"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MaterialsLaborPanel;
