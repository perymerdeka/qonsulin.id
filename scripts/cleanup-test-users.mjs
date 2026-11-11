import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const PATTERNS = [
  (e) => e.startsWith("e2e."),
  (e) => e.startsWith("s3."),
  (e) => e.startsWith("sprint2.member."),
  (e) => e.startsWith("test.member."),
  (e) => e.endsWith("@qonsulin.test")
];

let page = 1;
let deleted = 0;
let scanned = 0;
const keep = [];

while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error("listUsers error:", error.message); process.exit(1); }
  const users = data?.users || [];
  if (users.length === 0) break;
  for (const user of users) {
    scanned += 1;
    const email = (user.email || "").toLowerCase();
    if (PATTERNS.some((p) => p(email))) {
      const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
      if (delErr) console.log(`  gagal hapus ${email}: ${delErr.message}`);
      else { deleted += 1; console.log(`  dihapus ${email}`); }
    } else {
      keep.push(email);
    }
  }
  if (users.length < 200) break;
  page += 1;
}

console.log(`\nDipindai: ${scanned} | Dihapus: ${deleted} | Disisakan: ${keep.length}`);
console.log("Akun disisakan:");
keep.forEach((e) => console.log(`  - ${e}`));
