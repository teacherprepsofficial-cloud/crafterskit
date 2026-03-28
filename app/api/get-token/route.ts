import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  return NextResponse.json({
    username: (session as any).username,
    accessToken: (session as any).accessToken,
    refreshToken: (session as any).refreshToken,
  });
}
