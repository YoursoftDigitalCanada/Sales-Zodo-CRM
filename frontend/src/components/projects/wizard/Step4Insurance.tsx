import { AlertCircle, Shield } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  INSURANCE_CLAIM_STATUS_OPTIONS,
  INSURANCE_COMPANY_OPTIONS,
  ProjectWizardFormValues,
} from "@/lib/validations/project.schema";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

export function Step4Insurance() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProjectWizardFormValues>();

  const isInsuranceJob = watch("isInsuranceJob") || watch("projectType") === "INSURANCE_CLAIM";

  return (
    <div className="space-y-4">
      <Card className="border-[rgba(15,23,42,0.08)]">
        <CardHeader className="pb-3">
          <CardTitle className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
            <Shield className="h-4 w-4 text-[#0891B2]" />
            Step 4: Insurance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md border border-[rgba(15,23,42,0.08)] px-3 py-2">
            <div>
              <p className="text-sm font-medium text-[#0F172A]">Is this an insurance job?</p>
              <p className="text-xs text-[#64748B]">Enable to track claim and adjuster details.</p>
            </div>
            <Switch checked={isInsuranceJob} onCheckedChange={(checked) => setValue("isInsuranceJob", checked, { shouldValidate: true })} />
          </div>

          {!isInsuranceJob ? (
            <p className="rounded-md border border-dashed border-[rgba(15,23,42,0.14)] p-4 text-sm text-[#64748B]">
              Insurance step is optional. Turn on "Is this an insurance job" to capture claim details.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Insurance Company *</Label>
                  <Select value={watch("insuranceCompany") || ""} onValueChange={(value) => setValue("insuranceCompany", value, { shouldValidate: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select insurance company" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSURANCE_COMPANY_OPTIONS.map((company) => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.insuranceCompany?.message} />
                </div>

                <div>
                  <Label>Claim Status</Label>
                  <Select value={watch("claimStatus") || ""} onValueChange={(value) => setValue("claimStatus", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select claim status" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSURANCE_CLAIM_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Policy Number</Label>
                  <Input {...register("policyNumber")} placeholder="Policy #" />
                </div>
                <div>
                  <Label>Claim Number</Label>
                  <Input {...register("claimNumber")} placeholder="Claim #" />
                </div>
                <div>
                  <Label>Date of Loss</Label>
                  <Input type="date" {...register("dateOfLoss")} />
                </div>
                <div>
                  <Label>Deductible</Label>
                  <Input type="number" step="0.01" {...register("deductible")} placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Insurance Approved Amount</Label>
                  <Input type="number" step="0.01" {...register("insuranceApprovedAmount")} placeholder="0.00" />
                </div>
                <div>
                  <Label>Adjuster Name</Label>
                  <Input {...register("adjusterName")} placeholder="Adjuster full name" />
                </div>
                <div>
                  <Label>Adjuster ID</Label>
                  <Input {...register("adjusterId")} placeholder="Adjuster ID" />
                </div>
                <div>
                  <Label>Adjuster Phone</Label>
                  <Input {...register("adjusterPhone")} placeholder="(555) 555-1234" />
                </div>
                <div className="md:col-span-2">
                  <Label>Adjuster Email</Label>
                  <Input {...register("adjusterEmail")} placeholder="adjuster@insurance.com" />
                  <FieldError message={errors.adjusterEmail?.message} />
                </div>
              </div>

              <div>
                <Label>Insurance Notes</Label>
                <Textarea
                  {...register("insuranceNotes")}
                  rows={4}
                  placeholder="Document supplements, depreciation notes, denied line items, and communication history."
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Step4Insurance;
