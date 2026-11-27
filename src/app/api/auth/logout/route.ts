import { NextResponse } from "next/server";
import { clearSessionCookieHeader, deleteSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(req: Request) {
  const token = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`).exec(req.headers.get("cookie") ?? "")?.[1];
  if (token) await deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookieHeader());
  return res;
}
