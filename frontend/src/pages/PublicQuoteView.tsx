import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileStack, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.zodo.ca/api/v1";

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
    clientName: string;
    recipientType: string;
    issueDate: string;
    validUntil: string;
    currency: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    notes?: string;
    terms?: string;
    items: QuoteItem[];
}

const formatCurrency = (val: number, currency = "CAD") =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(val);

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

export default function PublicQuoteView() {
    const { token } = useParams<{ token: string }>();
    const [quote, setQuote] = useState<PublicQuote | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [responding, setResponding] = useState(false);
    const [responseResult, setResponseResult] = useState<{ status: string; quoteNumber: string } | null>(null);

    useEffect(() => {
        if (!token) return;
        fetch(`${API_BASE}/public/quotes/${token}`)
            .then(r => {
                if (!r.ok) throw new Error("Quote not found or link has expired.");
                return r.json();
            })
            .then(data => { setQuote(data); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, [token]);

    const handleRespond = async (action: "accept" | "reject") => {
        if (!token) return;
        setResponding(true);
        try {
            const res = await fetch(`${API_BASE}/public/quotes/${token}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to respond to quote.");
            }
            const result = await res.json();
            setResponseResult(result);
            setQuote(prev => prev ? { ...prev, status: result.status } : prev);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setResponding(false);
        }
    };

    // ── Loading state ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex items-center justify-center">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-[#0891B2] animate-spin" />
                    <p className="text-slate-500 font-medium">Loading quote...</p>
                </motion.div>
            </div>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────
    if (error && !quote) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-red-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Quote Not Found</h2>
                    <p className="text-slate-500">{error}</p>
                </motion.div>
            </div>
        );
    }

    if (!quote) return null;

    const isExpired = new Date(quote.validUntil) < new Date() && !["ACCEPTED", "DECLINED"].includes(quote.status);
    const canRespond = quote.status === "SENT" && !isExpired;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0891B2] to-[#0E7490] py-6">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <FileStack className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg tracking-tight">ZODO</h1>
                            <p className="text-white/70 text-xs">Professional Quote</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-white font-semibold">{quote.quoteNumber}</p>
                        <p className="text-white/70 text-xs">Issued {formatDate(quote.issueDate)}</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">

                    {/* Status Banner */}
                    <AnimatePresence mode="wait">
                        {responseResult ? (
                            <motion.div key="result" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className={`px-6 py-4 flex items-center gap-3 ${responseResult.status === "ACCEPTED" ? "bg-emerald-50 border-b border-emerald-100" : "bg-red-50 border-b border-red-100"}`}>
                                {responseResult.status === "ACCEPTED" ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                                )}
                                <div>
                                    <p className={`font-semibold ${responseResult.status === "ACCEPTED" ? "text-emerald-800" : "text-red-800"}`}>
                                        Quote {responseResult.status === "ACCEPTED" ? "Accepted" : "Declined"}
                                    </p>
                                    <p className={`text-sm ${responseResult.status === "ACCEPTED" ? "text-emerald-600" : "text-red-600"}`}>
                                        {responseResult.status === "ACCEPTED"
                                            ? "Thank you! We'll be in touch shortly to get started."
                                            : "The quote has been declined. Feel free to reach out if you change your mind."}
                                    </p>
                                </div>
                            </motion.div>
                        ) : quote.status === "ACCEPTED" ? (
                            <motion.div key="accepted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                <p className="font-semibold text-emerald-800">This quote has been accepted</p>
                            </motion.div>
                        ) : quote.status === "DECLINED" ? (
                            <motion.div key="declined" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
                                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                                <p className="font-semibold text-red-800">This quote has been declined</p>
                            </motion.div>
                        ) : isExpired ? (
                            <motion.div key="expired" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                                <p className="font-semibold text-amber-800">This quote has expired</p>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>

                    {/* Quote Details */}
                    <div className="p-6 sm:p-8">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Prepared For</p>
                                <p className="text-sm font-semibold text-slate-900">{quote.clientName}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Valid Until</p>
                                <p className={`text-sm font-semibold ${isExpired ? "text-red-600" : "text-slate-900"}`}>{formatDate(quote.validUntil)}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Currency</p>
                                <p className="text-sm font-semibold text-slate-900">{quote.currency}</p>
                            </div>
                            <div className="bg-[#0891B2]/5 rounded-xl p-4">
                                <p className="text-[11px] uppercase tracking-wider text-[#0891B2]/60 font-semibold mb-1">Total</p>
                                <p className="text-lg font-bold text-[#0891B2]">{formatCurrency(quote.total, quote.currency)}</p>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="mb-8">
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Line Items</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-slate-100">
                                            <th className="py-3 px-4 text-left font-semibold text-slate-500 text-xs uppercase tracking-wider">Description</th>
                                            <th className="py-3 px-4 text-center font-semibold text-slate-500 text-xs uppercase tracking-wider w-20">Qty</th>
                                            <th className="py-3 px-4 text-right font-semibold text-slate-500 text-xs uppercase tracking-wider w-28">Rate</th>
                                            <th className="py-3 px-4 text-right font-semibold text-slate-500 text-xs uppercase tracking-wider w-28">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quote.items.map((item, i) => (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-4 text-slate-800">{item.description}</td>
                                                <td className="py-3 px-4 text-center text-slate-600">{item.quantity}</td>
                                                <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(item.unitPrice, quote.currency)}</td>
                                                <td className="py-3 px-4 text-right font-medium text-slate-900">{formatCurrency(item.total, quote.currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-8">
                            <div className="w-full sm:w-72 space-y-2">
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>Subtotal</span>
                                    <span className="font-medium">{formatCurrency(quote.subtotal, quote.currency)}</span>
                                </div>
                                {quote.taxRate > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>Tax ({quote.taxRate}%)</span>
                                        <span className="font-medium">{formatCurrency(quote.taxAmount, quote.currency)}</span>
                                    </div>
                                )}
                                {quote.discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>Discount</span>
                                        <span className="font-medium">-{formatCurrency(quote.discountAmount, quote.currency)}</span>
                                    </div>
                                )}
                                <div className="border-t-2 border-slate-200 pt-2 flex justify-between">
                                    <span className="font-bold text-slate-900">Total</span>
                                    <span className="font-bold text-lg text-[#0891B2]">{formatCurrency(quote.total, quote.currency)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes & Terms */}
                        {(quote.notes || quote.terms) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                {quote.notes && (
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                                        <p className="text-sm text-slate-600 whitespace-pre-line">{quote.notes}</p>
                                    </div>
                                )}
                                {quote.terms && (
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Terms & Conditions</p>
                                        <p className="text-sm text-slate-600 whitespace-pre-line">{quote.terms}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Accept / Reject Buttons */}
                        {canRespond && !responseResult && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => handleRespond("accept")}
                                    disabled={responding}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {responding ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    Accept Quote
                                </button>
                                <button
                                    onClick={() => handleRespond("reject")}
                                    disabled={responding}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-red-600 font-semibold rounded-xl border-2 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {responding ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                                    Decline Quote
                                </button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Footer */}
                <div className="text-center py-8">
                    <p className="text-slate-400 text-xs">© {new Date().getFullYear()} ZODO · All rights reserved</p>
                </div>
            </div>
        </div>
    );
}
