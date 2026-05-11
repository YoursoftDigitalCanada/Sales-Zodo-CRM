import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scoreLead } from "@/features/sales-ai";

export default function AILeadScoringPage() {
  const [leadId, setLeadId] = useState("");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({ mutationFn: () => scoreLead({ leadId }), onSuccess: setResult });
  const applyMutation = useMutation({ mutationFn: () => scoreLead({ leadId, confirmUpdate: true }), onSuccess: setResult });
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center gap-3"><div className="rounded-lg bg-[#0891B2]/10 p-2 text-[#0891B2]"><Target /></div><div><h1 className="text-2xl font-semibold text-[#0F172A]">Lead Scoring AI</h1><p className="text-sm text-[#64748B]">Score a lead using source, budget, intent, timeline, product fit, and engagement.</p></div></div>
        <section className="rounded-lg border border-[#E2E8F0] bg-white p-5"><div className="flex gap-2"><Input value={leadId} onChange={(e) => setLeadId(e.target.value)} placeholder="Paste Lead ID" /><Button onClick={() => mutation.mutate()} disabled={!leadId || mutation.isPending}>Re-score Lead</Button></div></section>
        {result ? <section className="rounded-lg border border-[#E2E8F0] bg-white p-5"><p className="text-5xl font-semibold text-[#0891B2]">{result.score}</p><p className="mt-1 text-sm font-medium text-[#0F172A]">{result.temperature}</p><p className="mt-4 text-sm text-[#334155]">{result.recommendedNextAction}</p><ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[#64748B]">{(result.reasons || []).map((reason: string) => <li key={reason}>{reason}</li>)}</ul><Button className="mt-5 bg-[#0891B2] hover:bg-[#0E7490]" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>Apply Score to Lead</Button></section> : null}
      </div>
    </div>
  );
}
