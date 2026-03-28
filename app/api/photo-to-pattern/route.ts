import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

const PROMPT = `You are an expert knitting and crochet pattern writer. A crafter has uploaded a photo of a finished garment or project and wants you to generate a written pattern so they can recreate it.

Analyze the photo carefully — look at the stitch texture, construction method, shaping, colorwork, and any visible details.

OUTPUT FORMAT — follow exactly:

## About This Garment
One sentence describing what you see: garment type, approximate style, construction notes (e.g. "This appears to be a top-down raglan sweater in a worsted weight yarn with a simple stockinette body and ribbed cuffs and hem.").

## What I Can See
A brief bullet list of what you can observe from the photo:
- Yarn weight estimate (lace / fingering / sport / DK / worsted / bulky)
- Fiber look (wool, cotton, acrylic, mohair, etc. — your best guess)
- Stitch pattern(s) visible
- Construction method (flat / in the round, top-down / bottom-up, seamless / seamed)
- Any colorwork, cables, lace, or texture details
- Approximate sizing (adult S/M/L, child, etc. if visible)

## Gauge & Materials
Estimated gauge and suggested materials:
- **Gauge:** X sts × X rows = 4 inches / 10 cm in [stitch pattern] on [needle/hook size]
- **Yarn:** Approx X yards / X meters (worsted weight, or equivalent)
- **Needles/Hook:** US X / X mm (or equivalent)
- **Notions:** (stitch markers, tapestry needle, buttons, etc.)

## Sizing
List sizes you'd design this for, with key measurements:
- **Finished Chest:** X (X, X, X) inches
- **Length:** X (X, X, X) inches
- *Add other relevant measurements*

## Pattern Instructions

**Abbreviations:** List all abbreviations used.

**Setup / Cast On:**
How to begin (cast on count, join for working in the round if applicable, etc.)

Then write each section clearly:

**[Section Name] (e.g. Ribbed Hem, Body, Sleeve, etc.):**
Row/Round by row/round instructions using standard abbreviations.

Continue until the garment is complete, including finishing instructions.

## Notes
2–4 sentences: key construction notes, tips for recreating this garment, anything the crafter should watch out for. If you cannot see certain details clearly, say so and offer your best estimate.

RULES:
- Use standard abbreviations (k, p, k2tog, ssk, yo, pm, sm, m1l, m1r, sl, kfb, etc.)
- Show repeats with asterisks: *k2, p2; rep from * to end
- Write as a real published pattern — clear, numbered, professional
- If you cannot see a detail clearly, give your best professional estimate and note the uncertainty
- Do not use emojis
- Do not say "I can see" or "in the photo" — write as a pattern, not a description`;

export async function POST(req: NextRequest) {
  const { image, mimeType, notes } = await req.json();

  if (!image || !mimeType) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const userMessage = notes?.trim()
    ? `Here is the garment photo. Additional context from the crafter: ${notes}`
    : "Here is the garment photo. Please generate a written pattern to recreate it.";

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
