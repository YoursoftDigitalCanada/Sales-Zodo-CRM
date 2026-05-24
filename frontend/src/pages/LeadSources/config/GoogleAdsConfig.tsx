import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Chrome, DollarSign, Link2, Pencil, Webhook, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceConfigProps } from "./types";
import ApiConnectionFields from "./ApiConnectionFields";
import FieldMappingEditor from "./FieldMappingEditor";
import { LeadFieldMappingRow } from "./field-mapping-utils";

const defaultGoogleFieldRows: LeadFieldMappingRow[] = [
  { form: "full_name", crm: "Full Name", transform: "None" },
  { form: "email", crm: "Email", transform: "Lowercase" },
  { form: "phone_number", crm: "Phone", transform: "Phone Format (E.164)" },
  { form: "campaign_name", crm: "Message/Notes", transform: "None" },
];

const GoogleAdsConfig = ({ formData, setFormData }: SourceConfigProps) => {
  const cfg = formData.integrationConfig || {};
  const update = (key: string, value: any) =>
    setFormData({ ...formData, integrationConfig: { ...cfg, [key]: value } });

  const method = cfg.connection_method || "webhook";
  const fieldRows: LeadFieldMappingRow[] = cfg.field_mapping_rows || defaultGoogleFieldRows;

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
                name="gads_method"
                checked={method === "api"}
                onChange={() => update("connection_method", "api")}
                className="mt-1 accent-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Chrome size={18} className="text-[#4285F4]" />
                  <span className="font-semibold text-sm text-[#0F172A]">Direct API Sync</span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                    Advanced
                  </span>
                </div>
                <p className="text-xs text-[#475569] mt-1">
                  Pull Google lead-form entries from a provider API, middleware service, or automation endpoint.
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
                name="gads_method"
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
                  Receive leads through Zapier, Make, or a direct webhook handoff from your Google lead flow.
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
                name="gads_method"
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
                  Track Google Ads leads manually while still tagging them to this source for reporting.
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
          providerName="Google Ads"
          endpointPlaceholder="https://bridge.yourcompany.com/google-ads/leads"
          leadsPathPlaceholder="results"
        />
      )}

      {method === "webhook" && (
        <div className="p-4 bg-[#F7F7FB] rounded-xl border border-[rgba(15,23,42,0.06)] space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#FF4A00]" />
            <h4 className="font-semibold text-sm text-[#0F172A]">Webhook Setup Instructions</h4>
          </div>
          <ol className="text-xs text-[#475569] space-y-1.5 list-decimal pl-4">
            <li>Create the Google Ads source first so the CRM generates your webhook URL and secret.</li>
            <li>Use Zapier, Make, or your own bridge service to capture new lead-form entries.</li>
            <li>POST the lead payload to the CRM webhook URL with the `X-Webhook-Secret` header.</li>
            <li>Map common fields like `full_name`, `email`, `phone_number`, and `campaign_name`.</li>
          </ol>
          <p className="text-[10px] text-cyan-600 bg-cyan-50 p-2 rounded-lg">
            Your webhook URL and secret will be available on the source detail page right after creation.
          </p>
        </div>
      )}

      {(method === "api" || method === "webhook") && (
        <FieldMappingEditor
          rows={fieldRows}
          onChange={(rows) => update("field_mapping_rows", rows)}
          title="Lead Form Mapping"
          description="Map incoming Google Ads payload fields to CRM lead fields"
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm text-[#475569]">Account / Campaign Label</Label>
          <Input
            value={cfg.account_label || ""}
            onChange={(event) => update("account_label", event.target.value)}
            placeholder="Spring Roof Replacement"
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-[#475569]">Lead Form Name</Label>
          <Input
            value={cfg.lead_form_name || ""}
            onChange={(event) => update("lead_form_name", event.target.value)}
            placeholder="Demo Request Form"
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
          <div className="pl-4 border-l-2 border-green-200 space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#475569]">
              <Link2 size={12} className="text-[#0891B2]" />
              API bridges can push spend data later. For now, set a baseline cost manually.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-[#475569]">Avg. Cost Per Lead ($)</Label>
                <Input
                  type="number"
                  value={formData.costPerLead || ""}
                  onChange={(event) => setFormData({ ...formData, costPerLead: event.target.value })}
                  placeholder="25.00"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-[#475569]">Monthly Budget ($)</Label>
                <Input
                  type="number"
                  value={formData.monthlyBudget || ""}
                  onChange={(event) => setFormData({ ...formData, monthlyBudget: event.target.value })}
                  placeholder="2000.00"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleAdsConfig;
