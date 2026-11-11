# Laporan Perkembangan Klien — Qonsulin Member & Surat Anonim

- **Produk:** Qonsulin.id — Member, Surat Anonim, dan Paket
- **Environment pelaporan:** Staging
- **Sumber status teknis:** `PRD-QONSULIN-MEMBER-ANONYMOUS-LETTERS.md`
- **Aturan:** laporan ini memakai bahasa outcome; checklist teknis tetap dikelola di PRD.

## Cara Menggunakan

- Kirim laporan ini setiap minggu, pada akhir milestone, atau segera saat ada risiko/blocker material.
- Ubah hanya bagian **Snapshot Saat Ini**, **Perubahan Sejak Laporan Terakhir**, **Berikutnya**, **Risiko/Keputusan**, dan **Bukti Demo**.
- Status `Selesai` berarti tersedia di staging dan sudah diperiksa internal; status tersebut tidak sama dengan siap produksi sebelum Sprint 5 launch gate lulus.
- Jangan masukkan password, API key, database URL, data akun nyata, atau isi surat anonim dalam laporan.

## Status Legend

| Status | Arti untuk klien |
|---|---|
| Selesai di staging | Fitur tersedia untuk demo dan sudah melewati pengecekan internal yang relevan. |
| Sedang dikerjakan | Fitur aktif dibangun atau diuji; belum menjadi komitmen siap rilis. |
| Berikutnya | Prioritas setelah pekerjaan aktif memenuhi exit gate. |
| Butuh keputusan | Input/approval klien diperlukan agar arah produk atau operasi tidak salah. |
| Risiko | Hal yang dapat memengaruhi ruang lingkup, waktu, keamanan, atau kesiapan beta. |

## Snapshot Saat Ini — 10 November 2026

| Milestone | Status | Ringkasan yang dibagikan ke klien |
|---|---|---|
| Staging dan fondasi member | Selesai di staging | Environment staging, akun member, profil alias/avatar, tier, paket, dan order manual telah tersedia untuk pengembangan lanjutan. |
| Letter Pool dasar | Sedang dikerjakan | Menulis surat, moderasi awal, Kolam Surat, balasan, template, dan kuota sudah memiliki fondasi; privacy thread, report/block/close, dan pengujian akses masih dilengkapi. |
| Safety dan operasi admin | Sedang dikerjakan | Queue moderasi dan verifikasi order tersedia; alur krisis, audit, laporan, intake konselor, serta SOP operasional masih diselesaikan. |
| UI/UX client-ready | Berikutnya | Dilakukan setelah seluruh P0 Sprint 1-4 selesai agar seluruh halaman member dan admin konsisten dan mudah dipahami. |
| QA, UAT, dan beta | Berikutnya | Dilakukan setelah UI/UX polish; mencakup test keamanan, UAT, runbook, monitoring, dan beta terbatas. |

## Perubahan Sejak Laporan Terakhir

- **Selesai:** Isi dengan fitur yang sudah tersedia di staging dan bukti demo singkatnya.
- **Sedang dikerjakan:** Isi dengan satu sampai tiga alur aktif, bukan daftar tugas teknis mentah.
- **Tidak berubah:** Catat jika sebuah milestone tertahan dan alasan yang dapat dipahami klien.

## Berikutnya

1. Menyelesaikan P0 Letter Pool: privacy thread, report, block, close, dan test akses.
2. Menyelesaikan P0 operasi/safety: crisis hold, audit, eskalasi konselor, dan support request.
3. Menjalankan fase UI/UX polish lintas modul sebelum UAT formal.

## Risiko dan Keputusan yang Dibutuhkan

| Item | Status | Dampak | Keputusan/aksi yang dibutuhkan |
|---|---|---|---|
| SOP krisis dan jalur eskalasi | Butuh keputusan | Menentukan respons moderator untuk surat yang ditahan demi keselamatan. | Setujui owner, jam layanan, kontak rujukan, dan copy darurat. |
| Arah visual UI/UX | Berikutnya | Menentukan tampilan yang akan dipresentasikan ke pengguna/klien saat polish. | Setujui referensi visual dan prioritas layar. |
| Peserta UAT | Berikutnya | Menentukan validitas pengujian sebelum beta. | Tetapkan Founder, moderator, dan perwakilan professional untuk UAT. |

## Bukti Demo

- **Link staging:** Tambahkan URL staging yang disetujui untuk dibagikan.
- **Alur didemo:** Cantumkan skenario spesifik, misalnya `member daftar -> kirim surat -> moderator approve -> surat muncul di pool`.
- **Bukti:** Tautkan screenshot/video singkat yang tidak berisi data pribadi atau isi surat nyata.
- **Hasil pengecekan:** Ringkas test yang relevan, misalnya akses member A/B, moderation gate, atau status pembayaran.

## Format Pesan Singkat untuk Klien

> Periode: [tanggal awal] - [tanggal akhir]
>
> Selesai di staging: [outcome 1], [outcome 2].
>
> Sedang dikerjakan: [outcome aktif].
>
> Berikutnya: [prioritas berikutnya].
>
> Butuh keputusan/risiko: [item atau "Tidak ada"].
>
> Bukti demo: [link staging / video / screenshot aman].
