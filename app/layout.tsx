import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "../tokens.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: "QONSULIN.ID - Konsultasi Online & Mental Wellness Support",
  description: "Ruang aman untuk berbagi cerita, menemukan dukungan, dan melangkah lebih baik.",
  icons: { icon: "/qonsulin-logo.png", apple: "/qonsulin-logo.png" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
