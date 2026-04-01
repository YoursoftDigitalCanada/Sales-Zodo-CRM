import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, FileStack, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_ORIGIN, buildApiUrl } from "@/services/api";
import { cn } from "@/lib/utils";

interface QuoteCompany {
  companyName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}

interface QuoteClient {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
}

interface QuoteProject {
  title?: string | null;
  address?: string | null;
  jobType?: string | null;
  recipientType?: string | null;
}

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface RoofEstimatePhoto {
  label?: string | null;
  url: string;
}

interface RoofEstimateTakeoffItem {
  id?: string;
  description: string;
  category?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  wasteFactor?: number | null;
  wasteQuantity?: number | null;
  totalQuantity?: number | null;
  totalPrice?: number | null;
}

interface RoofEstimateTakeoff {
  id?: string;
  scenarioName?: string | null;
  materialType?: string | null;
  adjustedAreaSqft?: number | null;
  wasteFactor?: number | null;
  subtotal?: number | null;
  laborCost?: number | null;
  materialCost?: number | null;
  accessoryCost?: number | null;
  tearOffCost?: number | null;
  totalPrice?: number | null;
  items?: RoofEstimateTakeoffItem[];
}

interface QuoteRoofEstimate {
  id: string;
  address?: string | null;
  satelliteImageUrl?: string | null;
  roofAreaSqft?: number | null;
  trueSurfaceAreaSqft?: number | null;
  pitch?: string | null;
  roofType?: string | null;
  stories?: number | null;
  layers?: number | null;
  pricePerSqft?: number | null;
  totalEstimate?: number | null;
  confidence?: number | null;
  measurementSource?: string | null;
  notes?: string | null;
  photoUrls?: Array<string | RoofEstimatePhoto> | null;
  takeoff?: RoofEstimateTakeoff | null;
}

interface PublicQuote {
  id: string;
  quoteNumber: string;
  status: string;
  company: QuoteCompany;
  client: QuoteClient;
  project: QuoteProject;
  issueDate: string;
  validUntil: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  scopeOfWork?: string | null;
  notes?: string | null;
  terms?: string | null;
  items: QuoteItem[];
  viewCount: number;
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
  acceptedAt?: string | null;
  signedAt?: string | null;
  signedBy?: string | null;
  signatureType?: string | null;
  isContract?: boolean;
  contractVersion?: number;
  roofEstimate?: QuoteRoofEstimate | null;
  requiresDigitalSignature?: boolean;
  canSign: boolean;
  canReject: boolean;
}

const formatCurrency = (value: number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(value);

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : "-";

const formatNumber = (value?: number | null, maximumFractionDigits = 0) =>
  value === null || value === undefined
    ? "-"
    : new Intl.NumberFormat("en-CA", { maximumFractionDigits }).format(value);

const resolvePublicAssetUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
};

const statusConfig = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "signed") {
    return { bg: "bg-green-100", text: "text-green-600", icon: CheckCircle2, label: "Signed" };
  }
  if (normalized === "accepted") {
    return { bg: "bg-green-100", text: "text-green-600", icon: CheckCircle2, label: "Accepted" };
  }
  if (normalized === "rejected") {
    return { bg: "bg-red-100", text: "text-red-600", icon: XCircle, label: "Rejected" };
  }
  if (normalized === "viewed") {
    return { bg: "bg-purple-100", text: "text-purple-600", icon: Eye, label: "Viewed" };
  }
  if (normalized === "expired") {
    return { bg: "bg-amber-100", text: "text-amber-600", icon: AlertTriangle, label: "Expired" };
  }
  return { bg: "bg-blue-100", text: "text-[#0891B2]", icon: FileStack, label: "Sent" };
};

