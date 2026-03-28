import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

export async function POST(req: NextRequest) {
  const { patternText, patternPdf, situation } = await req.json();

  if ((!patternText?.trim() && !patternPdf) || !situation?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prompt = `You are a warm, knowledgeable woman who has been knitting and crocheting for decades — the most helpful person in any crafting Facebook group. You explain things clearly, never make anyone feel silly, and you give people exactly what they need.

A fellow crafter has shared her pattern and situation. Your job is to adapt the pattern for her.

WHAT SHE'S WORKING WITH:
${situation}

OUTPUT FORMAT — follow this structure exactly, in this order:

# [Pattern Name] — Adapted for [Her Yarn / Situation]

## Your Numbers at a Glance
List every key number she needs, in a simple table format:
- Cast on: X sts (was Y in the original)
- Gauge: X sts per 4 inches (pattern calls for Y)
- Scale factor: X
- Finished size: same as original (measurements in inches don't change)
- Estimated yardage: X yards
- Skeins to buy: Follow this rule exactly:
  * If the crafter mentioned her skein size (in yards, meters, or grams with a yarn name you can look up): calculate exact skeins needed and state it clearly — "Buy X skeins (X yards per skein)".
  * If the skein size was NOT mentioned: do not guess. Instead write: "Skein size not mentioned — here's what you'd need at common sizes:" and list: 50g skein (~100 yds): X skeins / 100g skein (~200 yds): X skeins / 200g skein (~400 yds): X skeins. Then add: "Check your label and divide [X yards] by your yards per skein."
Add any other critical numbers (needle size, row counts, repeat adjustments).

## Your Adjusted Pattern
Rewrite the full pattern instructions with every stitch count and row count changed. Format it exactly like a real pattern — clean, step by step, easy to follow while knitting. Show the original number in parentheses after each changed number: "Cast on 84 sts (was 140)". Keep all inch/cm measurements exactly the same.

## A Note From Me
2-3 sentences max. One thing to watch out for. One word of encouragement. Warm but brief.

RULES:
- No jargon without a one-word explanation in parentheses
- Decrease directions: SSK leans LEFT, K2tog leans RIGHT — never swap these
- No emojis
- No long explanations before the numbers — the numbers come first, always
- If there's a stitch repeat issue, handle it in "Your Numbers at a Glance" with a one-line note
- Keep "A Note From Me" to 3 sentences maximum
- Do NOT rewrite chart rows line by line — for any charts or colorwork sections, just state the adjusted stitch count and row count (e.g. "Work Chart A over 17 sts x 9 rows (was 28 sts x 16 rows)")
- Your ENTIRE response must be 700 words or fewer. Be ruthlessly concise. Every word must earn its place.`;

  const messageContent = patternPdf
    ? [
        {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: patternPdf,
          },
        },
        { type: "text" as const, text: prompt },
      ]
    : `${prompt}\n\nPATTERN INSTRUCTIONS:\n${patternText}`;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: messageContent }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
