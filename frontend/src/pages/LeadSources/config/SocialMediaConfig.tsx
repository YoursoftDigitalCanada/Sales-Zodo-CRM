import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Link2, Pencil, Share2, Webhook, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceConfigProps, socialPlatformOptions } from "./types";
import ApiConnectionFields from "./ApiConnectionFields";
import FieldMappingEditor from "./FieldMappingEditor";
import { LeadFieldMappingRow } from "./field-mapping-utils";

const defaultSocialFieldRows: LeadFieldMappingRow[] = [
  { form: "full_name", crm: "Full Name", transform: "None" },
  { form: "email", crm: "Email", transform: "Lowercase" },
  { form: "phone_number", crm: "Phone", transform: "Phone Format (E.164)" },
  { form: "street_address", crm: "Address Line 1", transform: "None" },
];

const SocialMediaConfig = ({ formData, setFormData }: SourceConfigProps) => {
  const cfg = formData.integrationConfig || {};
  const update = (key: string, value: any) =>
    setFormData({ ...formData, integrationConfig: { ...cfg, [key]: value } });

  const method = cfg.connection_method || "webhook";
  const platforms: string[] = cfg.platforms || ["facebook", "instagram"];
  const fieldRows: LeadFieldMappingRow[] = cfg.field_mapping_rows || defaultSocialFieldRows;

  const togglePlatform = (value: string) => {
    update(
      "platforms",
      platforms.includes(value) ? platforms.filter((platform) => platform !== value) : [...platforms, value]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-sm text-[#0F172A] mb-3">How would you like to connect?</h4>
        <div className="space-y-3">
          <label
            className={cn(
              "block p-4 rounded-xl border-2 cursor-pointer transition-all",
              method === "api" ? "border-blue-300 bg-blue-50" : "border-[rgba(15,23,42,0.06)] hover:border-[#CBD5E1]"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="social_method"
                checked={method === "api"}
                onChange={() => update("connection_method", "api")}
                className="mt-1 accent-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Share2 size={18} className="text-[#3B82F6]" />
                  <span className="font-semibold text-sm text-[#0F172A]">Direct Meta / API Sync</span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                    Advanced
                  </span>
                </div>
                <p className="text-xs text-[#475569] mt-1">
                  Pull Facebook or Instagram leads from an API, middleware bridge, or server-side lead collector.
                </p>
              </div>
            </div>
          </label>

          <label
            className={cn(
              "block p-4 rounded-xl border-2 cursor-pointer transition-all",
              method === "webhook" ? "border-cyan-300 bg-cyan-50" : "border-[rgba(15,23,42,0.06)] hover:border-[#CBD5E1]"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="social_method"
                checked={method === "webhook"}
                onChange={() => update("connection_method", "webhook")}
                className="mt-1 accent-cyan-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Webhook size={18} className="text-[#6637F4]" />
                  <span className="font-semibold text-sm text-[#0F172A]">Use Webhook URL</span>
                  <span className="text-[10px] px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full font-medium">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-[#475569] mt-1">
                  Receive leads via Zapier, Make, or a direct webhook handoff from Facebook Lead Ads or other social tools.
                </p>
              </div>
            </div>
          </label>

          <label
            className={cn(
              "block p-4 rounded-xl border-2 cursor-pointer transition-all",
              method === "manual" ? "border-slate-300 bg-slate-50" : "border-[rgba(15,23,42,0.06)] hover:border-[#CBD5E1]"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="social_method"
                checked={method === "manual"}
                onChange={() => update("connection_method", "manual")}
                className="mt-1 accent-slate-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Pencil size={18} className="text-[#64748B]" />
                  <span className="font-semibold text-sm text-[#0F172A]">Manual Entry</span>
                </div>
                <p className="text-xs text-[#475569] mt-1">
                  Track social leads manually while keeping source attribution and platform reporting intact.
                </p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {method === "api" && (
        <ApiConnectionFields
          cfg={cfg}
          update={update}
          providerName="Social Media"
          endpointPlaceholder="https://bridge.yourcompany.com/meta/leads"
          leadsPathPlaceholder="data"
        />
      )}

      {method === "webhook" && (
        <div className="p-4 bg-[#F7F7FB] rounded-xl border border-[rgba(15,23,42,0.06)] space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#FF4A00]" />
            <h4 className="font-semibold text-sm text-[#0F172A]">Webhook Setup Instructions</h4>
          </div>
          <ol className="text-xs text-[#475569] space-y-1.5 list-decimal pl-4">
            <li>Create the social source first so the CRM generates your webhook URL and secret.</li>
            <li>Use Zapier, Make, or your own Meta bridge to capture new lead events.</li>
            <li>POST the lead payload to the CRM webhook URL with the `X-Webhook-Secret` header.</li>
            <li>Map fields like `full_name`, `email`, `phone_number`, `street_address`, and `form_name`.</li>
          </ol>
          <p className="text-[10px] text-cyan-600 bg-cyan-50 p-2 rounded-lg">
            This works especially well with Facebook Lead Ads and Instagram lead forms routed through automation tools.
          </p>
        </div>
      )}

      {(method === "api" || method === "webhook") && (
        <FieldMappingEditor
          rows={fieldRows}
          onChange={(rows) => update("field_mapping_rows", rows)}
          title="Lead Payload Mapping"
          description="Map incoming social lead fields to CRM lead fields"
        />
      )}

      <div>
        <h4 className="font-semibold text-sm text-[#0F172A] mb-2">Which platforms will you get leads from?</h4>
        <div className="grid grid-cols-3 gap-2">
          {socialPlatformOptions.map((platform) => {
            const checked = platforms.includes(platform.value);
            return (
              <label
                key={platform.value}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-sm transition-all",
                  checked ? "bg-blue-50 border-blue-200" : "border-[rgba(15,23,42,0.06)] hover:bg-[#F7F7FB]"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => togglePlatform(platform.value)}
                  className="border-slate-300 data-[state=checked]:bg-[#3B82F6]"
                />
                {platform.label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm text-[#475569]">Page / Campaign Label</Label>
          <Input
            value={cfg.page_label || ""}
            onChange={(event) => update("page_label", event.target.value)}
            placeholder="Sales Leads - Vancouver"
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-[#475569]">Form Name</Label>
          <Input
            value={cfg.form_name || ""}
            onChange={(event) => update("form_name", event.target.value)}
            placeholder="Storm Damage Form"
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-[#10B981]" />
            <h4 className="font-semibold text-sm text-[#0F172A]">Cost Tracking</h4>
          </div>
          <Checkbox
            checked={cfg.cost_tracking_enabled !== false}
            onCheckedChange={(checked) => update("cost_tracking_enabled", checked)}
            className="border-slate-300 data-[state=checked]:bg-[#6637F4]"
          />
        </div>

        {cfg.cost_tracking_enabled !== false && (
          <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-green-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <Link2 size={12} className="text-[#0891B2]" />
                Use estimated spend until your bridge syncs ad costs.
              </div>
              <Label className="text-sm text-[#475569]">Avg. Cost Per Lead ($)</Label>
              <Input
                type="number"
                value={formData.costPerLead || ""}
                onChange={(event) => setFormData({ ...formData, costPerLead: event.target.value })}
                placeholder="15.00"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-[#475569]">Monthly Budget ($)</Label>
              <Input
                type="number"
                value={formData.monthlyBudget || ""}
                onChange={(event) => setFormData({ ...formData, monthlyBudget: event.target.value })}
                placeholder="1500.00"
                className="h-10 rounded-xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialMediaConfig;
