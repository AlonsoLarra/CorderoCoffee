import type { Metadata, Viewport } from "next";
import { Lora, Work_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { OfflineSyncBanner } from "@/components/offline-sync-banner";
import { ToastProvider } from "@/components/ui/toast-provider";
import { GlobalOrderNotifier } from "@/components/ordering/global-order-notifier";

import "./globals.css";

const headingFont = Lora({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://corderocoffee.com";

export const metadata: Metadata = {
  title: "Cordero Coffee Club",
  description: "Ordena tu café favorito en línea. Recoge en tienda sin esperas con Cordero Coffee Club.",
  metadataBase: new URL(APP_URL),
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Cordero Coffee Club",
    title: "Cordero Coffee Club",
    description: "Ordena tu café favorito en línea. Recoge en tienda sin esperas.",
    url: APP_URL,
    locale: "es_MX",
  },
  twitter: {
    card: "summary",
    title: "Cordero Coffee Club",
    description: "Ordena tu café favorito en línea. Recoge en tienda sin esperas.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${headingFont.variable} ${bodyFont.variable} bg-cordero-cream text-cordero-espresso antialiased`}>
        <ToastProvider>
          {children}
          <GlobalOrderNotifier />
          <OfflineSyncBanner />
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
