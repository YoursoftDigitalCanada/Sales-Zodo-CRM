import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface BookingEntity {
    id: string | number;
    [key: string]: unknown;
}

export async function getBookings(): Promise<BookingEntity[]> {
    const response = await api.get("/bookings");
    return extractApiArray<BookingEntity>(response.data);
}

export async function getBookingById(id: string | number): Promise<BookingEntity> {
    const response = await api.get(`/bookings/${id}`);
    return response.data?.data || response.data;
}

export async function createBooking(data: Record<string, unknown>): Promise<BookingEntity> {
    const response = await api.post("/bookings", data);
    return response.data?.data || response.data;
}

export async function updateBooking(id: string | number, data: Record<string, unknown>): Promise<BookingEntity> {
    const response = await api.put(`/bookings/${id}`, data);
    return response.data?.data || response.data;
}

export async function confirmBooking(id: string | number): Promise<BookingEntity> {
    const response = await api.patch(`/bookings/${id}/confirm`);
    return response.data?.data || response.data;
}

export async function cancelBooking(id: string | number): Promise<BookingEntity> {
    const response = await api.patch(`/bookings/${id}/cancel`);
    return response.data?.data || response.data;
}

export async function deleteBooking(id: string | number): Promise<void> {
    await api.delete(`/bookings/${id}`);
}
