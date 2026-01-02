import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

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
    <html lang="en" className="overflow-x-hidden">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
        <style dangerouslySetInnerHTML={{__html: `
          * {
            box-sizing: border-box;
          }
          html, body {
            width: 100%;
            margin: 0;
            padding: 0;
            max-width: 100vw;
            overflow-x: hidden;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
          #__next, [data-nextjs-scroll-focus-boundary] {
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }
          body > * {
            width: 100%;
            max-width: 100vw;
          }
          @media (max-width: 640px) {
            input, select, textarea {
              font-size: 16px !important;
            }
          }
        `}} />
      </head>
      <body className="overflow-x-hidden w-full" style={{ WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' }}>
        <Providers>
          <div className="w-full min-h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}