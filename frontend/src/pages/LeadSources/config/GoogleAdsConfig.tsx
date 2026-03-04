import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chrome, Webhook, Pencil, DollarSign, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceConfigProps } from "./types";

const GoogleAdsConfig = ({ formData, setFormData }: SourceConfigProps) => {
    const cfg = formData.integrationConfig || {};
    const update = (key: string, val: any) =>
        setFormData({ ...formData, integrationConfig: { ...cfg, [key]: val } });

    const method = cfg.connection_method || "webhook";

    return (
        <div className="space-y-6">
            {/* Connection Method */}
            <div>
                <h4 className="font-semibold text-sm text-[#0F172A] mb-3">How would you like to connect?</h4>
                <div className="space-y-3">
                    {/* OAuth Card */}
                    <label className={cn(
                        "block p-4 rounded-xl border-2 cursor-pointer transition-all",
                        method === "oauth" ? "border-blue-300 bg-blue-50" : "border-[rgba(15,23,42,0.06)] hover:border-[#CBD5E1]"
                    )}>
                        <div className="flex items-start gap-3">
                            <input type="radio" name="gads_method" checked={method === "oauth"} onChange={() => update("connection_method", "oauth")} className="mt-1 accent-blue-600" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Chrome size={18} className="text-[#4285F4]" />
                                    <span className="font-semibold text-sm text-[#0F172A]">Connect with Google</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">Recommended</span>
                                </div>
                                <p className="text-xs text-[#475569] mt-1">Automatically sync leads from your Google Ads account. Real-time lead delivery, no manual setup required.</p>
                                <ul className="mt-2 space-y-1 text-xs text-[#475569]">
                                    <li>• Auto-sync leads instantly</li>
                                    <li>• Pull campaign & cost data</li>
                                    <li>• Requires Google Ads account</li>
                                </ul>
                                <Button disabled className="mt-3 rounded-xl text-xs" variant="outline">
                                    <Chrome size={14} className="mr-2" /> Connect with Google — Coming Soon
                                </Button>
                                <p className="text-[10px] text-[#94A3B8] mt-1 flex items-center gap-1">
                                    <Info size={10} /> Google OAuth integration coming in Phase 4
                                </p>
                            </div>
                        </div>
                    </label>

                    {/* Webhook Card */}
                    <label className={cn(
                        "block p-4 rounded-xl border-2 cursor-pointer transition-all",
                        method === "webhook" ? "border-cyan-300 bg-cyan-50" : "border-[rgba(15,23,42,0.06)] hover:border-[#CBD5E1]"
                    )}>
                        <div className="flex items-start gap-3">
                            <input type="radio" name="gads_method" checked={method === "webhook"} onChange={() => update("connection_method", "webhook")} className="mt-1 accent-cyan-600" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Webhook size={18} className="text-[#0891B2]" />
                                    <span className="font-semibold text-sm text-[#0F172A]">Use Webhook URL</span>
                                </div>
                                <p className="text-xs text-[#475569] mt-1">Receive leads via webhook using Zapier or direct setup. Works with any Google Ads configuration.</p>
                                <ul className="mt-2 space-y-1 text-xs text-[#475569]">
                                    <li>• Works immediately</li>
                                    <li>• Requires Zapier or manual webhook setup</li>
                                    <li>• Full control over data mapping</li>
                                </ul>
                            </div>
                        </div>
                    </label>

                    {/* Manual Card */}
                    <label className={cn(
                        "block p-4 rounded-xl border-2 cursor-pointer transition-all",
                        method === "manual" ? "border-slate-300 bg-slate-50" : "border-[rgba(15,23,42,0.06)] hover:border-[#CBD5E1]"
                    )}>
                        <div className="flex items-start gap-3">
                            <input type="radio" name="gads_method" checked={method === "manual"} onChange={() => update("connection_method", "manual")} className="mt-1 accent-slate-600" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Pencil size={18} className="text-[#64748B]" />
                                    <span className="font-semibold text-sm text-[#0F172A]">Manual Entry</span>
                                </div>
                                <p className="text-xs text-[#475569] mt-1">Manually enter leads from Google Ads. Best for low volume or when automation isn't needed.</p>
                                <ul className="mt-2 space-y-1 text-xs text-[#475569]">
                                    <li>• No setup required</li>
                                    <li>• Enter leads manually</li>
                                    <li>• Tag leads with Google Ads source</li>
                                </ul>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Zapier Instructions for Webhook */}
            {method === "webhook" && (
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[rgba(15,23,42,0.06)] space-y-3">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-[#FF4A00]" />
                        <h4 className="font-semibold text-sm text-[#0F172A]">Zapier Setup Instructions</h4>
                    </div>
                    <ol className="text-xs text-[#475569] space-y-1.5 list-decimal pl-4">
                        <li>Go to <span className="font-medium text-[#0F172A]">zapier.com</span> and create a new Zap</li>
                        <li>Search for trigger: <span className="font-medium">"Google Ads"</span></li>
                        <li>Select trigger event: <span className="font-medium">"New Lead Form Entry"</span></li>
                        <li>Connect your Google Ads account to Zapier</li>
                        <li>Select your Lead Form</li>
                        <li>Add Action: <span className="font-medium">"Webhooks by Zapier"</span> → POST</li>
                        <li>Paste your webhook URL (available after creation)</li>
                        <li>Payload Type: JSON</li>
                        <li>Map fields: full_name → Lead Name, email → Email, phone → Phone, campaign_name → Campaign</li>
                    </ol>
                    <p className="text-[10px] text-cyan-600 bg-cyan-50 p-2 rounded-lg">
                        💡 Your webhook URL will be generated after you create this source.
                    </p>
                </div>
            )}

            {/* Cost Tracking */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-[#10B981]" />
                        <h4 className="font-semibold text-sm text-[#0F172A]">Cost Tracking</h4>
                    </div>
                    <Checkbox
                        checked={cfg.cost_tracking_enabled !== false}
                        onCheckedChange={(c) => update("cost_tracking_enabled", c)}
                        className="border-slate-300 data-[state=checked]:bg-[#0891B2]"
                    />
                </div>

                {cfg.cost_tracking_enabled !== false && (
                    <div className="pl-4 border-l-2 border-green-200 space-y-3">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <label className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs", cfg.cost_input_method === "manual" ? "bg-green-50 border-green-200" : "border-[rgba(15,23,42,0.06)]")}>
                                    <input type="radio" name="cost_method" checked={cfg.cost_input_method !== "sync"} onChange={() => update("cost_input_method", "manual")} className="accent-green-600" />
                                    Enter manually
                                </label>
                                <label className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-not-allowed opacity-50 text-xs", "border-[rgba(15,23,42,0.06)]")}>
                                    <input type="radio" name="cost_method" disabled className="accent-green-600" />
                                    Sync from Google Ads (Coming Soon)
                                </label>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-sm text-[#475569]">Avg. Cost Per Lead ($)</Label>
                                <Input type="number" value={formData.costPerLead || ""} onChange={(e) => setFormData({ ...formData, costPerLead: e.target.value })} placeholder="25.00" className="h-10 rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm text-[#475569]">Monthly Budget ($)</Label>
                                <Input type="number" value={formData.monthlyBudget || ""} onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })} placeholder="2000.00" className="h-10 rounded-xl" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoogleAdsConfig;
