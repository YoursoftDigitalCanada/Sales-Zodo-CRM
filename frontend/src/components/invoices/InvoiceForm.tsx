import { useState } from 'react'; // Added state
import { useRouter } from 'next/navigation'; // Added router
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Image as ImageIcon, Save, ArrowLeft, Download } from 'lucide-react';
import AddressBlock from './form-parts/AddressBlock';
import LineItemTable from './form-parts/LineItemTable';
import { numberToWords } from '../../utils/invoiceUtils';
import api from "@/lib/axios";

// --- Zod Schema ---
const invoiceSchema = z.object({
  invoiceNo: z.string(),
  date: z.string(),
  billedBy: z.object({ businessName: z.string(), phone: z.string(), city: z.string(), country: z.string() }),
  billedTo: z.object({ businessName: z.string().min(1, "Client Name Required"), phone: z.string() }),
  items: z.array(z.object({
    name: z.string().min(1, "Item name needed"),
    quantity: z.coerce.number().min(1),
    rate: z.coerce.number().min(0),
    gstRate: z.coerce.number(),
    amount: z.number(),
    cgst: z.number(),
    sgst: z.number(),
    total: z.number()
  }))
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function InvoiceForm() {
  const router = useRouter(); // Initialize Router
  const [isSaving, setIsSaving] = useState(false); // Loading state

  const methods = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNo: 'INV-2025-0001',
      date: new Date().toISOString().split('T')[0],
      items: [{ name: '', quantity: 1, rate: 0, gstRate: 18, amount: 0, cgst: 0, sgst: 0, total: 0 }]
    }
  });

  const { watch, handleSubmit } = methods;
  const items = watch('items');

  // Calculate Totals
  const subTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCGST = items.reduce((sum, item) => sum + (item.cgst || 0), 0);
  const totalSGST = items.reduce((sum, item) => sum + (item.sgst || 0), 0);
  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

  // --- API Handler ---
  const onSave = async (data: InvoiceFormData) => {
    setIsSaving(true);
    try {
      // 1. Prepare Payload for .NET API
      const payload = {
        invoiceNumber: data.invoiceNo,
        invoiceDate: data.date,
        dueDate: data.date, // You might want to add a due date field later
        clientName: data.billedTo.businessName,
        clientId: 1, // Replace with actual Client ID if you have a dropdown
        items: data.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          rate: item.rate,
          gstPercent: item.gstRate
        }))
      };

      // 2. Send to Backend
      await api.post("/invoices", payload);

      // 3. Redirect on Success
      alert("Invoice Saved Successfully!");
      router.push('/dashboard/invoices'); // <--- Redirects to list

    } catch (error) {
      console.error("Save Error:", error);
      alert("Error saving invoice. Check console.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Download Handler ---
  const handleDownload = () => {
    window.print(); // Basic Print/PDF for now
  };

  return (
    <div className="bg-white rounded-md shadow-sm p-8 max-w-6xl mx-auto my-6">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSave)}>
          
          {/* --- TOP ACTIONS (UPDATED) --- */}
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <button 
              type="button" 
              onClick={() => router.back()} 
              className="flex items-center text-[#475569] hover:text-slate-200"
            >
              <ArrowLeft size={18} className="mr-2" /> Back to List
            </button>
            
            <h1 className="text-3xl font-bold text-[#0F172A]">New Invoice</h1>

            <div className="flex gap-3">
              {/* Download Button */}
              <button 
                type="button" 
                onClick={handleDownload}
                className="px-4 py-2 border border-[rgba(15,23,42,0.06)] rounded-md text-slate-200 hover:bg-white/5 flex items-center"
              >
                <Download size={18} className="mr-2" /> Download
              </button>

              {/* Save Button */}
              <button 
                type="submit" 
                disabled={isSaving}
                className={`text-[#0F172A] px-6 py-2 rounded-md flex items-center card-shadow 
                  ${isSaving ? 'bg-pink-400 cursor-not-allowed' : 'bg-[#E91E63] hover:bg-pink-700 shadow-pink-500/30'}`}
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save size={18} className="mr-2" /> Save Invoice
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Header Section */}
          <div className="flex justify-between items-start mb-10">
            <div className="space-y-4 w-1/3">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-[#475569] w-24">Invoice No<span className="text-red-500">*</span></label>
                <input {...methods.register('invoiceNo')} className="border-b border-[rgba(15,23,42,0.06)] focus:border-indigo-500 focus:outline-none py-1 w-full text-[#0F172A] font-medium" />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-[#475569] w-24">Invoice Date<span className="text-red-500">*</span></label>
                <div className="relative w-full">
                  <input type="date" {...methods.register('date')} className="border-b border-[rgba(15,23,42,0.06)] focus:border-indigo-500 focus:outline-none py-1 w-full text-[#0F172A]" />
                  <Calendar size={16} className="absolute right-0 top-1.5 text-[#94A3B8] pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="w-1/3 border-2 border-dashed border-[rgba(15,23,42,0.06)] rounded-md h-32 flex flex-col items-center justify-center text-[#94A3B8] hover:bg-white/5 cursor-pointer transition-colors">
              <ImageIcon size={32} className="mb-2 text-indigo-400" />
              <span className="text-sm">Add Business Logo</span>
              <span className="text-xs mt-1">Resolution up to 1080x1080px</span>
            </div>
          </div>

          {/* Address Section */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <AddressBlock title="Billed By (Your Details)" prefix="billedBy" register={methods.register} />
            <AddressBlock title="Billed To (Client Details)" prefix="billedTo" register={methods.register} />
          </div>

          {/* Items Table */}
          <LineItemTable />

          {/* Summary Section */}
          <div className="flex justify-between mt-10">
            <div className="w-1/2 pr-12">
              <div className="bg-white/5 p-4 rounded-md">
                <h3 className="font-semibold text-slate-200 mb-2">Amount In Words</h3>
                <p className="text-sm text-[#475569] italic border-b border-[rgba(15,23,42,0.06)] pb-1">
                  {numberToWords(grandTotal)}
                </p>
              </div>
              <div className="mt-6 space-y-4">
                <div className="border border-[rgba(15,23,42,0.06)] rounded-md p-3 cursor-pointer hover:bg-white/5 flex items-center text-sm text-[#475569]">
                  <span className="text-[#0891B2] mr-2">+</span> Add Terms & Conditions
                </div>
                <div className="border border-[rgba(15,23,42,0.06)] rounded-md p-3 cursor-pointer hover:bg-white/5 flex items-center text-sm text-[#475569]">
                  <span className="text-[#0891B2] mr-2">+</span> Add Notes
                </div>
              </div>
            </div>

            <div className="w-1/3 bg-white/5 p-6 rounded-md h-fit">
              <div className="flex justify-between text-sm mb-3 text-[#475569]">
                <span>Subtotal</span>
                <span>${subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-3 text-[#475569]">
                <span>SGST</span>
                <span>${totalSGST.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-3 text-[#475569]">
                <span>CGST</span>
                <span>${totalCGST.toFixed(2)}</span>
              </div>
              
              <div className="border-t border-[rgba(15,23,42,0.06)] my-4 pt-4 flex justify-between items-center">
                <span className="text-lg font-bold text-[#0F172A]">Total (CAD)</span>
                <span className="text-2xl font-bold text-[#0F172A]">${grandTotal.toFixed(2)}</span>
              </div>

              <div className="mt-6 border-t border-dashed border-[rgba(15,23,42,0.06)] pt-6">
                <div className="h-16 border-b border-gray-400 mb-2"></div>
                <p className="text-right text-xs text-[#475569]">Authorized Signature</p>
              </div>
            </div>
          </div>

        </form>
      </FormProvider>
    </div>
  );
}
