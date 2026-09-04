# Error Log

## 2026-07-17 - Next Dev Manifest 500 After Build

- context: Saat memverifikasi homepage di `http://localhost:3003/` setelah menjalankan `pnpm run build` sementara `next dev` masih hidup.
- symptom: Homepage sempat mengembalikan `500` dan log menunjukkan `Could not find the module ... segment-explorer-node.js#SegmentViewNode in the React Client Manifest`.
- root cause: `.next` manifest dev stale karena build production menulis ulang output saat dev server masih berjalan.
- fix: Hentikan dev server lama, jalankan ulang `pnpm exec next dev -p 3003`.
- smoke test: `node fetch` untuk `/` dan `/qonsulin-culture-heart.jpg` mengembalikan `200`; Playwright desktop/mobile menunjukkan section culture render, foto loaded, tidak ada console error, dan tidak ada horizontal overflow.
- prevention note: Jangan jalankan `pnpm run build` saat `next dev` sedang dipakai untuk preview; restart dev server setelah build.

## 2026-07-15 - Reported Browser Resource 500

- context: Setelah perubahan landing/about page, browser dilaporkan menampilkan `Failed to load resource: the server responded with a status of 500`.
- symptom: User melihat resource gagal dimuat dengan status `500`.
- root cause: Tidak tereproduksi pada source lokal terbaru. Dev server baru mengembalikan `200` untuk `/`, `/tentang-kami`, `/layanan`, `/artikel`, `/faq`, `/kontak`, `/asesmen`, `/mahasiswa`, `/kegiatan`, `/galeri`, `/streaming`, `/admin`, `/favicon.ico`, dan `/sari-dewi-founder.jpg`.
- fix: Restart dev server, verifikasi asset publik, lalu jalankan smoke test HTTP dan browser. Tidak ada patch khusus 500 karena route lokal tidak error.
- smoke test: `pnpm run typecheck`, `pnpm run build`, `node fetch` route smoke, Playwright desktop check untuk `.culture-section` dan `.about-founder-card` tanpa console error atau response 4xx/5xx.
- prevention note: Jalankan route smoke setelah perubahan UI/asset dan restart dev server setelah asset baru masuk `public`.
