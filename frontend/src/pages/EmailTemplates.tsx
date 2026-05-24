import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createEmailTemplate, getEmailTemplates, updateEmailTemplate } from "@/features/engagement/services/engagement-service";
import { Mail, Pencil, Plus } from "lucide-react";

const categories = ["Cold Outreach", "Demo Follow-up", "Proposal Follow-up", "Renewal", "Re-engagement"];
const variables = ["contactName", "companyName", "repName", "proposalLink", "planName"];
const emptyTemplate = { templateName: "", subject: "", body: "", category: "Cold Outreach", isActive: true };

function preview(text: string) {
  return variables.reduce((value, variable) => value.replaceAll(`{{${variable}}}`, {
    contactName: "Alex",
    companyName: "North Star Software",
    repName: "Zodo Sales",
    proposalLink: "https://sales.zodo.ca/proposals/demo",
    planName: "Professional",
  }[variable] || variable), text || "");
}

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyTemplate);
  const templatesQuery = useQuery({ queryKey: ["email-templates"], queryFn: () => getEmailTemplates() });
  const saveMutation = useMutation({
    mutationFn: () => form.id ? updateEmailTemplate(form.id, form) : createEmailTemplate({ ...form, variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setOpen(false);
      toast({ title: "Template saved" });
    },
    onError: (error: any) => toast({ title: "Template save failed", description: error?.response?.data?.message || error?.message, variant: "destructive" }),
  });

  useEffect(() => { if (!open) setForm(emptyTemplate); }, [open]);

  const edit = (template?: any) => {
    setForm(template || emptyTemplate);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div><h1 className="text-2xl font-semibold text-[#0F172A]">Email Templates</h1><p className="text-sm text-[#64748B]">Reusable sales emails with variables for outreach, demos, proposals, renewals, and re-engagement.</p></div>
          <Button onClick={() => edit()} className="gap-2 bg-[#0F766E] hover:bg-[#115E59]"><Plus size={16} />New Template</Button>
        </div>
      </div>
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-2 lg:px-8">
        {(templatesQuery.data || []).map((template) => (
          <div key={template.id} className="rounded-lg border border-[#E2E8F0] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-semibold text-[#0F172A]">{template.templateName}</h2><p className="mt-1 text-sm text-[#64748B]">{template.subject}</p></div>
              <Button variant="ghost" size="icon" onClick={() => edit(template)}><Pencil size={16} /></Button>
            </div>
            <div className="mt-3 flex gap-2"><Badge variant="outline">{template.category}</Badge><Badge variant="outline">{template.isActive ? "Active" : "Inactive"}</Badge></div>
            <div className="mt-4 rounded-lg bg-[#F8FAFC] p-3 text-sm text-[#475569] whitespace-pre-wrap">{preview(template.body).slice(0, 260)}</div>
          </div>
        ))}
        {!templatesQuery.data?.length && <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-8 text-center text-sm text-[#64748B] md:col-span-2"><Mail className="mx-auto mb-3 text-[#0F766E]" />Create your first reusable sales email template.</div>}
      </main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit Template" : "Create Template"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Template Name</Label><Input value={form.templateName} onChange={(e) => setForm((c: any) => ({ ...c, templateName: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Category</Label><Select value={form.category} onValueChange={(value) => setForm((c: any) => ({ ...c, category: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2 md:col-span-2"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm((c: any) => ({ ...c, subject: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Body</Label><Textarea rows={10} value={form.body} onChange={(e) => setForm((c: any) => ({ ...c, body: e.target.value }))} placeholder="Hi {{contactName}}, ..." /></div>
            <div className="md:col-span-2 rounded-lg bg-[#F8FAFC] p-3 text-sm text-[#475569]"><p className="font-medium text-[#0F172A]">Preview</p><p className="mt-2 whitespace-pre-wrap">{preview(form.body)}</p></div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} className="bg-[#0F766E] hover:bg-[#115E59]">Save Template</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
