import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sitter Dashboard | Snout Services",
  description: "View your assigned bookings and schedule",
};

export default function SitterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


