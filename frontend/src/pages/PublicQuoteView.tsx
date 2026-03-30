import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, FileStack, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.zodo.ca/api/v1";

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
  signedAt?: string | null;
  signedBy?: string | null;
  signatureType?: string | null;
  isContract?: boolean;
  contractVersion?: number;
  canSign: boolean;
  canReject: boolean;
}

const formatCurrency = (value: number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(value);

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : "-";

const statusConfig = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "signed" || normalized === "accepted") {
    return { bg: "bg-green-100", text: "text-green-600", icon: CheckCircle2, label: "Signed" };
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

export default function PublicQuoteView() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");
  const [fullName, setFullName] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(true);
  const [responseStatus, setResponseStatus] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadQuote = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/public/quotes/${token}`);
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.message || "Estimate not found or link has expired.");
        }
        const data = await res.json();
        setQuote(data);
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
  }, [quote, signatureMode]);

  const isClosed = useMemo(() => {
    if (!quote) return false;
    return ["signed", "accepted", "rejected", "expired"].includes(quote.status.toLowerCase());
  }, [quote]);

  const isExpired = useMemo(() => {
    if (!quote) return false;
    return new Date(quote.validUntil) < new Date() && !["signed", "accepted", "rejected"].includes(quote.status.toLowerCase());
  }, [quote]);

  const currentStatus = responseStatus || quote?.status || "sent";
  const normalizedCurrentStatus = currentStatus.toLowerCase();
  const badge = statusConfig(currentStatus);
  const StatusIcon = badge.icon;

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
    lastPointRef.current = getCanvasPoint(event);
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
  };

  const handleRespond = async (action: "sign" | "reject") => {
    if (!token || !quote) return;

    const name = fullName.trim();
    const typedValue = typedSignature.trim() || name;
    const drawnSignature = canvasRef.current?.toDataURL("image/png") || "";

    if (action === "sign" && !name) {
      setError("Full name is required to sign the estimate.");
      return;
    }

    if (action === "sign" && signatureMode === "type" && !typedValue) {
      setError("Type the signature name before signing.");
      return;
    }

    if (action === "sign" && signatureMode === "draw" && (!drawnSignature || drawnSignature === "data:,")) {
      setError("Draw the signature before signing.");
      return;
    }

    try {
      setResponding(true);
      setError(null);
      const res = await fetch(`${API_BASE}/public/quotes/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          signedByName: name,
          signatureType: action === "sign" ? signatureMode : undefined,
          signatureData: action === "sign" ? (signatureMode === "type" ? typedValue : drawnSignature) : undefined,
          agreeToTerms,
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
        signatureType: result.status === "SIGNED" ? signatureMode : current.signatureType,
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
                {quote.company.logoUrl ? (
                  <img src={quote.company.logoUrl} alt={quote.company.companyName} className="h-full w-full object-contain" />
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

              {(normalizedCurrentStatus === "signed" || normalizedCurrentStatus === "accepted") && (
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
