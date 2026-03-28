import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    const basicAuth = `Basic ${Buffer.from(`${process.env.RAVELRY_CLIENT_ID}:${process.env.RAVELRY_CLIENT_SECRET}`).toString("base64")}`;
    const session = await auth();
    const userToken = (session as any)?.accessToken as string | undefined;

    const url = `https://api.ravelry.com/patterns/search.json?query=${encodeURIComponent(q)}&sort=best&page_size=8`;
    let res = await fetch(url, { headers: { Authorization: userToken ? `Bearer ${userToken}` : basicAuth } });
    if (!res.ok && userToken) {
      res = await fetch(url, { headers: { Authorization: basicAuth } });
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
