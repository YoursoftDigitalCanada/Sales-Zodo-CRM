import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createPricingPlan, getPricingPlans, updatePricingPlan } from "@/features/billing/services/billing-service";
import { CheckCircle2, Pencil, Plus } from "lucide-react";

const money = (value: unknown) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Number(value || 0));

const emptyPlan = { planName: "", monthlyPrice: "", annualPrice: "", setupFee: "", seatLimit: "", includedFeatures: "", isActive: true };

export default function PricingPlansPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyPlan);
  const plansQuery = useQuery({ queryKey: ["pricing-plans"], queryFn: () => getPricingPlans() });
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, includedFeatures: String(form.includedFeatures || "").split("\n").map((item) => item.trim()).filter(Boolean), seatLimit: form.seatLimit ? Number(form.seatLimit) : null };
      return form.id ? updatePricingPlan(form.id, payload) : createPricingPlan(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-plans"] });
      setOpen(false);
      toast({ title: "Pricing plan saved" });
    },
    onError: (error: any) => toast({ title: "Save failed", description: error?.response?.data?.message || error?.message, variant: "destructive" }),
  });

  const edit = (plan?: any) => {
    setForm(plan ? { ...plan, includedFeatures: (plan.includedFeatures || []).join("\n") } : emptyPlan);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) setForm(emptyPlan);
  }, [open]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div><h1 className="text-2xl font-semibold text-[#0F172A]">Pricing Plans</h1><p className="text-sm text-[#64748B]">Manage Roofer CRM subscription packages and setup fees.</p></div>
          <Button onClick={() => edit()} className="gap-2 bg-[#0F766E] hover:bg-[#115E59]"><Plus size={16} />New Plan</Button>
        </div>
      </div>
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
        {(plansQuery.data || []).map((plan) => (
          <div key={plan.id} className="rounded-lg border border-[#E2E8F0] bg-white p-5">
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold text-[#0F172A]">{plan.planName}</h2><Badge variant="outline" className={plan.isActive ? "mt-2 border-emerald-200 bg-emerald-50 text-emerald-700" : "mt-2"}>{plan.isActive ? "Active" : "Inactive"}</Badge></div><Button variant="ghost" size="icon" onClick={() => edit(plan)}><Pencil size={16} /></Button></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#F8FAFC] p-3"><p className="text-xs text-[#64748B]">Monthly</p><p className="font-semibold">{money(plan.monthlyPrice)}</p></div>
              <div className="rounded-lg bg-[#F8FAFC] p-3"><p className="text-xs text-[#64748B]">Annual</p><p className="font-semibold">{money(plan.annualPrice)}</p></div>
              <div className="rounded-lg bg-[#F8FAFC] p-3"><p className="text-xs text-[#64748B]">Setup Fee</p><p className="font-semibold">{money(plan.setupFee)}</p></div>
              <div className="rounded-lg bg-[#F8FAFC] p-3"><p className="text-xs text-[#64748B]">Seats</p><p className="font-semibold">{plan.seatLimit || "Unlimited"}</p></div>
            </div>
            <div className="mt-4 space-y-2">{(plan.includedFeatures || []).map((feature: string) => <p key={feature} className="flex items-center gap-2 text-sm text-[#475569]"><CheckCircle2 size={14} className="text-[#0F766E]" />{feature}</p>)}</div>
          </div>
        ))}
      </main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit Plan" : "Create Plan"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Plan Name</Label><Input value={form.planName} onChange={(e) => setForm((c: any) => ({ ...c, planName: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Monthly Price</Label><Input type="number" value={form.monthlyPrice} onChange={(e) => setForm((c: any) => ({ ...c, monthlyPrice: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Annual Price</Label><Input type="number" value={form.annualPrice} onChange={(e) => setForm((c: any) => ({ ...c, annualPrice: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Setup Fee</Label><Input type="number" value={form.setupFee} onChange={(e) => setForm((c: any) => ({ ...c, setupFee: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Seat Limit</Label><Input type="number" value={form.seatLimit || ""} onChange={(e) => setForm((c: any) => ({ ...c, seatLimit: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Included Features</Label><Textarea rows={5} value={form.includedFeatures} onChange={(e) => setForm((c: any) => ({ ...c, includedFeatures: e.target.value }))} placeholder="One feature per line" /></div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} className="bg-[#0F766E] hover:bg-[#115E59]">Save Plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
