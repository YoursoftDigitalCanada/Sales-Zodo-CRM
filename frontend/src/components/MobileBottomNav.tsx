import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Calculator,
  LayoutDashboard,
  ReceiptText,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canPerformAction } from "@/lib/access-control";

interface MobileBottomNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  matchPrefixes: string[];
}

const navigationItems: MobileBottomNavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    matchPrefixes: ["/dashboard"],
  },
  {
    label: "AI Estimator",
    path: "/roof-estimator",
    icon: Calculator,
    matchPrefixes: ["/roof-estimator"],
  },
  {
    label: "Invoice",
    path: "/invoice",
    icon: ReceiptText,
    matchPrefixes: ["/invoice"],
  },
  {
    label: "Leads",
    path: "/leads",
    icon: Users,
    matchPrefixes: ["/leads"],
  },
];

function matchesPath(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function MobileBottomNav() {
  const location = useLocation();

  const visibleItems = useMemo(
    () =>
      navigationItems.filter((item) => {
        if (item.path === "/dashboard") return canPerformAction("dashboard", "view");
        if (item.path === "/roof-estimator") return canPerformAction("roof-estimator", "view");
        if (item.path === "/invoice") return canPerformAction("invoices", "view");
        if (item.path === "/leads") return canPerformAction("leads", "view");
        return true;
      }),
    [],
  );

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[45] border-t border-[rgba(15,23,42,0.08)] bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden"
      aria-label="Primary mobile navigation"
    >
      <div
        className="mx-auto flex max-w-xl items-stretch gap-1 px-2 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = matchesPath(location.pathname, item.matchPrefixes);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex min-h-[62px] flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition-all duration-200",
                active
                  ? "bg-[#1E40AF] text-white shadow-[0_10px_24px_rgba(30,64,175,0.24)]"
                  : "text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#1E40AF]",
              )}
            >
              <Icon size={20} className={cn("mb-1.5", active ? "text-white" : "text-[#475569]")} />
              <span className="text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
