// src/pages/RoofEstimator.tsx — Estimates Landing Page (redesigned)

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getEstimates,
  getEstimateStatistics,
  checkAiHealth,
  deleteEstimate,
  type RoofEstimate,
  type EstimateStatistics,
} from "@/features/roof-estimator/services/roof-estimator-service";
import { useToast } from "@/hooks/use-toast";

/* ─── Helpers ──────────────────────────────────────────────── */

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtArea = (n: number | null | undefined) =>
  n != null ? `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} sq ft` : "—";
const fmtPct = (n: number | null | undefined) =>
  n != null ? `${n.toFixed(1)}%` : "—";
const short = (id: string) => id.slice(0, 8).toUpperCase();
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "rgba(245,158,11,.12)", text: "#B45309", dot: "#F59E0B" },
  completed: { bg: "rgba(16,185,129,.12)", text: "#047857", dot: "#10B981" },
  sent: { bg: "rgba(59,130,246,.12)", text: "#1D4ED8", dot: "#3B82F6" },
};

/* ─── Stat Card ────────────────────────────────────────────── */

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "20px 22px", flex: "1 1 200px",
      boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", gap: 16,
      border: "1px solid #E2E8F0",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center",
        justifyContent: "center", background: "linear-gradient(135deg,#0891B2,#06B6D4)",
        color: "#fff", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Status Badge ─────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
      borderRadius: 20, background: c.bg, color: c.text, fontSize: 12, fontWeight: 600,
      textTransform: "capitalize",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
      {status}
    </span>
  );
}

/* ─── Delete Confirm Dialog ─────────────────────────────────── */

