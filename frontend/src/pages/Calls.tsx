import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { WorkspaceHero, WorkspaceMetric } from "@/components/crm/WorkspaceUi";
import { getCalls, logCall } from "@/features/engagement/services/engagement-service";
import { CalendarClock, Phone, PhoneIncoming, PhoneOutgoing, Plus } from "lucide-react";

const outcomes = ["Connected", "No Answer", "Voicemail", "Wrong Number", "Interested", "Not Interested", "Callback Requested"];
const emptyCall = { direction: "Outbound", outcome: "Connected", duration: "", callNotes: "", nextAction: "", followUpDate: "", leadId: "", contactId: "", clientId: "", projectId: "" };
const dateLabel = (value?: string) => value ? new Date(value).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "-";

export default function CallsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyCall);
  const callsQuery = useQuery({ queryKey: ["sales-calls"], queryFn: () => getCalls() });
  const saveMutation = useMutation({
    mutationFn: () => logCall({ ...form, duration: form.duration ? Number(form.duration) : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-calls"] });
      setOpen(false);
      setForm(emptyCall);
      toast({ title: "Call logged" });
    },
    onError: (error: any) => toast({ title: "Call log failed", description: error?.response?.data?.message || error?.message, variant: "destructive" }),
  });

  const calls = callsQuery.data || [];
  const followUps = calls.filter((call) => call.followUpDate).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <WorkspaceHero eyebrow="Sales Engagement" title="Sales" accent="Calls" description="Log outcomes, capture notes, and keep every callback connected to the next action." icon={Phone} actions={<Button onClick={() => setOpen(true)} className="gap-2 bg-[#0891B2] hover:bg-[#0E7490]"><Plus size={16} />Log Call</Button>} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <WorkspaceMetric title="Total Calls" value={calls.length} icon={Phone} />
          <WorkspaceMetric title="Outbound" value={calls.filter((call) => call.direction === "Outbound").length} icon={PhoneOutgoing} tone="blue" delay={0.04} />
          <WorkspaceMetric title="Inbound" value={calls.filter((call) => call.direction === "Inbound").length} icon={PhoneIncoming} tone="green" delay={0.08} />
          <WorkspaceMetric title="Follow-ups" value={followUps} icon={CalendarClock} tone="amber" delay={0.12} />
        </div>
        <div className="overflow-hidden rounded-md border border-[#E2E8F0] bg-white">
          <div className="grid grid-cols-6 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]"><span className="col-span-2">Call</span><span>Direction</span><span>Outcome</span><span>Follow-up</span><span>Duration</span></div>
          {calls.map((call) => (
            <div key={call.id} className="grid grid-cols-6 items-center gap-3 border-b border-[#F1F5F9] px-4 py-3 last:border-0">
              <div className="col-span-2"><p className="font-medium text-[#0F172A]">{call.nextAction || "Sales call"}</p><p className="text-sm text-[#64748B]">{call.callNotes || "No notes"}</p></div>
              <Badge variant="outline">{call.direction}</Badge>
              <Badge variant="outline">{call.outcome}</Badge>
              <span className="text-sm text-[#64748B]">{dateLabel(call.followUpDate)}</span>
              <span className="text-sm text-[#64748B]">{call.duration ? `${call.duration} min` : "-"}</span>
            </div>
          ))}
          {!calls.length && <div className="p-8 text-center text-sm text-[#64748B]"><Phone className="mx-auto mb-3 text-[#0891B2]" />No calls logged yet.</div>}
        </div>
      </main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Call</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Direction</Label><Select value={form.direction} onValueChange={(value) => setForm((c: any) => ({ ...c, direction: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Outbound", "Inbound"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Outcome</Label><Select value={form.outcome} onValueChange={(value) => setForm((c: any) => ({ ...c, outcome: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{outcomes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Duration (minutes)</Label><Input type="number" value={form.duration} onChange={(e) => setForm((c: any) => ({ ...c, duration: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Follow-up Date</Label><Input type="datetime-local" value={form.followUpDate} onChange={(e) => setForm((c: any) => ({ ...c, followUpDate: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Next Action</Label><Input value={form.nextAction} onChange={(e) => setForm((c: any) => ({ ...c, nextAction: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Call Notes</Label><Textarea rows={4} value={form.callNotes} onChange={(e) => setForm((c: any) => ({ ...c, callNotes: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Lead ID</Label><Input value={form.leadId} onChange={(e) => setForm((c: any) => ({ ...c, leadId: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Deal ID</Label><Input value={form.projectId} onChange={(e) => setForm((c: any) => ({ ...c, projectId: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} className="bg-[#0891B2] hover:bg-[#0E7490]">Save Call</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
