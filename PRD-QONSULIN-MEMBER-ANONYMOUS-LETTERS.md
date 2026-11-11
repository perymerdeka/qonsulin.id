# PRD — Member, Surat Anonim, dan Paket Qonsulin

- **Status:** Approved & Final v1.3 — Rencana Eksekusi dan Tahap UI/UX Diperbarui
- **Tanggal:** 10 November 2026
- **Target rilis:** MVP beta setelah fungsi P0, UI/UX polish, dan Sprint 5 selesai
- **Produk:** Pengembangan Qonsulin.id existing; bukan aplikasi terpisah

## 1. Ringkasan

Qonsulin.id akan menambah empat modul terintegrasi:

1. Akun member, profil alias, dan avatar preset interaktif.
2. Tier membership, hak akses, paket konsultasi, dan harga.
3. Anonymous Letter Pool: menulis, moderasi, membaca, dan membalas surat anonim.
4. Integrasi dengan CMS existing, artikel, dan profil companions/psikolog.

Positioning: **A Safe Place to Write, Connect, and Heal.** Produk adalah ruang dukungan emosional terkurasi, bukan jejaring sosial, aplikasi kencan, terapi otomatis, atau layanan darurat.

## 2. Tujuan MVP

- Member 18+ mendaftar, masuk, memilih alias/avatar, dan memahami batas anonimitas.
- Member Free mengirim maksimal 3 surat pembuka per bulan kalender.
- Semua surat/balasan dimoderasi sebelum dapat dibaca member lain.
- Surat approved tampil anonim pada Kolam Surat; member lain memilih surat untuk dibalas.
- Member dapat melihat thread, report, block, dan menutup percakapan.
- Pengguna melihat Premium serta paket konsultasi dan mengajukan pembayaran manual melalui WhatsApp Admin.
- Admin dapat memoderasi, mengelola member/tier/paket/template, dan menangani permintaan dukungan.
- Artikel, CMS, dan companions existing tidak rusak.

## 3. Prinsip Produk

- Tidak ada like, follower, ranking, trending, leaderboard, atau DM bebas. Kolam Surat bukan feed sosial.
- Anonim bagi member lain, tetapi tidak anonim absolut bagi operator yang berwenang menangani safety/abuse.
- Jangan menjanjikan rahasia absolut, diagnosis, terapi, SLA klinis, atau respons darurat.
- Label respons wajib jelas: **Community Support**, **Volunteer Support**, **Professional Support**.
- MVP hanya mengaktifkan Community Support dan permintaan dukungan profesional sesuai kapasitas. Volunteer Support belum aktif.
- AI tidak membalas, mendiagnosis, atau memutuskan moderasi. MVP tidak memakai AI moderation.
- Fitur keselamatan, report, block, dan informasi krisis tidak boleh terkunci paywall.

## 4. Pengguna dan Peran

| Peran | Hak dan batas |
|---|---|
| Member | Kelola profil sendiri; tulis/baca surat yang berhak diakses; report/block. |
| Moderator | Tinjau queue/laporan yang ditugaskan, moderasi, dan audit tindakan. |
| Professional | Hanya akses permintaan profesional yang dirouting kepadanya setelah verifikasi kredensial. |
| Operator | Kelola katalog dan verifikasi Premium; tidak otomatis dapat membaca isi surat. |
| Admin | Kelola role/sistem; akses sensitif dibatasi dan diaudit. |

Role tidak boleh berasal dari nilai browser. RLS dan API server memakai deny-by-default serta least privilege.

## 5. Scope MVP

### Masuk

- Supabase Auth member: email/password, verifikasi email bila tersedia, reset password, logout.
- Profil: alias tervalidasi, avatar preset, consent, batas usia 18+, pengaturan dasar.
- Tier Free dan Premium; Free 3 surat pembuka/bulan; entitlement server-side.
- CRUD admin tier, paket konsultasi, template; katalog aktif tampil publik.
- Surat teks: editor, topik/mood, template, pratinjau, submit, status, feed, detail, balasan, inbox/outbox/thread.
- Moderasi wajib, report, block, close thread, crisis hold, audit log.
- Permintaan dukungan/screening awal ke Qonsulin; jalur konsultasi terpisah dan terhubung ke companions/paket.
- Pembayaran transfer + WhatsApp; status/verifikasi Premium manual dengan audit.
- Panel admin: member, tier, paket, template, moderasi, laporan, dukungan, payment review.
- Animasi CSS ringan kirim/buka surat, dapat dilewati, mematuhi prefers-reduced-motion.
- Hardening secret, endpoint upload, RLS, validasi, rate limit, QA mobile.

