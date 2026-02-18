type Props = {
  items: any[];
  setItems: (items: any[]) => void;
};

export default function InvoiceItemsTable({ items, setItems }: Props) {
  const updateItem = (index: number, key: string, value: any) => {
    const updated = [...items];
    updated[index][key] = value;
    updated[index].total =
      updated[index].quantity * updated[index].unitPrice;
    setItems(updated);
  };

  const addRow = () => {
    setItems([
      ...items,
      { itemName: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const removeRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <table width="100%">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>
                <input
                  value={item.itemName}
                  onChange={(e) =>
                    updateItem(i, "itemName", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(i, "quantity", +e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(i, "unitPrice", +e.target.value)
                  }
                />
              </td>
              <td>{item.total}</td>
              <td>
                <button onClick={() => removeRow(i)}>❌</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addRow}>+ Add Item</button>
    </div>
  );
}
