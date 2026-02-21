// src/components/chat/StatusBadge.tsx

import { cn } from "@/lib/utils";
import { User } from "./types";
import { getStatusColor } from "./utils";

interface StatusBadgeProps {
  status: User["status"];
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 rounded-full border-2 border-white",
        getStatusColor(status),
        sizeClasses[size],
        className
      )}
    />
  );
}