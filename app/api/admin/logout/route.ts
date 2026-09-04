import { NextRequest, NextResponse } from "next/server";
import { adminCookieName } from "@/lib/server/admin-auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 0
  });

  return response;
}
