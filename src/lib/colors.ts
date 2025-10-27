export const COLORS = {
  primary: "#432f21",
  primaryLight: "#fce1ef",
  primaryLighter: "#fef7fb",
  gray: "#6b7280",
  border: "#e5e7eb",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

export function getStatusColor(status: string): string {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800";
    case "confirmed": return "bg-blue-100 text-blue-800";
    case "completed": return "bg-green-100 text-green-800";
    case "cancelled": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export function getPaymentColor(status: string): string {
  switch (status) {
    case "paid": return "bg-green-100 text-green-800";
    case "pending": return "bg-yellow-100 text-yellow-800";
    case "failed": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}