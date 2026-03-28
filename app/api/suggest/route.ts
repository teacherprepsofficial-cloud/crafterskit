import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRavelryToken } from "@/lib/ravelry-token";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    const session = await auth();
    const userToken = (session as any)?.accessToken as string | undefined;

    const url = `https://api.ravelry.com/patterns/search.json?query=${encodeURIComponent(q)}&sort=best&page_size=8`;
    let token = userToken ?? await getRavelryToken();
    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok && userToken) {
      token = await getRavelryToken();
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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
