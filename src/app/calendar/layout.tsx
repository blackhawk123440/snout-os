import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar | Snout Services",
  description: "View and manage your booking calendar",
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


