import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/features/clients/services/clients-service";
import {
  CrewOption,
  ProjectClientOption,
  ProjectStageOption,
  ProjectUserOption,
  createProject,
  updateProject,
  getProjectById,
  getCrews,
  getProjectManagers,
  getProjectStages,
  getSalesReps,
  saveProjectDraft,
  searchProjectClients,
} from "@/features/projects";
import {
  SHINGLE_PRODUCTS_BY_MANUFACTURER,
  ProjectWizardFormValues,
  projectWizardDefaultValues,
  projectWizardSchema,
} from "@/lib/validations/project.schema";
import {
  normalizeEmailAddress,
  normalizeWhitespace,
} from "@contracts/contact";

const DRAFT_STORAGE_KEY = "roofing-project-wizard-draft-v2";

export type ProjectWizardStepId = "basic" | "clientSite" | "jobDetails" | "insurance" | "financial" | "review";

export interface WizardStepMeta {
  id: ProjectWizardStepId;
  title: string;
  description: string;
}

export const ALL_WIZARD_STEPS: WizardStepMeta[] = [
  { id: "clientSite", title: "Client & Site", description: "Client and location" },
  { id: "basic", title: "Basic", description: "Project identity" },
  { id: "jobDetails", title: "Job Details", description: "Roof scope" },
  { id: "insurance", title: "Insurance", description: "Claim details" },
  { id: "financial", title: "Financial", description: "Budget and schedule" },
  { id: "review", title: "Assignment", description: "Review and launch" },
];

const STEP_FIELDS: Record<ProjectWizardStepId, Array<keyof ProjectWizardFormValues>> = {
  basic: ["projectName", "projectType", "propertyType", "priority", "stageSelection"],
  clientSite: [
    "clientSelection",
    "clientId",
    "newClientFirstName",
    "newClientLastName",
    "newClientEmail",
    "newClientPhone",
    "sameAsClientAddress",
    "jobSiteAddress",
    "jobSiteCity",
    "jobSiteState",
    "jobSiteZip",
  ],
  jobDetails: [
    "roofType",
    "roofSquares",
    "stories",
    "shingleManufacturer",
    "permitRequired",
    "permitStatus",
  ],
  insurance: ["isInsuranceJob", "insuranceCompany", "policyNumber", "claimNumber", "dateOfLoss"],
  financial: [
    "contractValue",
    "estimatedMaterialCost",
    "estimatedLaborCost",
    "estimatedOtherCosts",
    "estimatedStartDate",
    "estimatedEndDate",
  ],
  review: ["projectManagerId", "salesRepId", "crewId", "assignCrewLater", "internalNotes", "crewInstructions"],
};

function isUuid(value?: string): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeText(value?: string): string | null {
  const normalized = value?.trim() || "";
  return normalized.length > 0 ? normalized : null;
}

function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readDraftFromStorage(): Partial<ProjectWizardFormValues> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ProjectWizardFormValues>;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDraftToStorage(values: ProjectWizardFormValues) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
}

function clearDraftStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

function inferStagePayload(selection: string, stageOptions: ProjectStageOption[]): { stageId?: string; status?: string } {
  if (!selection?.trim()) {
    return {};
  }

  const selected = stageOptions.find((option) => option.id === selection);
  if (selected) {
    if (selected.isUuid) return { stageId: selected.id };
    if (selected.statusFallback) return { status: selected.statusFallback };
  }

  if (isUuid(selection)) {
    return { stageId: selection };
  }

  const fallbackStatus = selection.toUpperCase().replace(/\s+/g, "_");
  return { status: fallbackStatus };
}

function parseEstimatedDurationDays(value?: string): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;

  const singleDayMatch = normalized.match(/^(\d+)\s*day/i);
  if (singleDayMatch) return Number(singleDayMatch[1]);

  const dayRangeMatch = normalized.match(/^(\d+)\s*-\s*(\d+)\s*days?/i);
  if (dayRangeMatch) return Number(dayRangeMatch[2]);

  const weekRangeMatch = normalized.match(/^(\d+)\s*-\s*(\d+)\s*weeks?/i);
  if (weekRangeMatch) return Number(weekRangeMatch[2]) * 7;

  const monthMatch = normalized.match(/^(\d+)\+?\s*month/i);
  if (monthMatch) return Number(monthMatch[1]) * 30;

  return null;
}

