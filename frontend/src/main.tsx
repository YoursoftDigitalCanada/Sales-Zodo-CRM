import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeUserLocalization } from "@/lib/user-localization";

initializeUserLocalization();

const CURRENT_ENTRY_PATH = new URL(import.meta.url).pathname;
const BUILD_CHECK_INTERVAL_MS = 60_000;

const extractLatestEntryPath = (html: string): string | null => {
  const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i);
  return match?.[1] || null;
};

const startBuildVersionWatcher = () => {
  if (typeof window === "undefined") return;

  let checking = false;

  const checkForNewBuild = async () => {
    if (checking) return;
    checking = true;

    try {
      const response = await fetch("/", { cache: "no-store", credentials: "same-origin" });
      const html = await response.text();
      const latestEntryPath = extractLatestEntryPath(html);

      if (latestEntryPath && latestEntryPath !== CURRENT_ENTRY_PATH) {
        window.location.reload();
      }
    } catch {
      // Non-blocking: if the version check fails we keep the current app running.
    } finally {
      checking = false;
    }
  };

  void checkForNewBuild();
  const intervalId = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void checkForNewBuild();
    }
  }, BUILD_CHECK_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkForNewBuild();
    }
  });

  window.addEventListener("beforeunload", () => {
    window.clearInterval(intervalId);
  });
};

startBuildVersionWatcher();

createRoot(document.getElementById("root")!).render(<App />);
