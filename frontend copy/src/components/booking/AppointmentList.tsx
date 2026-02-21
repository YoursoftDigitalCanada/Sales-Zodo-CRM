// src/components/booking/AppointmentList.tsx
import React, { useEffect, useState, useCallback } from "react";
import { MoreHorizontal, Calendar, Clock } from "lucide-react";
import AvatarStack from "@/components/AvatarStack";

type Booking = {
  id: string | number;
  bookingId: string;
  eventType: { title: string } | null;
  hostUserId?: string | number | null;
  customerName: string;
  customerEmail?: string;
  paymentStatus: string;
  status: string;
  startAt: string;
  endAt: string;
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

const toDisplayStatus = (status?: string): string => {
  const normalized = status?.toUpperCase();
  if (normalized === "PENDING" || normalized === "CONFIRMED") return "Upcoming";
  if (normalized === "COMPLETED") return "Completed";
  if (normalized === "CANCELLED") return "Cancelled";
  return status || "Upcoming";
};

export default function AppointmentList({ api }: { api: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = normalizeApiBase(api);
      const res = await fetch(`${base}${API_PREFIX}/bookings`);
      if (!res.ok) throw new Error(`Failed to load bookings: ${res.status}`);
      const payload = await res.json();
      const rows = extractArray(payload);
      const now = Date.now();

      const mapped: Booking[] = rows.map((item: any) => {
        const startAt = item?.startTime || item?.startAt;
        const endAt = item?.endTime || item?.endAt;
        return {
          id: item?.id,
          bookingId: item?.bookingId || String(item?.id || "").slice(0, 8),
          eventType: { title: item?.title || item?.eventType?.title || "Appointment" },
          hostUserId: item?.assignedToId || item?.hostUserId || null,
          customerName: item?.client?.clientName || item?.customerName || "Client",
          customerEmail: item?.customerEmail,
          paymentStatus: item?.paymentStatus || "N/A",
          status: toDisplayStatus(item?.status),
          startAt,
          endAt,
        };
      });

      const filteredBookings = mapped.filter((booking) => {
        const startAt = new Date(booking.startAt).getTime();
        if (!Number.isFinite(startAt)) return false;
        if (filter === "all") return true;
        if (filter === "upcoming") return startAt >= now;
        return startAt < now;
      });

      setBookings(filteredBookings);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Unknown error");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [api, filter]);

  // initial load + reload when filter changes
  useEffect(() => {
    load();
  }, [load]);

  // listen for external reload events (e.g. NewAppointmentModal dispatches 'bookings:reload')
  useEffect(() => {
    const handler = () => {
      load();
    };
    window.addEventListener("bookings:reload", handler);
    return () => window.removeEventListener("bookings:reload", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally no deps so event listener is registered once

  // group by date string (locale date)
  const grouped = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const key = new Date(b.startAt).toLocaleDateString();
    (acc[key] ||= []).push(b);
    return acc;
  }, {});

  const dateKeys = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <div
            role="button"
            onClick={() => setFilter("upcoming")}
            className={`px-3 py-2 rounded cursor-pointer ${filter === "upcoming" ? "text-primary border-b-2 border-primary" : "text-muted"}`}
          >
            Upcoming
          </div>
          <div
            role="button"
            onClick={() => setFilter("past")}
            className={`px-3 py-2 rounded cursor-pointer ${filter === "past" ? "text-primary border-b-2 border-primary" : "text-muted"}`}
          >
            Past
          </div>
          <div
            role="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-2 rounded cursor-pointer ${filter === "all" ? "text-primary border-b-2 border-primary" : "text-muted"}`}
          >
            All
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input placeholder="Search appointments" className="border rounded px-3 py-2 w-64" />
          <button className="p-2 border rounded" aria-label="More options">
            <MoreHorizontal />
          </button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {dateKeys.length === 0 && !loading && !error && (
        <div className="text-muted-foreground">No appointments to show.</div>
      )}

      {dateKeys.map((date) => (
        <section key={date}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
              <Calendar className="h-4 w-4" /> {date}
            </div>
            <div className="text-sm text-primary font-medium">{grouped[date].length} Appointments</div>
          </div>

          <div className="bg-white rounded shadow-sm divide-y">
            {/* header row */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs text-muted-foreground border-b">
              <div className="col-span-2">Time</div>
              <div className="col-span-1">Booking ID</div>
              <div className="col-span-3">Event Type</div>
              <div className="col-span-2">User / Resource</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-1">Payment</div>
              <div className="col-span-1">Status</div>
            </div>

            {grouped[date].map((b) => (
              <div key={b.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center">
                <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <div>
                    {new Date(b.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                    {new Date(b.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <div className="col-span-1 text-sm">{b.bookingId}</div>

                <div className="col-span-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-surface flex items-center justify-center text-muted-foreground">
                    {/* icon placeholder */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3 6h6l-4.5 3.5L19 20l-7-4-7 4 1.5-8.5L3 8h6l3-6z" fill="#CBD5E1" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium">{b.eventType?.title ?? "—"}</div>
                </div>

                <div className="col-span-2 flex items-center gap-3">
                  <AvatarStack users={[]} />
                  <div className="text-sm">{b.hostUserId ? `Host #${b.hostUserId}` : "—"}</div>
                </div>

                <div className="col-span-2 text-sm text-muted-foreground">{b.customerName}</div>

                <div className="col-span-1 text-sm">{b.paymentStatus}</div>

                <div className="col-span-1">
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      b.status === "Upcoming"
                        ? "bg-primary/10 text-primary"
                        : b.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
