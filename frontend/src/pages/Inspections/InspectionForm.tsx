import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList } from "lucide-react";
import InspectionEditor from "@/components/inspections/InspectionEditor";

const InspectionForm = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <header className="crm-module-header sticky top-0 z-10 border-b border-gray-100 bg-white">
                <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 rounded-lg text-gray-500 hover:text-gray-900"
                            onClick={() => navigate("/inspections")}
                        >
                            <ArrowLeft size={16} />
                            Back
                        </Button>
                        <div className="h-6 w-px bg-gray-200" />
                        <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <ClipboardList size={20} className="text-[#0891B2]" />
                            New Inspection
                        </h1>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
                <div className="rounded-3xl border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm sm:p-6">
                    <InspectionEditor
                        onSuccess={(inspection) => {
                            navigate(`/inspections/${inspection.id}`);
                        }}
                        onCancel={() => navigate("/inspections")}
                    />
                </div>
            </div>
        </div>
    );
};

export default InspectionForm;
