import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

const PROMPT = `You are an expert knitting and crochet pattern writer who specializes in converting charted patterns into clear written instructions.

Look carefully at this chart image and convert it to written row-by-row instructions.

OUTPUT FORMAT — follow exactly:

## About This Chart
One sentence: what type of chart this is (e.g. "This is a knitting lace chart worked flat over 24 stitches and 16 rows.")

## Stitch Key
List every symbol used in the chart and what it means. If the chart includes a legend, use it. If not, use standard conventions:
- Knitting: □ = knit RS / purl WS, • = purl RS / knit WS, O = yarn over, / = k2tog, \\ = ssk, etc.
- Crochet: use standard crochet chart symbols

## Written Instructions

**Setup:** Cast on X sts (or starting chain, etc.)

Then write each row/round clearly:
**Row 1 (RS):** K2, *yo, k2tog, k3; rep from * to last 2 sts, k2.
**Row 2 (WS):** Purl all sts.
(etc.)

## Notes
Any important observations — repeats, edge stitches, special techniques, or things to watch out for. 2-3 sentences max.

RULES:
- Use standard abbreviations (k, p, yo, k2tog, ssk, sl, pm, sm, etc.)
- Show stitch repeats with asterisks: *...; rep from * X times
- If the chart has a repeat box/bracket, clearly mark where the repeat starts and ends
- If you cannot read part of the chart clearly, say so rather than guessing
- Do not use emojis
- Keep it clean and formatted exactly like a real published pattern`;

export async function POST(req: NextRequest) {
  const { image, mimeType, notes } = await req.json();

  if (!image || !mimeType) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const userMessage = notes?.trim()
    ? `Here is the chart. Additional context from the crafter: ${notes}`
    : "Here is the chart. Please convert it to written instructions.";

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mimeType, data: image },
        },
        { type: "text", text: `${PROMPT}\n\n${userMessage}` },
      ],
    }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
    cancel() { stream.abort(); },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
