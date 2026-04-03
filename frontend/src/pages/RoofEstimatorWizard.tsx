// src/pages/RoofEstimatorWizard.tsx — 6-Step Estimate Wizard

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  autocompleteAddress,
  getPlaceDetails,
  saveEstimate,
  updateEstimate,
  getEstimateById,
  requestEagleViewInstant,
  type SaveEstimatePayload,
  type EagleViewReport,
  type EstimatePhoto,
} from "@/features/roof-estimator/services/roof-estimator-service";
import { useToast } from "@/hooks/use-toast";
import { generateEstimatePDF, downloadPDFBlob } from "@/features/roof-estimator/utils/generate-estimate-pdf";
import { buildEstimateSummaryPdf } from "@/features/roof-estimator/utils/generate-estimate-summary-pdf";
import { getClients, getClientById, type ClientEntity } from "@/features/clients/services/clients-service";
import { getLeads, getLeadById, type LeadEntity } from "@/features/leads/services/leads-service";
import {
  getWallet,
  chargeEstimate,
  checkBalance,
} from "@/features/wallet/services/wallet-service";
import { uploadFile } from "@/features/files/services/files-service";
import { getProjects } from "@/features/projects/services/projects-service";
import { getCompanyProfile, type CompanyProfile } from "@/features/settings/services/settings-service";
import {
  createQuote,
  getQuotes,
  updateQuote as updateLinkedQuote,
  type QuoteEntity,
} from "@/features/quotes/services/quotes-service";
import useIsMobile from "@/hooks/useIsMobile";

interface OtherMaterial { name: string; qty: number; cost: number; }

/* ─── Constants ──────────────────────────────────────────── */

const STEPS = [
  { num: 1, label: "Client", icon: "👤" },
  { num: 2, label: "Address", icon: "📍" },
  { num: 3, label: "Materials", icon: "🧱" },
  { num: 4, label: "Labor", icon: "👷" },
  { num: 5, label: "Extras", icon: "🔧" },
  { num: 6, label: "Profit", icon: "💰" },
  { num: 7, label: "Final", icon: "📄" },
];

/* ─── Helpers ────────────────────────────────────────────── */

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00";

const parseMeasurementNumber = (value?: string | number | null): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const match = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePitch = (report: Pick<EagleViewReport, "pitch" | "pitchTable">): string => {
  const directPitch = report.pitch?.trim();
  if (directPitch) {
    if (directPitch.includes("/")) return directPitch;
    const parsedPitch = parseMeasurementNumber(directPitch);
    return parsedPitch !== null ? `${parsedPitch}/12` : directPitch;
  }

  if (!Array.isArray(report.pitchTable) || report.pitchTable.length === 0) {
    return "";
  }

  const primaryPitch = [...report.pitchTable]
    .map((row) => ({
      pitch: row.Pitch?.trim() || "",
      area: parseMeasurementNumber(row.RoofArea) ?? 0,
      percentage: parseMeasurementNumber(row.PercentageRoofArea) ?? 0,
    }))
    .sort((left, right) => right.area - left.area || right.percentage - left.percentage)[0];

  if (!primaryPitch?.pitch) return "";
  return primaryPitch.pitch.includes("/") ? primaryPitch.pitch : `${primaryPitch.pitch}/12`;
};

