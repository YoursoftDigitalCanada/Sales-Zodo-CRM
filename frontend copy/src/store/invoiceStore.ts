import { create } from "zustand";
import { nanoid } from "nanoid";

export const useInvoiceStore = create<any>((set) => ({
  items: [
    { id: nanoid(), name: "", hsn: "", qty: 1, rate: 0, gst: 18 },
  ],
  addItem: () =>
    set((s: any) => ({
      items: [...s.items, { id: nanoid(), name: "", hsn: "", qty: 1, rate: 0, gst: 18 }],
    })),
  updateItem: (id: string, field: string, value: any) =>
    set((s: any) => ({
      items: s.items.map((i: any) =>
        i.id === id ? { ...i, [field]: value } : i
      ),
    })),
}));
