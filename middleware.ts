import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (host.startsWith("admin.")) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname === "/" ? "/admin/login" : request.nextUrl.pathname.startsWith("/admin") ? request.nextUrl.pathname : `/admin${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"]
};
