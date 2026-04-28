import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search, UserRound, Building2, UserPlus, Save, CheckCircle2, ArrowRight } from "lucide-react";
import AddressAutocompleteInput from "@/components/address/AddressAutocompleteInput";
import { getLeads } from "@/features/leads/services/leads-service";
import { getClients } from "@/features/clients/services/clients-service";
import {
    createInspection,
    updateInspection,
    type InspectionEntity,
} from "@/features/leads/services/inspections-service";
import {
    deleteFile,
    fetchFileBlob,
    getFileById,
    uploadFile,
} from "@/features/files/services/files-service";
import InspectionPhotoSection from "@/pages/Inspections/InspectionPhotoSection";
import type { PlaceDetailsResult } from "@/features/roof-estimator/services/roof-estimator-service";

type SourceType = "lead" | "client" | "manual";

interface LeadOption {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    company: string;
}

interface ClientOption {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    company: string;
}

interface PendingInspectionPhoto {
    id: string;
    file: File;
    previewUrl: string;
}

interface ExistingInspectionPhoto {
    id: string;
    name: string;
    previewUrl: string;
}

interface InspectionEditorProps {
    initialInspection?: InspectionEntity | null;
    lockedLeadId?: string;
    lockedClientId?: string;
    onCancel?: () => void;
    onSuccess?: (inspection: InspectionEntity) => void | Promise<void>;
}

interface BasicFieldProps {
    label: string;
    field: string;
    value: any;
    onChange: (field: string, value: any) => void;
    type?: string;
    required?: boolean;
}

interface SelectFieldProps {
    label: string;
    field: string;
    value: any;
    options: readonly string[];
    onChange: (field: string, value: any) => void;
    allowOther?: boolean;
    otherMode?: boolean;
    onOtherModeChange?: (field: string, enabled: boolean) => void;
    otherPlaceholder?: string;
}

interface BooleanFieldProps {
    label: string;
    field: string;
    checked: boolean;
    onChange: (field: string, value: any) => void;
}

const INSP_TABS = [
    { id: "general", label: "General" },
    { id: "roof", label: "Roof Assessment" },
    { id: "damage", label: "Damage" },
    { id: "materials", label: "Materials" },
    { id: "estimate", label: "Estimate" },
    { id: "scheduling", label: "Scheduling" },
] as const;

type InspectionTabId = (typeof INSP_TABS)[number]["id"];

const EMPTY_FORM: Record<string, any> = {
    sourceType: "lead",
    leadId: "",
    clientId: "",
    manualClientName: "",
    manualClientEmail: "",
    manualClientPhone: "",
    manualClientAddress: "",
    manualClientCity: "",
    manualClientProvince: "",
    manualClientPostalCode: "",
    manualClientCompanyName: "",
    manualClientInternalNotes: "",

    inspectionDate: new Date().toISOString().slice(0, 16),
    inspectorName: "",
    inspectionType: "Initial",
    weatherConditions: "",
    accessMethod: "Ladder",
    overallCondition: "",
    roofStyle: "",
    roofPitch: "",
    totalSquares: undefined,
    ridgeLength: undefined,
    valleyLength: undefined,
    eaveLength: undefined,
    rakeLength: undefined,
    numberOfLayers: undefined,
    deckingType: "",
    deckingCondition: "",
    underlaymentType: "",
    ventilationType: "",
    ventilationCount: undefined,
    flashingCondition: "",
    gutterCondition: "",
    skylightCount: undefined,
    skylightCondition: "",
    chimneyPresent: false,
    chimneyCondition: "",
    soffitFasciaCondition: "",
    dripEdgePresent: false,
    dripEdgeCondition: "",
    iceWaterShieldPresent: false,
    stormDamageFound: false,
    windDamageDetails: "",
    hailDamageDetails: "",
    hailSizeFound: "",
    testSquareResults: "",
    interiorDamageFound: false,
    interiorDamageDetails: "",
    overallDamageRating: "",
    proposedMaterial: "",
    shingleBrand: "",
    shingleLine: "",
    shingleColor: "",
    underlaymentChoice: "",
    ridgeCapType: "",
    ventilationPlan: "",
    dripEdgeColor: "",
    warrantyType: "",
    warrantyYears: undefined,
    materialCost: undefined,
    laborCost: undefined,
    tearOffCost: undefined,
    permitCost: undefined,
    dumpsterCost: undefined,
    miscCost: undefined,
    subtotal: undefined,
    overheadPercent: undefined,
    profitPercent: undefined,
    totalEstimate: undefined,
    customerPrice: undefined,
    depositRequired: undefined,
    depositCollected: false,
    paymentMethod: "",
    estimateStatus: "draft",
    tentativeStartDate: "",
    estimatedDuration: "",
    crewSize: undefined,
    crewLeadName: "",
    materialsOrdered: false,
    materialsDeliveryDate: "",
    permitPulled: false,
    permitNumber: "",
    dumpsterOrdered: false,
    dumpsterDeliveryDate: "",
    inspectorNotes: "",
    customerFeedback: "",
    internalNotes: "",
};

const SELECT_OPTIONS = {
    inspectionType: ["Initial", "Follow-up", "Re-inspect", "Insurance", "Final", "Storm Damage", "Maintenance", "Other"],
    accessMethod: ["Ladder", "Drone", "Walk-on", "Binoculars", "Other"],
    overallCondition: ["Poor", "Fair", "Good", "Excellent", "Other"],
    roofStyle: ["Gable", "Hip", "Flat", "Mansard", "Gambrel", "Shed", "Other"],
    roofPitch: ["Low (2-4)", "Medium (5-7)", "Steep (8-12)", "Other"],
    deckingType: ["Plywood", "OSB", "1x6", "Skip", "Other"],
    deckingCondition: ["Good", "Needs Repair", "Needs Replace", "Other"],
    underlaymentType: ["Felt", "Synthetic", "Ice & Water", "Other"],
    ventilationType: ["Ridge", "Box", "Turbine", "Power", "Soffit", "Other"],
    flashingCondition: ["Good", "Repair", "Replace", "Other"],
    gutterCondition: ["Good", "Repair", "Replace", "None", "Other"],
    soffitFasciaCondition: ["Good", "Repair", "Replace", "Other"],
    hailSizeFound: ["Pea", "Marble", "Quarter", "Golf Ball", "Baseball", "Other"],
    overallDamageRating: ["None", "Minor", "Moderate", "Severe", "Total Loss", "Other"],
    proposedMaterial: ["Asphalt", "Metal", "Tile", "Flat", "Wood", "Slate", "Other"],
    warrantyType: ["Manufacturer", "Workmanship", "Extended", "Other"],
    paymentMethod: ["Cash", "Check", "Card", "Financing", "Insurance", "Other"],
    estimatedDuration: ["1 Day", "2-3 Days", "1 Week", "2 Weeks", "3+ Weeks"],
} as const;

