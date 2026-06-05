import type { Metadata, Viewport } from "next";
import { Libre_Baskerville } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { Agentation } from "agentation";

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
});

export const metadata: Metadata = {
  title: "LeadFlow CRM",
  description: "Lead management CRM for small business sales teams."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={libreBaskerville.variable}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
