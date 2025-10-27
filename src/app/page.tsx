"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

export default function HomePage() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeSitters: 0,
    totalRevenue: 0,
    happyClients: 0,
  });

  useEffect(() => {
    // Fetch basic stats
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [bookingsResponse, sittersResponse] = await Promise.all([
        fetch("/api/bookings"),
        fetch("/api/sitters"),
      ]);

      const bookingsData = await bookingsResponse.json();
      const sittersData = await sittersResponse.json();

      const activeBookings = bookingsData.bookings?.filter((b: any) => b.status !== "cancelled") || [];
      const activeSitters = sittersData.sitters?.filter((s: any) => s.isActive) || [];
      const totalRevenue = activeBookings.reduce((sum: number, b: any) => sum + b.totalPrice, 0);

      setStats({
        totalBookings: activeBookings.length,
        activeSitters: activeSitters.length,
        totalRevenue,
        happyClients: Math.floor(activeBookings.length * 0.95), // Assume 95% satisfaction
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <img 
                  src="/logo.png" 
                  alt="Snout Services Logo" 
                  className="w-16 h-16 object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                  Snout Services
                </h1>
                <p className="text-lg text-gray-700 font-medium">Professional Pet Care Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/bookings"
                className="px-6 py-3 text-lg font-bold text-white rounded-lg hover:opacity-90 transition-all shadow-lg"
                style={{ background: COLORS.primary }}
              >
                <i className="fas fa-tachometer-alt mr-2"></i>Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4" style={{ color: COLORS.primary }}>
            Welcome to Snout OS
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The complete pet care management system that helps you organize bookings, 
            manage sitters, process payments, and automate communications.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/bookings"
              className="px-8 py-4 text-lg font-bold text-white rounded-lg hover:opacity-90 transition-all shadow-lg"
              style={{ background: COLORS.primary }}
            >
              <i className="fas fa-calendar-alt mr-2"></i>Manage Bookings
            </a>
            <a
              href="/public/booking-form.html"
              target="_blank"
              className="px-8 py-4 text-lg font-bold border-2 rounded-lg hover:opacity-90 transition-all"
              style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
            >
              <i className="fas fa-plus mr-2"></i>New Booking
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-16">
          <div className="bg-white rounded-lg p-6 border-2 text-center" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-calendar text-2xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-3xl font-bold mb-2" style={{ color: COLORS.primary }}>
              {stats.totalBookings}
            </h3>
            <p className="text-gray-600">Total Bookings</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-2 text-center" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-user-friends text-2xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-3xl font-bold mb-2" style={{ color: COLORS.primary }}>
              {stats.activeSitters}
            </h3>
            <p className="text-gray-600">Active Sitters</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-2 text-center" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-dollar-sign text-2xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-3xl font-bold mb-2" style={{ color: COLORS.primary }}>
              ${stats.totalRevenue.toFixed(0)}
            </h3>
            <p className="text-gray-600">Total Revenue</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-2 text-center" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-heart text-2xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-3xl font-bold mb-2" style={{ color: COLORS.primary }}>
              {stats.happyClients}
            </h3>
            <p className="text-gray-600">Happy Clients</p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg p-8 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-calendar-alt text-xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: COLORS.primary }}>
              Booking Management
            </h3>
            <p className="text-gray-600 mb-4">
              Easily manage all your pet care bookings with our intuitive dashboard. 
              Track status, assign sitters, and monitor schedules.
            </p>
            <a
              href="/bookings"
              className="text-sm font-bold hover:opacity-90 transition-all"
              style={{ color: COLORS.primary }}
            >
              Manage Bookings →
            </a>
          </div>

          <div className="bg-white rounded-lg p-8 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-robot text-xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: COLORS.primary }}>
              Automation
            </h3>
            <p className="text-gray-600 mb-4">
              Automate SMS notifications, payment reminders, and sitter assignments. 
              Customize message templates and automation rules.
            </p>
            <a
              href="/automation"
              className="text-sm font-bold hover:opacity-90 transition-all"
              style={{ color: COLORS.primary }}
            >
              Configure Automation →
            </a>
          </div>

          <div className="bg-white rounded-lg p-8 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-credit-card text-xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: COLORS.primary }}>
              Payment Processing
            </h3>
            <p className="text-gray-600 mb-4">
              Integrated Stripe payment processing with live analytics. 
              Create payment links, track revenue, and manage invoices.
            </p>
            <a
              href="/payments"
              className="text-sm font-bold hover:opacity-90 transition-all"
              style={{ color: COLORS.primary }}
            >
              View Payments →
            </a>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg p-8 border-2" style={{ borderColor: COLORS.primaryLight }}>
          <h3 className="text-2xl font-bold mb-6" style={{ color: COLORS.primary }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <a
              href="/bookings"
              className="p-4 text-center border rounded-lg hover:shadow-md transition-all"
              style={{ borderColor: COLORS.border }}
            >
              <i className="fas fa-calendar text-2xl mb-2" style={{ color: COLORS.primary }}></i>
              <p className="font-semibold">Dashboard</p>
            </a>
            <a
              href="/bookings/sitters"
              className="p-4 text-center border rounded-lg hover:shadow-md transition-all"
              style={{ borderColor: COLORS.border }}
            >
              <i className="fas fa-user-friends text-2xl mb-2" style={{ color: COLORS.primary }}></i>
              <p className="font-semibold">Sitters</p>
            </a>
            <a
              href="/clients"
              className="p-4 text-center border rounded-lg hover:shadow-md transition-all"
              style={{ borderColor: COLORS.border }}
            >
              <i className="fas fa-users text-2xl mb-2" style={{ color: COLORS.primary }}></i>
              <p className="font-semibold">Clients</p>
            </a>
            <a
              href="/settings"
              className="p-4 text-center border rounded-lg hover:shadow-md transition-all"
              style={{ borderColor: COLORS.border }}
            >
              <i className="fas fa-cog text-2xl mb-2" style={{ color: COLORS.primary }}></i>
              <p className="font-semibold">Settings</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}