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

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const readRuntimeEnv = (name: string) => process.env[name]?.trim().replace(/^['"]|['"]$/g, "") || "";
  const publicConfig = {
    // NEXT_PUBLIC_* values are fixed while Next.js builds the client bundle.
    // Cloudflare provides these non-public names to the Worker at request time.
    supabaseUrl: readRuntimeEnv("SUPABASE_URL") || readRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabasePublishableKey: readRuntimeEnv("SUPABASE_PUBLISHABLE_KEY") ||
      readRuntimeEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
      readRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
      readRuntimeEnv("NEXT_PUBLIC_SUPABASE_KEY")
  };
  const serializedConfig = JSON.stringify(publicConfig).replace(/[<>&\u2028\u2029]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );

  return (
    <html lang="id" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `window.__QONSULIN_PUBLIC_CONFIG__=${serializedConfig};` }} />
        {children}
      </body>
    </html>
  );
}
