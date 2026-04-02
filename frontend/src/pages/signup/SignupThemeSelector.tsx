/**
 * SIGNUP THEME SELECTOR
 * ─────────────────────
 * Wraps all 3 themes with a floating theme picker (bottom-right).
 * Default: Theme 2 (Friendly) — best for target audience.
 * Preserves form state when switching themes.
 */

import { useState, lazy, Suspense } from "react";
import { Loader2, Palette } from "lucide-react";

const SignupMinimal = lazy(() => import("./SignupMinimal"));
const SignupFriendly = lazy(() => import("./SignupFriendly"));
const SignupEnterprise = lazy(() => import("./SignupEnterprise"));

type ThemeKey = "minimal" | "friendly" | "enterprise";

const THEMES: Array<{
  key: ThemeKey;
  label: string;
  desc: string;
  color: string;
}> = [
  {
    key: "minimal",
    label: "Clean Minimal",
    desc: "Stripe / Linear",
    color: "#475569",
  },
  {
    key: "friendly",
    label: "Soft Friendly",
    desc: "Rounded CRM",
    color: "#0891B2",
  },
  {
    key: "enterprise",
    label: "Premium Enterprise",
    desc: "Structured",
    color: "#0F172A",
  },
];

function getInitialTheme(): ThemeKey {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("theme") as ThemeKey | null;
    if (t && THEMES.some((th) => th.key === t)) return t;
  }
  return "friendly";
}

export default function SignupThemeSelector() {
  const [theme, setTheme] = useState<ThemeKey>(getInitialTheme);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loading = (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F8FAFC",
        fontFamily: "Urbanist, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 24px",
          borderRadius: 99,
          backgroundColor: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
          fontSize: 14,
          fontWeight: 600,
          color: "#475569",
        }}
      >
        <Loader2
          style={{
            width: 16,
            height: 16,
            color: "#0891B2",
            animation: "spin 1s linear infinite",
          }}
        />
        Loading theme…
      </div>
    </div>
  );

  return (
    <>
      {/* Render the active theme */}
      <Suspense fallback={loading}>
        {theme === "minimal" && <SignupMinimal />}
        {theme === "friendly" && <SignupFriendly />}
        {theme === "enterprise" && <SignupEnterprise />}
      </Suspense>

      {/* ── Floating theme picker ── */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9999,
          fontFamily: "Urbanist, system-ui, sans-serif",
        }}
      >
        {/* Picker panel */}
        {pickerOpen && (
          <div
            style={{
              marginBottom: 10,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 12px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)",
              padding: "14px",
              width: 220,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#94A3B8",
                marginBottom: 10,
                paddingLeft: 4,
              }}
            >
              Switch theme
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {THEMES.map((t) => {
                const active = theme === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTheme(t.key);
                      setPickerOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1.5px solid ${active ? "#0891B2" : "transparent"}`,
                      backgroundColor: active ? "rgba(8,145,178,0.06)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 200ms ease",
                      fontFamily: "Urbanist, system-ui, sans-serif",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        backgroundColor: t.color,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {active && (
                        <svg width="12" height="12" viewBox="0 0 24 24" stroke="#FFF" strokeWidth="3" fill="none">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0F172A",
                          lineHeight: 1.2,
                        }}
                      >
                        {t.label}
                      </p>
                      <p style={{ fontSize: 11, color: "#94A3B8" }}>{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          aria-label="Switch Theme"
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #0891B2, #0E7490)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(8,145,178,0.3)",
            transition: "all 250ms ease",
          }}
        >
          <Palette style={{ width: 20, height: 20 }} />
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
