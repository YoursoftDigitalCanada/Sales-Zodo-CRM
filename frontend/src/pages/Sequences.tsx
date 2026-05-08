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
import { createSequence, getSequences, stopSequence, updateSequence } from "@/features/engagement/services/engagement-service";
import { GitBranch, Pause, Plus } from "lucide-react";

const emptySequence = { sequenceName: "", targetType: "Lead", status: "DRAFT", stopCondition: "reply received", steps: [{ type: "email", title: "Send intro email", delayDays: 0 }] };

export default function SequencesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptySequence);
  const sequencesQuery = useQuery({ queryKey: ["sequences"], queryFn: getSequences });
  const saveMutation = useMutation({
    mutationFn: () => form.id ? updateSequence(form.id, form) : createSequence(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sequences"] }); setOpen(false); toast({ title: "Sequence saved" }); },
    onError: (error: any) => toast({ title: "Sequence save failed", description: error?.response?.data?.message || error?.message, variant: "destructive" }),
  });
  const actionMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => stopSequence(id, { reason: "manual stop" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sequences"] }); toast({ title: "Sequence updated" }); },
    onError: (error: any) => toast({ title: "Sequence action failed", description: error?.response?.data?.message || error?.message, variant: "destructive" }),
  });

  useEffect(() => { if (!open) setForm(emptySequence); }, [open]);
  const setStep = (index: number, key: string, value: any) => setForm((current: any) => ({ ...current, steps: current.steps.map((step: any, i: number) => i === index ? { ...step, [key]: value } : step) }));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div><h1 className="text-2xl font-semibold text-[#0F172A]">Sequences</h1><p className="text-sm text-[#64748B]">Automated follow-up workflows with email, task, call, and wait steps.</p></div>
          <Button onClick={() => setOpen(true)} className="gap-2 bg-[#0F766E] hover:bg-[#115E59]"><Plus size={16} />New Sequence</Button>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {(sequencesQuery.data || []).map((sequence) => (
            <div key={sequence.id} className="rounded-lg border border-[#E2E8F0] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-semibold text-[#0F172A]">{sequence.sequenceName}</h2><p className="mt-1 text-sm text-[#64748B]">{sequence.targetType} · Stop when {sequence.stopCondition}</p></div>
                <Badge variant="outline">{sequence.status}</Badge>
              </div>
              <div className="mt-4 space-y-2">{(sequence.steps || []).map((step: any, index: number) => <div key={index} className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-sm text-[#475569]">{index + 1}. {step.type} · {step.title || step.subject || "Step"} {step.delayDays ? `· wait ${step.delayDays}d` : ""}</div>)}</div>
              <div className="mt-4 flex gap-2"><Button variant="outline" size="sm" onClick={() => { setForm(sequence); setOpen(true); }}>Edit</Button><Button variant="outline" size="sm" onClick={() => actionMutation.mutate({ id: sequence.id })}><Pause size={14} /></Button></div>
            </div>
          ))}
          {!sequencesQuery.data?.length && <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-8 text-center text-sm text-[#64748B] md:col-span-2"><GitBranch className="mx-auto mb-3 text-[#0F766E]" />Create a sequence to automate your sales follow-up.</div>}
        </div>
      </main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit Sequence" : "Create Sequence"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Sequence Name</Label><Input value={form.sequenceName} onChange={(e) => setForm((c: any) => ({ ...c, sequenceName: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Target Type</Label><Select value={form.targetType} onValueChange={(value) => setForm((c: any) => ({ ...c, targetType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Lead", "Contact", "Deal"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm((c: any) => ({ ...c, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Stop Condition</Label><Input value={form.stopCondition} onChange={(e) => setForm((c: any) => ({ ...c, stopCondition: e.target.value }))} /></div>
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between"><Label>Steps</Label><Button variant="outline" size="sm" onClick={() => setForm((c: any) => ({ ...c, steps: [...(c.steps || []), { type: "task", title: "Follow up", delayDays: 1 }] }))}>Add Step</Button></div>
              {(form.steps || []).map((step: any, index: number) => (
                <div key={index} className="grid gap-2 rounded-lg border border-[#E2E8F0] p-3 md:grid-cols-4">
                  <Select value={step.type} onValueChange={(value) => setStep(index, "type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["email", "task", "call", "wait"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                  <Input className="md:col-span-2" value={step.title || ""} onChange={(e) => setStep(index, "title", e.target.value)} placeholder="Step title" />
                  <Input type="number" value={step.delayDays || 0} onChange={(e) => setStep(index, "delayDays", Number(e.target.value))} placeholder="Delay days" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} className="bg-[#0F766E] hover:bg-[#115E59]">Save Sequence</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
