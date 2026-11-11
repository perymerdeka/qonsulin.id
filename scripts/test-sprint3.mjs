import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://localhost:54321";
const ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const publicClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function createAuthenticatedClient(email, password, alias, tier = "free") {
  const { data: su, error: suErr } = await publicClient.auth.signUp({
    email,
    password,
    options: { data: { alias, avatar_config: { mood: "smile", bg: "sky", glasses: false } } }
  });
  assert.ifError(suErr);
  const userId = su.user.id;

  if (tier === "premium") {
    await adminClient.from("member_profiles").update({ tier: "premium" }).eq("id", userId);
  }

  const { data: si, error: siErr } = await publicClient.auth.signInWithPassword({
    email,
    password
  });
  assert.ifError(siErr);

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${si.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return { client, userId, alias };
}

async function run() {
  console.log("== Running Sprint 3 E2E Verification ==");

  // 1. Verify Templates
  console.log("1. Checking letter_templates table...");
  const { data: templates, error: tplErr } = await publicClient
    .from("letter_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  assert.ifError(tplErr);
  assert.ok(templates.length >= 4);
  const vintage = templates.find((t) => t.code === "vintage_parchment");
  const night = templates.find((t) => t.code === "night_sky");
  assert.equal(vintage.tier_required, "free");
  assert.equal(night.tier_required, "premium");
  console.log("   Templates verified: Free & Premium catalog ready.");

  // 2. Free Member Quota & Opening Letters
  console.log("2. Testing Free member quota (3 opening letters/month limit)...");
  const ts = Date.now();
  const freeUser = await createAuthenticatedClient(`user.free.${ts}@qonsulin.local`, "pass123#", `Kawan_${ts.toString().slice(-4)}`);

  // Check initial quota
  const { data: q0 } = await freeUser.client.rpc("get_member_letter_quota", { p_user_id: freeUser.userId });
  assert.equal(q0.tier, "free");
  assert.equal(q0.used, 0);
  assert.equal(q0.remaining, 3);
  assert.equal(q0.can_send, true);

  // Send 1st letter
  const { data: l1 } = await freeUser.client.rpc("send_opening_letter", {
    p_topic: "Luapan Hati",
    p_title: "Surat Pertama",
    p_content: "Hari ini batin terasa begitu berat, namun aku mencoba bernapas lega.",
    p_template_code: "vintage_parchment"
  });
  assert.equal(l1.ok, true);

  // Send 2nd letter
  const { data: l2 } = await freeUser.client.rpc("send_opening_letter", {
    p_topic: "Luapan Hati",
    p_title: "Surat Kedua",
    p_content: "Melihat dedaunan gugur mengingatkanku bahwa semua fase akan berlalu.",
    p_template_code: "warm_pastel"
  });
  assert.equal(l2.ok, true);

  // Send 3rd letter
  const { data: l3 } = await freeUser.client.rpc("send_opening_letter", {
    p_topic: "Kecemasan Masa Depan",
    p_title: "Surat Ketiga",
    p_content: "Semoga esok langkah kakiku terasa sedikit lebih ringan dari hari ini.",
    p_template_code: "vintage_parchment"
  });
  assert.equal(l3.ok, true);
  assert.equal(l1.status, "pending", "New opening letters must wait for moderation");

  // Quota should now be exhausted
  const { data: q3 } = await freeUser.client.rpc("get_member_letter_quota", { p_user_id: freeUser.userId });
  assert.equal(q3.used, 3);
  assert.equal(q3.remaining, 0);
  assert.equal(q3.can_send, false);

  // Moderator approval is required before letters reach the public pool.
  const { error: approveOpeningsErr } = await adminClient
    .from("letters")
    .update({ moderation_status: "approved", reviewed_at: new Date().toISOString() })
    .in("id", [l1.letter_id, l2.letter_id, l3.letter_id]);
  assert.ifError(approveOpeningsErr);

  // Attempt 4th letter -> MUST be rejected
  const { data: l4 } = await freeUser.client.rpc("send_opening_letter", {
    p_topic: "Luapan Hati",
    p_title: "Surat Keempat",
    p_content: "Mencoba mengirimkan surat keempat melewati batas kuota bulanan.",
    p_template_code: "vintage_parchment"
  });
  assert.equal(l4.ok, false);
  assert.ok(l4.message.includes("Kuota surat batin bulan ini telah habis"));
  console.log("   Free quota successfully enforced at 3 letters/month.");

  // 3. Premium Template Gate
  console.log("3. Testing Premium template restriction for Free member...");
  const freeUser2 = await createAuthenticatedClient(`user.free2.${ts}@qonsulin.local`, "pass123#", `Kawan2_${ts.toString().slice(-4)}`);
  const { data: lPremAttempt } = await freeUser2.client.rpc("send_opening_letter", {
    p_topic: "Luapan Hati",
    p_title: "Surat Tema Premium",
    p_content: "Mencoba memilih tema kertas eksklusif tanpa paket premium.",
    p_template_code: "night_sky"
  });
  assert.equal(lPremAttempt.ok, false);
  assert.ok(lPremAttempt.message.includes("eksklusif untuk Member Premium"));
  console.log("   Premium template lock successfully verified.");

  // 4. Premium User Unlimited & Exclusive Template
  console.log("4. Testing Premium member unlimited quota & exclusive template...");
  const premUser = await createAuthenticatedClient(`user.prem.${ts}@qonsulin.local`, "pass123#", `Sultan_${ts.toString().slice(-4)}`, "premium");
  const { data: lPrem } = await premUser.client.rpc("send_opening_letter", {
    p_topic: "Kesepian & Hampa",
    p_title: "Malam Bintang",
    p_content: "Di bawah langit malam sunyi, aku menemukan ketenangan batin yang sejati.",
    p_template_code: "night_sky"
  });
  assert.equal(lPrem.ok, true);
  assert.equal(lPrem.status, "pending");
  const { error: approvePremiumErr } = await adminClient
    .from("letters")
    .update({ moderation_status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", lPrem.letter_id);
  assert.ifError(approvePremiumErr);
  console.log("   Premium member letter successfully created with night_sky template.");

  // 5. Letter Pool Feed (SP3-06)
  console.log("5. Testing Anonymous Letter Pool Feed...");
  const { data: poolLetters, error: poolErr } = await publicClient
    .from("letters")
    .select("id, thread_id, template_code, title, content, moderation_status")
    .eq("is_opening", true)
    .eq("moderation_status", "approved");
  assert.ifError(poolErr);
  assert.ok(poolLetters.length >= 3);
  console.log(`   Letter pool populated with ${poolLetters.length} approved letters.`);

  // 6. Reply Letter & Quota Exemption (SP3-07)
  console.log("6. Testing Balas dengan Surat & verifying replies do NOT consume quota...");
  const threadId = l1.thread_id;
  const responder = await createAuthenticatedClient(`user.resp.${ts}@qonsulin.local`, "pass123#", `Sahabat_${ts.toString().slice(-4)}`);

  const { data: repRes } = await responder.client.rpc("send_reply_letter", {
    p_thread_id: threadId,
    p_content: "Semangat ya kawanku! Kamu tidak sendirian melewati badai ini. Peluk hangat dari jauh.",
    p_template_code: "warm_pastel",
    p_reply_type: "community"
  });
  assert.equal(repRes.ok, true);
  assert.equal(repRes.status, "pending");

  // Check responder's opening quota is STILL 3 remaining!
  const { data: respQuota } = await responder.client.rpc("get_member_letter_quota", { p_user_id: responder.userId });
  assert.equal(respQuota.used, 0, "Replying must NOT increment opening letter count");
  assert.equal(respQuota.remaining, 3);
  console.log("   Reply letter created without consuming opening letter quota.");

  // 7. Thread Details with Badge (SP3-08)
  console.log("7. Testing thread replies and response labels (Community Support)...");
  const { error: approveReplyErr } = await adminClient
    .from("letters")
    .update({ moderation_status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", repRes.letter_id);
  assert.ifError(approveReplyErr);

  const { data: threadReplies } = await publicClient
    .from("letters")
    .select("id, reply_type, content")
    .eq("thread_id", threadId)
    .eq("is_opening", false);
  assert.equal(threadReplies.length, 1);
  assert.equal(threadReplies[0].reply_type, "community");
  console.log("   Thread reply retrieved with label:", threadReplies[0].reply_type);

  // 8. Crisis Keyword Interceptor
  console.log("8. Testing crisis keyword interceptor (crisis_hold status)...");
  const { data: crisisLetter } = await responder.client.rpc("send_opening_letter", {
    p_topic: "Luapan Hati",
    p_title: "Ungkapan Kritis",
    p_content: "Aku sudah tidak kuat lagi dan berniat akhiri hidupku malam ini.",
    p_template_code: "vintage_parchment"
  });
  assert.equal(crisisLetter.ok, true);
  assert.equal(crisisLetter.status, "crisis_hold");
  assert.equal(crisisLetter.is_crisis_hold, true);

  // Verify crisis letter does NOT appear in public pool feed
  const { data: publicCrisisCheck } = await publicClient
    .from("letters")
    .select("id")
    .eq("id", crisisLetter.letter_id)
    .eq("moderation_status", "approved");
  assert.equal(publicCrisisCheck.length, 0, "Crisis letter must NOT appear as approved in pool");
  console.log("   Crisis letter safely held with status crisis_hold.");

  
  // 9. Privacy Thread: report/block/close + inbox/outbox isolation (SP3-02/03)
  console.log("9. Testing privacy thread (report, block, close)...");
  const blockedThreadId = l1.thread_id;
  const reporter = responder;

  const { data: reportRes } = await reporter.client.rpc("report_letter_thread", {
    p_thread_id: blockedThreadId,
    p_reason: "harassment",
    p_detail: "Balasan mengandung kata kasar yang tidak pantas."
  });
  assert.equal(reportRes.ok, true, "Participant must be able to report thread");
  assert.ok(reportRes.report_id);

  const outsider = await createAuthenticatedClient(`user.out.${ts}@qonsulin.local`, "pass123#", `Outsider_${ts.toString().slice(-4)}`);
  const { data: reportByOutsider } = await outsider.client
    .rpc("report_letter_thread", { p_thread_id: blockedThreadId, p_reason: "spam" });
  assert.equal(reportByOutsider.ok, false, "Outsider must NOT be able to report thread");

  const { data: blockRes } = await reporter.client.rpc("block_letter_thread", { p_thread_id: blockedThreadId });
  assert.equal(blockRes.ok, true, "Participant must be able to block thread");
  assert.equal(blockRes.thread_id, blockedThreadId);

  const { data: replyAfterBlock } = await freeUser.client.rpc("send_reply_letter", {
    p_thread_id: blockedThreadId,
    p_content: "Balasan setelah thread diblokir seharusnya ditolak.",
    p_template_code: "vintage_parchment"
  });
  assert.equal(replyAfterBlock.ok, false, "Reply after block must be rejected");

  const { data: inboxAfterBlock } = await publicClient
    .from("letters")
    .select("id")
    .eq("thread_id", blockedThreadId)
    .eq("is_opening", true)
    .eq("moderation_status", "approved");
  assert.equal(inboxAfterBlock.length, 0, "Blocked thread must disappear from public pool");

  const { data: closeRes } = await reporter.client.rpc("close_letter_thread", { p_thread_id: blockedThreadId });
  assert.equal(closeRes.ok, false, "Blocked thread cannot be closed afterwards");

  // Isolasi inbox/outbox: outsider tidak melihat thread yang bukan miliknya.
  const { data: outsiderThreads } = await outsider.client
    .from("letter_threads")
    .select("id")
    .eq("id", blockedThreadId);
  assert.equal((outsiderThreads || []).length, 0, "Outsider must not read a private thread row");

  // Fresh thread for close scenario
  const closeThreadId = l2.thread_id;
  const { data: closeOk } = await freeUser.client.rpc("close_letter_thread", { p_thread_id: closeThreadId });
  assert.equal(closeOk.ok, true, "Author can close own thread");
  const { data: replyAfterClose } = await responder.client.rpc("send_reply_letter", {
    p_thread_id: closeThreadId,
    p_content: "Balasan setelah thread ditutup seharusnya ditolak.",
    p_template_code: "vintage_parchment"
  });
  assert.equal(replyAfterClose.ok, false, "Reply after close must be rejected");
  console.log("   Report, block, close, dan efeknya terhadap reply/pool terverifikasi.");

  console.log("\n== All Sprint 3 checks passed successfully! ==");
}

run().catch((err) => {
  console.error("Sprint 3 Test failed:", err);
  process.exit(1);
});