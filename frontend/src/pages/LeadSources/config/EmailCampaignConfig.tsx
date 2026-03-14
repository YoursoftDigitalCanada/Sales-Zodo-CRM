import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Webhook, Info, Tag, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceConfigProps, emailPlatformOptions } from "./types";

const EmailCampaignConfig = ({ formData, setFormData }: SourceConfigProps) => {
    const cfg = formData.integrationConfig || {};
    const update = (key: string, val: any) =>
        setFormData({ ...formData, integrationConfig: { ...cfg, [key]: val } });

    const platform = cfg.platform || "other";
    const triggers: string[] = cfg.lead_triggers || ["form_submit"];

    const toggleTrigger = (val: string) => {
        update("lead_triggers", triggers.includes(val) ? triggers.filter((t: string) => t !== val) : [...triggers, val]);
    };

    return (
        <div className="space-y-6">
            {/* Platform Selection */}
            <div>
                <h4 className="font-semibold text-sm text-[#0F172A] mb-3">Select your email platform</h4>
                <div className="grid grid-cols-3 gap-2">
                    {emailPlatformOptions.map((p) => (
                        <label
                            key={p.value}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all text-center",
                                platform === p.value
                                    ? "border-[#6637F4] bg-[#F0EEFF]"
                                    : "border-[rgba(15,23,42,0.06)] hover:border-[#CBD5E1]"
                            )}
                        >
                            <input type="radio" name="email_platform" checked={platform === p.value} onChange={() => update("platform", p.value)} className="sr-only" />
                            <span className="text-2xl">{p.icon}</span>
                            <span className="text-xs font-semibold text-[#0F172A]">{p.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Connection Method */}
            {platform !== "other" && (
                <div className="p-4 rounded-xl bg-[#F7F7FB] border border-[rgba(15,23,42,0.06)] space-y-3">
                    <h4 className="font-semibold text-sm text-[#0F172A]">
                        Connect Your {emailPlatformOptions.find(p => p.value === platform)?.label} Account
                    </h4>
                    <Button disabled variant="outline" className="rounded-xl text-xs w-full">
                        <Mail size={14} className="mr-2" />
                        Connect with {emailPlatformOptions.find(p => p.value === platform)?.label} — Coming Soon
                    </Button>
                    <p className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                        <Info size={10} /> Direct integrations coming in Phase 4
                    </p>
                    <div className="border-t border-[rgba(15,23,42,0.06)] pt-3">
                        <p className="text-xs text-[#475569] font-medium">Or use Webhook URL instead</p>
                        <p className="text-[10px] text-[#94A3B8] mt-1">
                            A webhook URL will be generated after creation. Use it with Zapier to connect your email platform.
                        </p>
                    </div>
                </div>
            )}

            {platform === "other" && (
                <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                        <Webhook size={16} className="text-cyan-700" />
                        <h4 className="font-semibold text-sm text-cyan-800">Webhook Configuration</h4>
                    </div>
                    <p className="text-xs text-cyan-600">
                        A webhook URL will be auto-generated when you create this source. Use it with your email platform's webhook/API integration or connect via Zapier.
                    </p>
                </div>
            )}

            {/* Lead Triggers */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <MousePointerClick size={16} className="text-[#6366F1]" />
                    <h4 className="font-semibold text-sm text-[#0F172A]">When should a lead be created?</h4>
                </div>
                <div className="space-y-2">
                    {[
                        { value: "form_submit", label: "When someone fills out an embedded form", defaultChecked: true },
                        { value: "link_click", label: "When someone clicks a specific link in email" },
                        { value: "email_reply", label: "When someone replies to email" },
                        { value: "list_add", label: "When someone is added to a specific list/segment" },
                    ].map((t) => {
                        const checked = triggers.includes(t.value);
                        return (
                            <label
                                key={t.value}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                    checked ? "bg-indigo-50 border-indigo-200" : "border-[rgba(15,23,42,0.06)] hover:bg-[#F7F7FB]"
                                )}
                            >
                                <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleTrigger(t.value)}
                                    className="border-slate-300 data-[state=checked]:bg-[#6366F1]"
                                />
                                <span className="text-sm text-[#0F172A]">{t.label}</span>
                            </label>
                        );
                    })}
                </div>

                {/* Link Click Config */}
                {triggers.includes("link_click") && (
                    <div className="mt-3 pl-4 border-l-2 border-indigo-200 space-y-2">
                        <Label className="text-sm text-[#475569]">Link URL or UTM parameter to track</Label>
                        <Input
                            value={cfg.link_identifier || ""}
                            onChange={(e) => update("link_identifier", e.target.value)}
                            placeholder="?utm_campaign=roof-promo"
                            className="h-10 rounded-xl"
                        />
                        <p className="text-[10px] text-[#94A3B8]">We'll create a lead when someone clicks a link containing this</p>
                    </div>
                )}
            </div>

            {/* Campaign Tracking */}
            <div className="flex items-center justify-between p-4 bg-[#F7F7FB] rounded-xl">
                <div className="flex items-center gap-3">
                    <Tag size={16} className="text-[#6637F4]" />
                    <div>
                        <p className="text-sm font-medium text-[#0F172A]">Track Campaign Source</p>
                        <p className="text-xs text-[#94A3B8]">Automatically tag leads with the campaign name</p>
                    </div>
                </div>
                <Checkbox
                    checked={cfg.track_campaigns !== false}
                    onCheckedChange={(c) => update("track_campaigns", c)}
                    className="border-slate-300 data-[state=checked]:bg-[#6637F4]"
                />
            </div>
        </div>
    );
};

export default EmailCampaignConfig;
