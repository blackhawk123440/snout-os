import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookings Dashboard | Snout Services",
  description: "Manage your pet care bookings, clients, and sitters",
};

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


