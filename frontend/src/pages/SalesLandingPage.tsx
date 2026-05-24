import { motion } from "framer-motion";
import { ArrowRight, BarChart3, BriefcaseBusiness, FileText, Landmark, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { LandingFooter } from "@/components/public-v2/LandingSections";
import { MarketingNavbar } from "@/components/public-v2/MarketingNavbar";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { Button } from "@/components/ui/button";

const workflow = [
  {
    icon: Users,
    title: "Lead and contact management",
    description: "Capture inquiries, assign owners, track every touch, and move qualified buyers into clean deal records.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Deals and pipeline",
    description: "Manage stages, next steps, value, expected close dates, and follow-up automation from one sales workspace.",
  },
  {
    icon: FileText,
    title: "Proposals and contracts",
    description: "Send polished proposals, collect acceptance, generate contracts, and keep documents attached to the right record.",
  },
  {
    icon: Landmark,
    title: "Invoices and bookkeeping",
    description: "Turn closed work into invoices, payments, receipts, and bookkeeping entries without duplicate data entry.",
  },
];

const metrics = [
  { value: "1", label: "Connected customer record" },
  { value: "24/7", label: "Automated follow-up coverage" },
  { value: "0", label: "Duplicate handoffs needed" },
];

export default function SalesLandingPage() {
  return (
    <PublicV2Shell>
      <MarketingNavbar />

      <section className="relative overflow-hidden bg-hero-bg py-16 md:py-24">
        <div className="pointer-events-none absolute left-[8%] top-14 h-72 w-72 rounded-full bg-brand-cyan/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute right-[10%] top-20 h-80 w-80 rounded-full bg-brand-orange/[0.05] blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-cyan">
              Sales CRM
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-none tracking-[-0.05em] text-foreground md:text-7xl">
              Close more deals with every lead, document, invoice, and follow-up in one place.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              Zodo gives sales teams a connected operating system for leads, companies, deals, proposals, contracts, payments, documents, and customer success.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="rounded-[2rem] bg-section-dark p-6 text-section-dark-foreground shadow-[0_24px_70px_rgba(15,23,42,0.18)] md:p-8"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">Pipeline value</p>
                <p className="mt-2 text-4xl font-bold text-white">$428K</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/15">
                <BarChart3 className="h-6 w-6 text-brand-green" />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {["New lead assigned", "Proposal sent", "Contract signed", "Invoice paid"].map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-2xl bg-white/7 px-4 py-3">
                  <span className="text-sm text-section-dark-foreground/80">{item}</span>
                  <span className="rounded-full bg-brand-cyan/15 px-3 py-1 text-xs font-semibold text-brand-cyan">
                    Step {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="bg-background py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">One sales workflow</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              From first inquiry to paid customer without rebuilding the record.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.5rem] border border-border/60 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.06)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-cyan/15 bg-brand-cyan/[0.06]">
                    <Icon className="h-5 w-5 text-brand-cyan" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-section-dark py-16 text-section-dark-foreground md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-green">Automation-ready</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">Keep the team moving when deals change.</h2>
            <p className="mt-5 text-base leading-8 text-section-dark-foreground/72">
              Trigger owner notifications, follow-up tasks, proposal reminders, document generation, and bookkeeping sync from the same source records your team already uses.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.5rem] border border-white/10 bg-white/7 p-5">
                <div className="text-3xl font-bold text-white">{metric.value}</div>
                <div className="mt-2 text-sm leading-6 text-section-dark-foreground/70">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-hero-bg py-20 md:py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">Ready when you are</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              See how Zodo fits your sales process.
            </h2>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button asChild size="xl" variant="accent">
              <Link to="/contact">Book a demo</Link>
            </Button>
            <Button asChild size="xl" variant="heroOutline">
              <Link to="/pricing">
                See pricing
                <Zap className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </PublicV2Shell>
  );
}
