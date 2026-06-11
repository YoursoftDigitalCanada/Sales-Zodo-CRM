import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTransactionTimeline } from "@/features/bookkeeping/services/bookkeeping-service";
import { Loader2, GitCommit, Search, Sparkles, Server, CheckCircle2 } from "lucide-react";

export function DecisionTimelineDialog({ transactionId, open, onOpenChange }: { transactionId: string | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && transactionId) {
      setLoading(true);
      getTransactionTimeline(transactionId)
        .then(res => setTimeline(res.data || []))
        .catch(err => console.error("Failed to load timeline", err))
        .finally(() => setLoading(false));
    } else {
      setTimeline([]);
    }
  }, [open, transactionId]);

  const getIcon = (eventType: string) => {
    if (eventType.includes("Import")) return <Server className="h-4 w-4 text-slate-500" />;
    if (eventType.includes("Duplicate") || eventType.includes("Transfer")) return <Search className="h-4 w-4 text-amber-500" />;
    if (eventType.includes("Ai")) return <Sparkles className="h-4 w-4 text-[#0891B2]" />;
    if (eventType.includes("Validated") || eventType.includes("Posted")) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    return <GitCommit className="h-4 w-4 text-slate-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#0891B2]" />
            AI Decision Timeline
          </DialogTitle>
          <DialogDescription className="text-[#64748B]">
            Transparent event sourcing log explaining exactly how this transaction was processed.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#0891B2]" />
          </div>
        ) : timeline.length === 0 ? (
          <div className="text-center p-8 text-slate-500 text-sm">
            No events found for this transaction.
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent mt-4">
            {timeline.map((event, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 relative">
                  {getIcon(event.event)}
                </div>
                
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white shadow-sm transition-all hover:border-[#0891B2]/30 hover:shadow-md">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-[#0F172A]">{event.event.replace("AccountingEvent", "").replace(/([A-Z])/g, ' $1').trim()}</h3>
                    <time className="text-xs text-[#64748B] font-mono">{new Date(event.timestamp).toLocaleTimeString()}</time>
                  </div>
                  <div className="text-xs text-[#64748B] bg-slate-50 p-2 rounded-lg mt-2 overflow-x-auto border border-slate-100">
                    <pre className="font-mono text-[10px]">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
