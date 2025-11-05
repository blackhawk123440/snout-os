"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
      const [bookingsResponse, sittersResponse] = await Promise.allSettled([
        fetch("/api/bookings"),
        fetch("/api/sitters"),
      ]);

      let bookingsData = { bookings: [] };
      let sittersData = { sitters: [] };

      if (bookingsResponse.status === "fulfilled" && bookingsResponse.value.ok) {
        try {
          bookingsData = await bookingsResponse.value.json();
        } catch (e) {
          // Silently handle JSON parse errors
        }
      }

      if (sittersResponse.status === "fulfilled" && sittersResponse.value.ok) {
        try {
          sittersData = await sittersResponse.value.json();
        } catch (e) {
          // Silently handle JSON parse errors
        }
      }

      const activeBookings = bookingsData.bookings?.filter((b: any) => b.status !== "cancelled") || [];
      const activeSitters = sittersData.sitters?.filter((s: any) => s.active === true) || [];
      const totalRevenue = activeBookings.reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0);

      setStats({
        totalBookings: activeBookings.length,
        activeSitters: activeSitters.length,
        totalRevenue,
        happyClients: Math.floor(activeBookings.length * 0.95), // Assume 95% satisfaction
      });
    } catch (error) {
      // Silently handle errors - stats will default to 0
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLORS.primary }}>
                <img 
                  src="/logo.png" 
                  alt="Snout Services Logo" 
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: COLORS.primary }}>
                  Snout Services
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-gray-700 font-medium hidden sm:block">Professional Pet Care Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/bookings"
                className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-sm sm:text-base lg:text-lg font-bold rounded-lg hover:opacity-90 transition-all shadow-lg touch-manipulation min-h-[44px] flex items-center justify-center"
                style={{ background: COLORS.primary, color: COLORS.primaryLight }}
              >
                <i className="fas fa-tachometer-alt sm:mr-2"></i>
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4" style={{ color: COLORS.primary }}>
            Welcome to Snout OS
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
            The complete pet care management system that helps you organize bookings, 
            manage sitters, process payments, and automate communications.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
            <Link
              href="/bookings"
              className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold rounded-lg hover:opacity-90 transition-all shadow-lg touch-manipulation min-h-[44px] flex items-center justify-center"
              style={{ background: COLORS.primary, color: COLORS.primaryLight }}
            >
              <i className="fas fa-calendar-alt mr-2"></i>Manage Bookings
            </Link>
            <a
              href="/booking-form.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold border-2 rounded-lg hover:opacity-90 transition-all touch-manipulation min-h-[44px] flex items-center justify-center"
              style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
            >
              <i className="fas fa-plus mr-2"></i>New Booking
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-16">
          <div className="bg-white rounded-lg p-4 sm:p-6 border-2 text-center" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-calendar text-xl sm:text-2xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ color: COLORS.primary }}>
              {stats.totalBookings}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">Total Bookings</p>
          </div>

          <div className="bg-white rounded-lg p-4 sm:p-6 border-2 text-center" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-user-friends text-xl sm:text-2xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ color: COLORS.primary }}>
              {stats.activeSitters}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">Active Sitters</p>
          </div>

          <div className="bg-white rounded-lg p-4 sm:p-6 border-2 text-center" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-dollar-sign text-xl sm:text-2xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ color: COLORS.primary }}>
              ${stats.totalRevenue.toFixed(0)}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">Total Revenue</p>
          </div>

          <div className="bg-white rounded-lg p-4 sm:p-6 border-2 text-center" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-heart text-xl sm:text-2xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ color: COLORS.primary }}>
              {stats.happyClients}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">Happy Clients</p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-16">
          <div className="bg-white rounded-lg p-6 sm:p-8 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 sm:mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-calendar-alt text-xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3" style={{ color: COLORS.primary }}>
              Booking Management
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Easily manage all your pet care bookings with our intuitive dashboard. 
              Track status, assign sitters, and monitor schedules.
            </p>
            <Link
              href="/bookings"
              className="text-sm font-bold hover:opacity-90 transition-all touch-manipulation inline-flex items-center gap-2"
              style={{ color: COLORS.primary }}
            >
              Manage Bookings <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          <div className="bg-white rounded-lg p-6 sm:p-8 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 sm:mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-robot text-xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3" style={{ color: COLORS.primary }}>
              Automation
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Automate SMS notifications, payment reminders, and sitter assignments. 
              Customize message templates and automation rules.
            </p>
            <Link
              href="/automation"
              className="text-sm font-bold hover:opacity-90 transition-all touch-manipulation inline-flex items-center gap-2"
              style={{ color: COLORS.primary }}
            >
              Configure Automation <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          <div className="bg-white rounded-lg p-6 sm:p-8 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 sm:mb-4" style={{ background: COLORS.primaryLight }}>
              <i className="fas fa-credit-card text-xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3" style={{ color: COLORS.primary }}>
              Payment Processing
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Integrated Stripe payment processing with live analytics. 
              Create payment links, track revenue, and manage invoices.
            </p>
            <Link
              href="/payments"
              className="text-sm font-bold hover:opacity-90 transition-all touch-manipulation inline-flex items-center gap-2"
              style={{ color: COLORS.primary }}
            >
              View Payments <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg p-6 sm:p-8 border-2" style={{ borderColor: COLORS.primaryLight }}>
          <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ color: COLORS.primary }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Link
              href="/bookings"
              className="p-3 sm:p-4 text-center border rounded-lg hover:shadow-md transition-all touch-manipulation min-h-[80px] sm:min-h-[100px] flex flex-col items-center justify-center"
              style={{ borderColor: COLORS.border }}
            >
              <i className="fas fa-calendar text-xl sm:text-2xl mb-2" style={{ color: COLORS.primary }}></i>
              <p className="font-semibold text-sm sm:text-base">Dashboard</p>
            </Link>
            <Link
              href="/bookings/sitters"
              className="p-3 sm:p-4 text-center border rounded-lg hover:shadow-md transition-all touch-manipulation min-h-[80px] sm:min-h-[100px] flex flex-col items-center justify-center"
              style={{ borderColor: COLORS.border }}
            >
              <i className="fas fa-user-friends text-xl sm:text-2xl mb-2" style={{ color: COLORS.primary }}></i>
              <p className="font-semibold text-sm sm:text-base">Sitters</p>
            </Link>
            <Link
              href="/clients"
              className="p-3 sm:p-4 text-center border rounded-lg hover:shadow-md transition-all touch-manipulation min-h-[80px] sm:min-h-[100px] flex flex-col items-center justify-center"
              style={{ borderColor: COLORS.border }}
            >
              <i className="fas fa-users text-xl sm:text-2xl mb-2" style={{ color: COLORS.primary }}></i>
              <p className="font-semibold text-sm sm:text-base">Clients</p>
            </Link>
            <Link
              href="/settings"
              className="p-3 sm:p-4 text-center border rounded-lg hover:shadow-md transition-all touch-manipulation min-h-[80px] sm:min-h-[100px] flex flex-col items-center justify-center"
              style={{ borderColor: COLORS.border }}
            >
              <i className="fas fa-cog text-xl sm:text-2xl mb-2" style={{ color: COLORS.primary }}></i>
              <p className="font-semibold text-sm sm:text-base">Settings</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}