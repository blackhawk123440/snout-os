/**
 * Snout OS Color System
 * Consistent colors across the entire application
 */

// Brand Colors
export const BRAND = {
  primary: '#432f21',      // Brown - Primary brand color
  primaryLight: '#fce1ef', // Pink - Secondary brand color
  primaryDark: '#2d1f15',  // Dark brown
} as const;

// Status Colors (Use these everywhere for consistency!)
export const STATUS = {
  // Booking Status
  pending: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    hex: '#f59e0b', // Amber
  },
  confirmed: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    hex: '#10b981', // Green
  },
  completed: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    hex: '#6b7280', // Gray
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    hex: '#ef4444', // Red
  },
} as const;

// Payment Status Colors
export const PAYMENT = {
  paid: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    icon: 'fas fa-check-circle',
    hex: '#10b981', // Green
  },
  unpaid: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    icon: 'fas fa-circle',
    hex: '#6b7280', // Gray
  },
  pending: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: 'fas fa-clock',
    hex: '#3b82f6', // Blue
  },
  refunded: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: 'fas fa-undo',
    hex: '#ef4444', // Red
  },
} as const;

// Action/Metric Colors
export const METRICS = {
  revenue: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    icon: 'fas fa-dollar-sign',
    hex: '#10b981', // Green
  },
  count: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: 'fas fa-hashtag',
    hex: '#3b82f6', // Blue
  },
  warning: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    icon: 'fas fa-exclamation-triangle',
    hex: '#f59e0b', // Amber
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: 'fas fa-info-circle',
    hex: '#3b82f6', // Blue
  },
} as const;

// Helper Functions
export function getStatusColor(status: string) {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'pending':
      return STATUS.pending;
    case 'confirmed':
      return STATUS.confirmed;
    case 'completed':
      return STATUS.completed;
    case 'cancelled':
      return STATUS.cancelled;
    default:
      return STATUS.pending;
  }
}

export function getPaymentColor(paymentStatus: string) {
  const normalized = paymentStatus.toLowerCase();
  switch (normalized) {
    case 'paid':
      return PAYMENT.paid;
    case 'unpaid':
      return PAYMENT.unpaid;
    case 'pending':
      return PAYMENT.pending;
    case 'refunded':
      return PAYMENT.refunded;
    default:
      return PAYMENT.unpaid;
  }
}

export function getStatusBadgeClasses(status: string): string {
  const color = getStatusColor(status);
  return `${color.bg} ${color.text} ${color.border}`;
}

export function getPaymentBadgeClasses(paymentStatus: string): string {
  const color = getPaymentColor(paymentStatus);
  return `${color.bg} ${color.text} ${color.border}`;
}

/**
 * Color Usage Guide:
 * 
 * PENDING = Amber/Yellow (Needs Action)
 * CONFIRMED = Green (Good to Go)
 * COMPLETED = Gray (Done/Neutral)
 * CANCELLED = Red (Stopped/Bad)
 * 
 * PAID = Green (Money Received)
 * UNPAID = Gray (Not Paid Yet)
 * PAYMENT PENDING = Blue (Processing)
 * REFUNDED = Red (Money Returned)
 * 
 * REVENUE = Green (Money)
 * COUNT/STATS = Blue (Numbers/Info)
 * WARNING = Amber (Caution)
 * ERROR = Red (Problem)
 * 
 * BRAND PRIMARY = Brown (#432f21)
 * BRAND SECONDARY = Pink (#fce1ef)
 */

