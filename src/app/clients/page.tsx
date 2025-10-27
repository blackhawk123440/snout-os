"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: string;
  lastBooking?: string;
  totalBookings: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDuplicatePicker, setShowDuplicatePicker] = useState(false);
  const [duplicateClients, setDuplicateClients] = useState<Client[]>([]);
  const [prefilledData, setPrefilledData] = useState<Partial<Client> | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    fetchClients();
    checkForPrefilledData();
  }, []);

  const checkForPrefilledData = () => {
    // Check if we have prefilled data from booking details
    const storedData = sessionStorage.getItem('selectedClientData');
    if (storedData) {
      const clientData = JSON.parse(storedData);
      setPrefilledData(clientData);
      setFormData({
        firstName: clientData.firstName || "",
        lastName: clientData.lastName || "",
        phone: clientData.phone || "",
        email: clientData.email || "",
        address: clientData.address || "",
      });
      setShowAddForm(true);
      sessionStorage.removeItem('selectedClientData');
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/clients");
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicates
    const existingClients = clients.filter(client => 
      client.phone === formData.phone || 
      (formData.email && client.email === formData.email)
    );

    if (existingClients.length > 0) {
      setDuplicateClients(existingClients);
      setShowDuplicatePicker(true);
      return;
    }

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingClient ? "Client updated!" : "Client added!");
        resetForm();
        fetchClients();
      }
    } catch (error) {
      console.error("Failed to save client:", error);
      alert("Failed to save client");
    }
  };

  const handleDuplicateChoice = async (choice: 'new' | 'existing', existingClientId?: string) => {
    if (choice === 'existing' && existingClientId) {
      // Navigate to existing client
      setSelectedClient(clients.find(c => c.id === existingClientId) || null);
      setShowDuplicatePicker(false);
      setDuplicateClients([]);
      return;
    }

    // Create new client despite duplicates
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Client added!");
        resetForm();
        fetchClients();
        setShowDuplicatePicker(false);
        setDuplicateClients([]);
      }
    } catch (error) {
      console.error("Failed to save client:", error);
      alert("Failed to save client");
    }
  };

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", phone: "", email: "", address: "" });
    setShowAddForm(false);
    setEditingClient(null);
    setPrefilledData(null);
  };

  const startEdit = (client: Client) => {
    setFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email || "",
      address: client.address || "",
    });
    setEditingClient(client);
    setShowAddForm(true);
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const filteredClients = clients.filter(client =>
    client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f5" }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: "#e0e0e0" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-users" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Client Management
                </h1>
                <p className="text-xs text-gray-500">Manage your client contacts</p>
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
                <i className="fas fa-plus mr-2"></i>Add Client
              </button>
              <Link
                href="/bookings"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Bookings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
            style={{ borderColor: COLORS.primaryLight }}
          />
        </div>

        {/* Client List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
              <p className="mt-2 text-gray-600">Loading clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-users text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-600">No clients found</p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-lg p-4 border-2 hover:shadow-md transition-all cursor-pointer"
                style={{ borderColor: COLORS.primaryLight }}
                onClick={() => setSelectedClient(client)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg" style={{ color: COLORS.primary }}>
                      {client.firstName} {client.lastName}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>
                        <i className="fas fa-phone mr-1"></i>
                        {formatPhoneNumber(client.phone)}
                      </span>
                      {client.email && (
                        <span>
                          <i className="fas fa-envelope mr-1"></i>
                          {client.email}
                        </span>
                      )}
                      <span>
                        <i className="fas fa-calendar mr-1"></i>
                        {client.totalBookings} booking{client.totalBookings !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(client);
                      }}
                      className="px-3 py-1 text-xs font-bold border rounded-lg hover:opacity-90 transition-all"
                      style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                    >
                      Edit
                    </button>
                    <Link
                      href={`/bookings?clientId=${client.id}`}
                      className="px-3 py-1 text-xs font-bold text-white rounded-lg hover:opacity-90 transition-all"
                      style={{ background: COLORS.primary }}
                    >
                      View Bookings
                    </Link>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>
              {editingClient ? "Edit Client" : "Add Client"}
              {prefilledData && " (from Booking)"}
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
              
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                  style={{ background: COLORS.primary }}
                >
                  {editingClient ? "Update" : "Add"} Client
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

      {/* Duplicate Picker Modal */}
      {showDuplicatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>
              Duplicate Found
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              We found {duplicateClients.length} existing client{duplicateClients.length !== 1 ? 's' : ''} with the same phone or email:
            </p>
            
            <div className="space-y-3 mb-6">
              {duplicateClients.map((client) => (
                <div
                  key={client.id}
                  className="p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: COLORS.primaryLight }}
                  onClick={() => handleDuplicateChoice('existing', client.id)}
                >
                  <div className="font-bold" style={{ color: COLORS.primary }}>
                    {client.firstName} {client.lastName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatPhoneNumber(client.phone)} • {client.email || 'No email'}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleDuplicateChoice('new')}
                className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                style={{ background: COLORS.primary }}
              >
                Create New Anyway
              </button>
              <button
                onClick={() => {
                  setShowDuplicatePicker(false);
                  setDuplicateClients([]);
                }}
                className="flex-1 px-4 py-2 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all"
                style={{ color: COLORS.gray, borderColor: COLORS.border }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
