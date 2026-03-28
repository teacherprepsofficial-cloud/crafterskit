import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const refreshToken = (session as any)?.refreshToken as string | undefined;
  if (!refreshToken) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json({ refreshToken, username: (session as any)?.username });
}
