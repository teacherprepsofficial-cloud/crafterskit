import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

const SYSTEM_PROMPT = `You are a Ravelry pattern search assistant. Convert natural language queries into Ravelry API search parameters.

Ravelry /patterns/search.json accepts these query params:
- query: keyword search string
- craft: "knitting" | "crochet" | "weaving" | "machine knitting"
- weight: "fingering" | "sport" | "dk" | "worsted" | "aran" | "bulky" | "super_bulky" | "cobweb" | "lace" | "thread" | "light_fingering"
- fit: "baby" | "toddler" | "child" | "adult" | "not-specified"
- pa: pattern attribute slugs (comma-separated), e.g. "cables", "colorwork", "lace", "textured"
- availability: "free" | "ravelry" | "purchase"
- sort: "best" | "popularity" | "recently" | "projects" | "rating" | "created"

Return ONLY a valid JSON object with the search params. No explanation. No markdown. Example:
{"craft":"knitting","weight":"worsted","pa":"cables","query":"sweater","sort":"popularity"}`;

const IMAGE_PROMPT = `Analyze this image and identify what knitting or crochet pattern someone would search for to make this item.

Focus only on:
1. Is it knitting or crochet? (if unclear, omit craft)
2. What is the garment/item type? (e.g. "mini skirt", "cardigan", "beanie", "shawl", "socks")
3. Any highly visible, defining feature (e.g. "cable", "colorwork", "lace") — only if clearly visible

Return ONLY a JSON object with "query", optionally "craft", and "sort":"popularity". Keep "query" short (2-4 words max — just the item type and one key feature if obvious). Do NOT include weight, fit, or pa unless you are certain. Fewer params = more results.

Example for a plain blue mini skirt: {"craft":"knitting","query":"mini skirt","sort":"popularity"}
Example for a cable sweater: {"craft":"knitting","query":"cable sweater","sort":"popularity"}`;

async function buildSearchParams(userQuery: string): Promise<Record<string, string>> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userQuery }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  return JSON.parse(text);
}

async function buildSearchParamsFromImage(imageBase64: string, mimeType: string): Promise<Record<string, string>> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: imageBase64,
          },
        },
        { type: "text", text: IMAGE_PROMPT },
      ],
    }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { query, image, mimeType } = body;

  let searchParams: Record<string, string>;

  if (image && mimeType) {
    searchParams = await buildSearchParamsFromImage(image, mimeType);
  } else {
    if (!query?.trim()) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }
    searchParams = await buildSearchParams(query);
  }

  async function ravelrySearch(p: Record<string, string>) {
    return fetch(
      `https://api.ravelry.com/patterns/search.json?${new URLSearchParams({ ...p, page_size: "20" })}`,
      { headers: { Authorization: `Bearer ${session!.accessToken}` } }
    );
  }

  let ravelryRes = await ravelrySearch(searchParams);

  if (!ravelryRes.ok) {
    if (ravelryRes.status === 403) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Ravelry API error" }, { status: 502 });
  }

  let data = await ravelryRes.json();

  // If image search returned too few results, retry with just query + sort
  if (image && mimeType && (data.patterns?.length ?? 0) < 4 && searchParams.query) {
    const fallback = { query: searchParams.query, sort: "popularity" };
    const retryRes = await ravelrySearch(fallback);
    if (retryRes.ok) {
      const retryData = await retryRes.json();
      if ((retryData.patterns?.length ?? 0) > (data.patterns?.length ?? 0)) {
        data = retryData;
      }
    }
  }

  return NextResponse.json(data);
}