function DeleteDialog({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center",
      justifyContent: "center", background: "rgba(0,0,0,.45)",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 400, width: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,.18)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
          Delete Estimate
        </div>
        <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Are you sure you want to delete this estimate? This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={loading} style={{
            padding: "9px 18px", borderRadius: 8, border: "1px solid #CBD5E1",
            background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: "9px 18px", borderRadius: 8, border: "none",
            background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}>{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */

export default function RoofEstimator() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [estimates, setEstimates] = useState<RoofEstimate[]>([]);
  const [stats, setStats] = useState<EstimateStatistics | null>(null);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load data
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [est, st, health] = await Promise.all([
          getEstimates(),
          getEstimateStatistics(),
          checkAiHealth(),
        ]);
        setEstimates(est);
        setStats(st);
        setAiOnline(health);
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "Failed to load estimates", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered list
  const filtered = useMemo(() => {
    let list = estimates;
    if (filterStatus !== "all") list = list.filter((e) => e.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.address.toLowerCase().includes(q) ||
          e.client?.clientName?.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [estimates, filterStatus, search]);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteEstimate(deleteId);
      setEstimates((prev) => prev.filter((e) => e.id !== deleteId));
      toast({ title: "Deleted", description: "Estimate removed successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to delete estimate", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  /* counts */
  const draftCount = estimates.filter((e) => e.status === "draft").length;
  const completedCount = estimates.filter((e) => e.status === "completed").length;
  const sentCount = estimates.filter((e) => e.status === "sent").length;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1320, margin: "0 auto", fontFamily: "'Inter',sans-serif" }}>
      {/* ── Header ────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", margin: 0 }}>AI Roof Estimator</h1>
            {aiOnline !== null && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
                borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: aiOnline ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)",
                color: aiOnline ? "#047857" : "#B91C1C",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: aiOnline ? "#10B981" : "#EF4444" }} />
                {aiOnline ? "AI Online" : "AI Offline"}
              </span>
            )}
          </div>
          <p style={{ color: "#64748B", fontSize: 14, marginTop: 4 }}>
            Manage roof estimates, create new AI-powered estimates, and track project pricing.
          </p>
        </div>
        <button onClick={() => navigate("/roof-estimator/new")} style={{
          padding: "11px 22px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#0891B2,#0E7490)", color: "#fff",
          fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 2px 8px rgba(8,145,178,.25)", transition: "transform .15s",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create AI Estimate
        </button>
      </div>

      {/* ── Stats ─────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Estimates" value={stats ? String(stats.totalEstimates) : "—"} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>} />
        <StatCard label="Total Revenue" value={stats ? fmt(stats.totalRevenue) : "—"} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
        <StatCard label="Avg Roof Area" value={stats ? fmtArea(stats.avgRoofArea) : "—"} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 21 12 3 21 21"/></svg>} />
        <StatCard label="Avg Confidence" value={stats ? fmtPct(stats.avgConfidence) : "—"} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} />
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16,
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search by address, client, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px 9px 36px", borderRadius: 8,
              border: "1px solid #CBD5E1", fontSize: 13, outline: "none",
              background: "#fff", color: "#0F172A",
            }}
          />
        </div>
        {/* Status filter tabs */}
        <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 8, padding: 3 }}>
          {[
            { label: "All", val: "all", count: estimates.length },
            { label: "Draft", val: "draft", count: draftCount },
            { label: "Completed", val: "completed", count: completedCount },
            { label: "Sent", val: "sent", count: sentCount },
          ].map((t) => (
            <button
              key={t.val}
              onClick={() => setFilterStatus(t.val)}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: filterStatus === t.val ? "#fff" : "transparent",
                color: filterStatus === t.val ? "#0891B2" : "#64748B",
                boxShadow: filterStatus === t.val ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                transition: "all .15s",
              }}
            >
              {t.label} <span style={{ opacity: 0.7 }}>({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Estimates Table ─────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Estimate ID", "Client", "Address", "Roof Area", "Price", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "12px 16px", fontWeight: 600,
                    color: "#64748B", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "#94A3B8" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, border: "3px solid #E2E8F0", borderTopColor: "#0891B2",
                      borderRadius: "50%", animation: "spin 1s linear infinite",
                    }} />
                    Loading estimates…
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: "#94A3B8" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                    <span>No estimates found</span>
                    <button onClick={() => navigate("/roof-estimator/new")} style={{
                      marginTop: 8, padding: "8px 18px", borderRadius: 8, border: "none",
                      background: "#0891B2", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>Create your first estimate</button>
                  </div>
                </td></tr>
              ) : (
                filtered.map((est) => (
                  <tr key={est.id} style={{
                    borderBottom: "1px solid #F1F5F9", transition: "background .1s",
                  }} onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                     onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#475569", fontWeight: 500 }}>
                      {short(est.id)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#0F172A", fontWeight: 500 }}>
                      {est.client?.clientName || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {est.address}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569" }}>
                      {fmtArea(est.roofAreaSqft)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#0F172A", fontWeight: 600 }}>
                      {fmt(est.finalEstimatePrice ?? est.totalEstimate)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge status={est.status || "draft"} />
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B", whiteSpace: "nowrap" }}>
                      {fmtDate(est.createdAt)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {/* View PDF */}
                        {est.pdfUrl && (
                          <button title="View Report" onClick={() => window.open(est.pdfUrl!, "_blank")} style={{
                            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: 6, border: "1px solid #DBEAFE", background: "#EFF6FF", cursor: "pointer",
                            color: "#2563EB", transition: "all .15s",
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                          </button>
                        )}
                        {/* Download PDF */}
                        {est.pdfUrl && (
                          <a href={est.pdfUrl} download title="Download PDF" style={{
                            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: 6, border: "1px solid #D1FAE5", background: "#ECFDF5", cursor: "pointer",
                            color: "#059669", transition: "all .15s", textDecoration: "none",
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                          </a>
                        )}
                        {/* Edit */}
                        <button title="Edit" onClick={() => navigate(`/roof-estimator/${est.id}/edit`)} style={{
                          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer",
                          color: "#475569", transition: "all .15s",
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        {/* Delete */}
                        <button title="Delete" onClick={() => setDeleteId(est.id)} style={{
                          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: 6, border: "1px solid #FEE2E2", background: "#FFF5F5", cursor: "pointer",
                          color: "#EF4444", transition: "all .15s",
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm */}
      <DeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} />

      {/* Spinner animation */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
