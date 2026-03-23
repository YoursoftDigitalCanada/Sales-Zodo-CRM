import { KeyboardEvent, useMemo } from "react";
import { FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ProjectWizardStepId, useProjectForm } from "@/hooks/useProjectForm";
import Step1BasicInfo from "@/components/projects/wizard/Step1BasicInfo";
import Step2ClientSite from "@/components/projects/wizard/Step2ClientSite";
import Step3JobDetails from "@/components/projects/wizard/Step3JobDetails";
import Step4Insurance from "@/components/projects/wizard/Step4Insurance";
import Step5Financial from "@/components/projects/wizard/Step5Financial";
import Step6Review from "@/components/projects/wizard/Step6Review";

function formatSavedAt(value: Date | null): string {
  if (!value) return "Not yet";
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function extractEntityId(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const id = (value as { id?: unknown }).id;
  if (typeof id === "string" || typeof id === "number") return String(id);
  return "";
}

export function ProjectWizard({ editId }: { editId?: string }) {
  const navigate = useNavigate();
  const isEditMode = Boolean(editId);
  const {
    form,
    currentStepId,
    currentStepIndex,
    visibleSteps,
    completionPercent,
    stageOptions,
    isStagesLoading,
    clientSearch,
    setClientSearch,
    clientOptions,
    isClientsLoading,
    projectManagers,
    isManagersLoading,
    salesReps,
    isSalesRepsLoading,
    crews,
    isCrewsLoading,
    shingleProductOptions,
    estimatedTotalCost,
    estimatedProfit,
    estimatedMargin,
    goNextStep,
    goBackStep,
    goToStep,
    submitProject,
    saveDraftNow,
    isSubmitting,
    isSavingDraft,
    lastLocalSaveAt,
    lastRemoteSaveAt,
  } = useProjectForm(editId);

  const isLastStep = currentStepIndex >= visibleSteps.length - 1;
  const activeStep = useMemo(
    () => visibleSteps.find((step) => step.id === currentStepId) || visibleSteps[0],
    [currentStepId, visibleSteps],
  );

  const renderStep = (stepId: ProjectWizardStepId) => {
    switch (stepId) {
      case "basic":
        return <Step1BasicInfo stageOptions={stageOptions} isLoadingStages={isStagesLoading} />;
      case "clientSite":
        return (
          <Step2ClientSite
            clientSearch={clientSearch}
            setClientSearch={setClientSearch}
            clientOptions={clientOptions}
            isClientsLoading={isClientsLoading}
          />
        );
      case "jobDetails":
        return <Step3JobDetails shingleProductOptions={shingleProductOptions} />;
      case "insurance":
        return <Step4Insurance />;
      case "financial":
        return (
          <Step5Financial
            estimatedTotalCost={estimatedTotalCost}
            estimatedProfit={estimatedProfit}
            estimatedMargin={estimatedMargin}
          />
        );
      case "review":
        return (
          <Step6Review
            projectManagers={projectManagers}
            salesReps={salesReps}
            crews={crews}
            isManagersLoading={isManagersLoading}
            isSalesRepsLoading={isSalesRepsLoading}
            isCrewsLoading={isCrewsLoading}
            stageOptions={stageOptions}
          />
        );
      default:
        return null;
    }
  };

  const handleCreateProject = async () => {
    const created = await submitProject();
    if (!created) return;

    const projectId = extractEntityId(created);
    if (form.getValues("postCreateOpenProject") && projectId) {
      navigate(`/projects/${projectId}`);
      return;
    }
    navigate("/projects");
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.defaultPrevented) return;
    if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    if (tagName === "textarea" || tagName === "button") return;

    if (target instanceof HTMLInputElement) {
      const blockedTypes = new Set(["checkbox", "radio", "file", "submit", "button"]);
      if (blockedTypes.has(target.type)) return;
    }

    if (isLastStep) return;
    event.preventDefault();
    void goNextStep();
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={(event) => event.preventDefault()} onKeyDown={handleFormKeyDown} className="space-y-4 pb-28">
        <Card className="border-[rgba(15,23,42,0.08)]">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold text-[#0F172A]">{isEditMode ? "Edit Roofing Project" : "Create Roofing Project"}</CardTitle>
                <p className="text-sm text-[#64748B]">
                  Step {currentStepIndex + 1} of {visibleSteps.length}: {activeStep?.description}
                </p>
              </div>
              <Button type="button" variant="outline" className="gap-2" onClick={() => navigate("/projects")}>
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Completion</span>
                <span>{completionPercent}%</span>
              </div>
              <Progress value={completionPercent} className="h-2 bg-slate-200" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${Math.max(visibleSteps.length, 1)}, minmax(0, 1fr))` }}
            >
              {visibleSteps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isActive = index === currentStepIndex;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => void goToStep(step.id)}
                    className={cn(
                      "rounded-md border px-2 py-2 text-left transition-colors",
                      isActive && "border-[#0891B2] bg-[#0891B2]/5",
                      isCompleted && "border-emerald-200 bg-emerald-50",
                      !isActive && !isCompleted && "border-[rgba(15,23,42,0.08)] bg-white hover:bg-slate-50",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                          isActive && "border-[#0891B2] bg-[#0891B2] text-white",
                          isCompleted && "border-emerald-600 bg-emerald-600 text-white",
                          !isActive && !isCompleted && "border-slate-300 text-slate-500",
                        )}
                      >
                        {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                      </span>
                      <span className={cn("font-semibold", isActive ? "text-[#0F172A]" : "text-[#475569]")}>{step.title}</span>
                    </div>
                    <p className="hidden text-[11px] text-[#64748B] md:block">{step.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div>{activeStep ? renderStep(activeStep.id) : null}</div>

        <div className="sticky bottom-0 z-20 rounded-md border border-[rgba(15,23,42,0.08)] bg-white/95 px-3 py-3 backdrop-blur">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
            <span>Local auto-save: {formatSavedAt(lastLocalSaveAt)}</span>
            <span>Server draft sync: {formatSavedAt(lastRemoteSaveAt)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void saveDraftNow()}
              disabled={isSavingDraft || isSubmitting}
            >
              {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </Button>
            <Button type="button" variant="outline" onClick={goBackStep} disabled={currentStepIndex === 0 || isSubmitting}>
              Back
            </Button>
            {!isLastStep ? (
              <Button type="button" className="bg-[#0891B2] text-white hover:bg-[#0E7490]" onClick={() => void goNextStep()}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-[#0891B2] text-white hover:bg-[#0E7490]"
                onClick={() => void handleCreateProject()}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEditMode ? "Update Project" : "Create Project"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

export default ProjectWizard;