const OTHER_ENABLED_FIELDS = new Set([
    "inspectionType",
    "accessMethod",
    "overallCondition",
    "roofStyle",
    "roofPitch",
    "deckingType",
    "deckingCondition",
    "underlaymentType",
    "ventilationType",
    "flashingCondition",
    "gutterCondition",
    "soffitFasciaCondition",
    "hailSizeFound",
    "overallDamageRating",
    "proposedMaterial",
    "warrantyType",
    "paymentMethod",
]);

function readText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function hasValue(value: unknown): boolean {
    if (typeof value === "number") return !Number.isNaN(value);
    if (typeof value === "string") return value.trim().length > 0;
    return Boolean(value);
}

function buildLeadAddress(raw: Record<string, unknown>): string {
    return [
        readText(raw.propertyAddress),
        readText(raw.city),
        readText(raw.state),
        readText(raw.zipCode),
    ].filter(Boolean).join(", ");
}

function buildClientAddress(raw: Record<string, unknown>): string {
    return [
        readText(raw.streetAddress),
        readText(raw.city),
        readText(raw.province),
        readText(raw.postalCode),
    ].filter(Boolean).join(", ");
}

function normalizeLead(raw: Record<string, unknown>): LeadOption | null {
    const id = readText(raw.id);
    if (!id) return null;
    const name = `${readText(raw.firstName)} ${readText(raw.lastName)}`.trim() || "Unnamed lead";
    return {
        id,
        name,
        email: readText(raw.email),
        phone: readText(raw.phone),
        address: buildLeadAddress(raw),
        company: readText(raw.companyName),
    };
}

function normalizeClient(raw: Record<string, unknown>): ClientOption | null {
    const id = readText(raw.id ?? raw.Id);
    if (!id) return null;
    const name = readText(raw.clientName ?? raw.ClientName ?? raw.name ?? raw.Name) || "Unnamed client";
    return {
        id,
        name,
        email: readText(raw.primaryEmail ?? raw.email ?? raw.contactEmail),
        phone: readText(raw.primaryPhone ?? raw.phone ?? raw.contactNo ?? raw.mobile),
        address: buildClientAddress(raw),
        company: readText(raw.companyName),
    };
}

function normalizeDateTimeLocal(value: string | null | undefined): string {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const offset = parsed.getTimezoneOffset() * 60_000;
    return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
}

function normalizeDateInput(value: string | null | undefined): string {
    return value ? value.slice(0, 10) : "";
}

function createInitialForm(inspection?: InspectionEntity | null, lockedLeadId?: string, lockedClientId?: string): Record<string, any> {
    if (!inspection) {
        return {
            ...EMPTY_FORM,
            sourceType: lockedLeadId ? "lead" : lockedClientId ? "client" : "lead",
            leadId: lockedLeadId || "",
            clientId: lockedClientId || "",
        };
    }

    const sourceType: SourceType = inspection.leadId ? "lead" : inspection.clientId ? "client" : "manual";

    return {
        ...EMPTY_FORM,
        ...inspection,
        sourceType,
        leadId: lockedLeadId || inspection.leadId || "",
        clientId: lockedClientId || inspection.clientId || "",
        manualClientName: inspection.client?.clientName || "",
        manualClientEmail: inspection.client?.primaryEmail || "",
        manualClientPhone: inspection.client?.primaryPhone || "",
        manualClientAddress: inspection.client?.streetAddress || "",
        manualClientCity: inspection.client?.city || "",
        manualClientProvince: inspection.client?.province || "",
        manualClientPostalCode: inspection.client?.postalCode || "",
        manualClientCompanyName: inspection.client?.companyName || "",
        manualClientInternalNotes: "",
        inspectionDate: normalizeDateTimeLocal(inspection.inspectionDate),
        tentativeStartDate: normalizeDateInput(inspection.tentativeStartDate as string | null | undefined),
        materialsDeliveryDate: normalizeDateInput(inspection.materialsDeliveryDate as string | null | undefined),
        dumpsterDeliveryDate: normalizeDateInput(inspection.dumpsterDeliveryDate as string | null | undefined),
    };
}

