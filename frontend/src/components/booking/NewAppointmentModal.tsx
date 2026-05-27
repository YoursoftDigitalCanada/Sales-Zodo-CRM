// src/components/bookings/NewAppointmentModal.tsx
import React, { useEffect, useState } from "react";
import { getBookings, createBooking } from "@/features/bookings/services/bookings-service";
import { getUsers } from "@/features/users/services/users-service";

/**
 * NewAppointmentModal
 * - apiBase: base URL for API, e.g. http://localhost:3000
 * - onClose: callback when modal closes
 *
 * After successful create it dispatches window.dispatchEvent(new Event('bookings:reload'))
 * so AppointmentList will refresh.
 */

type EventTypeOption = { id: string | number; title: string; durationMinutes?: number };
type UserOption = { id: string | number; fullName: string };

const API_PREFIX = "/api/v1";

export default function NewAppointmentModal({ apiBase, onClose }: { apiBase: string; onClose: () => void }) {
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // form fields
  const [eventTypeId, setEventTypeId] = useState<number | string | "">("")
  const [hostUserId, setHostUserId] = useState<number | string | "">("")
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [date, setDate] = useState<string>(() => {
    // default to today yyyy-mm-dd
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState<string>("09:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // load event types and users in parallel
    const load = async () => {
      try {
        const [bookingsData, usersData] = await Promise.all([
          getBookings() as Promise<any[]>,
          getUsers() as Promise<any[]>,
        ]);

        const bookings = bookingsData || [];
        const userRecords = usersData || [];

        const eventTypeMap = new Map<string, EventTypeOption>();
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
          });
        });

        const derivedEventTypes = Array.from(eventTypeMap.values());
        const fallbackEventTypes: EventTypeOption[] = [
          { id: "consultation", title: "Consultation", durationMinutes: 30 },
          { id: "follow-up", title: "Follow-up", durationMinutes: 30 },
        ];
        const nextEventTypes =
          derivedEventTypes.length > 0 ? derivedEventTypes : fallbackEventTypes;

        const mappedUsers: UserOption[] = userRecords.map((user: any, index: number) => {
          const fullName = `${user?.firstName || user?.user?.firstName || ""} ${user?.lastName || user?.user?.lastName || ""
            }`.trim();
          return {
            id: user?.id ?? `user-${index}`,
            fullName: fullName || user?.email || "User",
          };
        });

        setEventTypes(nextEventTypes);
        setUsers(mappedUsers);

        if (nextEventTypes.length) setEventTypeId(nextEventTypes[0].id);
        if (mappedUsers.length) setHostUserId(mappedUsers[0].id);
      } catch (e) {
        console.error("Failed to load supporting data for New Appointment", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    // validation
    if (!eventTypeId) return alert("Please select event type");
    if (!date || !time) return alert("Please provide date and time");
    if (!customerName.trim()) return alert("Please enter customer name");

    // find duration from event type, fallback 30 mins
    const et = eventTypes.find(x => String(x.id) === String(eventTypeId));
    const dur = et?.durationMinutes ?? 30;

    // create startAt and endAt ISO strings (UTC)
    const startLocal = new Date(`${date}T${time}:00`);
    const endLocal = new Date(startLocal.getTime() + dur * 60000);

    const payload = {
      title: et?.title || "Appointment",
      description: [
        customerName.trim() ? `Customer: ${customerName.trim()}` : "",
        customerEmail.trim() ? `Email: ${customerEmail.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      startTime: startLocal.toISOString(),
      endTime: endLocal.toISOString(),
      status: "PENDING",
      ...(hostUserId ? { assignedToId: String(hostUserId) } : {}),
    };

    setSaving(true);
    try {
      await createBooking(payload);
      // success -> notify appointment list to reload
      window.dispatchEvent(new Event("bookings:reload"));
      onClose();
    } catch (e: any) {
      console.error("Failed to create booking", e);
      alert("Create failed: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-sm">
      <div className="w-[760px] max-w-full bg-white rounded p-6 card-shadow">
        <h3 className="text-lg font-semibold mb-4">New Appointment</h3>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Event Type</label>
              <select className="w-full border rounded p-2" value={String(eventTypeId)} onChange={e => setEventTypeId(e.target.value === "" ? "" : e.target.value)}>
                <option value="">-- select --</option>
                {eventTypes.map(et => <option key={et.id} value={et.id}>{et.title} • {et.durationMinutes ?? 30} min</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Host / Resource</label>
              <select className="w-full border rounded p-2" value={String(hostUserId)} onChange={e => setHostUserId(e.target.value === "" ? "" : e.target.value)}>
                <option value="">-- none --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Customer name</label>
              <input className="w-full border rounded p-2" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm mb-1">Customer email</label>
              <input className="w-full border rounded p-2" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm mb-1">Date</label>
              <input type="date" className="w-full border rounded p-2" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm mb-1">Time</label>
              <input type="time" className="w-full border rounded p-2" value={time} onChange={e => setTime(e.target.value)} />
            </div>

            <div className="col-span-2 flex justify-end gap-2 mt-3">
              <button className="px-4 py-2 border rounded" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="px-4 py-2 bg-primary text-[#0F172A] rounded" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Create Appointment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
