import { NextResponse } from "next/server";

const RAVELRY_BASIC = Buffer.from(
  `${process.env.RAVELRY_CLIENT_ID!.trim()}:${process.env.RAVELRY_CLIENT_SECRET!.trim()}`
).toString("base64");

let cache: { data: unknown; ts: number } | null = null;
const TTL = 24 * 60 * 60 * 1000;

interface RavAttr {
  id: number;
  name: string;
  permalink: string;
}

interface RavAttrGroup {
  id: number;
  name: string;
  permalink: string;
  pattern_attributes?: RavAttr[];
  children?: RavAttrGroup[];
}

function flattenGroups(groups: RavAttrGroup[]): { groupName: string; attrs: RavAttr[] }[] {
  const result: { groupName: string; attrs: RavAttr[] }[] = [];
  for (const g of groups) {
    const attrs: RavAttr[] = [];
    if (g.pattern_attributes?.length) attrs.push(...g.pattern_attributes);
    // Flatten child groups into the parent
    if (g.children?.length) {
      for (const child of g.children) {
        if (child.pattern_attributes?.length) attrs.push(...child.pattern_attributes);
      }
    }
    if (attrs.length) {
      result.push({ groupName: g.name, attrs });
    }
  }
  return result;
}

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  const res = await fetch("https://api.ravelry.com/pattern_attributes/groups.json", {
    headers: { Authorization: `Basic ${RAVELRY_BASIC}` },
  });

  if (!res.ok) return NextResponse.json({ groups: [] });

  const data = await res.json();
  const groups = flattenGroups(data.attribute_groups ?? []);

  const result = { groups };
  cache = { data: result, ts: Date.now() };
  return NextResponse.json(result);
}
