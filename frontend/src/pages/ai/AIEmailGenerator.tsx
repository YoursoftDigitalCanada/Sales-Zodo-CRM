import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateEmail } from "@/features/sales-ai";

export default function AIEmailGeneratorPage() {
  const [form, setForm] = useState({ templateType: "cold outreach", tone: "Professional", goal: "Book a Roofer CRM demo", leadId: "", dealId: "", contactId: "", clientId: "" });
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({ mutationFn: () => generateEmail({ ...form, storeDraft: true }), onSuccess: setResult });
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
          <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Lead ID" value={form.leadId} onChange={(e) => set("leadId", e.target.value)} /><Input placeholder="Deal ID" value={form.dealId} onChange={(e) => set("dealId", e.target.value)} /><Input placeholder="Contact ID" value={form.contactId} onChange={(e) => set("contactId", e.target.value)} /><Input placeholder="Account ID" value={form.clientId} onChange={(e) => set("clientId", e.target.value)} /></div>
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
