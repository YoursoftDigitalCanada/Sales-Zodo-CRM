// src/pages/RoofEstimatorWizard.tsx — 6-Step Estimate Wizard

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  autocompleteAddress,
  fetchSatelliteImage,
  detectRoof,
  saveEstimate,
  updateEstimate,
  getEstimateById,
  type RoofEstimate,
  type SaveEstimatePayload,
} from "@/features/roof-estimator/services/roof-estimator-service";
import { useToast } from "@/hooks/use-toast";

/* ─── Constants ──────────────────────────────────────────── */

const STEPS = [
  { num: 1, label: "Address", icon: "📍" },
  { num: 2, label: "Materials", icon: "🧱" },
  { num: 3, label: "Labor", icon: "👷" },
  { num: 4, label: "Extras", icon: "🔧" },
  { num: 5, label: "Profit", icon: "💰" },
  { num: 6, label: "Final", icon: "📄" },
];

/* ─── Helpers ────────────────────────────────────────────── */

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00";

/* ─── WizardData type ────────────────────────────────────── */

interface WizardData {
  // Step 1
  address: string;
  placeId: string;
  latitude: number;
  longitude: number;
  satelliteImageUrl: string;
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
  // Step 2
  shingleType: string;
  shinglePricePerSq: number;
  underlaymentCost: number;
  iceWaterShieldCost: number;
  ridgeCapCost: number;
  starterStripCost: number;
  flashingCostWizard: number;
  ventCostWizard: number;
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
}

