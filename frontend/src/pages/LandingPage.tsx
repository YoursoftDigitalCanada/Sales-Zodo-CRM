import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  MapPinned,
  Menu,
  Sparkles,
  X,
} from "lucide-react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1635424824800-692767998d07?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwyfHxjb250cmFjdG9yJTIwd29ya2luZyUyMG9uJTIwcm9vZnxlbnwwfHx8fDE3NzYxOTg2ODJ8MA&ixlib=rb-4.1.0&q=85";

const T = {
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

type NavLinkItem = {
  label: string;
  target: string;
};

type StatItem = {
  value: string;
  label: string;
};

type WorkflowStep = {
  title: string;
  description: string;
};

type FeatureItem = {
  title: string;
  description: string;
};

const navLinks: NavLinkItem[] = [
  { label: "Home", target: "top" },
  { label: "Product", target: "workflow" },
  { label: "Solutions", target: "features" },
  { label: "AI Estimator", target: "hero-address" },
  { label: "Pricing", target: "final-cta" },
  { label: "Contact", target: "footer" },
];

const homeStats: StatItem[] = [
  { value: "Address-first", label: "AI estimator starts with property location, not photo upload." },
  { value: "Lead → Payment", label: "The full roofing money pipeline is kept in one system." },
  { value: "Action Center", label: "Daily priorities surface follow-ups, visits, estimates, and invoices." },
  { value: "Built for roofers", label: "Field teams, sales teams, and operations stay aligned." },
];

const workflowSteps: WorkflowStep[] = [
  {
    title: "Lead comes in",
    description: "Every opportunity starts with clean intake, clear ownership, and immediate action.",
  },
  {
    title: "Estimate gets generated",
    description: "Use address-based AI estimation or manual workflow to move quoting faster.",
  },
  {
    title: "Client approves",
    description: "The estimate becomes active work with less back-and-forth and less delay.",
  },
  {
    title: "Job progresses",
    description: "Crews, deadlines, documents, and updates stay connected inside the same workflow.",
  },
  {
    title: "Invoice and payment",
    description: "Billing stays tied to job reality so revenue is easier to collect and protect.",
  },
];

const homeFeatures: FeatureItem[] = [
  {
    title: "Address-to-estimate AI",
    description: "Enter the property address, let ZODO analyze roof data, and move toward an estimate faster.",
  },
  {
    title: "Action-driven dashboard",
    description: "The system tells the team what deserves attention today instead of burying work in passive screens.",
  },
  {
    title: "Auto invoice builder",
    description: "Finance stays tied to job progress so teams stop rebuilding invoices from scratch.",
  },
  {
    title: "Missed revenue alerts",
    description: "ZODO surfaces stalled deals, overdue invoices, and pipeline leaks before money disappears.",
  },
];

const whyZodoItems = [
  "Address-based AI estimator positioning",
  "Action-driven workflow for roofing teams",
  "Lead, estimate, job, invoice, payment in one system",
];

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
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

function SectionShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold text-white"
        style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}
      >
        Z
      </div>
      <div>
        <div className="text-lg font-semibold tracking-[0.18em]" style={{ color: T.textPrimary }}>
          ZODO
        </div>
        <div className="text-xs uppercase tracking-[0.22em]" style={{ color: T.textMuted }}>
          Roofing revenue OS
        </div>
      </div>
    </div>
  );
}

