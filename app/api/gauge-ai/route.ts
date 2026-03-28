import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

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
Add any other critical numbers (needle size, row counts, repeat adjustments).

## Your Adjusted Pattern
Rewrite the full pattern instructions with every stitch count and row count changed. Format it exactly like a real pattern — clean, step by step, easy to follow while knitting. Show the original number in parentheses after each changed number: "Cast on 84 sts (was 140)". Keep all inch/cm measurements exactly the same.

## A Note From Me
2-3 sentences max. One thing to watch out for. One word of encouragement. Warm but brief.

RULES:
- No jargon without a one-word explanation in parentheses
- No emojis
- No long explanations before the numbers — the numbers come first, always
- If there's a stitch repeat issue, handle it in "Your Numbers at a Glance" with a one-line note
- Keep "A Note From Me" to 3 sentences maximum`;

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
