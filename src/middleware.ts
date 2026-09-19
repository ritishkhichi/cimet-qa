import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const isLoggedIn = !!token;
  const isLogin = pathname.startsWith("/login");
  const isAuthApi = pathname.startsWith("/api/auth");

  if (isAuthApi) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/leads";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (token?.role !== "ADMIN") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/leads";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/leads/:path*",
    "/ingest/:path*",
    "/queue/:path*",
    "/analytics/:path*",
    "/admin/:path*",
    "/login",
    "/api/leads/:path*",
    "/api/queue/:path*",
    "/api/scores/:path*",
    "/api/analytics/:path*",
    "/api/admin/:path*",
    "/api/recordings/:path*",
    "/api/transcripts/:path*",
  ],
};