const isLikelyPdfUrl = (url?: string | null): boolean =>
  Boolean(url && /(?:\.pdf(?:$|[?#]))|getreportfile|reportdownload/i.test(url));

const DEFAULT_OBLIQUE_VIEW_LABELS = ["North View", "East View", "South View", "West View"] as const;

const splitPreviewSource = (url?: string | null) => {
  if (!url || isLikelyPdfUrl(url)) return { imageUrl: "", reportUrl: "" };
  return { imageUrl: url, reportUrl: "" };
};

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const normalizeEstimatePhotos = (
  photos?: Array<string | EstimatePhoto> | null,
): EstimatePhoto[] => (Array.isArray(photos) ? photos : [])
  .map((photo, index) => {
    if (typeof photo === "string") {
      const url = photo.trim();
      if (!url) return null;
      return {
        label: DEFAULT_OBLIQUE_VIEW_LABELS[index] || `View ${index + 1}`,
        url,
      } satisfies EstimatePhoto;
    }

    if (!photo || typeof photo !== "object") return null;
    const label = String(photo.label || "").trim();
    const url = String(photo.url || "").trim();
    if (!url) return null;

    return {
      label: label || DEFAULT_OBLIQUE_VIEW_LABELS[index] || `View ${index + 1}`,
      url,
    } satisfies EstimatePhoto;
  })
  .filter((photo): photo is EstimatePhoto => Boolean(photo));

const readString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const joinAddressParts = (...parts: unknown[]) =>
  parts
    .map((part) => readString(part))
    .filter(Boolean)
    .join(", ");

const getClientRecordName = (client: Record<string, unknown>): string =>
  readString(client.clientName)
  || readString(client.ClientName)
  || readString(client.name)
  || readString(client.Name);

const getClientRecordEmail = (client: Record<string, unknown>): string =>
  readString(client.primaryEmail)
  || readString(client.contactEmail)
  || readString(client.ContactEmail)
  || readString(client.email);

const getClientRecordPhone = (client: Record<string, unknown>): string =>
  readString(client.primaryPhone)
  || readString(client.primaryContactPhone)
  || readString(client.contactNo)
  || readString(client.ContactNo)
  || readString(client.directPhone)
  || readString(client.phone)
  || readString(client.mobile);

const getClientRecordCompany = (client: Record<string, unknown>): string =>
  readString(client.companyName)
  || getClientRecordName(client);

const getClientRecordAddress = (client: Record<string, unknown>): string =>
  joinAddressParts(
    client.streetAddress,
    client.billingAddressLine1,
    client.suite,
    client.billingAddressLine2,
    client.city,
    client.province,
    client.state,
    client.postalCode,
    client.pincode,
    client.country,
  );

const getLeadRecordName = (lead: Record<string, unknown>): string => {
  const fullName = readString(lead.fullName);
  if (fullName) return fullName;

  const firstName = readString(lead.firstName);
  const lastName = readString(lead.lastName);
  const combined = `${firstName} ${lastName}`.trim();

  return combined || readString(lead.name);
};

const getLeadRecordEmail = (lead: Record<string, unknown>): string =>
  readString(lead.email);

const getLeadRecordPhone = (lead: Record<string, unknown>): string =>
  readString(lead.phone)
  || readString(lead.mobile)
  || readString(lead.secondaryPhone);

const getLeadRecordCompany = (lead: Record<string, unknown>): string =>
  readString(lead.companyName)
  || readString(lead.company);

const getLeadRecordAddress = (lead: Record<string, unknown>): string =>
  joinAddressParts(
    lead.propertyAddress,
    lead.address,
    lead.city,
    lead.state,
    lead.zipCode,
    lead.postalCode,
  );

const createEstimateDocumentNumber = (estimateId: string): string =>
  `EST-${estimateId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "DRAFT"}`;

const parseCustomQuoteNumber = (quoteNumber?: string | null): number => {
  const match = String(quoteNumber || "").match(/^Quote-(\d+)$/i);
  return match ? Number(match[1]) : 0;
};

/* ─── WizardData type ────────────────────────────────────── */

interface WizardData {
  // Step 1: Client Info
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany: string;
  sourceType: "client" | "lead" | "manual";
  leadId: string;
  // Step 2: Address
  address: string;
  placeId: string;
  latitude: number;
  longitude: number;
  satelliteImageUrl: string;
  eagleViewReportUrl: string;
  photoUrls: EstimatePhoto[];
  roofAreaSqft: number;
  confidence: number;
  processingTimeSec: number;
  aiModel: string;
  pitch: string;
  roofType: string;
  stories: number;
  layers: number;
  wastePercent: number;
  measurementSource: string;
  tearOffRequired: boolean;
  // Step 3: Materials
  shingleType: string;
  shingleQty: number;
  shinglePricePerSq: number;
  underlaymentQty: number;
  underlaymentCost: number;
  iceWaterShieldQty: number;
  iceWaterShieldCost: number;
  ridgeCapQty: number;
  ridgeCapCost: number;
  starterStripQty: number;
  starterStripCost: number;
  flashingQty: number;
  flashingCostWizard: number;
  ventQty: number;
  ventCostWizard: number;
  nailsAccessoriesQty: number;
  nailsAccessoriesCost: number;
  // Step 3
  laborCostPerSquare: number;
  numberOfLaborers: number;
  daysRequired: number;
  laborRatePerWorker: number;
  // Step 4
  dumpsterCost: number;
  permitCost: number;
  deliveryFee: number;
  equipmentRentalCost: number;
  disposalFee: number;
  // Step 5
  overheadPercent: number;
  profitMarginPercent: number;
  taxPercent: number;
  // Notes
  notes: string;
  clientId: string;
  // Dynamic materials
  otherMaterials: OtherMaterial[];
}

type SectionId =
  | "client"
  | "address"
  | "materials"
  | "labor"
  | "extras"
  | "profit"
  | "summary";

const DEFAULT_DATA: WizardData = {
  clientName: "", clientEmail: "", clientPhone: "", clientCompany: "",
  sourceType: "manual", leadId: "",
  address: "", placeId: "", latitude: 0, longitude: 0, satelliteImageUrl: "", eagleViewReportUrl: "", photoUrls: [],
  roofAreaSqft: 0, confidence: 0, processingTimeSec: 0, aiModel: "",
  pitch: "", roofType: "gable", stories: 1, layers: 1, wastePercent: 10,
  measurementSource: "", tearOffRequired: false,
  shingleType: "Architectural Shingles",
  shingleQty: 1, shinglePricePerSq: 0,
  underlaymentQty: 1, underlaymentCost: 0,
  iceWaterShieldQty: 1, iceWaterShieldCost: 0,
  ridgeCapQty: 1, ridgeCapCost: 0,
  starterStripQty: 1, starterStripCost: 0,
  flashingQty: 1, flashingCostWizard: 0,
  ventQty: 1, ventCostWizard: 0,
  nailsAccessoriesQty: 1, nailsAccessoriesCost: 0,
  laborCostPerSquare: 0, numberOfLaborers: 3, daysRequired: 2, laborRatePerWorker: 350,
  dumpsterCost: 0, permitCost: 0, deliveryFee: 0, equipmentRentalCost: 0, disposalFee: 0,
  overheadPercent: 10, profitMarginPercent: 20, taxPercent: 13,
  notes: "", clientId: "",
  otherMaterials: [],
};

const ESTIMATE_SECTIONS: { id: SectionId; title: string; shortLabel: string; icon: string; description: string }[] = [
  { id: "client", title: "Client / Lead Information", shortLabel: "Client", icon: "👤", description: "Search or enter contact details." },
  { id: "address", title: "Address & Roof Measurement", shortLabel: "Address", icon: "📍", description: "Property address and EagleView data." },
  { id: "materials", title: "Material Pricing", shortLabel: "Materials", icon: "🧱", description: "Shingles, accessories, and extras." },
  { id: "labor", title: "Labor Inputs", shortLabel: "Labor", icon: "👷", description: "Crew size, days, and labor rate." },
  { id: "extras", title: "Equipment & Extra Costs", shortLabel: "Extras", icon: "🔧", description: "Dumpsters, permits, and rentals." },
  { id: "profit", title: "Profit & Overhead", shortLabel: "Profit", icon: "💰", description: "Margins, overhead, and tax." },
  { id: "summary", title: "Estimate Summary", shortLabel: "Summary", icon: "📋", description: "Final review and generation." },
];

const MOBILE_BOTTOM_NAV_HEIGHT = 56;
const MOBILE_ACTION_BAR_OFFSET = `calc(${MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 12px)`;
const MOBILE_PAGE_BOTTOM_PADDING = 212;

/* ─── Styled Input ───────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: "1px solid #CBD5E1", fontSize: 13, outline: "none",
  background: "#fff", color: "#0F172A", transition: "border-color .15s",
};

const responsiveGrid = (
  isCompact: boolean,
  desktopColumns: string,
  mobileColumns = "1fr",
  gap = 12,
): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: isCompact ? mobileColumns : desktopColumns,
  gap,
});

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function NumberInput({ value, onChange, prefix, suffix, ...rest }: {
  value: number; onChange: (v: number) => void; prefix?: string; suffix?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && <span style={{ position: "absolute", left: 12, color: "#94A3B8", fontSize: 13, pointerEvents: "none" }}>{prefix}</span>}
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{ ...inputStyle, paddingLeft: prefix ? 28 : 14, paddingRight: suffix ? 36 : 14 }}
        {...rest}
      />
      {suffix && <span style={{ position: "absolute", right: 12, color: "#94A3B8", fontSize: 12, pointerEvents: "none" }}>{suffix}</span>}
    </div>
  );
}

/* ─── Progress Indicator ─────────────────────────────────── */

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
      {STEPS.map((s, i) => {
        const done = s.num < current;
        const active = s.num === current;
        return (
          <div key={s.num} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 70 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 14,
                background: done ? "#10B981" : active ? "linear-gradient(135deg,#6637F4,#5429D9)" : "#F1F5F9",
                color: done || active ? "#fff" : "#94A3B8",
                boxShadow: active ? "0 2px 12px rgba(102,55,244,.3)" : "none",
                transition: "all .3s ease",
              }}>
                {done ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                ) : s.icon}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: active ? "#6637F4" : done ? "#10B981" : "#94A3B8",
              }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 40, height: 3, borderRadius: 2, margin: "0 4px", marginBottom: 18,
                background: done ? "#10B981" : "#E2E8F0",
                transition: "background .3s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Wizard ────────────────────────────────────────── */

export default function RoofEstimatorWizard() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isMobile, isTablet } = useIsMobile();
  const isCompact = isMobile || isTablet;

  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [estimateId, setEstimateId] = useState<string | null>(id || null);
  const [activeSection, setActiveSection] = useState<SectionId>("client");
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Step 1: Client/Lead
  const [clients, setClients] = useState<ClientEntity[]>([]);
  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [clientSearchQ, setClientSearchQ] = useState("");
  const [selectionLoading, setSelectionLoading] = useState(false);

  // Step 2 specific
  const [addressSuggestions, setAddressSuggestions] = useState<{ description: string; placeId: string }[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  // const [detecting, setDetecting] = useState(false); // AI detection disabled
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [eagleViewLoading, setEagleViewLoading] = useState(false);
  const [eagleViewStatus, setEagleViewStatus] = useState<string>("");
  const [eagleViewError, setEagleViewError] = useState<string>("");

  // Wallet balance
  const [walletBalance, setWalletBalance] = useState<number | null>(null);;
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  // Update helper
  const up = useCallback(<K extends keyof WizardData>(key: K, val: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: val }));
  }, []);

  const resetEagleViewMeasurement = useCallback((updates: Partial<WizardData> = {}) => {
    setData((prev) => ({
      ...prev,
      satelliteImageUrl: "",
      eagleViewReportUrl: "",
      photoUrls: [],
      roofAreaSqft: 0,
      confidence: 0,
      processingTimeSec: 0,
      aiModel: "",
      pitch: "",
      measurementSource: "",
      ...updates,
    }));
  }, []);

  const handleSourceTypeChange = useCallback((nextSourceType: WizardData["sourceType"]) => {
    setClientSearchQ("");
    setData((prev) => {
      if (prev.sourceType === nextSourceType) {
        return prev;
      }

      if (nextSourceType === "manual") {
        return {
          ...prev,
          sourceType: "manual",
          clientId: "",
          leadId: "",
        };
      }

      return {
        ...prev,
        sourceType: nextSourceType,
        clientId: "",
        leadId: "",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        clientCompany: "",
      };
    });
  }, []);

  const clearSelectedSource = useCallback(() => {
    setClientSearchQ("");
    setData((prev) => ({
      ...prev,
      sourceType: "manual",
      clientId: "",
      leadId: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientCompany: "",
    }));
  }, []);

  const handleSelectClient = useCallback(async (clientId: string) => {
    if (!clientId) return;

    setSelectionLoading(true);
    try {
      const clientRecord = await getClientById(clientId);
      const normalizedClient = (clientRecord || {}) as Record<string, unknown>;

      resetEagleViewMeasurement({
        sourceType: "client",
        clientId,
        leadId: "",
        clientName: getClientRecordName(normalizedClient),
        clientEmail: getClientRecordEmail(normalizedClient),
        clientPhone: getClientRecordPhone(normalizedClient),
        clientCompany: getClientRecordCompany(normalizedClient),
        address: getClientRecordAddress(normalizedClient),
        placeId: "",
        latitude: 0,
        longitude: 0,
      });
      setClientSearchQ("");
    } catch (error) {
      console.error("Failed to load client details for roof estimate:", error);
      toast({
        title: "Error",
        description: "Failed to load the selected client details.",
        variant: "destructive",
      });
    } finally {
      setSelectionLoading(false);
    }
  }, [resetEagleViewMeasurement, toast]);

  const handleSelectLead = useCallback(async (leadId: string) => {
    if (!leadId) return;

    setSelectionLoading(true);
    try {
      const leadRecord = await getLeadById(leadId);
      const normalizedLead = (leadRecord || {}) as Record<string, unknown>;

      resetEagleViewMeasurement({
        sourceType: "lead",
        clientId: "",
        leadId,
        clientName: getLeadRecordName(normalizedLead),
        clientEmail: getLeadRecordEmail(normalizedLead),
        clientPhone: getLeadRecordPhone(normalizedLead),
        clientCompany: getLeadRecordCompany(normalizedLead),
        address: getLeadRecordAddress(normalizedLead),
        placeId: "",
        latitude: 0,
        longitude: 0,
      });
      setClientSearchQ("");
    } catch (error) {
      console.error("Failed to load lead details for roof estimate:", error);
      toast({
        title: "Error",
        description: "Failed to load the selected lead details.",
        variant: "destructive",
      });
    } finally {
      setSelectionLoading(false);
    }
  }, [resetEagleViewMeasurement, toast]);

  // Load clients + leads + wallet on mount
  useEffect(() => {
    (async () => {
      try {
        const [c, l] = await Promise.all([getClients(), getLeads()]);
        setClients(c);
        setLeads(l);
      } catch { /* silent */ }
      // Fetch wallet balance separately (non-blocking)
      try {
        const w = await getWallet();
        setWalletBalance(w.balance);
      } catch { /* silent — wallet may not exist yet */ }
      try {
        const profile = await getCompanyProfile();
        setCompanyProfile(profile);
      } catch { /* silent — branding is optional */ }
    })();
  }, []);

  // Load existing estimate when editing
  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const est = await getEstimateById(id);
          const previewSource = splitPreviewSource(est.satelliteImageUrl || "");
          const estimateLeadName = est.lead
            ? `${readString(est.lead.firstName)} ${readString(est.lead.lastName)}`.trim()
            : "";
          setEstimateId(est.id);
          setData({
            clientName: est.client?.clientName || estimateLeadName || "",
            clientEmail: est.client?.primaryEmail || est.lead?.email || "",
            clientPhone: est.client?.primaryPhone || est.lead?.phone || "",
            clientCompany: est.client?.companyName || est.lead?.companyName || est.client?.clientName || "",
            sourceType: est.leadId ? "lead" : est.clientId ? "client" : "manual",
            leadId: est.leadId || "",
            address: est.address || "", placeId: "", latitude: est.latitude || 0,
            longitude: est.longitude || 0, satelliteImageUrl: previewSource.imageUrl,
            eagleViewReportUrl: previewSource.reportUrl,
            photoUrls: normalizeEstimatePhotos(est.photoUrls),
            roofAreaSqft: est.roofAreaSqft || 0, confidence: est.confidence || 0,
            processingTimeSec: est.processingTimeSec || 0, aiModel: est.aiModel || "",
            pitch: est.pitch || "", roofType: est.roofType || "gable",
            stories: est.stories || 1, layers: est.layers || 1,
            wastePercent: est.wastePercent ?? 10, measurementSource: est.measurementSource || "",
            tearOffRequired: est.tearOffRequired || false,
            shingleType: est.shingleType || "Architectural Shingles",
            shingleQty: 1, shinglePricePerSq: est.shinglePricePerSq || 0,
            underlaymentQty: 1, underlaymentCost: est.underlaymentCost || 0,
            iceWaterShieldQty: 1, iceWaterShieldCost: est.iceWaterShieldCost || 0,
            ridgeCapQty: 1, ridgeCapCost: est.ridgeCapCost || 0,
            starterStripQty: 1, starterStripCost: est.starterStripCost || 0,
            flashingQty: 1, flashingCostWizard: est.flashingCostWizard || 0,
            ventQty: 1, ventCostWizard: est.ventCostWizard || 0,
            nailsAccessoriesQty: 1, nailsAccessoriesCost: est.nailsAccessoriesCost || 0,
            laborCostPerSquare: est.laborCostPerSquare || 0,
            numberOfLaborers: est.numberOfLaborers || 3,
            daysRequired: est.daysRequired || 2,
            laborRatePerWorker: est.laborRatePerWorker || 350,
            dumpsterCost: est.dumpsterCost || 0,
            permitCost: est.permitCost || 0,
            deliveryFee: est.deliveryFee || 0,
            equipmentRentalCost: est.equipmentRentalCost || 0,
            disposalFee: est.disposalFee || 0,
            overheadPercent: est.overheadPercent ?? 10,
            profitMarginPercent: est.profitMarginPercent ?? 20,
            taxPercent: est.taxPercent ?? 13,
            notes: est.notes || "", clientId: est.clientId || "",
            otherMaterials: [],
          });
        } catch {
          toast({ title: "Error", description: "Failed to load estimate", variant: "destructive" });
          navigate("/roof-estimator");
        }
      })();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Computed totals ──────────────────────────── */

  const otherMaterialsTotal = useMemo(() =>
    data.otherMaterials.reduce((s, m) => s + ((m.qty || 1) * (m.cost || 0)), 0), [data.otherMaterials]);

  const totalMaterialCost = useMemo(() =>
    (data.shingleQty * data.shinglePricePerSq) +
    (data.underlaymentQty * data.underlaymentCost) +
    (data.iceWaterShieldQty * data.iceWaterShieldCost) +
    (data.ridgeCapQty * data.ridgeCapCost) +
    (data.starterStripQty * data.starterStripCost) +
    (data.flashingQty * data.flashingCostWizard) +
    (data.ventQty * data.ventCostWizard) +
    (data.nailsAccessoriesQty * data.nailsAccessoriesCost) +
    otherMaterialsTotal, [data, otherMaterialsTotal]);

  const totalLaborCost = useMemo(() =>
    data.numberOfLaborers * data.daysRequired * data.laborRatePerWorker, [data]);

  const totalEquipmentCost = useMemo(() =>
    data.dumpsterCost + data.permitCost + data.deliveryFee +
    data.equipmentRentalCost + data.disposalFee, [data]);

  const subtotal = totalMaterialCost + totalLaborCost + totalEquipmentCost;
  const overheadAmount = subtotal * (data.overheadPercent / 100);
  const profitAmount = subtotal * (data.profitMarginPercent / 100);
  const preTotal = subtotal + overheadAmount + profitAmount;
  const taxAmount = preTotal * (data.taxPercent / 100);
  const finalPrice = preTotal + taxAmount;
  const roofSquares = data.roofAreaSqft / 100;
  const pricePerSquare = roofSquares > 0 ? finalPrice / roofSquares : 0;
  const hasValidEagleViewMeasurement =
    data.measurementSource === "eagleview"
    && data.roofAreaSqft > 0
    && Boolean(data.pitch.trim());
  const canGenerateEstimate = hasValidEagleViewMeasurement && !saving && !eagleViewLoading;

  const getSectionValidation = useCallback((sectionId: SectionId): { valid: boolean; message: string } => {
    switch (sectionId) {
      case "client":
        if (data.sourceType === "client" && !data.clientId) {
          return { valid: false, message: "Select a client from the dropdown or switch to manual entry." };
        }
        if (data.sourceType === "lead" && !data.leadId) {
          return { valid: false, message: "Select a lead from the dropdown or switch to manual entry." };
        }
        if (!data.clientName.trim()) {
          return { valid: false, message: "Enter the client or contact name to continue." };
        }
        if (data.clientEmail.trim() && !isValidEmail(data.clientEmail)) {
          return { valid: false, message: "Enter a valid client email address to continue." };
        }
        return { valid: true, message: "" };
      case "address":
        if (!data.address.trim()) {
          return { valid: false, message: "Select the property address first." };
        }
        if (!hasValidEagleViewMeasurement) {
          return {
            valid: false,
            message: eagleViewError || "Load valid EagleView roof area and pitch before continuing.",
          };
        }
        return { valid: true, message: "" };
      case "materials":
        if (!data.shingleType.trim()) {
          return { valid: false, message: "Enter the shingle type to continue." };
        }
        return { valid: true, message: "" };
      case "labor":
        if (data.numberOfLaborers <= 0) {
          return { valid: false, message: "Number of laborers must be greater than 0." };
        }
        if (data.daysRequired <= 0) {
          return { valid: false, message: "Days required must be greater than 0." };
        }
        if (data.laborRatePerWorker <= 0) {
          return { valid: false, message: "Rate per worker / day must be greater than 0." };
        }
        return { valid: true, message: "" };
      case "extras":
        return { valid: true, message: "" };
      case "profit":
        if (data.overheadPercent < 0 || data.overheadPercent > 100) {
          return { valid: false, message: "Overhead must be between 0% and 100%." };
        }
        if (data.profitMarginPercent < 0 || data.profitMarginPercent > 100) {
          return { valid: false, message: "Profit margin must be between 0% and 100%." };
        }
        if (data.taxPercent < 0 || data.taxPercent > 100) {
          return { valid: false, message: "Tax must be between 0% and 100%." };
        }
        return { valid: true, message: "" };
      case "summary":
        if (!hasValidEagleViewMeasurement) {
          return {
            valid: false,
            message: eagleViewError || "Load valid EagleView roof area and pitch before generating the estimate.",
          };
        }
        return { valid: true, message: "" };
      default:
        return { valid: true, message: "" };
    }
  }, [data, eagleViewError, hasValidEagleViewMeasurement]);

  const currentSectionValidation = getSectionValidation(activeSection);

  const moveToSection = useCallback((targetSectionId: SectionId) => {
    const targetIndex = ESTIMATE_SECTIONS.findIndex((section) => section.id === targetSectionId);
    const currentIndex = ESTIMATE_SECTIONS.findIndex((section) => section.id === activeSection);

    if (targetIndex <= currentIndex) {
      setActiveSection(targetSectionId);
      return;
    }

    for (let index = 0; index < targetIndex; index += 1) {
      const section = ESTIMATE_SECTIONS[index];
      const validation = getSectionValidation(section.id);
      if (!validation.valid) {
        setActiveSection(section.id);
        toast({
          title: "Complete This Section First",
          description: validation.message,
          variant: "destructive",
        });
        return;
      }
    }

    setActiveSection(targetSectionId);
  }, [activeSection, getSectionValidation, toast]);

  const handleNextSection = useCallback(() => {
    const currentIndex = ESTIMATE_SECTIONS.findIndex((section) => section.id === activeSection);
    const currentValidation = getSectionValidation(activeSection);

    if (!currentValidation.valid) {
      toast({
        title: "Section Incomplete",
        description: currentValidation.message,
        variant: "destructive",
      });
      return;
    }

    const nextSection = ESTIMATE_SECTIONS[currentIndex + 1];
    if (nextSection) {
      setActiveSection(nextSection.id);
    }
  }, [activeSection, getSectionValidation, toast]);

  const handlePreviousSection = useCallback(() => {
    const currentIndex = ESTIMATE_SECTIONS.findIndex((section) => section.id === activeSection);
    const previousSection = ESTIMATE_SECTIONS[currentIndex - 1];
    if (previousSection) {
      setActiveSection(previousSection.id);
    }
  }, [activeSection]);

  /* ── Address autocomplete ─────────────────────── */

  const handleAddressInput = useCallback(async (val: string) => {
    resetEagleViewMeasurement({
      address: val,
      placeId: "",
      latitude: 0,
      longitude: 0,
    });
    setEagleViewError("");
    if (val.length < 3) { setAddressSuggestions([]); return; }
    setAddressLoading(true);
    try {
      const results = await autocompleteAddress(val);
      setAddressSuggestions(results);
    } catch { /* silent */ }
    finally { setAddressLoading(false); }
  }, [resetEagleViewMeasurement]);

  const selectAddress = useCallback(async (desc: string, placeId: string) => {
    resetEagleViewMeasurement({
      address: desc,
      placeId,
      latitude: 0,
      longitude: 0,
    });
    setAddressSuggestions([]);
    setEagleViewError("");

    // Resolve the selected place into a precise structured address before ordering.
    setSatelliteLoading(true);
    let details: Awaited<ReturnType<typeof getPlaceDetails>> | null = null;
    try {
      details = await getPlaceDetails(placeId);
      setData((prev) => ({
        ...prev,
        address: details?.formattedAddress || desc,
        placeId,
        latitude: details?.lat || 0,
        longitude: details?.lng || 0,
      }));
    } catch {
      resetEagleViewMeasurement({
        address: desc,
        placeId: "",
        latitude: 0,
        longitude: 0,
      });
      setEagleViewError("Could not load the selected property details.");
      toast({ title: "Warning", description: "Could not load the selected property details" });
    } finally { setSatelliteLoading(false); }

    if (!details) return;

    // EagleView measurement order + imagery
    setEagleViewLoading(true);
    setEagleViewStatus("Requesting EagleView measurements…");

    try {
      const report = await requestEagleViewInstant({
        addressLine1: details.addressLine1,
        city: details.city,
        state: details.state,
        postalCode: details.postalCode,
        country: details.country,
        latitude: details.lat,
        longitude: details.lng,
      });

      const roofArea = parseMeasurementNumber(report.area);
      const pitch = normalizePitch(report);
      if (roofArea === null || roofArea <= 0 || !pitch) {
        throw new Error("EagleView lookup failed: Missing roof data");
      }

      const previewSource = splitPreviewSource(report.imageDataUrl || report.imageUrl || "");
      setData((prev) => ({
        ...prev,
        address: details?.formattedAddress || desc,
        placeId,
        latitude: details?.lat || 0,
        longitude: details?.lng || 0,
        roofAreaSqft: roofArea,
        pitch,
        roofType: report.roofType || prev.roofType,
        satelliteImageUrl: previewSource.imageUrl,
        eagleViewReportUrl: "",
        photoUrls: normalizeEstimatePhotos(report.obliqueImages),
        measurementSource: "eagleview",
        aiModel: "eagleview",
      }));
      setEagleViewError("");

      toast({
        title: "📡 EagleView Data Loaded",
        description: `Area: ${report.area} | Pitch: ${pitch}${previewSource.imageUrl ? " | Image: Loaded" : ""}`,
      });
    } catch (err: any) {
      resetEagleViewMeasurement({
        address: details.formattedAddress || desc,
        placeId,
        latitude: details.lat,
        longitude: details.lng,
      });
      const message = err?.message || "Unable to fetch roof data from EagleView.";
      setEagleViewError(message);
      toast({
        title: "EagleView Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setEagleViewLoading(false);
      setEagleViewStatus("");
    }
  }, [resetEagleViewMeasurement, toast]);

  // runAiDetection removed — using EagleView only

  /* ── Create Estimate ──────────────────────────── */

  const buildPayload = useCallback((): SaveEstimatePayload => {
    if (!hasValidEagleViewMeasurement) {
      throw new Error("Valid EagleView roof area and pitch are required before saving this estimate.");
    }

    return {
      address: data.address, latitude: data.latitude, longitude: data.longitude,
      satelliteImageUrl: data.satelliteImageUrl, roofAreaSqft: data.roofAreaSqft,
      confidence: data.confidence, processingTimeSec: data.processingTimeSec,
      aiModel: data.aiModel, pricePerSqft: data.roofAreaSqft > 0 ? finalPrice / data.roofAreaSqft : 0,
      manualAdjustment: 0, totalEstimate: finalPrice,
      snowMode: false, notes: data.notes || undefined,
      clientId: data.sourceType === "client" ? (data.clientId || null) : null,
      leadId: data.sourceType === "lead" ? (data.leadId || null) : null,
      pitch: data.pitch, roofType: data.roofType, stories: data.stories, layers: data.layers,
      measurementSource: data.measurementSource || undefined, tearOffRequired: data.tearOffRequired,
      photoUrls: data.photoUrls.length > 0 ? data.photoUrls : undefined,
      wastePercent: data.wastePercent,
      shingleType: data.shingleType, shinglePricePerSq: data.shinglePricePerSq,
      underlaymentCost: data.underlaymentCost, iceWaterShieldCost: data.iceWaterShieldCost,
      ridgeCapCost: data.ridgeCapCost, starterStripCost: data.starterStripCost,
      flashingCostWizard: data.flashingCostWizard, ventCostWizard: data.ventCostWizard,
      nailsAccessoriesCost: data.nailsAccessoriesCost, totalMaterialCost,
      laborCostPerSquare: data.laborCostPerSquare, numberOfLaborers: data.numberOfLaborers,
      daysRequired: data.daysRequired, laborRatePerWorker: data.laborRatePerWorker, totalLaborCost,
      dumpsterCost: data.dumpsterCost, permitCost: data.permitCost, deliveryFee: data.deliveryFee,
      equipmentRentalCost: data.equipmentRentalCost, disposalFee: data.disposalFee, totalEquipmentCost,
      overheadPercent: data.overheadPercent, profitMarginPercent: data.profitMarginPercent,
      taxPercent: data.taxPercent, overheadAmount, profitAmount, taxAmount,
      finalEstimatePrice: finalPrice, currentStep: 7, status: "draft",
    };
  }, [data, finalPrice, hasValidEagleViewMeasurement, totalMaterialCost, totalLaborCost, totalEquipmentCost, overheadAmount, profitAmount, taxAmount]);

  const handleComplete = useCallback(async () => {
    if (!hasValidEagleViewMeasurement) {
      toast({
        title: "EagleView Data Required",
        description: eagleViewError || "Load valid EagleView roof measurements before generating the estimate.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Check wallet balance first
      try {
        const balanceCheck = await checkBalance(20);
        if (!balanceCheck.sufficient) {
          toast({
            title: "Insufficient Wallet Balance",
            description: `You need $20.00 but only have $${balanceCheck.currentBalance.toFixed(2)}. Please add funds.`,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      } catch {
        // If wallet check fails, proceed anyway (wallet may not be set up)
      }
      const payload = { ...buildPayload(), status: "completed", currentStep: 7 };
      let savedId = estimateId;
      if (estimateId) {
        await updateEstimate(estimateId, payload);
      } else {
        const result = await saveEstimate(payload);
        savedId = result.id;
        setEstimateId(result.id);
      }

      const estimateDocumentNumber = createEstimateDocumentNumber(savedId || "NEW");
      const linkedLeadId = data.sourceType === "lead" && data.leadId ? data.leadId : undefined;
      const linkedClientId = data.sourceType === "client" && data.clientId ? data.clientId : undefined;

      let linkedQuote: QuoteEntity | null = null;
      try {
        const relatedQuoteParams = linkedLeadId
          ? { leadId: linkedLeadId, limit: 100 }
          : linkedClientId
            ? { clientId: linkedClientId, limit: 100 }
            : { limit: 100 };

        const existingQuotes = await getQuotes(relatedQuoteParams);
        linkedQuote = existingQuotes.data.find((quote) => quote.roofEstimateId === savedId) || null;

        let nextQuoteNumber = linkedQuote?.quoteNumber || "";
        if (!nextQuoteNumber) {
          const customQuotes = await getQuotes({
            search: "Quote-",
            sortBy: "quoteNumber",
            sortOrder: "desc",
            limit: 100,
          });
          const maxCustomQuote = customQuotes.data.reduce(
            (currentMax, quote) => Math.max(currentMax, parseCustomQuoteNumber(quote.quoteNumber)),
            0,
          );
          const nextQuoteIndex = Math.max(maxCustomQuote, customQuotes.meta.total) + 1;
          nextQuoteNumber = `Quote-${String(nextQuoteIndex).padStart(2, "0")}`;
        }

        const quotePayload: Record<string, unknown> = {
          clientId: linkedClientId || null,
          leadId: linkedLeadId || null,
          validUntil: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
          currency: "CAD",
          taxRate: 0,
          discountAmount: 0,
          notes: data.notes?.trim() || `Generated from roof estimate ${estimateDocumentNumber}`,
          terms: "See attached AI Estimate Report for EagleView measurements and estimate context.",
          items: [
            {
              description: `Roofing quote for ${data.address}`,
              quantity: 1,
              unitPrice: finalPrice,
              total: finalPrice,
              sortOrder: 0,
            },
          ],
          roofEstimateId: savedId || null,
        };

        linkedQuote = linkedQuote
          ? await updateLinkedQuote(linkedQuote.id, quotePayload)
          : await createQuote({
            quoteNumber: nextQuoteNumber,
            ...quotePayload,
          });
      } catch (quoteError) {
        console.error("Failed to create linked quote for roof estimate", quoteError);
        throw new Error("Could not create the linked quote record.");
      }

      const estimatePdfFileName = "AI Estimate Report.pdf";
      const quotePdfFileName = `${linkedQuote.quoteNumber}.pdf`;

      // Generate PDFs
      toast({ title: "Generating Reports…", description: "Building your estimate documents" });
      const estimatePdfBlob = await generateEstimatePDF({
        // Client / Lead
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        clientCompany: data.clientCompany,
        sourceType: data.sourceType,
        // Property
        address: data.address,
        roofAreaSqft: data.roofAreaSqft,
        pitch: data.pitch,
        roofType: data.roofType,
        stories: data.stories,
        layers: data.layers,
        wastePercent: data.wastePercent,
        measurementSource: data.measurementSource,
        tearOffRequired: data.tearOffRequired,
        confidence: data.confidence,
        satelliteImageUrl: data.satelliteImageUrl,
        photoUrls: data.photoUrls,
        // Materials (qty × unit price)
        shingleType: data.shingleType,
        shingleQty: data.shingleQty,
        shinglePricePerSq: data.shinglePricePerSq,
        underlaymentQty: data.underlaymentQty,
        underlaymentCost: data.underlaymentCost,
        iceWaterShieldQty: data.iceWaterShieldQty,
        iceWaterShieldCost: data.iceWaterShieldCost,
        ridgeCapQty: data.ridgeCapQty,
        ridgeCapCost: data.ridgeCapCost,
        starterStripQty: data.starterStripQty,
        starterStripCost: data.starterStripCost,
        flashingQty: data.flashingQty,
        flashingCostWizard: data.flashingCostWizard,
        ventQty: data.ventQty,
        ventCostWizard: data.ventCostWizard,
        nailsAccessoriesQty: data.nailsAccessoriesQty,
        nailsAccessoriesCost: data.nailsAccessoriesCost,
        totalMaterialCost,
        otherMaterials: data.otherMaterials,
        // Labor
        laborCostPerSquare: data.laborCostPerSquare,
        numberOfLaborers: data.numberOfLaborers,
        daysRequired: data.daysRequired,
        laborRatePerWorker: data.laborRatePerWorker,
        totalLaborCost,
        // Equipment
        dumpsterCost: data.dumpsterCost,
        permitCost: data.permitCost,
        deliveryFee: data.deliveryFee,
        equipmentRentalCost: data.equipmentRentalCost,
        disposalFee: data.disposalFee,
        totalEquipmentCost,
        // Profit / Overhead / Tax
        overheadPercent: data.overheadPercent,
        profitMarginPercent: data.profitMarginPercent,
        taxPercent: data.taxPercent,
        overheadAmount,
        profitAmount,
        taxAmount,
        finalEstimatePrice: finalPrice,
        // Meta
        estimateId: savedId || "NEW",
        createdAt: new Date().toISOString(),
        notes: data.notes || undefined,
        branding: {
          companyName: companyProfile?.companyName || "ZODO CRM",
          companyLogoUrl: companyProfile?.logoUrl || null,
          companyEmail: companyProfile?.email || null,
          companyPhone: companyProfile?.phone || null,
          companyAddress: companyProfile?.address || null,
          companyDomain: companyProfile?.domain || null,
        },
      });

      const summaryPdfResult = await buildEstimateSummaryPdf({
        estimateNumber: linkedQuote.quoteNumber,
        createdAt: new Date().toISOString(),
        branding: {
          companyName: companyProfile?.companyName || "ZODO CRM",
          companyLogoUrl: companyProfile?.logoUrl || null,
          companyPhone: companyProfile?.phone || null,
          companyEmail: companyProfile?.email || null,
          companyAddress: companyProfile?.address || null,
        },
        client: {
          name: data.clientName || "Client",
          company: data.clientCompany || "",
          email: data.clientEmail || "",
          phone: data.clientPhone || "",
        },
        property: {
          address: data.address,
          roofAreaSqft: data.roofAreaSqft,
          roofSquares,
          pitch: data.pitch || "—",
          roofType: data.roofType || "—",
          stories: data.stories,
          layers: data.layers,
          shingleType: data.shingleType,
        },
        pricing: {
          materials: totalMaterialCost,
          labor: totalLaborCost,
          equipment: totalEquipmentCost,
          overheadLabel: `Overhead (${data.overheadPercent}%)`,
          overheadAmount,
          profitLabel: `Profit (${data.profitMarginPercent}%)`,
          profitAmount,
          taxLabel: `Tax (${data.taxPercent}%)`,
          taxAmount,
          total: finalPrice,
          pricePerSquare,
        },
        imagery: {
          orthoUrl: data.satelliteImageUrl,
          obliqueImages: data.photoUrls,
        },
        notes: data.notes || undefined,
      });

      // Download PDFs locally
      downloadPDFBlob(estimatePdfBlob, estimatePdfFileName);
      downloadPDFBlob(summaryPdfResult.blob, quotePdfFileName);

      // Upload PDFs to File Manager and link them to the related records.
      try {
        let projectId: string | undefined;
        if (linkedClientId) {
          try {
            const projects = await getProjects({ clientId: linkedClientId, limit: 1 });
            if (projects.length > 0) {
              projectId = String(projects[0].id);
            }
          } catch {
            // Upload without a project link if the client has no project yet.
          }
        }

        const uploadOptions = {
          projectId,
          clientId: linkedClientId,
          leadId: linkedLeadId,
          quoteId: linkedQuote.id,
        };

        const estimatePdfFile = new File([estimatePdfBlob], estimatePdfFileName, { type: "application/pdf" });
        const summaryPdfFile = new File([summaryPdfResult.blob], quotePdfFileName, { type: "application/pdf" });

        const [uploadedEstimatePdf, uploadedSummaryPdf] = await Promise.all([
          uploadFile(estimatePdfFile, uploadOptions),
          uploadFile(summaryPdfFile, uploadOptions),
        ]);

        const pdfUrl = uploadedEstimatePdf?.path || uploadedEstimatePdf?.id;

        if (pdfUrl && savedId) {
          await updateEstimate(savedId, { pdfUrl } as any);
        }

        toast({
          title: "📁 PDFs Saved",
          description: projectId
            ? `Both PDFs saved to File Manager and linked to the project as ${uploadedSummaryPdf.name}`
            : linkedLeadId
              ? "Both PDFs saved to File Manager and linked to the selected lead"
              : "Both PDFs saved to File Manager and linked to the selected client",
        });
      } catch {
        // The user still receives both downloads even if the upload step fails.
      }

      // Charge wallet $20 for the estimate
      try {
        await chargeEstimate(savedId || "NEW");
        toast({ title: "💳 Wallet Charged", description: "$20.00 deducted for AI estimate generation" });
      } catch {
        // Wallet charge failed silently — estimate is already saved
      }

      toast({ title: "Estimate Completed", description: `AI Estimate Report and ${linkedQuote.quoteNumber} are ready.` });
      navigate("/roof-estimator");
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Could not complete estimate", variant: "destructive" });
    } finally { setSaving(false); }
  }, [buildPayload, companyProfile, eagleViewError, estimateId, data, toast, navigate, totalMaterialCost, totalLaborCost, totalEquipmentCost, overheadAmount, profitAmount, taxAmount, finalPrice, hasValidEagleViewMeasurement, pricePerSquare, roofSquares]);

  const previewImageUrl = !isLikelyPdfUrl(data.satelliteImageUrl) ? data.satelliteImageUrl : "";
  const obliquePreviewImages = normalizeEstimatePhotos(data.photoUrls);
  const activeSectionConfig = ESTIMATE_SECTIONS.find((section) => section.id === activeSection) || ESTIMATE_SECTIONS[0];
  const activeSectionIndex = ESTIMATE_SECTIONS.findIndex((section) => section.id === activeSection);
  const sectionSummaries: Record<SectionId, string> = {
    client: data.clientName || data.clientEmail || "Search or enter contact details",
    address: hasValidEagleViewMeasurement
      ? `${roofSquares.toFixed(1)} squares loaded`
      : data.address || "Enter property address",
    materials: totalMaterialCost > 0 ? fmt(totalMaterialCost) : "Set material pricing",
    labor: totalLaborCost > 0 ? fmt(totalLaborCost) : "Add crew and labor rates",
    extras: totalEquipmentCost > 0 ? fmt(totalEquipmentCost) : "Optional permits and equipment",
    profit: finalPrice > 0 ? fmt(finalPrice) : "Set margins and tax",
    summary: canGenerateEstimate ? "Ready to generate" : "Waiting for roof data",
  };
  const sectionReady: Record<SectionId, boolean> = {
    client: getSectionValidation("client").valid,
    address: getSectionValidation("address").valid,
    materials: getSectionValidation("materials").valid,
    labor: getSectionValidation("labor").valid,
    extras: getSectionValidation("extras").valid,
    profit: getSectionValidation("profit").valid,
    summary: getSectionValidation("summary").valid,
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "client":
        return (
          <Step1ClientInfo
            data={data}
            up={up}
            clients={clients}
            leads={leads}
            clientSearchQ={clientSearchQ}
            setClientSearchQ={setClientSearchQ}
            onSourceTypeChange={handleSourceTypeChange}
            onClearSelection={clearSelectedSource}
            onSelectClient={handleSelectClient}
            onSelectLead={handleSelectLead}
            selectionLoading={selectionLoading}
            isCompact={isCompact}
            hideHeader
          />
        );
      case "address":
        return (
          <Step2Address
            data={data}
            up={up}
            suggestions={addressSuggestions}
            addressLoading={addressLoading}
            onAddressInput={handleAddressInput}
            onSelectAddress={selectAddress}
            satelliteLoading={satelliteLoading}
            eagleViewLoading={eagleViewLoading}
            eagleViewStatus={eagleViewStatus}
            eagleViewError={eagleViewError}
            isCompact={isCompact}
            hideHeader
          />
        );
      case "materials":
        return (
          <Step3Materials
            data={data}
            up={up}
            total={totalMaterialCost}
            otherMaterials={data.otherMaterials}
            onOtherMaterialsChange={(mats) => up("otherMaterials", mats)}
            isCompact={isCompact}
            hideHeader
          />
        );
      case "labor":
        return <Step4Labor data={data} up={up} total={totalLaborCost} isCompact={isCompact} hideHeader />;
      case "extras":
        return <Step5Extras data={data} up={up} total={totalEquipmentCost} isCompact={isCompact} hideHeader />;
      case "profit":
        return (
          <Step6Profit
            data={data}
            up={up}
            subtotal={subtotal}
            overheadAmount={overheadAmount}
            profitAmount={profitAmount}
            taxAmount={taxAmount}
            finalPrice={finalPrice}
            isCompact={isCompact}
            hideHeader
          />
        );
      case "summary":
        return (
          <Step7Final
            data={data}
            totalMaterialCost={totalMaterialCost}
            totalLaborCost={totalLaborCost}
            totalEquipmentCost={totalEquipmentCost}
            overheadAmount={overheadAmount}
            profitAmount={profitAmount}
            taxAmount={taxAmount}
            finalPrice={finalPrice}
            roofSquares={roofSquares}
            pricePerSquare={pricePerSquare}
            walletBalance={walletBalance}
            isCompact={isCompact}
            hideHeader
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      padding: isMobile ? `16px 16px ${MOBILE_PAGE_BOTTOM_PADDING}px` : isTablet ? "20px 20px 40px" : "24px 24px 40px",
      maxWidth: 1440,
      margin: "0 auto",
      fontFamily: "'Inter',sans-serif",
    }}>
      <style>{`
        .roof-estimator-shell {
          display: grid;
          grid-template-columns: minmax(220px, 250px) minmax(0, 1fr) 360px;
          gap: 24px;
          align-items: start;
        }

        .roof-estimator-nav {
          position: sticky;
          top: 24px;
        }

        .roof-estimator-nav-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .roof-estimator-main {
          min-width: 0;
        }

        .roof-estimator-preview {
          position: sticky;
          top: 24px;
        }

        .roof-estimator-action-bar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }

        @media (max-width: 1240px) {
          .roof-estimator-shell {
            grid-template-columns: minmax(220px, 240px) minmax(0, 1fr);
          }

          .roof-estimator-preview {
            grid-column: 1 / -1;
            position: static;
          }
        }

        @media (max-width: 860px) {
          .roof-estimator-shell {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .roof-estimator-nav {
            position: static;
          }

          .roof-estimator-nav-list {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 6px;
            scroll-snap-type: x proximity;
          }

          .roof-estimator-nav-list > button {
            min-width: 168px;
            scroll-snap-align: start;
          }

          .roof-estimator-action-bar {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: stretch;
          }
        }
      `}</style>
      {/* Back to list */}
      <button onClick={() => navigate("/roof-estimator")} style={{
        display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
        color: "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 16,
        padding: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Estimates
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: isMobile ? 0 : 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 999, background: "rgba(15,23,42,.04)",
              border: "1px solid #E2E8F0", color: "#334155", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em",
            }}>
              {estimateId ? "Editing Estimate" : "AI Estimate Workspace"}
            </span>
            {data.measurementSource === "eagleview" && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 999, background: "rgba(16,185,129,.08)",
                border: "1px solid rgba(16,185,129,.15)", color: "#047857", fontSize: 11, fontWeight: 700,
              }}>
                EagleView Connected
              </span>
            )}
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", marginBottom: 6, letterSpacing: "-0.03em" }}>
            {estimateId ? "Edit AI Estimate" : "Create AI Estimate"}
          </h1>
          <p style={{ color: "#64748B", fontSize: 14, maxWidth: 760, lineHeight: 1.6, marginBottom: 14 }}>
            Capture contact details, pull EagleView roof measurements, price the job, and generate the estimate from one cleaner workspace.
          </p>

          <div style={{
            display: "flex",
            flexWrap: isMobile ? "nowrap" : "wrap",
            gap: 10,
            overflowX: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? 4 : 0,
          }}>
            {[
              { label: "Client", value: data.clientName || "Not selected" },
              { label: "Property", value: data.address || "Waiting for address" },
              { label: "Roof Area", value: hasValidEagleViewMeasurement ? `${data.roofAreaSqft.toLocaleString()} sq ft` : "No measurement yet" },
              { label: "Live Total", value: fmt(finalPrice) },
            ].map((chip) => (
              <div key={chip.label} style={{
                padding: "10px 12px", borderRadius: 12, background: "#fff",
                border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(15,23,42,.04)",
                minWidth: isMobile ? 180 : 150,
                flexShrink: 0,
              }}>
                <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
                  {chip.label}
                </div>
                <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 700 }}>{chip.value}</div>
              </div>
            ))}
          </div>
        </div>

        {walletBalance !== null && (
          <div style={{
            minWidth: isMobile ? "100%" : 240, maxWidth: isMobile ? "100%" : 280, background: "#fff", borderRadius: 16,
            border: "1px solid #E2E8F0", boxShadow: "0 8px 28px rgba(15,23,42,.06)",
            padding: "16px 18px",
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
              Wallet Check
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: walletBalance >= 20 ? "#047857" : "#B91C1C", marginBottom: 4 }}>
              ${walletBalance.toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>
              {walletBalance >= 20 ? "Ready to charge $20.00 when you generate this estimate." : "Add funds before generating the final estimate."}
            </div>
          </div>
        )}
      </div>

      {isMobile && (
        <button
          type="button"
          onClick={() => setShowMobilePreview((current) => !current)}
          style={{
            width: "100%",
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #E2E8F0",
            background: "#fff",
            color: "#0F172A",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 6px 18px rgba(15,23,42,.05)",
          }}
        >
          <span>{showMobilePreview ? "Hide live preview" : "Show live preview"}</span>
          <span style={{ color: "#64748B", fontWeight: 600 }}>
            {hasValidEagleViewMeasurement ? `${roofSquares.toFixed(1)} sq` : "No roof data"}
          </span>
        </button>
      )}

      <div className="roof-estimator-shell">
        <aside className="roof-estimator-nav" style={{
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #E2E8F0",
          boxShadow: "0 10px 30px rgba(15,23,42,.05)",
          padding: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>
            Estimator Sections
          </div>
          <div className="roof-estimator-nav-list">
            {ESTIMATE_SECTIONS.map((section) => {
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  onClick={() => moveToSection(section.id)}
                  style={{
                    border: isActive ? "1px solid rgba(102,55,244,.32)" : "1px solid #E2E8F0",
                    background: isActive ? "linear-gradient(135deg, rgba(102,55,244,.10), rgba(102,55,244,.03))" : "#fff",
                    color: isActive ? "#4C1D95" : "#334155",
                    borderRadius: 16,
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    textAlign: "left",
                    boxShadow: isActive ? "0 8px 24px rgba(102,55,244,.10)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 12,
                      background: isActive ? "#6637F4" : "#F8FAFC",
                      color: isActive ? "#fff" : "#64748B",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {section.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: isActive ? "#4C1D95" : "#0F172A" }}>{section.shortLabel}</div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {sectionSummaries[section.id]}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: sectionReady[section.id] ? "#10B981" : isActive ? "#E9D5FF" : "#E2E8F0",
                    color: "#fff", fontSize: 11, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {sectionReady[section.id] ? "✓" : activeSectionIndex >= 0 && ESTIMATE_SECTIONS[activeSectionIndex].id === section.id ? "•" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="roof-estimator-main">
          <div style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid #E2E8F0",
            boxShadow: "0 16px 36px rgba(15,23,42,.05)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "22px 24px 18px",
              borderBottom: "1px solid #E2E8F0",
              background: "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16,
                  background: "linear-gradient(135deg,#6637F4,#4F46E5)",
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                  boxShadow: "0 10px 24px rgba(102,55,244,.22)",
                }}>
                  {activeSectionConfig.icon}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.02em" }}>
                    {activeSectionConfig.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>
                    {activeSectionConfig.description}
                  </div>
                </div>
              </div>
              <div style={{
                padding: "10px 12px", borderRadius: 12,
                background: "#fff", border: "1px solid #E2E8F0",
                minWidth: isMobile ? "100%" : 132,
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
                  Current Focus
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                  Section {activeSectionIndex + 1} of {ESTIMATE_SECTIONS.length}
                </div>
              </div>
            </div>

            <div style={{ padding: isMobile ? "18px 16px" : "24px" }}>
              {renderActiveSection()}
            </div>
          </div>

          <div className="roof-estimator-action-bar" style={{
            marginTop: 18,
            paddingTop: 18,
            borderTop: "1px solid #E2E8F0",
            position: isMobile ? "sticky" : "static",
            bottom: isMobile ? MOBILE_ACTION_BAR_OFFSET : "auto",
            background: isMobile ? "rgba(255,255,255,.96)" : "transparent",
            padding: isMobile ? "14px 12px 14px" : undefined,
            borderRadius: isMobile ? 18 : undefined,
            boxShadow: isMobile ? "0 -10px 28px rgba(15,23,42,.08)" : "none",
            zIndex: isMobile ? 20 : "auto",
          }}>
            {!currentSectionValidation.valid && (
              <div style={{
                marginRight: isMobile ? 0 : "auto",
                gridColumn: isMobile ? "1 / -1" : undefined,
                fontSize: 12,
                color: activeSection === "address" || activeSection === "summary" ? "#DC2626" : "#64748B",
              }}>
                {currentSectionValidation.message}
              </div>
            )}
            {activeSection !== "client" && (
              <button onClick={handlePreviousSection} disabled={saving} style={{
                padding: "10px 18px", borderRadius: 8, border: "1px solid #CBD5E1",
                background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600,
                cursor: "pointer", opacity: saving ? 0.7 : 1,
                width: isMobile ? "100%" : undefined,
              }}>
                Previous
              </button>
            )}
            {activeSection === "summary" ? (
              <>
                <button onClick={handleComplete} disabled={!canGenerateEstimate} style={{
                  padding: "10px 22px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: canGenerateEstimate ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "0 2px 8px rgba(16,185,129,.25)", opacity: canGenerateEstimate ? 1 : 0.55,
                  justifyContent: "center",
                  width: isMobile ? "100%" : undefined,
                  gridColumn: isMobile ? "1 / -1" : undefined,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Generate AI Estimate
                </button>
              </>
            ) : (
              <button onClick={handleNextSection} disabled={saving} style={{
                padding: "10px 22px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#6637F4,#4F46E5)", color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 8px rgba(102,55,244,.25)", opacity: saving ? 0.7 : 1,
                justifyContent: "center",
                width: isMobile ? "100%" : undefined,
                gridColumn: activeSection === "client" && isMobile ? "1 / -1" : undefined,
              }}>
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
          </div>
        </div>

        {(!isMobile || showMobilePreview) && (
        <aside className="roof-estimator-preview" style={{
          background: "#fff", borderRadius: 20,
          border: "1px solid #E2E8F0", boxShadow: "0 16px 36px rgba(15,23,42,.05)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 18px", borderBottom: "1px solid #E2E8F0",
            fontSize: 14, fontWeight: 800, color: "#0F172A",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>📊 Live Estimate Preview</span>
            <span style={{ fontSize: 11, color: hasValidEagleViewMeasurement ? "#047857" : "#94A3B8", fontWeight: 700 }}>
              {hasValidEagleViewMeasurement ? "Roof data ready" : "Awaiting roof data"}
            </span>
          </div>
          <div style={{
            padding: 14, background: "#F8FAFC", display: "grid", gap: 12,
            borderBottom: "1px solid #E2E8F0",
          }}>
            {previewImageUrl || obliquePreviewImages.length > 0 ? (
              <>
                {previewImageUrl && (
                  <PreviewImageCard
                    label="Ortho View"
                    imageUrl={previewImageUrl}
                    minHeight={210}
                  />
                )}
                {obliquePreviewImages.length > 0 && (
                  <div style={{ ...responsiveGrid(isCompact, "1fr 1fr") }}>
                    {obliquePreviewImages.map((photo) => (
                      <PreviewImageCard
                        key={`${photo.label}-${photo.url.slice(0, 24)}`}
                        label={photo.label}
                        imageUrl={photo.url}
                        minHeight={108}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center",
                textAlign: "center", color: "#94A3B8", borderRadius: 16, background: "#F1F5F9", border: "1px dashed #CBD5E1",
              }}>
                <div>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Enter address to load EagleView ortho and directional views</div>
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ ...responsiveGrid(isCompact, "1fr 1fr"), marginBottom: 14 }}>
              <div style={{
                padding: "10px 12px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0",
              }}>
                <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", fontWeight: 800, marginBottom: 4 }}>Client</div>
                <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 700 }}>{data.clientName || "Not selected"}</div>
              </div>
              <div style={{
                padding: "10px 12px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0",
              }}>
                <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", fontWeight: 800, marginBottom: 4 }}>Company</div>
                <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 700 }}>{data.clientCompany || "—"}</div>
              </div>
            </div>
            {data.address && (
              <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, marginBottom: 10 }}>{data.address}</div>
            )}
            <div style={{ ...responsiveGrid(isCompact, "1fr 1fr", "1fr 1fr", 8) }}>
              <MiniStat label="Roof Area" value={`${data.roofAreaSqft.toLocaleString()} sq ft`} />
              <MiniStat label="Squares" value={roofSquares.toFixed(1)} />
              <MiniStat label="Pitch" value={data.pitch || "—"} />
              <MiniStat label="Roof Type" value={data.roofType ? data.roofType.charAt(0).toUpperCase() + data.roofType.slice(1) : "—"} />
            </div>
            {/* Running totals */}
            <div style={{ marginTop: 14, borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              {[
                { label: "Materials", value: totalMaterialCost },
                { label: "Labor", value: totalLaborCost },
                { label: "Equipment", value: totalEquipmentCost },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#64748B" }}>{r.label}</span>
                  <span style={{ color: "#0F172A", fontWeight: 600 }}>{fmt(r.value)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "#E2E8F0", margin: "6px 0" }} />
              {[
                { label: `Overhead (${data.overheadPercent}%)`, value: overheadAmount },
                { label: `Profit (${data.profitMarginPercent}%)`, value: profitAmount },
                { label: `Tax (${data.taxPercent}%)`, value: taxAmount },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: "#94A3B8" }}>{r.label}</span>
                  <span style={{ color: "#475569", fontWeight: 500 }}>{fmt(r.value)}</span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between", fontSize: 16,
                fontWeight: 800, color: "#6637F4", paddingTop: 10, marginTop: 6, borderTop: "2px solid #6637F4",
              }}>
                <span>TOTAL</span>
                <span>{fmt(finalPrice)}</span>
              </div>
            </div>
            {/* Wallet info */}
            <div style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 10,
              background: "rgba(102,55,244,.06)", border: "1px solid rgba(102,55,244,.12)",
              display: "flex", alignItems: "center", gap: 8, fontSize: 12,
            }}>
              <span>💳</span>
              <div>
                <div style={{ color: "#475569", fontWeight: 500 }}>Each estimate costs <strong style={{ color: "#6637F4" }}>$20.00</strong></div>
                {walletBalance !== null && (
                  <div style={{ color: walletBalance >= 20 ? "#059669" : "#DC2626", fontWeight: 600, marginTop: 2 }}>
                    Balance: ${walletBalance.toFixed(2)} {walletBalance >= 20 ? "✔" : "— Insufficient"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
        )}
      </div>
    </div>
  );
}

/* ─── Mini Stat (sidebar) ────────────────────────────────── */

function PreviewImageCard({ label, imageUrl, minHeight }: { label: string; imageUrl: string; minHeight: number }) {
  return (
    <div style={{
      borderRadius: 16,
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      overflow: "hidden",
      boxShadow: "0 6px 18px rgba(15,23,42,.06)",
    }}>
      <div style={{
        padding: "10px 12px",
        borderBottom: "1px solid #E2E8F0",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        color: "#475569",
      }}>
        {label}
      </div>
      <div style={{
        minHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F8FAFC",
        padding: 10,
      }}>
        <img
          src={imageUrl}
          alt={label}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            maxHeight: minHeight - 20,
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "#F8FAFC", borderRadius: 8, padding: "8px 10px",
    }}>
      <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{value}</div>
    </div>
  );
}

/* ─── Step 1: Client / Lead Selection ────────────────────── */

function Step1ClientInfo({
  data,
  up,
  clients,
  leads,
  clientSearchQ,
  setClientSearchQ,
  onSourceTypeChange,
  onClearSelection,
  onSelectClient,
  onSelectLead,
  selectionLoading,
  isCompact = false,
  hideHeader = false,
}: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  clients: ClientEntity[];
  leads: LeadEntity[];
  clientSearchQ: string;
  setClientSearchQ: (q: string) => void;
  onSourceTypeChange: (nextSourceType: WizardData["sourceType"]) => void;
  onClearSelection: () => void;
  onSelectClient: (clientId: string) => void;
  onSelectLead: (leadId: string) => void;
  selectionLoading: boolean;
  isCompact?: boolean;
  hideHeader?: boolean;
}) {
  const q = clientSearchQ.toLowerCase();

  const filteredClients = q
    ? clients.filter((c) => {
        const name = c.clientName || c.ClientName || c.name || "";
        const email = c.primaryEmail || c.contactEmail || "";
        return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
      })
    : clients;

  const filteredLeads = q
    ? leads.filter((l) => {
        const name = String(l.fullName || l.firstName || l.name || "");
        const email = String(l.email || "");
        return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
      })
    : leads;

  const selectedRecordId = data.sourceType === "client"
    ? data.clientId
    : data.sourceType === "lead"
      ? data.leadId
      : "";
  const selectionOptions = data.sourceType === "lead" ? filteredLeads : filteredClients;
  const selectionLabel = data.sourceType === "lead" ? "Lead" : "Client";

  return (
    <div>
      {!hideHeader && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>👤 Client / Lead Information</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Choose whether this estimate is for a client or lead, then auto-fill the form from the selected record.</p>
        </>
      )}

      <Field label="Estimate For">
        <div style={responsiveGrid(isCompact, "repeat(3, minmax(0, 1fr))", "repeat(3, minmax(0, 1fr))", 8)}>
          {[
            { id: "client", label: "Client", icon: "👤" },
            { id: "lead", label: "Lead", icon: "🧲" },
            { id: "manual", label: "Manual", icon: "✍️" },
          ].map((option) => {
            const isActive = data.sourceType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSourceTypeChange(option.id as WizardData["sourceType"])}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: isActive ? "1px solid #0891B2" : "1px solid #CBD5E1",
                  background: isActive ? "rgba(8,145,178,.10)" : "#FFFFFF",
                  color: isActive ? "#0F172A" : "#475569",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all .15s ease",
                  minHeight: 76,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: isActive ? "0 8px 18px rgba(8,145,178,.14)" : "none",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{option.icon}</span>
                <span style={{ lineHeight: 1.1 }}>{option.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {data.sourceType !== "manual" ? (
        <>
          <Field label={`Filter ${selectionLabel}s`}>
            <input
              placeholder={`Type a ${selectionLabel.toLowerCase()} name or email to filter…`}
              value={clientSearchQ}
              onChange={(e) => setClientSearchQ(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field
            label={`Select ${selectionLabel}`}
            hint={selectionOptions.length > 0
              ? `${selectionOptions.length} ${selectionLabel.toLowerCase()}${selectionOptions.length === 1 ? "" : "s"} available`
              : `No ${selectionLabel.toLowerCase()}s match the current filter.`}
          >
            <select
              value={selectedRecordId || "none"}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "none") return;
                if (data.sourceType === "client") {
                  onSelectClient(value);
                  return;
                }
                onSelectLead(value);
              }}
              style={inputStyle}
              disabled={selectionLoading}
            >
              <option value="none">
                {selectionLoading ? `Loading ${selectionLabel.toLowerCase()} details...` : `Select a ${selectionLabel.toLowerCase()}`}
              </option>
              {selectionOptions.map((record) => {
                if (data.sourceType === "lead") {
                  const lead = record as LeadEntity;
                  const optionId = String(lead.id || "");
                  const optionName = String(lead.fullName || lead.firstName || lead.name || "Unnamed Lead");
                  const optionEmail = String(lead.email || "");
                  return (
                    <option key={optionId} value={optionId}>
                      {optionEmail ? `${optionName} - ${optionEmail}` : optionName}
                    </option>
                  );
                }

                const client = record as ClientEntity;
                const optionId = String(client.id || client.Id || "");
                const optionName = client.clientName || client.ClientName || client.name || client.Name || "Unnamed Client";
                const optionEmail = client.primaryEmail || client.contactEmail || client.ContactEmail || client.email || "";
                return (
                  <option key={optionId} value={optionId}>
                    {optionEmail ? `${optionName} - ${optionEmail}` : optionName}
                  </option>
                );
              })}
            </select>
          </Field>
        </>
      ) : (
        <div style={{
          marginBottom: 14,
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px dashed #CBD5E1",
          background: "#F8FAFC",
          fontSize: 12,
          color: "#64748B",
        }}>
          Manual entry is enabled. Type the contact details below if this estimate is not tied to an existing lead or client.
        </div>
      )}

      {data.sourceType !== "manual" && (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: data.sourceType === "client" ? "rgba(102,55,244,.1)" : "rgba(234,88,12,.1)",
            color: data.sourceType === "client" ? "#6637F4" : "#EA580C",
          }}>
            {data.sourceType === "client" ? "✓ Client Selected" : "✓ Lead Selected"}
          </span>
          <button onClick={onClearSelection} style={{
            fontSize: 11, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline",
          }}>Clear</button>
        </div>
      )}

      <div style={responsiveGrid(isCompact, "1fr 1fr")}>
        <Field label="Client / Contact Name">
          <input value={data.clientName} onChange={(e) => up("clientName", e.target.value)} style={inputStyle} placeholder="Full name" />
        </Field>
        <Field label="Company">
          <input value={data.clientCompany} onChange={(e) => up("clientCompany", e.target.value)} style={inputStyle} placeholder="Company name" />
        </Field>
        <Field label="Email">
          <input value={data.clientEmail} onChange={(e) => up("clientEmail", e.target.value)} style={inputStyle} placeholder="email@example.com" type="email" />
        </Field>
        <Field label="Phone">
          <input value={data.clientPhone} onChange={(e) => up("clientPhone", e.target.value)} style={inputStyle} placeholder="(555) 000-0000" type="tel" />
        </Field>
      </div>
    </div>
  );
}

/* ─── Step 2: Address & Roof Measurement ─────────────────── */

function Step2Address({ data, up, suggestions, addressLoading, onAddressInput, onSelectAddress, satelliteLoading, eagleViewLoading, eagleViewStatus, eagleViewError, isCompact = false, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  suggestions: { description: string; placeId: string }[];
  addressLoading: boolean;
  onAddressInput: (val: string) => void;
  onSelectAddress: (desc: string, placeId: string) => void;
  satelliteLoading: boolean;
  eagleViewLoading: boolean;
  eagleViewStatus: string;
  eagleViewError: string;
  isCompact?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <div>
      {!hideHeader && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>📍 Address & Roof Measurement</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Enter the property address — EagleView will provide roof measurements.</p>
        </>
      )}

      {/* Address input with autocomplete */}
      <Field label="Property Address">
        <div style={{ position: "relative" }}>
          <input
            placeholder="Start typing an address…"
            value={data.address}
            onChange={(e) => onAddressInput(e.target.value)}
            style={inputStyle}
            id="wizard-address-input"
          />
          {addressLoading && <span style={{ position: "absolute", right: 12, top: 11, fontSize: 11, color: "#94A3B8" }}>Searching…</span>}
          {suggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 220, overflow: "auto",
            }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => onSelectAddress(s.description, s.placeId)} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                  border: "none", background: "transparent", fontSize: 13, color: "#0F172A",
                  cursor: "pointer", borderBottom: "1px solid #F1F5F9",
                }} onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                   onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  {s.description}
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>

      {/* Status indicators */}
      {(satelliteLoading || eagleViewLoading) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          background: "rgba(102,55,244,.06)", borderRadius: 10, marginBottom: 16,
          border: "1px solid rgba(102,55,244,.15)",
        }}>
          <div style={{ width: 16, height: 16, border: "2px solid #CBD5E1", borderTopColor: "#6637F4", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: 13, color: "#6637F4", fontWeight: 500 }}>
            {satelliteLoading ? "Loading satellite image…" : eagleViewStatus || "Loading EagleView data…"}
          </div>
        </div>
      )}

      {eagleViewError && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(220,38,38,.06)",
          borderRadius: 10,
          marginBottom: 16,
          border: "1px solid rgba(220,38,38,.18)",
          fontSize: 13,
          color: "#B91C1C",
          fontWeight: 500,
        }}>
          {eagleViewError}
        </div>
      )}

      {/* Measurement source badge */}
      {data.measurementSource && (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: data.measurementSource === "eagleview" ? "rgba(59,130,246,.12)" : "rgba(16,185,129,.12)",
            color: data.measurementSource === "eagleview" ? "#1D4ED8" : "#047857",
          }}>
            {data.measurementSource === "eagleview" ? "📡 EagleView Measurement" : "🤖 AI Satellite Detection"}
          </span>
        </div>
      )}

      {/* Measurement fields */}
      <div style={responsiveGrid(isCompact, "1fr 1fr")}>
        <Field label="Roof Area (sq ft)">
          <NumberInput value={data.roofAreaSqft} onChange={(v) => up("roofAreaSqft", v)} suffix="sq ft" />
        </Field>
        <Field label="Pitch">
          <select value={data.pitch} onChange={(e) => up("pitch", e.target.value)} style={inputStyle}>
            <option value="">Select pitch</option>
            {["3/12","4/12","5/12","6/12","7/12","8/12","9/12","10/12","11/12","12/12"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Roof Type">
          <select value={data.roofType} onChange={(e) => up("roofType", e.target.value)} style={inputStyle}>
            {["gable","hip","flat","mansard","gambrel","shed"].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </Field>
        <Field label="Stories">
          <NumberInput value={data.stories} onChange={(v) => up("stories", v)} min={1} max={5} />
        </Field>
        <Field label="Layers">
          <NumberInput value={data.layers} onChange={(v) => up("layers", v)} min={1} max={5} />
        </Field>
        <Field label="Waste %">
          <NumberInput value={data.wastePercent} onChange={(v) => up("wastePercent", v)} suffix="%" />
        </Field>
      </div>

      <Field label="Tear-off Required?">
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
          <input type="checkbox" checked={data.tearOffRequired} onChange={(e) => up("tearOffRequired", e.target.checked)} />
          Yes, existing roof needs to be removed
        </label>
      </Field>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Step 2: Material Pricing ───────────────────────────── */

function Step3Materials({ data, up, total, otherMaterials, onOtherMaterialsChange, isCompact = false, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  total: number;
  otherMaterials: OtherMaterial[];
  onOtherMaterialsChange: (mats: OtherMaterial[]) => void;
  isCompact?: boolean;
  hideHeader?: boolean;
}) {
  const addMaterial = () => onOtherMaterialsChange([...otherMaterials, { name: "", qty: 1, cost: 0 }]);
  const removeMaterial = (idx: number) => onOtherMaterialsChange(otherMaterials.filter((_, i) => i !== idx));
  const updateMaterial = (idx: number, field: keyof OtherMaterial, val: string | number) => {
    const copy = [...otherMaterials];
    (copy[idx] as any)[field] = val;
    onOtherMaterialsChange(copy);
  };

  const materials: { label: string; qtyKey: keyof WizardData; priceKey: keyof WizardData }[] = [
    { label: "Shingles (per sq)", qtyKey: "shingleQty", priceKey: "shinglePricePerSq" },
    { label: "Underlayment", qtyKey: "underlaymentQty", priceKey: "underlaymentCost" },
    { label: "Ice & Water Shield", qtyKey: "iceWaterShieldQty", priceKey: "iceWaterShieldCost" },
    { label: "Ridge Cap", qtyKey: "ridgeCapQty", priceKey: "ridgeCapCost" },
    { label: "Starter Strip", qtyKey: "starterStripQty", priceKey: "starterStripCost" },
    { label: "Flashing", qtyKey: "flashingQty", priceKey: "flashingCostWizard" },
    { label: "Vents", qtyKey: "ventQty", priceKey: "ventCostWizard" },
    { label: "Nails & Accessories", qtyKey: "nailsAccessoriesQty", priceKey: "nailsAccessoriesCost" },
  ];

  const fmtLine = (q: number, p: number) => {
    const t = q * p;
    return `$${t.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div>
      {!hideHeader && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>🧱 Material Pricing</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Enter quantity and unit price for each material. Line totals auto-calculate.</p>
        </>
      )}

      <Field label="Shingle Type">
        <input value={data.shingleType} onChange={(e) => up("shingleType", e.target.value)} style={inputStyle} placeholder="e.g. Architectural Shingles" />
      </Field>

      {isCompact ? (
        <div style={{ display: "grid", gap: 10 }}>
          {materials.map((mat) => (
            <div
              key={mat.label}
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 12,
                background: "#F8FAFC",
              }}
            >
              <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 700, marginBottom: 10 }}>{mat.label}</div>
              <div style={responsiveGrid(true, "1fr 80px 120px", "1fr 1fr", 10)}>
                <Field label="Qty">
                  <NumberInput value={data[mat.qtyKey] as number} onChange={(v) => up(mat.qtyKey, v as any)} />
                </Field>
                <Field label="Unit Price">
                  <NumberInput value={data[mat.priceKey] as number} onChange={(v) => up(mat.priceKey, v as any)} prefix="$" />
                </Field>
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                Line total: <strong style={{ color: "#0F172A" }}>{fmtLine(data[mat.qtyKey] as number, data[mat.priceKey] as number)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 100px", gap: 8, marginBottom: 6, padding: "0 2px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Material</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Qty</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Unit Price</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", textAlign: "right" }}>Line Total</span>
          </div>

          {materials.map((mat) => (
            <div key={mat.label} style={{
              display: "grid", gridTemplateColumns: "1fr 80px 120px 100px", gap: 8,
              alignItems: "center", padding: "6px 2px",
              borderBottom: "1px solid #F1F5F9",
            }}>
              <span style={{ fontSize: 13, color: "#0F172A", fontWeight: 500 }}>{mat.label}</span>
              <NumberInput value={data[mat.qtyKey] as number} onChange={(v) => up(mat.qtyKey, v as any)} />
              <NumberInput value={data[mat.priceKey] as number} onChange={(v) => up(mat.priceKey, v as any)} prefix="$" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", textAlign: "right" }}>
                {fmtLine(data[mat.qtyKey] as number, data[mat.priceKey] as number)}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Other Materials — dynamic rows */}
      <div style={{ marginTop: 20, borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Other Materials</span>
          <button onClick={addMaterial} style={{
            padding: "6px 14px", borderRadius: 6, border: "1px solid #6637F4",
            background: "rgba(102,55,244,.06)", color: "#6637F4", fontSize: 12,
            fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Material
          </button>
        </div>
        {otherMaterials.length === 0 && (
          <div style={{ fontSize: 12, color: "#94A3B8", padding: "10px 0" }}>No additional materials added yet.</div>
        )}
        {!isCompact && otherMaterials.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 100px 36px", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Name</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Qty</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Unit Price</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", textAlign: "right" }}>Total</span>
            <span />
          </div>
        )}
        {otherMaterials.map((m, idx) => (
          isCompact ? (
            <div key={idx} style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 12, background: "#FFFFFF", marginBottom: 8 }}>
              <Field label="Name">
                <input value={m.name} onChange={(e) => updateMaterial(idx, "name", e.target.value)}
                  placeholder="e.g. Drip Edge" style={inputStyle} />
              </Field>
              <div style={responsiveGrid(true, "1fr 80px 120px", "1fr 1fr", 10)}>
                <Field label="Qty">
                  <NumberInput value={m.qty} onChange={(v) => updateMaterial(idx, "qty", v)} />
                </Field>
                <Field label="Unit Price">
                  <NumberInput value={m.cost} onChange={(v) => updateMaterial(idx, "cost", v)} prefix="$" />
                </Field>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#64748B" }}>Total: <strong style={{ color: "#0F172A" }}>{fmtLine(m.qty || 1, m.cost || 0)}</strong></span>
                <button onClick={() => removeMaterial(idx)} title="Remove" style={{
                  padding: "8px 10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 8, border: "1px solid #FEE2E2", background: "#FFF5F5",
                  color: "#EF4444", cursor: "pointer", flexShrink: 0,
                }}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 100px 36px", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input value={m.name} onChange={(e) => updateMaterial(idx, "name", e.target.value)}
                placeholder="e.g. Drip Edge" style={inputStyle} />
              <NumberInput value={m.qty} onChange={(v) => updateMaterial(idx, "qty", v)} />
              <NumberInput value={m.cost} onChange={(v) => updateMaterial(idx, "cost", v)} prefix="$" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", textAlign: "right" }}>
                {fmtLine(m.qty || 1, m.cost || 0)}
              </span>
              <button onClick={() => removeMaterial(idx)} title="Remove" style={{
                width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 6, border: "1px solid #FEE2E2", background: "#FFF5F5",
                color: "#EF4444", cursor: "pointer", flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          )
        ))}
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 18px", background: "rgba(102,55,244,.06)", borderRadius: 10,
        marginTop: 12,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Total Material Cost</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#6637F4" }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

/* ─── Step 3: Labor Inputs ───────────────────────────────── */

function Step4Labor({ data, up, total, isCompact = false, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  total: number;
  isCompact?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <div>
      {!hideHeader && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>👷 Labor Inputs</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Enter labor details. Total = Workers × Days × Rate.</p>
        </>
      )}

      <div style={responsiveGrid(isCompact, "1fr 1fr")}>
        <Field label="Cost Per Square (optional)"><NumberInput value={data.laborCostPerSquare} onChange={(v) => up("laborCostPerSquare", v)} prefix="$" /></Field>
        <Field label="Number of Laborers"><NumberInput value={data.numberOfLaborers} onChange={(v) => up("numberOfLaborers", v)} /></Field>
        <Field label="Days Required"><NumberInput value={data.daysRequired} onChange={(v) => up("daysRequired", v)} /></Field>
        <Field label="Rate per Worker / Day"><NumberInput value={data.laborRatePerWorker} onChange={(v) => up("laborRatePerWorker", v)} prefix="$" /></Field>
      </div>

      <div style={{ fontSize: 13, color: "#64748B", padding: "12px 0", borderBottom: "1px solid #E2E8F0" }}>
        <strong>{data.numberOfLaborers}</strong> workers × <strong>{data.daysRequired}</strong> days × <strong>${data.laborRatePerWorker.toLocaleString()}</strong>/day
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 18px", background: "rgba(102,55,244,.06)", borderRadius: 10,
        marginTop: 12,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Total Labor Cost</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#6637F4" }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

/* ─── Step 4: Equipment & Extras ─────────────────────────── */

function Step5Extras({ data, up, total, isCompact = false, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  total: number;
  isCompact?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <div>
      {!hideHeader && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>🔧 Equipment & Extra Costs</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Add any additional costs for equipment, permits, and disposal.</p>
        </>
      )}

      <div style={responsiveGrid(isCompact, "1fr 1fr")}>
        <Field label="Dumpster"><NumberInput value={data.dumpsterCost} onChange={(v) => up("dumpsterCost", v)} prefix="$" /></Field>
        <Field label="Permit"><NumberInput value={data.permitCost} onChange={(v) => up("permitCost", v)} prefix="$" /></Field>
        <Field label="Delivery Fee"><NumberInput value={data.deliveryFee} onChange={(v) => up("deliveryFee", v)} prefix="$" /></Field>
        <Field label="Equipment Rental"><NumberInput value={data.equipmentRentalCost} onChange={(v) => up("equipmentRentalCost", v)} prefix="$" /></Field>
        <Field label="Disposal Fee"><NumberInput value={data.disposalFee} onChange={(v) => up("disposalFee", v)} prefix="$" /></Field>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 18px", background: "rgba(102,55,244,.06)", borderRadius: 10,
        marginTop: 8,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Total Equipment & Extras</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#6637F4" }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

/* ─── Step 5: Profit & Overhead ──────────────────────────── */

function Step6Profit({ data, up, subtotal, overheadAmount, profitAmount, taxAmount, finalPrice, isCompact = false, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  subtotal: number; overheadAmount: number; profitAmount: number; taxAmount: number; finalPrice: number;
  isCompact?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <div>
      {!hideHeader && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>💰 Profit & Overhead</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Set your overhead, profit margin, and tax percentages.</p>
        </>
      )}

      <div style={responsiveGrid(isCompact, "1fr 1fr 1fr")}>
        <Field label="Overhead %"><NumberInput value={data.overheadPercent} onChange={(v) => up("overheadPercent", v)} suffix="%" /></Field>
        <Field label="Profit Margin %"><NumberInput value={data.profitMarginPercent} onChange={(v) => up("profitMarginPercent", v)} suffix="%" /></Field>
        <Field label="Tax %"><NumberInput value={data.taxPercent} onChange={(v) => up("taxPercent", v)} suffix="%" /></Field>
      </div>

      {/* Breakdown */}
      <div style={{
        background: "#F8FAFC", borderRadius: 12, padding: "18px 20px", marginTop: 16,
        border: "1px solid #E2E8F0",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Cost Breakdown</div>
        {[
          { label: "Subtotal (Materials + Labor + Extras)", value: subtotal },
          { label: `Overhead (${data.overheadPercent}%)`, value: overheadAmount },
          { label: `Profit Margin (${data.profitMarginPercent}%)`, value: profitAmount },
          { label: `Tax (${data.taxPercent}%)`, value: taxAmount },
        ].map((r) => (
          <div key={r.label} style={{
            display: "flex", justifyContent: "space-between", padding: "6px 0",
            fontSize: 13, borderBottom: "1px solid #E2E8F0",
          }}>
            <span style={{ color: "#64748B" }}>{r.label}</span>
            <span style={{ color: "#0F172A", fontWeight: 600 }}>{fmt(r.value)}</span>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between", paddingTop: 12,
          fontSize: 18, fontWeight: 800, color: "#6637F4",
        }}>
          <span>Final Estimate</span>
          <span>{fmt(finalPrice)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 6: Final Summary ──────────────────────────────── */

function Step7Final({ data, totalMaterialCost, totalLaborCost, totalEquipmentCost,
  overheadAmount, profitAmount, taxAmount, finalPrice, roofSquares, pricePerSquare, walletBalance, isCompact = false, hideHeader = false }: {
  data: WizardData;
  totalMaterialCost: number; totalLaborCost: number; totalEquipmentCost: number;
  overheadAmount: number; profitAmount: number; taxAmount: number;
  finalPrice: number; roofSquares: number; pricePerSquare: number;
  walletBalance: number | null;
  isCompact?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <div>
      {!hideHeader && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>📋 Estimate Summary</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Review your complete estimate before finalizing.</p>
        </>
      )}

      {/* Client Info */}
      <div style={{
        background: "#F8FAFC", borderRadius: 12, padding: "16px 20px", marginBottom: 16,
        border: "1px solid #E2E8F0",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>👤 Client Information</div>
        <div style={{ ...responsiveGrid(isCompact, "1fr 1fr"), fontSize: 12 }}>
          <div><span style={{ color: "#94A3B8" }}>Name</span><div style={{ color: "#0F172A", fontWeight: 500 }}>{data.clientName || "—"}</div></div>
          <div><span style={{ color: "#94A3B8" }}>Email</span><div style={{ color: "#0F172A", fontWeight: 500 }}>{data.clientEmail || "—"}</div></div>
          <div><span style={{ color: "#94A3B8" }}>Phone</span><div style={{ color: "#0F172A", fontWeight: 500 }}>{data.clientPhone || "—"}</div></div>
          <div><span style={{ color: "#94A3B8" }}>Company</span><div style={{ color: "#0F172A", fontWeight: 500 }}>{data.clientCompany || "—"}</div></div>
        </div>
      </div>

      {/* Property Info */}
      <div style={{
        background: "#F8FAFC", borderRadius: 12, padding: "16px 20px", marginBottom: 16,
        border: "1px solid #E2E8F0",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>🏠 Property Details</div>
        <div style={{ ...responsiveGrid(isCompact, "1fr 1fr 1fr"), fontSize: 12 }}>
          <div><span style={{ color: "#94A3B8" }}>Address</span><div style={{ color: "#0F172A", fontWeight: 500 }}>{data.address || "—"}</div></div>
          <div><span style={{ color: "#94A3B8" }}>Roof Area</span><div style={{ color: "#0F172A", fontWeight: 500 }}>{data.roofAreaSqft.toLocaleString()} sq ft</div></div>
          <div><span style={{ color: "#94A3B8" }}>Roof Squares</span><div style={{ color: "#0F172A", fontWeight: 500 }}>{roofSquares.toFixed(1)}</div></div>
          <div><span style={{ color: "#94A3B8" }}>Pitch</span><div style={{ color: "#0F172A", fontWeight: 500 }}>{data.pitch}</div></div>
          <div><span style={{ color: "#94A3B8" }}>Type</span><div style={{ color: "#0F172A", fontWeight: 500, textTransform: "capitalize" }}>{data.roofType}</div></div>
          <div><span style={{ color: "#94A3B8" }}>Shingle</span><div style={{ color: "#0F172A", fontWeight: 500 }}>{data.shingleType || "—"}</div></div>
        </div>
      </div>

      {/* Full Breakdown */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "20px 22px",
        border: "1px solid #E2E8F0",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>Complete Cost Breakdown</div>
        {[
          { label: "Materials", value: totalMaterialCost, color: "#3B82F6" },
          { label: "Labor", value: totalLaborCost, color: "#8B5CF6" },
          { label: "Equipment & Extras", value: totalEquipmentCost, color: "#F59E0B" },
        ].map((r) => (
          <div key={r.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 0", borderBottom: "1px solid #F1F5F9",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color }} />
              <span style={{ fontSize: 13, color: "#475569" }}>{r.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{fmt(r.value)}</span>
          </div>
        ))}

        <div style={{ height: 1, background: "#E2E8F0", margin: "8px 0" }} />

        {[
          { label: `Overhead (${data.overheadPercent}%)`, value: overheadAmount },
          { label: `Profit (${data.profitMarginPercent}%)`, value: profitAmount },
          { label: `Tax (${data.taxPercent}%)`, value: taxAmount },
        ].map((r) => (
          <div key={r.label} style={{
            display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13,
          }}>
            <span style={{ color: "#64748B" }}>{r.label}</span>
            <span style={{ color: "#0F172A", fontWeight: 600 }}>{fmt(r.value)}</span>
          </div>
        ))}

        {/* Final price */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 12, paddingTop: 16, borderTop: "2px solid #6637F4",
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#6637F4" }}>{fmt(finalPrice)}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>Price per square: {fmt(pricePerSquare)}</div>
          </div>
          <div style={{
            background: "rgba(102,55,244,.08)", borderRadius: 10, padding: "10px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#6637F4" }}>{roofSquares.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Roof Squares</div>
          </div>
        </div>
      </div>

      {/* Wallet charge info */}
      <div style={{
        marginTop: 16, padding: "14px 18px", borderRadius: 12,
        background: "linear-gradient(135deg, rgba(102,55,244,.06), rgba(102,55,244,.02))",
        border: "1px solid rgba(102,55,244,.15)",
        display: "flex", alignItems: isCompact ? "stretch" : "center", justifyContent: "space-between",
        flexDirection: isCompact ? "column" : "row",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg,#6637F4,#5429D9)", color: "#fff", fontSize: 16,
          }}>💳</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Generate AI Estimate — $20.00</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>This amount will be deducted from your wallet</div>
          </div>
        </div>
        {walletBalance !== null && (
          <div style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: walletBalance >= 20 ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)",
            color: walletBalance >= 20 ? "#059669" : "#DC2626",
          }}>
            Balance: ${walletBalance.toFixed(2)} {walletBalance >= 20 ? "✔" : "✖"}
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ marginTop: 16 }}>
        <Field label="Notes">
          <textarea
            value={data.notes}
            readOnly
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            placeholder="No notes"
          />
        </Field>
      </div>
    </div>
  );
}
