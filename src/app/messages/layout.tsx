import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages - Snout OS",
  description: "Manage message templates and automated communications",
};

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}