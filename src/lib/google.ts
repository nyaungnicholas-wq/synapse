import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { randomToken } from "@/lib/crypto";

// Plain OAuth 2.0 authorization-code flow with PKCE against Google's documented endpoints.
export const GOOGLE_STATE_COOKIE = "synapse_oauth";
export const redirectUri = () => `${env.appUrl}/api/auth/google/callback`;

export function googleAuthRequest(next: string) {
  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), cookie: JSON.stringify({ state, verifier, next }) };
}

export type GoogleProfile = { sub: string; email: string; email_verified: boolean; given_name?: string };

export async function exchangeGoogleCode(code: string, verifier: string): Promise<GoogleProfile | null> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return null;
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return null;
  const info = (await infoRes.json()) as Partial<GoogleProfile>;
  if (!info.sub || !info.email) return null;
  return { sub: info.sub, email: info.email.toLowerCase(), email_verified: info.email_verified === true, given_name: info.given_name };
}
