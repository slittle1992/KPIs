import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, authEnabled, sessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  let password = "";
  let next = "/";
  if (ct.includes("application/json")) {
    const body = await req.json();
    password = String(body.password ?? "");
    next = String(body.next ?? "/");
  } else {
    const form = await req.formData();
    password = String(form.get("password") ?? "");
    next = String(form.get("next") ?? "/");
  }
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  if (!authEnabled() || password === process.env.APP_PASSWORD) {
    const res = NextResponse.redirect(new URL(next, req.url), 303);
    res.cookies.set(COOKIE, await sessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });
    return res;
  }
  return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, req.url), 303);
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
  void req;
  return res;
}
