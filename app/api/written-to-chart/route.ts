import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

const PROMPT = `You are an expert knitting and crochet chart maker. Convert written pattern instructions into a visual chart grid.

Output ONLY valid JSON — no markdown fences, no explanation, just the raw JSON object:

{
  "title": "short descriptive name for the pattern",
  "craft": "knitting",
  "stitches": 12,
  "rows": 8,
  "grid": [
    ["□","□","O","/","□","□","O","/","□","□","O","/"],
    ["□","□","□","□","□","□","□","□","□","□","□","□"]
  ],
  "key": {
    "□": "knit on RS, purl on WS",
    "■": "purl on RS, knit on WS",
    "O": "yarn over",
    "/": "k2tog (right-leaning decrease)",
    "\\\\": "ssk (left-leaning decrease)",
    "·": "purl on RS",
    "X": "slip 1"
  },
  "notes": "Chart is worked flat. RS rows read right to left, WS rows read left to right. Row 1 is at the bottom."
}

RULES:
- grid[0] = Row 1 (bottom of chart), grid[last] = top row — this is standard charting convention
- Every row array must have exactly the same number of elements as "stitches"
- Use these standard symbols only: □ (knit RS/purl WS), ■ (purl RS/knit WS or contrast color), O (yarn over), / (k2tog), \\\\ (ssk), · (purl RS), X (slip)
- For colorwork: □ = MC (white), ■ = CC (dark). Use A B C for additional colors.
- If the pattern has a stitch repeat, chart ONE complete repeat
- Maximum 60 stitches wide, 60 rows tall. If pattern exceeds this, chart the core repeat section
- If instructions are ambiguous, make your best interpretation and note it
- Output ONLY the JSON object — no other text`;

export async function POST(req: NextRequest) {
  const { instructions, notes } = await req.json();

  if (!instructions?.trim()) {
    return NextResponse.json({ error: "No instructions provided" }, { status: 400 });
  }

  const userMessage = notes?.trim()
    ? `Written pattern instructions:\n\n${instructions}\n\nAdditional context: ${notes}`
    : `Written pattern instructions:\n\n${instructions}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: `${PROMPT}\n\n${userMessage}` }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const chart = JSON.parse(cleaned);

    return NextResponse.json(chart);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate chart. Please check your instructions and try again." }, { status: 500 });
  }
}
