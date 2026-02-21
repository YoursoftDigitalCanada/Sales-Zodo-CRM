import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,

    // Add this proxy section 👇👇👇
    proxy: {
      "/api": {
        target: "http://localhost:3000", // your backend
        changeOrigin: true,
        secure: false,
      },
    },

    allowedHosts: [
      "63e2a783-f40f-4008-b9fb-51a1239414b4-00-10gdgnkdug5zu.worf.replit.dev",
      "localhost",
      "127.0.0.1",
    ],
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
