import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Snout Services",
  description: "Configure automation, SMS templates, and business settings",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


