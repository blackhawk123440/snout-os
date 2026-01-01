"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  tags: string | null;
  notes: string | null;
  _count?: {
    bookings: number;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchClients();
      }
    } catch (error) {
      console.error("Failed to delete client:", error);
    }
  };

  const filteredClients = clients.filter(client =>
    client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
                Clients
              </h1>
              <p className="text-gray-600">Manage all your clients</p>
            </div>
            <button
              onClick={() => window.location.href = "/clients/new"}
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              + Add Client
            </button>
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              style={{ borderColor: COLORS.border }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredClients.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                {searchTerm ? "No Clients Found" : "No Clients"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? "Try a different search term" : "Add your first client"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => window.location.href = "/clients/new"}
                  className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                  style={{ background: COLORS.primary }}
                >
                  Add Client
                </button>
              )}
            </div>
          ) : (
            filteredClients.map((client) => {
              const tags = client.tags ? JSON.parse(client.tags) : [];
              return (
                <div
                  key={client.id}
                  className="bg-white rounded-xl p-6 border-2 shadow-sm"
                  style={{ borderColor: COLORS.primaryLight }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.primary }}>
                        {client.firstName} {client.lastName}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div><i className="fas fa-phone mr-2"></i>{client.phone}</div>
                        {client.email && (
                          <div><i className="fas fa-envelope mr-2"></i>{client.email}</div>
                        )}
                        {client.address && (
                          <div><i className="fas fa-map-marker-alt mr-2"></i>{client.address}</div>
                        )}
                        {client._count && (
                          <div><i className="fas fa-calendar mr-2"></i>{client._count.bookings} bookings</div>
                        )}
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {client.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                          {client.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => window.location.href = `/clients/${client.id}`}
                        className="px-4 py-2 rounded-lg font-semibold text-white"
                        style={{ background: COLORS.primary }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="px-4 py-2 rounded-lg font-semibold bg-red-100 text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
