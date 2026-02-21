import React, { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import AvatarStack from "@/components/AvatarStack";

type EventType = {
  id: string | number;
  title: string;
  durationMinutes: number;
  isGroup: boolean;
  hostsCsv?: string;
  description?: string;
};

const API_PREFIX = "/api/v1";

const normalizeApiBase = (base: string): string =>
  (base || "")
    .replace(/\/+$/, "")
    .replace(/\/api(?:\/v1)?$/i, "");

const extractArray = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function EventTypeGrid({ api }: { api: string }) {
  const [types, setTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const base = normalizeApiBase(api);
      const res = await fetch(`${base}${API_PREFIX}/bookings`);
      if (!res.ok) throw new Error(`Failed to load bookings: ${res.status}`);

      const payload = await res.json();
      const bookings = extractArray(payload);
      const eventTypeMap = new Map<string, EventType>();

      bookings.forEach((booking: any) => {
        const title = booking?.title?.trim();
        if (!title || eventTypeMap.has(title)) return;

        const start = booking?.startTime ? new Date(booking.startTime).getTime() : null;
        const end = booking?.endTime ? new Date(booking.endTime).getTime() : null;
        const durationMinutes =
          start && end && end > start ? Math.round((end - start) / 60000) : 30;

        eventTypeMap.set(title, {
          id: title,
          title,
          durationMinutes,
          isGroup: false,
          description: booking?.description || "",
        });
      });

      setTypes(Array.from(eventTypeMap.values()));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">All Event Types</h2>
        <div className="flex items-center gap-3">
          <input placeholder="Search Service" className="border rounded px-3 py-2 w-64" />
          <button className="px-3 py-2 rounded bg-primary text-[#0F172A]">+ New Event Type</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {types.map(et => (
          <div key={et.id} className="p-4 rounded-md bg-white shadow-sm border">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-bold">{et.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{et.durationMinutes} mins • {et.isGroup ? "Group" : "One-on-One"}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button className="text-sm px-3 py-1 border rounded flex items-center gap-2"><Share2 className="h-4 w-4" /> Share</button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <AvatarStack users={[]} />
              <div className="text-sm text-muted-foreground"> {/* hosts or count */ } </div>
            </div>
          </div>
        ))}

        {types.length === 0 && !loading && (
          <div className="col-span-3 text-muted-foreground">No event types yet.</div>
        )}
      </div>
    </div>
  );
}
