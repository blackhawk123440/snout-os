"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: Date;
  bookings: Array<{
    id: string;
    service: string;
    startAt: Date;
    status: string;
    totalPrice: number;
    pets: Array<{ species: string }>;
  }>;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

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

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", phone: "", email: "", address: "", notes: "" });
    setShowAddForm(false);
    setEditingClient(null);
  };

  const startEdit = (client: Client) => {
    setFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email,
      address: client.address,
      notes: client.notes,
    });
    setEditingClient(client);
    setShowAddForm(true);
  };

  const filteredClients = clients.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatPetsByQuantity = (pets: Array<{ species: string }>): string => {
    const counts: Record<string, number> = {};
    
    pets.forEach(pet => {
      counts[pet.species] = (counts[pet.species] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
      .join(', ');
  };

  return (
    <div className="min-h-screen" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-users" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Clients Management
                </h1>
                <p className="text-xs text-gray-500">Manage your pet care clients</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                style={{ background: COLORS.primary, color: COLORS.primaryLight }}
              >
                <i className="fas fa-plus mr-2"></i>Add Client
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
        {/* Search */}
        <div className="bg-white rounded-lg p-4 border-2 mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: COLORS.border }}
              />
            </div>
            <div className="text-sm text-gray-600">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {/* Clients List */}
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
                          {client.firstName} {client.lastName}
                        </h3>
                        <div className="text-sm text-gray-600">
                          <span className="mr-4"><i className="fas fa-phone mr-1"></i>{formatPhoneNumber(client.phone)}</span>
                          {client.email && <span><i className="fas fa-envelope mr-1"></i>{client.email}</span>}
                        </div>
                      </div>
                    </div>
                    
                    {client.address && (
                      <div className="text-sm text-gray-600 mb-3">
                        <i className="fas fa-map-marker-alt mr-1"></i>{client.address}
                      </div>
                    )}

                    {client.notes && (
                      <div className="text-sm text-gray-600 mb-3">
                        <i className="fas fa-sticky-note mr-1"></i>{client.notes}
                      </div>
                    )}

                    {/* Recent Bookings */}
                    {client.bookings.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-sm mb-2" style={{ color: COLORS.primary }}>
                          Recent Bookings ({client.bookings.length})
                        </h4>
                        <div className="space-y-2">
                          {client.bookings.slice(0, 3).map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="text-sm">
                                <span className="font-medium">{booking.service}</span>
                                <span className="text-gray-600 ml-2">
                                  {new Date(booking.startAt).toLocaleDateString()}
                                </span>
                                <span className="text-gray-600 ml-2">
                                  {formatPetsByQuantity(booking.pets)}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {booking.status}
                                </span>
                                <span className="ml-2 font-medium">${booking.totalPrice.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                          {client.bookings.length > 3 && (
                            <div className="text-sm text-gray-500 text-center">
                              +{client.bookings.length - 3} more bookings
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-6">
                    <button
                      onClick={() => startEdit(client)}
                      className="px-4 py-2 text-sm font-bold border rounded-lg hover:opacity-90 transition-all"
                      style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                    >
                      <i className="fas fa-edit mr-2"></i>Edit
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
              {editingClient ? "Edit Client" : "Add Client"}
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
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                  placeholder="Special instructions, pet preferences, etc."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                  style={{ background: COLORS.primary, color: COLORS.primaryLight }}
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
    </div>
  );
}