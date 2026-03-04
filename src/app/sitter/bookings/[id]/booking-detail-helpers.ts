export type BookingPrimaryAction = 'start' | 'end' | 'write_report' | 'view_report';

export function getBookingPrimaryAction(status: string, hasReport: boolean): BookingPrimaryAction {
  if (status === 'in_progress') return 'end';
  if (status === 'completed') return hasReport ? 'view_report' : 'write_report';
  return 'start';
}

export function shouldRenderTel(phone?: string | null): boolean {
  return !!(phone && phone.trim());
}

export function shouldRenderMail(email?: string | null): boolean {
  return !!(email && email.trim());
}

export function shouldRenderCopyAddress(address?: string | null): boolean {
  return !!(address && address.trim());
}

export function getOptimisticStatus(currentStatus: string, action: 'start' | 'end'): string {
  if (action === 'start') return 'in_progress';
  if (action === 'end') return 'completed';
  return currentStatus;
}
