import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payments | Snout Services",
  description: "Manage payment links and transactions via Stripe",
};

export default function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


