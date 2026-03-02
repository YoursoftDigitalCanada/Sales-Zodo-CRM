/**
 * Manual Entry Panel
 *
 * Allows users to manually enter roof dimensions and pitch
 * for properties where satellite/AI detection isn't available
 * (new builds, heavily shaded areas, etc.)
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    Loader2,
    Ruler,
    MapPin,
    ArrowRight,
    Save,
    Search,
    CheckCircle2,
    Layers,
    Home,
} from "lucide-react";
import {
    manualEntry,
    autocompleteAddress,
    calculateArea,
} from "@/features/roof-estimator/services/roof-estimator-service";

interface ManualEntryPanelProps {
    clients: Array<{ id: string; clientName: string; companyName: string | null }>;
    onSaved: () => void;
}

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

const ManualEntryPanel: React.FC<ManualEntryPanelProps> = ({ clients, onSaved }) => {
    const { toast } = useToast();

    // Form state
    const [address, setAddress] = useState("");
    const [roofAreaSqft, setRoofAreaSqft] = useState<number>(0);
    const [pitch, setPitch] = useState("6/12");
    const [roofType, setRoofType] = useState("gable");
    const [stories, setStories] = useState(1);
    const [layers, setLayers] = useState(1);
    const [ridgeLengthFt, setRidgeLengthFt] = useState<number | undefined>();
    const [hipLengthFt, setHipLengthFt] = useState<number | undefined>();
    const [valleyLengthFt, setValleyLengthFt] = useState<number | undefined>();
    const [eaveLengthFt, setEaveLengthFt] = useState<number | undefined>();
    const [rakeLengthFt, setRakeLengthFt] = useState<number | undefined>();
    const [clientId, setClientId] = useState("");
    const [notes, setNotes] = useState("");

    // UI state
    const [saving, setSaving] = useState(false);
    const [trueArea, setTrueArea] = useState<number | null>(null);
    const [pitchDeg, setPitchDeg] = useState<number | null>(null);

    // Autocomplete
    const [suggestions, setSuggestions] = useState<Array<{ description: string; placeId: string }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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

    // Recalculate true area when pitch or area changes
    useEffect(() => {
        if (roofAreaSqft > 0 && pitch) {
            calculateArea(roofAreaSqft, pitch)
                .then((result) => {
                    setTrueArea(result.trueSurfaceAreaSqft);
                    setPitchDeg(result.pitchDegrees);
                })
                .catch(() => { });
        }
    }, [roofAreaSqft, pitch]);

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
                const results = await autocompleteAddress(value);
                setSuggestions(results);
                setShowSuggestions(results.length > 0);
            } catch {
                setSuggestions([]);
            }
        }, 300);
    }, []);

    const selectSuggestion = (description: string) => {
        setAddress(description);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleSubmit = async () => {
        if (!address.trim()) {
            toast({ title: "Address required", variant: "destructive" });
            return;
        }
        if (roofAreaSqft <= 0) {
            toast({ title: "Enter a valid roof area", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            await manualEntry({
                address: address.trim(),
                latitude: 0,
                longitude: 0,
                roofAreaSqft,
                pitch,
                roofType,
                stories,
                layers,
                ridgeLengthFt,
                hipLengthFt,
                valleyLengthFt,
                eaveLengthFt,
                rakeLengthFt,
                clientId: clientId || undefined,
                notes: notes || undefined,
            });
            toast({ title: "Manual estimate saved!", description: `${roofAreaSqft.toLocaleString()} sq ft at ${pitch} pitch` });
            // Reset form
            setAddress("");
            setRoofAreaSqft(0);
            setPitch("6/12");
            setRoofType("gable");
            setStories(1);
            setLayers(1);
            setRidgeLengthFt(undefined);
            setHipLengthFt(undefined);
            setValleyLengthFt(undefined);
            setEaveLengthFt(undefined);
            setRakeLengthFt(undefined);
            setClientId("");
            setNotes("");
            setTrueArea(null);
            onSaved();
        } catch (err: any) {
            toast({ title: "Save failed", description: err?.response?.data?.message || err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-3xl mx-auto"
        >
            <div className="bg-white rounded-xl border border-[rgba(15,23,42,0.06)] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-[rgba(15,23,42,0.06)] bg-gradient-to-r from-[#0891B2]/5 to-[#22D3EE]/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                            <Ruler className="w-5 h-5 text-[#0891B2]" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-[#0F172A]">Manual Roof Measurement</h2>
                            <p className="text-xs text-[#94A3B8] mt-0.5">Enter dimensions manually for new builds or shaded roofs</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Address */}
                    <div>
                        <Label className="text-xs font-medium text-[#475569] mb-1.5 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#0891B2]" /> Property Address *
                        </Label>
                        <div className="relative" ref={autocompleteRef}>
                            <div className="relative">
                                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <Input
                                    placeholder="e.g. 123 Main St, Toronto, ON"
                                    value={address}
                                    onChange={(e) => handleAddressChange(e.target.value)}
                                    className="pl-9 border-[rgba(15,23,42,0.1)] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20"
                                    autoComplete="off"
                                />
                            </div>
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-[rgba(15,23,42,0.1)] shadow-lg max-h-[200px] overflow-y-auto">
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
                    </div>

                    {/* Main measurements */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label className="text-xs font-medium text-[#475569] mb-1.5 flex items-center gap-1.5">
                                <Ruler className="w-3.5 h-3.5 text-[#0891B2]" /> Plan Area (sq ft) *
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                value={roofAreaSqft || ""}
                                onChange={(e) => setRoofAreaSqft(parseFloat(e.target.value) || 0)}
                                placeholder="e.g. 2400"
                                className="border-[rgba(15,23,42,0.1)]"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-medium text-[#475569] mb-1.5 block">Roof Pitch *</Label>
                            <Select value={pitch} onValueChange={setPitch}>
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PITCH_OPTIONS.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium text-[#475569] mb-1.5 flex items-center gap-1.5">
                                <Home className="w-3.5 h-3.5 text-[#0891B2]" /> Roof Type
                            </Label>
                            <Select value={roofType} onValueChange={setRoofType}>
                                <SelectTrigger className="h-10 text-sm">
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

                    {/* True surface area preview */}
                    {trueArea && roofAreaSqft > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-r from-[#0891B2]/5 to-[#22D3EE]/5 border border-[#0891B2]/15 rounded-lg p-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#0891B2]" />
                                    <span className="text-xs font-medium text-[#475569]">Pitch-Adjusted True Surface Area</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-[#0891B2]">{trueArea.toLocaleString()} sq ft</span>
                                    {pitchDeg !== null && (
                                        <span className="text-xs text-[#94A3B8] ml-2">({pitchDeg}° · {((trueArea / roofAreaSqft) * 100 - 100).toFixed(1)}% more)</span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Stories, layers */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs font-medium text-[#475569] mb-1.5 block">Stories</Label>
                            <Select value={String(stories)} onValueChange={(v) => setStories(Number(v))}>
                                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4].map(s => <SelectItem key={s} value={String(s)}>{s} story</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium text-[#475569] mb-1.5 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-[#0891B2]" /> Existing Layers
                            </Label>
                            <Select value={String(layers)} onValueChange={(v) => setLayers(Number(v))}>
                                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3].map(l => <SelectItem key={l} value={String(l)}>{l} layer{l > 1 ? "s" : ""}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Linear measurements (optional, collapsible) */}
                    <details className="group">
                        <summary className="text-xs font-medium text-[#0891B2] cursor-pointer hover:text-[#0891B2]/80 transition-colors">
                            ▸ Advanced: Linear Measurements (optional)
                        </summary>
                        <div className="mt-3 grid grid-cols-5 gap-3">
                            {[
                                { label: "Ridge", value: ridgeLengthFt, setter: setRidgeLengthFt },
                                { label: "Hip", value: hipLengthFt, setter: setHipLengthFt },
                                { label: "Valley", value: valleyLengthFt, setter: setValleyLengthFt },
                                { label: "Eave", value: eaveLengthFt, setter: setEaveLengthFt },
                                { label: "Rake", value: rakeLengthFt, setter: setRakeLengthFt },
                            ].map(({ label, value, setter }) => (
                                <div key={label}>
                                    <Label className="text-[10px] text-[#94A3B8] mb-1 block">{label} (ft)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={value ?? ""}
                                        onChange={(e) => setter(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        placeholder="auto"
                                        className="text-xs h-8 border-[rgba(15,23,42,0.1)]"
                                    />
                                </div>
                            ))}
                        </div>
                    </details>

                    {/* Client + Notes */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs font-medium text-[#475569] mb-1.5 block">Assign to Client</Label>
                            <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue placeholder="Select client (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {clients.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.clientName}{c.companyName ? ` (${c.companyName})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium text-[#475569] mb-1.5 block">Notes</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any notes about this property..."
                                rows={1}
                                className="text-xs min-h-[40px] border-[rgba(15,23,42,0.1)]"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <Button
                        onClick={handleSubmit}
                        disabled={saving || !address.trim() || roofAreaSqft <= 0}
                        className="w-full h-12 bg-gradient-to-r from-[#0891B2] to-[#06B6D4] hover:from-[#0891B2]/90 hover:to-[#06B6D4]/90 text-white font-semibold text-sm shadow-md"
                    >
                        {saving ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Estimate...</>
                        ) : (
                            <><Save className="w-4 h-4 mr-2" /> Save Manual Estimate</>
                        )}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default ManualEntryPanel;
