// src/components/ai/GlobalAiFloatingButton.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { AiCopilotPanel } from "./AiCopilotPanel";
import { cn } from "@/lib/utils";
import { APP_SHORTCUT_EVENTS } from "@/lib/app-shortcuts";
import useIsMobile from "@/hooks/useIsMobile";

// Pages where the FAB should NOT appear (public/auth routes)
const HIDDEN_ROUTES = new Set([
    "/",
    "/login",
    "/signup",
    "/onboarding",
    "/product",
    "/solutions",
    "/ai-estimator",
    "/pricing",
    "/contact",
]);

export function GlobalAiFloatingButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [showPulse, setShowPulse] = useState(true);
    const location = useLocation();
    const { isMobile } = useIsMobile();
    const isRoofEstimatorRoute = location.pathname.startsWith("/roof-estimator");

    // Hide on public routes
    const isHiddenRoute = HIDDEN_ROUTES.has(location.pathname);

    // Stop the attention pulse after 8 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowPulse(false), 8000);
        return () => clearTimeout(timer);
    }, []);

    // Close panel on route change
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        const handleClose = () => setIsOpen(false);

        window.addEventListener(APP_SHORTCUT_EVENTS.openAi, handleOpen);
        window.addEventListener(APP_SHORTCUT_EVENTS.closeAi, handleClose);

        return () => {
            window.removeEventListener(APP_SHORTCUT_EVENTS.openAi, handleOpen);
            window.removeEventListener(APP_SHORTCUT_EVENTS.closeAi, handleClose);
        };
    }, []);

    if (isHiddenRoute) return null;

    return (
        <>
            {/* Floating Action Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="fixed right-4 z-[9998] md:right-6"
                        style={{
                            bottom: isMobile
                                ? isRoofEstimatorRoute
                                    ? "calc(env(safe-area-inset-bottom, 0px) + 108px)"
                                    : "calc(env(safe-area-inset-bottom, 0px) + 96px)"
                                : "24px",
                        }}
                    >
                        {/* Pulse ring */}
                        {showPulse && (
                            <div className="absolute inset-0 rounded-full">
                                <div className="absolute inset-0 rounded-full bg-[#0891B2]/20 animate-ping" />
                                <div className="absolute -inset-1 rounded-full bg-[#22D3EE]/10 animate-pulse" />
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsOpen(true)}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className={cn(
                                "relative flex items-center gap-2.5 rounded-full shadow-lg transition-all duration-300",
                                "bg-gradient-to-br from-[#0891B2] to-[#0E7490]",
                                "hover:shadow-xl hover:shadow-[#0891B2]/25",
                                "text-white",
                                isHovered ? "px-5 py-3.5" : "p-3.5"
                            )}
                            style={{
                                boxShadow: "0 8px 32px rgba(8, 145, 178, 0.3), 0 2px 8px rgba(0,0,0,0.1)",
                            }}
                        >
                            {/* Inner glow */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />

                            <div className="relative">
                                <Sparkles
                                    size={20}
                                    className={cn(
                                        "transition-transform duration-300",
                                        isHovered && "rotate-12"
                                    )}
                                />
                            </div>

                            <AnimatePresence>
                                {isHovered && (
                                    <motion.span
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: "auto", opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-sm font-semibold whitespace-nowrap overflow-hidden"
                                    >
                                        Ask Zodo AI
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {/* AI live indicator dot */}
                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white">
                                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                            </div>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Copilot Panel */}
            <AiCopilotPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
