import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileDown, Loader2, MapPin, Save, Satellite, Sparkles, Users } from "lucide-react";

import RoofPolygonEditor, {
  normalizePolygonPoints,
  type PolygonPoint,
} from "@/components/RoofPolygonEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getClients } from "@/features/clients/services/clients-service";
import { getLeads } from "@/features/leads/services/leads-service";
import {
  detectRoof,
  fetchSatelliteImage,
  saveEstimate,
  type DetectionResult,
  type SatelliteResult,
  type SaveEstimatePayload,
} from "@/features/roof-estimator/services/roof-estimator-service";
import {
  calculatePolygonAreaPixels,
  calculateRoofAreaSqFt,
} from "@/features/roof-estimator/utils/area";
import {
  buildRoofProposalPdf,
  downloadRoofProposalPdfBlob,
  type RoofProposalPdfInput,
} from "@/features/roof-estimator/utils/generate-roof-proposal-pdf";
import {
  buildEstimateNotesWithMetadata,
  type ProposalNoteMetadata,
} from "@/features/roof-estimator/utils/proposal-note-metadata";
import {
  parseStaticMapSize,
  parseStaticMapZoom,
} from "@/features/roof-estimator/utils/static-map";

const SQM_PER_SQFT = 1 / 10.7639;
const DEFAULT_IMAGE_WIDTH = 1024;
const DEFAULT_IMAGE_HEIGHT = 1024;
const DEFAULT_ZOOM = 20;

type RecipientType = "client" | "lead";

