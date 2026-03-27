import NextAuth from "next-auth";
import type { OAuthUserConfig, OAuth2Config } from "next-auth/providers";

interface RavelryProfile {
  user: {
    id: number;
    username: string;
    small_photo_url: string;
  };
}

function RavelryProvider(options: OAuthUserConfig<RavelryProfile>): OAuth2Config<RavelryProfile> {
  return {
    id: "ravelry",
    name: "Ravelry",
    type: "oauth" as const,
    authorization: {
      url: "https://www.ravelry.com/oauth2/auth",
      params: {
        scope: "offline",
        response_type: "code",
      },
    },
    token: {
      url: "https://www.ravelry.com/oauth2/token",
      async request({ params, provider }: { params: Record<string, string | undefined>; provider: { clientId?: string; clientSecret?: string } }) {
        const credentials = Buffer.from(
          `${provider.clientId}:${provider.clientSecret}`
        ).toString("base64");
        const res = await fetch("https://www.ravelry.com/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: params.code!,
            redirect_uri: params.redirect_uri!,
          }),
        });
        const tokens = await res.json();
        return { tokens };
      },
    },
    userinfo: "https://api.ravelry.com/current_user.json",
    profile(profile: RavelryProfile) {
      return {
        id: String(profile.user.id),
        name: profile.user.username,
        image: profile.user.small_photo_url,
        email: null,
      };
    },
    ...options,
    checks: ["state"] as OAuth2Config<RavelryProfile>["checks"],
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    RavelryProvider({
      clientId: process.env.RAVELRY_CLIENT_ID!.trim(),
      clientSecret: process.env.RAVELRY_CLIENT_SECRET!.trim(),
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.username = token.name;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken as string;
      (session as any).refreshToken = token.refreshToken as string;
      (session as any).username = token.username as string;
      return session;
    },
  },
});
