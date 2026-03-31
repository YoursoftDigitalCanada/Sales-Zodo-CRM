import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Eye, Loader2, Plus, Trash2 } from "lucide-react";

export interface InspectionPhotoItem {
    id: string;
    name: string;
    previewUrl: string;
    statusLabel?: string;
}

interface InspectionPhotoSectionProps {
    items: InspectionPhotoItem[];
    onAddFiles: (files: File[]) => void | Promise<void>;
    onRemove?: (id: string) => void | Promise<void>;
    loading?: boolean;
    uploading?: boolean;
    disabled?: boolean;
}

const InspectionPhotoSection = ({
    items,
    onAddFiles,
    onRemove,
    loading = false,
    uploading = false,
    disabled = false,
}: InspectionPhotoSectionProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const triggerPicker = () => {
        if (disabled) return;
        inputRef.current?.click();
    };

    const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length > 0) {
            await onAddFiles(files);
        }
        event.target.value = "";
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleInputChange}
                disabled={disabled}
            />
            <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">📸 Roof Photos</h3>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
                        Assessed roof, damage close-ups, gutters, flashing
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg gap-1.5 border-gray-200"
                    onClick={triggerPicker}
                    disabled={disabled}
                >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    Upload Photos
                </Button>
            </div>

            {loading && items.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                    <Loader2 size={16} className="animate-spin text-[#1E40AF]" />
                    Loading inspection photos...
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="group relative aspect-square bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:border-[#1E40AF]/30 transition-colors"
                        >
                            <img
                                src={item.previewUrl}
                                alt={item.name}
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2 py-2">
                                <p className="text-[11px] font-medium text-white truncate">{item.name}</p>
                                {item.statusLabel ? <p className="text-[10px] text-white/80">{item.statusLabel}</p> : null}
                            </div>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <a
                                    href={item.previewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
                                    aria-label={`View ${item.name}`}
                                >
                                    <Eye size={14} className="text-gray-700" />
                                </a>
                                {onRemove ? (
                                    <button
                                        type="button"
                                        className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white disabled:opacity-60"
                                        onClick={() => void onRemove(item.id)}
                                        disabled={disabled}
                                        aria-label={`Remove ${item.name}`}
                                    >
                                        <Trash2 size={14} className="text-red-500" />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#1E40AF] hover:bg-blue-50/30 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={triggerPicker}
                        disabled={disabled}
                    >
                        <Plus size={24} className="text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">{items.length > 0 ? "Add Photo" : "Upload Photos"}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default InspectionPhotoSection;
