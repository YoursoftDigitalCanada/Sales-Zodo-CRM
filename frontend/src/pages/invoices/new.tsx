import { useState } from "react";

type Item = {
  id: number;
  name: string;
  qty: number;
  rate: number;
  gst: number;
};

export default function InvoiceCreate() {
  const [items, setItems] = useState<Item[]>([
    { id: 1, name: "", qty: 1, rate: 0, gst: 18 },
  ]);

  const updateItem = (id: number, key: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [key]: value } : i));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), name: "", qty: 1, rate: 0, gst: 18 }]);
  };

  const calc = (i: Item) => {
    const amount = i.qty * i.rate;
    const gstAmt = (amount * i.gst) / 100;
    return {
      amount,
      cgst: gstAmt / 2,
      sgst: gstAmt / 2,
      total: amount + gstAmt,
    };
  };

  const summary = items.reduce(
    (acc, i) => {
      const c = calc(i);
      acc.sub += c.amount;
      acc.cgst += c.cgst;
      acc.sgst += c.sgst;
      acc.total += c.total;
      return acc;
    },
    { sub: 0, cgst: 0, sgst: 0, total: 0 }
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Invoice</h1>
          <div className="border-dashed border rounded p-4 text-sm text-gray-400">
            Add Business Logo
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <input className="input" value="INV-2025-0001" disabled />
          <input type="date" className="input" />
          <input type="date" className="input" />
        </div>

        {/* Billing */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-medium mb-2">Billed By</h3>
            <input className="input mb-2" placeholder="Business Name" />
            <input className="input mb-2" placeholder="GSTIN" />
            <input className="input" placeholder="Address" />
          </div>
          <div>
            <h3 className="font-medium mb-2">Billed To</h3>
            <input className="input mb-2" placeholder="Client Name" />
            <input className="input mb-2" placeholder="GSTIN" />
            <input className="input" placeholder="Address" />
          </div>
        </div>

        {/* Items */}
        <table className="w-full border mb-4">
          <thead className="bg-purple-600 text-white text-sm">
            <tr>
              <th className="p-2">Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>GST %</th>
              <th>CGST</th>
              <th>SGST</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => {
              const c = calc(i);
              return (
                <tr key={i.id} className="border-t">
                  <td><input className="input" value={i.name} onChange={e => updateItem(i.id,"name",e.target.value)} /></td>
                  <td><input type="number" className="input" value={i.qty} onChange={e => updateItem(i.id,"qty",+e.target.value)} /></td>
                  <td><input type="number" className="input" value={i.rate} onChange={e => updateItem(i.id,"rate",+e.target.value)} /></td>
                  <td><input type="number" className="input" value={i.gst} /></td>
                  <td>₹ {c.cgst.toFixed(2)}</td>
                  <td>₹ {c.sgst.toFixed(2)}</td>
                  <td>₹ {c.total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button onClick={addItem} className="text-purple-600 text-sm mb-6">
          + Add New Line
        </button>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-80 bg-gray-50 p-4 rounded">
            <div className="flex justify-between"><span>Subtotal</span><span>₹ {summary.sub}</span></div>
            <div className="flex justify-between"><span>CGST</span><span>₹ {summary.cgst}</span></div>
            <div className="flex justify-between"><span>SGST</span><span>₹ {summary.sgst}</span></div>
            <hr className="my-2" />
            <div className="flex justify-between font-semibold"><span>Total</span><span>₹ {summary.total}</span></div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button className="bg-pink-600 text-white px-6 py-2 rounded">
            Save & Continue
          </button>
        </div>

      </div>
    </div>
  );
}
