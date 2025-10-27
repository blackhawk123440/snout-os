import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(to bottom, #ffffff 0%, ${COLORS.primaryLight} 100%)` }}>
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 shadow-lg overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Snout Services Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold mb-4" style={{ color: COLORS.primary }}>
            Snout OS
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The smart backend system that runs your entire pet care business—automatically
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/bookings"
            className="group bg-white rounded-2xl p-8 border-2 transition-all shadow-sm hover:shadow-lg"
            style={{ borderColor: '#432f21' }}
          >
            <div className="text-3xl mb-4">📋</div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: '#432f21' }}>
              Bookings Dashboard
            </h3>
            <p className="text-gray-600">
              View and manage all your pet care appointments in one place
            </p>
            <div className="mt-4 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center" style={{ color: '#432f21' }}>
              Open Dashboard →
            </div>
          </Link>

          <Link
            href="/booking-form.html"
            className="group bg-white rounded-2xl p-8 border-2 transition-all shadow-sm hover:shadow-lg"
            style={{ borderColor: '#432f21' }}
          >
            <div className="text-3xl mb-4">📝</div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: '#432f21' }}>
              Booking Form
            </h3>
            <p className="text-gray-600">
              Test the customer-facing booking form and create new appointments
            </p>
            <div className="mt-4 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center" style={{ color: '#432f21' }}>
              Open Form →
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: '#432f21' }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#432f21' }}>Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl mb-3">✨</div>
              <h3 className="font-semibold mb-2" style={{ color: '#432f21' }}>Automated Quotes</h3>
              <p className="text-sm text-gray-600">
                Dynamic pricing with support for after-hours and holiday rates
              </p>
            </div>
            <div>
              <div className="text-2xl mb-3">💬</div>
              <h3 className="font-semibold mb-2" style={{ color: '#432f21' }}>SMS Notifications</h3>
              <p className="text-sm text-gray-600">
                Automatic client confirmations and owner alerts via OpenPhone
              </p>
            </div>
            <div>
              <div className="text-2xl mb-3">⏰</div>
              <h3 className="font-semibold mb-2" style={{ color: '#432f21' }}>Smart Reminders</h3>
              <p className="text-sm text-gray-600">
                Follow-up reminders with tip and review links after service
              </p>
            </div>
            <div>
              <div className="text-2xl mb-3">🗄️</div>
              <h3 className="font-semibold mb-2" style={{ color: '#432f21' }}>PostgreSQL Database</h3>
              <p className="text-sm text-gray-600">
                Reliable data storage with Prisma ORM for type safety
              </p>
            </div>
            <div>
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="font-semibold mb-2" style={{ color: '#432f21' }}>Background Jobs</h3>
              <p className="text-sm text-gray-600">
                BullMQ worker for reliable job processing and scheduling
              </p>
            </div>
            <div>
              <div className="text-2xl mb-3">🚀</div>
              <h3 className="font-semibold mb-2" style={{ color: '#432f21' }}>Production Ready</h3>
              <p className="text-sm text-gray-600">
                Built with Next.js, TypeScript, and Tailwind CSS
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl p-8 text-white" style={{ background: 'linear-gradient(90deg, #432f21, #5a4232)' }}>
          <h2 className="text-2xl font-bold mb-4">🎯 Quick Start</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <strong>Configure environment:</strong> Set up your <code className="bg-white/10 px-2 py-0.5 rounded">.env.local</code> file
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <strong>Initialize database:</strong> Run migrations and seed data
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <strong>Start managing:</strong> Use the dashboard to handle bookings
              </div>
            </div>
          </div>
          <Link
            href="/bookings"
            className="mt-6 inline-flex items-center px-6 py-3 bg-white rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            style={{ color: '#432f21' }}
          >
            Get Started →
          </Link>
        </div>
      </div>
    </div>
  );
}
