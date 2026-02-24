import React from "react";

import EstimateModule from "@/components/EstimateModule";
import { Sidebar } from "@/components/Sidebar";

export default function RoofEstimatorPolygonEditor(): JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <EstimateModule />
      </main>
    </div>
  );
}
