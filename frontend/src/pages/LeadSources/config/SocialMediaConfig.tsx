import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Share2, Webhook, Pencil, DollarSign, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceConfigProps, socialPlatformOptions } from "./types";

const SocialMediaConfig = ({ formData, setFormData }: SourceConfigProps) => {
    const cfg = formData.integrationConfig || {};
    const update = (key: string, val: any) =>
        setFormData({ ...formData, integrationConfig: { ...cfg, [key]: val } });

    const method = cfg.connection_method || "webhook";
    const platforms: string[] = cfg.platforms || ["facebook", "instagram"];

    const togglePlatform = (val: string) => {
        update("platforms", platforms.includes(val) ? platforms.filter((p: string) => p !== val) : [...platforms, val]);
    };

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
                            <input type="radio" name="social_method" checked={method === "oauth"} onChange={() => update("connection_method", "oauth")} className="mt-1 accent-blue-600" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-1">
                                        <span className="text-base">📘</span>
                                        <span className="text-base">📸</span>
                                    </div>
                                    <span className="font-semibold text-sm text-[#0F172A]">Connect with Facebook</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">Recommended</span>
                                </div>
                                <p className="text-xs text-[#475569] mt-1">Automatically sync leads from Facebook & Instagram Ads. Real-time lead delivery.</p>
                                <ul className="mt-2 space-y-1 text-xs text-[#475569]">
                                    <li>• Instant lead sync</li>
                                    <li>• Select specific Pages & Forms</li>
                                    <li>• Track ad performance</li>
                                    <li>• Works with Lead Ads</li>
                                </ul>
                                <Button disabled className="mt-3 rounded-xl text-xs" variant="outline">
                                    Connect with Facebook — Coming Soon
                                </Button>
                                <p className="text-[10px] text-[#94A3B8] mt-1 flex items-center gap-1">
                                    <Info size={10} /> Facebook OAuth integration coming in Phase 4
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
                            <input type="radio" name="social_method" checked={method === "webhook"} onChange={() => update("connection_method", "webhook")} className="mt-1 accent-cyan-600" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Webhook size={18} className="text-[#6637F4]" />
                                    <span className="font-semibold text-sm text-[#0F172A]">Use Webhook URL</span>
                                </div>
                                <p className="text-xs text-[#475569] mt-1">Receive leads via webhook using Zapier. Works with Facebook Lead Ads.</p>
                                <ul className="mt-2 space-y-1 text-xs text-[#475569]">
                                    <li>• Works immediately</li>
                                    <li>• Requires Zapier (free tier works)</li>
                                    <li>• 5-minute setup</li>
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
                            <input type="radio" name="social_method" checked={method === "manual"} onChange={() => update("connection_method", "manual")} className="mt-1 accent-slate-600" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Pencil size={18} className="text-[#64748B]" />
                                    <span className="font-semibold text-sm text-[#0F172A]">Manual Entry</span>
                                </div>
                                <p className="text-xs text-[#475569] mt-1">Manually enter leads from social media. Track leads from Facebook, Instagram, TikTok, etc.</p>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Zapier Instructions */}
            {method === "webhook" && (
                <div className="p-4 bg-[#F7F7FB] rounded-xl border border-[rgba(15,23,42,0.06)] space-y-3">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-[#FF4A00]" />
                        <h4 className="font-semibold text-sm text-[#0F172A]">Zapier Setup — Facebook Lead Ads</h4>
                    </div>
                    <ol className="text-xs text-[#475569] space-y-1.5 list-decimal pl-4">
                        <li>Go to <span className="font-medium text-[#0F172A]">zapier.com</span> and create a new Zap</li>
                        <li>Trigger: <span className="font-medium">"Facebook Lead Ads" → "New Lead"</span></li>
                        <li>Connect your Facebook account</li>
                        <li>Select your Page and Form</li>
                        <li>Action: <span className="font-medium">"Webhooks by Zapier"</span> → POST</li>
                        <li>Paste your webhook URL (available after creation)</li>
                        <li>Map: full_name, email, phone_number, street_address, city, state, zip</li>
                    </ol>
                    <p className="text-[10px] text-cyan-600 bg-cyan-50 p-2 rounded-lg">
                        💡 Test your Zap with a real lead submission to verify it works.
                    </p>
                </div>
            )}

            {/* Platform Selection */}
            {(method === "webhook" || method === "manual") && (
                <div>
                    <h4 className="font-semibold text-sm text-[#0F172A] mb-2">Which platforms will you get leads from?</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {socialPlatformOptions.map((p) => {
                            const checked = platforms.includes(p.value);
                            return (
                                <label key={p.value} className={cn("flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-sm transition-all", checked ? "bg-blue-50 border-blue-200" : "border-[rgba(15,23,42,0.06)] hover:bg-[#F7F7FB]")}>
                                    <Checkbox checked={checked} onCheckedChange={() => togglePlatform(p.value)} className="border-slate-300 data-[state=checked]:bg-[#3B82F6]" />
                                    {p.label}
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Cost Tracking */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-[#10B981]" />
                        <h4 className="font-semibold text-sm text-[#0F172A]">Cost Tracking</h4>
                    </div>
                    <Checkbox checked={cfg.cost_tracking_enabled !== false} onCheckedChange={(c) => update("cost_tracking_enabled", c)} className="border-slate-300 data-[state=checked]:bg-[#6637F4]" />
                </div>
                {cfg.cost_tracking_enabled !== false && (
                    <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-green-200">
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">Avg. Cost Per Lead ($)</Label>
                            <Input type="number" value={formData.costPerLead || ""} onChange={(e) => setFormData({ ...formData, costPerLead: e.target.value })} placeholder="15.00" className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">Monthly Budget ($)</Label>
                            <Input type="number" value={formData.monthlyBudget || ""} onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })} placeholder="1500.00" className="h-10 rounded-xl" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialMediaConfig;
