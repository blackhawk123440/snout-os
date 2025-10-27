import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snout OS - Pet Care Management System",
  description: "Complete pet care management system for booking, sitter management, payments, and automation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}