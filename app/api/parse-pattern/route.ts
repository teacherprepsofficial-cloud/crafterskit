import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

const PROMPT = `You are a knitting and crochet pattern parser. Convert written pattern instructions into a structured row-by-row list that a beginner can follow and check off as they go.

Output ONLY valid JSON — no markdown, no explanation:

{
  "title": "Pattern name",
  "craft": "knitting or crochet",
  "rows": [
    { "id": 1, "label": "Row 1 (RS)", "instruction": "K2, *yo, k2tog, k3; rep from * to last 2 sts, k2." },
    { "id": 2, "label": "Row 2 (WS)", "instruction": "Purl all sts." }
  ],
  "notes": "Any important setup notes or general tips."
}

RULES:
- Every row, round, or repeat section = one entry in rows[]
- "label" = the short name: "Row 1 (RS)", "Round 3", "Decrease Row", "Setup Row", etc.
- "instruction" = the full instructions for that row, written clearly in plain language
- For repeating sections (e.g. "Repeat rows 2-3 for 20 inches"), create ONE entry with label "Rows 4–40 (repeat)" and the full instruction for what to repeat
- For setup steps (cast on, foundation chain), include them as row id 0 with label "Setup"
- Finishing steps = final entries: "Finishing", "Seaming", etc.
- Keep instructions complete and exact — don't abbreviate or paraphrase
- Maximum 200 rows total
- Output ONLY the JSON`;

export async function POST(req: NextRequest) {
  const { instructions } = await req.json();
  if (!instructions?.trim()) {
    return NextResponse.json({ error: "No pattern provided" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: `${PROMPT}\n\nPattern to parse:\n\n${instructions}` }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not parse pattern. Please check your instructions and try again." }, { status: 500 });
  }
}
