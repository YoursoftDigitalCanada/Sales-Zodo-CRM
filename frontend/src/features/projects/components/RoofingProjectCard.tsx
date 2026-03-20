import {
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  HardHat,
  MoreHorizontal,
  ShieldCheck,
  ShieldEllipsis,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import type { ProjectEntity } from "@/features/projects/services/projects-service";
import {
  formatCurrency,
  formatRelativeTimeline,
  formatTimelineDate,
  getActualCost,
  getContractValue,
  getCrewSummary,
  getGrossProfit,
  getIndicatorToneClasses,
  getInsuranceIndicator,
  getNextAction,
  getPermitIndicator,
  getProfitMargin,
  getProjectClientName,
  getProjectCode,
  getProjectJobType,
  getProjectPriorityLabel,
  getProjectProgress,
  getRoofingStage,
  getRoofingStageMeta,
  getWorkStatus,
} from "@/features/projects/roofing-operations";
import { RoofingStageRail } from "@/features/projects/components/RoofingStageRail";
import { cn } from "@/lib/utils";

interface RoofingProjectCardProps {
  project: ProjectEntity;
  onOpen: (project: ProjectEntity) => void;
  onMoveToProduction?: (project: ProjectEntity) => void;
  onMarkCompleted?: (project: ProjectEntity) => void;
  onArchive?: (project: ProjectEntity) => void;
}

function FinancialPill({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[5px] border px-3 py-2 shadow-sm",
        accent ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[#E2E8F0] bg-[#F8FAFC]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", accent ? "text-[#166534]" : "text-[#0F172A]")}>{value}</p>
    </div>
  );
}

export function RoofingProjectCard({
  project,
  onOpen,
  onMoveToProduction,
  onMarkCompleted,
  onArchive,
}: RoofingProjectCardProps) {
  const stageKey = getRoofingStage(project);
  const stageMeta = getRoofingStageMeta(stageKey);
  const progress = getProjectProgress(project);
  const contractValue = getContractValue(project);
  const actualCost = getActualCost(project);
  const grossProfit = getGrossProfit(project);
  const profitMargin = getProfitMargin(project);
  const permit = getPermitIndicator(project);
  const insurance = getInsuranceIndicator(project);
  const nextAction = getNextAction(project);
  const priority = getProjectPriorityLabel(project);
  const workStatus = getWorkStatus(project);
  const dueDate = project.estimatedEndDate ?? project.dueDate ?? project.endDate ?? project.actualEndDate;
  const currencyCode = project.currency || "USD";

  return (
    <article className="rounded-[5px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">{getProjectCode(project)}</p>
          <button
            type="button"
            onClick={() => onOpen(project)}
            className="mt-1 text-left text-lg font-semibold text-[#0F172A] transition hover:text-[#0E7490]"
          >
            {project.name}
          </button>
          <p className="mt-1 text-sm text-[#64748B]">{getProjectClientName(project)}</p>
        </div>

        <div className="flex items-start gap-2">
          <Badge className={cn("rounded-[5px] border px-2.5 py-1 text-xs font-medium", stageMeta.border, stageMeta.softBg, stageMeta.accentText)}>
            {stageMeta.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-[5px] border border-[#E2E8F0] text-[#475569]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-[5px]">
              <DropdownMenuItem onClick={() => onOpen(project)}>Open Job</DropdownMenuItem>
              {onMoveToProduction ? <DropdownMenuItem onClick={() => onMoveToProduction(project)}>Move to Production</DropdownMenuItem> : null}
              {onMarkCompleted ? <DropdownMenuItem onClick={() => onMarkCompleted(project)}>Mark Completed</DropdownMenuItem> : null}
              {onArchive ? <DropdownMenuItem className="text-rose-600" onClick={() => onArchive(project)}>Archive</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4">
        <RoofingStageRail currentStage={stageKey} compact />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#334155]">
          Priority: {priority}
        </Badge>
        <Badge className="rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#334155]">
          Job Type: {getProjectJobType(project)}
        </Badge>
        <Badge className="rounded-[5px] border border-[#DCFCE7] bg-[#F0FDF4] px-2.5 py-1 text-xs font-medium text-[#166534]">
          Work Status: {workStatus}
        </Badge>
      </div>

      <div className="mt-4 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[#334155]">Completion</span>
          <span className="font-semibold text-[#0F172A]">{progress}%</span>
        </div>
        <Progress
          value={progress}
          className="mt-3 h-2 rounded-[5px] bg-[#E2E8F0]"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[5px] border border-[#E2E8F0] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            <ShieldEllipsis className="h-3.5 w-3.5" />
            Permit
          </div>
          <div className={cn("mt-2 inline-flex rounded-[5px] border px-2 py-1 text-xs font-medium", getIndicatorToneClasses(permit.tone))}>
            {permit.label}
          </div>
        </div>
        <div className="rounded-[5px] border border-[#E2E8F0] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Insurance
          </div>
          <div className={cn("mt-2 inline-flex rounded-[5px] border px-2 py-1 text-xs font-medium", getIndicatorToneClasses(insurance.tone))}>
            {insurance.label}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-[5px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-[#0E7490]" />
          <p className="text-sm font-semibold text-[#0F172A]">Financial Visibility</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FinancialPill label="Contract Value" value={formatCurrency(contractValue, currencyCode)} />
          <FinancialPill label="Actual Cost" value={formatCurrency(actualCost, currencyCode)} />
          <FinancialPill label="Gross Profit" value={formatCurrency(grossProfit, currencyCode)} accent={grossProfit >= 0} />
          <FinancialPill label="Margin" value={`${profitMargin.toFixed(1)}%`} accent={profitMargin >= 20} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            <HardHat className="h-3.5 w-3.5" />
            Next Action
          </div>
          <p className="mt-2 text-sm font-semibold text-[#0F172A]">{nextAction}</p>
        </div>

        <div className="rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            <Users className="h-3.5 w-3.5" />
            Crew Assigned
          </div>
          <p className="mt-2 text-sm font-semibold text-[#0F172A]">{getCrewSummary(project)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#E2E8F0] pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            <CalendarClock className="h-3.5 w-3.5" />
            Timeline
          </div>
          <p className="mt-1 text-sm font-semibold text-[#0F172A]">{formatTimelineDate(dueDate)}</p>
          <p className="text-xs text-[#64748B]">{formatRelativeTimeline(dueDate)}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onOpen(project)}
          className="rounded-[5px] border-[#D7E3EA] text-[#0F172A]"
        >
          View Job
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
