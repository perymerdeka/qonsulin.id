import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "Passw0rd!S3E2E";

assert.ok(URL && KEY && SERVICE, "SUPABASE_URL / PUBLISHABLE_KEY / SERVICE_ROLE_KEY wajib diisi");

const freshAnon = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = freshAnon();
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const createdUserIds = [];
const createdThreadIds = [];
const checks = [];
let failures = 0;

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failures += 1;
    checks.push({ name, ok: false, error: error.message });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  }
}

async function createMember(label) {
  const email = `e2e.${label}.${Date.now()}@qonsulin.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { alias: `E2E_${label}_${Date.now().toString().slice(-4)}`, avatar_config: { mood: "smile", glasses: false, bg: "sky" } }
  });
  assert.ifError(error);
  createdUserIds.push(data.user.id);

  const { data: session, error: signInError } = await freshAnon().auth.signInWithPassword({ email, password: PASSWORD });
  assert.ifError(signInError);

  const client = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } }
  });
  return { id: data.user.id, email, client };
}

async function setTier(userId, tier) {
  const { error } = await admin.from("member_profiles").update({ tier }).eq("id", userId);
  assert.ifError(error);
}

async function approve(letterId) {
  const { error } = await admin.from("letters").update({ moderation_status: "approved", reviewed_at: new Date().toISOString() }).eq("id", letterId);
  assert.ifError(error);
}

async function sendOpening(user, content, template = "vintage_parchment") {
  const { data, error } = await user.client.rpc("send_opening_letter", {
    p_topic: "Luapan Hati",
    p_title: "E2E",
    p_content: content,
    p_template_code: template
  });
  assert.ifError(error);
  if (data?.thread_id) createdThreadIds.push(data.thread_id);
  return data;
}

async function sendReply(user, threadId, content, template = "vintage_parchment") {
  const { data, error } = await user.client.rpc("send_reply_letter", {
    p_thread_id: threadId,
    p_content: content,
    p_template_code: template,
    p_reply_type: "community"
  });
  assert.ifError(error);
  return data;
}

async function run() {
  console.log("== E2E Sprint 1 + 2 + 3 (staging) ==\n");

  const author = await createMember("author");
  const responder = await createMember("responder");
  const outsider = await createMember("outsider");
  const premium = await createMember("premium");
  await setTier(premium.id, "premium");

  console.log("[S1] Member foundation");
  await check("profil otomatis dibuat dengan alias & tier free", async () => {
    const { data, error } = await author.client.from("member_profiles").select("*").eq("id", author.id).single();
    assert.ifError(error);
    assert.equal(data.tier, "free");
    assert.equal(data.role, "member");
    assert.ok(data.alias.length >= 3);
  });
  await check("member bisa update profil sendiri", async () => {
    const { error } = await author.client.from("member_profiles").update({ bio: "Bio E2E" }).eq("id", author.id);
    assert.ifError(error);
  });
  await check("member tidak bisa naikkan role/tier sendiri", async () => {
    const { error } = await author.client.from("member_profiles").update({ role: "admin", tier: "premium" }).eq("id", author.id);
    assert.ok(error, "eskalasi harus ditolak RLS");
  });
  await check("member tidak bisa update profil member lain", async () => {
    const { error } = await author.client.from("member_profiles").update({ bio: "hack" }).eq("id", responder.id);
    assert.ok(error || true);
    const { data } = await admin.from("member_profiles").select("bio").eq("id", responder.id).single();
    assert.notEqual(data.bio, "hack");
  });

  console.log("\n[S2] Paket & order");
  await check("katalog paket terbaca publik", async () => {
    const { data, error } = await freshAnon().from("consultation_packages").select("code,category,price,letter_quota").eq("is_active", true);
    assert.ifError(error);
    assert.ok(data.length >= 4);
    assert.ok(data.some((p) => p.code === "member_premium"));
  });
  await check("publik tidak bisa insert paket", async () => {
    const { error } = await freshAnon().from("consultation_packages").insert({ code: `hack_${Date.now()}`, name: "Hack", price: 0 });
    assert.ok(error, "insert publik harus ditolak");
  });
  await check("order manual pending lalu aktivasi menaikkan tier", async () => {
    const { data: order, error } = await author.client.rpc("create_package_order", { p_package_code: "member_premium" });
    assert.ifError(error);
    assert.equal(order.ok, true);
    const { data: activated, error: activateError } = await admin.rpc("activate_package_order", { target_order_id: order.order_id });
    assert.ifError(activateError);
    assert.equal(activated.ok, true);
    const { data: profile } = await admin.from("member_profiles").select("tier").eq("id", author.id).single();
    assert.equal(profile.tier, "premium");
    await setTier(author.id, "free");
  });

  console.log("\n[S3-01] Kuota & template");
  await check("kuota awal free = 3 dan bisa kirim", async () => {
    const { data, error } = await author.client.rpc("get_member_letter_quota", { p_user_id: author.id });
    assert.ifError(error);
    assert.equal(data.limit, 3);
    assert.equal(data.remaining, 3);
    assert.equal(data.can_send, true);
  });
  await check("free ditolak memakai template premium", async () => {
    const data = await sendOpening(responder, "Mencoba memakai tema premium tanpa paket premium.", "night_sky");
    assert.equal(data.ok, false);
    assert.match(data.message, /Premium/i);
  });
  await check("premium bisa memakai template premium", async () => {
    const data = await sendOpening(premium, "Surat dengan tema langit malam untuk verifikasi premium.", "night_sky");
    assert.equal(data.ok, true);
  });

  const first = await sendOpening(author, "Surat pembuka pertama untuk pengujian kuota dan moderasi sprint tiga.");
  const second = await sendOpening(author, "Surat pembuka kedua untuk pengujian thread privat dan safety.");
  const third = await sendOpening(author, "Surat pembuka ketiga untuk pengujian kuota bulanan member free.");

  await check("surat baru berstatus pending", async () => {
    assert.equal(first.ok, true);
    assert.equal(first.status, "pending");
  });
  await check("surat pending tidak terlihat anon", async () => {
    const { data } = await freshAnon().from("letters").select("id").eq("id", first.letter_id);
    assert.equal((data || []).length, 0);
  });
  await check("kuota habis setelah 3 surat, surat ke-4 ditolak", async () => {
    const { data: quota } = await author.client.rpc("get_member_letter_quota", { p_user_id: author.id });
    assert.equal(quota.remaining, 0);
    const fourth = await sendOpening(author, "Surat keempat seharusnya ditolak oleh batas kuota bulanan.");
    assert.equal(fourth.ok, false);
    assert.match(fourth.message, /Kuota/i);
  });
  await check("surat approved muncul di pool publik", async () => {
    await approve(first.letter_id);
    const { data } = await freshAnon().from("letters").select("id").eq("id", first.letter_id).eq("moderation_status", "approved");
    assert.equal((data || []).length, 1);
  });

  console.log("\n[S3-02] Reply, inbox, outbox, privasi");
  await check("balasan tidak memotong kuota surat pembuka", async () => {
    const before = await responder.client.rpc("get_member_letter_quota", { p_user_id: responder.id });
    const reply = await sendReply(responder, first.thread_id, "Balasan penguat pertama untuk kawan cerita di thread ini.");
    assert.equal(reply.ok, true);
    const after = await responder.client.rpc("get_member_letter_quota", { p_user_id: responder.id });
    assert.equal(before.data.used, after.data.used);
  });
  await check("penulis tidak bisa membalas suratnya sendiri", async () => {
    const data = await sendReply(author, first.thread_id, "Balasan penulis ke suratnya sendiri harus ditolak server.");
    assert.equal(data.ok, false);
    assert.match(data.message, /suratmu sendiri|Kamu tidak dapat/i);
  });
  await check("balasan pending tidak terlihat publik", async () => {
    const { data } = await freshAnon().from("letters").select("id").eq("thread_id", first.thread_id).eq("is_opening", false);
    assert.equal((data || []).length, 0);
  });
  await check("outbox berisi surat pembuka milik sendiri", async () => {
    const { data, error } = await author.client.from("letters").select("id").eq("sender_id", author.id).eq("is_opening", true);
    assert.ifError(error);
    assert.ok(data.length >= 3);
  });
  await check("inbox berisi balasan approved dari kawan pada thread sendiri", async () => {
    const { data: pendingReplies } = await admin.from("letters").select("id").eq("thread_id", first.thread_id).eq("is_opening", false);
    for (const reply of pendingReplies || []) await approve(reply.id);
    const { data: threads } = await author.client.from("letter_threads").select("id").eq("author_id", author.id);
    const ids = threads.map((t) => t.id);
    const { data, error } = await author.client.from("letters").select("id,sender_id")
      .in("thread_id", ids).eq("is_opening", false).eq("moderation_status", "approved").neq("sender_id", author.id);
    assert.ifError(error);
    assert.ok(data.length >= 1, "harus ada minimal satu balasan approved di inbox");
  });
  await check("non-peserta hanya melihat surat pembuka publik, bukan balasan privat", async () => {
    const { data, error } = await outsider.client.from("letters").select("id,is_opening").eq("thread_id", first.thread_id);
    assert.ifError(error);
    assert.ok(data.every((row) => row.is_opening === true), "balasan privat tidak boleh terbaca non-peserta");
    assert.ok(data.length <= 1, "hanya surat pembuka yang publik");
  });
  await check("non-peserta tidak bisa membaca thread yang belum approved", async () => {
    const { data } = await outsider.client.from("letter_threads").select("id").eq("id", third.thread_id);
    assert.equal((data || []).length, 0);
  });

  console.log("\n[S3-03] Report, block, close");
  await check("peserta bisa melaporkan thread", async () => {
    const { data, error } = await responder.client.rpc("report_letter_thread", { p_thread_id: first.thread_id, p_reason: "harassment", p_detail: "Uji laporan." });
    assert.ifError(error);
    assert.equal(data.ok, true);
  });
  await check("laporan membuat thread berstatus flagged", async () => {
    const { data } = await admin.from("letter_threads").select("status").eq("id", first.thread_id).single();
    assert.equal(data.status, "flagged");
  });
  await check("non-peserta boleh melaporkan thread approved (safety)", async () => {
    await approve(second.letter_id);
    const { data, error } = await outsider.client.rpc("report_letter_thread", { p_thread_id: second.thread_id, p_reason: "spam" });
    assert.ifError(error);
    assert.equal(data.ok, true);
  });
  await check("pelapor non-peserta tetap tidak bisa memblokir", async () => {
    const { data } = await outsider.client.rpc("block_letter_thread", { p_thread_id: second.thread_id });
    assert.equal(data.ok, false);
  });
  await check("anon tidak bisa membaca tabel laporan", async () => {
    const { data } = await freshAnon().from("letter_reports").select("id");
    assert.equal((data || []).length, 0);
  });
  await check("peserta bisa memblokir thread", async () => {
    const { data, error } = await responder.client.rpc("block_letter_thread", { p_thread_id: first.thread_id });
    assert.ifError(error);
    assert.equal(data.ok, true);
  });
  await check("thread diblokir hilang dari pool publik", async () => {
    const { data } = await freshAnon().from("letters").select("id").eq("thread_id", first.thread_id).eq("is_opening", true);
    assert.equal((data || []).length, 0);
  });
  await check("balasan setelah blokir ditolak", async () => {
    const data = await sendReply(author, first.thread_id, "Balasan setelah thread diblokir harus ditolak server.");
    assert.equal(data.ok, false);
  });
  await check("thread diblokir tidak bisa ditutup", async () => {
    const { data } = await responder.client.rpc("close_letter_thread", { p_thread_id: first.thread_id });
    assert.equal(data.ok, false);
  });
  await check("peserta bisa menutup thread", async () => {
    const { data, error } = await author.client.rpc("close_letter_thread", { p_thread_id: second.thread_id });
    assert.ifError(error);
    assert.equal(data.ok, true);
  });
  await check("balasan setelah ditutup ditolak", async () => {
    const data = await sendReply(responder, second.thread_id, "Balasan setelah thread ditutup harus ditolak server.");
    assert.equal(data.ok, false);
  });
  await check("non-peserta tidak bisa memblokir thread", async () => {
    const { data } = await outsider.client.rpc("block_letter_thread", { p_thread_id: third.thread_id });
    assert.equal(data.ok, false);
  });
  await check("non-peserta tidak bisa menutup thread", async () => {
    const { data } = await outsider.client.rpc("close_letter_thread", { p_thread_id: third.thread_id });
    assert.equal(data.ok, false);
  });

  console.log("\n[S3-04] RLS & API matrix");
  await check("member tidak bisa insert langsung ke tabel letters", async () => {
    const { error } = await responder.client.from("letters").insert({
      thread_id: third.thread_id, sender_id: responder.id, is_opening: false,
      template_code: "vintage_parchment", content: "Insert langsung harus ditolak RLS.", moderation_status: "approved"
    });
    assert.ok(error, "insert langsung harus ditolak");
  });
  await check("member tidak bisa mengubah status moderasi surat", async () => {
    await responder.client.from("letters").update({ moderation_status: "approved", is_hidden: true }).eq("id", third.letter_id);
    const { data } = await admin.from("letters").select("moderation_status,is_hidden").eq("id", third.letter_id).single();
    assert.equal(data.moderation_status, "pending", "status moderasi tidak boleh berubah");
    assert.equal(data.is_hidden, false, "is_hidden tidak boleh berubah");
  });
  await check("anon hanya melihat opening approved yang tidak hidden", async () => {
    const { data, error } = await freshAnon().from("letters").select("is_opening,moderation_status,is_hidden");
    assert.ifError(error);
    assert.ok(data.every((row) => row.is_opening === true && row.moderation_status === "approved" && row.is_hidden === false));
  });
  await check("anon tidak bisa memanggil RPC tulis surat", async () => {
    const { data, error } = await freshAnon().rpc("send_opening_letter", {
      p_topic: "x", p_title: "x", p_content: "Percobaan anon menulis surat tanpa login.", p_template_code: "vintage_parchment"
    });
    assert.ok(error || data?.ok === false, "RPC harus menolak anon");
  });
  await check("moderator bisa membaca surat pending", async () => {
    const moderator = await createMember("mod");
    await admin.from("member_profiles").update({ role: "moderator" }).eq("id", moderator.id);
    const { data, error } = await moderator.client.from("letters").select("id").eq("moderation_status", "pending");
    assert.ifError(error);
    assert.ok(data.length >= 1);
  });
  await check("member biasa tidak bisa membaca surat pending milik orang lain", async () => {
    const { data } = await responder.client.from("letters").select("id").eq("id", third.letter_id).eq("moderation_status", "pending");
    assert.equal((data || []).length, 0);
  });

  console.log("\n[S3-05] State & crisis");
  await check("krisis ditahan crisis_hold dan tidak masuk pool", async () => {
    const crisis = await sendOpening(outsider, "Aku sudah tidak kuat dan berniat akhiri hidupku malam ini.");
    assert.equal(crisis.ok, true);
    assert.equal(crisis.status, "crisis_hold");
    const { data } = await freshAnon().from("letters").select("id").eq("id", crisis.letter_id);
    assert.equal((data || []).length, 0);
  });
  await check("surat rejected tidak terlihat publik", async () => {
    const rejected = await sendOpening(outsider, "Surat yang akan ditolak moderator untuk uji state rejected.");
    await admin.from("letters").update({ moderation_status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", rejected.letter_id);
    const { data } = await freshAnon().from("letters").select("id").eq("id", rejected.letter_id);
    assert.equal((data || []).length, 0);
  });
  await check("surat hidden tidak muncul di pool", async () => {
    const hidden = await sendOpening(outsider, "Surat yang akan disembunyikan moderator untuk uji state hidden.");
    await approve(hidden.letter_id);
    await admin.from("letters").update({ is_hidden: true }).eq("id", hidden.letter_id);
    const { data } = await freshAnon().from("letters").select("id").eq("id", hidden.letter_id);
    assert.equal((data || []).length, 0);
  });
  await check("template premium ditolak untuk balasan member free", async () => {
    await approve(third.letter_id);
    const data = await sendReply(responder, third.thread_id, "Balasan memakai tema premium padahal member free.", "night_sky");
    assert.equal(data.ok, false);
    assert.match(data.message, /Premium/i);
  });

  console.log("\n== RINGKASAN ==");
  console.log(`Total: ${checks.length} | Lulus: ${checks.length - failures} | Gagal: ${failures}`);
  if (failures > 0) {
    console.log("\nCheck gagal:");
    checks.filter((c) => !c.ok).forEach((c) => console.log(`- ${c.name}: ${c.error}`));
    process.exitCode = 1;
  }
}

async function cleanup() {
  console.log("\n== CLEANUP ==");
  let removed = 0;
  for (const id of createdUserIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      console.log(`  gagal hapus user ${id}: ${error.message}`);
    } else {
      removed += 1;
    }
  }
  console.log(`  user uji dihapus: ${removed}/${createdUserIds.length}`);

  const { data: leftoverUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
  const leftover = (leftoverUsers?.users || []).filter((u) => (u.email || "").startsWith("e2e."));
  console.log(`  sisa user uji di database: ${leftover.length}`);
  if (leftover.length > 0) {
    for (const user of leftover) {
      await admin.auth.admin.deleteUser(user.id);
    }
    console.log(`  sisa user uji dibersihkan: ${leftover.length}`);
  }
}

try {
  await run();
} catch (error) {
  console.error("\nE2E berhenti karena error:", error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
