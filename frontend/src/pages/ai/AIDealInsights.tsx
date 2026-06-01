import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiRecordPicker, type AiRecordOption } from "@/features/sales-ai/components/AiRecordPicker";
import { getProjects } from "@/features/projects/services/projects-service";
import { getDealInsights } from "@/features/sales-ai";

export default function AIDealInsightsPage() {
  const [dealId, setDealId] = useState("");
  const [result, setResult] = useState<any>(null);
  const dealsQuery = useQuery({ queryKey: ["ai-records", "deals"], queryFn: () => getProjects({ limit: 200, sortBy: "updatedAt", sortOrder: "desc" }) });
  const dealOptions = (dealsQuery.data || []).map((deal: any) => ({
    id: String(deal.id),
    label: deal.organization || deal.name || "Deal",
    detail: [deal.client?.clientName, deal.dealStatus].filter(Boolean).join(" · "),
  } satisfies AiRecordOption));
  const mutation = useMutation({ mutationFn: () => getDealInsights({ dealId }), onSuccess: setResult });
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center gap-3"><div className="rounded-lg bg-[#0891B2]/10 p-2 text-[#0891B2]"><Lightbulb /></div><div><h1 className="text-2xl font-semibold text-[#0F172A]">Deal Insights AI</h1><p className="text-sm text-[#64748B]">Analyze risk, stuck reasons, next best action, and follow-up messaging.</p></div></div>
        <section className="rounded-md border border-[#E2E8F0] bg-white p-5"><div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><AiRecordPicker label="Deal" value={dealId} options={dealOptions} onChange={setDealId} placeholder="Choose a deal to analyze" searchPlaceholder="Search deal or organization..." loading={dealsQuery.isLoading} /><Button onClick={() => mutation.mutate()} disabled={!dealId || mutation.isPending}>Analyze Deal</Button></div></section>
        {result ? <section className="grid gap-4 rounded-lg border border-[#E2E8F0] bg-white p-5 md:grid-cols-2"><div><p className="text-sm text-[#64748B]">Risk Level</p><p className="text-2xl font-semibold text-[#0F172A]">{result.riskLevel}</p><p className="mt-4 text-sm font-semibold text-[#0F172A]">Stuck Reason</p><p className="text-sm text-[#334155]">{result.stuckReason}</p><p className="mt-4 text-sm font-semibold text-[#0F172A]">Next Best Action</p><p className="text-sm text-[#334155]">{result.nextBestAction}</p></div><div><p className="text-sm font-semibold text-[#0F172A]">Suggested Email</p><Textarea className="mt-2 min-h-[260px]" value={result.suggestedEmail || ""} readOnly /></div></section> : null}
      </div>
    </div>
  );
}
