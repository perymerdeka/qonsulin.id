import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://localhost:54321";
const ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const client = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function run() {
  console.log("== Running Sprint 1 E2E Verification ==");

  const testEmail = `test.member.${Date.now()}@qonsulin.local`;
  const testPassword = "password123#";
  const testAlias = `Kawan_${Date.now().toString().slice(-4)}`;

  // 1. Sign up
  console.log("1. Testing signup with alias & avatar...");
  const { data: signUpData, error: signUpErr } = await client.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        alias: testAlias,
        avatar_config: { mood: "smile", glasses: true, bg: "sunset" }
      }
    }
  });

  assert.ifError(signUpErr);
  assert.ok(signUpData.user, "User must be created");
  const userId = signUpData.user.id;
  console.log("   User created:", userId);

  // 2. Sign in to obtain session
  console.log("2. Testing member sign-in...");
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });
  assert.ifError(authErr);
  assert.ok(authData.session, "Session must exist");
  const token = authData.session.access_token;

  // Authenticated client
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // 3. Query member profile
  console.log("3. Testing member profile auto-provision trigger...");
  const { data: profile, error: profErr } = await authClient
    .from("member_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  assert.ifError(profErr);
  assert.equal(profile.id, userId);
  assert.equal(profile.alias, testAlias);
  assert.equal(profile.tier, "free");
  assert.equal(profile.role, "member");
  assert.equal(profile.avatar_config.mood, "smile");
  assert.equal(profile.avatar_config.glasses, true);
  assert.equal(profile.avatar_config.bg, "sunset");
  console.log("   Profile verified: alias =", profile.alias, "tier =", profile.tier);

  // 4. Update profile (alias, bio, avatar)
  console.log("4. Testing profile update...");
  const updatedAlias = `${testAlias}_Edit`;
  const { error: updateErr } = await authClient
    .from("member_profiles")
    .update({
      alias: updatedAlias,
      bio: "Senang berbagi cerita dan mendengarkan.",
      avatar_config: { mood: "relieved", glasses: false, bg: "sage" }
    })
    .eq("id", userId);

  assert.ifError(updateErr);

  const { data: updatedProfile } = await authClient
    .from("member_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  assert.equal(updatedProfile.alias, updatedAlias);
  assert.equal(updatedProfile.bio, "Senang berbagi cerita dan mendengarkan.");
  assert.equal(updatedProfile.avatar_config.mood, "relieved");
  assert.equal(updatedProfile.avatar_config.bg, "sage");
  console.log("   Profile update verified.");

  // 5. Test RLS protection against privilege escalation
  console.log("5. Testing RLS self-escalation block (tier/role)...");
  const { error: escalateErr } = await authClient
    .from("member_profiles")
    .update({ tier: "premium", role: "admin" })
    .eq("id", userId);

  // RLS check expression fails or update affects 0 rows
  assert.ok(escalateErr, "Escalation must be rejected by RLS with-check");
  console.log("   Privilege escalation successfully prevented:", escalateErr.message);

  // 6. Test public read (for community pool)
  console.log("6. Testing unauthenticated read for public feed...");
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: publicProfile, error: publicErr } = await anonClient
    .from("member_profiles")
    .select("alias, avatar_config")
    .eq("id", userId)
    .single();

  assert.ifError(publicErr);
  assert.equal(publicProfile.alias, updatedAlias);
  console.log("   Public read verified.");

  console.log("\n== All Sprint 1 checks passed successfully! ==");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});