import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  return NextResponse.json({
    hasSession: !!session,
    hasAccessToken: !!session?.accessToken,
    accessTokenLength: session?.accessToken?.length ?? 0,
    accessTokenPrefix: session?.accessToken?.substring(0, 10) ?? null,
    username: session?.username ?? null,
  });
}
