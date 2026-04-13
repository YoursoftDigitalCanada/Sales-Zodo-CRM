import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileText, Loader2 } from "lucide-react";

interface InspectionReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  fileName: string;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  onDownload: () => void;
}

const InspectionReportPreviewDialog = ({
  open,
  onOpenChange,
  pdfUrl,
  fileName,
  title = "Inspection Report Preview",
  subtitle,
  loading = false,
  onDownload,
}: InspectionReportPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] overflow-hidden rounded-xl p-0 max-h-[95vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle || fileName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 border-b border-gray-200 bg-[#F8FAFC] px-4 py-4 pr-14 sm:flex-row sm:items-center sm:justify-between sm:pr-16">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E40AF]/10">
              <FileText size={20} className="text-[#1E40AF]" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-[#0F172A] sm:text-base">{title}</h3>
              <p className="truncate text-xs text-[#64748B]">
                {subtitle || fileName}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full rounded-lg border-gray-200 sm:w-auto"
            onClick={onDownload}
            disabled={!pdfUrl || loading}
          >
            <Download size={14} className="mr-1.5" />
            Download
          </Button>
        </div>

        <div className="overflow-auto p-4" style={{ maxHeight: "calc(95vh - 84px)" }}>
          {loading ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-gray-200 bg-white">
              <Loader2 size={32} className="animate-spin text-[#1E40AF]" />
              <div className="text-center">
                <p className="text-sm font-medium text-[#0F172A]">Generating inspection PDF</p>
                <p className="text-xs text-[#64748B]">We&apos;re building the report and opening it here for review.</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title={fileName}
              className="w-full rounded-lg border border-gray-200 bg-white"
              style={{ height: "78vh" }}
            />
          ) : (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-gray-200 bg-white px-6 text-center">
              <FileText size={36} className="text-[#94A3B8]" />
              <div>
                <p className="text-sm font-medium text-[#0F172A]">Preview unavailable</p>
                <p className="text-xs text-[#64748B]">Try generating the inspection report again.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InspectionReportPreviewDialog;
