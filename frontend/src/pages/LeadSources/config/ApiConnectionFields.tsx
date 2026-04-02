import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, ShieldCheck } from "lucide-react";

interface ApiConnectionFieldsProps {
  cfg: Record<string, any>;
  update: (key: string, value: any) => void;
  providerName: string;
  endpointPlaceholder: string;
  leadsPathPlaceholder?: string;
}

const ApiConnectionFields = ({
  cfg,
  update,
  providerName,
  endpointPlaceholder,
  leadsPathPlaceholder = "data.leads",
}: ApiConnectionFieldsProps) => {
  const authType = cfg.authType || "bearer";

  return (
    <div className="space-y-4 p-4 bg-[#F7F7FB] rounded-xl border border-[rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        <Link2 size={16} className="text-[#0891B2]" />
        <h4 className="font-semibold text-sm text-[#0F172A]">Direct {providerName} Sync</h4>
      </div>
      <p className="text-xs text-[#475569]">
        Use this when you have a provider API, bridge service, or middleware endpoint that returns lead JSON.
      </p>

      <div className="space-y-2">
        <Label className="text-sm text-[#475569]">API Endpoint</Label>
        <Input
          value={cfg.api_endpoint || ""}
          onChange={(event) => update("api_endpoint", event.target.value)}
          placeholder={endpointPlaceholder}
          className="h-10 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm text-[#475569]">Request Method</Label>
          <Select value={cfg.requestMethod || "GET"} onValueChange={(value) => update("requestMethod", value)}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="GET" className="rounded-lg">GET</SelectItem>
              <SelectItem value="POST" className="rounded-lg">POST</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-[#475569]">Leads Path</Label>
          <Input
            value={cfg.leadsPath || ""}
            onChange={(event) => update("leadsPath", event.target.value)}
            placeholder={leadsPathPlaceholder}
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm text-[#475569]">Auth Type</Label>
          <Select value={authType} onValueChange={(value) => update("authType", value)}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="none" className="rounded-lg">No Auth</SelectItem>
              <SelectItem value="bearer" className="rounded-lg">Bearer Token</SelectItem>
              <SelectItem value="header" className="rounded-lg">Custom Header</SelectItem>
              <SelectItem value="query" className="rounded-lg">Query Param</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-[#475569]">Incremental Sync Param</Label>
          <Input
            value={cfg.sinceParam || ""}
            onChange={(event) => update("sinceParam", event.target.value)}
            placeholder="updated_after"
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      {authType !== "none" && (
        <div className="space-y-3 pl-4 border-l-2 border-cyan-200">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#0EA5E9]" />
            <p className="text-xs font-medium text-[#0F172A]">Authentication</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(authType === "header" || authType === "query") && (
              <div className="space-y-2">
                <Label className="text-sm text-[#475569]">
                  {authType === "header" ? "Header Name" : "Query Param"}
                </Label>
                <Input
                  value={authType === "header" ? (cfg.apiKeyHeader || "") : (cfg.authQueryParam || "")}
                  onChange={(event) => update(authType === "header" ? "apiKeyHeader" : "authQueryParam", event.target.value)}
                  placeholder={authType === "header" ? "X-API-Key" : "api_key"}
                  className="h-10 rounded-xl"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm text-[#475569]">Token / API Key</Label>
              <Input
                value={cfg.api_key || ""}
                onChange={(event) => update("api_key", event.target.value)}
                placeholder="Paste secure token"
                className="h-10 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiConnectionFields;
