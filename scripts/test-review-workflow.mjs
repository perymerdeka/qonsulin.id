import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.docker.local", "utf8").split(/\r?\n/)
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]));
const apiUrl = "http://localhost:54321";
const webUrl = "http://localhost:3000";
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, apiUrl, "Only the local Supabase stack may be tested");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(apiUrl, env.SUPABASE_SERVICE_ROLE_KEY, options);
const guest = createClient(apiUrl, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
let memberId;

try {
  const stamp = Date.now();
  const email = `review.regression.${stamp}@qonsulin.local`;
  const password = `Regression_${stamp}!`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { alias: `Review_${stamp}` }
  });
  assert.ifError(createError);
  memberId = created.user.id;
  const member = createClient(apiUrl, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
  const { error: loginError } = await member.auth.signInWithPassword({ email, password });
  assert.ifError(loginError);

  const login = await fetch(`${webUrl}/api/admin/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  async function review(type, id, action, withCookie = true) {
    const response = await fetch(`${webUrl}/api/admin/review`, {
      method: "POST", headers: { "Content-Type": "application/json", ...(withCookie ? { cookie } : {}) },
      body: JSON.stringify({ type, id, action })
    });
    return { response, result: await response.json() };
  }

  const concurrentOrders = await Promise.all([1, 2, 3].map(() => member.rpc("create_package_order", { p_package_code: "member_premium" })));
  for (const order of concurrentOrders) { assert.ifError(order.error); assert.equal(order.data.ok, true); }
  assert.equal(new Set(concurrentOrders.map((order) => order.data.order_id)).size, 1, "Repeated clicks must reuse pending order");
  const orderId = concurrentOrders[0].data.order_id;
  const { data: pendingOrder } = await member.from("package_orders").select("status,amount,user_id").eq("id", orderId).single();
  assert.equal(pendingOrder.status, "pending");
  assert.equal(pendingOrder.user_id, memberId);
  assert.equal(Number(pendingOrder.amount) > 0, true);
  const deniedActivation = await member.rpc("activate_package_order", { target_order_id: orderId });
  assert.ok(deniedActivation.error, "Member cannot activate their own order");

  const submissions = await Promise.all([1, 2, 3, 4].map((index) => member.rpc("send_opening_letter", {
    p_topic: "Luapan Hati", p_title: `Regression ${index}`,
    p_content: "Surat pengujian lokal untuk memastikan moderasi dan kuota bekerja.", p_template_code: "vintage_parchment"
  })));
  for (const submission of submissions) assert.ifError(submission.error);
  const accepted = submissions.filter((submission) => submission.data.ok);
  assert.equal(accepted.length, 3, "Concurrent submissions must obey the monthly quota");
  assert.equal(submissions.filter((submission) => !submission.data.ok).length, 1);
  const letter = accepted[0].data;
  assert.equal(letter.status, "pending");
  const { data: beforePublish, error: beforeError } = await guest.from("letters").select("id").eq("id", letter.letter_id);
  assert.ifError(beforeError);
  assert.equal(beforePublish.length, 0, "Pending letters must stay private");
  const { data: quota, error: quotaError } = await member.rpc("get_member_letter_quota", { p_user_id: memberId });
  assert.ifError(quotaError);
  assert.equal(quota.remaining, 0);

  const cms = await fetch(`${webUrl}/api/admin/cms`, { headers: { cookie } });
  assert.equal(cms.status, 200);
  const body = await cms.json();
  assert.ok(body.store.orders.some((order) => order.id === orderId));
  assert.ok(body.store.letters.some((item) => item.id === letter.letter_id));
  assert.equal((await review("letter", letter.letter_id, "approve", false)).response.status, 401);
  assert.equal((await review("letter", letter.letter_id, "approve")).result.ok, true);

  const { data: published, error: publishedError } = await guest.from("letters")
    .select("id,thread_id,sender_id,letter_threads(topic,status)").eq("id", letter.letter_id).single();
  assert.ifError(publishedError);
  assert.equal(published.letter_threads.topic, "Luapan Hati");
  const { data: authors, error: authorsError } = await guest.from("member_profiles")
    .select("id,alias,avatar_config").in("id", [published.sender_id]);
  assert.ifError(authorsError);
  assert.equal(authors.length, 1);

  assert.equal((await review("order", orderId, "activate")).result.ok, true);
  assert.equal((await review("order", orderId, "activate")).result.ok, false, "An active order cannot be reactivated");
  const { data: profile } = await member.from("member_profiles").select("tier").eq("id", memberId).single();
  assert.equal(profile.tier, "premium");
  const { data: activeOrder } = await member.from("package_orders").select("status,activated_at,expires_at").eq("id", orderId).single();
  assert.equal(activeOrder.status, "active");
  assert.ok(activeOrder.activated_at && activeOrder.expires_at);

  assert.equal((await review("letter", letter.letter_id, "reject")).result.ok, true);
  const { data: afterWithdrawal } = await guest.from("letters").select("id").eq("id", letter.letter_id);
  assert.equal(afterWithdrawal.length, 0);
  const directInsert = await member.from("letters").insert({
    thread_id: letter.thread_id, sender_id: memberId, content: "Mencoba melewati moderasi melalui insert langsung.", moderation_status: "approved"
  });
  assert.ok(directInsert.error, "Direct inserts cannot bypass moderation");
  console.log("PASS: real admin API, pending orders, deduplication, quota concurrency, moderation, feed, activation and access controls");
} finally {
  if (memberId) {
    const { error: ordersError } = await admin.from("package_orders").delete().eq("user_id", memberId);
    assert.ifError(ordersError);
    const { error: userError } = await admin.auth.admin.deleteUser(memberId);
    assert.ifError(userError);
  }
}
