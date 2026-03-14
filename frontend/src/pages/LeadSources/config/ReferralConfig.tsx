import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Gift, Link2, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    SourceConfigProps,
    referralTypeOptions,
    rewardTriggerOptions,
    giftCardOptions,
} from "./types";

const ReferralConfig = ({ formData, setFormData }: SourceConfigProps) => {
    const cfg = formData.integrationConfig || {};
    const update = (key: string, val: any) =>
        setFormData({ ...formData, integrationConfig: { ...cfg, [key]: val } });

    const toggleReferralType = (val: string) => {
        const current: string[] = cfg.referral_types || [];
        update("referral_types", current.includes(val) ? current.filter((v: string) => v !== val) : [...current, val]);
    };

    return (
        <div className="space-y-6">
            {/* Referral Types */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-[#10B981]" />
                    <h4 className="font-semibold text-sm text-[#0F172A]">Referral Types</h4>
                </div>
                <p className="text-xs text-[#94A3B8] mb-3">Select which types of referrals you accept</p>
                <div className="grid grid-cols-2 gap-2">
                    {referralTypeOptions.map((opt) => {
                        const checked = (cfg.referral_types || []).includes(opt.value);
                        return (
                            <label
                                key={opt.value}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                    checked ? "bg-green-50 border-green-200" : "border-[rgba(15,23,42,0.06)] hover:bg-[#F7F7FB]"
                                )}
                            >
                                <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleReferralType(opt.value)}
                                    className="border-slate-300 data-[state=checked]:bg-[#10B981]"
                                />
                                <div>
                                    <p className="text-sm font-medium text-[#0F172A]">{opt.label}</p>
                                    {opt.desc && <p className="text-[10px] text-[#94A3B8]">{opt.desc}</p>}
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Referral Rewards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Gift size={16} className="text-[#F59E0B]" />
                        <h4 className="font-semibold text-sm text-[#0F172A]">Referral Rewards</h4>
                    </div>
                    <Checkbox
                        checked={cfg.rewards_enabled || false}
                        onCheckedChange={(c) => update("rewards_enabled", c)}
                        className="border-slate-300 data-[state=checked]:bg-[#6637F4]"
                    />
                </div>

                {cfg.rewards_enabled && (
                    <div className="pl-4 border-l-2 border-[#F59E0B]/20 space-y-4">
                        {/* Reward Type */}
                        <div className="space-y-2">
                            <Label className="text-sm text-[#475569]">Reward Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: "fixed", label: "Fixed Amount" },
                                    { value: "percentage", label: "% of Job Value" },
                                    { value: "gift_card", label: "Gift Card" },
                                    { value: "discount", label: "Service Discount" },
                                ].map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={cn(
                                            "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition-all",
                                            cfg.reward_type === opt.value
                                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                                : "border-[rgba(15,23,42,0.06)] hover:bg-[#F7F7FB]"
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="reward_type"
                                            checked={cfg.reward_type === opt.value}
                                            onChange={() => update("reward_type", opt.value)}
                                            className="accent-amber-500"
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Conditional value inputs */}
                        {cfg.reward_type === "fixed" && (
                            <div className="space-y-1">
                                <Label className="text-sm text-[#475569]">Reward Amount ($)</Label>
                                <Input type="number" value={cfg.reward_amount || ""} onChange={(e) => update("reward_amount", e.target.value)} placeholder="100.00" className="h-10 rounded-xl" />
                                <p className="text-[10px] text-[#94A3B8]">Amount paid to referrer when lead converts</p>
                            </div>
                        )}
                        {cfg.reward_type === "percentage" && (
                            <div className="space-y-1">
                                <Label className="text-sm text-[#475569]">Reward Percentage (%)</Label>
                                <Input type="number" min={0} max={50} value={cfg.reward_percentage || ""} onChange={(e) => update("reward_percentage", e.target.value)} placeholder="5" className="h-10 rounded-xl" />
                                <p className="text-[10px] text-[#94A3B8]">Percentage of job value paid to referrer</p>
                            </div>
                        )}
                        {cfg.reward_type === "gift_card" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-sm text-[#475569]">Gift Card Value ($)</Label>
                                    <Input type="number" value={cfg.gift_card_value || ""} onChange={(e) => update("gift_card_value", e.target.value)} placeholder="50.00" className="h-10 rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm text-[#475569]">Gift Card Type</Label>
                                    <Select value={cfg.gift_card_type || "Amazon"} onValueChange={(v) => update("gift_card_type", v)}>
                                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {giftCardOptions.map((g) => <SelectItem key={g} value={g} className="rounded-lg">{g}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        {cfg.reward_type === "discount" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-sm text-[#475569]">Discount Type</Label>
                                    <Select value={cfg.discount_type || "fixed"} onValueChange={(v) => update("discount_type", v)}>
                                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="fixed" className="rounded-lg">Fixed Amount Off</SelectItem>
                                            <SelectItem value="percentage" className="rounded-lg">Percentage Off</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm text-[#475569]">Discount Value</Label>
                                    <Input type="number" value={cfg.discount_value || ""} onChange={(e) => update("discount_value", e.target.value)} placeholder={cfg.discount_type === "percentage" ? "10" : "50.00"} className="h-10 rounded-xl" />
                                </div>
                            </div>
                        )}

                        {/* Reward Trigger */}
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">When is reward paid?</Label>
                            <Select value={cfg.reward_trigger || "payment_received"} onValueChange={(v) => update("reward_trigger", v)}>
                                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {rewardTriggerOptions.map((o) => <SelectItem key={o.value} value={o.value} className="rounded-lg">{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            {/* Referral Links */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Link2 size={16} className="text-[#6637F4]" />
                        <h4 className="font-semibold text-sm text-[#0F172A]">Referral Links</h4>
                    </div>
                    <Checkbox
                        checked={cfg.referral_links_enabled !== false}
                        onCheckedChange={(c) => update("referral_links_enabled", c)}
                        className="border-slate-300 data-[state=checked]:bg-[#6637F4]"
                    />
                </div>
                {cfg.referral_links_enabled !== false && (
                    <div className="pl-4 border-l-2 border-[#6637F4]/20 space-y-3">
                        <div className="p-3 bg-[#F0EEFF] rounded-xl text-xs text-[#6637F4] font-mono">
                            https://yourcompany.com/refer/&#123;customer-name&#125;-&#123;code&#125;
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-[#475569]">Custom Landing Page (optional)</Label>
                            <Input value={cfg.landing_page_url || ""} onChange={(e) => update("landing_page_url", e.target.value)} placeholder="https://yourcompany.com/referral-program" className="h-10 rounded-xl" />
                            <p className="text-[10px] text-[#94A3B8]">Where referral links redirect to (leave empty for default form)</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferralConfig;
