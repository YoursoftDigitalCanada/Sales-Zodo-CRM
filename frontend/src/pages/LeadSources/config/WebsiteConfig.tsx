import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Code, Webhook, ChevronDown, ChevronUp } from "lucide-react";
import { SourceConfigProps } from "./types";
import FieldMappingEditor from "./FieldMappingEditor";
import { LeadFieldMappingRow } from "./field-mapping-utils";

const samplePayload = `{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "555-123-4567",
  "address": "123 Main St",
  "city": "Houston",
  "state": "TX",
  "zip": "77001",
  "service_needed": "CRM Implementation",
  "message": "I need a quote..."
}`;

const WebsiteConfig = ({ formData, setFormData }: SourceConfigProps) => {
    const cfg = formData.integrationConfig || {};
    const update = (key: string, val: any) =>
        setFormData({ ...formData, integrationConfig: { ...cfg, [key]: val } });

    const [showPayload, setShowPayload] = useState(false);
    const [activeTab, setActiveTab] = useState("wordpress");

    const fieldMappings: LeadFieldMappingRow[] = cfg.field_mapping_rows || [
        { form: "name", crm: "Full Name", transform: "None" },
        { form: "email", crm: "Email", transform: "Lowercase" },
        { form: "phone", crm: "Phone", transform: "Phone Format (E.164)" },
        { form: "address", crm: "Address Line 1", transform: "None" },
    ];

    return (
        <div className="space-y-6">
            {/* Website URL */}
            <div className="space-y-1">
                <Label className="text-sm text-[#475569]">Your Website URL</Label>
                <Input value={cfg.website_url || ""} onChange={(e) => update("website_url", e.target.value)} placeholder="https://yourcompany.com" className="h-10 rounded-xl" />
                <p className="text-[10px] text-[#94A3B8]">For reference only</p>
            </div>

            {/* Webhook Info */}
            <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                    <Webhook size={16} className="text-cyan-700" />
                    <h4 className="font-semibold text-sm text-cyan-800">Webhook Configuration</h4>
                </div>
                <p className="text-xs text-cyan-600">
                    A unique webhook URL and secret will be auto-generated when you create this source. You'll be able to copy them from the source detail page.
                </p>
            </div>

            {/* Integration Instructions */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Code size={16} className="text-[#6366F1]" />
                    <h4 className="font-semibold text-sm text-[#0F172A]">Integration Instructions</h4>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-[#F1F5F9] rounded-xl p-1 h-auto flex-wrap">
                        <TabsTrigger value="wordpress" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-white">WordPress</TabsTrigger>
                        <TabsTrigger value="webflow" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-white">Webflow</TabsTrigger>
                        <TabsTrigger value="squarespace" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-white">Squarespace</TabsTrigger>
                        <TabsTrigger value="html" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-white">Custom HTML</TabsTrigger>
                        <TabsTrigger value="zapier" className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:bg-white">Zapier</TabsTrigger>
                    </TabsList>

                    <TabsContent value="wordpress" className="mt-3 p-4 bg-[#F7F7FB] rounded-xl text-xs text-[#475569] space-y-3">
                        <p className="font-semibold text-[#0F172A]">WordPress Integration</p>
                        <div className="space-y-2">
                            <p className="font-medium text-[#0F172A]">Option A: Contact Form 7</p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Install "Contact Form 7 - Webhook" plugin</li>
                                <li>Go to Contact → your form → Additional Settings</li>
                                <li>Add the webhook URL (available after creation)</li>
                                <li>Map your form fields to match our expected format</li>
                            </ol>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-[#0F172A]">Option B: Gravity Forms</p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Go to Forms → Settings → Webhooks</li>
                                <li>Add new webhook with your URL</li>
                                <li>Request Method: POST, Format: JSON</li>
                            </ol>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-[#0F172A]">Option C: WPForms</p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Install WPForms Webhooks addon</li>
                                <li>Go to your form → Settings → Webhooks</li>
                                <li>Add webhook URL and configure field mapping</li>
                            </ol>
                        </div>
                    </TabsContent>

                    <TabsContent value="webflow" className="mt-3 p-4 bg-[#F7F7FB] rounded-xl text-xs text-[#475569] space-y-2">
                        <p className="font-semibold text-[#0F172A]">Webflow Integration</p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>In Webflow, go to your form settings</li>
                            <li>Under "Form Settings", add a webhook</li>
                            <li>Paste your webhook URL</li>
                            <li>Ensure form field names match expected format</li>
                        </ol>
                    </TabsContent>

                    <TabsContent value="squarespace" className="mt-3 p-4 bg-[#F7F7FB] rounded-xl text-xs text-[#475569] space-y-2">
                        <p className="font-semibold text-[#0F172A]">Squarespace Integration</p>
                        <p>Squarespace requires Zapier for webhook integration:</p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Create a Zap with trigger "New Form Submission in Squarespace"</li>
                            <li>Add action "Webhooks by Zapier" → POST</li>
                            <li>Paste your webhook URL, Payload Type: JSON</li>
                            <li>Map fields from Squarespace to our format</li>
                        </ol>
                    </TabsContent>

                    <TabsContent value="html" className="mt-3 p-4 bg-[#F7F7FB] rounded-xl text-xs text-[#475569] space-y-2">
                        <p className="font-semibold text-[#0F172A]">Custom HTML Form</p>
                        <p>Use this JavaScript snippet (replace placeholders after source is created):</p>
                        <pre className="bg-[#1E293B] text-green-400 p-3 rounded-lg overflow-x-auto text-[11px] mt-2">
                            {`document.getElementById('your-form')
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(
      new FormData(e.target)
    );
    await fetch('[WEBHOOK_URL]', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': '[SECRET]'
      },
      body: JSON.stringify(data)
    });
  });`}
                        </pre>
                    </TabsContent>

                    <TabsContent value="zapier" className="mt-3 p-4 bg-[#F7F7FB] rounded-xl text-xs text-[#475569] space-y-2">
                        <p className="font-semibold text-[#0F172A]">Zapier Integration</p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Create a new Zap</li>
                            <li>Choose your trigger app (any form builder)</li>
                            <li>Add action: "Webhooks by Zapier" → POST</li>
                            <li>Paste your webhook URL, Payload Type: JSON</li>
                            <li>Map your form fields</li>
                        </ol>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Expected Payload */}
            <div>
                <button onClick={() => setShowPayload(!showPayload)} className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] hover:text-[#6637F4] transition-colors">
                    {showPayload ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Expected Payload Format
                </button>
                {showPayload && (
                    <pre className="mt-2 bg-[#1E293B] text-green-400 p-4 rounded-xl overflow-x-auto text-[11px]">
                        {samplePayload}
                    </pre>
                )}
            </div>

            <FieldMappingEditor
                rows={fieldMappings}
                onChange={(rows) => update("field_mapping_rows", rows)}
                title="Field Mapping"
                description="Map your website form fields to CRM lead fields"
            />
        </div>
    );
};

export default WebsiteConfig;
