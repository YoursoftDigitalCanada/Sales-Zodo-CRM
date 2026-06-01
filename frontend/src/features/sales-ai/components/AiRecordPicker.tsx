import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type AiRecordOption = {
  id: string;
  label: string;
  detail?: string;
};

const normalize = (value?: string) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

function cleanOption(option: AiRecordOption): AiRecordOption {
  const label = option.label.trim();
  const seen = new Set([normalize(label)]);
  const detail = String(option.detail || "")
    .split(" · ")
    .map((part) => part.trim())
    .filter((part) => {
      const key = normalize(part);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" · ");
  return { ...option, label, detail: detail || undefined };
}

function dedupeOptions(options: AiRecordOption[]) {
  const ids = new Set<string>();
  const visibleRows = new Set<string>();
  return options.reduce<AiRecordOption[]>((result, rawOption) => {
    const option = cleanOption(rawOption);
    const id = normalize(option.id);
    const visibleRow = `${normalize(option.label)}|${normalize(option.detail)}`;
    if (ids.has(id) || visibleRows.has(visibleRow)) return result;
    ids.add(id);
    visibleRows.add(visibleRow);
    result.push(option);
    return result;
  }, []);
}

type AiRecordPickerProps = {
  label: string;
  value: string;
  options: AiRecordOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  loading?: boolean;
  optional?: boolean;
};

export function AiRecordPicker({
  label,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  loading = false,
  optional = false,
}: AiRecordPickerProps) {
  const [open, setOpen] = useState(false);
  const uniqueOptions = dedupeOptions(options);
  const selected = uniqueOptions.find((option) => option.id === value);
  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>{label}{optional ? <span className="ml-1 text-xs font-normal text-[#94A3B8]">(optional)</span> : null}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="h-auto min-h-10 w-full justify-between rounded-md px-3 py-2 text-left font-normal">
            <span className="min-w-0 truncate">
              {loading ? "Loading records..." : selected ? selected.label : placeholder}
            </span>
            {loading ? <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-[#94A3B8]" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#94A3B8]" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>No matching records found.</CommandEmpty>
              <CommandGroup>
                {optional ? (
                  <CommandItem value="none" onSelect={() => choose("")}>
                    <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                    No linked record
                  </CommandItem>
                ) : null}
                {uniqueOptions.map((option) => (
                  <CommandItem key={option.id} value={`${option.label} ${option.detail || ""}`} onSelect={() => choose(option.id)}>
                    <Check className={cn("mr-2 h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.detail ? <span className="block truncate text-xs text-[#94A3B8]">{option.detail}</span> : null}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
