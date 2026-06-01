import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

type WorkspaceHeroProps = {
  eyebrow: string;
  title: string;
  accent?: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
};

export function WorkspaceHero({ eyebrow, title, accent, description, icon: Icon, actions }: WorkspaceHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 rounded-md border border-[#E2E8F0] bg-[#F1F5F9] p-5 md:flex-row md:items-center md:justify-between md:p-6"
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0891B2]/10 text-[#0891B2]">
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0891B2]">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold text-[#0F172A]">
            {title}{accent ? <> <span className="text-[#0891B2]">{accent}</span></> : null}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748B]">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </motion.section>
  );
}

type WorkspaceMetricProps = {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon: LucideIcon;
  tone?: "cyan" | "green" | "amber" | "blue";
  delay?: number;
};

const toneStyles = {
  cyan: "bg-[#0891B2]/10 text-[#0891B2]",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
};

export function WorkspaceMetric({ title, value, subtitle, icon: Icon, tone = "cyan", delay = 0 }: WorkspaceMetricProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-md border border-[#E2E8F0] bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{title}</p>
          <p className="mt-2 truncate text-xl font-semibold text-[#0F172A]">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-[#94A3B8]">{subtitle}</p> : null}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${toneStyles[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </motion.div>
  );
}
