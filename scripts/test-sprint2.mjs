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

function formatRupiah(amount) {
  if (amount === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(amount);
}

function generateWhatsAppOrderUrl(pkg, member) {
  if (pkg.price === 0) return "/member/daftar";
  const baseNumber = "6285191020288";
  const userIdentifier = member?.alias ? ` (${member.alias} - ${member.email || "Member"})` : " (Pelanggan Baru)";
  const text = [
    `Halo Admin QONSULIN.ID, saya ingin memesan paket berikut:`,
    ``,
    `*Nama Paket:* ${pkg.name}`,
    `*Kategori:* ${pkg.category === "membership" ? "Membership Surat Batin" : "Konsultasi 1-on-1"}`,
    `*Tarif:* ${formatRupiah(pkg.price)}`,
    `*Pemesan:* ${userIdentifier}`,
    ``,
    `Mohon informasi nomor rekening tujuan transfer dan langkah verifikasi pembayarannya. Terima kasih.`
  ].join("\n");
  return `https://wa.me/${baseNumber}?text=${encodeURIComponent(text)}`;
}

async function run() {
  console.log("== Running Sprint 2 E2E Verification ==");

  // 1. Verify Packages DB Schema & Seed Data (SP2-01 & SP2-02)
  console.log("1. Checking consultation_packages table & default seed data...");
  const { data: packages, error: pkgErr } = await publicClient
    .from("consultation_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  assert.ifError(pkgErr);
  assert.ok(packages && packages.length >= 4, "Must have at least 4 seeded packages");

  const freePkg = packages.find((p) => p.code === "member_free");
  const premiumPkg = packages.find((p) => p.code === "member_premium");
  const peerPkg = packages.find((p) => p.code === "konseling_sebaya");
  const clinicalPkg = packages.find((p) => p.code === "psikolog_klinis");

  assert.ok(freePkg, "member_free package must exist");
  assert.equal(Number(freePkg.price), 0);
  assert.equal(freePkg.letter_quota, 3);

  assert.ok(premiumPkg, "member_premium package must exist");
  assert.equal(Number(premiumPkg.price), 19000);
  assert.equal(premiumPkg.letter_quota, -1);
  assert.equal(premiumPkg.duration_days, 30);

  assert.ok(peerPkg, "konseling_sebaya package must exist");
  assert.equal(Number(peerPkg.price), 35000);

  assert.ok(clinicalPkg, "psikolog_klinis package must exist");
  assert.equal(Number(clinicalPkg.price), 129000);

  console.log("   Seeded packages verified:", packages.map((p) => `${p.code} (${formatRupiah(p.price)})`).join(", "));

  // 2. Verify Pricing & WhatsApp URL formatting (SP2-04 & SP2-05)
  console.log("2. Checking price formatting and WhatsApp checkout URL generator...");
  assert.equal(formatRupiah(0), "Gratis");
  assert.ok(formatRupiah(19000).includes("19.000"));

  const freeUrl = generateWhatsAppOrderUrl(freePkg);
  assert.equal(freeUrl, "/member/daftar");

  const premiumUrl = generateWhatsAppOrderUrl(premiumPkg, { alias: "TemanTeduh", email: "user@test.local" });
  assert.ok(premiumUrl.startsWith("https://wa.me/6285191020288?text="));
  assert.ok(premiumUrl.includes("Member%20Premium"));
  assert.ok(premiumUrl.includes("TemanTeduh"));
  console.log("   WhatsApp URL generator verified.");

  // 3. Verify RLS protection on packages (SP2-01)
  console.log("3. Verifying public write protection on packages (RLS)...");
  const { error: publicWriteErr } = await publicClient
    .from("consultation_packages")
    .insert([{ code: "hacked_pkg", name: "Free Hack", price: 0, category: "membership" }]);
  assert.ok(publicWriteErr, "Public insert on consultation_packages must fail under RLS");
  console.log("   RLS protection verified:", publicWriteErr.message);

  // 4. Create member & test manual order activation (SP2-06)
  console.log("4. Testing manual payment order & admin activation trigger...");
  const testEmail = `sprint2.member.${Date.now()}@qonsulin.local`;
  const { data: signUpData, error: suErr } = await publicClient.auth.signUp({
    email: testEmail,
    password: "password123#",
    options: { data: { alias: `Kawan_${Date.now().toString().slice(-4)}` } }
  });
  assert.ifError(suErr);
  const memberId = signUpData.user.id;

  // Verify initial tier is 'free'
  const { data: profBefore } = await adminClient
    .from("member_profiles")
    .select("tier")
    .eq("id", memberId)
    .single();
  assert.equal(profBefore.tier, "free");

  // Member creates a pending manual-payment order before opening WhatsApp.
  const { data: signInData, error: signInErr } = await publicClient.auth.signInWithPassword({
    email: testEmail,
    password: "password123#"
  });
  assert.ifError(signInErr);
  const memberClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signInData.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: orderResult, error: orderCreateErr } = await memberClient.rpc("create_package_order", {
    p_package_code: premiumPkg.code
  });
  assert.ifError(orderCreateErr);
  assert.equal(orderResult.ok, true);

  const { data: order, error: ordErr } = await adminClient
    .from("package_orders")
    .select("*")
    .eq("id", orderResult.order_id)
    .single();
  assert.ifError(ordErr);
  assert.equal(order.status, "pending");

  // Admin activates order using database function
  const { data: activateRes, error: actErr } = await adminClient.rpc("activate_package_order", {
    target_order_id: order.id
  });
  assert.ifError(actErr);
  assert.equal(activateRes.ok, true);

  // Check order status updated to 'active'
  const { data: orderAfter } = await adminClient
    .from("package_orders")
    .select("*")
    .eq("id", order.id)
    .single();
  assert.equal(orderAfter.status, "active");
  assert.ok(orderAfter.activated_at, "activated_at must be populated");
  assert.ok(orderAfter.expires_at, "expires_at must be populated");

  // Check member tier upgraded to 'premium'
  const { data: profAfter } = await adminClient
    .from("member_profiles")
    .select("tier")
    .eq("id", memberId)
    .single();
  assert.equal(profAfter.tier, "premium", "Member tier must be upgraded to premium upon activation");
  console.log("   Order activated & member tier upgraded to premium successfully.");

  // 5. Verify Admin toggle tier back and forth
  console.log("5. Testing admin direct tier management...");
  const { error: tierToggleErr } = await adminClient
    .from("member_profiles")
    .update({ tier: "free" })
    .eq("id", memberId);
  assert.ifError(tierToggleErr);

  const { data: profFinal } = await adminClient
    .from("member_profiles")
    .select("tier")
    .eq("id", memberId)
    .single();
  assert.equal(profFinal.tier, "free");
  console.log("   Admin tier toggle verified.");

  console.log("\n== All Sprint 2 checks passed successfully! ==");
}

run().catch((err) => {
  console.error("Sprint 2 Test failed:", err);
  process.exit(1);
});