const DEFAULT_DATA: WizardData = {
  address: "", placeId: "", latitude: 0, longitude: 0, satelliteImageUrl: "",
  roofAreaSqft: 0, confidence: 0, processingTimeSec: 0, aiModel: "yolov8n-seg-cpu",
  pitch: "6/12", roofType: "gable", stories: 1, layers: 1, wastePercent: 10,
  measurementSource: "", tearOffRequired: false,
  shingleType: "Architectural Shingles", shinglePricePerSq: 0, underlaymentCost: 0,
  iceWaterShieldCost: 0, ridgeCapCost: 0, starterStripCost: 0,
  flashingCostWizard: 0, ventCostWizard: 0, nailsAccessoriesCost: 0,
  laborCostPerSquare: 0, numberOfLaborers: 3, daysRequired: 2, laborRatePerWorker: 350,
  dumpsterCost: 0, permitCost: 0, deliveryFee: 0, equipmentRentalCost: 0, disposalFee: 0,
  overheadPercent: 10, profitMarginPercent: 20, taxPercent: 13,
  notes: "", clientId: "",
};

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
                background: done ? "#10B981" : active ? "linear-gradient(135deg,#0891B2,#0E7490)" : "#F1F5F9",
                color: done || active ? "#fff" : "#94A3B8",
                boxShadow: active ? "0 2px 12px rgba(8,145,178,.3)" : "none",
                transition: "all .3s ease",
              }}>
                {done ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                ) : s.icon}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: active ? "#0891B2" : done ? "#10B981" : "#94A3B8",
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

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [estimateId, setEstimateId] = useState<string | null>(id || null);

  // Step 1 specific
  const [addressSuggestions, setAddressSuggestions] = useState<{ description: string; placeId: string }[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [satelliteLoading, setSatelliteLoading] = useState(false);

  // Update helper
  const up = useCallback(<K extends keyof WizardData>(key: K, val: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: val }));
  }, []);

  // Load existing estimate when editing
  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const est = await getEstimateById(id);
          setEstimateId(est.id);
          setStep(est.currentStep || 1);
          setData({
            address: est.address || "", placeId: "", latitude: est.latitude || 0,
            longitude: est.longitude || 0, satelliteImageUrl: est.satelliteImageUrl || "",
            roofAreaSqft: est.roofAreaSqft || 0, confidence: est.confidence || 0,
            processingTimeSec: est.processingTimeSec || 0, aiModel: est.aiModel || "yolov8n-seg-cpu",
            pitch: est.pitch || "6/12", roofType: est.roofType || "gable",
            stories: est.stories || 1, layers: est.layers || 1,
            wastePercent: est.wastePercent ?? 10, measurementSource: est.measurementSource || "",
            tearOffRequired: est.tearOffRequired || false,
            shingleType: est.shingleType || "Architectural Shingles",
            shinglePricePerSq: est.shinglePricePerSq || 0,
            underlaymentCost: est.underlaymentCost || 0,
            iceWaterShieldCost: est.iceWaterShieldCost || 0,
            ridgeCapCost: est.ridgeCapCost || 0,
            starterStripCost: est.starterStripCost || 0,
            flashingCostWizard: est.flashingCostWizard || 0,
            ventCostWizard: est.ventCostWizard || 0,
            nailsAccessoriesCost: est.nailsAccessoriesCost || 0,
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
          });
        } catch {
          toast({ title: "Error", description: "Failed to load estimate", variant: "destructive" });
          navigate("/roof-estimator");
        }
      })();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Computed totals ──────────────────────────── */

  const totalMaterialCost = useMemo(() =>
    data.shinglePricePerSq + data.underlaymentCost + data.iceWaterShieldCost +
    data.ridgeCapCost + data.starterStripCost + data.flashingCostWizard +
    data.ventCostWizard + data.nailsAccessoriesCost, [data]);

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
    // Fetch satellite image
    setSatelliteLoading(true);
    try {
      const sat = await fetchSatelliteImage(desc, placeId);
      up("latitude", sat.latitude);
      up("longitude", sat.longitude);
      up("satelliteImageUrl", sat.satelliteImageUrl);
    } catch {
      toast({ title: "Warning", description: "Could not load satellite image" });
    } finally { setSatelliteLoading(false); }
  }, [up, toast]);

  const runAiDetection = useCallback(async () => {
    if (!data.satelliteImageUrl) {
      toast({ title: "Error", description: "Load satellite image first", variant: "destructive" });
      return;
    }
    setDetecting(true);
    try {
      const result = await detectRoof({
        satelliteImageUrl: data.satelliteImageUrl,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      up("roofAreaSqft", result.roofAreaSqft);
      up("confidence", result.confidence);
      up("processingTimeSec", result.processingTimeSec);
      up("aiModel", result.aiModel);
      up("measurementSource", "ai_satellite");
      toast({ title: "Detection complete", description: `Found ${result.roofAreaSqft.toFixed(0)} sq ft with ${result.confidence.toFixed(0)}% confidence` });
    } catch (e: any) {
      toast({ title: "Detection failed", description: e?.message || "AI detection error", variant: "destructive" });
    } finally { setDetecting(false); }
  }, [data.satelliteImageUrl, data.latitude, data.longitude, up, toast]);

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
    measurementSource: data.measurementSource, tearOffRequired: data.tearOffRequired,
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
    finalEstimatePrice: finalPrice, currentStep: step, status: "draft",
  }), [data, finalPrice, totalMaterialCost, totalLaborCost, totalEquipmentCost, overheadAmount, profitAmount, taxAmount, step]);

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
      const payload = { ...buildPayload(), status: "completed", currentStep: 6 };
      if (estimateId) {
        await updateEstimate(estimateId, payload);
      } else {
        await saveEstimate(payload);
      }
      toast({ title: "Estimate Completed", description: "Your estimate has been finalized" });
      navigate("/roof-estimator");
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Could not complete estimate", variant: "destructive" });
    } finally { setSaving(false); }
  }, [buildPayload, estimateId, toast, navigate]);

  const goNext = () => { if (step < 6) setStep(step + 1); };
  const goBack = () => { if (step > 1) setStep(step - 1); };

  /* ─── Render Steps ─────────────────────────────── */

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1Address data={data} up={up}
        suggestions={addressSuggestions} addressLoading={addressLoading}
        onAddressInput={handleAddressInput} onSelectAddress={selectAddress}
        onDetect={runAiDetection} detecting={detecting} satelliteLoading={satelliteLoading} />;
      case 2: return <Step2Materials data={data} up={up} total={totalMaterialCost} />;
      case 3: return <Step3Labor data={data} up={up} total={totalLaborCost} />;
      case 4: return <Step4Extras data={data} up={up} total={totalEquipmentCost} />;
      case 5: return <Step5Profit data={data} up={up} subtotal={subtotal}
        overheadAmount={overheadAmount} profitAmount={profitAmount} taxAmount={taxAmount} finalPrice={finalPrice} />;
      case 6: return <Step6Final data={data}
        totalMaterialCost={totalMaterialCost} totalLaborCost={totalLaborCost}
        totalEquipmentCost={totalEquipmentCost} overheadAmount={overheadAmount}
        profitAmount={profitAmount} taxAmount={taxAmount} finalPrice={finalPrice}
        roofSquares={roofSquares} pricePerSquare={pricePerSquare} />;
      default: return null;
    }
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
        Complete each step to build your roof estimate.
      </p>

      {/* Step Indicator */}
      <StepIndicator current={step} />

      {/* Main content: two-column layout */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Left: Satellite / Map preview */}
        <div style={{
          flex: "0 0 360px", background: "#fff", borderRadius: 14,
          border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          overflow: "hidden", position: "sticky", top: 24,
        }}>
          <div style={{
            height: 260, background: "#F1F5F9", display: "flex", alignItems: "center",
            justifyContent: "center", overflow: "hidden",
          }}>
            {data.satelliteImageUrl ? (
              <img src={data.satelliteImageUrl} alt="Satellite" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center", color: "#94A3B8" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <div style={{ fontSize: 12, marginTop: 6 }}>Satellite preview</div>
              </div>
            )}
          </div>
          <div style={{ padding: "16px 18px" }}>
            {data.address && (
              <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, marginBottom: 6 }}>{data.address}</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <MiniStat label="Roof Area" value={`${data.roofAreaSqft.toLocaleString()} sq ft`} />
              <MiniStat label="Roof Squares" value={roofSquares.toFixed(1)} />
              <MiniStat label="Pitch" value={data.pitch || "—"} />
              <MiniStat label="Confidence" value={data.confidence ? `${data.confidence.toFixed(0)}%` : "—"} />
            </div>
            {/* Running totals */}
            <div style={{ marginTop: 14, borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#64748B" }}>Materials</span>
                <span style={{ color: "#0F172A", fontWeight: 600 }}>{fmt(totalMaterialCost)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#64748B" }}>Labor</span>
                <span style={{ color: "#0F172A", fontWeight: 600 }}>{fmt(totalLaborCost)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#64748B" }}>Equipment</span>
                <span style={{ color: "#0F172A", fontWeight: 600 }}>{fmt(totalEquipmentCost)}</span>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between", fontSize: 14,
                fontWeight: 700, color: "#0891B2", paddingTop: 8, borderTop: "1px solid #E2E8F0",
              }}>
                <span>Final Price</span>
                <span>{fmt(finalPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Step form */}
        <div style={{
          flex: 1, background: "#fff", borderRadius: 14,
          border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          padding: "28px 32px",
        }}>
          {renderStep()}

          {/* Navigation */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 28, paddingTop: 20, borderTop: "1px solid #E2E8F0",
          }}>
            <button onClick={goBack} disabled={step === 1} style={{
              padding: "10px 20px", borderRadius: 8, border: "1px solid #CBD5E1",
              background: "#fff", color: step === 1 ? "#CBD5E1" : "#475569",
              fontSize: 13, fontWeight: 600, cursor: step === 1 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleSaveDraft} disabled={saving} style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #CBD5E1",
                background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600,
                cursor: "pointer", opacity: saving ? 0.7 : 1,
              }}>
                {saving ? "Saving…" : "Save Draft"}
              </button>

              {step < 6 ? (
                <button onClick={goNext} style={{
                  padding: "10px 22px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg,#0891B2,#0E7490)", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "0 2px 8px rgba(8,145,178,.25)",
                }}>
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ) : (
                <button onClick={handleComplete} disabled={saving} style={{
                  padding: "10px 22px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "0 2px 8px rgba(16,185,129,.25)", opacity: saving ? 0.7 : 1,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Complete Estimate
                </button>
              )}
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

/* ─── Step 1: Address & Roof Measurement ─────────────────── */

function Step1Address({ data, up, suggestions, addressLoading, onAddressInput, onSelectAddress, onDetect, detecting, satelliteLoading }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  suggestions: { description: string; placeId: string }[];
  addressLoading: boolean;
  onAddressInput: (val: string) => void;
  onSelectAddress: (desc: string, placeId: string) => void;
  onDetect: () => void;
  detecting: boolean;
  satelliteLoading: boolean;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>📍 Address & Roof Measurement</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Enter the property address and detect the roof area using AI.</p>

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

      {/* AI Detection button */}
      {data.satelliteImageUrl && !data.roofAreaSqft && (
        <button onClick={onDetect} disabled={detecting || satelliteLoading} style={{
          padding: "10px 20px", borderRadius: 8, border: "none",
          background: "linear-gradient(135deg,#0891B2,#0E7490)", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 20,
          opacity: detecting ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8,
        }}>
          {detecting ? (
            <>
              <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              Detecting Roof…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
              Run AI Detection
            </>
          )}
        </button>
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

function Step2Materials({ data, up, total }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  total: number;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>🧱 Material Pricing</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Enter the cost for each material. All costs auto-calculate the total.</p>

      <Field label="Shingle Type">
        <input value={data.shingleType} onChange={(e) => up("shingleType", e.target.value)} style={inputStyle} placeholder="e.g. Architectural Shingles" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Shingles (per sq)"><NumberInput value={data.shinglePricePerSq} onChange={(v) => up("shinglePricePerSq", v)} prefix="$" /></Field>
        <Field label="Underlayment"><NumberInput value={data.underlaymentCost} onChange={(v) => up("underlaymentCost", v)} prefix="$" /></Field>
        <Field label="Ice & Water Shield"><NumberInput value={data.iceWaterShieldCost} onChange={(v) => up("iceWaterShieldCost", v)} prefix="$" /></Field>
        <Field label="Ridge Cap"><NumberInput value={data.ridgeCapCost} onChange={(v) => up("ridgeCapCost", v)} prefix="$" /></Field>
        <Field label="Starter Strip"><NumberInput value={data.starterStripCost} onChange={(v) => up("starterStripCost", v)} prefix="$" /></Field>
        <Field label="Flashing"><NumberInput value={data.flashingCostWizard} onChange={(v) => up("flashingCostWizard", v)} prefix="$" /></Field>
        <Field label="Vents"><NumberInput value={data.ventCostWizard} onChange={(v) => up("ventCostWizard", v)} prefix="$" /></Field>
        <Field label="Nails & Accessories"><NumberInput value={data.nailsAccessoriesCost} onChange={(v) => up("nailsAccessoriesCost", v)} prefix="$" /></Field>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 18px", background: "rgba(8,145,178,.06)", borderRadius: 10,
        marginTop: 8,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Total Material Cost</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0891B2" }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

/* ─── Step 3: Labor Inputs ───────────────────────────────── */

function Step3Labor({ data, up, total }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  total: number;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>👷 Labor Inputs</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Enter labor details. Total = Workers × Days × Rate.</p>

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
        padding: "14px 18px", background: "rgba(8,145,178,.06)", borderRadius: 10,
        marginTop: 12,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Total Labor Cost</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0891B2" }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

/* ─── Step 4: Equipment & Extras ─────────────────────────── */

function Step4Extras({ data, up, total }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  total: number;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>🔧 Equipment & Extra Costs</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Add any additional costs for equipment, permits, and disposal.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Dumpster"><NumberInput value={data.dumpsterCost} onChange={(v) => up("dumpsterCost", v)} prefix="$" /></Field>
        <Field label="Permit"><NumberInput value={data.permitCost} onChange={(v) => up("permitCost", v)} prefix="$" /></Field>
        <Field label="Delivery Fee"><NumberInput value={data.deliveryFee} onChange={(v) => up("deliveryFee", v)} prefix="$" /></Field>
        <Field label="Equipment Rental"><NumberInput value={data.equipmentRentalCost} onChange={(v) => up("equipmentRentalCost", v)} prefix="$" /></Field>
        <Field label="Disposal Fee"><NumberInput value={data.disposalFee} onChange={(v) => up("disposalFee", v)} prefix="$" /></Field>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 18px", background: "rgba(8,145,178,.06)", borderRadius: 10,
        marginTop: 8,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Total Equipment & Extras</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#0891B2" }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

/* ─── Step 5: Profit & Overhead ──────────────────────────── */

function Step5Profit({ data, up, subtotal, overheadAmount, profitAmount, taxAmount, finalPrice }: {
  data: WizardData;
  up: <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;
  subtotal: number; overheadAmount: number; profitAmount: number; taxAmount: number; finalPrice: number;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>💰 Profit & Overhead</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Set your overhead, profit margin, and tax percentages.</p>

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
          fontSize: 18, fontWeight: 800, color: "#0891B2",
        }}>
          <span>Final Estimate</span>
          <span>{fmt(finalPrice)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 6: Final Summary ──────────────────────────────── */

function Step6Final({ data, totalMaterialCost, totalLaborCost, totalEquipmentCost,
  overheadAmount, profitAmount, taxAmount, finalPrice, roofSquares, pricePerSquare }: {
  data: WizardData;
  totalMaterialCost: number; totalLaborCost: number; totalEquipmentCost: number;
  overheadAmount: number; profitAmount: number; taxAmount: number;
  finalPrice: number; roofSquares: number; pricePerSquare: number;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>📄 Final Estimate Summary</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>Review your complete estimate before finalizing.</p>

      {/* Property Info */}
      <div style={{
        background: "#F8FAFC", borderRadius: 12, padding: "16px 20px", marginBottom: 16,
        border: "1px solid #E2E8F0",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Property Details</div>
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
          marginTop: 12, paddingTop: 16, borderTop: "2px solid #0891B2",
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0891B2" }}>{fmt(finalPrice)}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>Price per square: {fmt(pricePerSquare)}</div>
          </div>
          <div style={{
            background: "rgba(8,145,178,.08)", borderRadius: 10, padding: "10px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0891B2" }}>{roofSquares.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Roof Squares</div>
          </div>
        </div>
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
