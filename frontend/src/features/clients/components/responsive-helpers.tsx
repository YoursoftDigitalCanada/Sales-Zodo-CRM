import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, RefreshCw, Trash2, type LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SwipeActionCardProps = {
  children: React.ReactNode;
  onView: () => void;
  onDelete: () => void;
  onLongPress?: () => void;
  className?: string;
  disabled?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryIcon?: LucideIcon;
  secondaryIcon?: LucideIcon;
};

const SWIPE_THRESHOLD = 84;
const LONG_PRESS_MS = 420;

export function SwipeActionCard({
  children,
  onView,
  onDelete,
  onLongPress,
  className,
  disabled = false,
  primaryLabel = "View",
  secondaryLabel = "Delete",
  primaryIcon: PrimaryIcon = Eye,
  secondaryIcon: SecondaryIcon = Trash2,
}: SwipeActionCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTimer = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (disabled) return;
    const touch = event.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    setIsInteracting(true);
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      onLongPress?.();
      setTranslateX(0);
    }, LONG_PRESS_MS);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (disabled) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    if (Math.abs(deltaY) > 18) {
      clearLongPress();
      setTranslateX(0);
      return;
    }

    if (Math.abs(deltaX) > 10) clearLongPress();
    setTranslateX(Math.max(-116, Math.min(116, deltaX)));
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    clearLongPress();
    setIsInteracting(false);
    if (translateX >= SWIPE_THRESHOLD) {
      onView();
    } else if (translateX <= -SWIPE_THRESHOLD) {
      onDelete();
    }
    setTranslateX(0);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
          <PrimaryIcon size={14} />
          {primaryLabel}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
          {secondaryLabel}
          <SecondaryIcon size={14} />
        </div>
      </div>
      <div
        className={cn(
          "relative transition-transform duration-200",
          !isInteracting && "ease-out"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

type PullToRefreshHandlers = {
  onTouchStart: (event: React.TouchEvent<HTMLElement>) => void;
  onTouchMove: (event: React.TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
};

type MobileCreateFabProps = {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
};

export function usePullToRefresh({
  enabled,
  onRefresh,
}: {
  enabled: boolean;
  onRefresh: () => Promise<void> | void;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  const handlers: PullToRefreshHandlers = useMemo(
    () => ({
      onTouchStart: (event) => {
        if (!enabled || window.scrollY > 0) return;
        startY.current = event.touches[0].clientY;
      },
      onTouchMove: (event) => {
        if (!enabled || startY.current === null || window.scrollY > 0) return;
        const distance = event.touches[0].clientY - startY.current;
        if (distance <= 0) {
          setPullDistance(0);
          return;
        }
        setPullDistance(Math.min(96, distance * 0.55));
      },
      onTouchEnd: async () => {
        if (!enabled) return;
        if (pullDistance >= 72) {
          setIsRefreshing(true);
          await onRefresh();
          setIsRefreshing(false);
        }
        startY.current = null;
        setPullDistance(0);
      },
    }),
    [enabled, onRefresh, pullDistance]
  );

  return { handlers, pullDistance, isRefreshing };
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
}: {
  pullDistance: number;
  isRefreshing: boolean;
}) {
  return (
    <div
      className="overflow-hidden transition-[max-height,opacity] duration-200"
      style={{ maxHeight: pullDistance > 0 || isRefreshing ? 56 : 0, opacity: pullDistance > 0 || isRefreshing ? 1 : 0 }}
    >
      <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-[#475569]">
        <RefreshCw size={14} className={cn(isRefreshing && "animate-spin", pullDistance >= 72 && "text-[#0891B2]")} />
        <span>{isRefreshing ? "Refreshing..." : pullDistance >= 72 ? "Release to refresh" : "Pull to refresh"}</span>
      </div>
    </div>
  );
}

export function MobileCreateFab({
  children,
  onClick,
  ariaLabel,
  className,
  disabled = false,
}: MobileCreateFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export function ListCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl bg-[#F1F5F9]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 bg-[#F1F5F9]" />
              <Skeleton className="h-3 w-28 bg-[#F1F5F9]" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full bg-[#F1F5F9]" />
                <Skeleton className="h-5 w-16 rounded-full bg-[#F1F5F9]" />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl bg-[#F1F5F9]" />
            <Skeleton className="h-12 rounded-xl bg-[#F1F5F9]" />
          </div>
        </div>
      ))}
    </div>
  );
}
