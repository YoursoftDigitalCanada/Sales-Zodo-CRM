import { AlertCircle, CheckCircle2, ClipboardCheck, Users } from "lucide-react";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ProjectWizardFormValues } from "@/lib/validations/project.schema";

interface UserOption {
  id: string;
  name: string;
}

interface CrewOption {
  id: string;
  name: string;
  isAvailable?: boolean;
  availabilityNote?: string;
  memberCount?: number;
}

interface Step6ReviewProps {
  projectManagers: UserOption[];
  salesReps: UserOption[];
  crews: CrewOption[];
  isManagersLoading?: boolean;
  isSalesRepsLoading?: boolean;
  isCrewsLoading?: boolean;
  stageOptions?: Array<{ id: string; name: string }>;
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.06)] py-2 text-sm">
      <span className="text-[#64748B]">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium text-[#0F172A]">{value || "-"}</span>
    </div>
  );
}

export function Step6Review({
  projectManagers,
  salesReps,
  crews,
  isManagersLoading,
  isSalesRepsLoading,
  isCrewsLoading,
  stageOptions = [],
}: Step6ReviewProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProjectWizardFormValues>();

  const values = watch();

  const selectedCrew = useMemo(() => crews.find((crew) => crew.id === values.crewId) || null, [crews, values.crewId]);
  const selectedStageName = useMemo(
    () => stageOptions.find((stage) => stage.id === values.stageSelection)?.name || values.stageSelection,
    [stageOptions, values.stageSelection],
  );

  return (
    <div className="space-y-4">
      <Card className="border-[rgba(15,23,42,0.08)]">
        <CardHeader className="pb-3">
          <CardTitle className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
            <Users className="h-4 w-4 text-[#0891B2]" />
            Step 6: Assignment & Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Project Manager *</Label>
              <Select value={values.projectManagerId || ""} onValueChange={(value) => setValue("projectManagerId", value, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder={isManagersLoading ? "Loading project managers..." : "Select project manager"} />
                </SelectTrigger>
                <SelectContent>
                  {projectManagers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.projectManagerId?.message} />
            </div>

            <div>
              <Label>Sales Rep</Label>
              <Select value={values.salesRepId || ""} onValueChange={(value) => setValue("salesRepId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={isSalesRepsLoading ? "Loading sales reps..." : "Select sales rep"} />
                </SelectTrigger>
                <SelectContent>
                  {salesReps.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-[rgba(15,23,42,0.08)] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#0F172A]">Crew Assignment</h4>
              <label className="inline-flex items-center gap-2 text-xs text-[#475569]">
                <Checkbox checked={values.assignCrewLater} onCheckedChange={(checked) => setValue("assignCrewLater", Boolean(checked), { shouldValidate: true })} />
                Assign crew later
              </label>
            </div>

            {!values.assignCrewLater ? (
              <div className="space-y-2">
                <Select value={values.crewId || ""} onValueChange={(value) => setValue("crewId", value, { shouldValidate: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder={isCrewsLoading ? "Loading crews..." : "Select crew"} />
                  </SelectTrigger>
                  <SelectContent>
                    {crews.map((crew) => (
                      <SelectItem key={crew.id} value={crew.id}>
                        {crew.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.crewId?.message} />

                {selectedCrew ? (
                  <div className="rounded-md bg-slate-50 p-3 text-xs text-[#475569]">
                    <p className="font-medium text-[#0F172A]">{selectedCrew.name}</p>
                    {typeof selectedCrew.memberCount === "number" ? <p>Members: {selectedCrew.memberCount}</p> : null}
                    <p>
                      Availability:{" "}
                      <span className={selectedCrew.isAvailable === false ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                        {selectedCrew.isAvailable === false ? "Limited" : "Available"}
                      </span>
                    </p>
                    {selectedCrew.availabilityNote ? <p>{selectedCrew.availabilityNote}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-[#64748B]">Crew assignment can be completed later from the project detail page.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#0F172A]">Notifications</h4>
              <label className="inline-flex items-center gap-2 text-sm text-[#0F172A]">
                <Checkbox checked={values.notifyClient} onCheckedChange={(checked) => setValue("notifyClient", Boolean(checked))} />
                Notify client after creation
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[#0F172A]">
                <Checkbox checked={values.notifyTeam} onCheckedChange={(checked) => setValue("notifyTeam", Boolean(checked))} />
                Notify team and project manager
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[#0F172A]">
                <Checkbox checked={values.createTasksFromTemplate} onCheckedChange={(checked) => setValue("createTasksFromTemplate", Boolean(checked))} />
                Auto-create standard task checklist
              </label>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#0F172A]">Post Creation Actions</h4>
              <label className="inline-flex items-center gap-2 text-sm text-[#0F172A]">
                <Checkbox checked={values.postCreateOpenProject} onCheckedChange={(checked) => setValue("postCreateOpenProject", Boolean(checked))} />
                Open project detail after submit
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[#0F172A]">
                <Checkbox checked={values.postCreateGenerateInvoice} onCheckedChange={(checked) => setValue("postCreateGenerateInvoice", Boolean(checked))} />
                Generate invoice draft
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[#0F172A]">
                <Checkbox checked={values.postCreateScheduleInspection} onCheckedChange={(checked) => setValue("postCreateScheduleInspection", Boolean(checked))} />
                Schedule initial inspection
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[#0F172A]">
                <Checkbox checked={values.postCreateUploadDocuments} onCheckedChange={(checked) => setValue("postCreateUploadDocuments", Boolean(checked))} />
                Open document upload workflow
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Internal Notes</Label>
              <Textarea {...register("internalNotes")} rows={4} placeholder="Internal office notes for PM/operations" />
            </div>
            <div>
              <Label>Crew Instructions</Label>
              <Textarea {...register("crewInstructions")} rows={4} placeholder="Crew-specific execution instructions" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[rgba(15,23,42,0.08)]">
        <CardHeader className="pb-3">
          <CardTitle className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
            <ClipboardCheck className="h-4 w-4 text-[#0891B2]" />
            Full Summary Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-md border border-[rgba(15,23,42,0.08)] p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Project</h4>
              <SummaryRow label="Project Name" value={values.projectName} />
              <SummaryRow label="Type" value={values.projectType} />
              <SummaryRow label="Property" value={values.propertyType} />
              <SummaryRow label="Priority" value={values.priority} />
              <SummaryRow label="Stage" value={selectedStageName} />
            </div>

            <div className="rounded-md border border-[rgba(15,23,42,0.08)] p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Client & Site</h4>
              <SummaryRow label="Client Mode" value={values.clientSelection === "existing" ? "Existing Client" : "New Client"} />
              <SummaryRow label="Client" value={values.clientSelection === "existing" ? values.clientId : `${values.newClientFirstName || ""} ${values.newClientLastName || ""}`.trim()} />
              <SummaryRow label="Address" value={values.jobSiteAddress || "(From client)"} />
              <SummaryRow label="City / State" value={[values.jobSiteCity, values.jobSiteState].filter(Boolean).join(", ")} />
              <SummaryRow label="ZIP" value={values.jobSiteZip || ""} />
            </div>

            <div className="rounded-md border border-[rgba(15,23,42,0.08)] p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Scope</h4>
              <SummaryRow label="Roof Type" value={values.roofType} />
              <SummaryRow label="Squares" value={String(values.roofSquares || "")} />
              <SummaryRow label="Stories" value={String(values.stories || "")} />
              <SummaryRow label="Shingle" value={[values.shingleManufacturer, values.shingleProduct].filter(Boolean).join(" - ")} />
              <SummaryRow label="Permit" value={values.permitRequired ? `Yes (${values.permitStatus || "Pending"})` : "No"} />
            </div>

            <div className="rounded-md border border-[rgba(15,23,42,0.08)] p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Financial & Assignment</h4>
              <SummaryRow label="Contract Value" value={values.contractValue ? `$${Number(values.contractValue).toLocaleString()}` : ""} />
              <SummaryRow label="Start Date" value={values.estimatedStartDate || ""} />
              <SummaryRow label="End Date" value={values.estimatedEndDate || ""} />
              <SummaryRow label="Project Manager" value={projectManagers.find((user) => user.id === values.projectManagerId)?.name || values.projectManagerId} />
              <SummaryRow label="Crew" value={values.assignCrewLater ? "Assign later" : crews.find((crew) => crew.id === values.crewId)?.name || values.crewId || ""} />
            </div>
          </div>

          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <span className="inline-flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Ready to Create
            </span>
            <p className="mt-1 text-xs text-emerald-700/90">
              Review the summary above. You can still go back to any step to adjust details before submitting.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {values.isInsuranceJob || values.projectType === "INSURANCE_CLAIM" ? (
                <Badge className="bg-violet-100 text-violet-700">Insurance Workflow Enabled</Badge>
              ) : null}
              {values.permitRequired ? <Badge className="bg-amber-100 text-amber-700">Permit Required</Badge> : null}
              {values.assignCrewLater ? <Badge className="bg-slate-100 text-slate-700">Crew Assignment Pending</Badge> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Step6Review;
