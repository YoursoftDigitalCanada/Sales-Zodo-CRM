import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/Images/Logo/logo.png";
import { navLinks, whyZodoItems } from "@/data/siteContent";

export const T = {
  pageBg: "#F6FBFD",
  heroBg: "#F1F8FB",
  surface: "#FFFFFF",
  surfaceMuted: "#F7FBFD",
  surfaceTint: "#EEF8FC",
  primary: "#0891B2",
  primaryDark: "#0E7490",
  accent: "#22D3EE",
  accentSoft: "#E0F7FA",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "rgba(15, 23, 42, 0.08)",
  borderStrong: "rgba(8, 145, 178, 0.18)",
  glow: "rgba(34, 211, 238, 0.24)",
  shadowSoft: "0 18px 50px rgba(15, 23, 42, 0.05)",
  shadowHover: "0 22px 56px rgba(14, 116, 144, 0.14)",
  shadowPanel: "0 18px 45px rgba(15, 23, 42, 0.10)",
  ctaDark: "#0F172A",
  ctaDark2: "#164E63",
};

export const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

export function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.14 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 620ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 620ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function SectionShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function BrandMark({ size = "header" }: { size?: "header" | "footer" }) {
  const imageClass =
    size === "footer"
      ? "h-11 w-auto max-w-[170px] object-contain"
      : "h-11 w-auto max-w-[180px] object-contain sm:h-12";

  return (
    <img src={logo} alt="ZODO" className={imageClass} />
  );
}

export function PrimaryAction({
  children,
  onClick,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})`,
        boxShadow: "0 12px 28px rgba(8, 145, 178, 0.18)",
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryAction({
  children,
  onClick,
  dark = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  dark?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={
        dark
          ? {
              color: "#FFFFFF",
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.10)",
            }
          : {
              color: T.textPrimary,
              border: `1px solid ${T.border}`,
              background: T.surface,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
            }
      }
    >
      {children}
    </button>
  );
}

export function CardSurface({
  children,
  className = "",
  bordered = false,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cx("relative overflow-hidden rounded-[2rem] transition-all duration-200 hover:-translate-y-1", className)}
      style={{
        border: bordered ? `1px solid ${T.borderStrong}` : `1px solid ${T.border}`,
        background: "rgba(255,255,255,0.94)",
        boxShadow: T.shadowSoft,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow = T.shadowHover;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = T.shadowSoft;
      }}
    >
      {children}
    </div>
  );
}

export function SitePageShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  const startTrial = () => navigate("/contact?intent=trial");
  const signIn = () => navigate("/login");

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: T.pageBg,
        color: T.textPrimary,
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          borderColor: T.border,
          background: scrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.82)",
        }}
      >
        <SectionShell className="flex items-center justify-between gap-6 py-4">
          <button type="button" className="text-left" onClick={() => navigate("/")}>
            <BrandMark />
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((item) => {
              const active = location.pathname === item.href;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: active ? T.textPrimary : T.textSecondary }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <SecondaryAction onClick={signIn}>Sign In</SecondaryAction>
            <PrimaryAction onClick={startTrial}>
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </PrimaryAction>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="rounded-xl p-2 md:hidden"
            style={{ color: T.textPrimary }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </SectionShell>

        {mobileMenuOpen && (
          <div className="border-t bg-white px-4 py-4 md:hidden" style={{ borderColor: T.border }}>
            <SectionShell className="space-y-2 px-0">
              {navLinks.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="block w-full rounded-xl px-2 py-2 text-left text-sm font-semibold"
                  style={{ color: location.pathname === item.href ? T.textPrimary : T.textSecondary }}
                >
                  {item.label}
                </button>
              ))}
              <div className="flex flex-col gap-2 pt-3">
                <SecondaryAction onClick={signIn}>Sign In</SecondaryAction>
                <PrimaryAction onClick={startTrial}>
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </PrimaryAction>
              </div>
            </SectionShell>
          </div>
        )}
      </header>

      <main className="relative overflow-hidden">{children}</main>

      <footer className="border-t bg-white py-10" style={{ borderColor: T.border }}>
        <SectionShell className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <FadeIn className="max-w-md">
            <BrandMark size="footer" />
            <p className="mt-2 text-sm leading-7" style={{ color: T.textSecondary }}>
              Premium roofing CRM storytelling built around one promise: lead to payment, faster.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryAction onClick={startTrial}>
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </PrimaryAction>
              <SecondaryAction onClick={signIn}>Sign In</SecondaryAction>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: T.textMuted }}>
              Pages
            </p>
            <div className="mt-4 grid gap-3 text-sm" style={{ color: T.textSecondary }}>
              {navLinks.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="text-left transition-colors duration-200 hover:text-slate-950"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={140}>
            <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: T.textMuted }}>
              Why ZODO
            </p>
            <div className="mt-4 grid gap-3 text-sm leading-7" style={{ color: T.textSecondary }}>
              {whyZodoItems.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" style={{ color: T.primary }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </SectionShell>
      </footer>
    </div>
  );
}
