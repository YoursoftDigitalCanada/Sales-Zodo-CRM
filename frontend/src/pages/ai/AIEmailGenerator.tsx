import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AiRecordPicker, type AiRecordOption } from "@/features/sales-ai/components/AiRecordPicker";
import { getClients } from "@/features/clients/services/clients-service";
import { getLeads } from "@/features/leads/services/leads-service";
import { getProjects } from "@/features/projects/services/projects-service";
import { generateEmail, getAIContacts } from "@/features/sales-ai";

const text = (...values: unknown[]) => values.map((value) => String(value || "").trim()).filter(Boolean).join(" ");
const option = (id: unknown, label: string, detail?: string): AiRecordOption | null => id ? { id: String(id), label, detail } : null;
const compact = (items: Array<AiRecordOption | null>) => items.filter(Boolean) as AiRecordOption[];

export default function AIEmailGeneratorPage() {
  const [form, setForm] = useState({ templateType: "cold outreach", tone: "Professional", goal: "Book a Sales CRM demo", leadId: "", dealId: "", contactId: "", clientId: "" });
  const [result, setResult] = useState<any>(null);
  const leadsQuery = useQuery({ queryKey: ["ai-records", "leads"], queryFn: () => getLeads({ limit: 200 }) });
  const dealsQuery = useQuery({ queryKey: ["ai-records", "deals"], queryFn: () => getProjects({ limit: 200, sortBy: "updatedAt", sortOrder: "desc" }) });
  const contactsQuery = useQuery({ queryKey: ["ai-records", "contacts"], queryFn: getAIContacts });
  const clientsQuery = useQuery({ queryKey: ["ai-records", "clients"], queryFn: getClients });
  const leadOptions = compact((leadsQuery.data || []).map((lead: any) => option(lead.id, text(lead.firstName, lead.lastName) || lead.fullName || lead.email || "Lead", text(lead.email, lead.organization || lead.companyName))));
  const dealOptions = compact((dealsQuery.data || []).map((deal: any) => option(deal.id, deal.organization || deal.name || "Deal", text(deal.client?.clientName, deal.dealStatus))));
  const contactOptions = compact((contactsQuery.data || []).map((contact: any) => option(contact.id, contact.contactName || text(contact.firstName, contact.lastName) || contact.email || "Contact", text(contact.email, contact.company?.clientName || contact.companyName))));
  const clientOptions = compact((clientsQuery.data || []).map((client: any) => option(client.id || client.Id, client.clientName || client.ClientName || client.name || client.Name || "Organization", client.primaryEmail || client.email)));
  const mutation = useMutation({
    mutationFn: () => generateEmail({
      templateType: form.templateType,
      tone: form.tone,
      goal: form.goal,
      storeDraft: true,
      ...(form.leadId ? { leadId: form.leadId } : {}),
      ...(form.dealId ? { dealId: form.dealId } : {}),
      ...(form.contactId ? { contactId: form.contactId } : {}),
      ...(form.clientId ? { clientId: form.clientId } : {}),
    }),
    onSuccess: setResult,
  });
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white px-6 py-5"><div className="mx-auto flex max-w-5xl items-center gap-3"><div className="rounded-lg bg-[#0891B2]/10 p-2 text-[#0891B2]"><Mail size={22} /></div><div><h1 className="text-2xl font-semibold text-[#0F172A]">AI Email Generator</h1><p className="text-sm text-[#64748B]">Generate editable sales emails for outreach, demos, proposals, renewals, and re-engagement.</p></div></div></header>
      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-[#E2E8F0] bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Template Type</Label><Select value={form.templateType} onValueChange={(v) => set("templateType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cold outreach", "demo follow-up", "proposal follow-up", "renewal reminder", "re-engagement"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Tone</Label><Select value={form.tone} onValueChange={(v) => set("tone", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Professional", "Friendly", "Direct"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Goal</Label><Input value={form.goal} onChange={(e) => set("goal", e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AiRecordPicker label="Lead" optional value={form.leadId} options={leadOptions} onChange={(value) => set("leadId", value)} placeholder="Choose a lead" searchPlaceholder="Search lead name or email..." loading={leadsQuery.isLoading} />
            <AiRecordPicker label="Deal" optional value={form.dealId} options={dealOptions} onChange={(value) => set("dealId", value)} placeholder="Choose a deal" searchPlaceholder="Search deals..." loading={dealsQuery.isLoading} />
            <AiRecordPicker label="Contact" optional value={form.contactId} options={contactOptions} onChange={(value) => set("contactId", value)} placeholder="Choose a contact" searchPlaceholder="Search contact name or email..." loading={contactsQuery.isLoading} />
            <AiRecordPicker label="Organization" optional value={form.clientId} options={clientOptions} onChange={(value) => set("clientId", value)} placeholder="Choose an organization" searchPlaceholder="Search organizations..." loading={clientsQuery.isLoading} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2 bg-[#0891B2] hover:bg-[#0E7490]"><Wand2 size={16} />Generate Email</Button>
        </section>
        <section className="rounded-lg border border-[#E2E8F0] bg-white p-5">
          <Label>Subject</Label>
          <Input className="mt-2" value={result?.subject || ""} readOnly />
          <Label className="mt-4 block">Body</Label>
          <Textarea className="mt-2 min-h-[280px]" value={result?.body || ""} onChange={(e) => setResult((current: any) => ({ ...current, body: e.target.value }))} placeholder="Generated email will appear here and stays editable before sending." />
          {result?.draftId ? <p className="mt-3 text-sm text-[#0F766E]">Draft saved in Sales Inbox.</p> : null}
        </section>
      </main>
    </div>
  );
}
