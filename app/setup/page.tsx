"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";

export default function SetupPage() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      console.log("ACCESS TOKEN:", (session as any).accessToken);
      console.log("REFRESH TOKEN:", (session as any).refreshToken);
    }
  }, [session]);

  if (session) {
    return (
      <div style={{ padding: 40, fontFamily: "monospace" }}>
        <h2>Logged in as: {session.user?.name}</h2>
        <p><strong>Access Token:</strong></p>
        <pre style={{ background: "#f0f0f0", padding: 16, wordBreak: "break-all" }}>
          {(session as any).accessToken ?? "not in session"}
        </pre>
        <p><strong>Refresh Token:</strong></p>
        <pre style={{ background: "#f0f0f0", padding: 16, wordBreak: "break-all" }}>
          {(session as any).refreshToken ?? "not in session"}
        </pre>
        <p style={{ color: "red" }}>Copy the Refresh Token above — that&apos;s what we need.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Ravelry Token Setup</h2>
      <button
        onClick={() => signIn("ravelry", { callbackUrl: "/setup" })}
        style={{ padding: "12px 24px", fontSize: 16, cursor: "pointer" }}
      >
        Connect Ravelry Account
      </button>
    </div>
  );
}
