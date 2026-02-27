import React, { useEffect, useState } from 'react';
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { Plus, Scissors, DollarSign, Clock, X } from "lucide-react";
import { getServices, createService, deleteService } from "@/features/services";
import type { ServiceEntity } from "@/features/services";

export default function Services() {
  const [services, setServices] = useState<ServiceEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ name: "", price: "", durationMinutes: "30", isActive: true });

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      const data = await getServices();
      setServices(data);
    } catch (error) {
      console.error("Failed to load services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await createService({
        name: formData.name,
        price: Number(formData.price),
        durationMinutes: Number(formData.durationMinutes),
        isActive: true,
      });

      alert("Service Added!");
      setIsModalOpen(false);
      setFormData({ name: "", price: "", durationMinutes: "30", isActive: true });
      loadServices(); // Refresh list
    } catch (error) {
      alert("Error saving service");
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      await deleteService(id);
      loadServices();
    } catch (error) {
      console.error("Failed to delete service:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Services Menu</h1>
            <p className="text-[#475569]">Manage what your company provides</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-black text-[#0F172A] px-4 py-2 rounded-md flex items-center hover:bg-gray-800 transition"
          >
            <Plus size={18} className="mr-2" /> Add Service
          </button>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white p-6 rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-[#0891B2]/10 p-3 rounded-md">
                  <Scissors className="text-[#0891B2]" size={24} />
                </div>
                <button onClick={() => handleDelete(service.id)} className="text-[#94A3B8] hover:text-red-500">
                  <X size={18} />
                </button>
              </div>

              <h3 className="text-lg font-bold text-[#0F172A] mb-1">{service.name}</h3>
              <div className="flex items-center gap-4 text-sm text-[#475569] mt-4">
                <span className="flex items-center"><DollarSign size={14} className="mr-1" /> ${service.price}</span>
                <span className="flex items-center"><Clock size={14} className="mr-1" /> {service.durationMinutes} mins</span>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* Add Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-md card-shadow w-96 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Service</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-[#94A3B8] hover:text-red-500" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Service Name</label>
                <input
                  placeholder="e.g. Haircut, Dental Cleaning"
                  className="w-full p-2 border rounded-md"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Price ($)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-md"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Duration (min)</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.durationMinutes}
                    onChange={e => setFormData({ ...formData, durationMinutes: e.target.value })}
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 Hour</option>
                    <option value="90">1.5 Hours</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-[#0891B2] text-white py-3 rounded-md font-semibold mt-4 hover:bg-[#0891B2]/80"
              >
                Save Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
