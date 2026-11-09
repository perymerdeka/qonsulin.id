import { getSupabasePublicClient, getSupabaseClient } from "@/lib/supabase";
import { whatsappUrl } from "@/lib/data";

export type PackageCategory = "membership" | "consultation";

export type ConsultationPackage = {
  id: string;
  code: string;
  name: string;
  category: PackageCategory;
  price: number;
  original_price?: number | null;
  duration_days?: number | null;
  letter_quota?: number | null;
  description?: string | null;
  badge?: string | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type PackageOrder = {
  id: string;
  user_id?: string | null;
  package_id: string;
  package_code: string;
  package_name: string;
  amount: number;
  status: "pending" | "active" | "rejected" | "expired";
  buyer_name?: string | null;
  buyer_contact?: string | null;
  notes?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  created_at: string;
};

export const fallbackPackages: ConsultationPackage[] = [
  {
    id: "pkg-free",
    code: "member_free",
    name: "Member Free",
    category: "membership",
    price: 0,
    original_price: 0,
    duration_days: null,
    letter_quota: 3,
    description: "Akses dasar menulis surat batin dan membaca cerita anonim di kolam komunitas.",
    badge: "Gratis",
    features: [
      "3 Surat Batin per bulan",
      "Akses Kolam Surat Anonim",
      "Pilihan avatar emosi dasar",
      "Dukungan Community Support",
      "100% Anonim & Privat"
    ],
    is_active: true,
    sort_order: 1
  },
  {
    id: "pkg-premium",
    code: "member_premium",
    name: "Member Premium",
    category: "membership",
    price: 19000,
    original_price: 39000,
    duration_days: 30,
    letter_quota: -1,
    description: "Ruang katarsis tanpa batas dengan seluruh tema kertas dan cap segel lilin eksklusif.",
    badge: "Pilihan Populer",
    features: [
      "Kirim surat batin tanpa batas kuota",
      "Buka seluruh tema kertas digital eksklusif",
      "Akses cap segel lilin (wax seal) emas",
      "Surat diprioritaskan di Kolam Komunitas",
      "Dukungan berkelanjutan"
    ],
    is_active: true,
    sort_order: 2
  },
  {
    id: "pkg-sebaya",
    code: "konseling_sebaya",
    name: "Konseling Teman Dengar (Sebaya)",
    category: "consultation",
    price: 35000,
    original_price: 50000,
    duration_days: null,
    letter_quota: null,
    description: "Sesi 1-on-1 privat 45-60 menit bersama konselor sebaya terlatih untuk luapan emosi & overthinking.",
    badge: "Terjangkau",
    features: [
      "Sesi 1-on-1 via Chat WhatsApp / Call 45-60 menit",
      "Didampingi Peer Counselor terlatih",
      "Ruang aman tanpa stigma & tanpa menghakimi",
      "Cocok untuk burnout, bad day, & curhat terarah",
      "Rangkuman refleksi setelah sesi"
    ],
    is_active: true,
    sort_order: 3
  },
  {
    id: "pkg-klinis",
    code: "psikolog_klinis",
    name: "Konseling Psikolog Klinis",
    category: "consultation",
    price: 129000,
    original_price: 175000,
    duration_days: null,
    letter_quota: null,
    description: "Pendampingan profesional berwenang untuk eksplorasi trauma, kecemasan akut, dan intervensi klinis mendalam.",
    badge: "Profesional Berwenang",
    features: [
      "Sesi privat 60 menit bersama Psikolog S.Psi., M.Psi.",
      "Intervensi psikologis terarah & mendalam",
      "Asesmen klinis & pemetaan akar masalah",
      "Pendampingan etis & terikat kode etik HIMPSI",
      "Bukan diagnosa sembarangan"
    ],
    is_active: true,
    sort_order: 4
  }
];

export function formatRupiah(amount: number): string {
  if (amount === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(amount);
}

export async function getMemberOrders(): Promise<PackageOrder[]> {
  try {
    const supabase = getSupabaseClient() as any;
    if (!supabase) return [];
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return [];
    const { data, error } = await supabase
      .from("package_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    return error || !data ? [] : data as PackageOrder[];
  } catch {
    return [];
  }
}
export async function getActivePackages(): Promise<ConsultationPackage[]> {
  try {
    const supabase = getSupabasePublicClient();
    if (!supabase) return fallbackPackages;

    const { data, error } = await supabase
      .from("consultation_packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return fallbackPackages;
    return data.map((item: any) => ({
      ...item,
      features: Array.isArray(item.features)
        ? item.features
        : typeof item.features === "string"
        ? JSON.parse(item.features || "[]")
        : []
    }));
  } catch {
    return fallbackPackages;
  }
}

export function generateWhatsAppOrderUrl(
  pkg: ConsultationPackage,
  member?: { alias?: string; email?: string; orderId?: string } | null
): string {
  if (pkg.price === 0) {
    return "/member/daftar";
  }

  const baseNumber = "6285191020288";
  const userIdentifier = member?.alias ? ` (${member.alias} - ${member.email || "Member"})` : " (Pelanggan Baru)";
  const priceFormatted = formatRupiah(pkg.price);

  const text = [
    `Halo Admin QONSULIN.ID, saya ingin memesan paket berikut:`,
    ``,
    `*Nama Paket:* ${pkg.name}`,
    `*Kategori:* ${pkg.category === "membership" ? "Membership Surat Batin" : "Konsultasi 1-on-1"}`,
    `*Tarif:* ${priceFormatted}`,
    `*Pemesan:* ${userIdentifier}`,
    ...(member?.orderId ? [`*ID Pesanan:* #${member.orderId.slice(0, 8)}`] : []),
    ``,
    `Mohon informasi nomor rekening tujuan transfer dan langkah verifikasi pembayarannya. Terima kasih.`
  ].join("\n");

  return `https://wa.me/${baseNumber}?text=${encodeURIComponent(text)}`;
}


