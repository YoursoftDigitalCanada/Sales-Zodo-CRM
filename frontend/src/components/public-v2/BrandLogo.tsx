import { cn } from "@/lib/utils";

type LogoSize = "sm" | "default" | "lg";

const sizeClasses: Record<LogoSize, string> = {
  sm: "h-7",
  default: "h-9",
  lg: "h-11",
};

interface BrandLogoProps {
  className?: string;
  size?: LogoSize;
}

export function BrandLogo({ className, size = "default" }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/assets/zodo-logo.png"
        alt="Zodo"
        className={cn("rounded-md object-contain", sizeClasses[size])}
      />
    </div>
  );
}