### Tidak masuk

- Payment gateway, auto-renewal, subscription/refund otomatis.
- Surat fisik, hadiah, alamat, fulfillment, tracking, One Letter One Hope.
- Volunteer Support, AI moderation/therapist, social login, aplikasi native, real-time chat, attachment member.
- Avatar builder kompleks, animasi 3D berat, dashboard mandiri psikolog, booking kalender.
- Pengguna di bawah 18 tahun.

## 6. Aturan Bisnis

### Member dan anonimitas

- Pengguna menyatakan usia minimal 18 tahun saat registrasi.
- Pool hanya memperlihatkan alias, avatar preset, topik, dan waktu yang dibulatkan.
- Jangan tampilkan email, nama legal, telepon, lokasi, IP, waktu presisi, atau jumlah balasan.
- Dilarang menyertakan identitas pribadi/pihak ketiga: nama lengkap, nomor telepon, email, alamat, handle sosial, atau petunjuk identitas. Pengingat tampil sebelum submit.
- Moderator boleh menghubungkan surat dengan akun hanya untuk tugas safety/abuse; akses perlu audit.

### Kolam Surat dan thread

- Surat pembuka dan balasan selalu pending_review; hanya approved tampil pada pool/thread tujuan.
- Surat berindikasi krisis tidak masuk pool. Surat ditahan untuk priority review dan pengguna melihat panduan bantuan darurat yang telah diverifikasi.
- Member memilih surat pada pool lalu menggunakan **Balas dengan Surat**. Tidak ada direct message di luar thread.
- Pengirim/penerima dapat report, block, dan close thread. Block menghentikan interaksi tanpa menghapus bukti moderasi.
- Rekomendasi kuota: balasan tidak mengurangi kuota surat pembuka. Batas balasan per surat harus diputuskan sebelum schema dibuat.

### Dukungan dan konsultasi

- Community Support adalah respons sesama member, bukan saran klinis.
- Volunteer Support nonaktif pada MVP.
- Professional Support hanya dari psikolog/tenaga profesional yang telah diverifikasi dan ditugaskan.
- Request dukungan Free adalah screening awal; tidak menjamin balasan profesional atau SLA klinis.
- CTA konsultasi mengarah ke katalog paket dan profil companions yang relevan.

### Tier dan pembayaran

- Free: 3 surat pembuka/bulan; safety/report/block tidak dibatasi paywall.
- Premium: harga kerja Rp19.000/bulan; benefit/kuota final harus disetujui founder sebelum implementasi.
- Pembayaran manual: instruksi transfer, konfirmasi WhatsApp, verifikasi admin, aktivasi tier manual, audit aktor/waktu/masa berlaku.
- WhatsApp bukan sumber kebenaran transaksi. Jangan kirim isi surat atau data klinis melalui WhatsApp.

## 7. Alur Pengguna

### Registrasi

1. Pengguna membuka CTA Member.
2. Membaca batas usia, anonimitas terbatas, privasi, dan non-darurat.
3. Daftar email/password, menyetujui ketentuan, verifikasi email jika aktif.
4. Memilih alias dan avatar preset.
5. Dashboard menunjukkan tier, sisa kuota, aturan pool, serta CTA dukungan/konsultasi.

### Kirim dan balas surat

1. Pilih Tulis Surat, topik/mood, dan template yang berhak dipakai.
2. Tulis isi; UI mengingatkan larangan identitas dan panduan komunitas.
3. Server memvalidasi sesi, kuota, entitlement, panjang, dan rate limit.
4. Submit menjadi pending_review.
5. Moderator approve, reject, request edit, hide, atau escalate.
6. Surat approved muncul pada Kolam Surat secara anonim.
7. Member lain memilih Balas dengan Surat; balasan juga menunggu moderasi.
8. Kedua pihak membaca thread privat anonim atau melakukan report/block/close.