function buildSubmitPayload(
    form: Record<string, any>,
    isComplete: boolean,
    isEditing: boolean,
    lockedLeadId?: string,
    lockedClientId?: string,
) {
    const payload: Record<string, unknown> = {
        inspectionDate: form.inspectionDate ? new Date(form.inspectionDate).toISOString() : undefined,
        inspectorName: readText(form.inspectorName) || undefined,
        inspectionType: readText(form.inspectionType) || undefined,
        weatherConditions: readText(form.weatherConditions) || undefined,
        accessMethod: readText(form.accessMethod) || undefined,
        overallCondition: readText(form.overallCondition) || undefined,
        roofStyle: readText(form.roofStyle) || undefined,
        roofPitch: readText(form.roofPitch) || undefined,
        totalSquares: typeof form.totalSquares === "number" ? form.totalSquares : undefined,
        ridgeLength: typeof form.ridgeLength === "number" ? form.ridgeLength : undefined,
        valleyLength: typeof form.valleyLength === "number" ? form.valleyLength : undefined,
        eaveLength: typeof form.eaveLength === "number" ? form.eaveLength : undefined,
        rakeLength: typeof form.rakeLength === "number" ? form.rakeLength : undefined,
        numberOfLayers: typeof form.numberOfLayers === "number" ? form.numberOfLayers : undefined,
        deckingType: readText(form.deckingType) || undefined,
        deckingCondition: readText(form.deckingCondition) || undefined,
        underlaymentType: readText(form.underlaymentType) || undefined,
        ventilationType: readText(form.ventilationType) || undefined,
        ventilationCount: typeof form.ventilationCount === "number" ? form.ventilationCount : undefined,
        flashingCondition: readText(form.flashingCondition) || undefined,
        gutterCondition: readText(form.gutterCondition) || undefined,
        skylightCount: typeof form.skylightCount === "number" ? form.skylightCount : undefined,
        skylightCondition: readText(form.skylightCondition) || undefined,
        chimneyPresent: Boolean(form.chimneyPresent),
        chimneyCondition: readText(form.chimneyCondition) || undefined,
        soffitFasciaCondition: readText(form.soffitFasciaCondition) || undefined,
        dripEdgePresent: Boolean(form.dripEdgePresent),
        dripEdgeCondition: readText(form.dripEdgeCondition) || undefined,
        iceWaterShieldPresent: Boolean(form.iceWaterShieldPresent),
        stormDamageFound: Boolean(form.stormDamageFound),
        windDamageDetails: readText(form.windDamageDetails) || undefined,
        hailDamageDetails: readText(form.hailDamageDetails) || undefined,
        hailSizeFound: readText(form.hailSizeFound) || undefined,
        testSquareResults: readText(form.testSquareResults) || undefined,
        interiorDamageFound: Boolean(form.interiorDamageFound),
        interiorDamageDetails: readText(form.interiorDamageDetails) || undefined,
        overallDamageRating: readText(form.overallDamageRating) || undefined,
        proposedMaterial: readText(form.proposedMaterial) || undefined,
        shingleBrand: readText(form.shingleBrand) || undefined,
        shingleLine: readText(form.shingleLine) || undefined,
        shingleColor: readText(form.shingleColor) || undefined,
        underlaymentChoice: readText(form.underlaymentChoice) || undefined,
        ridgeCapType: readText(form.ridgeCapType) || undefined,
        ventilationPlan: readText(form.ventilationPlan) || undefined,
        dripEdgeColor: readText(form.dripEdgeColor) || undefined,
        warrantyType: readText(form.warrantyType) || undefined,
        warrantyYears: typeof form.warrantyYears === "number" ? form.warrantyYears : undefined,
        materialCost: typeof form.materialCost === "number" ? form.materialCost : undefined,
        laborCost: typeof form.laborCost === "number" ? form.laborCost : undefined,
        tearOffCost: typeof form.tearOffCost === "number" ? form.tearOffCost : undefined,
        permitCost: typeof form.permitCost === "number" ? form.permitCost : undefined,
        dumpsterCost: typeof form.dumpsterCost === "number" ? form.dumpsterCost : undefined,
        miscCost: typeof form.miscCost === "number" ? form.miscCost : undefined,
        subtotal: typeof form.subtotal === "number" ? form.subtotal : undefined,
        overheadPercent: typeof form.overheadPercent === "number" ? form.overheadPercent : undefined,
        profitPercent: typeof form.profitPercent === "number" ? form.profitPercent : undefined,
        totalEstimate: typeof form.totalEstimate === "number" ? form.totalEstimate : undefined,
        customerPrice: typeof form.customerPrice === "number" ? form.customerPrice : undefined,
        depositRequired: typeof form.depositRequired === "number" ? form.depositRequired : undefined,
        depositCollected: Boolean(form.depositCollected),
        paymentMethod: readText(form.paymentMethod) || undefined,
        estimateStatus: isComplete ? "completed" : "draft",
        tentativeStartDate: readText(form.tentativeStartDate) || undefined,
        estimatedDuration: readText(form.estimatedDuration) || undefined,
        crewSize: typeof form.crewSize === "number" ? form.crewSize : undefined,
        crewLeadName: readText(form.crewLeadName) || undefined,
        materialsOrdered: Boolean(form.materialsOrdered),
        materialsDeliveryDate: readText(form.materialsDeliveryDate) || undefined,
        permitPulled: Boolean(form.permitPulled),
        permitNumber: readText(form.permitNumber) || undefined,
        dumpsterOrdered: Boolean(form.dumpsterOrdered),
        dumpsterDeliveryDate: readText(form.dumpsterDeliveryDate) || undefined,
        inspectorNotes: readText(form.inspectorNotes) || undefined,
        customerFeedback: readText(form.customerFeedback) || undefined,
        internalNotes: readText(form.internalNotes) || undefined,
    };

    if (!isEditing) {
        if ((lockedLeadId || form.sourceType === "lead") && (lockedLeadId || form.leadId)) {
            payload.leadId = lockedLeadId || form.leadId;
        } else if ((lockedClientId || form.sourceType === "client") && (lockedClientId || form.clientId)) {
            payload.clientId = lockedClientId || form.clientId;
        } else if (form.sourceType === "manual") {
            payload.manualClient = {
                clientName: readText(form.manualClientName),
                primaryEmail: readText(form.manualClientEmail),
                primaryPhone: readText(form.manualClientPhone),
                streetAddress: readText(form.manualClientAddress),
                city: readText(form.manualClientCity) || null,
                province: readText(form.manualClientProvince) || null,
                postalCode: readText(form.manualClientPostalCode) || null,
                companyName: readText(form.manualClientCompanyName) || null,
                inspectionPurpose: readText(form.inspectionType) || null,
                internalNotes: readText(form.manualClientInternalNotes) || null,
            };
        }
    }

    return payload;
}

const BasicField = ({ label, field, value, onChange, type = "text", required = false }: BasicFieldProps) => (
    <div className="space-y-1">
        <Label className="text-xs text-[#475569]">
            {label}
            {required ? " *" : ""}
        </Label>
        {type === "textarea" ? (
            <Textarea
                value={value || ""}
                onChange={(e) => onChange(field, e.target.value)}
                className="resize-none min-h-[72px] text-sm"
            />
        ) : (
            <Input
                type={type}
                value={value ?? ""}
                onChange={(e) => onChange(field, type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value)}
                className="text-sm"
            />
        )}
    </div>
);

