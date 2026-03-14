import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Building2, Calculator, CheckCircle2, ClipboardList,
  DollarSign, FileText, Loader2, MapPin, Plus, Ruler, Save, Trash2, Truck,
  Users, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  type ConstructionEstimate, type EstimateMaterial, type EstimateLabour,
  type EstimateEquipment, type EstimateTransport,
  createEstimate, getEstimate, updateEstimate, listEstimates, deleteEstimate,
} from "@/features/construction-estimator/services/construction-estimator-service";
import {
  autocompleteAddress, getPlaceDetails,
} from "@/features/roof-estimator/services/roof-estimator-service";

/* ── constants ── */
const STEPS = [
  { label: "Address", icon: MapPin },
  { label: "Measurements", icon: Ruler },
  { label: "Project", icon: Building2 },
  { label: "Materials", icon: ClipboardList },
  { label: "Labour", icon: Users },
  { label: "Equipment", icon: Wrench },
  { label: "Transport", icon: Truck },
  { label: "Summary", icon: Calculator },
];

const PROJECT_TYPES = ["RESIDENTIAL","COMMERCIAL","ROOFING","RENOVATION","NEW_CONSTRUCTION","REPAIR"];
const CURRENCIES = ["CAD","USD","INR"];
const MATERIAL_UNITS = ["KG","M","PCS","SQFT","BAG","TON","LF","ROLL","BOX","BUNDLE","GAL","SHEET"];
const LABOUR_TYPES = ["MASON","ELECTRICIAN","CARPENTER","ROOFER","HELPER","PLUMBER","PAINTER","HVAC","GENERAL"];
const EQUIPMENT_MODES = ["RENTAL","PURCHASE"];
const PAYMENT_TERMS = ["Due on receipt","Net 15","Net 30","Net 45","Net 60","50% upfront","Progress billing"];

const emptyMaterial = (): EstimateMaterial => ({
  materialName: "", materialCategory: "", quantity: 0, unit: "PCS",
  ratePerUnit: 0, totalCost: 0, supplierName: "", notes: "",
});
const emptyLabour = (): EstimateLabour => ({
  labourType: "GENERAL", description: "", numberOfWorkers: 1, workingDays: 1,
  hoursPerDay: 8, ratePerDay: 0, overtimeHours: 0, overtimeRate: 0,
  baseCost: 0, overtimeCost: 0, totalCost: 0,
});
const emptyEquipment = (): EstimateEquipment => ({
  equipmentName: "", mode: "RENTAL", numberOfUnits: 1, durationDays: 1,
  costPerDay: 0, totalCost: 0,
});
const emptyTransport = (): EstimateTransport => ({
  transportType: "", distance: null, numberOfTrips: 1, costPerTrip: 0, totalCost: 0,
});

/* ── currency formatter ── */
const fmt = (v: number, c = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: c }).format(v);