### Dukungan dan upgrade

1. Member memilih Minta Dukungan Qonsulin atau CTA pendamping.
2. Form terpisah dari pool, menjelaskan batas layanan dan jam operasi.
3. Admin meroute ke layanan/paket yang tepat; professional hanya menangani request assigned.
4. Member membuka Premium, membaca benefit/masa aktif/harga, lalu mengikuti transfer + WhatsApp.
5. Operator memverifikasi dan mengaktifkan entitlement manual.

## 8. Kebutuhan Fungsional

### Member

- Sign up/in/out/reset password; profile sendiri; alias unik tervalidasi; avatar preset.
- Dashboard tier, sisa kuota, surat, thread, request dukungan, dan CTA upgrade.
- Request penghapusan akun mengikuti kebijakan retensi yang disepakati.

### Tier dan paket

- Admin CRUD tier: slug, harga, periode, kuota, template entitlement, benefit, status, urutan.
- Admin CRUD paket konsultasi: pendamping/role target, durasi, harga, benefit, status.
- Katalog publik hanya mengirim record aktif.
- Payment request: pending, verified, rejected, expired, cancelled; semua perubahan diaudit.

### Surat

- Surat teks saja; tanpa attachment/upload member.
- Status pemilik: draft, pending review, needs edit, approved, rejected, hidden, replied, closed.
- Template freemium awal 1-3 tema; template Premium tidak dapat dipakai tanpa entitlement.
- Animasi tidak boleh menghambat baca/kirim atau aksesibilitas.

### Moderasi

- Queue surat baru, laporan, priority safety, support request, dan payment review.
- Kategori: personal data, harassment, hate, sexual content, spam, crisis/self-harm signal, other.
- Keyword rule hanya memberi sinyal triage; bukan diagnosis/keputusan otomatis.
- Aksi: dismiss, request edit, redact, hide, remove, warn, suspend, block, escalate.
- Audit log mencatat aktor, waktu, alasan, target, hasil; jangan menyalin body surat ke log biasa.

## 9. Data dan Akses

### Entitas baru

- member_profiles: id ref auth.users, alias, avatar config, tier/status, consent/version, timestamps.
- membership_tiers: slug, harga, periode, kuota, template entitlement, benefit, active status.
- member_entitlements: user, tier, starts/ends, status, sumber aktivasi, operator audit.
- consultation_packages: pendamping/role target, durasi, harga, benefit, status.
- letter_templates: metadata, tier requirement, status, visual token.
- letter_threads: surat pembuka, peserta, status, topik; identitas privat.
- letters: thread, sender ID privat, teks, moderation status, label dukungan, timestamps.
- letter_reports: konten/thread, reporter, kategori, status, assigned moderator, tindakan.
- user_blocks: blocker/blocked, alasan opsional, status, timestamps.
- support_requests: pemilik, kebutuhan minimal, route, status, assigned professional bila berlaku.
- premium_orders: nominal, instruksi/reference, status, masa berlaku, audit operator.
- admin_audit_logs: aktor, aksi, target, waktu, alasan; hindari menyalin body surat.

### Prinsip schema

Foreign key, constraint status, indeks owner/status/timestamp, UTC, validasi panjang, transaksi atomik untuk kuota. Nama tabel/DDL final mengikuti review schema existing dan migration kompatibel.

### Matriks akses

- Member hanya profile sendiri serta surat/thread yang mengikutsertakannya.
- Pool memakai query server yang memproyeksikan hanya field approved dan anonim; jangan kirim raw sender ID ke browser.
- Moderator sesuai tugas; professional hanya request assigned; operator tanpa isi surat default.
- Public hanya membaca tier/package/template aktif tanpa field privat.
- Test RLS wajib: anon, member A, member B, blocked member, moderator, professional, operator, admin.

## 10. Non-Functional dan Keamanan

