import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, createAdminSessionValue, getAdminCookieMaxAge, verifyAdminCredentials } from "@/lib/server/admin-auth";

export async function POST(request: NextRequest) {
  const { email, password } = (await request.json().catch(() => ({}))) as { email?: string; password?: string };

  if (!email || !password || !verifyAdminCredentials(email, password)) {
    return NextResponse.json({ ok: false, message: "Email atau kata sandi admin tidak sesuai." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName, createAdminSessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: getAdminCookieMaxAge()
  });

  return response;
}
