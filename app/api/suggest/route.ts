import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ suggestions: [] });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  const res = await fetch(
    `https://api.ravelry.com/patterns/search.json?query=${encodeURIComponent(q)}&sort=best&page_size=8`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  if (!res.ok) return NextResponse.json({ suggestions: [] });

  const data = await res.json();
  const suggestions = (data.patterns ?? []).map((p: { name: string; designer?: { name: string } }) => ({
    name: p.name,
    designer: p.designer?.name ?? "",
  }));

  return NextResponse.json({ suggestions });
}