function parseLeadingNumber(value?: string): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function createProjectPayload(
  values: ProjectWizardFormValues,
  stageOptions: ProjectStageOption[],
  resolvedClientId: string,
  selectedCrewName?: string | null,
): Record<string, unknown> {
  const stagePayload = inferStagePayload(values.stageSelection, stageOptions);

  const estimatedMaterialCost = safeNumber(values.estimatedMaterialCost) || 0;
  const estimatedLaborCost = safeNumber(values.estimatedLaborCost) || 0;
  const estimatedOtherCosts = safeNumber(values.estimatedOtherCosts) || 0;
  const estimatedTotalCost = estimatedMaterialCost + estimatedLaborCost + estimatedOtherCosts;

  const customFields = {
    clientMode: values.clientSelection,
    newClient: values.clientSelection === "new"
      ? {
          firstName: safeText(values.newClientFirstName),
          lastName: safeText(values.newClientLastName),
          email: safeText(values.newClientEmail),
          phone: safeText(values.newClientPhone),
          company: safeText(values.newClientCompany),
        }
      : null,
    siteAccessNotes: safeText(values.siteAccessNotes),
    roofFeatures: values.roofFeatures,
    currentRoofMaterial: safeText(values.currentRoofMaterial),
    underlaymentType: safeText(values.underlaymentType),
    additionalWork: values.additionalWork,
    otherWorkDescription: safeText(values.otherWorkDescription),
    claimStatus: safeText(values.claimStatus),
    insuranceNotes: safeText(values.insuranceNotes),
    estimatedCostBreakdown: {
      estimatedMaterialCost,
      estimatedLaborCost,
      estimatedOtherCosts,
      estimatedTotalCost,
    },
    estimatedDurationLabel: safeText(values.estimatedDuration),
    paymentTerms: safeText(values.paymentTerms),
    crewId: safeText(values.crewId),
    crewName: safeText(selectedCrewName || ""),
    assignCrewLater: values.assignCrewLater,
    notifications: {
      notifyClient: values.notifyClient,
      notifyTeam: values.notifyTeam,
      createTasksFromTemplate: values.createTasksFromTemplate,
    },
    crewInstructions: safeText(values.crewInstructions),
    postCreateActions: {
      openProject: values.postCreateOpenProject,
      generateInvoice: values.postCreateGenerateInvoice,
      scheduleInspection: values.postCreateScheduleInspection,
      uploadDocuments: values.postCreateUploadDocuments,
    },
  };

  return {
    name: values.projectName,
    description: safeText(values.description),
    projectType: values.projectType,
    propertyType: values.propertyType,
    priority: values.priority,
    tags: values.tags,

    ...stagePayload,

    clientId: resolvedClientId,

    jobSiteAddress: safeText(values.jobSiteAddress),
    jobSiteAddress2: safeText(values.jobSiteAddress2),
    jobSiteCity: safeText(values.jobSiteCity),
    jobSiteState: safeText(values.jobSiteState),
    jobSiteZip: safeText(values.jobSiteZip),

    roofType: safeText(values.roofType),
    roofSquares: safeNumber(values.roofSquares),
    roofPitch: safeText(values.roofPitch),
    stories: parseLeadingNumber(values.stories),
    roofLayers: parseLeadingNumber(values.existingLayers),
    shingleManufacturer: safeText(values.shingleManufacturer),
    shingleProduct: safeText(values.shingleProduct),
    shingleColor: safeText(values.shingleColor),

    permitRequired: values.permitRequired,
    permitStatus: values.permitRequired ? safeText(values.permitStatus) : null,
    permitNumber: values.permitRequired ? safeText(values.permitNumber) : null,
    permitPulledDate: values.permitRequired ? values.permitPulledDate || null : null,
    permitApprovedDate: values.permitRequired ? values.permitApprovedDate || null : null,
    permitCost: values.permitRequired ? safeNumber(values.permitCost) : null,

    isInsuranceJob: values.isInsuranceJob || values.projectType === "INSURANCE_CLAIM",
    insuranceCompany: safeText(values.insuranceCompany),
    policyNumber: safeText(values.policyNumber),
    claimNumber: safeText(values.claimNumber),
    dateOfLoss: values.dateOfLoss || null,
    deductible: safeNumber(values.deductible),
    insuranceApprovedAmount: safeNumber(values.insuranceApprovedAmount),
    adjusterName: safeText(values.adjusterName),
    adjusterId: safeText(values.adjusterId),
    adjusterPhone: safeText(values.adjusterPhone),
    adjusterEmail: safeText(values.adjusterEmail),

    contractValue: safeNumber(values.contractValue) || 0,
    estimatedCost: estimatedTotalCost,

    warrantyType: safeText(values.warrantyType),
    warrantyYears: safeNumber(values.workmanshipWarrantyYears),

    estimatedStartDate: values.estimatedStartDate || null,
    estimatedEndDate: values.estimatedEndDate || null,
    estimatedDuration: parseEstimatedDurationDays(values.estimatedDuration),

    projectManagerId: safeText(values.projectManagerId),
    salesRepId: safeText(values.salesRepId),

    internalNotes: safeText(values.internalNotes),
    customFields,
  };
}