- Rotasi semua key Supabase yang pernah hardcoded/ter-commit. Hapus dari source tidak cukup; cabut key di dashboard Supabase.
- SUPABASE_SERVICE_ROLE_KEY hanya server-side; tidak pernah di bundle/client/log/docs/seed.
- Lindungi upload API dengan authz admin, MIME/ekstensi allowlist, batas ukuran, dan storage policy.
- Validasi allowlist server-side, body limit, error generik, rate limit login/send/reply/report, CSRF/origin protection.
- RLS deny-by-default; service-role bypass bukan pengganti policy.
- Jangan menaruh isi surat di URL, analytics, error telemetry, atau log aplikasi biasa.
- Ketentuan/privasi menjelaskan anonimitas terbatas, akses moderator, retensi, penghapusan, laporan, dan krisis.
- Mobile-first, keyboard accessible, kontras cukup, focus visible, status bukan warna saja, reduced motion.
- Staging terpisah, data sintetis untuk test, backup/restore dan incident owner sebelum beta.

## 11. Halaman dan Integrasi

| Area | Halaman/modul |
|---|---|
| Member | /member/daftar, /member/masuk, /member, /member/profil, /member/kotak-surat, /member/dukungan |
| Surat | /surat/tulis, /surat/pool, /surat/[id] |
| Harga | /harga atau bagian dinamis pada /layanan |
| Admin | Member, Tier, Paket, Template, Moderasi, Laporan, Dukungan, Verifikasi Premium pada /admin |

Header publik menambah entry Member/Surat tanpa menghilangkan CTA konsultasi existing. Setelah login, tampilkan alias/avatar serta dashboard/kotak surat/logout. Halaman member/thread tidak boleh diindeks. CMS artikel dan companions tidak ditulis ulang.

## 12. Acceptance Criteria P0

- Member dapat login dan hanya mengubah profil sendiri; browser tidak dapat mengubah tier/role.
- Free surat keempat dalam bulan kalender ditolak server-side. Aturan reset/timezone dan dampak surat rejected harus konsisten.
- Surat dan balasan tidak muncul sebelum moderator approve.
- Member A tidak dapat membaca/mengubah profile/surat/thread member B kecuali terlibat pada thread approved yang relevan.
- Surat flagged crisis tidak masuk pool; panduan aman muncul; aksi moderator tercatat.
- Report/block/close mencegah interaksi lanjut tanpa membocorkan identitas.
- Template berbayar/nonaktif tidak dapat dipakai tanpa entitlement.
- Premium hanya aktif setelah aksi operator berwenang dan memiliki audit.
- CTA pendamping menuju paket/request tepat; label professional hanya bagi personel terverifikasi.
- Upload menolak user anonim/non-admin dan file di luar kebijakan.
- Artikel, homepage, companions, admin existing, routing subdomain tetap lolos regression.

## 13. Sprint — Rencana Eksekusi Revisi

Prinsip pelaksanaan: setiap P0 diselesaikan sebagai *vertical slice*: logika server/database, UI minimum yang dapat dipakai, state loading/error/empty, kontrol akses, dan test alur inti. UI/UX polish lintas modul dilakukan setelah seluruh P0 Sprint 1-4 selesai agar pengalaman klien konsisten, tanpa menunda safety atau privacy.

| Sprint | Status | Fokus | Exit gate |
|---|---|---|---|
| S1 | Selesai secara fungsional | Auth member, alias/avatar, consent, CMS member, RLS dasar | Fondasi member berjalan di staging; visual masih UI minimum dan masuk fase polish. |
| S2 | Selesai secara fungsional | Tier, paket, entitlement, order manual, CTA WhatsApp | Alur paket berjalan di staging; visual masih UI minimum dan masuk fase polish. |
| S3 | Berjalan | Letter Pool P0: submit, moderation gate, feed approved, reply, thread privacy, report/block/close | Semua data surat private/approved terlindungi dan alur member lengkap di staging. |
| S4 | Berjalan | Operasi dan safety P0: admin moderation, payment review, crisis, escalation, audit, support request | Moderator dapat mengoperasikan queue dengan SOP, tanpa membocorkan data atau meloloskan surat crisis. |
| S4.5 | Terjadwal setelah S3-S4 | UI/UX polish terpadu dan kesiapan presentasi klien | Seluruh modul S1-S4 konsisten, mudah dipahami, responsif, accessible, dan siap UAT. |
| S5 | Terjadwal setelah S4.5 | QA, UAT, hardening, runbook, beta terbatas | Launch gate terpenuhi; tidak ada P0/P1 safety, privacy, payment, atau access-control terbuka. |

