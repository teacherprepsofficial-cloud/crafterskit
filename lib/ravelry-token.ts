const RAVELRY_BASIC = Buffer.from(
  `${process.env.RAVELRY_CLIENT_ID!.trim()}:${process.env.RAVELRY_CLIENT_SECRET!.trim()}`
).toString("base64");

const VERCEL_PROJECT_ID = "prj_hxufgCF8AfuUCFZHGix2k7vbEFKb";
const VERCEL_TEAM_ID = "team_fN6AALxI16rGIOe7IBu36sTc";
const VERCEL_ENV_ID = "GQ5nFZtQ9aQorrYI"; // RAVELRY_REFRESH_TOKEN env var ID

let cached: { token: string; expiresAt: number } | null = null;

async function persistRefreshToken(newRefreshToken: string) {
  const vercelToken = process.env.VERCEL_TOKEN?.trim();
  if (!vercelToken || !newRefreshToken) return;
  try {
    await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${VERCEL_ENV_ID}?teamId=${VERCEL_TEAM_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${vercelToken}` },
        body: JSON.stringify({ value: newRefreshToken }),
      }
    );
  } catch {
    // Non-fatal — token will still work for this warm instance
  }
}

export async function getRavelryToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const refreshToken = process.env.RAVELRY_REFRESH_TOKEN?.trim();
  if (!refreshToken) throw new Error("RAVELRY_REFRESH_TOKEN not set");

  const res = await fetch("https://www.ravelry.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${RAVELRY_BASIC}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const data = await res.json();

  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  // Ravelry rotates refresh tokens — persist the new one immediately
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    persistRefreshToken(data.refresh_token);
  }

  return cached.token;
}
