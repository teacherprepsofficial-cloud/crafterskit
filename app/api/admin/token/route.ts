import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!(session as any)?.refreshToken) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  return NextResponse.json({
    refreshToken: (session as any).refreshToken,
    accessToken: (session as any).accessToken,
    username: (session as any).username,
  });
}
