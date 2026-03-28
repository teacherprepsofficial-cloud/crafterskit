import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const VERCEL_PROJECT_ID = "prj_hxufgCF8AfuUCFZHGix2k7vbEFKb";
const VERCEL_TEAM_ID = "team_fN6AALxI16rGIOe7IBu36sTc";
const VERCEL_ENV_ID = "GQ5nFZtQ9aQorrYI";

export async function GET() {
  const session = await auth();
  const refreshToken = (session as any)?.refreshToken as string | undefined;
  if (!refreshToken) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const vercelToken = process.env.VERCEL_TOKEN?.trim();
  if (vercelToken) {
    await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${VERCEL_ENV_ID}?teamId=${VERCEL_TEAM_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${vercelToken}` },
        body: JSON.stringify({ value: refreshToken }),
      }
    );
  }

  return NextResponse.json({ ok: true, username: (session as any)?.username });
}
