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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { query } = await req.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const searchParams = await buildSearchParams(query);

  const params = new URLSearchParams({
    ...searchParams,
    page_size: "20",
  });

  const ravelryRes = await fetch(
    `https://api.ravelry.com/patterns/search.json?${params}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  );

  if (!ravelryRes.ok) {
    return NextResponse.json({ error: "Ravelry API error" }, { status: 502 });
  }

  const data = await ravelryRes.json();
  return NextResponse.json(data);
}
