import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  ClipboardCheck,
  MapPinned,
  Sparkles,
} from "lucide-react";
import { HeroAddressBar } from "@/components/site/HeroAddressBar";
import {
  CardSurface,
  FadeIn,
  PrimaryAction,
  SecondaryAction,
  SectionShell,
  SitePageShell,
  T,
} from "@/components/site/site-system";
import { homeFeatures, homeStats, workflowSteps } from "@/data/siteContent";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1635424824800-692767998d07?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwyfHxjb250cmFjdG9yJTIwd29ya2luZyUyMG9uJTIwcm9vZnxlbnwwfHx8fDE3NzYxOTg2ODJ8MA&ixlib=rb-4.1.0&q=85";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <SitePageShell>
      <section className="relative overflow-hidden py-16 md:py-24" style={{ background: T.heroBg }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(8,145,178,0.12), transparent 25%), radial-gradient(circle at top right, rgba(34,211,238,0.12), transparent 22%)",
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
              <p className="max-w-2xl text-base leading-8 md:text-lg" style={{ color: T.textSecondary }}>
                ZODO helps contractors move from lead to payment faster with address-based AI estimating,
                action-driven follow-up, and one clean operating flow for sales, jobs, invoicing, and
                collections.
              </p>
            </div>

            <HeroAddressBar navigateTo="/ai-estimator" buttonLabel="Generate Estimate" testIdPrefix="hero-address" />

            <div className="flex flex-col gap-4 sm:flex-row">
              <PrimaryAction onClick={() => navigate("/contact?intent=trial")} className="px-7 py-3.5">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </PrimaryAction>
              <SecondaryAction onClick={() => navigate("/login")} className="px-7 py-3.5">
                Sign In
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
                    Address -&gt; Roof analysis -&gt; Estimate flow
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

      <section className="py-20 md:py-28">
        <SectionShell>
          <FadeIn className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.primary }}>
              Lead to payment
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: T.textPrimary }}>
              Every stage of the roofing money pipeline stays connected.
            </h2>
            <p className="mt-5 text-base leading-8 md:text-lg" style={{ color: T.textSecondary }}>
              ZODO is designed to reduce slowdown between quoting, approval, field execution, invoicing, and
              final collection.
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

      <section className="relative py-20 md:py-28" style={{ background: T.surfaceTint }}>
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

      <section className="py-20 md:py-28">
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
                <PrimaryAction onClick={() => navigate("/contact?intent=trial")} className="px-7 py-3.5">
                  Start Free Trial
                </PrimaryAction>
                <SecondaryAction dark onClick={() => navigate("/product")} className="px-7 py-3.5">
                  See Product Pages
                </SecondaryAction>
              </div>
            </div>
          </FadeIn>
        </SectionShell>
      </section>
    </SitePageShell>
  );
}