### Task List Aktual

#### S1-S2 — Fondasi Fungsional Selesai; Masuk Backlog Polish

- [x] Auth member, profil alias/avatar, consent, RLS profil, tier, paket, quota, dan order manual tersedia di staging.
- [x] CMS admin untuk paket/member/order dan aktivasi manual dasar tersedia.
- [ ] Polish UX Ruang Member: onboarding, copy consent, hierarchy dashboard, error/loading/empty state yang konsisten.
- [ ] Polish UX paket/order: harga, benefit, status pembayaran, CTA WhatsApp, dan state sukses/gagal yang mudah dipahami klien.

#### S3 — Letter Pool P0

- [x] Skema surat, thread, template, quota server-side, submit surat, moderation gate, pool approved, dan balasan dasar tersedia.
- [ ] Lengkapi inbox/outbox dan aturan thread privat untuk seluruh pihak yang terlibat.
- [ ] Implementasikan report, block, dan close thread beserta efeknya terhadap interaksi berikutnya.
- [ ] Uji RLS dan API/RPC untuk anon, member A, member B, moderator, dan service role.
- [ ] Tambahkan state UI minimum untuk pending, approved, rejected, crisis hold, closed, blocked, loading, error, dan empty state.

#### S4 — Operasi, Safety, dan Dukungan P0

- [x] Queue admin dasar untuk moderasi surat dan verifikasi order tersedia.
- [ ] Lengkapi crisis hold: panduan aman, rujukan darurat, pembatasan publikasi, dan aksi moderator sesuai SOP.
- [ ] Tambahkan audit trail untuk moderasi surat, report/block/close, dan aktivasi/reject order.
- [ ] Implementasikan intake "Kirim ke Konselor" lalu redirect WhatsApp Admin; jangan membangun chat realtime.
- [ ] Lengkapi admin management untuk member, template, moderation, laporan, dan request dukungan sesuai role.
- [ ] Jalankan regression pada CMS, artikel, companions, upload, admin login, dan navigasi existing.

#### S4.5 — UI/UX Polish Terpadu dan Client-Ready

- [ ] Tetapkan design direction, component rules, typography, spacing, color/status semantics, dan copy tone yang konsisten.
- [ ] Rapikan seluruh layar member: daftar, masuk, dashboard, profil, quota/tier, paket/order, pool, detail thread, tulis, dan balas surat.
- [ ] Rapikan seluruh layar admin: dashboard, moderation queue, review payment, data member, paket, template, dan audit state.
- [ ] Pastikan alur safety dan payment mudah dipahami tanpa menyamarkan risiko atau menjanjikan respons klinis/darurat.
- [ ] Selesaikan responsive mobile, keyboard navigation, form label/error, contrast, reduced motion, dan empty/loading/error state lintas modul.
- [ ] Lakukan walkthrough bersama klien/founder untuk memvalidasi pemahaman alur sebelum UAT formal.

#### Lintas Sprint — Monitoring dan Reporting Klien

- [x] Jadikan PRD dan checklist sprint ini sebagai satu-satunya sumber status teknis.
- [x] Siapkan template laporan klien yang membedakan pekerjaan selesai, sedang dikerjakan, berikutnya, risiko, dan keputusan yang dibutuhkan.
- [ ] Tetapkan owner laporan serta ritme pengiriman bersama klien: mingguan, akhir milestone, dan saat ada blocker/risiko material.
- [ ] Berikan demo staging hanya pada milestone yang telah lulus pengecekan internal; jangan menyebut fitur sebagai siap produksi sebelum Sprint 5 launch gate lulus.
- [ ] Catat keputusan/approval klien untuk SOP krisis, routing konselor, copy safety, arah UI/UX, dan peserta UAT.
- [ ] Setiap laporan menyertakan bukti yang relevan: link staging, screenshot/video singkat, daftar alur yang didemo, hasil test ringkas, dan risiko terbuka.
- [ ] Jangan pernah menaruh service-role key, password, URL database, data member nyata, atau isi surat anonim pada laporan klien.

