import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Plus, Trash2 } from "lucide-react";
import {
  crmFieldOptions,
  LeadFieldMappingRow,
  transformOptions,
} from "./field-mapping-utils";

interface FieldMappingEditorProps {
  rows: LeadFieldMappingRow[];
  onChange: (rows: LeadFieldMappingRow[]) => void;
  title?: string;
  description?: string;
}

const FieldMappingEditor = ({
  rows,
  onChange,
  title = "Field Mapping",
  description = "Map incoming lead fields to CRM lead fields",
}: FieldMappingEditorProps) => {
  const updateRow = (index: number, key: keyof LeadFieldMappingRow, value: string) => {
    const nextRows = [...rows];
    nextRows[index] = {
      ...nextRows[index],
      [key]: value,
    };
    onChange(nextRows);
  };

  const addRow = () => {
    onChange([
      ...rows,
      {
        form: "",
        crm: "-- Ignore --",
        transform: "None",
      },
    ]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Globe size={16} className="text-[#6637F4]" />
        <h4 className="font-semibold text-sm text-[#0F172A]">{title}</h4>
      </div>
      <p className="text-xs text-[#94A3B8] mb-3">{description}</p>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider px-1">
          <span>Incoming Field</span>
          <span></span>
          <span>CRM Field</span>
          <span>Transform</span>
          <span></span>
        </div>

        {rows.map((row, index) => (
          <div key={`${row.form}-${index}`} className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 items-center">
            <Input
              value={row.form}
              onChange={(event) => updateRow(index, "form", event.target.value)}
              className="h-9 rounded-lg text-xs"
              placeholder="field_name"
            />
            <span className="text-[#94A3B8] text-xs">→</span>
            <Select value={row.crm} onValueChange={(value) => updateRow(index, "crm", value)}>
              <SelectTrigger className="h-9 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {crmFieldOptions.map((field) => (
                  <SelectItem key={field} value={field} className="rounded-lg text-xs">
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={row.transform} onValueChange={(value) => updateRow(index, "transform", value)}>
              <SelectTrigger className="h-9 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {transformOptions.map((transform) => (
                  <SelectItem key={transform} value={transform} className="rounded-lg text-xs">
                    {transform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addRow} className="rounded-lg text-xs">
          <Plus size={12} className="mr-1" /> Add Field
        </Button>
      </div>
    </div>
  );
};

export default FieldMappingEditor;
