const RAVELRY_BASIC = Buffer.from(
  `${process.env.RAVELRY_CLIENT_ID!.trim()}:${process.env.RAVELRY_CLIENT_SECRET!.trim()}`
).toString("base64");

const VERCEL_PROJECT_ID = "prj_hxufgCF8AfuUCFZHGix2k7vbEFKb";
const VERCEL_TEAM_ID = "team_fN6AALxI16rGIOe7IBu36sTc";
const VERCEL_ENV_ID = "GQ5nFZtQ9aQorrYI";

let cached: { token: string; expiresAt: number } | null = null;

async function getStoredRefreshToken(): Promise<string> {
  const vercelToken = process.env.VERCEL_TOKEN?.trim();
  if (vercelToken) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${VERCEL_ENV_ID}?teamId=${VERCEL_TEAM_ID}`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.value) return data.value;
      }
    } catch { /* fall through */ }
  }
  // Fallback to baked-in env var
  const fallback = process.env.RAVELRY_REFRESH_TOKEN?.trim();
  if (!fallback) throw new Error("RAVELRY_REFRESH_TOKEN not set");
  return fallback;
}

async function saveRefreshToken(newToken: string): Promise<void> {
  const vercelToken = process.env.VERCEL_TOKEN?.trim();
  if (!vercelToken) return;
  try {
    await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${VERCEL_ENV_ID}?teamId=${VERCEL_TEAM_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${vercelToken}` },
        body: JSON.stringify({ value: newToken }),
      }
    );
  } catch { /* non-fatal */ }
}

export async function getRavelryToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const refreshToken = await getStoredRefreshToken();

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

  // Save rotated refresh token immediately so next cold start gets it
  if (data.refresh_token) {
    saveRefreshToken(data.refresh_token);
  }

  return cached.token;
}
