import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BuildHash } from "@/components/ui/BuildHash";
import { tokens } from '@/lib/design-tokens';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
    <html lang="en" className={`${inter.variable} overflow-x-hidden font-sans theme-snout`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('snout-theme');if(t==='light'){document.documentElement.classList.remove('theme-snout')}else if(t==='dark'){document.documentElement.classList.remove('theme-snout');document.documentElement.classList.add('dark')}else if(t==='snout-dark'){document.documentElement.classList.remove('theme-snout');document.documentElement.classList.add('theme-snout-dark')}}catch(e){}})();` }} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
        {/* Google Ads Global Tag */}
        {/* eslint-disable-next-line @next/next/next-script-for-ga */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-11558191297"></script>
        {/* eslint-disable-next-line @next/next/next-script-for-ga -- inline gtag config for Ads; next/script doesn't support dangerouslySetInnerHTML */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-11558191297');
            `,
          }}
        />
        <style dangerouslySetInnerHTML={{__html: `
          * {
            box-sizing: border-box;
          }
          html, body {
            width: 100%;
            margin: 0;
            padding: 0;
            max-width: 100%;
            overflow-x: hidden;
            /* overflow-y controlled by AppShell - body scroll disabled when AppShell is mounted */
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
            height: 100%; /* Ensure body has height */
          }
          #__next, [data-nextjs-scroll-focus-boundary] {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }
          body > * {
            width: 100%;
            max-width: 100%;
          }
          @media (max-width: ${tokens.layout.breakpoints.sm}) {
            input, select, textarea {
              font-size: ${tokens.typography.fontSize.base[0]} !important;
            }
          }
        `}} />
      </head>
      <body className="overflow-x-hidden w-full font-sans antialiased" style={{ fontFamily: 'var(--font-inter), sans-serif', WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' }}>
        <Providers>
          <div className="w-full min-h-screen">
            {children}
          </div>
          <BuildHash />
        </Providers>
      </body>
    </html>
  );
}
