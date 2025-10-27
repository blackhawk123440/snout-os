import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Management - Snout Services',
};

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
