import { Plus, Trash2, Image, Type } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useEffect } from 'react';
import { calculateLineItem } from '../../../utils/invoiceUtils';

export default function LineItemTable() {
  const { register, control, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch for changes to recalculate on the fly
  const items = useWatch({
    control,
    name: 'items',
  });

  // Effect to recalculate rows when qty, rate, or gst changes
  useEffect(() => {
    items?.forEach((item: any, index: number) => {
      const { amount, cgst, sgst, total } = calculateLineItem(
        Number(item.quantity) || 0,
        Number(item.rate) || 0,
        Number(item.gstRate) || 0
      );
      
      // Only update if values are different to avoid infinite loops
      if (item.amount !== amount) setValue(`items.${index}.amount`, amount);
      if (item.cgst !== cgst) setValue(`items.${index}.cgst`, cgst);
      if (item.sgst !== sgst) setValue(`items.${index}.sgst`, sgst);
      if (item.total !== total) setValue(`items.${index}.total`, total);
    });
  }, [items, setValue]);

  return (
    <div className="mt-8">
      {/* Purple Header */}
      <div className="bg-[#6366F1] text-white p-3 rounded-t-lg grid grid-cols-12 gap-4 text-xs font-semibold uppercase tracking-wider">
        <div className="col-span-3">Item</div>
        <div className="col-span-1 text-center">SKU/HSN</div> {/* Changed to SKU */}
        <div className="col-span-1 text-center">Tax %</div>
        <div className="col-span-1 text-center">Qty</div>
        <div className="col-span-1 text-right">Rate</div>
        <div className="col-span-1 text-right">Amount</div>
        <div className="col-span-1 text-right">GST/HST</div> {/* Changed from CGST */}
        <div className="col-span-1 text-right">PST</div>     {/* Changed from SGST */}
        <div className="col-span-1 text-right">Total</div>
        <div className="col-span-1 text-center">Action</div>
      </div>

      {/* Rows */}
      <div className="border border-t-0 border-gray-200 rounded-b-lg bg-white">
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 items-start text-sm">
            
            {/* Item Name */}
            <div className="col-span-3 space-y-2">
              <input
                {...register(`items.${index}.name`)}
                placeholder="Item Name"
                className="w-full p-1.5 border-b border-gray-300 focus:outline-none focus:border-indigo-500 bg-transparent"
              />
              <div className="flex gap-2 text-xs text-gray-400">
                <button type="button" className="flex items-center hover:text-indigo-600">
                  <Type size={12} className="mr-1" /> Add Desc
                </button>
                <button type="button" className="flex items-center hover:text-indigo-600">
                  <Image size={12} className="mr-1" /> Add Image
                </button>
              </div>
            </div>
            
            {/* SKU */}
            <div className="col-span-1">
              <input {...register(`items.${index}.hsn`)} placeholder="#" className="w-full text-center p-1 border-b border-gray-200" />
            </div>
            
            {/* Tax Rate - CANADIAN DEFAULTS */}
            <div className="col-span-1">
              <select {...register(`items.${index}.gstRate`)} className="w-full text-center p-1 border-b border-gray-200 bg-white">
                <option value="13">13% (HST)</option>
                <option value="5">5% (GST)</option>
                <option value="15">15% (HST)</option>
                <option value="12">12% (BC)</option>
                <option value="0">0%</option>
              </select>
            </div>
            
            {/* Quantity */}
            <div className="col-span-1">
              <input 
                type="number" 
                {...register(`items.${index}.quantity`)} 
                className="w-full text-center p-1 border-b border-gray-200" 
              />
            </div>
            
            {/* Rate */}
            <div className="col-span-1">
              <input 
                type="number" 
                {...register(`items.${index}.rate`)} 
                className="w-full text-right p-1 border-b border-gray-200" 
              />
            </div>
            
            {/* Read Only Calculated Fields (Converted to $) */}
            <div className="col-span-1 text-right text-gray-600 pt-1">
              ${items[index]?.amount?.toFixed(2) || '0.00'}
            </div>
            <div className="col-span-1 text-right text-xs text-gray-500 pt-2">
              ${items[index]?.cgst?.toFixed(2) || '0.00'}
            </div>
            <div className="col-span-1 text-right text-xs text-gray-500 pt-2">
              ${items[index]?.sgst?.toFixed(2) || '0.00'}
            </div>
            <div className="col-span-1 text-right font-semibold text-gray-800 pt-1">
              ${items[index]?.total?.toFixed(2) || '0.00'}
            </div>
            
            {/* Remove Button */}
            <div className="col-span-1 text-center">
              <button 
                type="button" 
                onClick={() => remove(index)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {/* Append Button - Defaulting to 13% HST */}
        <button
          type="button"
          onClick={() => append({ name: '', quantity: 1, rate: 0, gstRate: 13, amount: 0, cgst: 0, sgst: 0, total: 0 })}
          className="w-full py-3 text-indigo-600 font-medium text-sm border-dashed border-t border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add New Line
        </button>
      </div>
    </div>
  );
}