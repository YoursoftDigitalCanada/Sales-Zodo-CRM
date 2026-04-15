import type { ReactNode } from "react";

import "@/styles/public-v2.css";

import { cn } from "@/lib/utils";

export function PublicV2Shell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("public-v2-theme min-h-screen bg-background text-foreground", className)}>
      {children}
    </div>
  );
}
