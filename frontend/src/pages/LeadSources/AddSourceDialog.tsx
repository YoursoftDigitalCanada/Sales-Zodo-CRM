// src/pages/LeadSources/AddSourceDialog.tsx
import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
    Phone, Mail, Chrome, UserPlus, Share2, Presentation, MapPin, Globe,
    ArrowLeft, ArrowRight, Check, Loader2, Zap, Users, Sparkles, Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { defaultIntegrationConfig } from "./config/types";
import ReferralConfig from "./config/ReferralConfig";
import TradeShowConfig from "./config/TradeShowConfig";
import WebsiteConfig from "./config/WebsiteConfig";
import GoogleAdsConfig from "./config/GoogleAdsConfig";
import SocialMediaConfig from "./config/SocialMediaConfig";
import EmailCampaignConfig from "./config/EmailCampaignConfig";

interface SourceTypeOption {
    type: string; name: string; category: string; icon: string; color: string; description: string; method: string;
}
interface Props { isOpen: boolean; onClose: () => void; onCreated: () => void; }

const iconMap: Record<string, React.ElementType> = { Phone, Mail, Chrome, UserPlus, Share2, Presentation, MapPin, Globe };

// Types that need type-specific config (Step 2b)
const typesWithConfig = ["REFERRAL", "TRADE_SHOW", "WEBSITE", "GOOGLE_ADS", "SOCIAL_MEDIA", "EMAIL_CAMPAIGN"];