#### S5 — QA, UAT, Hardening, dan Beta

- [ ] E2E: daftar -> profil -> submit -> moderation -> pool -> reply -> moderation -> thread -> report/block/close.
- [ ] Uji RLS/access matrix, abuse, entitlement/quota, payment state, crisis isolation, upload policy, dan regression existing.
- [ ] UAT Founder, moderator, dan professional; perbaiki seluruh temuan P0/P1.
- [ ] Finalisasi runbook: moderation, crisis, payment, backup/restore, incident owner, pause/revert, dan handover.
- [ ] Aktifkan monitoring, feedback channel, beta cohort/cap volume, serta go/no-go checklist.

## 14. Testing dan QA

- Unit/logic: entitlement, reset kuota, validasi status, mapping role.
- API: unauthenticated, member owner/non-owner, moderator, operator, professional.
- RLS: anon, user A/B, blocked user, moderator, operator, professional, admin; SELECT/INSERT/UPDATE/DELETE.
- Abuse: signup/send/report berulang, body oversized, markup berbahaya, spoof role/tier, UUID enumeration, direct REST.
- E2E: signup → profile → submit → moderation → pool → reply → moderation → thread → close/report/block.
- Crisis: flagged letter tidak public; copy/rujukan disetujui; log tidak memuat isi surat; SOP dapat dijalankan.
- Payment: pending/verified/rejected/expired, bukti duplikat, aktivasi ganda, audit operator.
- Regression: public pages, artikel, companions, admin login, upload, host rewrite, mobile layout.
- Accessibility: keyboard, labels, contrast, reduced motion, form errors.
- Operational drill: queue overload, moderator absen, eskalasi laporan, backup/restore.

## 15. Launch Gate

Beta eksternal hanya dibuka bila:

1. Terms/privacy, usia, retensi/penghapusan, disclaimer, jam operasi, dan SOP crisis disetujui founder.
2. Hotline/rujukan wilayah diverifikasi pihak kompeten; tidak ada nomor ditebak.
3. Moderator bernama, roster, owner eskalasi, dan kapasitas queue tersedia.
4. Professional diverifikasi; Volunteer Support nonaktif.
5. Service-role lama dicabut, endpoint upload terlindungi, dan secret server-only valid.
6. RLS matrix lulus; tidak ada akses silang member atau payload pool berisi identitas.
7. Harga, entitlement, payment verification, masa aktif, refund/cancel terms disetujui.
8. UAT internal dan mobile lulus; tidak ada P0/P1 safety/privacy/payment terbuka.

Jika moderator atau SOP belum siap, jangan buka pool/balasan publik. Rilis hanya bagian yang aman.

## 16. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Volume melebihi moderasi | beta invite-only, cap submit, queue/roster, tutup submit saat backlog penuh. |
| Kebocoran identitas/isi surat | payload minimal, RLS, audit, abuse test, rotasi secret, no content logs. |
| Surat krisis dianggap layanan darurat | disclaimer, rujukan terverifikasi, crisis hold, SOP manusia, tanpa janji respons segera. |
| Identitas disisipkan user | warning, pre-moderation, redaction/hide/report. |
| 25 hari terlalu ketat | scope lock, keputusan hari H1-2, potong polish bukan guardrail. |
| Manual payment sengketa | status/audit operator, masa aktif, rekonsiliasi dan policy jelas. |
| CMS single-role existing | review/migrasi role sebelum data sensitif; operator tidak otomatis baca surat. |

## 17. Keputusan Resmi Founder Qonsulin & Arahan Arsitektur Final

Berdasarkan tinjauan dan keputusan resmi founder Qonsulin, seluruh parameter yang sebelumnya terbuka telah disepakati secara definitif:

