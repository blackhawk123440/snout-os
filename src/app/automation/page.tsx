"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface AutomationConfig {
  id: string;
  name: string;
  description: string;
  category: "booking" | "reminder" | "payment" | "notification" | "sitter";
  enabled: boolean;
  timing?: string; // e.g., "24h", "19:00", "after_visit"
  timingLabel?: string;
  recipient?: "client" | "sitter" | "owner" | "all";
  template?: string;
  customFields?: Record<string, any>;
}

interface AutomationSettings {
  bookingConfirmation: {
    enabled: boolean;
    sendToClient: boolean;
    sendToSitter: boolean;
    sendToOwner: boolean;
    messageTemplateClient?: string;
    messageTemplateSitter?: string;
    messageTemplateOwner?: string;
  };
  nightBeforeReminder: {
    enabled: boolean;
    sendToClient: boolean;
    sendToSitter: boolean;
    reminderTime: string; // HH:MM format
    messageTemplateClient?: string;
    messageTemplateSitter?: string;
  };
  dailySummary: {
    enabled: boolean;
    summaryTime: string; // HH:MM format
    sendToOwner: boolean;
  };
  paymentReminder: {
    enabled: boolean;
    sendToClient: boolean;
    reminderDelay: number; // hours after booking
    repeatReminder: boolean;
    repeatInterval: number; // days
    messageTemplateClient?: string;
  };
  sitterAssignment: {
    enabled: boolean;
    sendToSitter: boolean;
    sendToOwner: boolean;
    messageTemplateSitter?: string;
    messageTemplateOwner?: string;
  };
  postVisitThankYou: {
    enabled: boolean;
    sendToClient: boolean;
    delayAfterVisit: number; // minutes
    messageTemplateClient?: string;
  };
  visitReport: {
    enabled: boolean;
    sendToClient: boolean;
    sendToOwner: boolean;
    messageTemplateClient?: string;
    messageTemplateOwner?: string;
  };
  ownerNewBookingAlert: {
    enabled: boolean;
    sendToOwner: boolean;
    sendToClient?: boolean;
    ownerPhoneType: "personal" | "openphone"; // Which phone to use for owner
    messageTemplateClient?: string;
    messageTemplateOwner?: string;
  };
  sitterPoolOffers: {
    enabled: boolean;
    sendToSitters: boolean;
    sendToOwner: boolean;
    sitterPhoneType: "personal" | "openphone"; // Which phone to use for sitters
    ownerPhoneType: "personal" | "openphone"; // Which phone to use for owner
    responseTimeout: number; // hours
    messageTemplateSitter?: string;
    messageTemplateOwner?: string;
  };
  paymentAndTipLinks: {
    enabled: boolean;
    sendMode: "automatic" | "manual"; // Automatic or manual sending
    whenToSend: "after_booking" | "after_confirmation" | "after_completion" | "manual_only"; // When to send automatically
    sendToClient: boolean;
    sendToOwner: boolean;
    includePaymentLink: boolean;
    includeTipLink: boolean;
    sendDelay: number; // minutes after trigger event
    messageTemplateClient?: string;
    messageTemplateOwner?: string;
    paymentLinkTemplate?: string; // Separate template for payment link
    tipLinkTemplate?: string; // Separate template for tip link
  };
}

