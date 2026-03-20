import { cn } from "@/lib/utils";
import {
  ROOFING_STAGE_ORDER,
  getRoofingStageMeta,
  getStageIndex,
  type RoofingStageKey,
} from "@/features/projects/roofing-operations";

interface RoofingStageRailProps {
  currentStage: RoofingStageKey;
  compact?: boolean;
}

export function RoofingStageRail({
  currentStage,
  compact = false,
}: RoofingStageRailProps) {
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
      {ROOFING_STAGE_ORDER.map((stageKey, index) => {
        const meta = getRoofingStageMeta(stageKey);
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={stageKey} className="flex items-center gap-2">
            <div
              className={cn(
                "inline-flex items-center gap-2 border px-2.5 py-1 font-medium",
                compact ? "rounded-[5px] text-[10px]" : "rounded-[5px] text-xs",
                isCurrent
                  ? `${meta.border} ${meta.softBg} ${meta.accentText}`
                  : isCompleted
                    ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
                    : "border-[#E2E8F0] bg-white text-[#64748B]",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isCurrent ? meta.dot : isCompleted ? "bg-[#16A34A]" : "bg-[#CBD5E1]",
                )}
              />
              <span>{compact ? meta.shortLabel : meta.label}</span>
            </div>
            {index < ROOFING_STAGE_ORDER.length - 1 ? (
              <div className={cn("h-px w-5", isCompleted ? "bg-[#86EFAC]" : "bg-[#E2E8F0]")} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