1. **Alur Balas Surat Anonim: Sistem Kolam Surat (Anonymous Letter Pool)**
   - Menggunakan sistem kolam terbuka (*public letter pool*), bukan automatic matching.
   - Alasan Founder: Memberikan kebebasan dan kenyamanan bagi pengguna untuk memilih surat yang paling menyentuh empati dan ketertarikan mereka.

2. **Keterlibatan Konselor di Surat: Dipisahkan Secara Tegas**
   - Fitur "Kirim ke Konselor" dibedakan dari balasan antarpengguna komunitas.
   - Member Free mendapatkan akses terbatas untuk permintaan dukungan / screening awal.
   - Kebutuhan tanggapan profesional yang mendalam wajib diarahkan ke paket konsultasi berbayar.
   - Respons profesional **wajib diberikan oleh psikolog atau tenaga profesional yang berwenang, BUKAN oleh AI bot**.
   - Alur teknis: Tombol "Kirim ke Konselor" menghasilkan ringkasan intake batin dan langsung mengarahkan ke nomor WhatsApp Admin resmi Qonsulin (+6285191020288) untuk jadwal sesi psikolog, **tanpa membangun modul live-chat WebSocket baru di aplikasi**.

3. **Pembayaran Paket & Tier Premium: WhatsApp Admin + Transfer Manual**
   - Pembayaran diproses melalui transfer bank manual dan konfirmasi WhatsApp Admin.
   - **Belum perlu integrasi Midtrans / payment gateway otomatis** untuk tahap MVP guna menghemat biaya operasional, mempermudah validasi *willingness-to-pay*, dan mencegah *overhead* pemeliharaan.

4. **Batas Kuota Surat Member Free**
   - Member Free: Kuota 3 surat pembuka per bulan.
   - Member Premium: Kuota surat tak terbatas (*unlimited*) atau fleksibel sesuai masa aktif paket (Rp19.000 / 30 hari).
   - Menulis balasan surat tidak mengurangi kuota surat pembuka, namun tetap wajib melewati moderasi admin.

5. **3 Catatan Kritis Founder (Safety & Clinical Guardrails)**:
   - **Kolam Surat Bukan Media Sosial:** Wajib moderasi *pre-publish*, larangan mencantumkan identitas pribadi (*no doxxing*), fitur pelaporan konten, dan prosedur deteksi krisis bunuh diri/self-harm dengan peringatan darurat hotline 119/IGD.
   - **Labeling Sumber Respons Wajib Jelas:**
     - 💌 `Community Support`: balasan empati dari sesama pengguna/kawan cerita.
     - 🤝 `Volunteer Support`: dukungan dari relawan terlatih.
     - 🧠 `Professional Support`: respons profesional dari psikolog resmi berwenang.
   - **Disiplin 7 Prioritas Utama MVP:**
     1. Registrasi & Login Member
     2. Ruang Surat Anonim
     3. Kirim & Balas Surat
     4. Moderasi oleh Admin
     5. Kirim ke Konselor (Eskalasi WA Intake)
     6. Paket Free & Premium
     7. Konfirmasi Pembayaran WhatsApp

6. **Visual & Animasi Amplop (Ref: chithi.me)**:
   - Efek visual melipat surat dan membuka amplop 3D dibangun **murni menggunakan CSS 3D Transforms** (`perspective`, `transform: rotateX(...)`, `transition`).
   - Dilarang menggunakan Three.js, Canvas, atau WebGL berat demi menjaga performa di perangkat mobile/low-end dan mendukung `prefers-reduced-motion`.

## 18. Panduan Teknis & Arsitektur Implementasi untuk AI / Developer

Dokumen ini mengikat setiap agen AI dan pengembang agar tidak membuat asumsi berlebihan (*anti-drift rules*):

1. **Sprint 3 — Skema Surat & Kolam Feed:**
   - Tabel `public.letters` wajib memiliki kolom:
     `reply_type text not null default 'community' check (reply_type in ('community', 'volunteer', 'professional'))`
   - Komponen visual amplop wajib berupa komponen React ringan berbasis CSS (contoh: `LetterEnvelopeView.tsx`), tanpa menambahkan package npm grafis 3D baru.
   - Kuota surat pembuka Free dipotong hanya saat surat pembuka pertama kali di-submit (bukan saat membalas surat orang lain).