export default function AutomationPage() {
  const [settings, setSettings] = useState<AutomationSettings>({
    bookingConfirmation: {
      enabled: true,
      sendToClient: true,
      sendToSitter: true,
      sendToOwner: true,
    },
    nightBeforeReminder: {
      enabled: true,
      sendToClient: true,
      sendToSitter: true,
      reminderTime: "19:00",
    },
    dailySummary: {
      enabled: true,
      summaryTime: "07:00",
      sendToOwner: true,
    },
    paymentReminder: {
      enabled: true,
      sendToClient: true,
      reminderDelay: 24,
      repeatReminder: true,
      repeatInterval: 7,
    },
    sitterAssignment: {
      enabled: true,
      sendToSitter: true,
      sendToOwner: true,
    },
    postVisitThankYou: {
      enabled: true,
      sendToClient: true,
      delayAfterVisit: 30,
    },
    visitReport: {
      enabled: true,
      sendToClient: true,
      sendToOwner: true,
    },
    ownerNewBookingAlert: {
      enabled: true,
      sendToOwner: true,
      sendToClient: true,
      ownerPhoneType: "personal",
    },
    sitterPoolOffers: {
      enabled: true,
      sendToSitters: true,
      sendToOwner: true,
      sitterPhoneType: "personal",
      ownerPhoneType: "personal",
      responseTimeout: 24,
    },
    paymentAndTipLinks: {
      enabled: true,
      sendMode: "automatic",
      whenToSend: "after_confirmation",
      sendToClient: true,
      sendToOwner: true,
      includePaymentLink: true,
      includeTipLink: true,
      sendDelay: 0,
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testingMessage, setTestingMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // null = show all

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (data.automation) {
        setSettings(prev => ({
          ...prev,
          ...data.automation,
        }));
      }
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation: settings }),
      });

      if (response.ok) {
        alert("Automation settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch {
      alert("Failed to save settings");
    }
    setSaving(false);
  };

  const updateAutomation = (automationId: keyof AutomationSettings, updates: Partial<AutomationSettings[keyof AutomationSettings]>) => {
    setSettings(prev => ({
      ...prev,
      [automationId]: {
        ...prev[automationId],
        ...updates,
      },
    }));
  };

  const handleTestMessage = async (template: string, recipientType: "client" | "sitter" | "owner") => {
    if (!testPhoneNumber.trim()) {
      alert("Please enter a phone number to test");
      return;
    }

    if (!template || template.trim() === "") {
      alert("Please customize the message template first before testing");
      return;
    }

    setTestingMessage(template);
    
    try {
      const response = await fetch("/api/automation/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          phoneNumber: testPhoneNumber,
          recipientType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const formattedPhone = data.formattedPhone || testPhoneNumber;
        const preview = data.preview || template;
        alert(`✅ Test message sent successfully to ${formattedPhone}!\n\nPreview:\n${preview.substring(0, 200)}${preview.length > 200 ? '...' : ''}`);
      } else {
        const formattedPhone = data.formattedPhone || testPhoneNumber;
        const preview = (data.preview || template).substring(0, 200);
        const errorMessage = data.error || data.details || "Unknown error";
        alert(`❌ Failed to send test message to ${formattedPhone}\n\nError: ${errorMessage}\n\nPreview:\n${preview}...`);
      }
    } catch (error) {
      alert(`Failed to send test message: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setTestingMessage(null);
    }
  };

  const automations: AutomationConfig[] = [
    {
      id: "bookingConfirmation",
      name: "Booking Confirmation",
      description: "Sends confirmation messages when a booking is created or confirmed. Helps clients and sitters stay informed about upcoming appointments. Can be customized to send to clients, sitters, and/or the owner with separate message templates.",
      category: "booking",
      enabled: false,
      recipient: "all",
    },
    {
      id: "nightBeforeReminder",
      name: "Night Before Reminder",
      description: "Sends friendly reminders to clients and sitters the night before scheduled appointments. Reduces no-shows and helps ensure everyone is prepared. Configure the exact time (e.g., 7 PM) when reminders are sent.",
      category: "reminder",
      enabled: false,
      timing: "19:00",
      timingLabel: "Send at",
      recipient: "all",
    },
    {
      id: "dailySummary",
      name: "Daily Summary",
      description: "Sends a comprehensive daily summary of bookings, schedule, and estimated revenue to the owner each morning. Helps you stay organized and plan your day. Configure the time when summaries are sent (default: 7 AM).",
      category: "notification",
      enabled: false,
      timing: "07:00",
      timingLabel: "Send at",
      recipient: "owner",
    },
    {
      id: "paymentReminder",
      name: "Payment Reminder",
      description: "Automatically sends payment reminders to clients with pending payments. Helps ensure timely payments and reduces follow-up work. Configure delay after booking (e.g., 24 hours) and optional repeat reminders.",
      category: "payment",
      enabled: false,
      timing: "24h",
      timingLabel: "Send after",
      recipient: "client",
    },
    {
      id: "paymentAndTipLinks",
      name: "Payment & Tip Links",
      description: "Automatically or manually sends Stripe payment links and tip links to clients. Choose when to send (after booking, confirmation, or completion) or set to manual-only. Can include both payment and tip links, or just one. Owner can also receive notifications when links are sent.",
      category: "payment",
      enabled: false,
      timing: "0min",
      timingLabel: "Send delay",
      recipient: "client",
    },
    {
      id: "sitterAssignment",
      name: "Sitter Assignment Notification",
      description: "Notifies sitters and the owner when a sitter is assigned to a booking. Keeps everyone in the loop about assignment changes. Sitters receive booking details and owners get confirmation of assignments.",
      category: "sitter",
      enabled: false,
      recipient: "all",
    },
    {
      id: "postVisitThankYou",
      name: "Post-Visit Thank You",
      description: "Sends a personalized thank you message to clients after a visit is completed. Builds goodwill and encourages repeat bookings. Configure delay after visit completion (default: 30 minutes) before sending.",
      category: "notification",
      enabled: false,
      timing: "30min",
      timingLabel: "Send after",
      recipient: "client",
    },
    {
      id: "visitReport",
      name: "Visit Report",
      description: "Sends visit reports to clients (and optionally owner) after visits are completed. Keeps clients informed about their pets' care and provides transparency. Can be customized with report content and media.",
      category: "notification",
      enabled: false,
      recipient: "client",
    },
    {
      id: "ownerNewBookingAlert",
      name: "New Booking Alert",
      description: "Immediately alerts the owner when a new booking is created. Ensures you never miss a booking request. Can also send a confirmation message to the client. Configure which phone number (personal or OpenPhone) receives alerts.",
      category: "notification",
      enabled: false,
      recipient: "owner",
    },
    {
      id: "sitterPoolOffers",
      name: "Sitter Pool Offers",
      description: "Automatically sends booking offers to multiple sitters simultaneously and handles responses. First sitter to reply 'YES' gets assigned. Other sitters are notified the job is taken. Configure response timeout and phone number preferences.",
      category: "sitter",
      enabled: false,
      timing: "24h",
      timingLabel: "Response timeout",
      recipient: "all",
    },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "booking": return "fa-calendar-check";
      case "reminder": return "fa-bell";
      case "payment": return "fa-credit-card";
      case "notification": return "fa-envelope";
      case "sitter": return "fa-user-friends";
      default: return "fa-cog";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "booking": return "#10b981";
      case "reminder": return "#f59e0b";
      case "payment": return "#3b82f6";
      case "notification": return "#8b5cf6";
      case "sitter": return "#ec4899";
      default: return COLORS.primary;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl mb-4" style={{ color: COLORS.primary }}></i>
          <p className="text-gray-600">Loading automations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-robot" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Automation Center
                </h1>
                <p className="text-xs text-gray-700 font-medium">Configure automated messages and notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/integrations"
                className="px-4 py-2 text-sm font-medium border-2 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-[auto]"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                <i className="fas fa-plug mr-2"></i><span className="hidden sm:inline">Integrations</span>
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-[auto]"
                style={{ background: COLORS.primary, color: COLORS.primaryLight }}
              >
                <i className={`fas fa-save mr-2 ${saving ? 'animate-spin' : ''}`}></i>
                {saving ? 'Saving...' : 'Save All Settings'}
              </button>
              <Link
                href="/bookings"
                className="px-4 py-2 text-sm font-medium border-2 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-[auto]"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                <i className="fas fa-arrow-left mr-2"></i><span className="hidden sm:inline">Back to Bookings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Test Message Panel */}
        <div className="bg-white rounded-xl border-2 p-4 sm:p-6 mb-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-start gap-3 mb-4">
            <i className="fas fa-paper-plane text-blue-600 text-xl mt-1"></i>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-2 text-lg">Test Messages</h3>
              <p className="text-sm text-blue-800 mb-4">
                Enter a phone number below to test any message template. Click "Test Message" on any template to send a test message with sample data.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1" style={{ color: COLORS.primary }}>
                    Test Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={testPhoneNumber}
                    onChange={(e) => {
                      // Allow any input, validation happens on send
                      setTestPhoneNumber(e.target.value);
                    }}
                    placeholder="2567295129 or +12567295129"
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px]"
                    style={{ borderColor: COLORS.primaryLight }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter a valid 10-digit US phone number (with or without country code)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comprehensive Variable Documentation */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 rounded-xl p-4 sm:p-6 mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-start gap-3 mb-4">
            <i className="fas fa-code text-blue-600 text-xl mt-1"></i>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-2 text-lg">Message Template Variables</h3>
              <p className="text-sm text-blue-800 mb-4">
                Use these variables in your message templates by wrapping them in double curly braces: {"{{variableName}}"}. They will be automatically replaced with actual booking information.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white rounded-lg p-3 border" style={{ borderColor: COLORS.border }}>
                  <div className="font-semibold text-xs text-blue-900 mb-2">Client Information</div>
                  <div className="text-xs space-y-1 text-gray-700">
                    <div><code className="bg-gray-100 px-1 rounded">{"{{firstName}}"}</code> - Client's first name</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{lastName}}"}</code> - Client's last name</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{phone}}"}</code> - Client's phone number</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{email}}"}</code> - Client's email</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{address}}"}</code> - Service address</div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border" style={{ borderColor: COLORS.border }}>
                  <div className="font-semibold text-xs text-blue-900 mb-2">Booking Details</div>
                  <div className="text-xs space-y-1 text-gray-700">
                    <div><code className="bg-gray-100 px-1 rounded">{"{{service}}"}</code> - Service type</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{date}}"}</code> - Booking date</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{time}}"}</code> - Booking time</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{startAt}}"}</code> - Start date/time</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{endAt}}"}</code> - End date/time</div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border" style={{ borderColor: COLORS.border }}>
                  <div className="font-semibold text-xs text-blue-900 mb-2">Pets & Pricing</div>
                  <div className="text-xs space-y-1 text-gray-700">
                    <div><code className="bg-gray-100 px-1 rounded">{"{{petQuantities}}"}</code> - Pet list with counts</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{pets}}"}</code> - Pet names</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{totalPrice}}"}</code> - Total price</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{price}}"}</code> - Booking price</div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border" style={{ borderColor: COLORS.border }}>
                  <div className="font-semibold text-xs text-blue-900 mb-2">Sitter Information</div>
                  <div className="text-xs space-y-1 text-gray-700">
                    <div><code className="bg-gray-100 px-1 rounded">{"{{sitterFirstName}}"}</code> - Sitter's first name</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{sitterLastName}}"}</code> - Sitter's last name</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{sitterName}}"}</code> - Full sitter name</div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border" style={{ borderColor: COLORS.border }}>
                  <div className="font-semibold text-xs text-blue-900 mb-2">Links & URLs</div>
                  <div className="text-xs space-y-1 text-gray-700">
                    <div><code className="bg-gray-100 px-1 rounded">{"{{bookingUrl}}"}</code> - Link to booking details</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{paymentLink}}"}</code> - Payment link</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{tipLink}}"}</code> - Tip link</div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border" style={{ borderColor: COLORS.border }}>
                  <div className="font-semibold text-xs text-blue-900 mb-2">Other</div>
                  <div className="text-xs space-y-1 text-gray-700">
                    <div><code className="bg-gray-100 px-1 rounded">{"{{quantity}}"}</code> - Number of visits</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{duration}}"}</code> - Visit duration</div>
                    <div><code className="bg-gray-100 px-1 rounded">{"{{reportContent}}"}</code> - Visit report</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-900">
                  <strong>Note:</strong> Variables are case-sensitive. Use the exact format shown above. Old format {"[VariableName]"} is also supported for backwards compatibility.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-2 rounded-lg p-4 mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-600 mt-1"></i>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-1">Automation Overview</h3>
              <p className="text-sm text-blue-800">
                Configure when and how automated messages are sent. Each automation can be individually enabled/disabled and customized. 
                All message templates support variables shown above. Settings are saved when you click "Save All Automation Settings".
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="bg-white rounded-xl border-2 p-4 mb-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold mr-2" style={{ color: COLORS.primary }}>Filter by Category:</span>
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all touch-manipulation min-h-[44px] ${activeCategory === null ? 'shadow-md' : ''}`}
              style={{
                background: activeCategory === null ? COLORS.primary : COLORS.white,
                color: activeCategory === null ? COLORS.primaryLight : COLORS.primary,
                borderColor: COLORS.primaryLight,
                borderWidth: activeCategory === null ? '0px' : '2px',
              }}
            >
              <i className="fas fa-list mr-2"></i>All
            </button>
            {["booking", "reminder", "payment", "notification", "sitter"].map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all touch-manipulation min-h-[44px] ${activeCategory === category ? 'shadow-md' : ''}`}
                style={{
                  background: activeCategory === category ? getCategoryColor(category) : COLORS.white,
                  color: activeCategory === category ? COLORS.white : COLORS.primary,
                  borderColor: getCategoryColor(category),
                  borderWidth: activeCategory === category ? '0px' : '2px',
                }}
              >
                <i className={`fas ${getCategoryIcon(category)} mr-2`}></i>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Automation Cards */}
        <div className="grid gap-6">
          {automations
            .filter((automation) => activeCategory === null || automation.category === activeCategory)
            .map((automation) => {
            const config = settings[automation.id as keyof AutomationSettings];
            const categoryColor = getCategoryColor(automation.category);
            
            return (
              <div
                key={automation.id}
                className="bg-white rounded-xl border-2 p-6 shadow-sm transition-all hover:shadow-md"
                style={{ borderColor: COLORS.primaryLight }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: categoryColor + '20' }}
                    >
                      <i className={`fas ${getCategoryIcon(automation.category)} text-xl`} style={{ color: categoryColor }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                          {automation.name}
                        </h3>
                        <span 
                          className="px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide whitespace-nowrap"
                          style={{ 
                            background: categoryColor + '20',
                            color: categoryColor,
                          }}
                        >
                          {automation.category}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{automation.description}</p>
                      
                      {/* Automation Details */}
                      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-gray-500 mb-3 sm:mb-4">
                        {automation.recipient && (
                          <div className="flex items-center gap-1.5">
                            <i className="fas fa-users"></i>
                            <span>Recipient: {automation.recipient === "all" ? "Client, Sitter & Owner" : automation.recipient}</span>
                          </div>
                        )}
                        {automation.timing && (
                          <div className="flex items-center gap-1.5">
                            <i className="fas fa-clock"></i>
                            <span>{automation.timingLabel || "Timing"}: {automation.timing}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <i className={`fas ${config.enabled ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600'}`}></i>
                          <span>{config.enabled ? "Enabled" : "Disabled"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-center">
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 touch-manipulation">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => updateAutomation(automation.id as keyof AutomationSettings, { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div
                        className="relative w-14 h-8 bg-gray-200 rounded-full transition-colors duration-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-opacity-50"
                        style={{ backgroundColor: config.enabled ? categoryColor : '#e5e7eb' }}
                      >
                        <span
                          className="absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200"
                          style={{ transform: config.enabled ? 'translateX(24px)' : 'translateX(0)' }}
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* Configuration Inputs */}
                {config.enabled && (
                  <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4" style={{ borderColor: COLORS.border }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {/* Booking Confirmation */}
                      {automation.id === "bookingConfirmation" && "sendToClient" in config && (
                        <>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToClient" in config ? config.sendToClient : false}
                                onChange={(e) => updateAutomation("bookingConfirmation", { sendToClient: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Client</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToSitter" in config ? config.sendToSitter : false}
                                onChange={(e) => updateAutomation("bookingConfirmation", { sendToSitter: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Sitter</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToOwner" in config ? config.sendToOwner : false}
                                onChange={(e) => updateAutomation("bookingConfirmation", { sendToOwner: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Owner</span>
                            </label>
                          </div>
                          <div className="space-y-4">
                            {"sendToClient" in config && config.sendToClient && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Client Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateClient" in config ? (config.messageTemplateClient || "") : "🐾 BOOKING CONFIRMED!\n\nHi {{firstName}},\n\nYour {{service}} booking is confirmed for {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nWe'll see you soon!"}
                                  onChange={(e) => updateAutomation("bookingConfirmation", { messageTemplateClient: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{firstName}}"}, {"{{service}}"}, {"{{date}}"}, {"{{time}}"}, {"{{petQuantities}}"}, {"{{totalPrice}}"}</p>
                                <button
                                  onClick={() => {
                                    const template = "messageTemplateClient" in config ? (config.messageTemplateClient || "") : "🐾 BOOKING CONFIRMED!\n\nHi {{firstName}},\n\nYour {{service}} booking is confirmed for {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nWe'll see you soon!";
                                    handleTestMessage(template, "client");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                            {"sendToSitter" in config && config.sendToSitter && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Sitter Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateSitter" in config ? (config.messageTemplateSitter || "") : "✅ BOOKING ASSIGNED!\n\nHi {{sitterFirstName}},\n\nYou've been assigned to {{firstName}} {{lastName}}'s {{service}} booking on {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nAddress: {{address}}\n\nView details in your dashboard."}
                                  onChange={(e) => updateAutomation("bookingConfirmation", { messageTemplateSitter: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{sitterFirstName}}"}, {"{{firstName}}"}, {"{{lastName}}"}, {"{{service}}"}, {"{{date}}"}, {"{{time}}"}, {"{{petQuantities}}"}, {"{{address}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "✅ BOOKING ASSIGNED!\n\nHi {{sitterFirstName}},\n\nYou've been assigned to {{firstName}} {{lastName}}'s {{service}} booking on {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nAddress: {{address}}\n\nView details in your dashboard.";
                                    const template = "messageTemplateSitter" in config ? (config.messageTemplateSitter || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "sitter");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                            {"sendToOwner" in config && config.sendToOwner && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Owner Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateOwner" in config ? (config.messageTemplateOwner || "") : "📋 BOOKING CONFIRMED\n\n{{firstName}} {{lastName}}\n{{service}} — {{date}} at {{time}}\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nView: {{bookingUrl}}"}
                                  onChange={(e) => updateAutomation("bookingConfirmation", { messageTemplateOwner: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{firstName}}"}, {"{{lastName}}"}, {"{{service}}"}, {"{{date}}"}, {"{{time}}"}, {"{{petQuantities}}"}, {"{{totalPrice}}"}, {"{{bookingUrl}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "📋 BOOKING CONFIRMED\n\n{{firstName}} {{lastName}}\n{{service}} — {{date}} at {{time}}\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nView: {{bookingUrl}}";
                                    const template = "messageTemplateOwner" in config ? (config.messageTemplateOwner || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "owner");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Night Before Reminder */}
                      {automation.id === "nightBeforeReminder" && "sendToClient" in config && (
                        <>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.sendToClient}
                                onChange={(e) => updateAutomation("nightBeforeReminder", { sendToClient: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Client</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToSitter" in config ? config.sendToSitter : false}
                                onChange={(e) => updateAutomation("nightBeforeReminder", { sendToSitter: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Sitter</span>
                            </label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
                              Reminder Time (24-hour format)
                            </label>
                            <input
                              type="time"
                              value={"reminderTime" in config ? config.reminderTime : "19:00"}
                              onChange={(e) => updateAutomation("nightBeforeReminder", { reminderTime: e.target.value })}
                              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                              style={{ borderColor: COLORS.primaryLight }}
                            />
                            <p className="text-xs text-gray-500 mt-1">Time to send reminders (e.g., 19:00 = 7 PM)</p>
                          </div>
                          <div className="space-y-4">
                            {config.sendToClient && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Client Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateClient" in config ? (config.messageTemplateClient || "") : "🌙 REMINDER!\n\nHi {{firstName}},\n\nJust a friendly reminder about your {{service}} appointment tomorrow at {{time}}.\n\nPets: {{petQuantities}}\n\nWe're excited to care for your pets!"}
                                  onChange={(e) => updateAutomation("nightBeforeReminder", { messageTemplateClient: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{firstName}}"}, {"{{service}}"}, {"{{time}}"}, {"{{petQuantities}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "🌙 REMINDER!\n\nHi {{firstName}},\n\nJust a friendly reminder about your {{service}} appointment tomorrow at {{time}}.\n\nPets: {{petQuantities}}\n\nWe're excited to care for your pets!";
                                    const template = "messageTemplateClient" in config ? (config.messageTemplateClient || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "client");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                            {"sendToSitter" in config && config.sendToSitter && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Sitter Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateSitter" in config ? (config.messageTemplateSitter || "") : "🌙 REMINDER!\n\nHi {{sitterFirstName}},\n\nYou have a {{service}} appointment tomorrow at {{time}}.\n\nClient: {{firstName}} {{lastName}}\nPets: {{petQuantities}}\nAddress: {{address}}\n\nPlease confirm your availability."}
                                  onChange={(e) => updateAutomation("nightBeforeReminder", { messageTemplateSitter: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{sitterFirstName}}"}, {"{{service}}"}, {"{{time}}"}, {"{{firstName}}"}, {"{{lastName}}"}, {"{{petQuantities}}"}, {"{{address}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "🌙 REMINDER!\n\nHi {{sitterFirstName}},\n\nYou have a {{service}} appointment tomorrow at {{time}}.\n\nClient: {{firstName}} {{lastName}}\nPets: {{petQuantities}}\nAddress: {{address}}\n\nPlease confirm your availability.";
                                    const template = "messageTemplateSitter" in config ? (config.messageTemplateSitter || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "sitter");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Daily Summary */}
                      {automation.id === "dailySummary" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
                              Summary Time (24-hour format)
                            </label>
                            <input
                              type="time"
                              value={"summaryTime" in config ? config.summaryTime : "07:00"}
                              onChange={(e) => updateAutomation("dailySummary", { summaryTime: e.target.value })}
                              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                              style={{ borderColor: COLORS.primaryLight }}
                            />
                            <p className="text-xs text-gray-500 mt-1">Time to send daily summary (e.g., 07:00 = 7 AM)</p>
                          </div>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToOwner" in config ? config.sendToOwner : false}
                                onChange={(e) => updateAutomation("dailySummary", { sendToOwner: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Owner</span>
                            </label>
                          </div>
                          {"sendToOwner" in config && config.sendToOwner && (
                            <div>
                              <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                Daily Summary Template
                              </label>
                              <textarea
                                value={"messageTemplateOwner" in config ? (config.messageTemplateOwner || "") : "📊 DAILY SUMMARY — {{date}}\n\nToday's Schedule:\n{{bookingsList}}\n\nTotal Estimated Earnings: $" + "{{totalEarnings}}" + "\n\nHave a great day! 🐾"}
                                onChange={(e) => updateAutomation("dailySummary", { messageTemplateOwner: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                style={{ borderColor: COLORS.primaryLight }}
                                placeholder="Message template with {{variables}}..."
                              />
                              <p className="text-xs text-gray-500 mt-1">Available: {"{{date}}"}, {"{{bookingsList}}"}, {"{{totalEarnings}}"}</p>
                              <button
                                onClick={() => {
                                  const defaultTemplate = "📊 DAILY SUMMARY — {{date}}\n\nToday's Schedule:\n{{bookingsList}}\n\nTotal Estimated Earnings: $" + "{{totalEarnings}}" + "\n\nHave a great day! 🐾";
                                  const template = "messageTemplateOwner" in config ? (config.messageTemplateOwner || defaultTemplate) : defaultTemplate;
                                  handleTestMessage(template, "owner");
                                }}
                                disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                style={{ 
                                  borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                  backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                  color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                }}
                              >
                                <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                {testingMessage ? "Sending..." : "Test Message"}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Payment Reminder */}
                      {automation.id === "paymentReminder" && "sendToClient" in config && (
                        <>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.sendToClient}
                                onChange={(e) => updateAutomation("paymentReminder", { sendToClient: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Client</span>
                            </label>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
                                Reminder Delay (hours)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={"reminderDelay" in config ? config.reminderDelay : 24}
                                onChange={(e) => updateAutomation("paymentReminder", { reminderDelay: parseInt(e.target.value) || 24 })}
                                className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <p className="text-xs text-gray-500 mt-1">Hours after booking to send first reminder</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"repeatReminder" in config ? config.repeatReminder : false}
                                onChange={(e) => updateAutomation("paymentReminder", { repeatReminder: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send Repeat Reminders</span>
                            </label>
                            {"repeatReminder" in config && config.repeatReminder && (
                              <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
                                  Repeat Interval (days)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={"repeatInterval" in config ? config.repeatInterval : 7}
                                  onChange={(e) => updateAutomation("paymentReminder", { repeatInterval: parseInt(e.target.value) || 7 })}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                />
                                <p className="text-xs text-gray-500 mt-1">Days between repeat reminders</p>
                              </div>
                            )}
                          </div>
                          {config.sendToClient && (
                            <div>
                              <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                Client Message Template
                              </label>
                              <textarea
                                value={"messageTemplateClient" in config ? (config.messageTemplateClient || "") : "💳 PAYMENT REMINDER\n\nHi {{firstName}},\n\nYour {{service}} booking on {{date}} is ready for payment.\n\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nPay now: {{paymentLink}}"}
                                onChange={(e) => updateAutomation("paymentReminder", { messageTemplateClient: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                style={{ borderColor: COLORS.primaryLight }}
                                placeholder="Message template with {{variables}}..."
                              />
                              <p className="text-xs text-gray-500 mt-1">Available variables: {"{{firstName}}"}, {"{{service}}"}, {"{{date}}"}, {"{{petQuantities}}"}, {"{{totalPrice}}"}, {"{{paymentLink}}"}</p>
                              <button
                                onClick={() => {
                                  const defaultTemplate = "💳 PAYMENT REMINDER\n\nHi {{firstName}},\n\nYour {{service}} booking on {{date}} is ready for payment.\n\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nPay now: {{paymentLink}}";
                                  const template = "messageTemplateClient" in config ? (config.messageTemplateClient || defaultTemplate) : defaultTemplate;
                                  handleTestMessage(template, "client");
                                }}
                                disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                style={{ 
                                  borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                  backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                  color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                }}
                              >
                                <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                {testingMessage ? "Sending..." : "Test Message"}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Sitter Assignment */}
                      {automation.id === "sitterAssignment" && "sendToSitter" in config && (
                        <>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToSitter" in config ? config.sendToSitter : false}
                                onChange={(e) => updateAutomation("sitterAssignment", { sendToSitter: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Sitter</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToOwner" in config ? config.sendToOwner : false}
                                onChange={(e) => updateAutomation("sitterAssignment", { sendToOwner: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Owner</span>
                            </label>
                          </div>
                          <div className="space-y-4">
                            {"sendToSitter" in config && config.sendToSitter && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Sitter Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateSitter" in config ? (config.messageTemplateSitter || "") : "👋 SITTER ASSIGNED!\n\nHi {{sitterFirstName}},\n\nYou've been assigned to {{firstName}} {{lastName}}'s {{service}} booking on {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nAddress: {{address}}\n\nPlease confirm your availability."}
                                  onChange={(e) => updateAutomation("sitterAssignment", { messageTemplateSitter: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{sitterFirstName}}"}, {"{{firstName}}"}, {"{{lastName}}"}, {"{{service}}"}, {"{{date}}"}, {"{{time}}"}, {"{{petQuantities}}"}, {"{{address}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "👋 SITTER ASSIGNED!\n\nHi {{sitterFirstName}},\n\nYou've been assigned to {{firstName}} {{lastName}}'s {{service}} booking on {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nAddress: {{address}}\n\nPlease confirm your availability.";
                                    const template = "messageTemplateSitter" in config ? (config.messageTemplateSitter || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "sitter");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                            {"sendToOwner" in config && config.sendToOwner && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Owner Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateOwner" in config ? (config.messageTemplateOwner || "") : "✅ SITTER ASSIGNED\n\n{{sitterName}} has been assigned to {{firstName}} {{lastName}}'s {{service}} booking on {{date}} at {{time}}.\n\nView details: {{bookingUrl}}"}
                                  onChange={(e) => updateAutomation("sitterAssignment", { messageTemplateOwner: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{sitterName}}"}, {"{{sitterFirstName}}"}, {"{{firstName}}"}, {"{{lastName}}"}, {"{{service}}"}, {"{{date}}"}, {"{{time}}"}, {"{{bookingUrl}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "✅ SITTER ASSIGNED\n\n{{sitterName}} has been assigned to {{firstName}} {{lastName}}'s {{service}} booking on {{date}} at {{time}}.\n\nView details: {{bookingUrl}}";
                                    const template = "messageTemplateOwner" in config ? (config.messageTemplateOwner || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "owner");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Post Visit Thank You */}
                      {automation.id === "postVisitThankYou" && (
                        <>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToClient" in config ? config.sendToClient : false}
                                onChange={(e) => updateAutomation("postVisitThankYou", { sendToClient: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Client</span>
                            </label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
                              Delay After Visit (minutes)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={"delayAfterVisit" in config ? config.delayAfterVisit : 30}
                              onChange={(e) => updateAutomation("postVisitThankYou", { delayAfterVisit: parseInt(e.target.value) || 30 })}
                              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                              style={{ borderColor: COLORS.primaryLight }}
                            />
                            <p className="text-xs text-gray-500 mt-1">Minutes after visit completion to send message</p>
                          </div>
                          {"sendToClient" in config && config.sendToClient && (
                            <div>
                              <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                Client Message Template
                              </label>
                              <textarea
                                value={"messageTemplateClient" in config ? (config.messageTemplateClient || "") : "🐾 THANK YOU!\n\nHi {{firstName}},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their {{service}}.\n\nPets: {{petQuantities}}\n\nWe look forward to caring for your pets again soon!"}
                                onChange={(e) => updateAutomation("postVisitThankYou", { messageTemplateClient: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                style={{ borderColor: COLORS.primaryLight }}
                                placeholder="Message template with {{variables}}..."
                              />
                              <p className="text-xs text-gray-500 mt-1">Available: {"{{firstName}}"}, {"{{service}}"}, {"{{petQuantities}}"}</p>
                              <button
                                onClick={() => {
                                  const defaultTemplate = "🐾 THANK YOU!\n\nHi {{firstName}},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their {{service}}.\n\nPets: {{petQuantities}}\n\nWe look forward to caring for your pets again soon!";
                                  const template = "messageTemplateClient" in config ? (config.messageTemplateClient || defaultTemplate) : defaultTemplate;
                                  handleTestMessage(template, "client");
                                }}
                                disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                style={{ 
                                  borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                  backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                  color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                }}
                              >
                                <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                {testingMessage ? "Sending..." : "Test Message"}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Visit Report */}
                      {automation.id === "visitReport" && "sendToClient" in config && (
                        <>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToClient" in config ? config.sendToClient : false}
                                onChange={(e) => updateAutomation("visitReport", { sendToClient: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Client</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToOwner" in config ? config.sendToOwner : false}
                                onChange={(e) => updateAutomation("visitReport", { sendToOwner: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Owner</span>
                            </label>
                          </div>
                          <div className="space-y-4">
                            {"sendToClient" in config && config.sendToClient && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Client Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateClient" in config ? (config.messageTemplateClient || "") : "🐾 VISIT REPORT\n\nHi {{firstName}},\n\nYour {{service}} visit has been completed!\n\nPets: {{petQuantities}}\nSitter: {{sitterName}}\n\nReport: {{reportContent}}\n\nThank you for choosing Snout Services!"}
                                  onChange={(e) => updateAutomation("visitReport", { messageTemplateClient: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{firstName}}"}, {"{{service}}"}, {"{{petQuantities}}"}, {"{{sitterName}}"}, {"{{reportContent}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "🐾 VISIT REPORT\n\nHi {{firstName}},\n\nYour {{service}} visit has been completed!\n\nPets: {{petQuantities}}\nSitter: {{sitterName}}\n\nReport: {{reportContent}}\n\nThank you for choosing Snout Services!";
                                    const template = "messageTemplateClient" in config ? (config.messageTemplateClient || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "client");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                            {"sendToOwner" in config && config.sendToOwner && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Owner Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateOwner" in config ? (config.messageTemplateOwner || "") : "📋 VISIT REPORT\n\n{{firstName}} {{lastName}} - {{service}} visit completed\n\nPets: {{petQuantities}}\nSitter: {{sitterName}}\n\nReport: {{reportContent}}\n\nView: {{bookingUrl}}"}
                                  onChange={(e) => updateAutomation("visitReport", { messageTemplateOwner: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{firstName}}"}, {"{{lastName}}"}, {"{{service}}"}, {"{{petQuantities}}"}, {"{{sitterName}}"}, {"{{reportContent}}"}, {"{{bookingUrl}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "📋 VISIT REPORT\n\n{{firstName}} {{lastName}} - {{service}} visit completed\n\nPets: {{petQuantities}}\nSitter: {{sitterName}}\n\nReport: {{reportContent}}\n\nView: {{bookingUrl}}";
                                    const template = "messageTemplateOwner" in config ? (config.messageTemplateOwner || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "owner");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Owner New Booking Alert */}
                      {automation.id === "ownerNewBookingAlert" && "sendToOwner" in config && (
                        <>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToClient" in config ? config.sendToClient : false}
                                onChange={(e) => updateAutomation("ownerNewBookingAlert", { sendToClient: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Client</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToOwner" in config ? config.sendToOwner : false}
                                onChange={(e) => updateAutomation("ownerNewBookingAlert", { sendToOwner: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Owner</span>
                            </label>
                            <p className="text-xs text-gray-500">Sent immediately when a new booking is created</p>
                          </div>
                          {"sendToClient" in config && config.sendToClient && (
                            <div>
                              <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                Client Message Template
                              </label>
                              <textarea
                                value={"messageTemplateClient" in config ? (config.messageTemplateClient || "") : "🐾 BOOKING RECEIVED!\n\nHi {{firstName}},\n\nWe've received your {{service}} booking request for {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nWe'll confirm your booking shortly. Thank you!"}
                                onChange={(e) => updateAutomation("ownerNewBookingAlert", { messageTemplateClient: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                style={{ borderColor: COLORS.primaryLight }}
                                placeholder="Message template with {{variables}}..."
                              />
                              <p className="text-xs text-gray-500 mt-1">Available variables: {"{{firstName}}"}, {"{{service}}"}, {"{{date}}"}, {"{{time}}"}, {"{{petQuantities}}"}, {"{{totalPrice}}"}</p>
                              <button
                                onClick={() => {
                                  const defaultTemplate = "🐾 BOOKING RECEIVED!\n\nHi {{firstName}},\n\nWe've received your {{service}} booking request for {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nWe'll confirm your booking shortly. Thank you!";
                                  const template = "messageTemplateClient" in config ? (config.messageTemplateClient || defaultTemplate) : defaultTemplate;
                                  handleTestMessage(template, "client");
                                }}
                                disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                style={{ 
                                  borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                  backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                  color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                }}
                              >
                                <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                {testingMessage ? "Sending..." : "Test Message"}
                              </button>
                            </div>
                          )}
                          {"sendToOwner" in config && config.sendToOwner && (
                            <div>
                              <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                Owner Message Template
                              </label>
                              <textarea
                                value={"messageTemplateOwner" in config ? (config.messageTemplateOwner || "") : "📱 NEW BOOKING!\n\n{{firstName}} {{lastName}}\n{{phone}}\n\n{{service}} — {{date}} at {{time}}\n{{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nView details: {{bookingUrl}}"}
                                onChange={(e) => updateAutomation("ownerNewBookingAlert", { messageTemplateOwner: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                style={{ borderColor: COLORS.primaryLight }}
                                placeholder="Message template with {{variables}}..."
                              />
                              <p className="text-xs text-gray-500 mt-1">Available variables: {"{{firstName}}"}, {"{{lastName}}"}, {"{{phone}}"}, {"{{service}}"}, {"{{date}}"}, {"{{time}}"}, {"{{petQuantities}}"}, {"{{totalPrice}}"}, {"{{bookingUrl}}"}</p>
                              <button
                                onClick={() => {
                                  const defaultTemplate = "📱 NEW BOOKING!\n\n{{firstName}} {{lastName}}\n{{phone}}\n\n{{service}} — {{date}} at {{time}}\n{{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nView details: {{bookingUrl}}";
                                  const template = "messageTemplateOwner" in config ? (config.messageTemplateOwner || defaultTemplate) : defaultTemplate;
                                  handleTestMessage(template, "owner");
                                }}
                                disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                style={{ 
                                  borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                  backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                  color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                }}
                              >
                                <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                {testingMessage ? "Sending..." : "Test Message"}
                              </button>
                            </div>
                          )}
                          <div className="p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border, background: COLORS.primaryLighter }}>
                            <label className="block text-sm font-bold mb-2 sm:mb-3" style={{ color: COLORS.primary }}>
                              Owner Phone Number Type
                            </label>
                            <p className="text-xs text-gray-600 mb-2 sm:mb-3">
                              <strong>When this automation triggers:</strong> A new booking is submitted by a client
                            </p>
                            <div className="space-y-2 sm:space-y-3">
                              <label className="flex items-start gap-2 sm:gap-3 cursor-pointer p-3 border rounded-lg hover:opacity-90 touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border, background: ("ownerPhoneType" in config ? config.ownerPhoneType === "personal" : true) ? COLORS.white : 'transparent' }}>
                                <input
                                  type="radio"
                                  name="ownerNewBookingAlertPhoneType"
                                  value="personal"
                                  checked={"ownerPhoneType" in config ? config.ownerPhoneType === "personal" : true}
                                  onChange={(e) => updateAutomation("ownerNewBookingAlert", { ownerPhoneType: e.target.value as "personal" | "openphone" })}
                                  className="w-4 h-4 mt-1"
                                  style={{ accentColor: COLORS.primary }}
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-bold" style={{ color: COLORS.primary }}>Personal Phone</span>
                                  <p className="text-xs text-gray-600 mt-1">
                                    <strong>Best for:</strong> Internal alerts that you want to receive on your personal device. These are private notifications only you see.
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    <strong>When to use:</strong> You want immediate alerts on your personal phone without clients seeing this number.
                                  </p>
                                </div>
                              </label>
                              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:opacity-90" style={{ borderColor: COLORS.border, background: ("ownerPhoneType" in config ? config.ownerPhoneType === "openphone" : false) ? COLORS.white : 'transparent' }}>
                                <input
                                  type="radio"
                                  name="ownerNewBookingAlertPhoneType"
                                  value="openphone"
                                  checked={"ownerPhoneType" in config ? config.ownerPhoneType === "openphone" : false}
                                  onChange={(e) => updateAutomation("ownerNewBookingAlert", { ownerPhoneType: e.target.value as "personal" | "openphone" })}
                                  className="w-4 h-4 mt-1"
                                  style={{ accentColor: COLORS.primary }}
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-bold" style={{ color: COLORS.primary }}>OpenPhone</span>
                                  <p className="text-xs text-gray-600 mt-1">
                                    <strong>Best for:</strong> Business notifications sent from your OpenPhone business number. Keeps personal and business separate.
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    <strong>When to use:</strong> You want to receive booking alerts on your business phone line, or want to forward messages to team members.
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Sitter Pool Offers */}
                      {automation.id === "sitterPoolOffers" && "sendToSitters" in config && (
                        <>
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToSitters" in config ? config.sendToSitters : false}
                                onChange={(e) => updateAutomation("sitterPoolOffers", { sendToSitters: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Sitters</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={"sendToOwner" in config ? config.sendToOwner : false}
                                onChange={(e) => updateAutomation("sitterPoolOffers", { sendToOwner: e.target.checked })}
                                className="w-4 h-4 rounded border-2"
                                style={{ borderColor: COLORS.primaryLight }}
                              />
                              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Notify Owner</span>
                            </label>
                          </div>
                          <div className="space-y-3 sm:space-y-4">
                            <div className="p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border, background: COLORS.primaryLighter }}>
                              <label className="block text-sm font-bold mb-2 sm:mb-3" style={{ color: COLORS.primary }}>
                                Sitter Phone Number Type
                              </label>
                              <p className="text-xs text-gray-600 mb-2 sm:mb-3">
                                <strong>When this automation triggers:</strong> You send a job offer to available sitters
                              </p>
                              <div className="space-y-2 sm:space-y-3">
                                <label className="flex items-start gap-2 sm:gap-3 cursor-pointer p-3 border rounded-lg hover:opacity-90 touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border, background: ("sitterPhoneType" in config ? config.sitterPhoneType === "personal" : true) ? COLORS.white : 'transparent' }}>
                                  <input
                                    type="radio"
                                    name="sitterPoolOffersSitterPhoneType"
                                    value="personal"
                                    checked={"sitterPhoneType" in config ? config.sitterPhoneType === "personal" : true}
                                    onChange={(e) => updateAutomation("sitterPoolOffers", { sitterPhoneType: e.target.value as "personal" | "openphone" })}
                                    className="w-4 h-4 mt-1"
                                    style={{ accentColor: COLORS.primary }}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-bold" style={{ color: COLORS.primary }}>Personal Phone</span>
                                    <p className="text-xs text-gray-600 mt-1">
                                      <strong>Best for:</strong> Sitters who prefer direct communication on their personal phones. Faster response times.
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      <strong>When to use:</strong> When sitters primarily use their personal phones and you want immediate replies.
                                    </p>
                                  </div>
                                </label>
                                <label className="flex items-start gap-2 sm:gap-3 cursor-pointer p-3 border rounded-lg hover:opacity-90 touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border, background: ("sitterPhoneType" in config ? config.sitterPhoneType === "openphone" : false) ? COLORS.white : 'transparent' }}>
                                  <input
                                    type="radio"
                                    name="sitterPoolOffersSitterPhoneType"
                                    value="openphone"
                                    checked={"sitterPhoneType" in config ? config.sitterPhoneType === "openphone" : false}
                                    onChange={(e) => updateAutomation("sitterPoolOffers", { sitterPhoneType: e.target.value as "personal" | "openphone" })}
                                    className="w-4 h-4 mt-1"
                                    style={{ accentColor: COLORS.primary }}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-bold" style={{ color: COLORS.primary }}>OpenPhone</span>
                                    <p className="text-xs text-gray-600 mt-1">
                                      <strong>Best for:</strong> Sitters who use business phone numbers. Keeps work and personal separate.
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      <strong>When to use:</strong> When sitters have OpenPhone numbers set up and prefer business communication channels.
                                    </p>
                                  </div>
                                </label>
                              </div>
                            </div>

                            <div className="p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border, background: COLORS.primaryLighter }}>
                              <label className="block text-sm font-bold mb-2 sm:mb-3" style={{ color: COLORS.primary }}>
                                Owner Phone Number Type
                              </label>
                              <p className="text-xs text-gray-600 mb-2 sm:mb-3">
                                <strong>When this automation triggers:</strong> A sitter accepts a job offer (you get notified)
                              </p>
                              <div className="space-y-2 sm:space-y-3">
                                <label className="flex items-start gap-2 sm:gap-3 cursor-pointer p-3 border rounded-lg hover:opacity-90 touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border, background: ("ownerPhoneType" in config ? config.ownerPhoneType === "personal" : true) ? COLORS.white : 'transparent' }}>
                                  <input
                                    type="radio"
                                    name="sitterPoolOffersOwnerPhoneType"
                                    value="personal"
                                    checked={"ownerPhoneType" in config ? config.ownerPhoneType === "personal" : true}
                                    onChange={(e) => updateAutomation("sitterPoolOffers", { ownerPhoneType: e.target.value as "personal" | "openphone" })}
                                    className="w-4 h-4 mt-1"
                                    style={{ accentColor: COLORS.primary }}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-bold" style={{ color: COLORS.primary }}>Personal Phone</span>
                                    <p className="text-xs text-gray-600 mt-1">
                                      <strong>Best for:</strong> Immediate alerts when a sitter accepts. You want to know right away on your personal device.
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      <strong>When to use:</strong> For urgent notifications you need to see immediately, regardless of where you are.
                                    </p>
                                  </div>
                                </label>
                                <label className="flex items-start gap-2 sm:gap-3 cursor-pointer p-3 border rounded-lg hover:opacity-90 touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border, background: ("ownerPhoneType" in config ? config.ownerPhoneType === "openphone" : false) ? COLORS.white : 'transparent' }}>
                                  <input
                                    type="radio"
                                    name="sitterPoolOffersOwnerPhoneType"
                                    value="openphone"
                                    checked={"ownerPhoneType" in config ? config.ownerPhoneType === "openphone" : false}
                                    onChange={(e) => updateAutomation("sitterPoolOffers", { ownerPhoneType: e.target.value as "personal" | "openphone" })}
                                    className="w-4 h-4 mt-1"
                                    style={{ accentColor: COLORS.primary }}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-bold" style={{ color: COLORS.primary }}>OpenPhone</span>
                                    <p className="text-xs text-gray-600 mt-1">
                                      <strong>Best for:</strong> Business notifications on your business phone. Can be shared with team members.
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      <strong>When to use:</strong> When you manage notifications through your business phone line or want to forward to team members.
                                    </p>
                                  </div>
                                </label>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
                              Response Timeout (hours)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={"responseTimeout" in config ? config.responseTimeout : 24}
                              onChange={(e) => updateAutomation("sitterPoolOffers", { responseTimeout: parseInt(e.target.value) || 24 })}
                              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                              style={{ borderColor: COLORS.primaryLight }}
                            />
                            <p className="text-xs text-gray-500 mt-1">Hours before offer expires</p>
                          </div>
                          <div className="space-y-4">
                            {"sendToSitters" in config && config.sendToSitters && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Sitter Message Template
                                </label>
                                <textarea
                                  value={"messageTemplateSitter" in config ? (config.messageTemplateSitter || "") : "🎯 NEW JOB OPPORTUNITY!\n\nHi {{sitterFirstName}},\n\nNew {{service}} opportunity available!\n\nClient: {{firstName}} {{lastName}}\nDate: {{date}} at {{time}}\nPets: {{petQuantities}}\nAddress: {{address}}\n\nReply YES to accept! First to respond gets the job."}
                                  onChange={(e) => updateAutomation("sitterPoolOffers", { messageTemplateSitter: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{sitterFirstName}}"}, {"{{service}}"}, {"{{firstName}}"}, {"{{lastName}}"}, {"{{date}}"}, {"{{time}}"}, {"{{petQuantities}}"}, {"{{address}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "🎯 NEW JOB OPPORTUNITY!\n\nHi {{sitterFirstName}},\n\nNew {{service}} opportunity available!\n\nClient: {{firstName}} {{lastName}}\nDate: {{date}} at {{time}}\nPets: {{petQuantities}}\nAddress: {{address}}\n\nReply YES to accept! First to respond gets the job.";
                                    const template = "messageTemplateSitter" in config ? (config.messageTemplateSitter || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "sitter");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                            {"sendToOwner" in config && config.sendToOwner && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Owner Message Template (When Sitter Accepts)
                                </label>
                                <textarea
                                  value={"messageTemplateOwner" in config ? (config.messageTemplateOwner || "") : "✅ SITTER ACCEPTED!\n\n{{sitterName}} has accepted the {{service}} job for {{firstName}} {{lastName}} on {{date}} at {{time}}.\n\nView details: {{bookingUrl}}"}
                                  onChange={(e) => updateAutomation("sitterPoolOffers", { messageTemplateOwner: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="Message template with {{variables}}..."
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{sitterName}}"}, {"{{sitterFirstName}}"}, {"{{service}}"}, {"{{firstName}}"}, {"{{lastName}}"}, {"{{date}}"}, {"{{time}}"}, {"{{bookingUrl}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "✅ SITTER ACCEPTED!\n\n{{sitterName}} has accepted the {{service}} job for {{firstName}} {{lastName}} on {{date}} at {{time}}.\n\nView details: {{bookingUrl}}";
                                    const template = "messageTemplateOwner" in config ? (config.messageTemplateOwner || defaultTemplate) : defaultTemplate;
                                    handleTestMessage(template, "owner");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Payment & Tip Links */}
                      {automation.id === "paymentAndTipLinks" && "sendMode" in config && (
                        <>
                          <div className="space-y-4">
                            <div className="p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border, background: COLORS.primaryLighter }}>
                              <label className="block text-sm font-bold mb-2 sm:mb-3" style={{ color: COLORS.primary }}>
                                Send Mode
                              </label>
                              <p className="text-xs text-gray-600 mb-3">
                                Choose whether payment and tip links are sent automatically or manually
                              </p>
                              <div className="space-y-2">
                                <label className="flex items-start gap-2 sm:gap-3 cursor-pointer p-3 border rounded-lg hover:opacity-90 touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border, background: (config.sendMode === "automatic") ? COLORS.white : 'transparent' }}>
                                  <input
                                    type="radio"
                                    name="paymentAndTipLinksSendMode"
                                    value="automatic"
                                    checked={config.sendMode === "automatic"}
                                    onChange={(e) => updateAutomation("paymentAndTipLinks", { sendMode: e.target.value as "automatic" | "manual" })}
                                    className="w-4 h-4 mt-1"
                                    style={{ accentColor: COLORS.primary }}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-bold" style={{ color: COLORS.primary }}>Automatic</span>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Links are automatically sent based on the trigger event you select below
                                    </p>
                                  </div>
                                </label>
                                <label className="flex items-start gap-2 sm:gap-3 cursor-pointer p-3 border rounded-lg hover:opacity-90 touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border, background: (config.sendMode === "manual") ? COLORS.white : 'transparent' }}>
                                  <input
                                    type="radio"
                                    name="paymentAndTipLinksSendMode"
                                    value="manual"
                                    checked={config.sendMode === "manual"}
                                    onChange={(e) => updateAutomation("paymentAndTipLinks", { sendMode: e.target.value as "automatic" | "manual" })}
                                    className="w-4 h-4 mt-1"
                                    style={{ accentColor: COLORS.primary }}
                                  />
                                  <div className="flex-1">
                                    <span className="text-sm font-bold" style={{ color: COLORS.primary }}>Manual Only</span>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Links are only sent when you manually click "Generate Payment Link" or "Generate Tip Link" in booking details
                                    </p>
                                  </div>
                                </label>
                              </div>
                            </div>

                            {config.sendMode === "automatic" && (
                              <div className="p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border, background: COLORS.primaryLighter }}>
                                <label className="block text-sm font-bold mb-2 sm:mb-3" style={{ color: COLORS.primary }}>
                                  When to Send Automatically
                                </label>
                                <p className="text-xs text-gray-600 mb-3">
                                  Choose when payment and tip links should be automatically sent
                                </p>
                                <select
                                  value={config.whenToSend}
                                  onChange={(e) => updateAutomation("paymentAndTipLinks", { whenToSend: e.target.value as "after_booking" | "after_confirmation" | "after_completion" | "manual_only" })}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                >
                                  <option value="after_booking">After Booking Submission</option>
                                  <option value="after_confirmation">After Booking Confirmation</option>
                                  <option value="after_completion">After Visit Completion</option>
                                  <option value="manual_only">Manual Only (No Automatic Sending)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                  <strong>After Booking Submission:</strong> Links sent immediately when a booking is created<br/>
                                  <strong>After Booking Confirmation:</strong> Links sent when booking status is set to "confirmed"<br/>
                                  <strong>After Visit Completion:</strong> Links sent when booking status is set to "completed"<br/>
                                  <strong>Manual Only:</strong> Links are never sent automatically
                                </p>
                              </div>
                            )}

                            <div className="space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={config.sendToClient}
                                  onChange={(e) => updateAutomation("paymentAndTipLinks", { sendToClient: e.target.checked })}
                                  className="w-4 h-4 rounded border-2"
                                  style={{ borderColor: COLORS.primaryLight }}
                                />
                                <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Client</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={config.sendToOwner}
                                  onChange={(e) => updateAutomation("paymentAndTipLinks", { sendToOwner: e.target.checked })}
                                  className="w-4 h-4 rounded border-2"
                                  style={{ borderColor: COLORS.primaryLight }}
                                />
                                <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Send to Owner</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={config.includePaymentLink}
                                  onChange={(e) => updateAutomation("paymentAndTipLinks", { includePaymentLink: e.target.checked })}
                                  className="w-4 h-4 rounded border-2"
                                  style={{ borderColor: COLORS.primaryLight }}
                                />
                                <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Include Payment Link</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={config.includeTipLink}
                                  onChange={(e) => updateAutomation("paymentAndTipLinks", { includeTipLink: e.target.checked })}
                                  className="w-4 h-4 rounded border-2"
                                  style={{ borderColor: COLORS.primaryLight }}
                                />
                                <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Include Tip Link</span>
                              </label>
                            </div>

                            {config.sendMode === "automatic" && (
                              <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
                                  Send Delay (minutes)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={config.sendDelay}
                                  onChange={(e) => updateAutomation("paymentAndTipLinks", { sendDelay: parseInt(e.target.value) || 0 })}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                />
                                <p className="text-xs text-gray-500 mt-1">Delay in minutes after the trigger event before sending links</p>
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            {config.sendToClient && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Client Message Template
                                </label>
                                <textarea
                                  value={config.messageTemplateClient || ""}
                                  onChange={(e) => updateAutomation("paymentAndTipLinks", { messageTemplateClient: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="💳 PAYMENT LINK\n\nHi {{firstName}},\n\nYour {{service}} booking on {{date}} is ready for payment.\n\nTotal: ${{totalPrice}}\n\nPay now: {{paymentLink}}\n\nTip your sitter: {{tipLink}}"
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{firstName}}"}, {"{{service}}"}, {"{{date}}"}, {"{{totalPrice}}"}, {"{{paymentLink}}"}, {"{{tipLink}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "💳 PAYMENT LINK\n\nHi {{firstName}},\n\nYour {{service}} booking on {{date}} is ready for payment.\n\nTotal: ${{totalPrice}}\n\nPay now: {{paymentLink}}\n\nTip your sitter: {{tipLink}}";
                                    const template = config.messageTemplateClient || defaultTemplate;
                                    handleTestMessage(template, "client");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}

                            {config.sendToOwner && (
                              <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.primary }}>
                                  Owner Message Template
                                </label>
                                <textarea
                                  value={config.messageTemplateOwner || ""}
                                  onChange={(e) => updateAutomation("paymentAndTipLinks", { messageTemplateOwner: e.target.value })}
                                  rows={6}
                                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm touch-manipulation min-h-[44px]"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder="💳 PAYMENT LINKS SENT\n\nPayment and tip links have been sent to {{firstName}} {{lastName}} for their {{service}} booking on {{date}}.\n\nPayment Link: {{paymentLink}}\nTip Link: {{tipLink}}"
                                />
                                <p className="text-xs text-gray-500 mt-1">Available: {"{{firstName}}"}, {"{{lastName}}"}, {"{{service}}"}, {"{{date}}"}, {"{{paymentLink}}"}, {"{{tipLink}}"}</p>
                                <button
                                  onClick={() => {
                                    const defaultTemplate = "💳 PAYMENT LINKS SENT\n\nPayment and tip links have been sent to {{firstName}} {{lastName}} for their {{service}} booking on {{date}}.\n\nPayment Link: {{paymentLink}}\nTip Link: {{tipLink}}";
                                    const template = config.messageTemplateOwner || defaultTemplate;
                                    handleTestMessage(template, "owner");
                                  }}
                                  disabled={testingMessage !== null || !testPhoneNumber.trim()}
                                  className="mt-2 px-3 py-2 text-xs font-bold border-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center gap-2"
                                  style={{ 
                                    borderColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : COLORS.border,
                                    backgroundColor: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primary : 'transparent',
                                    color: (!testingMessage && testPhoneNumber.trim()) ? COLORS.primaryLight : COLORS.gray
                                  }}
                                >
                                  <i className={`fas fa-paper-plane ${testingMessage ? 'animate-pulse' : ''}`}></i>
                                  {testingMessage ? "Sending..." : "Test Message"}
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Button Fixed at Bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 p-4" style={{ borderColor: COLORS.border }}>
          <div className="max-w-[1600px] mx-auto flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 text-base font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 touch-manipulation min-h-[44px]"
              style={{ background: COLORS.primary, color: COLORS.primaryLight }}
            >
              <i className={`fas fa-save mr-2 ${saving ? 'animate-spin' : ''}`}></i>
              {saving ? 'Saving...' : 'Save All Automation Settings'}
            </button>
          </div>
        </div>

        {/* Bottom padding to prevent content from being hidden behind fixed button */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}
