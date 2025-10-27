import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Automation Center - Snout OS",
  description: "Manage message templates and automation settings for your pet care business",
};

export default function AutomationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
