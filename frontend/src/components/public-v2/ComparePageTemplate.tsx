import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/public-v2/MarketingNavbar";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { LandingFooter } from "@/components/public-v2/LandingSections";
import { cn } from "@/lib/utils";
import type { CompareFeatureGroup, ComparePageContent, CompareStatus } from "@/data/compareContent";
import { comparePageOrder } from "@/data/compareContent";

function SectionShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function statusTone(status: CompareStatus) {
  if (status === "strong") {
    return "bg-brand-green/12 text-brand-green border-brand-green/25";
  }
  if (status === "partial") {
    return "bg-brand-yellow/12 text-brand-orange border-brand-orange/20";
  }
  return "bg-muted text-muted-foreground border-border";
}

function reasonTone(tone: "cyan" | "green" | "orange") {
  if (tone === "cyan") {
    return {
      ring: "border-brand-cyan/20 bg-brand-cyan/10",
      icon: "text-brand-cyan",
    };
  }
  if (tone === "green") {
    return {
      ring: "border-brand-green/20 bg-brand-green/10",
      icon: "text-brand-green",
    };
  }
  return {
    ring: "border-brand-orange/20 bg-brand-orange/10",
    icon: "text-brand-orange",
  };
}

function moduleBadgeTone(badge?: "new" | "soon" | "ai") {
  if (badge === "new") return "bg-brand-cyan/12 text-brand-cyan";
  if (badge === "soon") return "bg-brand-orange/12 text-brand-orange";
  if (badge === "ai") return "bg-brand-green/12 text-brand-green";
  return "bg-muted text-muted-foreground";
}

