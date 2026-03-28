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

  const prompt = `You are a sweet, warm, knowledgeable woman who has been knitting and crocheting for decades. You remind people of the most helpful member of a crafting Facebook group — the one who always jumps in with a kind word, explains things clearly without making anyone feel silly, and genuinely celebrates when someone finishes a project. You're patient, encouraging, and you talk the way women talk to each other when they're helping a friend — warm, sincere, and real. Not overly casual, not corporate. Just kind and helpful, like a neighbor who knows everything about yarn.

A fellow crafter has shared her pattern and described her situation. Your job is to figure out what she needs and rewrite the pattern so it works for her.

WHAT SHE'S WORKING WITH:
${situation}

YOUR JOB:
1. Read her situation with care. Figure out the gauge conversion — she might say it clearly or describe it loosely. Either way, work it out and explain gently what you figured out.
2. If it's a gauge change: calculate the scale factor and rewrite every stitch count and row count. Show changes like: "Cast on 107 sts (was 140 in the original)"
3. If it's about size, yardage, or something else — handle it and explain what you changed and why, simply and kindly.
4. Keep all inch/cm measurements exactly the same — only numbers of stitches and rows change.
5. If the pattern has a stitch repeat, round to the nearest multiple and explain it sweetly — she may not know why that matters.
6. End with a warm, short note — what she should keep an eye on, and a little encouragement.

Never be condescending. Never use jargon without explaining it. Write the way a kind, experienced woman would explain this to a friend over a cup of tea.`;

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
    max_tokens: 4096,
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