function createDraftPayload(values: ProjectWizardFormValues, stageOptions: ProjectStageOption[]): Record<string, unknown> {
  const stagePayload = inferStagePayload(values.stageSelection, stageOptions);
  return {
    name: values.projectName || "Draft Project",
    description: values.description || "",
    projectType: values.projectType,
    propertyType: values.propertyType,
    priority: values.priority,
    ...stagePayload,
    status: "DRAFT",
    clientId: values.clientSelection === "existing" ? safeText(values.clientId) : null,
    estimatedStartDate: values.estimatedStartDate || null,
    estimatedEndDate: values.estimatedEndDate || null,
    customFields: {
      wizardDraft: true,
      localOnlyClient: values.clientSelection === "new"
        ? {
            firstName: normalizeWhitespace(values.newClientFirstName),
            lastName: normalizeWhitespace(values.newClientLastName),
            email: normalizeEmailAddress(values.newClientEmail),
            phone: values.newClientPhone.trim(),
            company: values.newClientCompany,
          }
        : null,
      formValues: values,
    },
  };
}

export function useProjectForm(editId?: string) {
  const { toast } = useToast();
  const isEditMode = Boolean(editId);
  const [editLoaded, setEditLoaded] = useState(false);

  const [clientSearch, setClientSearch] = useState("");
  const [currentStepId, setCurrentStepId] = useState<ProjectWizardStepId>("clientSite");
  const [lastLocalSaveAt, setLastLocalSaveAt] = useState<Date | null>(null);
  const [lastRemoteSaveAt, setLastRemoteSaveAt] = useState<Date | null>(null);

  const initialDefaults = useMemo<ProjectWizardFormValues>(() => {
    if (editId) return { ...projectWizardDefaultValues };
    const draft = readDraftFromStorage();
    return { ...projectWizardDefaultValues, ...(draft || {}) };
  }, [editId]);

  const form = useForm<ProjectWizardFormValues>({
    resolver: zodResolver(projectWizardSchema),
    defaultValues: initialDefaults,
    mode: "onChange",
  });

  const watchedValues = form.watch();
  const insuranceStepEnabled = watchedValues.projectType === "INSURANCE_CLAIM" || watchedValues.isInsuranceJob;

  const visibleSteps = useMemo(() => {
    if (insuranceStepEnabled) return ALL_WIZARD_STEPS;
    return ALL_WIZARD_STEPS.filter((step) => step.id !== "insurance");
  }, [insuranceStepEnabled]);

  useEffect(() => {
    if (!visibleSteps.some((step) => step.id === currentStepId)) {
      setCurrentStepId("financial");
    }
  }, [currentStepId, visibleSteps]);

  const currentStepIndex = useMemo(
    () => Math.max(0, visibleSteps.findIndex((step) => step.id === currentStepId)),
    [currentStepId, visibleSteps],
  );

  const completionPercent = Math.round(((currentStepIndex + 1) / Math.max(visibleSteps.length, 1)) * 100);

  const stageQuery = useQuery({
    queryKey: ["project-wizard-stages"],
    queryFn: getProjectStages,
    staleTime: 60_000,
  });

  useEffect(() => {
    const selectedStage = form.getValues("stageSelection");
    if (selectedStage || !stageQuery.data?.length) return;
    const defaultStage = stageQuery.data.find((stage) => stage.isDefault) || stageQuery.data[0];
    if (defaultStage) {
      form.setValue("stageSelection", defaultStage.id, { shouldDirty: false });
    }
  }, [form, stageQuery.data]);

  // ─── EDIT MODE: fetch existing project and prefill form ───
  useEffect(() => {
    if (!editId || editLoaded) return;
    (async () => {
      try {
        const p = await getProjectById(editId);
        if (!p) return;

        const vals: Partial<ProjectWizardFormValues> = {
          projectName: p.name || "",
          description: p.description || "",
          projectType: (p.projectType as any) || "RE_ROOF",
          propertyType: (p.propertyType as any) || "RESIDENTIAL",
          priority: (p.priority as any) || "NORMAL",
          stageSelection: (p.status as string) || "PENDING",
          clientSelection: p.client?.id ? "existing" : "new",
          clientId: p.client?.id || "",
          jobSiteAddress: p.jobSiteAddress || p.location || "",
          jobSiteCity: p.jobSiteCity || "",
          jobSiteState: p.jobSiteState || "",
          jobSiteZip: p.jobSiteZip || "",
          roofType: (p.roofType as any) || "",
          shingleManufacturer: p.shingleManufacturer || "",
          shingleColor: p.shingleColor || "",
          permitRequired: p.permitRequired || false,
          permitStatus: (p.permitStatus as any) || "",
          permitNumber: p.permitNumber || "",
          permitPulledDate: p.permitPulledDate ? String(p.permitPulledDate).split("T")[0] : "",
          permitApprovedDate: p.permitApprovedDate ? String(p.permitApprovedDate).split("T")[0] : "",
          isInsuranceJob: p.isInsuranceJob || false,
          insuranceCompany: p.insuranceCompany || "",
          policyNumber: p.policyNumber || "",
          claimNumber: p.claimNumber || "",
          contractValue: p.contractValue ? Number(p.contractValue) : undefined,
          estimatedStartDate: p.estimatedStartDate ? String(p.estimatedStartDate).split("T")[0] : "",
          estimatedEndDate: p.estimatedEndDate ? String(p.estimatedEndDate).split("T")[0] : "",
          projectManagerId: typeof p.projectManagerId === "string" ? p.projectManagerId : "",
          salesRepId: typeof p.salesRepId === "string" ? p.salesRepId : "",
        };

        const customFields = p.customFields && typeof p.customFields === "object"
          ? (p.customFields as Record<string, unknown>)
          : {};
        const savedCrewId = typeof customFields.crewId === "string" ? customFields.crewId : "";
        const assignCrewLater = typeof customFields.assignCrewLater === "boolean"
          ? customFields.assignCrewLater
          : !savedCrewId;

        vals.crewId = savedCrewId;
        vals.assignCrewLater = assignCrewLater;

        // Set budget breakdown if available
        if (p.estimatedCost) {
          vals.estimatedMaterialCost = Number(p.estimatedCost);
        }

        form.reset({ ...projectWizardDefaultValues, ...vals });
        setEditLoaded(true);

        // Set client search to help find existing client
        if (p.client?.id) {
          setClientSearch(p.clientName || p.client?.clientName || "");
        }
      } catch (err) {
        console.error("Failed to load project for editing", err);
        toast({ title: "Error", description: "Could not load project data for editing.", variant: "destructive" });
      }
    })();
  }, [editId, editLoaded, form, toast]);

  const clientsQuery = useQuery({
    queryKey: ["project-wizard-clients", clientSearch],
    queryFn: () => searchProjectClients(clientSearch),
    staleTime: 20_000,
  });

  const managersQuery = useQuery({
    queryKey: ["project-wizard-managers"],
    queryFn: getProjectManagers,
    staleTime: 60_000,
  });

  const salesRepsQuery = useQuery({
    queryKey: ["project-wizard-sales-reps"],
    queryFn: getSalesReps,
    staleTime: 60_000,
  });

  const crewsQuery = useQuery({
    queryKey: ["project-wizard-crews", watchedValues.estimatedStartDate, watchedValues.estimatedEndDate],
    queryFn: () =>
      getCrews({
        startDate: watchedValues.estimatedStartDate,
        endDate: watchedValues.estimatedEndDate,
      }),
    staleTime: 20_000,
  });

  const selectedClient = useMemo(() => {
    const currentId = watchedValues.clientId;
    if (!currentId) return null;
    return (clientsQuery.data || []).find((client) => client.id === currentId) || null;
  }, [clientsQuery.data, watchedValues.clientId]);

  useEffect(() => {
    if (!watchedValues.sameAsClientAddress || !selectedClient) return;

    form.setValue("jobSiteAddress", selectedClient.address || "", { shouldDirty: true });
    form.setValue("jobSiteCity", selectedClient.city || "", { shouldDirty: true });
    form.setValue("jobSiteState", selectedClient.state || "", { shouldDirty: true });
    form.setValue("jobSiteZip", selectedClient.zip || "", { shouldDirty: true });
  }, [form, selectedClient, watchedValues.sameAsClientAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      writeDraftToStorage(watchedValues as ProjectWizardFormValues);
      setLastLocalSaveAt(new Date());
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedValues]);

  const draftMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => saveProjectDraft(payload),
  });

  const saveDraftNow = useCallback(
    async (silent = false) => {
      const values = form.getValues();
      const payload = createDraftPayload(values, stageQuery.data || []);

      try {
        await draftMutation.mutateAsync(payload);
        setLastRemoteSaveAt(new Date());
        if (!silent) {
          toast({ title: "Draft saved", description: "Project draft synced successfully." });
        }
      } catch (error) {
        if (!silent) {
          toast({
            title: "Draft sync unavailable",
            description: "Saved locally. Server draft endpoint may be unavailable.",
            variant: "destructive",
          });
        }
      }
    },
    [draftMutation, form, stageQuery.data, toast],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      void saveDraftNow(true);
    }, 30_000);

    return () => clearInterval(interval);
  }, [saveDraftNow]);

  const submitMutation = useMutation({
    mutationFn: async (values: ProjectWizardFormValues) => {
      let resolvedClientId = values.clientSelection === "existing" ? safeText(values.clientId) : null;

      if (!resolvedClientId && values.clientSelection === "new") {
        const fullName = normalizeWhitespace([values.newClientFirstName, values.newClientLastName].filter(Boolean).join(" "));
        const company = safeText(values.newClientCompany);
        const createClientPayload = {
          clientName: company || fullName || "New Client",
          companyName: company,
          clientType: company ? "BUSINESS" : "INDIVIDUAL",
          primaryEmail: normalizeEmailAddress(values.newClientEmail),
          primaryPhone: values.newClientPhone.trim(),
          status: "ACTIVE",
          contactName: fullName || null,
        };

        const createdClient = await createClient(createClientPayload);
        const createdClientId =
          typeof createdClient.id === "string" || typeof createdClient.id === "number"
            ? createdClient.id
            : createdClient.Id;
        resolvedClientId = createdClientId !== undefined && createdClientId !== null ? String(createdClientId) : "";
      }

      if (!resolvedClientId) {
        throw new Error("Client is required to save a project");
      }

      const selectedCrewName =
        values.assignCrewLater
          ? null
          : ((crewsQuery.data || []).find((crew) => crew.id === values.crewId)?.name || null);
      const finalPayload = createProjectPayload(values, stageQuery.data || [], resolvedClientId, selectedCrewName);

      if (isEditMode && editId) {
        const result = await updateProject(editId, finalPayload);
        clearDraftStorage();
        return result;
      } else {
        const result = await createProject(finalPayload);
        clearDraftStorage();
        return result;
      }
    },
  });

  const estimatedMaterialCost = safeNumber(watchedValues.estimatedMaterialCost) || 0;
  const estimatedLaborCost = safeNumber(watchedValues.estimatedLaborCost) || 0;
  const estimatedOtherCosts = safeNumber(watchedValues.estimatedOtherCosts) || 0;
  const estimatedTotalCost = estimatedMaterialCost + estimatedLaborCost + estimatedOtherCosts;
  const contractValue = safeNumber(watchedValues.contractValue) || 0;
  const estimatedProfit = contractValue - estimatedTotalCost;
  const estimatedMargin = contractValue > 0 ? (estimatedProfit / contractValue) * 100 : 0;

  const shingleProductOptions = useMemo(() => {
    const manufacturer = watchedValues.shingleManufacturer;
    if (!manufacturer) return [];
    return SHINGLE_PRODUCTS_BY_MANUFACTURER[manufacturer] || [];
  }, [watchedValues.shingleManufacturer]);

  const validateStep = useCallback(
    async (stepId: ProjectWizardStepId) => {
      if (stepId === "insurance" && !insuranceStepEnabled) return true;
      const fields = STEP_FIELDS[stepId];
      if (!fields?.length) return true;
      return form.trigger(fields, { shouldFocus: true });
    },
    [form, insuranceStepEnabled],
  );

  const goNextStep = useCallback(async () => {
    const current = visibleSteps[currentStepIndex];
    if (!current) return false;

    const valid = await validateStep(current.id);
    if (!valid) return false;

    if (currentStepIndex < visibleSteps.length - 1) {
      setCurrentStepId(visibleSteps[currentStepIndex + 1].id);
      return true;
    }

    return false;
  }, [currentStepIndex, validateStep, visibleSteps]);

  const goBackStep = useCallback(() => {
    if (currentStepIndex <= 0) return;
    setCurrentStepId(visibleSteps[currentStepIndex - 1].id);
  }, [currentStepIndex, visibleSteps]);

  const goToStep = useCallback(
    async (stepId: ProjectWizardStepId) => {
      const targetIndex = visibleSteps.findIndex((step) => step.id === stepId);
      if (targetIndex < 0) return;

      if (targetIndex <= currentStepIndex) {
        setCurrentStepId(stepId);
        return;
      }

      const canAdvance = await validateStep(visibleSteps[currentStepIndex].id);
      if (canAdvance) {
        setCurrentStepId(stepId);
      }
    },
    [currentStepIndex, validateStep, visibleSteps],
  );

  const submitProject = useCallback(async () => {
    const valid = await form.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      toast({ title: "Validation failed", description: "Please review the highlighted fields.", variant: "destructive" });
      return null;
    }

    try {
      const created = await submitMutation.mutateAsync(form.getValues());
      toast({ title: isEditMode ? "Project updated" : "Project created", description: isEditMode ? "Roofing project updated successfully." : "Roofing project created successfully." });
      return created;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please check the form values and try again.";
      toast({
        title: isEditMode ? "Unable to update project" : "Unable to create project",
        description: message,
        variant: "destructive",
      });
      return null;
    }
  }, [form, submitMutation, toast]);

  return {
    form,
    currentStepId,
    currentStepIndex,
    visibleSteps,
    completionPercent,
    insuranceStepEnabled,

    stageOptions: stageQuery.data || [],
    isStagesLoading: stageQuery.isLoading,

    clientSearch,
    setClientSearch,
    clientOptions: (clientsQuery.data || []) as ProjectClientOption[],
    isClientsLoading: clientsQuery.isFetching,

    projectManagers: (managersQuery.data || []) as ProjectUserOption[],
    isManagersLoading: managersQuery.isLoading,

    salesReps: (salesRepsQuery.data || []) as ProjectUserOption[],
    isSalesRepsLoading: salesRepsQuery.isLoading,

    crews: (crewsQuery.data || []) as CrewOption[],
    isCrewsLoading: crewsQuery.isFetching,

    selectedClient,
    shingleProductOptions,

    estimatedMaterialCost,
    estimatedLaborCost,
    estimatedOtherCosts,
    estimatedTotalCost,
    estimatedProfit,
    estimatedMargin,

    goNextStep,
    goBackStep,
    goToStep,
    validateStep,

    submitProject,
    saveDraftNow,

    isSubmitting: submitMutation.isPending,
    isSavingDraft: draftMutation.isPending,
    lastLocalSaveAt,
    lastRemoteSaveAt,
  };
}