function FeatureRow({
  competitorName,
  group,
}: {
  competitorName: string;
  group: CompareFeatureGroup;
}) {
  return (
    <div className="grid gap-4 border-b border-border/70 px-4 py-5 last:border-0 md:grid-cols-[1.2fr_0.9fr_0.9fr] md:px-6 lg:px-8">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{group.title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{group.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {group.modules.map((module) => (
            <span
              key={`${group.title}-${module.label}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
            >
              <span>{module.label}</span>
              {module.badge ? (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", moduleBadgeTone(module.badge))}>
                  {module.badge}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-brand-cyan/15 bg-brand-cyan/[0.06] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">ZODO</p>
        <p className="mt-3 text-sm font-semibold text-foreground">{group.zodoStatus}</p>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{group.zodoDetail}</p>
      </div>

      <div className="rounded-[1.4rem] border border-border/70 bg-muted/25 p-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">{competitorName}</p>
          <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", statusTone(group.competitorStatus))}>
            {group.competitorSummary}
          </span>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{group.competitorDetail}</p>
      </div>
    </div>
  );
}

export function ComparePageTemplate({ content }: { content: ComparePageContent }) {
  return (
    <PublicV2Shell>
      <MarketingNavbar />

      <section className="relative overflow-hidden bg-hero-bg py-16 md:py-24">
        <div className="pointer-events-none absolute left-[7%] top-14 h-72 w-72 rounded-full bg-brand-cyan/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-16 h-80 w-80 rounded-full bg-brand-orange/[0.04] blur-3xl" />

        <SectionShell className="relative grid items-start gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-cyan">
              <Sparkles className="h-4 w-4" />
              Compare Roofing CRM
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {comparePageOrder.map((page) => (
                <Link
                  key={page.slug}
                  to={page.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                    content.slug === page.slug
                      ? "border-brand-cyan bg-white text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                      : "border-border bg-white/70 text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground",
                  )}
                >
                  {page.label}
                  {content.slug === page.slug ? <ChevronRight className="h-4 w-4 text-brand-cyan" /> : null}
                </Link>
              ))}
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-bold leading-none tracking-[-0.05em] text-foreground md:text-6xl">
              {content.heroTitle}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              {content.heroDescription}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.6rem] border border-border/70 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Best fit for {content.competitorName}
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">{content.competitorBestFor}</p>
              </div>
              <div className="rounded-[1.6rem] border border-brand-cyan/20 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-cyan">Best fit for ZODO</p>
                <p className="mt-3 text-sm leading-7 text-foreground">{content.zodoBestFor}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link to="/signup">
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="heroOutline">
                <Link to="/contact">Book a demo</Link>
              </Button>
            </div>

            {content.notes?.length ? (
              <div className="mt-6 space-y-2">
                {content.notes.map((note) => (
                  <p key={note} className="text-xs leading-6 text-muted-foreground">
                    {note}
                  </p>
                ))}
              </div>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="rounded-[2rem] bg-section-dark p-5 text-section-dark-foreground shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-7"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-section-dark-foreground/78">
                  <Layers3 className="h-3.5 w-3.5 text-brand-orange" />
                  What {content.competitorName} highlights
                </div>
                <div className="mt-5 space-y-3">
                  {content.competitorSnapshot.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <ShieldCheck className="mt-1 h-4 w-4 flex-shrink-0 text-brand-orange" />
                      <p className="text-sm leading-7 text-section-dark-foreground/74">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-white p-5 text-foreground">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-cyan/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-cyan">
                  <Bot className="h-3.5 w-3.5" />
                  Where ZODO pulls ahead
                </div>
                <div className="mt-5 space-y-3">
                  {content.zodoSnapshot.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                      <p className="text-sm leading-7 text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </SectionShell>
      </section>

      <section className="bg-background py-20 md:py-24">
        <SectionShell>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">Why roofers switch</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              The ZODO edge is not one feature. It is how the stack fits together.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {content.reasonCards.map((card, index) => {
              const tone = reasonTone(card.tone);
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="rounded-[1.9rem] border border-border/60 bg-white p-7 shadow-[0_18px_46px_rgba(15,23,42,0.06)]"
                >
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", tone.ring)}>
                    {index === 0 ? (
                      <Bot className={cn("h-5 w-5", tone.icon)} />
                    ) : index === 1 ? (
                      <MessageSquareText className={cn("h-5 w-5", tone.icon)} />
                    ) : (
                      <ShieldCheck className={cn("h-5 w-5", tone.icon)} />
                    )}
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">{card.title}</h3>
                  <p className="mt-4 text-base leading-8 text-muted-foreground">{card.description}</p>
                </motion.div>
              );
            })}
          </div>
        </SectionShell>
      </section>

      <section className="bg-hero-bg py-20 md:py-24">
        <SectionShell>
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">Feature-by-feature view</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Compare the full operating model, not just one sales feature.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Each row below maps the ZODO platform areas you asked for: Main, CRM, Finance, Business, Communication, Team, Analytics, and Settings + Automation.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_20px_54px_rgba(15,23,42,0.08)]">
            <div className="hidden border-b border-border bg-muted/35 px-6 py-4 text-sm font-semibold text-muted-foreground md:grid md:grid-cols-[1.2fr_0.9fr_0.9fr] lg:px-8">
              <div>Platform area</div>
              <div>ZODO</div>
              <div>{content.competitorName}</div>
            </div>
            {content.featureGroups.map((group) => (
              <FeatureRow key={group.title} competitorName={content.competitorName} group={group} />
            ))}
          </div>
        </SectionShell>
      </section>

      <section className="bg-background py-20 md:py-24">
        <SectionShell className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45 }}
            className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-10"
          >
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">Why this matters</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Roofing teams move faster when the stack is unified.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-muted-foreground">
              <p>
                When estimate data, CRM movement, communication, inspections, files, invoices, people, and settings all live in one product, your team spends less time stitching tools together and more time closing jobs.
              </p>
              <p>
                That is the real ZODO thesis behind every compare page: fewer handoffs, less context switching, and a clearer daily operating surface for roofers.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="rounded-[2rem] bg-section-dark p-8 text-section-dark-foreground shadow-[0_24px_60px_rgba(15,23,42,0.16)] md:p-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-section-dark-foreground/80">
              <Sparkles className="h-4 w-4 text-brand-green" />
              See ZODO live
            </div>
            <h2 className="mt-5 text-4xl font-bold tracking-tight text-white">
              Want the faster way to run roofing sales and operations?
            </h2>
            <p className="mt-4 text-base leading-8 text-section-dark-foreground/72">
              Start with the AI Roof Estimator, then see how the same workspace carries you through CRM, jobs, finance, communication, and admin.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link to="/signup">
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="heroOutline">
                <Link to="/contact">Talk to sales</Link>
              </Button>
            </div>
          </motion.div>
        </SectionShell>
      </section>

      <LandingFooter />
    </PublicV2Shell>
  );
}
