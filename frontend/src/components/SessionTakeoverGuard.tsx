import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCurrentSessionStatus,
  type CurrentSessionStatus,
} from "@/features/settings/services/settings-service";
import { clearAuthSession, getAccessToken } from "@/features/auth/lib/auth-storage";

const SESSION_STATUS_POLL_MS = 5000;

function getRemainingSeconds(logoutAt: string | null): number | null {
  if (!logoutAt) return null;
  const timestamp = new Date(logoutAt).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

export function SessionTakeoverGuard() {
  const [status, setStatus] = useState<CurrentSessionStatus | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const hasAccessToken = Boolean(getAccessToken());

  const performForcedLogout = useCallback(() => {
    clearAuthSession();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }, []);

  const syncSessionStatus = useCallback(async () => {
    if (!getAccessToken()) {
      setStatus(null);
      setSecondsRemaining(null);
      return;
    }

    try {
      const nextStatus = await getCurrentSessionStatus();
      setStatus(nextStatus);
      setSecondsRemaining(getRemainingSeconds(nextStatus.logoutAt));

      if (!nextStatus.active) {
        performForcedLogout();
      }
    } catch {
      // Let the shared API client handle real 401 logout redirects.
    }
  }, [performForcedLogout]);

  useEffect(() => {
    if (!hasAccessToken) {
      setStatus(null);
      setSecondsRemaining(null);
      return;
    }

    void syncSessionStatus();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncSessionStatus();
      }
    }, SESSION_STATUS_POLL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncSessionStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasAccessToken, syncSessionStatus]);

  useEffect(() => {
    if (!status?.warning || !status.logoutAt) {
      setSecondsRemaining(null);
      return;
    }

    setSecondsRemaining(getRemainingSeconds(status.logoutAt));

    const countdownId = window.setInterval(() => {
      const nextRemaining = getRemainingSeconds(status.logoutAt);
      setSecondsRemaining(nextRemaining);

      if (nextRemaining !== null && nextRemaining <= 0) {
        window.clearInterval(countdownId);
        performForcedLogout();
      }
    }, 1000);

    return () => window.clearInterval(countdownId);
  }, [performForcedLogout, status?.logoutAt, status?.warning]);

  const shouldShowWarning = useMemo(
    () => Boolean(status?.warning && status.logoutAt),
    [status],
  );

  if (!shouldShowWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F172A]/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.12)] bg-white p-6 shadow-2xl dark:bg-[#0F172A] dark:text-[#E2E8F0]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F97316]/10 text-[#F97316]">
            <AlertTriangle size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#E2E8F0]">
              Another device signed in
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#475569] dark:text-[#CBD5E1]">
              Your account was just used on another device. This device will be logged out automatically in{" "}
              <span className="font-semibold text-[#DC2626]">{secondsRemaining ?? 30}s</span>.
            </p>
            <p className="mt-3 text-xs text-[#94A3B8] dark:text-[#94A3B8]">
              To keep one account on one device only, the newer login is being kept active.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            onClick={performForcedLogout}
            className="bg-[#DC2626] text-white hover:bg-[#B91C1C]"
          >
            <LogOut size={16} className="mr-2" />
            Log out now
          </Button>
        </div>
      </div>
    </div>
  );
}
