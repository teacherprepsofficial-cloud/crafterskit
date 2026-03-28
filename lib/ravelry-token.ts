const RAVELRY_BASIC = Buffer.from(
  `${process.env.RAVELRY_CLIENT_ID!.trim()}:${process.env.RAVELRY_CLIENT_SECRET!.trim()}`
).toString("base64");

let cached: { token: string; expiresAt: number } | null = null;

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
      "Authorization": `Basic ${RAVELRY_BASIC}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const data = await res.json();
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cached.token;
}
