import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

async function loadEnv() {
  const source = await readFile(".env", "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

await loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Supabase service credentials are not configured.");

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const authors = [
  { email: "demo.avatar.senja@staging.qonsulin.id", alias: "Laras Senja", avatar: { mood: "relieved", glasses: false, bg: "sunset" } },
  { email: "demo.avatar.hening@staging.qonsulin.id", alias: "Raka Hening", avatar: { mood: "calm", glasses: true, bg: "sage" } },
  { email: "demo.avatar.malam@staging.qonsulin.id", alias: "Nara Malam", avatar: { mood: "thoughtful", glasses: false, bg: "lavender" } }
];

const { data: savedProfiles, error: profilesError } = await admin
  .from("member_profiles")
  .select("id, alias")
  .in("alias", authors.map((author) => author.alias));
if (profilesError) throw profilesError;

const profileByAlias = new Map((savedProfiles || []).map((profile) => [profile.alias, profile.id]));
for (const author of authors) {
  let id = profileByAlias.get(author.alias);
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: author.email,
      password: "AvatarDemo2026!",
      email_confirm: true,
      user_metadata: { alias: author.alias, avatar_config: author.avatar }
    });
    if (error || !data.user) throw error || new Error(`Could not create ${author.alias}.`);
    id = data.user.id;
  }

  const { error } = await admin
    .from("member_profiles")
    .update({ alias: author.alias, avatar_config: author.avatar, bio: "Akun dummy untuk memeriksa variasi avatar dan balasan surat." })
    .eq("id", id);
  if (error) throw error;
  author.id = id;
}

async function findMember(alias) {
  const { data, error } = await admin.from("member_profiles").select("id").eq("alias", alias).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function ensureThread({ authorId, topic, status = "open", letters }) {
  const { data: existing, error: existingError } = await admin
    .from("letter_threads")
    .select("id")
    .eq("topic", topic)
    .limit(1);
  if (existingError) throw existingError;
  if (existing?.[0]?.id) return { id: existing[0].id, created: false };

  const { data: thread, error: threadError } = await admin
    .from("letter_threads")
    .insert({ author_id: authorId, topic, status, delivery_mode: "public" })
    .select("id")
    .single();
  if (threadError || !thread) throw threadError || new Error(`Could not create ${topic}.`);

  const { error: lettersError } = await admin.from("letters").insert(
    letters.map((letter) => ({ thread_id: thread.id, ...letter }))
  );
  if (lettersError) throw lettersError;
  return { id: thread.id, created: true };
}

const [laras, raka, nara] = authors;
const created = [];
created.push(await ensureThread({
  authorId: laras.id,
  topic: "Demo Avatar: Ragam Kawan Cerita",
  letters: [
    { sender_id: laras.id, is_opening: true, reply_type: "community", template_code: "warm_pastel", title: "Menemukan jeda di tengah hari", content: "Aku sedang mencoba berhenti sejenak di tengah hari yang ramai. Menuliskan ini membuatku ingat bahwa pelan-pelan juga tetap berarti maju.", moderation_status: "approved" },
    { sender_id: raka.id, is_opening: false, reply_type: "community", template_code: "vintage_parchment", content: "Terima kasih sudah menuliskan ceritamu. Semoga jeda kecil hari ini bisa menjadi ruang yang cukup untuk bernapas dan mendengarkan dirimu sendiri.", moderation_status: "approved" },
    { sender_id: nara.id, is_opening: false, reply_type: "volunteer", template_code: "night_sky", content: "Aku ikut menemani dari kejauhan. Tidak semua hal perlu selesai sekarang; satu langkah yang lembut tetap merupakan bentuk kepedulian pada diri sendiri.", moderation_status: "approved" }
  ]
}));
created.push(await ensureThread({
  authorId: raka.id,
  topic: "Demo Avatar: Membuat Ruang untuk Bernapas",
  letters: [
    { sender_id: raka.id, is_opening: true, reply_type: "community", template_code: "vintage_parchment", title: "Tidak harus selesai hari ini", content: "Hari ini aku belajar bahwa daftar tugas boleh menunggu. Yang lebih penting adalah mengizinkan diri untuk berhenti sejenak tanpa merasa bersalah.", moderation_status: "approved" },
    { sender_id: laras.id, is_opening: false, reply_type: "community", template_code: "warm_pastel", content: "Aku setuju. Kita boleh merawat tenaga sebelum kembali melanjutkan hal-hal yang penting. Semoga malam ini terasa lebih lapang untukmu.", moderation_status: "approved" }
  ]
}));
created.push(await ensureThread({
  authorId: nara.id,
  topic: "Demo Avatar: Menata Hari Pelan-Pelan",
  letters: [
    { sender_id: nara.id, is_opening: true, reply_type: "community", template_code: "night_sky", title: "Satu langkah kecil", content: "Aku ingin mencoba memulai lagi dari satu hal sederhana: minum air, merapikan meja, lalu memberi ruang untuk tidak selalu kuat.", moderation_status: "approved" },
    { sender_id: raka.id, is_opening: false, reply_type: "community", template_code: "vintage_parchment", content: "Langkah kecil itu sudah cukup berarti. Terima kasih karena memilih bersikap lembut pada dirimu di hari yang tidak mudah ini.", moderation_status: "approved" }
  ]
}));

const currentMemberId = await findMember("Akun Premiumku");
if (currentMemberId) {
  created.push(await ensureThread({
    authorId: currentMemberId,
    topic: "Demo Dashboard: Surat Saya dan Inbox",
    letters: [
      { sender_id: currentMemberId, is_opening: true, reply_type: "community", template_code: "vintage_parchment", title: "Cerita untuk menguji tampilan inbox", content: "Ini surat dummy untuk memeriksa tab Surat Saya dan Inbox. Surat ini memiliki beberapa balasan dari kawan cerita dengan avatar yang berbeda.", moderation_status: "approved" },
      { sender_id: laras.id, is_opening: false, reply_type: "community", template_code: "warm_pastel", content: "Terima kasih sudah membuka ruang cerita. Semoga kamu dapat menemukan satu hal kecil yang membuat harimu sedikit lebih ringan.", moderation_status: "approved" },
      { sender_id: nara.id, is_opening: false, reply_type: "volunteer", template_code: "night_sky", content: "Aku turut mendengarkan. Tidak apa-apa jika kamu masih mencari kata yang tepat untuk memahami perasaanmu hari ini.", moderation_status: "approved" }
    ]
  }));
  created.push(await ensureThread({
    authorId: currentMemberId,
    topic: "Demo Dashboard: Dalam Tinjauan",
    letters: [
      { sender_id: currentMemberId, is_opening: true, reply_type: "community", template_code: "warm_pastel", title: "Contoh surat menunggu moderasi", content: "Ini data dummy dengan status menunggu moderasi agar tampilan tab Dalam Tinjauan dapat diperiksa tanpa memakai cerita nyata.", moderation_status: "pending" }
    ]
  }));
  created.push(await ensureThread({
    authorId: currentMemberId,
    topic: "Demo Dashboard: Ditolak",
    status: "closed",
    letters: [
      { sender_id: currentMemberId, is_opening: true, reply_type: "community", template_code: "night_sky", title: "Contoh surat ditolak", content: "Ini data dummy untuk meninjau tampilan status surat yang tidak lolos moderasi di dashboard member.", moderation_status: "rejected" }
    ]
  }));
}

const createdCount = created.filter((item) => item.created).length;
console.log(`Avatar dashboard showcase ready: ${createdCount} new thread(s), ${created.length - createdCount} existing thread(s).`);