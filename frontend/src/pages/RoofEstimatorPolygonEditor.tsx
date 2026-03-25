import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import EstimateModule from "@/components/EstimateModule";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { Button } from "@/components/ui/button";

export default function RoofEstimatorPolygonEditor(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <main className="flex-1 overflow-y-auto">
        <div className="crm-module-header sticky top-0 z-30 flex min-h-[72px] items-center border-b border-[rgba(15,23,42,0.06)] bg-white/95 px-4 py-3 backdrop-blur lg:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/roof-estimator")}
            className="h-9 px-3 text-xs font-medium"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to AI Roof Estimator
          </Button>
        </div>
        <EstimateModule />
      </main>
    </div>
  );
}
