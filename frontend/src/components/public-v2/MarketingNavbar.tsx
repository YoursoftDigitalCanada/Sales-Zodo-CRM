import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { isRoofingPublicMarketingEnabled } from "@/lib/public-product-config";

import { BrandLogo } from "./BrandLogo";

type NavItem =
  | { label: string; href: string; hasDropdown?: boolean }
  | { label: string; to: string; hasDropdown?: boolean };

const salesNavItems: NavItem[] = [
  { label: "Features", href: "#features", hasDropdown: true },
  { label: "Product", to: "/product" },
  { label: "Solutions", to: "/solutions" },
  { label: "Pricing", to: "/pricing" },
  { label: "Integrations", to: "/product", hasDropdown: true },
  { label: "Resources", href: "#resources", hasDropdown: true },
];

const roofingNavItems: NavItem[] = [
  { label: "Features", href: "#features", hasDropdown: true },
  { label: "AI Estimator", to: "/ai-estimator" },
  { label: "Pricing", to: "/pricing" },
  { label: "Integrations", href: "#security", hasDropdown: true },
  { label: "Resources", href: "#resources", hasDropdown: true },
];

function NavLinkItem({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const className =
    "flex items-center gap-1 rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:text-foreground";

  if ("to" in item) {
    return (
      <Link className={className} to={item.to} onClick={onNavigate}>
        {item.label}
        {item.hasDropdown ? <ChevronDown className="h-3.5 w-3.5 opacity-50" /> : null}
      </Link>
    );
  }

  return (
    <a className={className} href={item.href} onClick={onNavigate}>
      {item.label}
      {item.hasDropdown ? <ChevronDown className="h-3.5 w-3.5 opacity-50" /> : null}
    </a>
  );
}

export function MarketingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = isRoofingPublicMarketingEnabled ? roofingNavItems : salesNavItems;

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="shrink-0" to="/">
          <BrandLogo />
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {navItems.map((item) => (
            <NavLinkItem key={item.label} item={item} />
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link className="text-sm text-foreground/70 transition-colors hover:text-foreground" to="/signin">
            Sign in
          </Link>
          <Button asChild size="default" variant="heroOutline">
            <Link to="/contact">Book a demo</Link>
          </Button>
          <Button asChild size="default" variant="accent">
            <Link to="/signup">Start free trial</Link>
          </Button>
        </div>

        <button
          className="p-2 text-foreground lg:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-background lg:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {navItems.map((item) => (
                <div key={item.label}>
                  <NavLinkItem item={item} onNavigate={closeMobile} />
                </div>
              ))}
              <div className="mt-2 space-y-2 border-t border-border pt-4">
                <Button asChild className="w-full" variant="heroOutline">
                  <Link to="/contact" onClick={closeMobile}>
                    Book a demo
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="accent">
                  <Link to="/signup" onClick={closeMobile}>
                    Start free trial
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