2. **Sprint 4 — Moderasi, Protokol Krisis & Eskalasi Konselor:**
   - Deteksi kata kunci krisis (misal: "bunuh diri", "akhiri hidup", "self-harm") bekerja sebagai interceptor: menahan status surat menjadi `crisis_hold` dan menampilkan modal panduan darurat medis (Hotline 119, Sejiwa, IGD terdekat).
   - Tombol "Kirim ke Konselor" di halaman surat membuka form modal intake singkat lalu me-redirect ke link WhatsApp Admin:
     `https://wa.me/6285191020288?text=Halo%20Admin%20QONSULIN.ID...`
   - Jangan pernah membangun antarmuka instant-messaging / socket chat sendiri di webapp.

3. **Status Pelaksanaan Sprint:**
   - **Sprint 1-2 (Selesai secara fungsional):** Fondasi member, profil, paket, tier, dan order tersedia; seluruh layar tersebut tetap masuk cakupan UI/UX polish S4.5.
   - **Sprint 3 (Berjalan):** Fitur dasar Letter Pool tersedia; privacy thread, report/block/close, state UI lengkap, dan test RLS/API masih perlu dituntaskan.
   - **Sprint 4 (Berjalan):** Queue admin dasar tersedia; crisis guardrail, audit, pelaporan, eskalasi konselor, support request, dan regression modul existing masih perlu diselesaikan.
   - **Sprint 4.5 (Terjadwal):** UI/UX polish lintas modul setelah seluruh P0 Sprint 1-4 selesai dan sebelum QA/UAT formal.
   - **Sprint 5 (Terjadwal):** QA, UAT, hardening, beta terbatas, runbook, monitoring, dan handover.

## 19. Definition of Done

- Semua acceptance criteria P0 lulus pada staging.
- Typecheck, lint, build, dan test tidak di-bypass; production diuji pada Node versi yang didukung repo.
- Migration terdokumentasi, diuji staging dengan backup/rollback plan.
- RLS dan abuse test lulus.
- SOP/copy moderator, support, krisis, privacy, payment disetujui dan dipahami operator.
- Monitoring, feedback channel, owner insiden, beta cohort, cap volume, dan kriteria pause/revert siap.
- Tidak ada P0/P1 terkait safety, privasi, pembayaran, atau akses data.

## Lampiran A — Prioritas Backlog

### P0 (MVP)

- Auth member dan profil alias/avatar preset.
- Free quota dan entitlement server-side.
- Submit, review wajib, pool approved, reply termoderasi.
- Thread privat, report, block, close, admin audit.
- Crisis hold, copy/rujukan terverifikasi, owner SOP.
- Admin moderasi dan payment/tier manual minimum.
- RLS, secret rotation, upload protection, regression existing.

### P1 (MVP bila waktu cukup)

- Template premium beragam, animasi amplop ringan, request dukungan berstruktur, dashboard metrik dasar, notifikasi email status.

### P2 (Post-MVP)

- Volunteer Support, gateway, physical letter/gift, avatar builder kaya, AI triage terbatas setelah privacy/safety review, real-time, corporate partnership.

## Lampiran B — Glossary

- **Anonymous Letter Pool:** kumpulan surat yang telah lolos moderasi dan identitas akun disembunyikan dari member.
- **Thread:** satu surat awal beserta balasan yang terhubung secara privat.
- **Alias:** nama tampilan yang tidak sama dengan email/identitas akun.
- **Moderation:** pemeriksaan dan tindakan atas konten/akun oleh staf berwenang.
- **Professional Support:** dukungan yang hanya diberikan tenaga dengan kewenangan dan kredensial terverifikasi.
- **Entitlement:** hak fitur/kuota yang diberikan berdasarkan tier dan masa aktif.
- **Beta:** peluncuran terbatas dengan volume, cohort, dan monitoring yang terkendali.
