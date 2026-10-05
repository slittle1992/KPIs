import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, authEnabled, sessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const { pathname } = req.nextUrl;
  const PUBLIC = ["/login", "/api/login", "/privacy", "/terms"];
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const ok = req.cookies.get(COOKIE)?.value === (await sessionToken());
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
