"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  personalPhone?: string | null;
  openphonePhone?: string | null;
  phoneType?: "personal" | "openphone";
  email: string;
  isActive: boolean;
  commissionPercentage?: number;
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
    personalPhone: "",
    openphonePhone: "",
    phoneType: "personal" as "personal" | "openphone",
    email: "",
    isActive: true,
    commissionPercentage: 80.0,
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
    } catch {
      setSitters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingSitter ? `/api/sitters/${editingSitter.id}` : "/api/sitters";
      const method = editingSitter ? "PATCH" : "POST";

      // Determine primary phone based on phoneType
      let primaryPhone = formData.phone;
      if (formData.phoneType === "personal" && formData.personalPhone) {
        primaryPhone = formData.personalPhone;
      } else if (formData.phoneType === "openphone" && formData.openphonePhone) {
        primaryPhone = formData.openphonePhone;
      } else if (formData.personalPhone) {
        primaryPhone = formData.personalPhone;
      } else if (formData.openphonePhone) {
        primaryPhone = formData.openphonePhone;
      }

      const submitData = {
        ...formData,
        phone: primaryPhone,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert(editingSitter ? "Sitter updated!" : "Sitter added!");
        resetForm();
        fetchSitters();
      }
    } catch {
      alert("Failed to save sitter");
    }
  };

  const resetForm = () => {
    setFormData({ 
      firstName: "", 
      lastName: "", 
      phone: "", 
      personalPhone: "",
      commissionPercentage: 80.0,
      openphonePhone: "",
      phoneType: "personal",
      email: "", 
      isActive: true 
    });
    setShowAddForm(false);
    setEditingSitter(null);
  };

  const startEdit = (sitter: Sitter) => {
    setFormData({
      firstName: sitter.firstName,
      lastName: sitter.lastName,
      phone: sitter.phone,
      personalPhone: sitter.personalPhone || "",
      openphonePhone: sitter.openphonePhone || "",
      phoneType: sitter.phoneType || "personal",
      email: sitter.email,
      isActive: sitter.isActive,
      commissionPercentage: sitter.commissionPercentage || 80.0,
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
    } catch {
      alert("Failed to delete sitter");
    }
  };

  // Import phone formatting utility
  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-user-friends" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold" style={{ color: COLORS.primary }}>
                  Sitters Management
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Manage your pet care team</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-all w-full sm:w-auto"
                style={{ background: COLORS.primary, color: COLORS.primaryLight }}
              >
                <i className="fas fa-plus"></i><span>Add Sitter</span>
              </button>
              <Link
                href="/bookings"
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold border rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left"></i><span>Back to Bookings</span>
              </Link>
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
                        {sitter.phoneType && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                            {sitter.phoneType === "personal" ? "Personal" : "OpenPhone"}
                          </span>
                        )}
                      </div>
                      {sitter.personalPhone && (
                        <div className="flex items-center gap-2">
                          <i className="fas fa-mobile-alt w-4"></i>
                          <span>Personal: {formatPhoneNumber(sitter.personalPhone)}</span>
                        </div>
                      )}
                      {sitter.openphonePhone && (
                        <div className="flex items-center gap-2">
                          <i className="fas fa-phone-alt w-4"></i>
                          <span>OpenPhone: {formatPhoneNumber(sitter.openphonePhone)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <i className="fas fa-envelope w-4"></i>
                        <span>{sitter.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-calendar w-4"></i>
                        <span>Added {new Date(sitter.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-percentage w-4"></i>
                        <span>Commission: {sitter.commissionPercentage || 80}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-6">
                    <button
                      onClick={() => window.open(`/sitter-dashboard?id=${sitter.id}&admin=true`, '_blank')}
                      className="px-4 py-2 text-sm font-bold border rounded-lg hover:opacity-90 transition-all"
                      style={{ background: COLORS.primary, color: COLORS.primaryLight, borderColor: COLORS.primary }}
                    >
                      <i className="fas fa-calendar-alt mr-2"></i>View Dashboard
                    </button>
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
                    Personal Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.personalPhone}
                    onChange={(e) => setFormData({ ...formData, personalPhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: COLORS.primaryLight }}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                    OpenPhone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.openphonePhone}
                    onChange={(e) => setFormData({ ...formData, openphonePhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: COLORS.primaryLight }}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                  Use Phone Number Type for Messages
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="phoneType"
                      value="personal"
                      checked={formData.phoneType === "personal"}
                      onChange={(e) => setFormData({ ...formData, phoneType: e.target.value as "personal" | "openphone" })}
                      className="w-4 h-4"
                      style={{ accentColor: COLORS.primary }}
                    />
                    <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Personal Phone</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="phoneType"
                      value="openphone"
                      checked={formData.phoneType === "openphone"}
                      onChange={(e) => setFormData({ ...formData, phoneType: e.target.value as "personal" | "openphone" })}
                      className="w-4 h-4"
                      style={{ accentColor: COLORS.primary }}
                    />
                    <span className="text-sm font-medium" style={{ color: COLORS.primary }}>OpenPhone</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Choose which phone number to use for sitter notifications</p>
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

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Commission Percentage *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={formData.commissionPercentage}
                    onChange={(e) => setFormData({ ...formData, commissionPercentage: parseFloat(e.target.value) || 80.0 })}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: COLORS.primaryLight }}
                  />
                  <span className="text-sm font-medium" style={{ color: COLORS.primary }}>%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Percentage of booking total the sitter receives (typically 70% or 80%)</p>
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
                  className="flex-1 px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                  style={{ background: COLORS.primary, color: COLORS.primaryLight }}
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