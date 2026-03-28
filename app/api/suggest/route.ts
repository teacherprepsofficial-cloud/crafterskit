import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRavelryToken } from "@/lib/ravelry-token";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    const credentials = Buffer.from(
      `${process.env.RAVELRY_CLIENT_ID!.trim()}:${process.env.RAVELRY_CLIENT_SECRET!.trim()}`
    ).toString("base64");

    const session = await auth();
    const userToken = (session as any)?.accessToken as string | undefined;
    const userRefreshToken = (session as any)?.refreshToken as string | undefined;

    const url = `https://api.ravelry.com/patterns/search.json?query=${encodeURIComponent(q)}&sort=best&page_size=8`;

    let token = userToken ?? await getRavelryToken();
    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!res.ok && userRefreshToken) {
      const refreshRes = await fetch("https://www.ravelry.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${credentials}` },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: userRefreshToken }),
      });
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        token = refreshed.access_token;
        res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      }
    }

    if (!res.ok) return NextResponse.json({ suggestions: [] });

    const data = await res.json();
    const suggestions = (data.patterns ?? []).map((p: { name: string; designer?: { name: string } }) => ({
      name: p.name,
      designer: p.designer?.name ?? "",
    }));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
