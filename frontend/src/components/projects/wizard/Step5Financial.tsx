import { AlertCircle, Calculator, TrendingUp } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DURATION_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  ProjectWizardFormValues,
  WARRANTY_TYPE_OPTIONS,
} from "@/lib/validations/project.schema";
import { cn } from "@/lib/utils";

interface Step5FinancialProps {
  estimatedTotalCost: number;
  estimatedProfit: number;
  estimatedMargin: number;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function Step5Financial({ estimatedTotalCost, estimatedProfit, estimatedMargin }: Step5FinancialProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProjectWizardFormValues>();

  return (
    <div className="space-y-4">
      <Card className="border-[rgba(15,23,42,0.08)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">Step 5: Financial & Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Contract Value *</Label>
              <Input type="number" step="0.01" {...register("contractValue")} placeholder="0.00" />
              <FieldError message={errors.contractValue?.message} />
            </div>
            <div>
              <Label>Estimated Material Cost</Label>
              <Input type="number" step="0.01" {...register("estimatedMaterialCost")} placeholder="0.00" />
            </div>
            <div>
              <Label>Estimated Labor Cost</Label>
              <Input type="number" step="0.01" {...register("estimatedLaborCost")} placeholder="0.00" />
            </div>
            <div>
              <Label>Estimated Other Costs</Label>
              <Input type="number" step="0.01" {...register("estimatedOtherCosts")} placeholder="0.00" />
            </div>
          </div>

          <div className="rounded-md border border-[rgba(15,23,42,0.08)] bg-slate-50/80 p-4">
            <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F172A]">
              <Calculator className="h-4 w-4 text-[#0891B2]" />
              Live Profitability
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-[rgba(15,23,42,0.08)] bg-white p-3">
                <p className="text-[11px] uppercase tracking-wide text-[#64748B]">Estimated Total Cost</p>
                <p className="mt-1 text-base font-semibold text-[#0F172A]">{formatter.format(estimatedTotalCost)}</p>
              </div>
              <div className="rounded-md border border-[rgba(15,23,42,0.08)] bg-white p-3">
                <p className="text-[11px] uppercase tracking-wide text-[#64748B]">Estimated Profit</p>
                <p className={cn("mt-1 text-base font-semibold", estimatedProfit >= 0 ? "text-emerald-700" : "text-rose-700")}>
                  {formatter.format(estimatedProfit)}
                </p>
              </div>
              <div className="rounded-md border border-[rgba(15,23,42,0.08)] bg-white p-3">
                <p className="text-[11px] uppercase tracking-wide text-[#64748B]">Estimated Margin</p>
                <p className={cn("mt-1 inline-flex items-center gap-1 text-base font-semibold", estimatedMargin >= 0 ? "text-[#0891B2]" : "text-rose-700")}>
                  <TrendingUp className="h-4 w-4" />
                  {estimatedMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Payment Terms</Label>
              <Select value={watch("paymentTerms") || ""} onValueChange={(value) => setValue("paymentTerms", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Warranty Type</Label>
              <Select value={watch("warrantyType") || ""} onValueChange={(value) => setValue("warrantyType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warranty type" />
                </SelectTrigger>
                <SelectContent>
                  {WARRANTY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Workmanship Warranty Years</Label>
              <Input type="number" {...register("workmanshipWarrantyYears")} placeholder="e.g. 5" />
            </div>
          </div>

          <div className="rounded-md border border-[rgba(15,23,42,0.08)] p-3">
            <h4 className="mb-3 text-sm font-semibold text-[#0F172A]">Schedule</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label>Estimated Start Date *</Label>
                <Input type="date" {...register("estimatedStartDate")} />
                <FieldError message={errors.estimatedStartDate?.message} />
              </div>
              <div>
                <Label>Estimated End Date</Label>
                <Input type="date" {...register("estimatedEndDate")} />
                <FieldError message={errors.estimatedEndDate?.message} />
              </div>
              <div>
                <Label>Estimated Duration</Label>
                <Select value={watch("estimatedDuration") || ""} onValueChange={(value) => setValue("estimatedDuration", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Step5Financial;
