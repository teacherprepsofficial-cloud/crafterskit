const RAVELRY_BASIC = Buffer.from(
  `${process.env.RAVELRY_CLIENT_ID!.trim()}:${process.env.RAVELRY_CLIENT_SECRET!.trim()}`
).toString("base64");

const EC_ID = "ecfg_hwnxndyi9rcv7xtpanxixeiw0rq1";
const TEAM_ID = "team_fN6AALxI16rGIOe7IBu36sTc";
const EC_KEY = "ravelry_refresh_token";

let cached: { token: string; expiresAt: number } | null = null;

async function readRefreshToken(): Promise<string> {
  const vt = process.env.VERCEL_TOKEN?.trim();
  if (vt) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v1/edge-config/${EC_ID}/item/${EC_KEY}?teamId=${TEAM_ID}`,
        { headers: { Authorization: `Bearer ${vt}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.value === "string") return data.value;
      }
    } catch { /* fall through */ }
  }
  const fallback = process.env.RAVELRY_REFRESH_TOKEN?.trim();
  if (!fallback) throw new Error("No Ravelry refresh token available");
  return fallback;
}

async function writeRefreshToken(token: string): Promise<void> {
  const vt = process.env.VERCEL_TOKEN?.trim();
  if (!vt) return;
  try {
    await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/items?teamId=${TEAM_ID}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${vt}` },
        body: JSON.stringify({ items: [{ operation: "upsert", key: EC_KEY, value: token }] }),
      }
    );
  } catch { /* non-fatal */ }
}

export async function getRavelryToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const refreshToken = await readRefreshToken();

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
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };

  if (data.refresh_token) writeRefreshToken(data.refresh_token);

  return cached.token;
}
