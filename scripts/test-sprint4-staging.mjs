import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = "Passw0rd!S4E2E";
assert.ok(url && key && service, "Konfigurasi Supabase staging belum lengkap.");

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const createdUserIds = [];

async function createMember() {
  const email = "s4.e2e." + Date.now() + "@qonsulin.test";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { alias: "S4_" + Date.now().toString().slice(-5), avatar_config: { mood: "smile", glasses: false, bg: "sky" } }
  });
  assert.ifError(error);
  createdUserIds.push(data.user.id);

  const publicClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: session, error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
  assert.ifError(signInError);
  return { userId: data.user.id, client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + session.session.access_token } } }) };
}

async function activatePackage(userId, code) {
  const { data: pkg, error: packageError } = await admin.from("consultation_packages").select("id, code, name, price").eq("code", code).maybeSingle();
  assert.ifError(packageError);
  assert.ok(pkg, "Paket uji " + code + " tidak ditemukan.");
  const { error } = await admin.from("package_orders").insert({ user_id: userId, package_id: pkg.id, package_code: pkg.code, package_name: pkg.name, amount: pkg.price, status: "active", activated_at: new Date().toISOString() });
  assert.ifError(error);
}

async function run() {
  console.log("== E2E Sprint 4 (staging) ==");
  const member = await createMember();

  const { data: denied, error: deniedError } = await member.client.rpc("send_special_letter", {
    p_destination: "mentor", p_title: null, p_content: "Surat uji tanpa paket aktif harus ditolak.", p_template_code: "vintage_parchment"
  });
  assert.ifError(deniedError);
  assert.equal(denied.ok, false, "Surat khusus tanpa paket aktif harus ditolak");

  await activatePackage(member.userId, "konseling_sebaya");
  const { data: created, error: createError } = await member.client.rpc("send_special_letter", {
    p_destination: "mentor", p_title: "Surat privat E2E", p_content: "Ini surat privat Sprint 4 untuk menguji alur admin dan tidak boleh masuk ke kolam publik.", p_template_code: "vintage_parchment"
  });
  assert.ifError(createError);
  assert.equal(created.ok, true, "Pengiriman surat privat harus berhasil");

  const { data: thread, error: threadError } = await admin.from("letter_threads")
    .select("id, delivery_mode, special_destination, handling_status")
    .eq("id", created.thread_id).maybeSingle();
  assert.ifError(threadError);
  assert.deepEqual({ delivery_mode: thread.delivery_mode, special_destination: thread.special_destination, handling_status: thread.handling_status }, { delivery_mode: "special", special_destination: "mentor", handling_status: "waiting" });

  const { data: anonymousPool, error: poolError } = await createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    .from("letters").select("thread_id").eq("thread_id", created.thread_id);
  assert.ifError(poolError);
  assert.equal(anonymousPool.length, 0, "Surat privat tidak boleh terbaca melalui kolam publik");

  const replyText = "Balasan uji dari Tim Qonsulin. Kami sudah menerima dan meneruskan suratmu.";
  const { data: handled, error: replyError } = await admin.rpc("admin_handle_special_letter", {
    p_thread_id: created.thread_id, p_status: "completed", p_companion_id: null, p_response: replyText
  });
  assert.ifError(replyError);
  assert.equal(handled.ok, true, "Admin harus dapat menyimpan balasan operator");

  const { data: memberReply, error: memberReplyError } = await member.client.from("letters")
    .select("content, operator_reply").eq("thread_id", created.thread_id).eq("operator_reply", true).maybeSingle();
  assert.ifError(memberReplyError);
  assert.equal(memberReply.content, replyText);
  assert.equal(memberReply.operator_reply, true);
  console.log("PASS Surat privat, hak paket, isolasi kolam publik, dan balasan operator.");
}

async function cleanup() {
  for (const userId of createdUserIds) {
    await admin.from("package_orders").delete().eq("user_id", userId);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error("Cleanup user " + userId + " gagal: " + error.message);
  }
  console.log("CLEANUP: " + createdUserIds.length + " akun uji dan pesanan terkait dihapus.");
}

try {
  await run();
} catch (error) {
  console.error("FAIL Sprint 4 E2E:", error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