const SelectField = ({
    label,
    field,
    value,
    options,
    onChange,
    allowOther = false,
    otherMode = false,
    onOtherModeChange,
    otherPlaceholder,
}: SelectFieldProps) => {
    const normalizedValue = readText(value);
    const standardOptions = allowOther ? options.filter((option) => option !== "Other") : options;
    const isStandardValue = standardOptions.includes(normalizedValue);
    const selectValue = otherMode ? "__other__" : (isStandardValue ? normalizedValue : "");

    return (
        <div className="space-y-1">
            <Label className="text-xs text-[#475569]">{label}</Label>
            <div className="space-y-2">
                <select
                    value={selectValue}
                    onChange={(e) => {
                        const nextValue = e.target.value;
                        if (allowOther && nextValue === "__other__") {
                            onOtherModeChange?.(field, true);
                            if (isStandardValue) {
                                onChange(field, "");
                            }
                            return;
                        }

                        onOtherModeChange?.(field, false);
                        onChange(field, nextValue || undefined);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                    <option value="">Select...</option>
                    {standardOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    {allowOther ? <option value="__other__">Other</option> : null}
                </select>

                {allowOther && otherMode ? (
                    <Input
                        value={normalizedValue}
                        onChange={(e) => onChange(field, e.target.value)}
                        placeholder={otherPlaceholder || `Enter ${label.toLowerCase()}`}
                        className="text-sm"
                    />
                ) : null}
            </div>
        </div>
    );
};

const BooleanField = ({ label, field, checked, onChange }: BooleanFieldProps) => (
    <div className="flex items-center justify-between rounded-lg border border-[rgba(15,23,42,0.06)] px-3 py-2">
        <Label className="text-xs text-[#475569]">{label}</Label>
        <Switch checked={checked} onCheckedChange={(value) => onChange(field, value)} />
    </div>
);

const InspectionEditor = ({
    initialInspection = null,
    lockedLeadId,
    lockedClientId,
    onCancel,
    onSuccess,
}: InspectionEditorProps) => {
    const { toast } = useToast();
    const previewUrlsRef = useRef<string[]>([]);
    const [activeTab, setActiveTab] = useState<(typeof INSP_TABS)[number]["id"]>("general");
    const [saving, setSaving] = useState(false);
    const [selectorLoading, setSelectorLoading] = useState(false);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [leadSearch, setLeadSearch] = useState("");
    const [clientSearch, setClientSearch] = useState("");
    const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
    const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
    const [form, setForm] = useState<Record<string, any>>(() => createInitialForm(initialInspection, lockedLeadId, lockedClientId));
    const [otherFieldModes, setOtherFieldModes] = useState<Record<string, boolean>>({});
    const [existingPhotos, setExistingPhotos] = useState<ExistingInspectionPhoto[]>([]);
    const [removedExistingPhotoIds, setRemovedExistingPhotoIds] = useState<string[]>([]);
    const [pendingPhotos, setPendingPhotos] = useState<PendingInspectionPhoto[]>([]);

    useEffect(() => {
        setForm(createInitialForm(initialInspection, lockedLeadId, lockedClientId));
    }, [initialInspection, lockedLeadId, lockedClientId]);

    useEffect(() => {
        const nextForm = createInitialForm(initialInspection, lockedLeadId, lockedClientId);
        const nextModes = Array.from(OTHER_ENABLED_FIELDS).reduce<Record<string, boolean>>((acc, field) => {
            const value = readText(nextForm[field]);
            const options = (SELECT_OPTIONS as Record<string, readonly string[]>)[field] || [];
            const standardOptions = options.filter((option) => option !== "Other");
            acc[field] = value.length > 0 && !standardOptions.includes(value);
            return acc;
        }, {});
        setOtherFieldModes(nextModes);
    }, [initialInspection, lockedLeadId, lockedClientId]);

    useEffect(() => {
        if (lockedLeadId || lockedClientId) {
            return;
        }

        let cancelled = false;
        const loadOptions = async () => {
            try {
                setSelectorLoading(true);
                const [leads, clients] = await Promise.all([
                    getLeads({ limit: 200 }),
                    getClients(),
                ]);
                if (cancelled) return;
                setLeadOptions(
                    leads
                        .map((lead) => normalizeLead(lead as Record<string, unknown>))
                        .filter((lead): lead is LeadOption => Boolean(lead)),
                );
                setClientOptions(
                    clients
                        .map((client) => normalizeClient(client as Record<string, unknown>))
                        .filter((client): client is ClientOption => Boolean(client)),
                );
            } catch {
                if (!cancelled) {
                    toast({
                        title: "Load failed",
                        description: "We couldn't load leads and clients for inspection linking right now.",
                        variant: "destructive",
                    });
                }
            } finally {
                if (!cancelled) {
                    setSelectorLoading(false);
                }
            }
        };

        void loadOptions();
        return () => {
            cancelled = true;
        };
    }, [lockedLeadId, lockedClientId, toast]);

    useEffect(() => {
        let cancelled = false;

        const loadExistingPhotos = async () => {
            previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            previewUrlsRef.current = [];
            setExistingPhotos([]);
            setRemovedExistingPhotoIds([]);
            setPendingPhotos([]);

            if (!initialInspection?.photoFileIds?.length) {
                setPhotoLoading(false);
                return;
            }

            setPhotoLoading(true);
            try {
                const loaded = await Promise.all(
                    initialInspection.photoFileIds.map(async (photoId) => {
                        const [file, previewUrl] = await Promise.all([
                            getFileById(photoId),
                            fetchFileBlob(photoId),
                        ]);
                        return {
                            id: photoId,
                            name: file.originalName || file.name,
                            previewUrl,
                        };
                    }),
                );

                if (cancelled) {
                    loaded.forEach((item) => URL.revokeObjectURL(item.previewUrl));
                    return;
                }

                previewUrlsRef.current = loaded.map((item) => item.previewUrl);
                setExistingPhotos(loaded);
            } catch {
                if (!cancelled) {
                    toast({
                        title: "Photo load failed",
                        description: "Existing inspection photos couldn't be loaded.",
                        variant: "destructive",
                    });
                }
            } finally {
                if (!cancelled) {
                    setPhotoLoading(false);
                }
            }
        };

        void loadExistingPhotos();

        return () => {
            cancelled = true;
            previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            previewUrlsRef.current = [];
        };
    }, [initialInspection, toast]);

    const setField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));
    const setOtherFieldMode = (field: string, enabled: boolean) =>
        setOtherFieldModes((prev) => ({ ...prev, [field]: enabled }));

    useEffect(() => {
        const baseCosts = [
            form.materialCost,
            form.laborCost,
            form.tearOffCost,
            form.permitCost,
            form.dumpsterCost,
            form.miscCost,
        ];

        const hasEstimateInput = baseCosts.some((value) => typeof value === "number" && !Number.isNaN(value))
            || (typeof form.overheadPercent === "number" && !Number.isNaN(form.overheadPercent))
            || (typeof form.profitPercent === "number" && !Number.isNaN(form.profitPercent));

        if (!hasEstimateInput) {
            setForm((prev) => {
                if (prev.subtotal == null && prev.totalEstimate == null) {
                    return prev;
                }
                return {
                    ...prev,
                    subtotal: undefined,
                    totalEstimate: undefined,
                };
            });
            return;
        }

        const subtotal = baseCosts.reduce((sum, value) => sum + (typeof value === "number" && !Number.isNaN(value) ? value : 0), 0);
        const overheadPercent = typeof form.overheadPercent === "number" && !Number.isNaN(form.overheadPercent) ? form.overheadPercent : 0;
        const profitPercent = typeof form.profitPercent === "number" && !Number.isNaN(form.profitPercent) ? form.profitPercent : 0;
        const totalEstimate = subtotal + (subtotal * overheadPercent / 100) + (subtotal * profitPercent / 100);

        setForm((prev) => {
            if (prev.subtotal === subtotal && prev.totalEstimate === totalEstimate) {
                return prev;
            }

            return {
                ...prev,
                subtotal,
                totalEstimate,
            };
        });
    }, [
        form.materialCost,
        form.laborCost,
        form.tearOffCost,
        form.permitCost,
        form.dumpsterCost,
        form.miscCost,
        form.overheadPercent,
        form.profitPercent,
    ]);

    const filteredLeads = useMemo(() => {
        const query = leadSearch.trim().toLowerCase();
        if (!query) return leadOptions.slice(0, 8);
        return leadOptions.filter((lead) =>
            [lead.name, lead.email, lead.phone, lead.address, lead.company].some((value) => value.toLowerCase().includes(query)),
        ).slice(0, 8);
    }, [leadOptions, leadSearch]);

    const filteredClients = useMemo(() => {
        const query = clientSearch.trim().toLowerCase();
        if (!query) return clientOptions.slice(0, 8);
        return clientOptions.filter((client) =>
            [client.name, client.email, client.phone, client.address, client.company].some((value) => value.toLowerCase().includes(query)),
        ).slice(0, 8);
    }, [clientOptions, clientSearch]);

    const selectedLead = leadOptions.find((lead) => lead.id === (lockedLeadId || form.leadId));
    const selectedClient = clientOptions.find((client) => client.id === (lockedClientId || form.clientId));
    const activeTabIndex = INSP_TABS.findIndex((tab) => tab.id === activeTab);
    const isSchedulingTab = activeTab === "scheduling";

    const handleAddPhotos = async (files: File[]) => {
        const nextPhotos = files
            .filter((file) => file.type.startsWith("image/"))
            .map((file) => {
                const previewUrl = URL.createObjectURL(file);
                return {
                    id: globalThis.crypto?.randomUUID?.() || `${file.name}-${file.lastModified}-${Math.random()}`,
                    file,
                    previewUrl,
                };
            });

        setPendingPhotos((current) => [...current, ...nextPhotos]);
    };

    const handleRemovePhoto = async (photoId: string) => {
        const pending = pendingPhotos.find((photo) => photo.id === photoId);
        if (pending) {
            URL.revokeObjectURL(pending.previewUrl);
            setPendingPhotos((current) => current.filter((photo) => photo.id !== photoId));
            return;
        }

        setExistingPhotos((current) => current.filter((photo) => photo.id !== photoId));
        setRemovedExistingPhotoIds((current) => current.includes(photoId) ? current : [...current, photoId]);
    };

    const validateCreateSource = () => {
        if (initialInspection) return true;

        const sourceType = lockedLeadId ? "lead" : lockedClientId ? "client" : form.sourceType;
        if (sourceType === "lead" && !(lockedLeadId || form.leadId)) {
            toast({ title: "Lead required", description: "Select a lead for this inspection.", variant: "destructive" });
            return false;
        }
        if (sourceType === "client" && !(lockedClientId || form.clientId)) {
            toast({ title: "Client required", description: "Select a client for this inspection.", variant: "destructive" });
            return false;
        }
        if (sourceType === "manual") {
            if (!readText(form.manualClientName) || !readText(form.manualClientEmail) || !readText(form.manualClientPhone) || !readText(form.manualClientAddress)) {
                toast({
                    title: "Customer details required",
                    description: "Name, email, phone, and address are required to create a client from this inspection.",
                    variant: "destructive",
                });
                return false;
            }
        }
        return true;
    };

    const syncPhotos = async (inspection: InspectionEntity) => {
        const uploaded = pendingPhotos.length > 0
            ? await Promise.all(
                pendingPhotos.map((photo) =>
                    uploadFile(photo.file, {
                        leadId: inspection.leadId || undefined,
                        clientId: inspection.clientId || undefined,
                    }),
                ),
            )
            : [];

        const nextPhotoIds = [
            ...existingPhotos.map((photo) => photo.id),
            ...uploaded.map((file) => file.id),
        ];

        let currentInspection = inspection;

        const currentIds = (inspection.photoFileIds || []).join(",");
        const nextIds = nextPhotoIds.join(",");
        if (currentIds !== nextIds) {
            currentInspection = await updateInspection(inspection.id, {
                photoFileIds: nextPhotoIds,
                photosTakenCount: nextPhotoIds.length,
            });
        }

        if (removedExistingPhotoIds.length > 0) {
            await Promise.allSettled(removedExistingPhotoIds.map((photoId) => deleteFile(photoId)));
        }

        return currentInspection;
    };

    const handleSubmit = async (isComplete: boolean) => {
        if (!validateCreateSource()) return;

        setSaving(true);
        try {
            const payload = buildSubmitPayload(form, isComplete, Boolean(initialInspection), lockedLeadId, lockedClientId);
            let savedInspection = initialInspection
                ? await updateInspection(initialInspection.id, payload)
                : await createInspection(payload);

            savedInspection = await syncPhotos(savedInspection);

            toast({
                title: initialInspection
                    ? isComplete ? "Inspection completed" : "Inspection updated"
                    : isComplete ? "Inspection created" : "Inspection saved as draft",
                description: initialInspection
                    ? "The inspection has been updated successfully."
                    : "The inspection is now available across the inspections module.",
            });

            await onSuccess?.(savedInspection);
        } catch (error: any) {
            toast({
                title: "Save failed",
                description: error?.response?.data?.message || "We couldn't save this inspection right now.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleManualAddressSelect = (details: PlaceDetailsResult) => {
        setForm((prev) => ({
            ...prev,
            manualClientAddress: readText(details.addressLine1) || readText(details.formattedAddress) || prev.manualClientAddress,
            manualClientCity: readText(details.city) || prev.manualClientCity,
            manualClientProvince: readText(details.state) || prev.manualClientProvince,
            manualClientPostalCode: readText(details.postalCode) || prev.manualClientPostalCode,
        }));
    };

    const handleNextTab = () => {
        if (!validateCreateSource()) return;

        const nextTab = INSP_TABS[activeTabIndex + 1];
        if (nextTab) {
            setActiveTab(nextTab.id);
        }
    };

    const handleTabSelect = (tabId: InspectionTabId) => {
        const targetIndex = INSP_TABS.findIndex((tab) => tab.id === tabId);
        if (targetIndex <= activeTabIndex) {
            setActiveTab(tabId);
            return;
        }

        if (!validateCreateSource()) return;

        setActiveTab(tabId);
    };

    const photoItems = [
        ...existingPhotos.map((photo) => ({
            id: photo.id,
            name: photo.name,
            previewUrl: photo.previewUrl,
        })),
        ...pendingPhotos.map((photo) => ({
            id: photo.id,
            name: photo.file.name,
            previewUrl: photo.previewUrl,
            statusLabel: "Ready to upload",
        })),
    ];

    const renderSourceSection = () => {
        if (initialInspection) {
            return (
                <div className="rounded-xl border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-[#0F172A]">Linked Record</p>
                    <p className="mt-1 text-sm text-[#475569]">
                        {initialInspection.lead
                            ? `Lead: ${(initialInspection.lead.firstName || "")} ${(initialInspection.lead.lastName || "")}`.trim()
                            : initialInspection.client
                                ? `Client: ${initialInspection.client.clientName}`
                                : "This inspection is already linked to its saved customer record."}
                    </p>
                </div>
            );
        }

        const sourceType = lockedLeadId ? "lead" : lockedClientId ? "client" : (form.sourceType as SourceType);

        return (
            <div className="space-y-4 rounded-xl border border-[rgba(15,23,42,0.08)] bg-white p-4">
                <div>
                    <p className="text-sm font-semibold text-[#0F172A]">Inspection Source</p>
                    <p className="text-xs text-[#64748B]">Use an existing lead, an existing client, or create a client from this inspection.</p>
                </div>

                {lockedLeadId ? (
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3 text-sm text-cyan-900">
                        This inspection is locked to the current lead and will be saved into the global inspections module automatically.
                    </div>
                ) : lockedClientId ? (
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3 text-sm text-cyan-900">
                        This inspection is locked to the current client and will be saved into the global inspections module automatically.
                    </div>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-3">
                        {[
                            { id: "lead", label: "Existing Lead", icon: UserRound },
                            { id: "client", label: "Existing Client", icon: Building2 },
                            { id: "manual", label: "New Client", icon: UserPlus },
                        ].map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setField("sourceType", id)}
                                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                                    sourceType === id
                                        ? "border-cyan-500 bg-cyan-50 text-cyan-900"
                                        : "border-[rgba(15,23,42,0.08)] bg-white text-[#334155] hover:border-cyan-200"
                                }`}
                            >
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {selectorLoading && !lockedLeadId && !lockedClientId ? (
                    <div className="flex items-center gap-2 text-sm text-[#64748B]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading leads and clients...
                    </div>
                ) : null}

                {sourceType === "lead" && !lockedLeadId ? (
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                            <Input
                                value={leadSearch}
                                onChange={(e) => setLeadSearch(e.target.value)}
                                className="pl-9"
                                placeholder="Search leads by name, email, phone, or address"
                            />
                        </div>
                        <div className="max-h-56 space-y-2 overflow-y-auto">
                            {filteredLeads.map((lead) => (
                                <button
                                    key={lead.id}
                                    type="button"
                                    onClick={() => setField("leadId", lead.id)}
                                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                                        form.leadId === lead.id
                                            ? "border-cyan-500 bg-cyan-50"
                                            : "border-[rgba(15,23,42,0.08)] bg-white hover:border-cyan-200"
                                    }`}
                                >
                                    <div className="text-sm font-semibold text-[#0F172A]">{lead.name}</div>
                                    <div className="mt-1 text-xs text-[#64748B]">{lead.address || lead.email || lead.phone || lead.company || "No extra details"}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {sourceType === "client" && !lockedClientId ? (
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                            <Input
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="pl-9"
                                placeholder="Search clients by name, email, phone, or address"
                            />
                        </div>
                        <div className="max-h-56 space-y-2 overflow-y-auto">
                            {filteredClients.map((client) => (
                                <button
                                    key={client.id}
                                    type="button"
                                    onClick={() => setField("clientId", client.id)}
                                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                                        form.clientId === client.id
                                            ? "border-cyan-500 bg-cyan-50"
                                            : "border-[rgba(15,23,42,0.08)] bg-white hover:border-cyan-200"
                                    }`}
                                >
                                    <div className="text-sm font-semibold text-[#0F172A]">{client.name}</div>
                                    <div className="mt-1 text-xs text-[#64748B]">{client.address || client.email || client.phone || client.company || "No extra details"}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {sourceType === "manual" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <BasicField label="Name" field="manualClientName" value={form.manualClientName} onChange={setField} required />
                        <BasicField label="Email" field="manualClientEmail" value={form.manualClientEmail} onChange={setField} type="email" required />
                        <BasicField label="Phone" field="manualClientPhone" value={form.manualClientPhone} onChange={setField} required />
                        <BasicField label="Company" field="manualClientCompanyName" value={form.manualClientCompanyName} onChange={setField} />
                        <div className="sm:col-span-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-[#475569]">
                                    Location / Address *
                                </Label>
                                <AddressAutocompleteInput
                                    value={form.manualClientAddress || ""}
                                    onValueChange={(value) => setField("manualClientAddress", value)}
                                    onSelectAddress={handleManualAddressSelect}
                                    placeholder="Start typing an address"
                                    className="text-sm"
                                />
                            </div>
                        </div>
                        <BasicField label="City" field="manualClientCity" value={form.manualClientCity} onChange={setField} />
                        <BasicField label="Province / State" field="manualClientProvince" value={form.manualClientProvince} onChange={setField} />
                        <BasicField label="Postal Code" field="manualClientPostalCode" value={form.manualClientPostalCode} onChange={setField} />
                        <div className="sm:col-span-2">
                            <BasicField label="New Client Notes" field="manualClientInternalNotes" value={form.manualClientInternalNotes} onChange={setField} type="textarea" />
                        </div>
                    </div>
                ) : null}

                {lockedLeadId && selectedLead ? (
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3 text-sm text-cyan-900">
                        {selectedLead.name} {selectedLead.address ? `- ${selectedLead.address}` : ""}
                    </div>
                ) : null}
                {lockedClientId && selectedClient ? (
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3 text-sm text-cyan-900">
                        {selectedClient.name} {selectedClient.address ? `- ${selectedClient.address}` : ""}
                    </div>
                ) : null}
                {!lockedLeadId && sourceType === "lead" && selectedLead ? (
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3 text-sm text-cyan-900">
                        {selectedLead.name} {selectedLead.address ? `- ${selectedLead.address}` : ""}
                    </div>
                ) : null}
                {!lockedClientId && sourceType === "client" && selectedClient ? (
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3 text-sm text-cyan-900">
                        {selectedClient.name} {selectedClient.address ? `- ${selectedClient.address}` : ""}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="space-y-5">
            {renderSourceSection()}

            <div className="flex flex-wrap gap-2 border-b border-[rgba(15,23,42,0.08)] pb-3">
                {INSP_TABS.map((tab) => (
                    <Button
                        key={tab.id}
                        type="button"
                        variant={activeTab === tab.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTabSelect(tab.id)}
                        className={activeTab === tab.id ? "bg-[#0891B2] text-white hover:bg-[#0E7490]" : ""}
                    >
                        {tab.label}
                    </Button>
                ))}
            </div>

            {activeTab === "general" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <BasicField label="Inspection Date" field="inspectionDate" value={form.inspectionDate} onChange={setField} type="datetime-local" />
                    <BasicField label="Inspector Name" field="inspectorName" value={form.inspectorName} onChange={setField} />
                    <SelectField label="Inspection Type" field="inspectionType" value={form.inspectionType} options={SELECT_OPTIONS.inspectionType} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.inspectionType)} onOtherModeChange={setOtherFieldMode} />
                    <BasicField label="Weather Conditions" field="weatherConditions" value={form.weatherConditions} onChange={setField} />
                    <SelectField label="Access Method" field="accessMethod" value={form.accessMethod} options={SELECT_OPTIONS.accessMethod} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.accessMethod)} onOtherModeChange={setOtherFieldMode} />
                    <SelectField label="Overall Condition" field="overallCondition" value={form.overallCondition} options={SELECT_OPTIONS.overallCondition} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.overallCondition)} onOtherModeChange={setOtherFieldMode} />
                    <div className="sm:col-span-2">
                        <BasicField label="Inspector Notes" field="inspectorNotes" value={form.inspectorNotes} onChange={setField} type="textarea" />
                    </div>
                    <div className="sm:col-span-2">
                        <BasicField label="Customer Feedback" field="customerFeedback" value={form.customerFeedback} onChange={setField} type="textarea" />
                    </div>
                    <div className="sm:col-span-2">
                        <BasicField label="Internal Notes" field="internalNotes" value={form.internalNotes} onChange={setField} type="textarea" />
                    </div>
                </div>
            )}

            {activeTab === "roof" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <SelectField label="Roof Style" field="roofStyle" value={form.roofStyle} options={SELECT_OPTIONS.roofStyle} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.roofStyle)} onOtherModeChange={setOtherFieldMode} />
                    <SelectField label="Roof Pitch" field="roofPitch" value={form.roofPitch} options={SELECT_OPTIONS.roofPitch} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.roofPitch)} onOtherModeChange={setOtherFieldMode} />
                    <BasicField label="Total Squares" field="totalSquares" value={form.totalSquares} onChange={setField} type="number" />
                    <BasicField label="Ridge Length (ft)" field="ridgeLength" value={form.ridgeLength} onChange={setField} type="number" />
                    <BasicField label="Valley Length (ft)" field="valleyLength" value={form.valleyLength} onChange={setField} type="number" />
                    <BasicField label="Eave Length (ft)" field="eaveLength" value={form.eaveLength} onChange={setField} type="number" />
                    <BasicField label="Rake Length (ft)" field="rakeLength" value={form.rakeLength} onChange={setField} type="number" />
                    <BasicField label="Number of Layers" field="numberOfLayers" value={form.numberOfLayers} onChange={setField} type="number" />
                    <SelectField label="Decking Type" field="deckingType" value={form.deckingType} options={SELECT_OPTIONS.deckingType} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.deckingType)} onOtherModeChange={setOtherFieldMode} />
                    <SelectField label="Decking Condition" field="deckingCondition" value={form.deckingCondition} options={SELECT_OPTIONS.deckingCondition} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.deckingCondition)} onOtherModeChange={setOtherFieldMode} />
                    <SelectField label="Underlayment Type" field="underlaymentType" value={form.underlaymentType} options={SELECT_OPTIONS.underlaymentType} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.underlaymentType)} onOtherModeChange={setOtherFieldMode} />
                    <SelectField label="Ventilation Type" field="ventilationType" value={form.ventilationType} options={SELECT_OPTIONS.ventilationType} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.ventilationType)} onOtherModeChange={setOtherFieldMode} />
                    <BasicField label="Ventilation Count" field="ventilationCount" value={form.ventilationCount} onChange={setField} type="number" />
                    <SelectField label="Flashing Condition" field="flashingCondition" value={form.flashingCondition} options={SELECT_OPTIONS.flashingCondition} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.flashingCondition)} onOtherModeChange={setOtherFieldMode} />
                    <SelectField label="Gutter Condition" field="gutterCondition" value={form.gutterCondition} options={SELECT_OPTIONS.gutterCondition} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.gutterCondition)} onOtherModeChange={setOtherFieldMode} />
                    <BasicField label="Skylight Count" field="skylightCount" value={form.skylightCount} onChange={setField} type="number" />
                    <BasicField label="Skylight Condition" field="skylightCondition" value={form.skylightCondition} onChange={setField} />
                    <BooleanField label="Chimney Present" field="chimneyPresent" checked={Boolean(form.chimneyPresent)} onChange={setField} />
                    <BasicField label="Chimney Condition" field="chimneyCondition" value={form.chimneyCondition} onChange={setField} />
                    <SelectField label="Soffit / Fascia Condition" field="soffitFasciaCondition" value={form.soffitFasciaCondition} options={SELECT_OPTIONS.soffitFasciaCondition} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.soffitFasciaCondition)} onOtherModeChange={setOtherFieldMode} />
                    <BooleanField label="Drip Edge Present" field="dripEdgePresent" checked={Boolean(form.dripEdgePresent)} onChange={setField} />
                    <BasicField label="Drip Edge Condition" field="dripEdgeCondition" value={form.dripEdgeCondition} onChange={setField} />
                    <BooleanField label="Ice / Water Shield Present" field="iceWaterShieldPresent" checked={Boolean(form.iceWaterShieldPresent)} onChange={setField} />
                </div>
            )}

            {activeTab === "damage" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <BooleanField label="Storm Damage Found" field="stormDamageFound" checked={Boolean(form.stormDamageFound)} onChange={setField} />
                        <SelectField label="Hail Size Found" field="hailSizeFound" value={form.hailSizeFound} options={SELECT_OPTIONS.hailSizeFound} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.hailSizeFound)} onOtherModeChange={setOtherFieldMode} />
                        <div className="sm:col-span-2">
                            <BasicField label="Wind Damage Details" field="windDamageDetails" value={form.windDamageDetails} onChange={setField} type="textarea" />
                        </div>
                        <div className="sm:col-span-2">
                            <BasicField label="Hail Damage Details" field="hailDamageDetails" value={form.hailDamageDetails} onChange={setField} type="textarea" />
                        </div>
                        <div className="sm:col-span-2">
                            <BasicField label="Test Square Results" field="testSquareResults" value={form.testSquareResults} onChange={setField} type="textarea" />
                        </div>
                        <BooleanField label="Interior Damage Found" field="interiorDamageFound" checked={Boolean(form.interiorDamageFound)} onChange={setField} />
                        <SelectField label="Overall Damage Rating" field="overallDamageRating" value={form.overallDamageRating} options={SELECT_OPTIONS.overallDamageRating} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.overallDamageRating)} onOtherModeChange={setOtherFieldMode} />
                        <div className="sm:col-span-2">
                            <BasicField label="Interior Damage Details" field="interiorDamageDetails" value={form.interiorDamageDetails} onChange={setField} type="textarea" />
                        </div>
                    </div>

                    <InspectionPhotoSection
                        items={photoItems}
                        onAddFiles={handleAddPhotos}
                        onRemove={handleRemovePhoto}
                        loading={photoLoading}
                    />
                </div>
            )}

            {activeTab === "materials" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <SelectField label="Proposed Material" field="proposedMaterial" value={form.proposedMaterial} options={SELECT_OPTIONS.proposedMaterial} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.proposedMaterial)} onOtherModeChange={setOtherFieldMode} />
                    <BasicField label="Shingle Brand" field="shingleBrand" value={form.shingleBrand} onChange={setField} />
                    <BasicField label="Shingle Line" field="shingleLine" value={form.shingleLine} onChange={setField} />
                    <BasicField label="Shingle Color" field="shingleColor" value={form.shingleColor} onChange={setField} />
                    <BasicField label="Underlayment Choice" field="underlaymentChoice" value={form.underlaymentChoice} onChange={setField} />
                    <BasicField label="Ridge Cap Type" field="ridgeCapType" value={form.ridgeCapType} onChange={setField} />
                    <BasicField label="Ventilation Plan" field="ventilationPlan" value={form.ventilationPlan} onChange={setField} />
                    <BasicField label="Drip Edge Color" field="dripEdgeColor" value={form.dripEdgeColor} onChange={setField} />
                    <SelectField label="Warranty Type" field="warrantyType" value={form.warrantyType} options={SELECT_OPTIONS.warrantyType} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.warrantyType)} onOtherModeChange={setOtherFieldMode} />
                    <BasicField label="Warranty Years" field="warrantyYears" value={form.warrantyYears} onChange={setField} type="number" />
                </div>
            )}

            {activeTab === "estimate" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <BasicField label="Material Cost ($)" field="materialCost" value={form.materialCost} onChange={setField} type="number" />
                    <BasicField label="Labor Cost ($)" field="laborCost" value={form.laborCost} onChange={setField} type="number" />
                    <BasicField label="Tear-Off Cost ($)" field="tearOffCost" value={form.tearOffCost} onChange={setField} type="number" />
                    <BasicField label="Permit Cost ($)" field="permitCost" value={form.permitCost} onChange={setField} type="number" />
                    <BasicField label="Dumpster Cost ($)" field="dumpsterCost" value={form.dumpsterCost} onChange={setField} type="number" />
                    <BasicField label="Misc Cost ($)" field="miscCost" value={form.miscCost} onChange={setField} type="number" />
                    <BasicField label="Subtotal ($)" field="subtotal" value={form.subtotal} onChange={setField} type="number" />
                    <BasicField label="Overhead %" field="overheadPercent" value={form.overheadPercent} onChange={setField} type="number" />
                    <BasicField label="Profit %" field="profitPercent" value={form.profitPercent} onChange={setField} type="number" />
                    <BasicField label="Total Estimate ($)" field="totalEstimate" value={form.totalEstimate} onChange={setField} type="number" />
                    <BasicField label="Customer Price ($)" field="customerPrice" value={form.customerPrice} onChange={setField} type="number" />
                    <BasicField label="Deposit Required ($)" field="depositRequired" value={form.depositRequired} onChange={setField} type="number" />
                    <BooleanField label="Deposit Collected" field="depositCollected" checked={Boolean(form.depositCollected)} onChange={setField} />
                    <SelectField label="Payment Method" field="paymentMethod" value={form.paymentMethod} options={SELECT_OPTIONS.paymentMethod} onChange={setField} allowOther otherMode={Boolean(otherFieldModes.paymentMethod)} onOtherModeChange={setOtherFieldMode} />
                </div>
            )}

            {activeTab === "scheduling" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <BasicField label="Tentative Start Date" field="tentativeStartDate" value={form.tentativeStartDate} onChange={setField} type="date" />
                    <SelectField label="Estimated Duration" field="estimatedDuration" value={form.estimatedDuration} options={SELECT_OPTIONS.estimatedDuration} onChange={setField} />
                    <BasicField label="Crew Size" field="crewSize" value={form.crewSize} onChange={setField} type="number" />
                    <BasicField label="Crew Lead Name" field="crewLeadName" value={form.crewLeadName} onChange={setField} />
                    <BooleanField label="Materials Ordered" field="materialsOrdered" checked={Boolean(form.materialsOrdered)} onChange={setField} />
                    <BasicField label="Materials Delivery Date" field="materialsDeliveryDate" value={form.materialsDeliveryDate} onChange={setField} type="date" />
                    <BooleanField label="Permit Pulled" field="permitPulled" checked={Boolean(form.permitPulled)} onChange={setField} />
                    <BasicField label="Permit Number" field="permitNumber" value={form.permitNumber} onChange={setField} />
                    <BooleanField label="Dumpster Ordered" field="dumpsterOrdered" checked={Boolean(form.dumpsterOrdered)} onChange={setField} />
                    <BasicField label="Dumpster Delivery Date" field="dumpsterDeliveryDate" value={form.dumpsterDeliveryDate} onChange={setField} type="date" />
                </div>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                {onCancel ? (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={() => void handleSubmit(false)} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Draft
                </Button>
                {isSchedulingTab ? (
                    <Button type="button" onClick={() => void handleSubmit(true)} disabled={saving} className="gap-2 bg-[#0891B2] text-white hover:bg-[#0E7490]">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Save & Complete
                    </Button>
                ) : (
                    <Button type="button" onClick={handleNextTab} disabled={saving || activeTabIndex === INSP_TABS.length - 1} className="gap-2 bg-[#0891B2] text-white hover:bg-[#0E7490]">
                        Next
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default InspectionEditor;
