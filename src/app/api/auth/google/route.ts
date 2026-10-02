import { NextResponse, type NextRequest } from "next/server";
import { env, features } from "@/lib/env";
import { GOOGLE_STATE_COOKIE, googleAuthRequest } from "@/lib/google";
import { safeNextPath } from "@/lib/session";

export async function GET(req: NextRequest) {
  if (!features.google) return NextResponse.redirect(`${env.appUrl}/login?error=google-unavailable`);
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  const { url, cookie } = googleAuthRequest(next);
  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_STATE_COOKIE, cookie, { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
