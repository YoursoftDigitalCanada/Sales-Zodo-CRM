import { MessageSquare, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatWhatsAppDate,
  type WhatsAppConnection,
} from "@/features/whatsapp/whatsapp-store";

interface WhatsAppConnectionCardProps {
  connection: WhatsAppConnection;
  onDisconnect: (connection: WhatsAppConnection) => void;
  onSendTestMessage: (connection: WhatsAppConnection) => void;
  onRefreshSync: (connection: WhatsAppConnection) => void;
}

export function WhatsAppConnectionCard({
  connection,
  onDisconnect,
  onSendTestMessage,
  onRefreshSync,
}: WhatsAppConnectionCardProps) {
  return (
    <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7]">
              Connected
            </Badge>
            <Badge variant="outline" className="border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]">
              {connection.providerLabel}
            </Badge>
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#94A3B8]">
              WhatsApp Number
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[#0F172A]">
              {connection.phoneNumber}
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">{connection.descriptor}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                Provider
              </p>
              <p className="mt-2 text-sm font-medium text-[#0F172A]">
                {connection.providerLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                Last Sync Time
              </p>
              <p className="mt-2 text-sm font-medium text-[#0F172A]">
                {formatWhatsAppDate(connection.lastSyncTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button
            type="button"
            onClick={() => onSendTestMessage(connection)}
            className="h-11 rounded-xl bg-[#0F766E] px-5 text-white hover:bg-[#115E59]"
          >
            <MessageSquare />
            Send Test Message
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-[#CBD5E1] px-5"
            onClick={() => onRefreshSync(connection)}
          >
            <RefreshCw />
            Refresh Sync
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-[#FECACA] px-5 text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#991B1B]"
            onClick={() => onDisconnect(connection)}
          >
            <Trash2 />
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}
