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
    case "pending": return `bg-yellow-100 text-yellow-800 border-yellow-200`;
    case "confirmed": return `bg-blue-100 text-blue-800 border-blue-200`;
    case "completed": return `bg-green-100 text-green-800 border-green-200`;
    case "cancelled": return `bg-red-100 text-red-800 border-red-200`;
    default: return `bg-gray-100 text-gray-800 border-gray-200`;
  }
}

export function getPaymentColor(status: string): string {
  switch (status) {
    case "paid": return `bg-green-100 text-green-800 border-green-200`;
    case "pending": return `bg-yellow-100 text-yellow-800 border-yellow-200`;
    case "failed": return `bg-red-100 text-red-800 border-red-200`;
    case "refunded": return `bg-purple-100 text-purple-800 border-purple-200`;
    default: return `bg-gray-100 text-gray-800 border-gray-200`;
  }
}