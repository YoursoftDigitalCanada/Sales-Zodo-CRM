import { useInvoiceStore } from "@/store/invoiceStore";

export function LineItemTable() {
  const { items, updateItem, addItem } = useInvoiceStore();

  return (
    <table className="w-full border mt-6">
      <thead className="bg-purple-600 text-white">
        <tr>
          <th>Item</th><th>HSN</th><th>GST%</th>
          <th>Qty</th><th>Rate</th><th>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i: any) => {
          const amount = i.qty * i.rate;
          const gst = (amount * i.gst) / 100;
          return (
            <tr key={i.id}>
              <td><input onChange={e => updateItem(i.id,"name",e.target.value)} /></td>
              <td><input /></td>
              <td><input type="number" value={i.gst} /></td>
              <td><input type="number" value={i.qty} /></td>
              <td><input type="number" value={i.rate} /></td>
              <td>₹ {amount + gst}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={6}>
            <button onClick={addItem}>+ Add New Line</button>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
