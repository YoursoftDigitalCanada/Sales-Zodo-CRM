import { AlertCircle, Info } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ADDITIONAL_WORK_OPTIONS,
  CURRENT_ROOF_MATERIAL_OPTIONS,
  EXISTING_LAYERS_OPTIONS,
  PERMIT_STATUS_OPTIONS,
  ROOF_FEATURE_OPTIONS,
  ROOF_PITCH_OPTIONS,
  ROOF_TYPE_OPTIONS,
  SHINGLE_COLOR_OPTIONS,
  SHINGLE_MANUFACTURER_OPTIONS,
  STORIES_OPTIONS,
  UNDERLAYMENT_OPTIONS,
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

interface Step3JobDetailsProps {
  shingleProductOptions: string[];
}

export function Step3JobDetails({ shingleProductOptions }: Step3JobDetailsProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProjectWizardFormValues>();

  const roofFeatures = watch("roofFeatures") || [];
  const additionalWork = watch("additionalWork") || [];
  const permitRequired = watch("permitRequired");

  const toggleArrayValue = (field: "roofFeatures" | "additionalWork", value: string) => {
    const current = watch(field) || [];
    const next = current.includes(value) ? current.filter((item: string) => item !== value) : [...current, value];
    setValue(field, next as ProjectWizardFormValues[typeof field], { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-4">
      <Card className="border-[rgba(15,23,42,0.08)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">Step 3: Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Roof Type *</Label>
              <Select value={watch("roofType")} onValueChange={(value) => setValue("roofType", value, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select roof type" />
                </SelectTrigger>
                <SelectContent>
                  {ROOF_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.roofType?.message} />
            </div>

            <div>
              <Label>Current Roof Material</Label>
              <Select value={watch("currentRoofMaterial") || ""} onValueChange={(value) => setValue("currentRoofMaterial", value, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Current material" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENT_ROOF_MATERIAL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Roof Squares *</Label>
              <Input type="number" step="0.1" {...register("roofSquares")} placeholder="e.g. 32" />
              <FieldError message={errors.roofSquares?.message} />
            </div>

            <div>
              <Label>Roof Pitch</Label>
              <Select value={watch("roofPitch") || ""} onValueChange={(value) => setValue("roofPitch", value, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pitch" />
                </SelectTrigger>
                <SelectContent>
                  {ROOF_PITCH_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Stories *</Label>
              <Select value={watch("stories") || ""} onValueChange={(value) => setValue("stories", value, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stories" />
                </SelectTrigger>
                <SelectContent>
                  {STORIES_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.stories?.message} />
            </div>

            <div>
              <Label>Existing Layers</Label>
              <Select value={watch("existingLayers") || ""} onValueChange={(value) => setValue("existingLayers", value, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select layers" />
                </SelectTrigger>
                <SelectContent>
                  {EXISTING_LAYERS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roof Features</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROOF_FEATURE_OPTIONS.map((feature) => (
                <label key={feature} className="flex items-center gap-2 rounded-md border border-[rgba(15,23,42,0.08)] px-3 py-2">
                  <Checkbox checked={roofFeatures.includes(feature)} onCheckedChange={() => toggleArrayValue("roofFeatures", feature)} />
                  <span className="text-sm text-[#0F172A]">{feature}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[rgba(15,23,42,0.08)] p-3">
            <h4 className="mb-3 text-sm font-semibold text-[#0F172A]">Shingle & Material Selection</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Shingle Manufacturer *</Label>
                <Select
                  value={watch("shingleManufacturer") || ""}
                  onValueChange={(value) => {
                    setValue("shingleManufacturer", value, { shouldValidate: true });
                    setValue("shingleProduct", "", { shouldValidate: true });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHINGLE_MANUFACTURER_OPTIONS.map((manufacturer) => (
                      <SelectItem key={manufacturer} value={manufacturer}>
                        {manufacturer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.shingleManufacturer?.message} />
              </div>

              <div>
                <Label>Shingle Product</Label>
                <Select
                  value={watch("shingleProduct") || ""}
                  onValueChange={(value) => setValue("shingleProduct", value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={shingleProductOptions.length > 0 ? "Select product" : "Pick manufacturer first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {shingleProductOptions.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Shingle Color</Label>
                <Select value={watch("shingleColor") || ""} onValueChange={(value) => setValue("shingleColor", value, { shouldValidate: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHINGLE_COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Underlayment</Label>
                <Select value={watch("underlaymentType") || ""} onValueChange={(value) => setValue("underlaymentType", value, { shouldValidate: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select underlayment" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNDERLAYMENT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Work</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ADDITIONAL_WORK_OPTIONS.map((workItem) => (
                <label key={workItem} className="flex items-center gap-2 rounded-md border border-[rgba(15,23,42,0.08)] px-3 py-2">
                  <Checkbox checked={additionalWork.includes(workItem)} onCheckedChange={() => toggleArrayValue("additionalWork", workItem)} />
                  <span className="text-sm text-[#0F172A]">{workItem}</span>
                </label>
              ))}
            </div>
            <Textarea
              {...register("otherWorkDescription")}
              rows={3}
              placeholder="Describe any additional custom work or edge-case details"
            />
          </div>

          <div className="rounded-md border border-[rgba(15,23,42,0.08)] p-3">
            <h4 className="mb-3 text-sm font-semibold text-[#0F172A]">Permit Details</h4>

            <RadioGroup
              value={permitRequired ? "yes" : "no"}
              onValueChange={(value) => setValue("permitRequired", value === "yes", { shouldValidate: true })}
              className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[rgba(15,23,42,0.08)] px-3 py-2">
                <RadioGroupItem value="yes" />
                <span className="text-sm text-[#0F172A]">Permit Required</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[rgba(15,23,42,0.08)] px-3 py-2">
                <RadioGroupItem value="no" />
                <span className="text-sm text-[#0F172A]">No Permit Needed</span>
              </label>
            </RadioGroup>

            {permitRequired ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label>Permit Status</Label>
                  <Select value={watch("permitStatus") || ""} onValueChange={(value) => setValue("permitStatus", value, { shouldValidate: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERMIT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.permitStatus?.message} />
                </div>

                <div>
                  <Label>Permit Number</Label>
                  <Input {...register("permitNumber")} placeholder="Permit #" />
                </div>

                <div>
                  <Label>Permit Cost</Label>
                  <Input type="number" step="0.01" {...register("permitCost")} placeholder="0.00" />
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#64748B]">Permit details are hidden because permit is not required.</p>
            )}
          </div>

          <div className="rounded-md border border-[#0891B2]/20 bg-[#0891B2]/5 px-3 py-2 text-xs text-[#0E7490]">
            <span className="inline-flex items-center gap-1 font-medium">
              <Info className="h-3.5 w-3.5" />
              Tip:
            </span>{" "}
            Capture roof complexity and additional work here to improve crew planning and job costing accuracy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Step3JobDetails;