/* ══════════════════════════════════════════════════════════════════════════ */
export default function ConstructionEstimator() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  /* ── state ── */
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listMode, setListMode] = useState(!id);
  const [estimates, setEstimates] = useState<ConstructionEstimate[]>([]);

  // Address
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<{description:string;placeId:string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeId, setPlaceId] = useState("");
  const [lat, setLat] = useState<number|null>(null);
  const [lng, setLng] = useState<number|null>(null);
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("CA");
  const [satUrl, setSatUrl] = useState("");

  // Project
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("RESIDENTIAL");
  const [currency, setCurrency] = useState("CAD");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Measurements
  const [mRoofArea, setMRoofArea] = useState("");
  const [mRidge, setMRidge] = useState("");
  const [mValley, setMValley] = useState("");
  const [mHip, setMHip] = useState("");
  const [mEave, setMEave] = useState("");
  const [mRake, setMRake] = useState("");
  const [mPitch, setMPitch] = useState("");
  const [mFacets, setMFacets] = useState("");

  // Line items
  const [materials, setMaterials] = useState<EstimateMaterial[]>([emptyMaterial()]);
  const [labour, setLabour] = useState<EstimateLabour[]>([emptyLabour()]);
  const [equipment, setEquipment] = useState<EstimateEquipment[]>([emptyEquipment()]);
  const [transport, setTransport] = useState<EstimateTransport[]>([emptyTransport()]);

  // Summary %
  const [taxPct, setTaxPct] = useState(13);
  const [overheadPct, setOverheadPct] = useState(10);
  const [profitPct, setProfitPct] = useState(15);
  const [miscCost, setMiscCost] = useState(0);
  const [safetyCost, setSafetyCost] = useState(0);
  const [wastagePct, setWastagePct] = useState(5);
  const [contingency, setContingency] = useState(0);
  const [clientNotes, setClientNotes] = useState("");
  const [estimateId, setEstimateId] = useState<string|null>(id || null);

  /* ── load existing estimate ── */
  useEffect(() => {
    if (id) {
      setLoading(true);
      getEstimate(id).then(e => {
        populateFromEstimate(e);
        setListMode(false);
      }).catch(() => toast({ title: "Error", description: "Failed to load estimate", variant: "destructive" }))
        .finally(() => setLoading(false));
    }
  }, [id]);

  /* ── load list ── */
  useEffect(() => {
    if (listMode) {
      listEstimates({ limit: 50 }).then(r => setEstimates(r.data || [])).catch(() => {});
    }
  }, [listMode]);

  function populateFromEstimate(e: ConstructionEstimate) {
    setEstimateId(e.id);
    setAddress(e.address || ""); setPlaceId(e.placeId || "");
    setLat(e.latitude); setLng(e.longitude);
    setCity(e.city || ""); setPostalCode(e.postalCode || "");
    setCountry(e.country || "CA"); setSatUrl(e.satelliteImageUrl || "");
    setProjectName(e.projectName || ""); setProjectType(e.projectType || "RESIDENTIAL");
    setCurrency(e.currency || "CAD"); setPaymentTerms(e.paymentTerms || "Net 30");
    setStartDate(e.startDate?.slice(0,10) || ""); setEndDate(e.endDate?.slice(0,10) || "");
    if (e.measurements) {
      setMRoofArea(String(e.measurements.roofArea || ""));
      setMRidge(String(e.measurements.ridgeLength || ""));
      setMValley(String(e.measurements.valleyLength || ""));
      setMHip(String(e.measurements.hipLength || ""));
      setMEave(String(e.measurements.eaveLength || ""));
      setMRake(String(e.measurements.rakeLength || ""));
      setMPitch(e.measurements.pitch || "");
      setMFacets(String(e.measurements.facets || ""));
    }
    setMaterials(e.materials.length ? e.materials : [emptyMaterial()]);
    setLabour(e.labour.length ? e.labour : [emptyLabour()]);
    setEquipment(e.equipment.length ? e.equipment : [emptyEquipment()]);
    setTransport(e.transport.length ? e.transport : [emptyTransport()]);
    setTaxPct(e.taxPercent); setOverheadPct(e.overheadPercent);
    setProfitPct(e.profitPercent); setMiscCost(e.miscellaneousCost);
    setSafetyCost(e.safetyEquipmentCost); setWastagePct(e.wastagePercent);
    setContingency(e.contingencyBudget); setClientNotes(e.clientNotes || "");
  }

  /* ── auto-calc line items ── */
  const calcMaterials = (ms: EstimateMaterial[]) =>
    ms.map(m => ({ ...m, totalCost: m.quantity * m.ratePerUnit }));
  const calcLabour = (ls: EstimateLabour[]) =>
    ls.map(l => {
      const b = l.numberOfWorkers * l.workingDays * l.ratePerDay;
      const o = l.numberOfWorkers * l.overtimeHours * l.overtimeRate;
      return { ...l, baseCost: b, overtimeCost: o, totalCost: b + o };
    });
  const calcEquipment = (es: EstimateEquipment[]) =>
    es.map(e => ({ ...e, totalCost: e.numberOfUnits * e.durationDays * e.costPerDay }));
  const calcTransport = (ts: EstimateTransport[]) =>
    ts.map(t => ({ ...t, totalCost: t.numberOfTrips * t.costPerTrip }));

  /* ── summary calcs ── */
  const totalMat = useMemo(() => materials.reduce((s,m) => s + (m.quantity * m.ratePerUnit), 0), [materials]);
  const totalLab = useMemo(() => labour.reduce((s,l) => s + (l.numberOfWorkers * l.workingDays * l.ratePerDay) + (l.numberOfWorkers * l.overtimeHours * l.overtimeRate), 0), [labour]);
  const totalEquip = useMemo(() => equipment.reduce((s,e) => s + (e.numberOfUnits * e.durationDays * e.costPerDay), 0), [equipment]);
  const totalTrans = useMemo(() => transport.reduce((s,t) => s + (t.numberOfTrips * t.costPerTrip), 0), [transport]);
  const subtotal = totalMat + totalLab + totalEquip + totalTrans;
  const taxAmt = subtotal * (taxPct / 100);
  const overheadAmt = subtotal * (overheadPct / 100);
  const profitAmt = subtotal * (profitPct / 100);
  const grandTotal = subtotal + taxAmt + overheadAmt + profitAmt + miscCost + safetyCost + contingency;

  /* ── address autocomplete ── */
  const debounceRef = React.useRef<any>(null);
  const onAddressChange = (v: string) => {
    setAddress(v); setPlaceId(""); setSuggestions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 3) { setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await autocompleteAddress(v.trim());
        setSuggestions(r); setShowSuggestions(r.length > 0);
      } catch { setShowSuggestions(false); }
    }, 300);
  };
  const selectSuggestion = async (s: {description:string;placeId:string}) => {
    setAddress(s.description); setPlaceId(s.placeId);
    setSuggestions([]); setShowSuggestions(false);
    if (s.placeId) {
      try {
        const d = await getPlaceDetails(s.placeId);
        setAddress(d.formattedAddress || s.description);
        setLat(d.lat); setLng(d.lng);
        const apiKey = (window as any).__GOOGLE_MAPS_JS_API_KEY || "";
        if (d.lat && d.lng && apiKey) {
          setSatUrl(`https://maps.googleapis.com/maps/api/staticmap?center=${d.lat},${d.lng}&zoom=20&size=640x400&maptype=satellite&key=${apiKey}`);
        }
      } catch {}
    }
  };

  /* ── save ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        projectName: projectName || "Untitled Estimate",
        projectType, currency, paymentTerms,
        address, formattedAddress: address, placeId,
        latitude: lat, longitude: lng, city, postalCode, country,
        satelliteImageUrl: satUrl,
        startDate: startDate || null, endDate: endDate || null,
        taxPercent: taxPct, overheadPercent: overheadPct, profitPercent: profitPct,
        wastagePercent: wastagePct, miscellaneousCost: miscCost,
        safetyEquipmentCost: safetyCost, contingencyBudget: contingency,
        clientNotes,
        materials: calcMaterials(materials).filter(m => m.materialName),
        labour: calcLabour(labour).filter(l => l.ratePerDay > 0),
        equipment: calcEquipment(equipment).filter(e => e.equipmentName),
        transport: calcTransport(transport).filter(t => t.transportType),
      };
      let result: ConstructionEstimate;
      if (estimateId) {
        result = await updateEstimate(estimateId, body);
      } else {
        result = await createEstimate(body);
        setEstimateId(result.id);
        navigate(`/construction-estimator/${result.id}`, { replace: true });
      }
      populateFromEstimate(result);
      toast({ title: "Saved", description: `Estimate saved (${fmt(result.grandTotal, result.currency)})` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  /* ── print PDF ── */
  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${projectName || "Estimate"}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#1a1a2e;font-size:13px}
        h1{font-size:24px;color:#0f172a;margin-bottom:4px}
        h2{font-size:16px;color:#334155;margin:24px 0 10px;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:3px solid #3b82f6;padding-bottom:16px}
        .meta{color:#64748b;font-size:12px}
        table{width:100%;border-collapse:collapse;margin:8px 0 16px}
        th,td{padding:6px 10px;text-align:left;border:1px solid #e2e8f0;font-size:12px}
        th{background:#f1f5f9;font-weight:600;color:#334155}
        .r{text-align:right}
        .summary-row td{font-weight:600}
        .grand{background:#1e293b;color:white}
        .grand td{font-weight:700;font-size:15px;padding:10px}
        .notes{margin-top:24px;padding:12px;background:#f8fafc;border-radius:6px;font-size:12px}
        @media print{body{padding:20px}}
      </style>
    </head><body>
      <div class="header">
        <div><h1>${projectName || "Construction Estimate"}</h1>
          <p class="meta">${address}</p>
          <p class="meta">${projectType} • ${currency}</p></div>
        <div style="text-align:right">
          <p class="meta">Date: ${new Date().toLocaleDateString()}</p>
          <p class="meta">${startDate ? "Start: "+startDate : ""} ${endDate ? "End: "+endDate : ""}</p>
          <p class="meta">${paymentTerms || ""}</p></div>
      </div>
      ${satUrl ? `<img src="${satUrl}" style="width:100%;max-height:250px;object-fit:cover;border-radius:8px;margin-bottom:16px"/>` : ""}
      ${mRoofArea ? `<h2>Property Measurements</h2><table>
        <tr><td><b>Roof Area</b></td><td>${mRoofArea} sq ft</td><td><b>Pitch</b></td><td>${mPitch}</td></tr>
        <tr><td><b>Ridge</b></td><td>${mRidge} ft</td><td><b>Valley</b></td><td>${mValley} ft</td></tr>
        <tr><td><b>Hip</b></td><td>${mHip} ft</td><td><b>Eave</b></td><td>${mEave} ft</td></tr>
        <tr><td><b>Rake</b></td><td>${mRake} ft</td><td><b>Facets</b></td><td>${mFacets}</td></tr>
      </table>` : ""}
      ${materials.filter(m=>m.materialName).length ? `<h2>Materials</h2><table>
        <tr><th>Material</th><th>Category</th><th>Qty</th><th>Unit</th><th>Rate</th><th class="r">Total</th></tr>
        ${materials.filter(m=>m.materialName).map(m=>`<tr><td>${m.materialName}</td><td>${m.materialCategory}</td><td>${m.quantity}</td><td>${m.unit}</td><td>${fmt(m.ratePerUnit,currency)}</td><td class="r">${fmt(m.quantity*m.ratePerUnit,currency)}</td></tr>`).join("")}
        <tr class="summary-row"><td colspan="5"><b>Total Materials</b></td><td class="r"><b>${fmt(totalMat,currency)}</b></td></tr>
      </table>` : ""}
      ${labour.filter(l=>l.ratePerDay>0).length ? `<h2>Labour</h2><table>
        <tr><th>Type</th><th>Workers</th><th>Days</th><th>Rate/Day</th><th>OT Hrs</th><th class="r">Total</th></tr>
        ${labour.filter(l=>l.ratePerDay>0).map(l=>{const b=l.numberOfWorkers*l.workingDays*l.ratePerDay;const o=l.numberOfWorkers*l.overtimeHours*l.overtimeRate;return`<tr><td>${l.labourType}</td><td>${l.numberOfWorkers}</td><td>${l.workingDays}</td><td>${fmt(l.ratePerDay,currency)}</td><td>${l.overtimeHours}</td><td class="r">${fmt(b+o,currency)}</td></tr>`}).join("")}
        <tr class="summary-row"><td colspan="5"><b>Total Labour</b></td><td class="r"><b>${fmt(totalLab,currency)}</b></td></tr>
      </table>` : ""}
      <h2>Cost Summary</h2><table>
        <tr><td>Materials</td><td class="r">${fmt(totalMat,currency)}</td></tr>
        <tr><td>Labour</td><td class="r">${fmt(totalLab,currency)}</td></tr>
        <tr><td>Equipment</td><td class="r">${fmt(totalEquip,currency)}</td></tr>
        <tr><td>Transport</td><td class="r">${fmt(totalTrans,currency)}</td></tr>
        <tr class="summary-row"><td><b>Subtotal</b></td><td class="r"><b>${fmt(subtotal,currency)}</b></td></tr>
        <tr><td>Tax (${taxPct}%)</td><td class="r">${fmt(taxAmt,currency)}</td></tr>
        <tr><td>Overhead (${overheadPct}%)</td><td class="r">${fmt(overheadAmt,currency)}</td></tr>
        <tr><td>Profit (${profitPct}%)</td><td class="r">${fmt(profitAmt,currency)}</td></tr>
        ${miscCost ? `<tr><td>Miscellaneous</td><td class="r">${fmt(miscCost,currency)}</td></tr>` : ""}
        ${safetyCost ? `<tr><td>Safety Equipment</td><td class="r">${fmt(safetyCost,currency)}</td></tr>` : ""}
        ${contingency ? `<tr><td>Contingency</td><td class="r">${fmt(contingency,currency)}</td></tr>` : ""}
        <tr class="grand"><td>GRAND TOTAL</td><td class="r">${fmt(grandTotal,currency)}</td></tr>
      </table>
      ${clientNotes ? `<div class="notes"><b>Notes:</b><br/>${clientNotes}</div>` : ""}
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  /* ── helpers for line-item updates ── */
  const setMat = (i: number, k: string, v: any) => {
    const next = [...materials]; (next[i] as any)[k] = v; setMaterials(next);
  };
  const setLab = (i: number, k: string, v: any) => {
    const next = [...labour]; (next[i] as any)[k] = v; setLabour(next);
  };
  const setEq = (i: number, k: string, v: any) => {
    const next = [...equipment]; (next[i] as any)[k] = v; setEquipment(next);
  };
  const setTr = (i: number, k: string, v: any) => {
    const next = [...transport]; (next[i] as any)[k] = v; setTransport(next);
  };

  /* ── render ── */
  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  /* ── LIST VIEW ── */
  if (listMode) return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Construction Estimates</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage cost estimates for construction projects</p>
        </div>
        <Button onClick={() => { setListMode(false); setEstimateId(null); setStep(0); }}
          className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> New Estimate
        </Button>
      </div>
      {estimates.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <Calculator className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No estimates yet</h3>
          <p className="text-gray-400 text-sm mt-1">Create your first construction cost estimate</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {estimates.map(e => (
            <div key={e.id} onClick={() => navigate(`/construction-estimator/${e.id}`)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {e.projectName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{e.address}</p>
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {e.projectType}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      e.status === "DRAFT" ? "bg-gray-100 text-gray-600" :
                      e.status === "SENT" ? "bg-yellow-100 text-yellow-700" :
                      e.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>{e.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{fmt(e.grandTotal, e.currency)}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(e.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── WIZARD VIEW ── */
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setListMode(true); navigate("/construction-estimator"); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {estimateId ? projectName || "Edit Estimate" : "New Estimate"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!estimateId}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}
            className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          return (
            <button key={i} onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-md"
                  : i < step
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 min-h-[400px]">

        {/* STEP 0: Address */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500" /> Property Address</h2>
            <div className="relative">
              <Label>Search Address</Label>
              <Input value={address} onChange={e => onAddressChange(e.target.value)} placeholder="Start typing an address..." />
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button key={i} className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0"
                      onClick={() => selectSuggestion(s)}>
                      <MapPin className="w-3.5 h-3.5 inline mr-2 text-gray-400" />{s.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={city} onChange={e => setCity(e.target.value)} /></div>
              <div><Label>Postal Code</Label><Input value={postalCode} onChange={e => setPostalCode(e.target.value)} /></div>
              <div><Label>Country</Label><Input value={country} onChange={e => setCountry(e.target.value)} /></div>
            </div>
            {satUrl && (
              <div className="mt-4">
                <Label>Satellite Preview</Label>
                <img src={satUrl} alt="Satellite" className="w-full max-h-[300px] object-cover rounded-lg border mt-1" />
              </div>
            )}
            {lat && lng && <p className="text-xs text-gray-400">Coordinates: {lat?.toFixed(6)}, {lng?.toFixed(6)}</p>}
          </div>
        )}

        {/* STEP 1: Measurements */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Ruler className="w-5 h-5 text-blue-500" /> Property Measurements</h2>
            <p className="text-sm text-gray-500">Enter measurements manually or fetch from EagleView report.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><Label>Roof Area (sq ft)</Label><Input type="number" value={mRoofArea} onChange={e => setMRoofArea(e.target.value)} /></div>
              <div><Label>Pitch</Label><Input value={mPitch} onChange={e => setMPitch(e.target.value)} placeholder="e.g. 6/12" /></div>
              <div><Label>Ridge (ft)</Label><Input type="number" value={mRidge} onChange={e => setMRidge(e.target.value)} /></div>
              <div><Label>Valley (ft)</Label><Input type="number" value={mValley} onChange={e => setMValley(e.target.value)} /></div>
              <div><Label>Hip (ft)</Label><Input type="number" value={mHip} onChange={e => setMHip(e.target.value)} /></div>
              <div><Label>Eave (ft)</Label><Input type="number" value={mEave} onChange={e => setMEave(e.target.value)} /></div>
              <div><Label>Rake (ft)</Label><Input type="number" value={mRake} onChange={e => setMRake(e.target.value)} /></div>
              <div><Label>Facets</Label><Input type="number" value={mFacets} onChange={e => setMFacets(e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* STEP 2: Project Details */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> Project Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Project Name</Label><Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Smith Residence Roof Replacement" /></div>
              <div>
                <Label>Project Type</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Start Date</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><Label>End Date</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
              <div className="col-span-2">
                <Label>Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Materials */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ClipboardList className="w-5 h-5 text-blue-500" /> Materials</h2>
              <Button variant="outline" size="sm" onClick={() => setMaterials([...materials, emptyMaterial()])}>
                <Plus className="w-4 h-4 mr-1" /> Add Material
              </Button>
            </div>
            {materials.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="col-span-3"><Label className="text-xs">Name</Label><Input value={m.materialName} onChange={e => setMat(i, "materialName", e.target.value)} placeholder="Material" /></div>
                <div className="col-span-2"><Label className="text-xs">Category</Label><Input value={m.materialCategory} onChange={e => setMat(i, "materialCategory", e.target.value)} /></div>
                <div className="col-span-1"><Label className="text-xs">Qty</Label><Input type="number" value={m.quantity||""} onChange={e => setMat(i, "quantity", parseFloat(e.target.value)||0)} /></div>
                <div className="col-span-1">
                  <Label className="text-xs">Unit</Label>
                  <Select value={m.unit} onValueChange={v => setMat(i, "unit", v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{MATERIAL_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label className="text-xs">Rate/Unit</Label><Input type="number" value={m.ratePerUnit||""} onChange={e => setMat(i, "ratePerUnit", parseFloat(e.target.value)||0)} /></div>
                <div className="col-span-2"><Label className="text-xs">Supplier</Label><Input value={m.supplierName} onChange={e => setMat(i, "supplierName", e.target.value)} /></div>
                <div className="col-span-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-green-600">{fmt(m.quantity * m.ratePerUnit, currency)}</span>
                  {materials.length > 1 && <button onClick={() => setMaterials(materials.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
            <div className="text-right text-lg font-bold text-gray-900 dark:text-white">
              Total Materials: {fmt(totalMat, currency)}
            </div>
          </div>
        )}

        {/* STEP 4: Labour */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Labour</h2>
              <Button variant="outline" size="sm" onClick={() => setLabour([...labour, emptyLabour()])}>
                <Plus className="w-4 h-4 mr-1" /> Add Labour
              </Button>
            </div>
            {labour.map((l, i) => {
              const base = l.numberOfWorkers * l.workingDays * l.ratePerDay;
              const ot = l.numberOfWorkers * l.overtimeHours * l.overtimeRate;
              return (
                <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-2">
                      <Label className="text-xs">Type</Label>
                      <Select value={l.labourType} onValueChange={v => setLab(i, "labourType", v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{LABOUR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Label className="text-xs">Workers</Label><Input type="number" value={l.numberOfWorkers} onChange={e => setLab(i, "numberOfWorkers", parseInt(e.target.value)||1)} /></div>
                    <div className="col-span-2"><Label className="text-xs">Days</Label><Input type="number" value={l.workingDays} onChange={e => setLab(i, "workingDays", parseInt(e.target.value)||1)} /></div>
                    <div className="col-span-2"><Label className="text-xs">Rate/Day</Label><Input type="number" value={l.ratePerDay||""} onChange={e => setLab(i, "ratePerDay", parseFloat(e.target.value)||0)} /></div>
                    <div className="col-span-1"><Label className="text-xs">OT Hrs</Label><Input type="number" value={l.overtimeHours||""} onChange={e => setLab(i, "overtimeHours", parseFloat(e.target.value)||0)} /></div>
                    <div className="col-span-1"><Label className="text-xs">OT Rate</Label><Input type="number" value={l.overtimeRate||""} onChange={e => setLab(i, "overtimeRate", parseFloat(e.target.value)||0)} /></div>
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-sm font-semibold text-green-600">{fmt(base + ot, currency)}</span>
                      {labour.length > 1 && <button onClick={() => setLabour(labour.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="text-right text-lg font-bold">Total Labour: {fmt(totalLab, currency)}</div>
          </div>
        )}

        {/* STEP 5: Equipment */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-500" /> Equipment / Tools</h2>
              <Button variant="outline" size="sm" onClick={() => setEquipment([...equipment, emptyEquipment()])}>
                <Plus className="w-4 h-4 mr-1" /> Add Equipment
              </Button>
            </div>
            {equipment.map((e, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="col-span-3"><Label className="text-xs">Equipment</Label><Input value={e.equipmentName} onChange={ev => setEq(i, "equipmentName", ev.target.value)} /></div>
                <div className="col-span-2">
                  <Label className="text-xs">Mode</Label>
                  <Select value={e.mode} onValueChange={v => setEq(i, "mode", v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{EQUIPMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label className="text-xs">Units</Label><Input type="number" value={e.numberOfUnits} onChange={ev => setEq(i, "numberOfUnits", parseInt(ev.target.value)||1)} /></div>
                <div className="col-span-2"><Label className="text-xs">Days</Label><Input type="number" value={e.durationDays} onChange={ev => setEq(i, "durationDays", parseInt(ev.target.value)||1)} /></div>
                <div className="col-span-2"><Label className="text-xs">Cost/Day</Label><Input type="number" value={e.costPerDay||""} onChange={ev => setEq(i, "costPerDay", parseFloat(ev.target.value)||0)} /></div>
                <div className="col-span-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-green-600">{fmt(e.numberOfUnits * e.durationDays * e.costPerDay, currency)}</span>
                  {equipment.length > 1 && <button onClick={() => setEquipment(equipment.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
            <div className="text-right text-lg font-bold">Total Equipment: {fmt(totalEquip, currency)}</div>
          </div>
        )}

        {/* STEP 6: Transport */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" /> Transport / Logistics</h2>
              <Button variant="outline" size="sm" onClick={() => setTransport([...transport, emptyTransport()])}>
                <Plus className="w-4 h-4 mr-1" /> Add Transport
              </Button>
            </div>
            {transport.map((t, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="col-span-3"><Label className="text-xs">Type</Label><Input value={t.transportType} onChange={ev => setTr(i, "transportType", ev.target.value)} placeholder="e.g. Truck, Crane" /></div>
                <div className="col-span-3"><Label className="text-xs">Distance (km)</Label><Input type="number" value={t.distance||""} onChange={ev => setTr(i, "distance", parseFloat(ev.target.value)||null)} /></div>
                <div className="col-span-2"><Label className="text-xs">Trips</Label><Input type="number" value={t.numberOfTrips} onChange={ev => setTr(i, "numberOfTrips", parseInt(ev.target.value)||1)} /></div>
                <div className="col-span-2"><Label className="text-xs">Cost/Trip</Label><Input type="number" value={t.costPerTrip||""} onChange={ev => setTr(i, "costPerTrip", parseFloat(ev.target.value)||0)} /></div>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-green-600">{fmt(t.numberOfTrips * t.costPerTrip, currency)}</span>
                  {transport.length > 1 && <button onClick={() => setTransport(transport.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
            <div className="text-right text-lg font-bold">Total Transport: {fmt(totalTrans, currency)}</div>
          </div>
        )}

        {/* STEP 7: Summary */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-500" /> Cost Summary</h2>

            {/* Cost breakdown */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
              <div className="space-y-2">
                {[
                  ["Materials", totalMat],
                  ["Labour", totalLab],
                  ["Equipment", totalEquip],
                  ["Transport", totalTrans],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between py-1.5 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{label as string}</span>
                    <span className="font-medium">{fmt(val as number, currency)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700 font-semibold">
                  <span>Subtotal</span><span>{fmt(subtotal, currency)}</span>
                </div>
              </div>
            </div>

            {/* Percentages */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><Label>Tax %</Label><Input type="number" value={taxPct} onChange={e => setTaxPct(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Overhead %</Label><Input type="number" value={overheadPct} onChange={e => setOverheadPct(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Profit %</Label><Input type="number" value={profitPct} onChange={e => setProfitPct(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Wastage %</Label><Input type="number" value={wastagePct} onChange={e => setWastagePct(parseFloat(e.target.value)||0)} /></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><Label>Miscellaneous Cost</Label><Input type="number" value={miscCost||""} onChange={e => setMiscCost(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Safety Equipment Cost</Label><Input type="number" value={safetyCost||""} onChange={e => setSafetyCost(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Contingency Budget</Label><Input type="number" value={contingency||""} onChange={e => setContingency(parseFloat(e.target.value)||0)} /></div>
            </div>

            {/* Grand total */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Tax ({taxPct}%)</span><span>{fmt(taxAmt, currency)}</span></div>
                <div className="flex justify-between"><span>Overhead ({overheadPct}%)</span><span>{fmt(overheadAmt, currency)}</span></div>
                <div className="flex justify-between"><span>Profit ({profitPct}%)</span><span>{fmt(profitAmt, currency)}</span></div>
                {miscCost > 0 && <div className="flex justify-between"><span>Miscellaneous</span><span>{fmt(miscCost, currency)}</span></div>}
                {safetyCost > 0 && <div className="flex justify-between"><span>Safety</span><span>{fmt(safetyCost, currency)}</span></div>}
                {contingency > 0 && <div className="flex justify-between"><span>Contingency</span><span>{fmt(contingency, currency)}</span></div>}
              </div>
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/30">
                <span className="text-lg font-bold">GRAND TOTAL</span>
                <span className="text-3xl font-bold">{fmt(grandTotal, currency)}</span>
              </div>
            </div>

            <div>
              <Label>Notes for Client</Label>
              <textarea className="w-full mt-1 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm min-h-[80px]"
                value={clientNotes} onChange={e => setClientNotes(e.target.value)}
                placeholder="Terms, conditions, additional notes..." />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} className="bg-blue-600 hover:bg-blue-700">
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
            Save Estimate
          </Button>
        )}
      </div>
    </div>
  );
}
