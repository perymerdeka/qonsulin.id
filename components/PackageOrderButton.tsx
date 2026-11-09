"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentMemberProfile } from "@/lib/member-auth";
import { generateWhatsAppOrderUrl, type ConsultationPackage } from "@/lib/packages";

type Props = {
  pkg: ConsultationPackage;
  premium?: boolean;
};

export function PackageOrderButton({ pkg, premium = false }: Props) {
  const [message, setMessage] = useState("");
  const [orderUrl, setOrderUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function startOrder() {
    setMessage("");
    setLoading(true);

    try {
      const supabase = getSupabaseClient() as any;
      if (!supabase) {
        setMessage("Koneksi database belum tersedia. Coba lagi.");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!supabase || !user) {
        setMessage("Masuk ke akun member terlebih dahulu agar pesanan dan status verifikasinya tercatat.");
        return;
      }

      const [{ data: result, error }, profile] = await Promise.all([
        supabase.rpc("create_package_order", { p_package_code: pkg.code }),
        getCurrentMemberProfile()
      ]);
      if (error || !result?.ok) {
        setMessage(error?.message || result?.message || "Pesanan belum dapat dibuat. Coba lagi.");
        return;
      }

      const url = generateWhatsAppOrderUrl(pkg, {
        alias: profile?.alias,
        email: user.email,
        orderId: result.order_id
      });
      setOrderUrl(url);
      setMessage(`Pesanan #${String(result.order_id).slice(0, 8)} tercatat. Selesaikan transfer dan kirim bukti lewat WhatsApp; statusnya menunggu verifikasi admin.`);
    } catch {
      setMessage("Pesanan belum dapat dibuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {orderUrl ? (
        <a href={orderUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          <MessageCircle size={16} /> Lanjutkan Konfirmasi WhatsApp
        </a>
      ) : <button
        type="button"
        onClick={startOrder}
        disabled={loading}
        className={`btn ${premium ? "btn-primary" : "btn-soft"}`}
        style={{ width: "100%", justifyContent: "center", display: "inline-flex", gap: "0.4rem" }}
      >
        <MessageCircle size={16} /> {loading ? "Membuat Pesanan..." : "Pesan & Konfirmasi via WhatsApp"}
      </button>}
      {message && <p style={{ margin: "0.7rem 0 0", color: "var(--color-muted)", fontSize: "0.76rem", lineHeight: 1.45 }}>{message}</p>}
    </div>
  );
}
