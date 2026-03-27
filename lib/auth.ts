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
        scope: "offline library-pdf",
        response_type: "code",
      },
    },
    token: "https://www.ravelry.com/oauth2/token",
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
      clientId: process.env.RAVELRY_CLIENT_ID!,
      clientSecret: process.env.RAVELRY_CLIENT_SECRET!,
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
      session.accessToken = token.accessToken as string;
      session.username = token.username as string;
      return session;
    },
  },
});
