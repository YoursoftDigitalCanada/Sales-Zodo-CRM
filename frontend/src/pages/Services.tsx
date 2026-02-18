import React, { useEffect, useState } from 'react';
import { Sidebar } from "@/components/Sidebar";
import { Plus, Edit2, Trash2, Scissors, DollarSign, Clock, X } from "lucide-react";
import { buildApiUrl } from "@/services/api";

const API_URL = buildApiUrl("/services");

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ name: "", price: "", durationMinutes: "30", isActive: true });

  useEffect(() => { loadServices(); }, []);

  const loadServices = () => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => { setServices(data); setLoading(false); })
      .catch(console.error);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          price: Number(formData.price),
          durationMinutes: Number(formData.durationMinutes),
          isActive: true
        })
      });

      if (!response.ok) throw new Error("Failed to save");
      
      alert("Service Added!");
      setIsModalOpen(false);
      setFormData({ name: "", price: "", durationMinutes: "30", isActive: true });
      loadServices(); // Refresh list
    } catch (error) {
      alert("Error saving service");
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure you want to delete this service?")) return;
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    loadServices();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Services Menu</h1>
            <p className="text-gray-500">Manage what your company provides</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800 transition"
          >
            <Plus size={18} className="mr-2" /> Add Service
          </button>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <Scissors className="text-indigo-600" size={24} />
                </div>
                <button onClick={() => handleDelete(service.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">{service.name}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-4">
                <span className="flex items-center"><DollarSign size={14} className="mr-1"/> ${service.price}</span>
                <span className="flex items-center"><Clock size={14} className="mr-1"/> {service.durationMinutes} mins</span>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* Add Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-96 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Service</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-red-500"/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input 
                  placeholder="e.g. Haircut, Dental Cleaning" 
                  className="w-full p-2 border rounded-lg"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded-lg"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <select 
                    className="w-full p-2 border rounded-lg"
                    value={formData.durationMinutes}
                    onChange={e => setFormData({...formData, durationMinutes: e.target.value})}
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
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold mt-4 hover:bg-indigo-700"
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
