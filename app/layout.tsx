import type { Metadata, Viewport } from "next";
import { Lora, Work_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

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

export const metadata: Metadata = {
  title: "Cordero Coffee Club",
  description: "Pedidos en linea y administracion para Cordero Coffee Club.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
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
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