const formatMeasurementSource = (value?: string | null) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "-";
  }
  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeRoofEstimatePhotos = (photos?: Array<string | RoofEstimatePhoto> | null) =>
  (Array.isArray(photos) ? photos : [])
    .map((photo, index) => {
      if (typeof photo === "string") {
        const url = resolvePublicAssetUrl(photo);
        if (!url) return null;
        return { label: `Roof Photo ${index + 1}`, url };
      }
      const url = resolvePublicAssetUrl(photo?.url);
      if (!url) return null;
      return {
        label: photo?.label?.trim() || `Roof Photo ${index + 1}`,
        url,
      };
    })
    .filter((photo): photo is { label: string; url: string } => Boolean(photo));

export default function PublicQuoteView() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");
  const [fullName, setFullName] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [responseStatus, setResponseStatus] = useState<string | null>(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadQuote = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(buildApiUrl(`/public/quotes/${token}`));
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.message || "Estimate not found or link has expired.");
        }
        const data = await res.json();
        setQuote(data);
        setFullName((current) => current || data.client?.name || "");
      } catch (err: any) {
        setError(err.message || "Unable to load estimate.");
      } finally {
        setLoading(false);
      }
    };

    void loadQuote();
  }, [token]);

  useEffect(() => {
    if (!quote || signatureMode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0F172A";
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawnSignature(false);
  }, [quote, signatureMode]);

  const isClosed = useMemo(() => {
    if (!quote) return false;
    return !quote.canSign && !quote.canReject;
  }, [quote]);

  const isExpired = useMemo(() => {
    if (!quote) return false;
    return new Date(quote.validUntil) < new Date() && !["signed", "accepted", "rejected"].includes(quote.status.toLowerCase());
  }, [quote]);

  const currentStatus = responseStatus || quote?.status || "sent";
  const normalizedCurrentStatus = currentStatus.toLowerCase();
  const badge = statusConfig(currentStatus);
  const StatusIcon = badge.icon;
  const companyLogoUrl = resolvePublicAssetUrl(quote?.company.logoUrl);
  const roofEstimateSatelliteUrl = resolvePublicAssetUrl(quote?.roofEstimate?.satelliteImageUrl);
  const roofEstimatePhotos = useMemo(
    () => normalizeRoofEstimatePhotos(quote?.roofEstimate?.photoUrls),
    [quote?.roofEstimate?.photoUrls],
  );

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isClosed || signatureMode !== "draw") return;
    drawingRef.current = true;
    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
      ctx.fillStyle = "#0F172A";
      ctx.fill();
    }
    setHasDrawnSignature(true);
    lastPointRef.current = point;
  };

  const drawSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || signatureMode !== "draw") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const lastPoint = lastPointRef.current;
    if (!canvas || !ctx || !lastPoint) return;

    const point = getCanvasPoint(event);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasDrawnSignature(true);
    lastPointRef.current = point;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handleRespond = async (action: "sign" | "reject") => {
    if (!token || !quote) return;

    const name = fullName.trim();
    const typedValue = typedSignature.trim() || name;
    const drawnSignature = canvasRef.current?.toDataURL("image/png") || "";
    const normalizedSignatureType = signatureMode === "type" ? "typed" : "drawn";

    if (action === "sign" && !name) {
      setError("Full name is required to sign the estimate.");
      return;
    }

    if (action === "sign" && signatureMode === "type" && !typedValue) {
      setError("Type the signature name before signing.");
      return;
    }

    if (action === "sign" && signatureMode === "draw" && (!hasDrawnSignature || !drawnSignature.startsWith("data:image"))) {
      setError("Draw the signature before signing.");
      return;
    }

    if (action === "sign" && !agreeToTerms) {
      setError("Please agree to the estimate terms before signing.");
      return;
    }

    try {
      setResponding(true);
      setError(null);
      const res = await fetch(buildApiUrl(`/public/quotes/${token}/respond`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          signedByName: name,
          signatureType: action === "sign" ? normalizedSignatureType : undefined,
          signatureData: action === "sign" ? (signatureMode === "type" ? typedValue : drawnSignature) : undefined,
          agreeToTerms,
          hasDrawnSignature,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Unable to complete this action.");
      }

      const result = await res.json();
      setResponseStatus(result.status);
      setQuote((current) => current ? {
        ...current,
        status: result.status,
        signedAt: result.status === "SIGNED" ? new Date().toISOString() : current.signedAt,
        signedBy: result.status === "SIGNED" ? name : current.signedBy,
        signatureType: result.status === "SIGNED" ? normalizedSignatureType : current.signatureType,
        isContract: result.status === "SIGNED" ? true : current.isContract,
      } : current);
    } catch (err: any) {
      setError(err.message || "Unable to complete this action.");
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-8 text-center min-w-[280px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0891B2] mx-auto mb-3" />
          <p className="text-sm text-[#475569]">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-8 max-w-lg text-center">
          <div className="w-12 h-12 rounded-md bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] mb-2">Estimate Unavailable</h1>
          <p className="text-sm text-[#475569]">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-[#0891B2]/10 flex items-center justify-center overflow-hidden">
                {companyLogoUrl ? (
                  <img src={companyLogoUrl} alt={quote.company.companyName} className="h-full w-full object-contain" />
                ) : (
                  <FileStack className="h-5 w-5 text-[#0891B2]" />
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#94A3B8]">Estimate Contract</p>
                <h1 className="text-xl font-bold text-[#0F172A]">{quote.company.companyName}</h1>
                <p className="text-sm text-[#475569]">{quote.quoteNumber}</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", badge.bg, badge.text)}>
                <StatusIcon className="h-3.5 w-3.5" />
                {badge.label}
              </span>
              <p className="text-xs text-[#94A3B8]">Version {quote.contractVersion || 1}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-[#F8FAFC] rounded-md">
                  <p className="text-xs text-[#94A3B8] mb-2">Client Details</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{quote.client.name}</p>
                  {quote.client.company && <p className="text-sm text-[#475569]">{quote.client.company}</p>}
                  {quote.client.email && <p className="text-sm text-[#475569]">{quote.client.email}</p>}
                  {quote.client.phone && <p className="text-sm text-[#475569]">{quote.client.phone}</p>}
                  {quote.client.address && <p className="text-sm text-[#475569]">{quote.client.address}</p>}
                </div>
                <div className="p-4 bg-[#F8FAFC] rounded-md">
                  <p className="text-xs text-[#94A3B8] mb-2">Project Details</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{quote.project.jobType || "Roofing Service"}</p>
                  {quote.project.address && <p className="text-sm text-[#475569]">{quote.project.address}</p>}
                  <p className="text-sm text-[#475569]">Issued {formatDate(quote.issueDate)}</p>
                  <p className={cn("text-sm", isExpired ? "text-amber-600 font-medium" : "text-[#475569]")}>Valid until {formatDate(quote.validUntil)}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Scope of Work</p>
                <div className="p-4 bg-[#F8FAFC] rounded-md text-sm text-[#475569] whitespace-pre-line">
                  {quote.scopeOfWork || quote.notes || "Scope is defined by the approved line items below."}
                </div>
              </div>

              {quote.roofEstimate && (
                <div className="mb-6 space-y-4">
                  <p className="text-sm font-semibold text-[#0F172A]">Roof Assessment</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    <div className="p-4 bg-[#F8FAFC] rounded-md">
                      <p className="text-xs text-[#94A3B8] mb-1">Roof Area</p>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {quote.roofEstimate.roofAreaSqft !== null && quote.roofEstimate.roofAreaSqft !== undefined
                          ? `${formatNumber(quote.roofEstimate.roofAreaSqft)} sq ft`
                          : "-"}
                      </p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-md">
                      <p className="text-xs text-[#94A3B8] mb-1">Pitch / Roof Type</p>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {[quote.roofEstimate.pitch, quote.roofEstimate.roofType].filter(Boolean).join(" · ") || "Roofing Estimate"}
                      </p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-md">
                      <p className="text-xs text-[#94A3B8] mb-1">AI Estimate Total</p>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {quote.roofEstimate.totalEstimate !== null && quote.roofEstimate.totalEstimate !== undefined
                          ? formatCurrency(quote.roofEstimate.totalEstimate, quote.currency)
                          : "-"}
                      </p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-md">
                      <p className="text-xs text-[#94A3B8] mb-1">Price Per Sq Ft</p>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {quote.roofEstimate.pricePerSqft !== null && quote.roofEstimate.pricePerSqft !== undefined
                          ? formatCurrency(quote.roofEstimate.pricePerSqft, quote.currency)
                          : "-"}
                      </p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-md">
                      <p className="text-xs text-[#94A3B8] mb-1">Confidence / Source</p>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {quote.roofEstimate.confidence !== null && quote.roofEstimate.confidence !== undefined
                          ? `${formatNumber(quote.roofEstimate.confidence, 1)}%`
                          : "-"}
                        {" · "}
                        {formatMeasurementSource(quote.roofEstimate.measurementSource)}
                      </p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-md">
                      <p className="text-xs text-[#94A3B8] mb-1">Stories / Layers</p>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {[
                          quote.roofEstimate.stories ? `${formatNumber(quote.roofEstimate.stories)} story${quote.roofEstimate.stories === 1 ? "" : "s"}` : null,
                          quote.roofEstimate.layers ? `${formatNumber(quote.roofEstimate.layers)} layer${quote.roofEstimate.layers === 1 ? "" : "s"}` : null,
                        ].filter(Boolean).join(" · ") || "-"}
                      </p>
                    </div>
                  </div>

                  {(roofEstimateSatelliteUrl || roofEstimatePhotos.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {roofEstimateSatelliteUrl && (
                        <div className="border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden bg-[#F8FAFC]">
                          <img
                            src={roofEstimateSatelliteUrl}
                            alt="Roof satellite view"
                            className="w-full h-56 object-cover bg-white"
                          />
                          <div className="p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Satellite View</p>
                            <p className="text-sm text-[#475569] mt-1">{quote.roofEstimate.address || quote.project.address || "Property imagery"}</p>
                          </div>
                        </div>
                      )}

                      {roofEstimatePhotos.map((photo) => (
                        <div key={`${photo.url}-${photo.label}`} className="border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden bg-[#F8FAFC]">
                          <img
                            src={photo.url}
                            alt={photo.label}
                            className="w-full h-56 object-cover bg-white"
                          />
                          <div className="p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Roof Photo</p>
                            <p className="text-sm text-[#475569] mt-1">{photo.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {quote.roofEstimate.takeoff && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-4 bg-[#F8FAFC] rounded-md">
                          <p className="text-xs text-[#94A3B8] mb-1">Material Scenario</p>
                          <p className="text-sm font-semibold text-[#0F172A]">{quote.roofEstimate.takeoff.scenarioName || "-"}</p>
                        </div>
                        <div className="p-4 bg-[#F8FAFC] rounded-md">
                          <p className="text-xs text-[#94A3B8] mb-1">Material Type</p>
                          <p className="text-sm font-semibold text-[#0F172A]">{quote.roofEstimate.takeoff.materialType || "-"}</p>
                        </div>
                        <div className="p-4 bg-[#F8FAFC] rounded-md">
                          <p className="text-xs text-[#94A3B8] mb-1">Adjusted Area</p>
                          <p className="text-sm font-semibold text-[#0F172A]">
                            {quote.roofEstimate.takeoff.adjustedAreaSqft !== null && quote.roofEstimate.takeoff.adjustedAreaSqft !== undefined
                              ? `${formatNumber(quote.roofEstimate.takeoff.adjustedAreaSqft)} sq ft`
                              : "-"}
                          </p>
                        </div>
                        <div className="p-4 bg-[#F8FAFC] rounded-md">
                          <p className="text-xs text-[#94A3B8] mb-1">Takeoff Total</p>
                          <p className="text-sm font-semibold text-[#0F172A]">
                            {quote.roofEstimate.takeoff.totalPrice !== null && quote.roofEstimate.takeoff.totalPrice !== undefined
                              ? formatCurrency(quote.roofEstimate.takeoff.totalPrice, quote.currency)
                              : "-"}
                          </p>
                        </div>
                      </div>

                      {quote.roofEstimate.takeoff.items && quote.roofEstimate.takeoff.items.length > 0 && (
                        <div className="border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-[#F8FAFC]">
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Material</th>
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Category</th>
                                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Quantity</th>
                                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {quote.roofEstimate.takeoff.items.map((item, index) => (
                                  <tr key={item.id || `${item.description}-${index}`} className="border-t border-[rgba(15,23,42,0.06)]">
                                    <td className="px-4 py-3 text-[#0F172A]">{item.description}</td>
                                    <td className="px-4 py-3 text-[#475569]">{item.category || "-"}</td>
                                    <td className="px-4 py-3 text-right text-[#475569]">
                                      {item.totalQuantity !== null && item.totalQuantity !== undefined
                                        ? `${formatNumber(item.totalQuantity, 2)}${item.unit ? ` ${item.unit}` : ""}`
                                        : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-[#0F172A]">
                                      {item.totalPrice !== null && item.totalPrice !== undefined
                                        ? formatCurrency(item.totalPrice, quote.currency)
                                        : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {quote.roofEstimate.notes && (
                    <div className="p-4 bg-[#F8FAFC] rounded-md">
                      <p className="text-xs text-[#94A3B8] mb-2">Roof Estimate Notes</p>
                      <p className="text-sm text-[#475569] whitespace-pre-line">{quote.roofEstimate.notes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Line Items</p>
                <div className="border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC]">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Description</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider w-20">Qty</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider w-28">Rate</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.map((item, index) => (
                        <tr key={`${item.description}-${index}`} className="border-t border-[rgba(15,23,42,0.06)]">
                          <td className="px-4 py-3 text-[#0F172A]">{item.description}</td>
                          <td className="px-4 py-3 text-center text-[#475569]">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-[#475569]">{formatCurrency(item.unitPrice, quote.currency)}</td>
                          <td className="px-4 py-3 text-right font-medium text-[#0F172A]">{formatCurrency(item.total, quote.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-full sm:w-80 p-4 bg-[#F8FAFC] rounded-md space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#475569]">Subtotal</span>
                    <span className="font-medium text-[#0F172A]">{formatCurrency(quote.subtotal, quote.currency)}</span>
                  </div>
                  {quote.taxAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#475569]">Tax ({quote.taxRate}%)</span>
                      <span className="font-medium text-[#0F172A]">{formatCurrency(quote.taxAmount, quote.currency)}</span>
                    </div>
                  )}
                  {quote.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#475569]">Discount</span>
                      <span className="font-medium text-green-600">-{formatCurrency(quote.discountAmount, quote.currency)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-[rgba(15,23,42,0.06)]">
                    <span className="text-[#0F172A]">Total</span>
                    <span className="text-[#0891B2]">{formatCurrency(quote.total, quote.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {quote.terms && (
              <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6">
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Terms & Conditions</p>
                <div className="text-sm text-[#475569] whitespace-pre-line">{quote.terms}</div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6">
              <p className="text-sm font-semibold text-[#0F172A] mb-4">Contract Status</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-[#F8FAFC] rounded-md">
                  <p className="text-xs text-[#94A3B8]">Views</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{quote.viewCount}</p>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-md">
                  <p className="text-xs text-[#94A3B8]">Total</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{formatCurrency(quote.total, quote.currency)}</p>
                </div>
              </div>
              {quote.lastViewedAt && (
                <p className="text-xs text-[#94A3B8]">Last viewed on {formatDate(quote.lastViewedAt)}</p>
              )}
            </div>

            <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6">
              <p className="text-sm font-semibold text-[#0F172A] mb-4">Signature Section</p>

              {quote.requiresDigitalSignature && !isClosed && (
                <div className="p-4 rounded-md bg-blue-50 border border-blue-200 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-[#0891B2] mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">Digital signature required</p>
                      <p className="text-sm text-[#475569]">Please review the estimate details above and complete the signature below to finalize your approval.</p>
                    </div>
                  </div>
                </div>
              )}

              {normalizedCurrentStatus === "signed" && (
                <div className="p-4 rounded-md bg-green-50 border border-green-200 mb-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-700">Contract Active</p>
                      <p className="text-sm text-green-700">Signed by {quote.signedBy || fullName || "Client"} on {formatDate(quote.signedAt || new Date().toISOString())}.</p>
                    </div>
                  </div>
                </div>
              )}

              {normalizedCurrentStatus === "rejected" && (
                <div className="p-4 rounded-md bg-red-50 border border-red-200 mb-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Estimate Rejected</p>
                      <p className="text-sm text-red-700">This estimate has been rejected and is now read-only.</p>
                    </div>
                  </div>
                </div>
              )}

              {isExpired && (
                <div className="p-4 rounded-md bg-amber-50 border border-amber-200 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-700">Estimate Expired</p>
                      <p className="text-sm text-amber-700">This estimate is no longer available for signature.</p>
                    </div>
                  </div>
                </div>
              )}

              {!isClosed && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter your full legal name" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant={signatureMode === "draw" ? "default" : "outline"} className="rounded-md" onClick={() => setSignatureMode("draw")}>
                      Draw Signature
                    </Button>
                    <Button type="button" variant={signatureMode === "type" ? "default" : "outline"} className="rounded-md" onClick={() => setSignatureMode("type")}>
                      Type Signature
                    </Button>
                  </div>

                  {signatureMode === "draw" ? (
                    <div className="space-y-2">
                      <div className="border border-[rgba(15,23,42,0.06)] rounded-md p-3 bg-[#F8FAFC]">
                        <canvas
                          ref={canvasRef}
                          className="w-full h-40 bg-white rounded-md border border-[rgba(15,23,42,0.06)] touch-none"
                          onPointerDown={startDrawing}
                          onPointerMove={drawSignature}
                          onPointerUp={stopDrawing}
                          onPointerLeave={stopDrawing}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" className="rounded-md" onClick={clearCanvas}>
                          Clear Signature
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input value={typedSignature} onChange={(event) => setTypedSignature(event.target.value)} placeholder="Type your signature" />
                      <div className="border border-[rgba(15,23,42,0.06)] rounded-md p-4 bg-[#F8FAFC] min-h-[88px] flex items-center">
                        <span className="text-2xl italic text-[#0F172A]">{typedSignature || fullName || "Your signature will appear here"}</span>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-[#F8FAFC] rounded-md">
                    <p className="text-xs text-[#94A3B8]">Date</p>
                    <p className="text-sm font-medium text-[#0F172A]">{formatDate(new Date().toISOString())}</p>
                  </div>

                  <label className="flex items-start gap-3 rounded-md p-3 bg-[#F8FAFC] cursor-pointer">
                    <Checkbox checked={agreeToTerms} onCheckedChange={(checked) => setAgreeToTerms(Boolean(checked))} />
                    <span className="text-sm text-[#475569]">I agree to the estimate, scope of work, taxes, and terms shown above.</span>
                  </label>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      className="rounded-md bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
                      disabled={responding || !quote.canSign}
                      onClick={() => handleRespond("sign")}
                    >
                      {responding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Sign Contract
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-md text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
                      disabled={responding || !quote.canReject}
                      onClick={() => handleRespond("reject")}
                    >
                      Reject Estimate
                    </Button>
                  </div>
                </div>
              )}

              {isClosed && quote.signedBy && (
                <div className="p-4 bg-[#F8FAFC] rounded-md">
                  <p className="text-xs text-[#94A3B8] mb-1">Signed By</p>
                  <p className="text-sm font-semibold text-[#0F172A]">{quote.signedBy}</p>
                  <p className="text-xs text-[#94A3B8] mt-2">Signed On</p>
                  <p className="text-sm font-medium text-[#0F172A]">{formatDate(quote.signedAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
