import { AlertTriangle, ArrowRight, CircleDollarSign, KanbanSquare, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CardSurface,
  FadeIn,
  PrimaryAction,
  SecondaryAction,
  SectionShell,
  SitePageShell,
  T,
} from "@/components/site/site-system";
import { media, productSections } from "@/data/siteContent";

const iconMap = [LayoutDashboard, KanbanSquare, CircleDollarSign, AlertTriangle];

export default function ProductPage() {
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
        <SectionShell className="relative grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <FadeIn className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.primary }}>
              Product
            </p>
            <h1 className="text-5xl font-bold leading-none tracking-[-0.05em] md:text-6xl" style={{ color: T.textPrimary }}>
              The CRM side of ZODO is built to move jobs, not just store records.
            </h1>
            <p className="max-w-2xl text-base leading-8 md:text-lg" style={{ color: T.textSecondary }}>
              From Action Center visibility to job execution and invoicing, the product is structured around
              roofing operations that need speed, clarity, and commercial control.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <PrimaryAction onClick={() => navigate("/contact?intent=trial")} className="px-7 py-3.5">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </PrimaryAction>
              <SecondaryAction onClick={() => navigate("/pricing")} className="px-7 py-3.5">
                See Pricing
              </SecondaryAction>
            </div>
          </FadeIn>

          <FadeIn delay={120}>
            <CardSurface className="p-5 md:p-7">
              <img
                src={media.contractorTablet}
                alt="Contractor using a tablet"
                className="h-[420px] w-full rounded-[1.8rem] object-cover md:h-[520px]"
              />
            </CardSurface>
          </FadeIn>
        </SectionShell>
      </section>

      <section className="py-20 md:py-28">
        <SectionShell>
          <div className="grid gap-6 md:grid-cols-2">
            {productSections.map((item, index) => {
              const Icon = iconMap[index];
              return (
                <FadeIn key={item.title} delay={index * 70}>
                  <CardSurface className="h-full p-8">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                      style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-6 text-3xl font-semibold tracking-tight" style={{ color: T.textPrimary }}>
                      {item.title}
                    </h2>
                    <p className="mt-4 text-base leading-7" style={{ color: T.textSecondary }}>
                      {item.description}
                    </p>
                    <div className="mt-6 grid gap-3">
                      {item.points.map((point) => (
                        <div
                          key={point}
                          className="rounded-2xl px-4 py-3 text-sm"
                          style={{ background: T.surfaceMuted, color: T.textSecondary }}
                        >
                          {point}
                        </div>
                      ))}
                    </div>
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
        <SectionShell className="relative grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
          <FadeIn>
            <CardSurface className="p-8 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.accent }}>
                Revenue-aware workflow
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: T.textPrimary }}>
                The platform connects sales pressure, field reality, and finance execution.
              </h2>
              <p className="mt-5 text-base leading-8 md:text-lg" style={{ color: T.textSecondary }}>
                That is why ZODO feels different from office-first CRMs. It is structured for the way roofing
                jobs actually move through estimating, approval, crews, invoicing, and cash collection.
              </p>
            </CardSurface>
          </FadeIn>
          <FadeIn delay={120}>
            <img
              src={media.handshake}
              alt="Agreement on tablet"
              className="h-[420px] w-full rounded-[1.8rem] object-cover shadow-[0_18px_50px_rgba(0,0,0,0.06)]"
            />
          </FadeIn>
        </SectionShell>
      </section>
    </SitePageShell>
  );
}
