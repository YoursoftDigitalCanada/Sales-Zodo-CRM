import { ArrowRight, Building2, HardHat, Users2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CardSurface,
  FadeIn,
  PrimaryAction,
  SectionShell,
  SitePageShell,
  T,
} from "@/components/site/site-system";
import { media, solutionOutcomes, solutionsAudiences } from "@/data/siteContent";

const audienceIcons = [Building2, Users2, HardHat];

export default function SolutionsPage() {
  const navigate = useNavigate();

  return (
    <SitePageShell>
      <section className="relative overflow-hidden py-16 md:py-24" style={{ background: T.heroBg }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(8,145,178,0.12), transparent 24%), radial-gradient(circle at top right, rgba(34,211,238,0.10), transparent 22%)",
          }}
        />
        <SectionShell className="relative grid items-center gap-14 lg:grid-cols-[1fr_1fr]">
          <FadeIn>
            <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.primary }}>
              Solutions
            </p>
            <h1 className="mt-4 text-5xl font-bold leading-none tracking-[-0.05em] md:text-6xl" style={{ color: T.textPrimary }}>
              ZODO is shaped around real roofing business pressure, not generic CRM theory.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 md:text-lg" style={{ color: T.textSecondary }}>
              Different teams care about different bottlenecks. ZODO keeps the product story clear for owners,
              sales teams, and operations leaders who need more revenue control.
            </p>
          </FadeIn>
          <FadeIn delay={120}>
            <img
              src={media.contractorTablet}
              alt="Contractor holding tablet"
              className="h-[420px] w-full rounded-[1.8rem] object-cover shadow-[0_18px_50px_rgba(0,0,0,0.06)] md:h-[520px]"
            />
          </FadeIn>
        </SectionShell>
      </section>

      <section className="py-20 md:py-28">
        <SectionShell>
          <div className="grid gap-6 lg:grid-cols-3">
            {solutionsAudiences.map((item, index) => {
              const Icon = audienceIcons[index];
              return (
                <FadeIn key={item.title} delay={index * 70}>
                  <CardSurface className="h-full p-8">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                      style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold tracking-tight" style={{ color: T.textPrimary }}>
                      {item.title}
                    </h2>
                    <p className="mt-4 text-base leading-7" style={{ color: T.textSecondary }}>
                      {item.description}
                    </p>
                  </CardSurface>
                </FadeIn>
              );
            })}
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
              Business impact
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: T.textPrimary }}>
              The solution story stays anchored to measurable business outcomes.
            </h2>
          </FadeIn>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {solutionOutcomes.map((outcome, index) => (
              <FadeIn key={outcome} delay={index * 45}>
                <div
                  className="rounded-[1.5rem] border bg-white px-5 py-5 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
                  style={{ borderColor: T.border, color: T.textSecondary }}
                >
                  {outcome}
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={120}>
            <div
              className="mt-12 grid gap-6 rounded-[2rem] p-8 text-white md:grid-cols-[1.2fr_auto] md:items-center md:p-10"
              style={{
                background: `linear-gradient(135deg, ${T.ctaDark}, ${T.ctaDark2})`,
                boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
              }}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">Next step</p>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight">
                  If the AI estimator is your hook, let the rest of ZODO become the growth engine behind it.
                </h3>
              </div>
              <PrimaryAction onClick={() => navigate("/ai-estimator")} className="px-7 py-3.5">
                Explore AI Estimator
                <ArrowRight className="h-4 w-4" />
              </PrimaryAction>
            </div>
          </FadeIn>
        </SectionShell>
      </section>
    </SitePageShell>
  );
}
