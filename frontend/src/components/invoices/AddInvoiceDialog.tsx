import { useEffect, useState } from "react";
import { getClients } from "@/services/clientService";
import { createInvoice } from "@/services/invoiceService";

type Props = {
  onSuccess: () => void;
};

export function AddInvoiceDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState<number | "">("");
  const [items, setItems] = useState([
    { itemName: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);

  useEffect(() => {
    if (open) getClients().then(setClients);
  }, [open]);

  const updateItem = (i: number, key: string, val: any) => {
    const updated = [...items];
    updated[i][key] = val;
    updated[i].total = updated[i].quantity * updated[i].unitPrice;
    setItems(updated);
  };

  const addRow = () =>
    setItems([...items, { itemName: "", quantity: 1, unitPrice: 0, total: 0 }]);

  const total = items.reduce((s, i) => s + i.total, 0);

  const submit = async () => {
    if (!clientId) return alert("Select client");

    await createInvoice({
      clientId,
      invoiceDate: new Date(),
      dueDate: new Date(),
      items,
      taxAmount: 0,
      discount: 0,
    });

    setOpen(false);
    setItems([{ itemName: "", quantity: 1, unitPrice: 0, total: 0 }]);
    onSuccess();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-cyan-500 text-white px-4 py-2 rounded-md"
      >
        + Add Invoice
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[700px] rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Create Invoice</h2>

        {/* Client */}
        <label className="block text-sm mb-1">Client</label>
        <select
          className="w-full border rounded p-2 mb-4"
          value={clientId}
          onChange={(e) => setClientId(Number(e.target.value))}
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.clientName}
            </option>
          ))}
        </select>

        {/* Items */}
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <input
                className="border p-2 rounded"
                placeholder="Item"
                value={item.itemName}
                onChange={(e) => updateItem(i, "itemName", e.target.value)}
              />
              <input
                type="number"
                className="border p-2 rounded"
                value={item.quantity}
                onChange={(e) => updateItem(i, "quantity", +e.target.value)}
              />
              <input
                type="number"
                className="border p-2 rounded"
                value={item.unitPrice}
                onChange={(e) => updateItem(i, "unitPrice", +e.target.value)}
              />
              <input
                disabled
                className="border p-2 rounded bg-gray-100"
                value={item.total}
              />
            </div>
          ))}
        </div>

        <button onClick={addRow} className="text-sm text-cyan-600 mt-2">
          + Add Item
        </button>

        {/* Footer */}
        <div className="flex justify-between items-center mt-6">
          <span className="font-semibold">Total: ₹ {total}</span>
          <div className="space-x-2">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="px-4 py-2 bg-cyan-500 text-white rounded"
            >
              Save Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
