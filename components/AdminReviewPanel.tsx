"use client";

import { useEffect, useState } from "react";
import { formatRupiah, type PackageOrder } from "@/lib/packages";
import type { LetterItem } from "@/lib/letters";
import type { MemberProfile } from "@/lib/member";
import { AdminPagination } from "@/components/AdminPagination";

const letterLabels: Record<string, string> = {
  pending: "Menunggu moderasi", approved: "Disetujui", rejected: "Ditolak", crisis_hold: "Perlu penanganan khusus"
};
const orderLabels: Record<string, string> = {
  pending: "Menunggu verifikasi transfer", active: "Aktif", rejected: "Ditolak", expired: "Berakhir"
};

export function AdminReviewPanel({ section, orders, letters, members, onRefresh }: {
  section: "orders" | "letters";
  orders: PackageOrder[];
  letters: LetterItem[];
  members: MemberProfile[];
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const items = section === "orders" ? orders : letters;
  const filteredItems = filter === "all" ? items : items.filter((item) => ("moderation_status" in item ? item.moderation_status : item.status) === filter);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visible = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [section, filter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function review(id: string, action: string) {
    const prompt = action === "activate"
      ? "Pastikan transfer sudah diterima. Verifikasi pembayaran dan aktifkan pesanan ini?"
      : action === "approve" ? "Surat sudah ditinjau dan aman ditampilkan?" : "Tolak item ini?";
    if (!window.confirm(prompt)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: section === "orders" ? "order" : "letter", id, action })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Review gagal disimpan.");
      setMessage(result.message);
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>{section === "orders" ? "Pesanan Paket & Verifikasi Pembayaran" : "Moderasi Surat Anonim"}</h1>
          <p>{section === "orders" ? "Pesanan tercatat sebelum pengguna diarahkan ke WhatsApp. Aktivasi hanya setelah transfer diverifikasi manual." : "Surat baru dan balasan menunggu persetujuan admin sebelum tampil di Kolam Surat."}</p>
        </div>
        <button className="btn btn-white" type="button" disabled={busy} onClick={() => void onRefresh()}>Muat Ulang</button>
      </div>
      {message && <p role="status" className="admin-alert">{message}</p>}
      <div className="admin-toolbar">
        <select aria-label="Filter review" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">Semua status</option>
          {Object.entries(section === "orders" ? orderLabels : letterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="review-list">
        {visible.length === 0 && <div className="admin-card">Belum ada data pada status ini.</div>}
        {visible.map((item) => {
          if ("moderation_status" in item) {
            const letter = item as LetterItem;
            const author = members.find((member) => member.id === letter.sender_id);
            const reviewable = letter.moderation_status === "pending" || letter.moderation_status === "crisis_hold" || letter.moderation_status === "approved";
            return (
              <article className="admin-card review-card" key={letter.id}>
                <div className="review-card-main">
                  <span className="pill muted">{letterLabels[letter.moderation_status]}</span>
                  <div>
                    <h3>{letter.title || (letter.is_opening ? "Surat tanpa judul" : "Balasan surat")}</h3>
                    <p className="review-meta">{author?.alias || "Member"} - {new Date(letter.created_at).toLocaleString("id-ID")} - {letter.is_opening ? "Surat pembuka" : "Balasan"}</p>
                  </div>
                </div>
                <details className="review-content">
                  <summary>Baca isi surat</summary>
                  <p>{letter.content}</p>
                </details>
                {letter.moderation_status === "crisis_hold" && <p className="review-crisis">Surat ditahan untuk penanganan khusus. Jangan publikasikan sebelum pemeriksaan dan prosedur keselamatan Qonsulin.</p>}
                {reviewable && <div className="review-actions">
                  {letter.moderation_status === "pending" && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void review(letter.id, "approve")}>Setujui Surat</button>}
                  <button type="button" className="btn btn-white" disabled={busy} onClick={() => void review(letter.id, "reject")}>{letter.moderation_status === "approved" ? "Tarik dari Kolam" : "Tolak Surat"}</button>
                </div>}
              </article>
            );
          }
          const order = item as PackageOrder;
          return (
            <article className="admin-card review-card" key={order.id}>
              <div className="review-card-main">
                <span className="pill muted">{orderLabels[order.status]}</span>
                <div>
                  <h3>{order.package_name} - {formatRupiah(Number(order.amount))}</h3>
                  <p className="review-meta">{order.buyer_name || "Member"} - Pesanan #{order.id.slice(0, 8)} - Dibuat {new Date(order.created_at).toLocaleString("id-ID")}{order.expires_at ? ` - Aktif sampai ${new Date(order.expires_at).toLocaleDateString("id-ID")}` : ""}</p>
                </div>
              </div>
              {order.status === "pending" && <div className="review-actions">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void review(order.id, "activate")}>Verifikasi & Aktifkan</button>
                <button type="button" className="btn btn-white" disabled={busy} onClick={() => void review(order.id, "reject")}>Tolak Pesanan</button>
              </div>}
            </article>
          );
        })}
      </div>
      <AdminPagination page={page} totalItems={filteredItems.length} pageSize={pageSize} onChange={setPage} />
    </>
  );
}
