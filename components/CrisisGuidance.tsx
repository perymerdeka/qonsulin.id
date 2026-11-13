"use client";

import { useEffect, useRef } from "react";
import { ShieldAlert, X } from "lucide-react";

export function CrisisGuidance({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    dialog.showModal();
    return () => { dialog.close(); };
  }, [open]);

  return (
    <dialog ref={dialogRef} className="member-compose-dialog sprint4-dialog" aria-labelledby="crisis-guidance-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <button type="button" className="member-thread-close" aria-label="Tutup panduan" onClick={onClose}><X size={19} /></button>
      <ShieldAlert size={28} />
      <h2 id="crisis-guidance-title">Keselamatanmu lebih penting</h2>
      <p>Suratmu tersimpan untuk peninjauan khusus dan belum dipublikasikan. Penandaan otomatis ini bukan diagnosis.</p>
      <p>Qonsulin bukan layanan darurat. Jangan menunggu balasan surat atau WhatsApp admin jika kamu sedang dalam bahaya.</p>
      <ul>
        <li>Jika ada bahaya langsung atau cedera, segera cari pertolongan medis di IGD terdekat.</li>
        <li>Hubungi orang yang kamu percaya dan mintalah ditemani di tempat yang aman.</li>
        <li>Untuk dukungan psikologis awal, gunakan kanal resmi Hotline 119 atau Sejiwa sesuai informasi kesehatan terbaru.</li>
      </ul>
      <button type="button" className="btn btn-primary" onClick={onClose}>Saya mengerti</button>
    </dialog>
  );
}
