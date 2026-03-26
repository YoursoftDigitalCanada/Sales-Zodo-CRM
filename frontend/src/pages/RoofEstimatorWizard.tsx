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
} from "@/features/roof-estimator/services/roof-estimator-service";
import { useToast } from "@/hooks/use-toast";
import { generateEstimatePDF, downloadPDFBlob } from "@/features/roof-estimator/utils/generate-estimate-pdf";
import { getClients, type ClientEntity } from "@/features/clients/services/clients-service";
import { getLeads, type LeadEntity } from "@/features/leads/services/leads-service";
import {
  getWallet,
  chargeEstimate,
  checkBalance,
} from "@/features/wallet/services/wallet-service";
import { uploadFile } from "@/features/files/services/files-service";
import { getProjects } from "@/features/projects/services/projects-service";

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

const splitPreviewSource = (url?: string | null) => {
  if (!url || isLikelyPdfUrl(url)) return { imageUrl: "", reportUrl: "" };
  return { imageUrl: url, reportUrl: "" };
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
  address: "", placeId: "", latitude: 0, longitude: 0, satelliteImageUrl: "", eagleViewReportUrl: "",
  roofAreaSqft: 0, confidence: 0, processingTimeSec: 0, aiModel: "yolov8n-seg-cpu",
  pitch: "6/12", roofType: "gable", stories: 1, layers: 1, wastePercent: 10,
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

/* ─── Styled Input ───────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: "1px solid #CBD5E1", fontSize: 13, outline: "none",
  background: "#fff", color: "#0F172A", transition: "border-color .15s",
};

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

  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [estimateId, setEstimateId] = useState<string | null>(id || null);
  const [activeSection, setActiveSection] = useState<SectionId>("client");

  // Step 1: Client/Lead
  const [clients, setClients] = useState<ClientEntity[]>([]);
  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [clientSearchQ, setClientSearchQ] = useState("");

  // Step 2 specific
  const [addressSuggestions, setAddressSuggestions] = useState<{ description: string; placeId: string }[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  // const [detecting, setDetecting] = useState(false); // AI detection disabled
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [eagleViewLoading, setEagleViewLoading] = useState(false);
  const [eagleViewStatus, setEagleViewStatus] = useState<string>("");

  // Wallet balance
  const [walletBalance, setWalletBalance] = useState<number | null>(null);;

  // Update helper
  const up = useCallback(<K extends keyof WizardData>(key: K, val: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: val }));
  }, []);

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
    })();
  }, []);

  // Load existing estimate when editing
  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const est = await getEstimateById(id);
          const previewSource = splitPreviewSource(est.satelliteImageUrl || "");
          setEstimateId(est.id);
          setData({
            clientName: est.client?.clientName || "", clientEmail: "", clientPhone: "",
            clientCompany: est.client?.companyName || "", sourceType: est.clientId ? "client" : "manual",
            leadId: "", address: est.address || "", placeId: "", latitude: est.latitude || 0,
            longitude: est.longitude || 0, satelliteImageUrl: previewSource.imageUrl,
            eagleViewReportUrl: previewSource.reportUrl,
            roofAreaSqft: est.roofAreaSqft || 0, confidence: est.confidence || 0,
            processingTimeSec: est.processingTimeSec || 0, aiModel: est.aiModel || "yolov8n-seg-cpu",
            pitch: est.pitch || "6/12", roofType: est.roofType || "gable",
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

  /* ── Address autocomplete ─────────────────────── */

  const handleAddressInput = useCallback(async (val: string) => {
    up("address", val);
    if (val.length < 3) { setAddressSuggestions([]); return; }
    setAddressLoading(true);
    try {
      const results = await autocompleteAddress(val);
      setAddressSuggestions(results);
    } catch { /* silent */ }
    finally { setAddressLoading(false); }
  }, [up]);

  const selectAddress = useCallback(async (desc: string, placeId: string) => {
    up("address", desc);
    up("placeId", placeId);
    setAddressSuggestions([]);
    up("satelliteImageUrl", "");
    up("eagleViewReportUrl", "");

    // Resolve the selected place into a precise structured address before ordering.
    setSatelliteLoading(true);
    let details: Awaited<ReturnType<typeof getPlaceDetails>> | null = null;
    try {
      details = await getPlaceDetails(placeId);
      up("address", details.formattedAddress || desc);
      up("latitude", details.lat);
      up("longitude", details.lng);
    } catch {
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

        if (report.status === "Completed" || report.area) {
          const roofArea = parseMeasurementNumber(report.area);
          const pitch = normalizePitch(report);
          const previewSource = splitPreviewSource(report.imageDataUrl || report.imageUrl || "");

          if (roofArea !== null && roofArea > 0) {
            up("roofAreaSqft", roofArea);
          }
          if (pitch) {
            up("pitch", pitch);
          }
          up("satelliteImageUrl", previewSource.imageUrl);
          up("eagleViewReportUrl", "");

          up("measurementSource", "eagleview");
          up("confidence", 100);
          up("aiModel", "eagleview");

          toast({
            title: "📡 EagleView Data Loaded",
            description: `Area: ${report.area || "N/A"} | Pitch: ${pitch || "N/A"} | Image: ${previewSource.imageUrl ? "Loaded" : "Unavailable"}`,
          });
      } else {
        toast({ title: "EagleView", description: `Status: ${report.status} — data may still be processing` });
      }
    } catch (err: any) {
      toast({
        title: "EagleView Error",
        description: err?.response?.data?.message || err?.message || "Could not fetch measurement data",
        variant: "destructive",
      });
    } finally {
      setEagleViewLoading(false);
      setEagleViewStatus("");
    }
  }, [up, toast]);

  // runAiDetection removed — using EagleView only

  /* ── Save Draft / Create ──────────────────────── */

  const buildPayload = useCallback((): SaveEstimatePayload => ({
    address: data.address, latitude: data.latitude, longitude: data.longitude,
    satelliteImageUrl: data.satelliteImageUrl, roofAreaSqft: data.roofAreaSqft || 1,
    confidence: data.confidence, processingTimeSec: data.processingTimeSec,
    aiModel: data.aiModel, pricePerSqft: data.roofAreaSqft > 0 ? finalPrice / data.roofAreaSqft : 0,
    manualAdjustment: 0, totalEstimate: finalPrice,
    snowMode: false, notes: data.notes || undefined,
    clientId: data.clientId || undefined,
    pitch: data.pitch, roofType: data.roofType, stories: data.stories, layers: data.layers,
    measurementSource: data.measurementSource || undefined, tearOffRequired: data.tearOffRequired,
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
  }), [data, finalPrice, totalMaterialCost, totalLaborCost, totalEquipmentCost, overheadAmount, profitAmount, taxAmount]);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (estimateId) {
        await updateEstimate(estimateId, payload);
      } else {
        const result = await saveEstimate(payload);
        setEstimateId(result.id);
      }
      toast({ title: "Draft Saved", description: "Your estimate has been saved as a draft" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Could not save estimate", variant: "destructive" });
    } finally { setSaving(false); }
  }, [buildPayload, estimateId, toast]);

  const handleComplete = useCallback(async () => {
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

      // Generate PDF
      toast({ title: "Generating Report…", description: "Building your estimate PDF" });
      const pdfBlob = await generateEstimatePDF({
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
      });

      // Download PDF locally
      const safeName = data.address.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
      downloadPDFBlob(pdfBlob, `Roof_Estimate_${safeName}.pdf`);

      // Upload PDF to File Manager (with projectId + clientId)
      try {
        const safeName = data.address.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
        const pdfFileName = `Roof_Estimate_${safeName}.pdf`;
        const pdfFile = new File([pdfBlob], pdfFileName, { type: "application/pdf" });

        // Find the client's project (if a client was selected)
        let projectId: string | undefined;
        if (data.clientId) {
          try {
            const projects = await getProjects({ clientId: data.clientId, limit: 1 });
            if (projects.length > 0) {
              projectId = String(projects[0].id);
            }
          } catch {
            // No project found — upload without projectId
          }
        }

        // Upload via proper /files endpoint with clientId and projectId
        const uploadedFile = await uploadFile(pdfFile, { projectId });
        const pdfUrl = uploadedFile?.path || uploadedFile?.id;

        if (pdfUrl && savedId) {
          await updateEstimate(savedId, { pdfUrl } as any);
        }

        toast({ title: "📁 PDF Saved", description: projectId
          ? "Estimate PDF saved to File Manager and linked to client project"
          : "Estimate PDF saved to File Manager" });
      } catch {
        // PDF upload failed silently — user already has the download
      }

      // Charge wallet $20 for the estimate
      try {
        await chargeEstimate(savedId || "NEW");
        toast({ title: "💳 Wallet Charged", description: "$20.00 deducted for AI estimate generation" });
      } catch {
        // Wallet charge failed silently — estimate is already saved
      }

      toast({ title: "Estimate Completed", description: "Report generated and downloaded" });
      navigate("/roof-estimator");
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Could not complete estimate", variant: "destructive" });
    } finally { setSaving(false); }
  }, [buildPayload, estimateId, data, toast, navigate, totalMaterialCost, totalLaborCost, totalEquipmentCost, overheadAmount, profitAmount, taxAmount, finalPrice]);

  const previewImageUrl = !isLikelyPdfUrl(data.satelliteImageUrl) ? data.satelliteImageUrl : "";
  const sectionStyle: React.CSSProperties = {
    border: "1px solid #E2E8F0",
    borderRadius: 14,
    background: "#fff",
    overflow: "hidden",
    marginBottom: 14,
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto", fontFamily: "'Inter',sans-serif" }}>
      {/* Back to list */}
      <button onClick={() => navigate("/roof-estimator")} style={{
        display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
        color: "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 16,
        padding: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Estimates
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
        {estimateId ? "Edit Estimate" : "Create AI Estimate"}
      </h1>
      <p style={{ color: "#64748B", fontSize: 13, marginBottom: 20 }}>
        Fill out the full estimate in one place and generate it when everything looks right.
      </p>

      {/* Main content: two-column layout (form left 60%, preview right 40%) */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* Left: Step form (60%) */}
        <div style={{
          flex: 1, background: "#fff", borderRadius: 14,
          border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          padding: "28px 32px",
        }}>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid #E2E8F0",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 2,
          }}>
            {ESTIMATE_SECTIONS.map((section) => {
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    border: isActive ? "1px solid #6637F4" : "1px solid #E2E8F0",
                    background: isActive ? "rgba(102,55,244,.08)" : "#fff",
                    color: isActive ? "#6637F4" : "#475569",
                    borderRadius: 999,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{section.icon}</span>
                  <span>{section.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {ESTIMATE_SECTIONS.map((section) => {
            const isOpen = section.id === activeSection;

            return (
              <div key={section.id} style={sectionStyle}>
                <button
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: isOpen ? "rgba(102,55,244,.10)" : "#F8FAFC",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}>
                      {section.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{section.title}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{section.description}</div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 18,
                    color: isOpen ? "#6637F4" : "#94A3B8",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform .2s ease",
                  }}>
                    ▾
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 20px 20px" }}>
                    {section.id === "client" && (
                      <Step1ClientInfo
                        data={data}
                        up={up}
                        clients={clients}
                        leads={leads}
                        clientSearchQ={clientSearchQ}
                        setClientSearchQ={setClientSearchQ}
                        hideHeader
                      />
                    )}
                    {section.id === "address" && (
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
                        hideHeader
                      />
                    )}
                    {section.id === "materials" && (
                      <Step3Materials
                        data={data}
                        up={up}
                        total={totalMaterialCost}
                        otherMaterials={data.otherMaterials}
                        onOtherMaterialsChange={(mats) => up("otherMaterials", mats)}
                        hideHeader
                      />
                    )}
                    {section.id === "labor" && (
                      <Step4Labor data={data} up={up} total={totalLaborCost} hideHeader />
                    )}
                    {section.id === "extras" && (
                      <Step5Extras data={data} up={up} total={totalEquipmentCost} hideHeader />
                    )}
                    {section.id === "profit" && (
                      <Step6Profit
                        data={data}
                        up={up}
                        subtotal={subtotal}
                        overheadAmount={overheadAmount}
                        profitAmount={profitAmount}
                        taxAmount={taxAmount}
                        finalPrice={finalPrice}
                        hideHeader
                      />
                    )}
                    {section.id === "summary" && (
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
                        hideHeader
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Actions */}
          <div style={{
            display: "flex", justifyContent: "flex-end", alignItems: "center",
            marginTop: 28, paddingTop: 20, borderTop: "1px solid #E2E8F0",
            gap: 10,
          }}>
            <button onClick={handleSaveDraft} disabled={saving} style={{
              padding: "10px 20px", borderRadius: 8, border: "1px solid #CBD5E1",
              background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600,
              cursor: "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Saving…" : "Save Draft"}
            </button>

            <button onClick={handleComplete} disabled={saving} style={{
              padding: "10px 22px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 2px 8px rgba(16,185,129,.25)", opacity: saving ? 0.7 : 1,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Generate AI Estimate
            </button>
          </div>
        </div>
        {/* Right: Sticky Preview (40%) */}
        <div style={{
          flex: "0 0 380px", background: "#fff", borderRadius: 14,
          border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          overflow: "hidden", position: "sticky", top: 24,
        }}>
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid #E2E8F0",
            fontSize: 14, fontWeight: 700, color: "#0F172A",
          }}>
            📊 Estimate Preview
          </div>
          <div style={{
            height: 220, background: "#F1F5F9", display: "flex", alignItems: "center",
            justifyContent: "center", overflow: "hidden",
          }}>
          {previewImageUrl ? (
              <img src={previewImageUrl} alt="Satellite" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center", color: "#94A3B8" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <div style={{ fontSize: 12, marginTop: 6 }}>Enter address to load EagleView aerial image</div>
              </div>
            )}
          </div>
          <div style={{ padding: "16px 18px" }}>
            {data.address && (
              <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, marginBottom: 10 }}>{data.address}</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <MiniStat label="Roof Area" value={`${data.roofAreaSqft.toLocaleString()} sq ft`} />
              <MiniStat label="Squares" value={roofSquares.toFixed(1)} />
              <MiniStat label="Pitch" value={data.pitch || "—"} />
              <MiniStat label="Confidence" value={data.confidence ? `${data.confidence.toFixed(0)}%` : "—"} />
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
        </div>
      </div>
    </div>
  );
}

/* ─── Mini Stat (sidebar) ────────────────────────────────── */

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

function Step1ClientInfo({ data, up, clients, leads, clientSearchQ, setClientSearchQ, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  clients: ClientEntity[];
  leads: LeadEntity[];
  clientSearchQ: string;
  setClientSearchQ: (q: string) => void;
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

  const selectClient = (c: ClientEntity) => {
    up("sourceType", "client");
    up("clientId", String(c.id || c.Id || ""));
    up("clientName", c.clientName || c.ClientName || c.name || c.Name || "");
    up("clientEmail", c.primaryEmail || c.contactEmail || c.ContactEmail || c.email || "");
    up("clientPhone", c.primaryContactPhone || c.contactNo || c.ContactNo || c.phone || "");
    up("clientCompany", c.clientName || c.ClientName || "");
    setClientSearchQ("");
  };

  const selectLead = (l: LeadEntity) => {
    up("sourceType", "lead");
    up("leadId", String(l.id));
    up("clientName", String(l.fullName || l.firstName || l.name || ""));
    up("clientEmail", String(l.email || ""));
    up("clientPhone", String(l.phone || l.mobile || ""));
    up("clientCompany", String(l.companyName || l.company || ""));
    if (l.propertyAddress || l.address) {
      up("address", String(l.propertyAddress || l.address || ""));
    }
    setClientSearchQ("");
  };

  return (
    <div>
      {!hideHeader && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>👤 Client / Lead Information</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Select an existing client or lead, or enter details manually.</p>
        </>
      )}

      {/* Search */}
      <Field label="Search Client or Lead">
        <div style={{ position: "relative" }}>
          <input
            placeholder="Type a name or email to search…"
            value={clientSearchQ}
            onChange={(e) => setClientSearchQ(e.target.value)}
            style={inputStyle}
          />
          {clientSearchQ && (filteredClients.length > 0 || filteredLeads.length > 0) && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 260, overflow: "auto",
            }}>
              {filteredClients.length > 0 && (
                <>
                  <div style={{ padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", background: "#F8FAFC" }}>
                    Clients ({filteredClients.length})
                  </div>
                  {filteredClients.slice(0, 8).map((c, i) => (
                    <button key={`c-${i}`} onClick={() => selectClient(c)} style={{
                      display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                      border: "none", background: "transparent", fontSize: 13, color: "#0F172A",
                      cursor: "pointer", borderBottom: "1px solid #F1F5F9",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F3FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ fontWeight: 600 }}>{c.clientName || c.ClientName || c.name || "Unnamed"}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{c.primaryEmail || c.contactEmail || ""}</div>
                    </button>
                  ))}
                </>
              )}
              {filteredLeads.length > 0 && (
                <>
                  <div style={{ padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", background: "#F8FAFC" }}>
                    Leads ({filteredLeads.length})
                  </div>
                  {filteredLeads.slice(0, 8).map((l, i) => (
                    <button key={`l-${i}`} onClick={() => selectLead(l)} style={{
                      display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                      border: "none", background: "transparent", fontSize: 13, color: "#0F172A",
                      cursor: "pointer", borderBottom: "1px solid #F1F5F9",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF7ED")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ fontWeight: 600 }}>{String(l.fullName || l.firstName || l.name || "Unnamed Lead")}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{String(l.email || "")}</div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </Field>

      {/* Source badge */}
      {data.sourceType !== "manual" && (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: data.sourceType === "client" ? "rgba(102,55,244,.1)" : "rgba(234,88,12,.1)",
            color: data.sourceType === "client" ? "#6637F4" : "#EA580C",
          }}>
            {data.sourceType === "client" ? "✓ Client Selected" : "✓ Lead Selected"}
          </span>
          <button onClick={() => { up("sourceType", "manual"); up("clientName", ""); up("clientEmail", ""); up("clientPhone", ""); up("clientCompany", ""); up("clientId", ""); up("leadId", ""); }} style={{
            fontSize: 11, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline",
          }}>Clear</button>
        </div>
      )}

      {/* Editable fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

function Step2Address({ data, up, suggestions, addressLoading, onAddressInput, onSelectAddress, satelliteLoading, eagleViewLoading, eagleViewStatus, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  suggestions: { description: string; placeId: string }[];
  addressLoading: boolean;
  onAddressInput: (val: string) => void;
  onSelectAddress: (desc: string, placeId: string) => void;
  satelliteLoading: boolean;
  eagleViewLoading: boolean;
  eagleViewStatus: string;
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Roof Area (sq ft)">
          <NumberInput value={data.roofAreaSqft} onChange={(v) => up("roofAreaSqft", v)} suffix="sq ft" />
        </Field>
        <Field label="Pitch">
          <select value={data.pitch} onChange={(e) => up("pitch", e.target.value)} style={inputStyle}>
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

function Step3Materials({ data, up, total, otherMaterials, onOtherMaterialsChange, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  total: number;
  otherMaterials: OtherMaterial[];
  onOtherMaterialsChange: (mats: OtherMaterial[]) => void;
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

      {/* Material table header */}
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
        {otherMaterials.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 100px 36px", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Name</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Qty</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Unit Price</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", textAlign: "right" }}>Total</span>
            <span />
          </div>
        )}
        {otherMaterials.map((m, idx) => (
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

function Step4Labor({ data, up, total, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  total: number;
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

function Step5Extras({ data, up, total, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  total: number;
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

function Step6Profit({ data, up, subtotal, overheadAmount, profitAmount, taxAmount, finalPrice, hideHeader = false }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  subtotal: number; overheadAmount: number; profitAmount: number; taxAmount: number; finalPrice: number;
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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
  overheadAmount, profitAmount, taxAmount, finalPrice, roofSquares, pricePerSquare, walletBalance, hideHeader = false }: {
  data: WizardData;
  totalMaterialCost: number; totalLaborCost: number; totalEquipmentCost: number;
  overheadAmount: number; profitAmount: number; taxAmount: number;
  finalPrice: number; roofSquares: number; pricePerSquare: number;
  walletBalance: number | null;
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
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
        display: "flex", alignItems: "center", justifyContent: "space-between",
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
