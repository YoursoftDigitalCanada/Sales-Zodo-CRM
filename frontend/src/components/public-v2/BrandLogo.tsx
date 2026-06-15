import { cn } from "@/lib/utils";

type LogoSize = "sm" | "default" | "lg";
type LogoVariant = "auto" | "light" | "dark";

const sizeClasses: Record<LogoSize, string> = {
  sm: "h-7",
  default: "h-9",
  lg: "h-11",
};

interface BrandLogoProps {
  className?: string;
  size?: LogoSize;
  variant?: LogoVariant;
}

export function BrandLogo({ className, size = "default", variant = "auto" }: BrandLogoProps) {
  const imageClassName = cn("w-auto object-contain", sizeClasses[size]);

  return (
    <div className={cn("flex items-center", className)}>
      {variant !== "dark" ? (
        <img
          src="/assets/zodo-logo-light.svg"
          alt="Zodo"
          className={cn(imageClassName, variant === "auto" && "dark:hidden")}
        />
      ) : null}
      {variant !== "light" ? (
        <img
          src="/assets/zodo-logo-dark.svg"
          alt="Zodo"
          className={cn(imageClassName, variant === "auto" && "hidden dark:block")}
        />
      ) : null}
    </div>
  );
}
