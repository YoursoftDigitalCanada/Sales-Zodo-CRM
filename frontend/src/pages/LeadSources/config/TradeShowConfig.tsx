import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, QrCode, ClipboardList, Target, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceConfigProps, usStates } from "./types";

const TradeShowConfig = ({ formData, setFormData }: SourceConfigProps) => {
    const cfg = formData.integrationConfig || {};
    const update = (key: string, val: any) =>
        setFormData({ ...formData, integrationConfig: { ...cfg, [key]: val } });

    return (
        <div className="space-y-6">
            {/* Event Details */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} className="text-[#F59E0B]" />
                    <h4 className="font-semibold text-sm text-[#0F172A]">Event Details</h4>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-sm text-[#475569]">Event/Trade Show Name <span className="text-red-500">*</span></Label>
                        <Input value={cfg.event_name || ""} onChange={(e) => update("event_name", e.target.value)} placeholder="Houston Home & Garden Show" className="h-10 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">Start Date <span className="text-red-500">*</span></Label>
                            <Input type="date" value={cfg.event_start_date || ""} onChange={(e) => update("event_start_date", e.target.value)} className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">End Date <span className="text-red-500">*</span></Label>
                            <Input type="date" value={cfg.event_end_date || ""} onChange={(e) => update("event_end_date", e.target.value)} className="h-10 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Location */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-[#6366F1]" />
                    <h4 className="font-semibold text-sm text-[#0F172A]">Event Location</h4>
                </div>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">Venue Name</Label>
                            <Input value={cfg.venue_name || ""} onChange={(e) => update("venue_name", e.target.value)} placeholder="NRG Center" className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">Address</Label>
                            <Input value={cfg.venue_address || ""} onChange={(e) => update("venue_address", e.target.value)} placeholder="1 NRG Park" className="h-10 rounded-xl" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">City</Label>
                            <Input value={cfg.venue_city || ""} onChange={(e) => update("venue_city", e.target.value)} placeholder="Houston" className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">State</Label>
                            <Select value={cfg.venue_state || ""} onValueChange={(v) => update("venue_state", v)}>
                                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="State" /></SelectTrigger>
                                <SelectContent className="rounded-xl max-h-60">
                                    {usStates.map((s) => <SelectItem key={s} value={s} className="rounded-lg">{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">Zip</Label>
                            <Input value={cfg.venue_zip || ""} onChange={(e) => update("venue_zip", e.target.value)} placeholder="77001" className="h-10 rounded-xl" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-sm text-[#475569]">Booth Number</Label>
                        <Input value={cfg.booth_number || ""} onChange={(e) => update("booth_number", e.target.value)} placeholder="A-123" className="h-10 rounded-xl" />
                        <p className="text-[10px] text-[#94A3B8]">Your booth or stand number at the event</p>
                    </div>
                </div>
            </div>

            {/* Collection Method */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <ClipboardList size={16} className="text-[#6637F4]" />
                    <h4 className="font-semibold text-sm text-[#0F172A]">Lead Collection Method</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { value: "manual", label: "Manual Entry", desc: "Staff enters leads during event", icon: "✏️" },
                        { value: "badge_scanner", label: "Badge Scanner Import", desc: "Import CSV after event", icon: "📡" },
                        { value: "qr_code", label: "QR Code Form", desc: "Attendees scan QR to fill form", icon: "📱" },
                        { value: "tablet_form", label: "Tablet Form", desc: "Leads fill form on your tablet", icon: "📋" },
                    ].map((opt) => (
                        <label
                            key={opt.value}
                            className={cn(
                                "flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                                cfg.collection_method === opt.value
                                    ? "bg-cyan-50 border-cyan-200"
                                    : "border-[rgba(15,23,42,0.06)] hover:bg-[#F7F7FB]"
                            )}
                        >
                            <input type="radio" name="collection" checked={cfg.collection_method === opt.value} onChange={() => update("collection_method", opt.value)} className="mt-1 accent-cyan-600" />
                            <div>
                                <p className="text-sm font-medium text-[#0F172A]">{opt.icon} {opt.label}</p>
                                <p className="text-[10px] text-[#94A3B8]">{opt.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>

                {cfg.collection_method === "qr_code" && (
                    <div className="mt-3 p-3 bg-cyan-50 rounded-xl text-xs text-cyan-700 space-y-1">
                        <p className="font-medium">A QR code and form URL will be generated after creation.</p>
                        <p>You'll be able to download the QR code and share the form link.</p>
                    </div>
                )}
                {cfg.collection_method === "badge_scanner" && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 space-y-1">
                        <p className="font-medium">After the event, import your badge scan CSV file.</p>
                        <p>Go to Import → Upload CSV to add leads in bulk.</p>
                    </div>
                )}
            </div>

            {/* Budget & Goals */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Target size={16} className="text-[#EC4899]" />
                        <h4 className="font-semibold text-sm text-[#0F172A]">Event Budget & Goals</h4>
                    </div>
                    <Checkbox
                        checked={cfg.track_budget || false}
                        onCheckedChange={(c) => update("track_budget", c)}
                        className="border-slate-300 data-[state=checked]:bg-[#6637F4]"
                    />
                </div>

                {cfg.track_budget && (
                    <div className="pl-4 border-l-2 border-[#EC4899]/20 space-y-3">
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">Total Event Cost ($)</Label>
                            <Input type="number" value={cfg.total_cost || ""} onChange={(e) => update("total_cost", e.target.value)} placeholder="5000.00" className="h-10 rounded-xl" />
                            <p className="text-[10px] text-[#94A3B8]">Booth fee, materials, travel, staff time</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-sm text-[#475569]">Lead Goal</Label>
                                <Input type="number" value={cfg.lead_goal || ""} onChange={(e) => update("lead_goal", e.target.value)} placeholder="100" className="h-10 rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm text-[#475569]">Revenue Goal ($)</Label>
                                <Input type="number" value={cfg.revenue_goal || ""} onChange={(e) => update("revenue_goal", e.target.value)} placeholder="50000.00" className="h-10 rounded-xl" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradeShowConfig;
