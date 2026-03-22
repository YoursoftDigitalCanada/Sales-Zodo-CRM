import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { AlertCircle, Info, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PRIORITY_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  ProjectWizardFormValues,
} from "@/lib/validations/project.schema";

type ProjectTypeValue = ProjectWizardFormValues["projectType"];
type PropertyTypeValue = ProjectWizardFormValues["propertyType"];
type PriorityValue = ProjectWizardFormValues["priority"];

interface Step1BasicInfoProps {
  stageOptions: Array<{ id: string; name: string; color?: string }>;
  isLoadingStages?: boolean;
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

export function Step1BasicInfo({ stageOptions, isLoadingStages }: Step1BasicInfoProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProjectWizardFormValues>();

  const [tagInput, setTagInput] = useState("");
  const tags = watch("tags") || [];

  const addTag = () => {
    const normalized = tagInput.trim();
    if (!normalized) return;
    if (tags.includes(normalized)) {
      setTagInput("");
      return;
    }
    setValue("tags", [...tags, normalized], { shouldDirty: true, shouldValidate: true });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((item) => item !== tag),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-[rgba(15,23,42,0.08)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">Step 2: Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input {...register("projectName")} placeholder="Smith Residence - Full Roof Replacement" />
            <FieldError message={errors.projectName?.message} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Project Type *</Label>
              <Select
                value={watch("projectType")}
                onValueChange={(value) => setValue("projectType", value as ProjectTypeValue, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.projectType?.message} />
            </div>

            <div className="space-y-2">
              <Label>Property Type *</Label>
              <Select
                value={watch("propertyType")}
                onValueChange={(value) => setValue("propertyType", value as PropertyTypeValue, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.propertyType?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority *</Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) => setValue("priority", value as PriorityValue, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.priority?.message} />
            </div>

            <div className="space-y-2">
              <Label>Pipeline Stage *</Label>
              <Select
                value={watch("stageSelection")}
                onValueChange={(value) => setValue("stageSelection", value, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingStages ? "Loading stages..." : "Select stage"} />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color || "#0891B2" }} />
                        {stage.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.stageSelection?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              {...register("description")}
              rows={4}
              placeholder="Describe project scope, constraints, special site requirements, and customer expectations."
            />
            <p className="text-xs text-[#64748B]">Keep this concise. Use internal notes later for crew-only details.</p>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 rounded-md border border-[rgba(15,23,42,0.08)] p-2">
              {tags.map((tag) => (
                <Badge key={tag} className="bg-[#0891B2]/10 text-[#0891B2]">
                  {tag}
                  <button type="button" className="ml-1 rounded p-0.5 hover:bg-[#0891B2]/20" onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex min-w-[220px] flex-1 items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tags (insurance, premium, emergency)"
                  className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                />
                <button
                  type="button"
                  className={cn(
                    "rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A]",
                    !tagInput.trim() && "pointer-events-none opacity-40",
                  )}
                  onClick={addTag}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-[#0891B2]/20 bg-[#0891B2]/5 px-3 py-2 text-xs text-[#0E7490]">
            <span className="inline-flex items-center gap-1 font-medium">
              <Info className="h-3.5 w-3.5" />
              Tip:
            </span>{" "}
            Use a specific name format: client/property + scope (e.g. "Smith Residence - Roof Replacement").
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Step1BasicInfo;
