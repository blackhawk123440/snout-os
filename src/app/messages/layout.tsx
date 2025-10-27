import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Message Templates - Snout Services',
};

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
