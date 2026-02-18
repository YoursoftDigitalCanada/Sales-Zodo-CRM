import { Plus, Download, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { generateInvoicePDF } from '../../utils/generateInvoicePDF';
import api from "@/lib/axios";

interface Invoice {
  id: string; // This is the GUID from backend
  invoiceNumber: string;
  clientName: string;
  invoiceDate: string;
  status: string;
  total: number;
  items: any[];
}

export default function InvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  // State to track which dropdown is open (by Invoice ID)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get("/invoices");
      setInvoices(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to load invoices", err);
    }
  };

  // --- ACTIONS ---

  const handleDownload = (invoice: Invoice) => {
    // ... (Your existing PDF logic here) ...
    // Keeping it brief for readability, paste your PDF logic from previous step here
    alert("Downloading PDF for " + invoice.invoiceNumber); 
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const res = await api.delete(`/invoices/${id}`);

      if (res.status >= 200 && res.status < 300) {
        // Remove from UI immediately
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        setOpenMenuId(null); // Close menu
      } else {
        alert("Failed to delete. Check backend.");
      }
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  const handleEdit = (id: string) => {
    // Navigate to the edit page (You need to create this route next!)
    navigate(`/invoice/${id}/edit`);
  };

  return (
    <div className="p-6 min-h-screen" onClick={() => setOpenMenuId(null)}> 
      {/* ^^^ clicking anywhere else closes the menu */}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Invoices</h2>
          <p className="text-gray-500 mt-1">Manage your billing and payments</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); navigate('/invoice/create'); }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 shadow-sm transition-colors"
        >
          <Plus size={20} /> Create New Invoice
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible"> 
        {/* overflow-visible is important for dropdowns to show! */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-600 text-sm border-b border-gray-200">
              <th className="p-4 font-semibold">Invoice #</th>
              <th className="p-4 font-semibold">Client</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Amount (CAD)</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-indigo-600">{inv.invoiceNumber}</td>
                <td className="p-4 text-gray-800">{inv.clientName}</td>
                <td className="p-4 text-gray-500 text-sm">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {inv.status || 'Saved'}
                  </span>
                </td>
                <td className="p-4 text-right font-semibold text-gray-900">
                  {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(inv.total)}
                </td>
                
                {/* --- ACTION COLUMN --- */}
                <td className="p-4 text-right relative">
                  <div className="flex items-center justify-end gap-2">
                    {/* Download Icon */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDownload(inv); }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <Download size={18} />
                    </button>
                    
                    {/* 3-Dot Menu Button */}
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent closing immediately
                          setOpenMenuId(openMenuId === inv.id ? null : inv.id);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {/* --- THE DROPDOWN MENU --- */}
                      {openMenuId === inv.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                          <div className="py-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(inv.id); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                            >
                              <Edit size={16} className="mr-2 text-blue-500" /> Update
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                            >
                              <Trash2 size={16} className="mr-2" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
