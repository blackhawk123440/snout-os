"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function SittersPage() {
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSitter, setEditingSitter] = useState<Sitter | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    isActive: true,
  });

  useEffect(() => {
    fetchSitters();
  }, []);

  const fetchSitters = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sitters");
      const data = await response.json();
      setSitters(data.sitters || []);
    } catch (error) {
      console.error("Failed to fetch sitters:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingSitter ? `/api/sitters/${editingSitter.id}` : "/api/sitters";
      const method = editingSitter ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingSitter ? "Sitter updated!" : "Sitter added!");
        resetForm();
        fetchSitters();
      }
    } catch (error) {
      console.error("Failed to save sitter:", error);
      alert("Failed to save sitter");
    }
  };

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", phone: "", email: "", isActive: true });
    setShowAddForm(false);
    setEditingSitter(null);
  };

  const startEdit = (sitter: Sitter) => {
    setFormData({
      firstName: sitter.firstName,
      lastName: sitter.lastName,
      phone: sitter.phone,
      email: sitter.email,
      isActive: sitter.isActive,
    });
    setEditingSitter(sitter);
    setShowAddForm(true);
  };

  const handleDelete = async (sitterId: string) => {
    if (!confirm("Are you sure you want to delete this sitter?")) return;

    try {
      const response = await fetch(`/api/sitters/${sitterId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Sitter deleted!");
        fetchSitters();
      }
    } catch (error) {
      console.error("Failed to delete sitter:", error);
      alert("Failed to delete sitter");
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="min-h-screen" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-user-friends" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Sitters Management
                </h1>
                <p className="text-xs text-gray-500">Manage your pet care team</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                style={{ background: COLORS.primary }}
              >
                <i className="fas fa-plus mr-2"></i>Add Sitter
              </button>
              <a
                href="/bookings"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Bookings
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Sitters List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
              <p className="mt-2 text-gray-600">Loading sitters...</p>
            </div>
          ) : sitters.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-user-friends text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-600">No sitters found</p>
            </div>
          ) : (
            sitters.map((sitter) => (
              <div
                key={sitter.id}
                className="bg-white rounded-lg p-6 border-2 hover:shadow-md transition-all"
                style={{ borderColor: COLORS.primaryLight }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                        <i className="fas fa-user text-xl" style={{ color: COLORS.primary }}></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: COLORS.primary }}>
                          {sitter.firstName} {sitter.lastName}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          sitter.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {sitter.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-phone w-4"></i>
                        <span>{formatPhoneNumber(sitter.phone)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-envelope w-4"></i>
                        <span>{sitter.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-calendar w-4"></i>
                        <span>Added {new Date(sitter.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-6">
                    <button
                      onClick={() => startEdit(sitter)}
                      className="px-4 py-2 text-sm font-bold border rounded-lg hover:opacity-90 transition-all"
                      style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                    >
                      <i className="fas fa-edit mr-2"></i>Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sitter.id)}
                      className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all bg-red-500"
                    >
                      <i className="fas fa-trash mr-2"></i>Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>
              {editingSitter ? "Edit Sitter" : "Add Sitter"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: COLORS.primaryLight }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: COLORS.primaryLight }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: COLORS.primaryLight }}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: COLORS.primaryLight }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-medium" style={{ color: COLORS.primary }}>
                  Active Sitter
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                  style={{ background: COLORS.primary }}
                >
                  {editingSitter ? "Update" : "Add"} Sitter
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all"
                  style={{ color: COLORS.gray, borderColor: COLORS.border }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}