const AddSourceDialog = ({ isOpen, onClose, onCreated }: Props) => {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [sourceTypes, setSourceTypes] = useState<SourceTypeOption[]>([]);
    const [selectedType, setSelectedType] = useState<SourceTypeOption | null>(null);
    const [saving, setSaving] = useState(false);
    const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

    const [formData, setFormData] = useState<any>({
        name: "", description: "",
        autoAssign: false, assignmentMethod: "MANUAL_ASSIGN", assignedUserId: "",
        sendWelcomeEmail: false, createFollowupTask: true, followupDelayMinutes: 30, notifyAssignee: true,
        costPerLead: "", monthlyBudget: "",
        integrationConfig: {},
    });

    // Total steps: always 5 (select, basic+type, assignment, automation, review)
    const totalSteps = 5;

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedType(null);
            setFormData({
                name: "", description: "",
                autoAssign: false, assignmentMethod: "MANUAL_ASSIGN", assignedUserId: "",
                sendWelcomeEmail: false, createFollowupTask: true, followupDelayMinutes: 30, notifyAssignee: true,
                costPerLead: "", monthlyBudget: "",
                integrationConfig: {},
            });
            api.get("/lead-sources/types").then((res) => setSourceTypes(res.data?.data || [])).catch(() => setSourceTypes([]));
            import("@/features/users").then(({ getEmployees }) => {
                getEmployees().then((emps: any[]) => {
                    setEmployees(emps.map((emp: any) => ({
                        id: emp.id,
                        name: `${emp.user?.firstName || ""} ${emp.user?.lastName || ""}`.trim() || "Employee",
                    })));
                }).catch(() => setEmployees([]));
            }).catch(() => { });
        }
    }, [isOpen]);

    const handleSelectType = (type: SourceTypeOption) => {
        setSelectedType(type);
        setFormData((prev: any) => ({
            ...prev,
            name: `${type.name} - Main`,
            integrationConfig: defaultIntegrationConfig[type.type] || {},
        }));
    };

    const handleSubmit = async () => {
        if (!selectedType) return;
        setSaving(true);
        try {
            const payload: Record<string, any> = {
                name: formData.name || `${selectedType.name} Source`,
                description: formData.description || undefined,
                sourceType: selectedType.type,
                category: selectedType.category,
                icon: selectedType.icon,
                color: selectedType.color,
                autoAssign: formData.autoAssign,
                assignmentMethod: formData.assignmentMethod,
                assignedUserId: formData.assignedUserId || undefined,
                sendWelcomeEmail: formData.sendWelcomeEmail,
                createFollowupTask: formData.createFollowupTask,
                followupDelayMinutes: formData.followupDelayMinutes,
                notifyAssignee: formData.notifyAssignee,
                costPerLead: formData.costPerLead ? parseFloat(formData.costPerLead) : undefined,
                monthlyBudget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : undefined,
                integrationConfig: formData.integrationConfig,
            };
            if (["WEBSITE", "EMAIL_CAMPAIGN"].includes(selectedType.type)) {
                payload.integrationStatus = "CONNECTED";
            }
            await api.post("/lead-sources", payload);
            toast({ title: "Source Created", description: `"${payload.name}" has been added successfully.` });
            onCreated();
        } catch (error: any) {
            toast({ title: "Error", description: error?.response?.data?.message || "Failed to create source", variant: "destructive" });
        } finally { setSaving(false); }
    };

    const canProceed = () => {
        if (step === 1) return !!selectedType;
        if (step === 2) return formData.name.trim().length > 0;
        return true;
    };

    const stepLabels = ["Select Source Type", "Configure Source", "Assignment Rules", "Automation", "Review & Create"];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[720px] p-0 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-[rgba(15,23,42,0.06)] bg-gradient-to-r from-[#F0EEFF] to-white sticky top-0 z-10">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[#0F172A]">Add Lead Source</DialogTitle>
                        <DialogDescription className="text-[#94A3B8]">
                            Step {step} of {totalSteps} — {stepLabels[step - 1]}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-1.5 mt-4">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div key={i} className={cn("h-1.5 rounded-full flex-1 transition-colors duration-300", i < step ? "bg-[#6637F4]" : "bg-[#E2E8F0]")} />
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {/* ── STEP 1: Select Type ─────────────────────── */}
                        {step === 1 && (
                            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <div><h3 className="font-semibold text-[#0F172A] mb-1">Choose Source Type</h3><p className="text-sm text-[#475569]">Select the type of lead source you want to add.</p></div>
                                {["DIGITAL", "MANUAL"].map((cat) => {
                                    const catSources = sourceTypes.filter((s) => s.category === cat);
                                    if (catSources.length === 0) return null;
                                    return (
                                        <div key={cat}>
                                            <h4 className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold mb-2">{cat === "DIGITAL" ? "🌐 Digital Sources" : "📋 Manual Sources"}</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {catSources.map((type) => {
                                                    const Icon = iconMap[type.icon] || Globe;
                                                    const isSelected = selectedType?.type === type.type;
                                                    return (
                                                        <motion.button key={type.type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleSelectType(type)}
                                                            className={cn("flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all", isSelected ? "border-[#6637F4] bg-[#F0EEFF] shadow-sm" : "border-[rgba(15,23,42,0.06)] hover:border-[#CBD5E1] bg-white")}>
                                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${type.color}15` }}>
                                                                <Icon size={18} style={{ color: type.color }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-sm text-[#0F172A]">{type.name}</p>
                                                                <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-2">{type.description}</p>
                                                                <p className="text-[10px] text-[#6637F4] mt-1 font-medium">{type.method}</p>
                                                            </div>
                                                            {isSelected && <Check size={18} className="text-[#6637F4] flex-shrink-0 mt-0.5" />}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}

                        {/* ── STEP 2: Basic Info + Type-Specific Config ── */}
                        {step === 2 && selectedType && (
                            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                                {/* Selected type badge */}
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F7F7FB] border border-[rgba(15,23,42,0.06)]">
                                    {(() => { const Icon = iconMap[selectedType.icon] || Globe; return <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${selectedType.color}15` }}><Icon size={22} style={{ color: selectedType.color }} /></div>; })()}
                                    <div><p className="font-semibold text-[#0F172A]">{selectedType.name}</p><p className="text-xs text-[#94A3B8]">{selectedType.method}</p></div>
                                </div>
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[#475569]">Source Name <span className="text-red-500">*</span></Label>
                                    <Input value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} placeholder={`${selectedType.name} - Main`} className="h-11 rounded-xl" />
                                    <p className="text-xs text-[#94A3B8]">Give it a descriptive name, e.g. "Facebook - Houston Ads"</p>
                                </div>
                                {/* Description */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[#475569]">Description (optional)</Label>
                                    <Textarea value={formData.description} onChange={(e: any) => setFormData({ ...formData, description: e.target.value })} placeholder="What is this source for?" rows={2} className="rounded-xl resize-none" />
                                </div>
                                {/* Cost (only for simple types) */}
                                {!["GOOGLE_ADS", "SOCIAL_MEDIA"].includes(selectedType.type) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label className="text-sm text-[#475569]">Cost Per Lead ($)</Label><Input type="number" value={formData.costPerLead} onChange={(e: any) => setFormData({ ...formData, costPerLead: e.target.value })} placeholder="0.00" className="h-11 rounded-xl" /></div>
                                        <div className="space-y-2"><Label className="text-sm text-[#475569]">Monthly Budget ($)</Label><Input type="number" value={formData.monthlyBudget} onChange={(e: any) => setFormData({ ...formData, monthlyBudget: e.target.value })} placeholder="0.00" className="h-11 rounded-xl" /></div>
                                    </div>
                                )}
                                {/* Type-specific config */}
                                {selectedType.type === "REFERRAL" && <ReferralConfig formData={formData} setFormData={setFormData} />}
                                {selectedType.type === "TRADE_SHOW" && <TradeShowConfig formData={formData} setFormData={setFormData} />}
                                {selectedType.type === "WEBSITE" && <WebsiteConfig formData={formData} setFormData={setFormData} />}
                                {selectedType.type === "GOOGLE_ADS" && <GoogleAdsConfig formData={formData} setFormData={setFormData} />}
                                {selectedType.type === "SOCIAL_MEDIA" && <SocialMediaConfig formData={formData} setFormData={setFormData} />}
                                {selectedType.type === "EMAIL_CAMPAIGN" && <EmailCampaignConfig formData={formData} setFormData={setFormData} />}
                            </motion.div>
                        )}

                        {/* ── STEP 3: Assignment ─────────────────────── */}
                        {step === 3 && (
                            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div><h3 className="font-semibold text-[#0F172A] mb-1 flex items-center gap-2"><Users size={16} className="text-[#6637F4]" />Lead Assignment</h3><p className="text-sm text-[#475569] mb-4">How should new leads be assigned?</p></div>
                                <div className="flex items-center justify-between p-4 bg-[#F7F7FB] rounded-xl mb-3">
                                    <div><p className="font-medium text-sm text-[#0F172A]">Auto-Assign Leads</p><p className="text-xs text-[#94A3B8]">Automatically assign leads when they arrive</p></div>
                                    <Checkbox checked={formData.autoAssign} onCheckedChange={(c: any) => setFormData({ ...formData, autoAssign: c as boolean })} className="border-slate-300 data-[state=checked]:bg-[#6637F4]" />
                                </div>
                                {formData.autoAssign && (
                                    <div className="space-y-3 pl-4 border-l-2 border-[#6637F4]/20">
                                        <div className="space-y-2"><Label className="text-sm text-[#475569]">Method</Label>
                                            <Select value={formData.assignmentMethod} onValueChange={(val: string) => setFormData({ ...formData, assignmentMethod: val })}>
                                                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="MANUAL_ASSIGN" className="rounded-lg">Manual (specific person)</SelectItem>
                                                    <SelectItem value="ROUND_ROBIN" className="rounded-lg">Round Robin</SelectItem>
                                                    <SelectItem value="LOAD_BALANCE" className="rounded-lg">Load Balanced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {formData.assignmentMethod === "MANUAL_ASSIGN" && (
                                            <div className="space-y-2"><Label className="text-sm text-[#475569]">Assign To</Label>
                                                <Select value={formData.assignedUserId} onValueChange={(val: string) => setFormData({ ...formData, assignedUserId: val })}>
                                                    <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select employee" /></SelectTrigger>
                                                    <SelectContent className="rounded-xl">{employees.map((e) => <SelectItem key={e.id} value={e.id} className="rounded-lg">{e.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── STEP 4: Automation ─────────────────────── */}
                        {step === 4 && (
                            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <div><h3 className="font-semibold text-[#0F172A] mb-1 flex items-center gap-2"><Sparkles size={16} className="text-[#D97706]" />Automation</h3><p className="text-sm text-[#475569] mb-4">What should happen when a new lead arrives?</p></div>
                                {[
                                    { key: "sendWelcomeEmail", icon: Mail, label: "Send Welcome Email", desc: "Automatically email new leads" },
                                    { key: "createFollowupTask", icon: Shield, label: "Create Follow-Up Task", desc: `Schedule a follow-up after ${formData.followupDelayMinutes} min` },
                                    { key: "notifyAssignee", icon: Zap, label: "Notify Assigned Rep", desc: "Send notifications via email & in-app" },
                                ].map(({ key, icon: Ic, label, desc }) => (
                                    <div key={key} className="flex items-center justify-between p-3 bg-[#F7F7FB] rounded-xl">
                                        <div className="flex items-center gap-3"><Ic size={16} className="text-[#475569]" /><div><p className="text-sm font-medium text-[#0F172A]">{label}</p><p className="text-xs text-[#94A3B8]">{desc}</p></div></div>
                                        <Checkbox checked={(formData as any)[key]} onCheckedChange={(c: any) => setFormData({ ...formData, [key]: c as boolean })} className="border-slate-300 data-[state=checked]:bg-[#6637F4]" />
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* ── STEP 5: Review ─────────────────────────── */}
                        {step === 5 && selectedType && (
                            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <h3 className="font-semibold text-[#0F172A]">Review & Create</h3>
                                <div className="rounded-xl border border-[rgba(15,23,42,0.06)] divide-y divide-[rgba(15,23,42,0.06)]">
                                    <div className="p-4 flex items-center gap-3">
                                        {(() => { const Icon = iconMap[selectedType.icon] || Globe; return <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedType.color}15` }}><Icon size={18} style={{ color: selectedType.color }} /></div>; })()}
                                        <div><p className="font-semibold text-[#0F172A]">{formData.name}</p><p className="text-xs text-[#94A3B8]">{selectedType.name} • {selectedType.category === "DIGITAL" ? "Digital" : "Manual"}</p></div>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-y-3 text-sm">
                                        <div><p className="text-[#94A3B8] text-xs">Integration</p><p className="text-[#0F172A] font-medium">{selectedType.method}</p></div>
                                        <div><p className="text-[#94A3B8] text-xs">Auto-Assign</p><p className="text-[#0F172A] font-medium">{formData.autoAssign ? "Yes" : "No"}</p></div>
                                        <div><p className="text-[#94A3B8] text-xs">Welcome Email</p><p className="text-[#0F172A] font-medium">{formData.sendWelcomeEmail ? "Yes" : "No"}</p></div>
                                        <div><p className="text-[#94A3B8] text-xs">Follow-Up Task</p><p className="text-[#0F172A] font-medium">{formData.createFollowupTask ? "Yes" : "No"}</p></div>
                                        {formData.costPerLead && <div><p className="text-[#94A3B8] text-xs">Cost Per Lead</p><p className="text-[#0F172A] font-medium">${formData.costPerLead}</p></div>}
                                        {formData.monthlyBudget && <div><p className="text-[#94A3B8] text-xs">Monthly Budget</p><p className="text-[#0F172A] font-medium">${formData.monthlyBudget}</p></div>}
                                    </div>
                                    {formData.description && <div className="p-4"><p className="text-[#94A3B8] text-xs mb-1">Description</p><p className="text-sm text-[#475569]">{formData.description}</p></div>}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(15,23,42,0.06)]">
                        <Button variant="outline" onClick={() => (step > 1 ? setStep(step - 1) : onClose())} className="rounded-xl">
                            {step > 1 ? <><ArrowLeft size={14} className="mr-1.5" /> Back</> : "Cancel"}
                        </Button>
                        {step < totalSteps ? (
                            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-xl">
                                Next <ArrowRight size={14} className="ml-1.5" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={saving} className="bg-[#6637F4] hover:bg-[#6637F4]/90 text-white rounded-xl min-w-[140px]">
                                {saving ? <><Loader2 size={14} className="mr-2 animate-spin" /> Creating...</> : <><Check size={14} className="mr-2" /> Create Source</>}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddSourceDialog;