type RecipientOption = {
  type: RecipientType;
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createFallbackPolygon(width: number, height: number): PolygonPoint[] {
  return [
    { x: width * 0.28, y: height * 0.3 },
    { x: width * 0.72, y: height * 0.34 },
    { x: width * 0.76, y: height * 0.64 },
    { x: width * 0.58, y: height * 0.75 },
    { x: width * 0.3, y: height * 0.7 },
    { x: width * 0.24, y: height * 0.48 },
  ];
}

function createInitialAiPolygon(params: {
  aiAreaSqFt: number;
  centerLat: number;
  zoom: number;
  imageWidth: number;
  imageHeight: number;
}): PolygonPoint[] {
  const { aiAreaSqFt, centerLat, zoom, imageWidth, imageHeight } = params;

  if (aiAreaSqFt <= 0) {
    return createFallbackPolygon(imageWidth, imageHeight);
  }

  const metersPerPixel =
    (156543.03392 * Math.cos((clamp(centerLat, -85, 85) * Math.PI) / 180)) /
    2 ** clamp(zoom, 1, 23);

  const areaSquareMeters = aiAreaSqFt * SQM_PER_SQFT;
  const targetPixelArea = areaSquareMeters / (metersPerPixel ** 2);

  if (!Number.isFinite(targetPixelArea) || targetPixelArea <= 0) {
    return createFallbackPolygon(imageWidth, imageHeight);
  }

  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  const radius = clamp(
    Math.sqrt(targetPixelArea / Math.PI),
    imageWidth * 0.1,
    imageWidth * 0.38,
  );

  // Build a contractor-friendly irregular roof-like hexagon around center.
  const factors = [1.0, 0.9, 1.08, 0.95, 1.05, 0.88];
  const angleOffset = -Math.PI / 6;

  return factors.map((factor, index) => {
    const angle = angleOffset + (index * (Math.PI * 2)) / factors.length;
    return {
      x: clamp(cx + Math.cos(angle) * radius * factor, 0, imageWidth),
      y: clamp(cy + Math.sin(angle) * radius * factor, 0, imageHeight),
    };
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function toNonEmptyString(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function pickFirstString(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = toNonEmptyString(record[key]);
    if (value) return value;
  }

  return "";
}

function mapClientOption(raw: unknown): RecipientOption | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const idCandidate = record.id ?? record.Id ?? record.clientId ?? record.ClientId;
  if (idCandidate === undefined || idCandidate === null) return null;

  const id = String(idCandidate).trim();
  if (!id) return null;

  const clientName = pickFirstString(record, [
    "clientName",
    "ClientName",
    "name",
    "Name",
  ]);
  const companyName = pickFirstString(record, [
    "companyName",
    "CompanyName",
    "businessName",
    "BusinessName",
  ]);
  const email = pickFirstString(record, [
    "primaryEmail",
    "contactEmail",
    "ContactEmail",
    "email",
    "Email",
  ]);
  const phone = pickFirstString(record, [
    "primaryContactPhone",
    "contactNo",
    "ContactNo",
    "phone",
    "Phone",
    "mobile",
    "Mobile",
  ]);

  return {
    type: "client",
    id,
    name: clientName || companyName || "Client",
    companyName,
    email,
    phone,
  };
}

function mapLeadOption(raw: unknown): RecipientOption | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const idCandidate = record.id ?? record.Id ?? record.leadId ?? record.LeadId;
  if (idCandidate === undefined || idCandidate === null) return null;

  const id = String(idCandidate).trim();
  if (!id) return null;

  const firstName = pickFirstString(record, ["firstName", "FirstName"]);
  const lastName = pickFirstString(record, ["lastName", "LastName"]);
  const companyName = pickFirstString(record, [
    "companyName",
    "CompanyName",
    "company",
    "Company",
  ]);
  const email = pickFirstString(record, [
    "email",
    "Email",
    "primaryEmail",
    "contactEmail",
  ]);
  const phone = pickFirstString(record, [
    "phone",
    "Phone",
    "mobile",
    "Mobile",
    "contactNo",
    "ContactNo",
  ]);

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    type: "lead",
    id,
    name: fullName || companyName || "Lead",
    companyName,
    email,
    phone,
  };
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getIsoDatePlusDays(days: number): string {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function createProposalNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `RFQ-${yyyy}${mm}${dd}-${hh}${min}`;
}

export default function EstimateModule(): JSX.Element {
  const { toast } = useToast();

  const [address, setAddress] = useState("3837 Oak St, Vancouver, BC V6H 2M6, Canada");
  const [satellite, setSatellite] = useState<SatelliteResult | null>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [editorResetToken, setEditorResetToken] = useState(0);
  const [initialPolygon, setInitialPolygon] = useState<PolygonPoint[]>(
    createFallbackPolygon(DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT),
  );
  const [currentPolygon, setCurrentPolygon] = useState<PolygonPoint[]>(
    createFallbackPolygon(DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT),
  );
  const [imageWidth, setImageWidth] = useState(DEFAULT_IMAGE_WIDTH);
  const [imageHeight, setImageHeight] = useState(DEFAULT_IMAGE_HEIGHT);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pricePerSqft, setPricePerSqft] = useState(5.5);
  const [notes, setNotes] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("client");
  const [clients, setClients] = useState<RecipientOption[]>([]);
  const [leads, setLeads] = useState<RecipientOption[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [draftPayload, setDraftPayload] = useState<SaveEstimatePayload | null>(null);
  const [proposalNumber, setProposalNumber] = useState(() => createProposalNumber());
  const [proposalTitle, setProposalTitle] = useState("Roof Replacement Proposal");
  const [proposalIssueDate, setProposalIssueDate] = useState(() => getTodayIsoDate());
  const [proposalValidUntil, setProposalValidUntil] = useState(() => getIsoDatePlusDays(15));
  const [proposalCompanyName, setProposalCompanyName] = useState("Zodo Roofing");
  const [proposalClientName, setProposalClientName] = useState("");
  const [proposalClientCompany, setProposalClientCompany] = useState("");
  const [proposalClientEmail, setProposalClientEmail] = useState("");
  const [proposalClientPhone, setProposalClientPhone] = useState("");
  const [proposalScope, setProposalScope] = useState(
    "Install full roofing system based on measured roof area. Includes material supply, labor, and site cleanup.",
  );
  const [proposalTerms, setProposalTerms] = useState(
    "Estimate is valid for the period shown above. Final invoice may change if site conditions differ from satellite analysis.",
  );

  const [loadingSatellite, setLoadingSatellite] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [creatingAndSaving, setCreatingAndSaving] = useState(false);
  const [downloadingProposal, setDownloadingProposal] = useState(false);

  const activeRecipients = useMemo(
    () => (recipientType === "client" ? clients : leads),
    [clients, leads, recipientType],
  );

  const selectedRecipient = useMemo(
    () =>
      activeRecipients.find((recipient) => recipient.id === selectedRecipientId) ?? null,
    [activeRecipients, selectedRecipientId],
  );

  useEffect(() => {
    let mounted = true;
    setLoadingRecipients(true);

    const loadClients = getClients()
      .then((clientsData) => {
        if (!mounted) return;
        const mappedClients = (clientsData || [])
          .map((client) => mapClientOption(client))
          .filter((recipient): recipient is RecipientOption => Boolean(recipient));
        setClients(mappedClients);
      })
      .catch(() => {
        if (!mounted) return;
        setClients([]);
      });

    const loadLeads = getLeads({ limit: 150 })
      .then((leadsData) => {
        if (!mounted) return;
        const mappedLeads = (leadsData || [])
          .map((lead) => mapLeadOption(lead))
          .filter((recipient): recipient is RecipientOption => Boolean(recipient));
        setLeads(mappedLeads);
      })
      .catch(() => {
        if (!mounted) return;
        setLeads([]);
      });

    Promise.allSettled([loadClients, loadLeads])
      .finally(() => {
        if (!mounted) return;
        setLoadingRecipients(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const buildPayloadFromPolygon = useCallback(
    (
      polygon: PolygonPoint[],
      overrides?: {
        detection?: DetectionResult | null;
        clientId?: string;
        satelliteData?: SatelliteResult;
      },
    ) => {
      const activeSatellite = overrides?.satelliteData ?? satellite;
      if (!activeSatellite) {
        setDraftPayload(null);
        return;
      }

      const activeDetection = overrides?.detection ?? detection;
      const activeClientId =
        overrides?.clientId ??
        (recipientType === "client" ? selectedRecipientId : "");
      const roofAreaSqFt = calculateRoofAreaSqFt({
        points: polygon,
        centerLat: activeSatellite.latitude,
        zoom,
      });
      const totalEstimate = Number((roofAreaSqFt * pricePerSqft).toFixed(2));
      const normalized = normalizePolygonPoints(polygon, imageWidth, imageHeight);

      const polygonMeta = `polygon_normalized=${JSON.stringify(normalized)}`;
      const composedNotes = notes.trim()
        ? `${notes.trim()}\n${polygonMeta}`
        : polygonMeta;

      const payload: SaveEstimatePayload = {
        address: activeSatellite.formattedAddress,
        latitude: activeSatellite.latitude,
        longitude: activeSatellite.longitude,
        satelliteImageUrl: activeSatellite.satelliteImageUrl,
        roofAreaSqft: roofAreaSqFt,
        confidence: activeDetection?.confidence ?? 30,
        processingTimeSec: activeDetection?.processingTimeSec ?? 0,
        aiModel: activeDetection?.aiModel ?? "manual-polygon",
        pricePerSqft,
        manualAdjustment: 0,
        totalEstimate,
        snowMode: true,
        notes: composedNotes,
        clientId: activeClientId || undefined,
      };

      setDraftPayload(payload);
    },
    [
      detection,
      imageHeight,
      imageWidth,
      notes,
      pricePerSqft,
      recipientType,
      satellite,
      selectedRecipientId,
      zoom,
    ],
  );

  const handleLoadSatellite = useCallback(async () => {
    if (!address.trim()) {
      toast({
        title: "Address required",
        description: "Enter a valid property address first.",
        variant: "destructive",
      });
      return;
    }

    setLoadingSatellite(true);
    setDetection(null);
    setDraftPayload(null);

    try {
      const data = await fetchSatelliteImage(address.trim());
      const parsedSize = parseStaticMapSize(data.satelliteImageUrl);
      const parsedZoom = parseStaticMapZoom(data.satelliteImageUrl);

      setSatellite(data);
      setImageWidth(parsedSize.width);
      setImageHeight(parsedSize.height);
      setZoom(parsedZoom);

      const fallbackPolygon = createFallbackPolygon(parsedSize.width, parsedSize.height);
      setInitialPolygon(fallbackPolygon);
      setCurrentPolygon(fallbackPolygon);
      setEditorResetToken((previous) => previous + 1);
      buildPayloadFromPolygon(fallbackPolygon, { detection: null, satelliteData: data });

      toast({
        title: "Satellite image loaded",
        description: data.formattedAddress,
      });
    } catch (error: any) {
      toast({
        title: "Failed to load satellite",
        description: error?.response?.data?.message || error?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setLoadingSatellite(false);
    }
  }, [address, buildPayloadFromPolygon, toast]);

  const handleDetectAndSeedPolygon = useCallback(async () => {
    if (!satellite) return;

    setDetecting(true);

    try {
      const aiDetection = await detectRoof({
        satelliteImageUrl: satellite.satelliteImageUrl,
        latitude: satellite.latitude,
        longitude: satellite.longitude,
      });

      const aiPolygon = createInitialAiPolygon({
        aiAreaSqFt: aiDetection.roofAreaSqft,
        centerLat: satellite.latitude,
        zoom,
        imageWidth,
        imageHeight,
      });

      setDetection(aiDetection);
      setInitialPolygon(aiPolygon);
      setCurrentPolygon(aiPolygon);
      setEditorResetToken((previous) => previous + 1);
      buildPayloadFromPolygon(aiPolygon, { detection: aiDetection });

      toast({
        title: "AI polygon seeded",
        description: `AI detected ${aiDetection.roofAreaSqft.toLocaleString()} sq ft. You can now adjust points manually.`,
      });
    } catch (error: any) {
      toast({
        title: "AI detect failed",
        description: error?.response?.data?.message || error?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  }, [buildPayloadFromPolygon, imageHeight, imageWidth, satellite, toast, zoom]);

  const handlePolygonChange = useCallback(
    (points: PolygonPoint[]) => {
      setCurrentPolygon(points);
      buildPayloadFromPolygon(points);
    },
    [buildPayloadFromPolygon],
  );

  const handleRecipientTypeChange = useCallback(
    (value: RecipientType) => {
      setRecipientType(value);
      setSelectedRecipientId("");
      setProposalClientName("");
      setProposalClientCompany("");
      setProposalClientEmail("");
      setProposalClientPhone("");

      if (currentPolygon.length >= 3) {
        buildPayloadFromPolygon(currentPolygon, { clientId: "" });
      }
    },
    [buildPayloadFromPolygon, currentPolygon],
  );

  const handleRecipientSelection = useCallback(
    (value: string) => {
      const recipientId = value === "none" ? "" : value;
      const matchedRecipient =
        activeRecipients.find((recipient) => recipient.id === recipientId) ?? null;
      const clientId = recipientType === "client" ? recipientId : "";

      setSelectedRecipientId(recipientId);
      setProposalClientName(matchedRecipient?.name || "");
      setProposalClientCompany(matchedRecipient?.companyName || "");
      setProposalClientEmail(matchedRecipient?.email || "");
      setProposalClientPhone(matchedRecipient?.phone || "");

      if (currentPolygon.length >= 3) {
        buildPayloadFromPolygon(currentPolygon, { clientId });
      }
    },
    [activeRecipients, buildPayloadFromPolygon, currentPolygon, recipientType],
  );

  const handleSaveEstimate = useCallback(async () => {
    if (!draftPayload) {
      toast({
        title: "Nothing to save",
        description: "Load satellite and adjust polygon first.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      await saveEstimate(draftPayload);
      toast({
        title: "Estimate saved",
        description: `${formatCurrency(draftPayload.totalEstimate)} estimate created from edited polygon.`,
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.response?.data?.message || error?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [draftPayload, toast]);

  const polygonAreaPixels = useMemo(
    () => calculatePolygonAreaPixels(currentPolygon),
    [currentPolygon],
  );

  const polygonAreaSqFt = useMemo(
    () =>
      satellite
        ? calculateRoofAreaSqFt({
            points: currentPolygon,
            centerLat: satellite.latitude,
            zoom,
          })
        : 0,
    [currentPolygon, satellite, zoom],
  );

  const buildProposalMetadata = useCallback(
    (recipientName: string): ProposalNoteMetadata => ({
      proposalNumber: proposalNumber.trim() || createProposalNumber(),
      proposalTitle: proposalTitle.trim() || "Roof Replacement Proposal",
      issueDate: proposalIssueDate || getTodayIsoDate(),
      validUntil: proposalValidUntil || getIsoDatePlusDays(15),
      companyName: proposalCompanyName.trim() || "Zodo Roofing",
      recipientType,
      recipientName,
      recipientCompany: proposalClientCompany.trim() || undefined,
      recipientEmail: proposalClientEmail.trim() || undefined,
      recipientPhone: proposalClientPhone.trim() || undefined,
      scopeOfWork: proposalScope.trim() || undefined,
      termsAndConditions: proposalTerms.trim() || undefined,
    }),
    [
      proposalClientCompany,
      proposalClientEmail,
      proposalClientPhone,
      proposalCompanyName,
      proposalIssueDate,
      proposalNumber,
      proposalScope,
      proposalTerms,
      proposalTitle,
      proposalValidUntil,
      recipientType,
    ],
  );

  const buildPayloadWithProposalMetadata = useCallback(
    (payload: SaveEstimatePayload, recipientName: string): SaveEstimatePayload => {
      const normalizedPolygon = normalizePolygonPoints(currentPolygon, imageWidth, imageHeight);
      const proposalMeta = buildProposalMetadata(recipientName);
      const composedNotes = buildEstimateNotesWithMetadata({
        plainNotes: notes,
        polygonNormalized: normalizedPolygon,
        proposalMeta,
      });

      return {
        ...payload,
        notes: composedNotes,
      };
    },
    [buildProposalMetadata, currentPolygon, imageHeight, imageWidth, notes],
  );

  const buildProposalPdfInput = useCallback(
    (payload: SaveEstimatePayload, recipientName: string): RoofProposalPdfInput | null => {
      if (!satellite) return null;

      return {
        proposalNumber: proposalNumber.trim() || createProposalNumber(),
        proposalTitle: proposalTitle.trim() || "Roof Replacement Proposal",
        issueDate: proposalIssueDate || getTodayIsoDate(),
        validUntil: proposalValidUntil || getIsoDatePlusDays(15),
        companyName: proposalCompanyName.trim() || "Zodo Roofing",
        recipient: {
          type: recipientType,
          name: recipientName,
          company: proposalClientCompany.trim() || undefined,
          email: proposalClientEmail.trim() || undefined,
          phone: proposalClientPhone.trim() || undefined,
        },
        property: {
          address: satellite.formattedAddress,
          latitude: satellite.latitude,
          longitude: satellite.longitude,
        },
        satelliteImageUrl: satellite.satelliteImageUrl,
        metrics: {
          roofAreaSqft: payload.roofAreaSqft,
          pixelArea: polygonAreaPixels,
          pricePerSqft: payload.pricePerSqft,
          totalEstimate: payload.totalEstimate,
          confidence: payload.confidence,
          aiModel: payload.aiModel,
          processingTimeSec: payload.processingTimeSec,
          zoom,
          imageWidth,
          imageHeight,
        },
        polygonPoints: currentPolygon,
        scopeOfWork: proposalScope,
        internalNotes: notes,
        termsAndConditions: proposalTerms,
      };
    },
    [
      currentPolygon,
      imageHeight,
      imageWidth,
      notes,
      polygonAreaPixels,
      proposalClientCompany,
      proposalClientEmail,
      proposalClientPhone,
      proposalCompanyName,
      proposalIssueDate,
      proposalNumber,
      proposalScope,
      proposalTerms,
      proposalTitle,
      proposalValidUntil,
      recipientType,
      satellite,
      zoom,
    ],
  );

  const prepareProposalContext = useCallback(() => {
    if (!satellite || !draftPayload) {
      toast({
        title: "Missing estimate data",
        description: "Load satellite and adjust the polygon before creating the proposal.",
        variant: "destructive",
      });
      return null;
    }

    const recipientName = proposalClientName.trim() || selectedRecipient?.name || "";
    if (!recipientName) {
      toast({
        title: "Recipient required",
        description: "Select a client/lead (or set recipient name) before continuing.",
        variant: "destructive",
      });
      return null;
    }

    const payloadWithMetadata = buildPayloadWithProposalMetadata(draftPayload, recipientName);
    const proposalInput = buildProposalPdfInput(payloadWithMetadata, recipientName);
    if (!proposalInput) {
      toast({
        title: "Proposal setup failed",
        description: "Unable to prepare proposal PDF input.",
        variant: "destructive",
      });
      return null;
    }

    return { payloadWithMetadata, proposalInput };
  }, [
    buildPayloadWithProposalMetadata,
    buildProposalPdfInput,
    draftPayload,
    proposalClientName,
    satellite,
    selectedRecipient,
    toast,
  ]);

  const handleCreateAndSave = useCallback(async () => {
    const context = prepareProposalContext();
    if (!context) return;

    setCreatingAndSaving(true);
    try {
      await buildRoofProposalPdf(context.proposalInput);
      await saveEstimate(context.payloadWithMetadata);
      toast({
        title: "Proposal created and saved",
        description: "Estimate is now in history. Open View Details to see the PDF.",
      });
    } catch (error: any) {
      toast({
        title: "Create and save failed",
        description: error?.response?.data?.message || error?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setCreatingAndSaving(false);
    }
  }, [prepareProposalContext, toast]);

  const handleDownloadProposal = useCallback(async () => {
    const context = prepareProposalContext();
    if (!context) return;

    setDownloadingProposal(true);
    try {
      await saveEstimate(context.payloadWithMetadata);
      const result = await buildRoofProposalPdf(context.proposalInput);
      downloadRoofProposalPdfBlob(result);
      toast({
        title: "Estimate created and downloaded",
        description: `${result.fileName} was downloaded after saving to history.`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error?.response?.data?.message || error?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setDownloadingProposal(false);
    }
  }, [prepareProposalContext, toast]);

  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 lg:p-6">
      <header className="rounded-xl border bg-white p-4">
        <h2 className="text-xl font-semibold text-slate-900">Roof Polygon Editor</h2>
        <p className="mt-1 text-sm text-slate-600">
          Edit the AI roof outline over satellite imagery. Every vertex change updates the live
          `saveEstimate` API payload.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
              <div>
                <Label className="text-xs text-slate-500">Property Address</Label>
                <div className="relative mt-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="pl-9"
                    placeholder="3837 Oak St, Vancouver, BC"
                  />
                </div>
              </div>

              <Button type="button" variant="outline" className="mt-auto" onClick={handleLoadSatellite} disabled={loadingSatellite}>
                {loadingSatellite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Satellite className="mr-2 h-4 w-4" />}
                Load Satellite
              </Button>

              <Button type="button" className="mt-auto bg-[#0891B2] hover:bg-[#0891B2]/90" onClick={handleDetectAndSeedPolygon} disabled={!satellite || detecting}>
                {detecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Detect + Seed Polygon
              </Button>

              <Button type="button" className="mt-auto" onClick={handleSaveEstimate} disabled={!draftPayload || saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Estimate
              </Button>
            </div>
          </div>

          {satellite ? (
            <RoofPolygonEditor
              key={editorResetToken}
              imageUrl={satellite.satelliteImageUrl}
              width={imageWidth}
              height={imageHeight}
              initialPolygon={initialPolygon}
              centerLat={satellite.latitude}
              mapZoom={zoom}
              showEdgeLengths
              onChange={handlePolygonChange}
            />
          ) : (
            <div className="flex min-h-[640px] items-center justify-center rounded-xl border border-dashed bg-white text-sm text-slate-500">
              Load a satellite image to start editing the roof polygon.
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">Live Calculation</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Zoom</span>
                <span className="font-medium text-slate-800">{zoom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pixel Area</span>
                <span className="font-medium text-slate-800">{polygonAreaPixels.toFixed(1)} px2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Roof Area</span>
                <span className="font-semibold text-slate-900">{polygonAreaSqFt.toLocaleString()} sq ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Price / sq ft</span>
                <Input
                  value={pricePerSqft}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    const safeValue = Number.isFinite(next) ? Math.max(0, next) : 0;
                    setPricePerSqft(safeValue);
                    if (currentPolygon.length >= 3) {
                      buildPayloadFromPolygon(currentPolygon);
                    }
                  }}
                  className="h-8 w-24"
                  type="number"
                  min={0}
                  step={0.1}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <Label className="text-xs text-slate-500">Estimate Notes</Label>
            <textarea
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                if (currentPolygon.length >= 3) {
                  buildPayloadFromPolygon(currentPolygon);
                }
              }}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-[#0891B2]/20 focus:ring"
              placeholder="Optional contractor notes..."
            />
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0891B2]" />
              <h3 className="text-sm font-semibold text-slate-800">Proposal Form & PDF</h3>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500">Recipient Type</Label>
                <Select
                  value={recipientType}
                  onValueChange={(value) => handleRecipientTypeChange(value as RecipientType)}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-500">
                  {recipientType === "client" ? "Client" : "Lead"}
                </Label>
                <Select
                  value={selectedRecipientId || "none"}
                  onValueChange={handleRecipientSelection}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue
                      placeholder={
                        loadingRecipients
                          ? "Loading recipients..."
                          : recipientType === "client"
                            ? "Select a client"
                            : "Select a lead"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {recipientType === "client" ? "No client selected" : "No lead selected"}
                    </SelectItem>
                    {!loadingRecipients && activeRecipients.length === 0 && (
                      <SelectItem value="__empty" disabled>
                        {recipientType === "client"
                          ? "No clients available"
                          : "No leads available"}
                      </SelectItem>
                    )}
                    {activeRecipients.map((recipient) => (
                      <SelectItem key={`${recipient.type}-${recipient.id}`} value={recipient.id}>
                        {recipient.name}
                        {recipient.companyName ? ` — ${recipient.companyName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-500">Proposal #</Label>
                  <Input
                    value={proposalNumber}
                    onChange={(event) => setProposalNumber(event.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Valid Until</Label>
                  <Input
                    type="date"
                    value={proposalValidUntil}
                    onChange={(event) => setProposalValidUntil(event.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Proposal Title</Label>
                <Input
                  value={proposalTitle}
                  onChange={(event) => setProposalTitle(event.target.value)}
                  className="mt-1 h-9"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500">Issue Date</Label>
                <Input
                  type="date"
                  value={proposalIssueDate}
                  onChange={(event) => setProposalIssueDate(event.target.value)}
                  className="mt-1 h-9"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500">Your Company Name</Label>
                <Input
                  value={proposalCompanyName}
                  onChange={(event) => setProposalCompanyName(event.target.value)}
                  className="mt-1 h-9"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label className="text-xs text-slate-500">
                    {recipientType === "client" ? "Client Name" : "Lead Name"}
                  </Label>
                  <Input
                    value={proposalClientName}
                    onChange={(event) => setProposalClientName(event.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Client Company</Label>
                  <Input
                    value={proposalClientCompany}
                    onChange={(event) => setProposalClientCompany(event.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-500">Client Email</Label>
                  <Input
                    type="email"
                    value={proposalClientEmail}
                    onChange={(event) => setProposalClientEmail(event.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Client Phone</Label>
                  <Input
                    value={proposalClientPhone}
                    onChange={(event) => setProposalClientPhone(event.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Scope of Work</Label>
                <textarea
                  value={proposalScope}
                  onChange={(event) => setProposalScope(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-[#0891B2]/20 focus:ring"
                  placeholder="Describe work included in this proposal..."
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500">Terms & Conditions</Label>
                <textarea
                  value={proposalTerms}
                  onChange={(event) => setProposalTerms(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-[#0891B2]/20 focus:ring"
                  placeholder="Payment terms, validity, assumptions..."
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleCreateAndSave}
                  disabled={!draftPayload || creatingAndSaving || downloadingProposal}
                >
                  {creatingAndSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Create and Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleDownloadProposal}
                  disabled={!draftPayload || creatingAndSaving || downloadingProposal}
                >
                  {downloadingProposal ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Download
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">API Payload Preview</h3>
            <p className="mt-1 text-xs text-slate-500">
              Updated directly from editor `onChange` and ready for `POST /roof-estimator`.
            </p>
            <pre className="mt-3 max-h-[360px] overflow-auto rounded-md bg-slate-900 p-3 text-[11px] leading-4 text-slate-100">
              {JSON.stringify(draftPayload, null, 2)}
            </pre>
          </div>
        </aside>
      </div>
    </section>
  );
}
