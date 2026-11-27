import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";

export async function GET(req: Request) {
  const user = await requireUser(req, { allowMustChange: true });
  if (user instanceof Response) return user;
  return NextResponse.json({ user });
}
