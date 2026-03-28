import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { getRavelryToken } from "@/lib/ravelry-token";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

const SYSTEM_PROMPT = `You are a Ravelry pattern search assistant. Convert natural language queries into Ravelry API search parameters.

Ravelry /patterns/search.json accepts these query params:
- query: keyword search string
- craft: "knitting" | "crochet" | "weaving" | "machine knitting"
- weight: "fingering" | "sport" | "dk" | "worsted" | "aran" | "bulky" | "super_bulky" | "cobweb" | "lace" | "thread" | "light_fingering"
- fit: "baby" | "toddler" | "child" | "adult" | "not-specified"
- pc: pattern category permalink — e.g. "hat" | "sock" | "pullover" | "cardigan" | "vest" | "shawl-wrap" | "cowl" | "scarf" | "mitten-glove" | "blanket-throw" | "toy" | "bag" | "baby"
- pa: pattern attribute slugs (space-separated) — e.g. "cables colorwork" | "lace" | "fair-isle seamless" | "top-down" | "in-the-round" | "brioche" | "short-rows"
- availability: "free" | "ravelry" | "purchase"
- sort: "best" | "popularity" | "recently" | "hot" | "projects" | "favorited" | "queued" | "rating" | "created" | "difficulty"

Return ONLY a valid JSON object with the search params. No explanation. No markdown. Example:
{"craft":"knitting","weight":"worsted","pa":"cables","pc":"pullover","query":"sweater","sort":"popularity"}`;

const IMAGE_PROMPT = `Look at this image carefully. Identify the SPECIFIC type of garment or knitted/crocheted item shown.

Be precise about the garment category:
- Is it a sweater, cardigan, vest, tank top, pullover, hoodie?
- Is it a hat, beanie, beret, headband?
- Is it a scarf, cowl, shawl, wrap?
- Is it socks, mittens, gloves?
- Is it a skirt, shorts, pants, dress?
- Is it a blanket, dishcloth, bag?

Then: is it knitting or crochet? Only include if you can tell.

Return ONLY a JSON object with:
- "query": the garment type in 1-3 words (be specific — "vest" not "top", "cardigan" not "sweater" if it has an open front)
- "craft": "knitting" or "crochet" only if clearly identifiable
- "sort": "popularity"
- "interpreted_as": one sentence describing what you see (e.g. "Blue knitted sleeveless vest")

Example: {"craft":"knitting","query":"sleeveless vest","sort":"popularity","interpreted_as":"Blue ribbed knitted vest"}`;



async function buildSearchParams(userQuery: string): Promise<Record<string, string>> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userQuery }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(text); } catch { return {}; }
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

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(text); } catch { return {}; }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, image, mimeType } = body;

    let searchParams: Record<string, string>;

    if (image && mimeType) {
      searchParams = await buildSearchParamsFromImage(image, mimeType);
    } else if (query?.trim()) {
      searchParams = await buildSearchParams(query);
    } else {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    const session = await auth();
    const userToken = (session as any)?.accessToken as string | undefined;

    async function ravelrySearch(p: Record<string, string>, token: string) {
      return fetch(
        `https://api.ravelry.com/patterns/search.json?${new URLSearchParams({ ...p, page_size: "20" })}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    const interpretedAs = searchParams.interpreted_as ?? null;
    const { interpreted_as: _drop, ...ravelryParams } = searchParams;

    // Try user bearer token first; fall back to app refresh token if expired/missing
    let activeToken = userToken ?? await getRavelryToken();
    let ravelryRes = await ravelrySearch(ravelryParams, activeToken);
    if (!ravelryRes.ok && userToken) {
      activeToken = await getRavelryToken();
      ravelryRes = await ravelrySearch(ravelryParams, activeToken);
    }

    if (!ravelryRes.ok) {
      return NextResponse.json({ error: "Ravelry API error" }, { status: 502 });
    }

    let data = await ravelryRes.json();

    // If image search returned too few results, retry with just query + sort
    if (image && mimeType && (data.patterns?.length ?? 0) < 4 && ravelryParams.query) {
      const fallback = { query: ravelryParams.query, sort: "popularity" };
      const retryRes = await ravelrySearch(fallback, activeToken);
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        if ((retryData.patterns?.length ?? 0) > (data.patterns?.length ?? 0)) {
          data = retryData;
        }
      }
    }

    return NextResponse.json({ ...data, interpreted_as: interpretedAs });
  } catch (err) {
    console.error("Search route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
