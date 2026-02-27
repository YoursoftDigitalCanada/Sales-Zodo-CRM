// src/components/Layout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useState } from "react";

export default function Layout() {

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
<div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}