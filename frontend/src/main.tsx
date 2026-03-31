import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeUserLocalization } from "@/lib/user-localization";

initializeUserLocalization();

createRoot(document.getElementById("root")!).render(<App />);