function PrimaryAction({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all duration-200",
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

function SecondaryAction({
  children,
  onClick,
  dark = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  dark?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200",
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

function CardSurface({
  children,
  className = "",
  bordered = false,
}: {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cx("relative overflow-hidden rounded-[2rem] transition-all duration-200", className)}
      style={{
        border: bordered ? `1px solid ${T.borderStrong}` : `1px solid ${T.border}`,
        background: "rgba(255,255,255,0.94)",
        boxShadow: T.shadowSoft,
      }}
    >
      {children}
    </div>
  );
}

function HeroAddressBar({
  onSubmit,
}: {
  onSubmit: (address: string) => void;
}) {
  const [address, setAddress] = useState("");

  return (
    <form
      id="hero-address"
      onSubmit={(event) => {
        event.preventDefault();
        const value = address.trim();
        if (!value) return;
        onSubmit(value);
      }}
      className="flex flex-col gap-3 rounded-[2rem] border bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-300 focus-within:-translate-y-[2px] md:flex-row md:items-center"
      style={{ borderColor: T.border }}
    >
      <div className="flex items-center gap-3 px-2" style={{ color: T.textSecondary }}>
        <MapPin className="h-5 w-5" style={{ color: T.primary }} />
        <span className="hidden text-xs font-bold uppercase tracking-[0.22em] md:inline">
          Property address
        </span>
      </div>
      <input
        type="text"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="Enter property address"
        className="h-12 flex-1 rounded-full border border-transparent px-5 text-sm outline-none"
        style={{
          background: T.surfaceMuted,
          color: T.textPrimary,
        }}
      />
      <PrimaryAction className="py-3.5" onClick={() => address.trim() && onSubmit(address.trim())}>
        <Sparkles className="h-4 w-4" />
        Generate Estimate
      </PrimaryAction>
    </form>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTarget = (target: string) => {
    setMobileMenuOpen(false);
    if (target === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleEstimateRequest = (address?: string) => {
    const suffix = address ? `?intent=estimate&address=${encodeURIComponent(address)}` : "?intent=estimate";
    navigate(`/signup${suffix}`);
  };

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
          <button type="button" className="text-left" onClick={() => scrollToTarget("top")}>
            <BrandMark />
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => scrollToTarget(item.target)}
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: T.textSecondary }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <SecondaryAction onClick={() => scrollToTarget("hero-address")}>Request Estimate</SecondaryAction>
            <PrimaryAction onClick={() => navigate("/signup")}>Start Free Trial</PrimaryAction>
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
                  onClick={() => scrollToTarget(item.target)}
                  className="block w-full rounded-xl px-2 py-2 text-left text-sm font-semibold"
                  style={{ color: T.textSecondary }}
                >
                  {item.label}
                </button>
              ))}
              <div className="flex flex-col gap-2 pt-3">
                <SecondaryAction onClick={() => scrollToTarget("hero-address")}>Request Estimate</SecondaryAction>
                <PrimaryAction onClick={() => navigate("/signup")}>Start Free Trial</PrimaryAction>
              </div>
            </SectionShell>
          </div>
        )}
      </header>

      <main className="relative overflow-hidden">
        <section
          className="relative overflow-hidden py-16 md:py-24"
          style={{ background: T.heroBg }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at top left, rgba(8,145,178,0.12), transparent 25%), radial-gradient(circle at top right, rgba(34,211,238,0.12), transparent 22%)`,
            }}
          />
          <SectionShell className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <FadeIn className="space-y-8">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.24em]"
                style={{
                  borderColor: "rgba(8,145,178,0.18)",
                  background: "rgba(8,145,178,0.08)",
                  color: T.primaryDark,
                }}
              >
                <Sparkles className="h-4 w-4" />
                Premium roofing CRM
              </div>

              <div className="space-y-5">
                <h1
                  className="max-w-4xl text-5xl font-bold leading-none tracking-[-0.06em] md:text-6xl lg:text-7xl"
                  style={{ color: T.textPrimary }}
                >
                  The roofing revenue system that starts estimates with an address.
                </h1>
                <p
                  className="max-w-2xl text-base leading-8 md:text-lg"
                  style={{ color: T.textSecondary }}
                >
                  ZODO helps contractors move from lead to payment faster with address-based AI estimating, action-driven follow-up, and one clean operating flow for sales, jobs, invoicing, and collections.
                </p>
              </div>

              <HeroAddressBar onSubmit={handleEstimateRequest} />

              <div className="flex flex-col gap-4 sm:flex-row">
                <PrimaryAction onClick={() => navigate("/signup")} className="px-7 py-3.5">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </PrimaryAction>
                <SecondaryAction onClick={() => scrollToTarget("hero-address")} className="px-7 py-3.5">
                  Request Estimate
                </SecondaryAction>
              </div>
            </FadeIn>

            <FadeIn className="relative" delay={120}>
              <div
                className="pointer-events-none absolute -inset-10 rounded-[2.5rem] blur-3xl"
                style={{ background: `radial-gradient(circle, ${T.glow} 0%, transparent 72%)` }}
              />
              <CardSurface className="p-5 md:p-7">
                <img
                  src={HERO_IMAGE}
                  alt="Roofing contractor working on a roof"
                  className="h-[420px] w-full rounded-[1.8rem] object-cover md:h-[520px]"
                />

                <div
                  className="mt-4 flex max-w-[18rem] items-start gap-3 rounded-[1.5rem] border p-4 lg:absolute lg:-top-4 lg:right-[-12px] lg:mt-0"
                  style={{
                    borderColor: "rgba(255,255,255,0.8)",
                    background: "rgba(255,255,255,0.92)",
                    boxShadow: T.shadowPanel,
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <MapPinned className="mt-0.5 h-5 w-5 shrink-0" style={{ color: T.accent }} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em]" style={{ color: T.textMuted }}>
                      AI Estimator
                    </p>
                    <p className="mt-1 text-lg font-semibold" style={{ color: T.textPrimary }}>
                      Address → Roof analysis → Estimate flow
                    </p>
                  </div>
                </div>

                <div
                  className="mt-4 flex max-w-[18rem] items-start gap-3 rounded-[1.5rem] border p-4 lg:absolute lg:bottom-6 lg:left-[-16px] lg:mt-0"
                  style={{
                    borderColor: "rgba(255,255,255,0.8)",
                    background: "rgba(255,255,255,0.92)",
                    boxShadow: T.shadowPanel,
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: T.primary }} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em]" style={{ color: T.textMuted }}>
                      Action Center
                    </p>
                    <p className="mt-1 text-sm leading-6" style={{ color: T.textSecondary }}>
                      Pending estimates, site visits, follow-ups, and invoices stay visible.
                    </p>
                  </div>
                </div>
              </CardSurface>
            </FadeIn>
          </SectionShell>
        </section>

        <section className="py-12 md:py-16">
          <SectionShell className="grid gap-5 lg:grid-cols-4">
            {homeStats.map((item, index) => (
              <FadeIn key={item.value} delay={index * 60}>
                <CardSurface className="p-6">
                  <p className="text-2xl font-semibold tracking-tight" style={{ color: T.textPrimary }}>
                    {item.value}
                  </p>
                  <p className="mt-3 text-sm leading-7" style={{ color: T.textSecondary }}>
                    {item.label}
                  </p>
                </CardSurface>
              </FadeIn>
            ))}
          </SectionShell>
        </section>

        <section id="workflow" className="py-20 md:py-28">
          <SectionShell>
            <FadeIn className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.primary }}>
                Lead to payment
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: T.textPrimary }}>
                Every stage of the roofing money pipeline stays connected.
              </h2>
              <p className="mt-5 text-base leading-8 md:text-lg" style={{ color: T.textSecondary }}>
                ZODO is designed to reduce slowdown between quoting, approval, field execution, invoicing, and final collection.
              </p>
            </FadeIn>

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
              {workflowSteps.map((item, index) => (
                <FadeIn key={item.title} delay={index * 70}>
                  <CardSurface className="h-full p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.primary }}>
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-6 text-2xl font-semibold tracking-tight" style={{ color: T.textPrimary }}>
                      {item.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7" style={{ color: T.textSecondary }}>
                      {item.description}
                    </p>
                    <div
                      className="absolute bottom-0 left-6 right-6 h-1 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${T.primary}, rgba(8,145,178,0.08))` }}
                    />
                  </CardSurface>
                </FadeIn>
              ))}
            </div>
          </SectionShell>
        </section>

        <section id="features" className="relative py-20 md:py-28" style={{ background: T.surfaceTint }}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #94A3B8 1px, transparent 1px), linear-gradient(#94A3B8 1px, transparent 1px)",
              backgroundSize: "34px 34px",
            }}
          />
          <SectionShell className="relative">
            <FadeIn className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.accent }}>
                What makes ZODO different
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: T.textPrimary }}>
                Premium product positioning without generic CRM clutter.
              </h2>
            </FadeIn>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {homeFeatures.map((item, index) => (
                <FadeIn key={item.title} delay={index * 80}>
                  <CardSurface className="h-full p-8">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                      style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}
                    >
                      <BadgeDollarSign className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold tracking-tight" style={{ color: T.textPrimary }}>
                      {item.title}
                    </h3>
                    <p className="mt-4 text-base leading-7" style={{ color: T.textSecondary }}>
                      {item.description}
                    </p>
                  </CardSurface>
                </FadeIn>
              ))}
            </div>
          </SectionShell>
        </section>

        <section id="final-cta" className="py-20 md:py-28">
          <SectionShell>
            <FadeIn>
              <div
                className="grid gap-6 rounded-[2rem] p-8 text-white md:grid-cols-[1.2fr_auto] md:items-center md:p-10"
                style={{
                  background: `linear-gradient(135deg, ${T.ctaDark}, ${T.ctaDark2})`,
                  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
                }}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">
                    Multi-page product story
                  </p>
                  <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                    Explore the full ZODO story, then turn interest into trial or estimate requests.
                  </h2>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <PrimaryAction onClick={() => navigate("/signup")} className="px-7 py-3.5">
                    Start Free Trial
                  </PrimaryAction>
                  <SecondaryAction dark onClick={() => scrollToTarget("workflow")} className="px-7 py-3.5">
                    See Product Pages
                  </SecondaryAction>
                </div>
              </div>
            </FadeIn>
          </SectionShell>
        </section>
      </main>

      <footer id="footer" className="border-t bg-white py-10" style={{ borderColor: T.border }}>
        <SectionShell className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <FadeIn className="max-w-md">
            <p className="text-lg font-semibold tracking-tight" style={{ color: T.textPrimary }}>
              ZODO
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: T.textSecondary }}>
              Premium roofing CRM storytelling built around one promise: lead to payment, faster.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryAction onClick={() => navigate("/signup")}>Start Free Trial</PrimaryAction>
              <SecondaryAction onClick={() => scrollToTarget("hero-address")}>Request Estimate</SecondaryAction>
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
                  onClick={() => scrollToTarget(item.target)}
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
