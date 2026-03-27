import { NextResponse } from "next/server";
import { handlers } from "@/lib/auth";

// Temporary debug route - shows the exact Ravelry authorization URL
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = `${url.protocol}//${url.host}`;

  // Manually construct what NextAuth would generate
  const authUrl = new URL("https://www.ravelry.com/oauth2/auth");
  authUrl.searchParams.set("client_id", process.env.RAVELRY_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", `${base}/api/auth/callback/ravelry`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "offline");
  authUrl.searchParams.set("state", "debug_test_state_12345");

  return NextResponse.json({
    client_id: process.env.RAVELRY_CLIENT_ID,
    redirect_uri: `${base}/api/auth/callback/ravelry`,
    full_url: authUrl.toString(),
  });
}
