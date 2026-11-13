import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, createAdminSessionValue, getAdminCookieMaxAge, verifyAdminCredentials, StaffRole } from "@/lib/server/admin-auth";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

export async function POST(request: NextRequest) {
  const { email, password } = (await request.json().catch(() => ({}))) as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email dan kata sandi admin wajib diisi." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Env-configured Superadmin
  if (verifyAdminCredentials(normalizedEmail, password)) {
    const session = createAdminSessionValue(normalizedEmail, "admin", "Administrator");
    const response = NextResponse.json({ ok: true, role: "admin", email: normalizedEmail, alias: "Administrator" });
    response.cookies.set(adminCookieName, session, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
      path: "/",
      maxAge: getAdminCookieMaxAge()
    });
    return response;
  }

  // 2. Moderator login via Supabase. Mentor and counselor accounts are intentionally deferred.
  const supabase = getSupabaseAdminClient() as any;
  if (supabase) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password.trim()
      });

      if (!authError && authData?.user) {
        const { data: profile } = await supabase
          .from("member_profiles")
          .select("role, alias")
          .eq("id", authData.user.id)
          .maybeSingle();

        const staffRoles: StaffRole[] = ["admin", "moderator"];
        const userRole = (profile?.role || "member") as StaffRole;

        if (staffRoles.includes(userRole)) {
          const alias = profile?.alias || normalizedEmail.split("@")[0];
          const session = createAdminSessionValue(normalizedEmail, userRole, alias, authData.user.id);
          const response = NextResponse.json({
            ok: true,
            role: userRole,
            email: normalizedEmail,
            alias
          });
          response.cookies.set(adminCookieName, session, {
            httpOnly: true,
            sameSite: "lax",
            secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
            path: "/",
            maxAge: getAdminCookieMaxAge()
          });
          return response;
        }
      }
    } catch (err) {
      console.warn("[Admin Login Error]:", err);
    }
  }

  return NextResponse.json({
    ok: false,
    message: "Email atau kata sandi tidak sesuai, atau akun ini belum memiliki izin akses admin/moderator."
  }, { status: 401 });
}