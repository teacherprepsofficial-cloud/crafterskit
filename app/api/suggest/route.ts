import { NextRequest, NextResponse } from "next/server";

const RAVELRY_BASIC = Buffer.from(
  `${process.env.RAVELRY_CLIENT_ID!.trim()}:${process.env.RAVELRY_CLIENT_SECRET!.trim()}`
).toString("base64");

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  const res = await fetch(
    `https://api.ravelry.com/patterns/search.json?query=${encodeURIComponent(q)}&sort=best&page_size=8`,
    { headers: { Authorization: `Basic ${RAVELRY_BASIC}` } }
  );

  if (!res.ok) return NextResponse.json({ suggestions: [] });

  const data = await res.json();
  const suggestions = (data.patterns ?? []).map((p: { name: string; designer?: { name: string } }) => ({
    name: p.name,
    designer: p.designer?.name ?? "",
  }));

  return NextResponse.json({ suggestions });
}
