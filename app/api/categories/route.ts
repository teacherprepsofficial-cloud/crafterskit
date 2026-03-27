import { NextResponse } from "next/server";

const RAVELRY_BASIC = Buffer.from(
  `${process.env.RAVELRY_CLIENT_ID!.trim()}:${process.env.RAVELRY_CLIENT_SECRET!.trim()}`
).toString("base64");

// Cache for 24 hours (categories rarely change)
let cache: { data: unknown; ts: number } | null = null;
const TTL = 24 * 60 * 60 * 1000;

interface RavCategory {
  id: number;
  name: string;
  permalink: string;
  children?: RavCategory[];
}

function flattenChildren(cats: RavCategory[], parentName: string, depth: number, out: { id: number; name: string; permalink: string; parent: string }[]) {
  for (const c of cats) {
    if (depth > 0) {
      out.push({ id: c.id, name: c.name, permalink: c.permalink, parent: parentName });
    }
    if (c.children?.length) {
      flattenChildren(c.children, depth === 0 ? c.name : parentName, depth + 1, out);
    }
  }
}

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  const res = await fetch("https://api.ravelry.com/pattern_categories/list.json", {
    headers: { Authorization: `Basic ${RAVELRY_BASIC}` },
  });

  if (!res.ok) return NextResponse.json({ categories: [] });

  const data = await res.json();
  const raw: RavCategory[] = data.pattern_categories ?? [];

  // Flatten: collect all categories at depth >= 1 with their top-level parent name
  const flat: { id: number; name: string; permalink: string; parent: string }[] = [];
  flattenChildren(raw, "", 0, flat);

  const result = { categories: flat };
  cache = { data: result, ts: Date.now() };
  return NextResponse.json(result);
}
