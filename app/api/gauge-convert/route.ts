import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const {
    patternText,
    patternStitchesPerInch,
    patternRowsPerInch,
    yourStitchesPerInch,
    yourRowsPerInch,
    stitchScale,
    rowScale,
  } = await req.json();

  if (!patternText?.trim() || !stitchScale || !rowScale) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const yardageMultiplier = (stitchScale * rowScale).toFixed(2);

  const prompt = `You are an expert knitting and crochet pattern converter. Rewrite the pattern below so it works with a different gauge.

GAUGE CONVERSION FACTS:
- Pattern gauge: ${patternStitchesPerInch.toFixed(2)} stitches/inch, ${patternRowsPerInch.toFixed(2)} rows/inch
- New gauge: ${yourStitchesPerInch.toFixed(2)} stitches/inch, ${yourRowsPerInch.toFixed(2)} rows/inch
- Stitch scale factor: ${stitchScale.toFixed(4)} — multiply every stitch count by this
- Row/round scale factor: ${rowScale.toFixed(4)} — multiply every row/round count by this
- Yardage multiplier: ${yardageMultiplier}× — multiply total yarn yardage by this

RULES FOR WHAT TO CHANGE:
1. Cast-on counts, chain counts, stitch pickup counts → multiply by stitch scale, round to nearest whole number
2. Stitch counts in instructions ("k47", "next 23 sts", "sc 15", "*repeat* to last 8 sts") → multiply by stitch scale
3. Explicit row/round counts ("work 20 rows", "work 6 rounds") → multiply by row scale, round to nearest whole
4. For ribbing (k1p1, k2p2, k3p3), round to the nearest multiple of the rib repeat — note the repeat used
5. For lace or colorwork with a stitch repeat, round to nearest multiple of that repeat — flag it with ⚠️

RULES FOR WHAT NOT TO CHANGE:
1. Measurements in inches or centimeters — "until piece measures 12 inches" stays exactly the same
2. The stitch pattern itself — "k2, p2" stays "k2, p2", only the total count changes
3. Needle sizes, yarn weights, notions
4. Any instruction that doesn't involve a number of stitches or rows

FORMAT FOR CHANGED NUMBERS:
- Write the new number first, then the original in brackets: "Cast on 148 sts [was: 120]"
- For rows: "Work 19 rows [was: 20]"
- If a number stays the same (scale rounds back to original), write it normally with no bracket

FLAG COMPLEX CHANGES:
- Any place the new stitch count might break a pattern repeat: add ⚠️ Note: [explain]
- Any shaping sequence where the math gets complex: add ⚠️ Note: [explain what to watch for]

PATTERN TO CONVERT:
${patternText}

---
Rewrite the complete pattern now, applying all gauge adjustments. After the pattern, add a "--- Gauge Conversion Summary ---" section listing: stitch scale, row scale, yardage multiplier, and any notes the crafter should review.`;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
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
