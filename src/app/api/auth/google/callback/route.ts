import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { exchangeGoogleCode, GOOGLE_STATE_COOKIE } from "@/lib/google";
import { clientIp, HOUR, rateLimit } from "@/lib/rate-limit";
import { createSession, safeNextPath } from "@/lib/session";

const fail = () => NextResponse.redirect(`${env.appUrl}/login?error=google-failed`);

export async function GET(req: NextRequest) {
  if (!features.google || !rateLimit(`google:${await clientIp()}`, 30, HOUR)) return fail();
  const raw = req.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  let saved: { state?: string; verifier?: string; next?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {}
  if (!code || !state || !saved.state || state !== saved.state || !saved.verifier) return fail();

  const profile = await exchangeGoogleCode(code, saved.verifier);
  if (!profile || !profile.email_verified) return fail();

  // Link by Google id first; fall back to a verified email match; otherwise create the account.
  let user = await db.user.findUnique({ where: { googleId: profile.sub } });
  if (!user) {
    const byEmail = await db.user.findUnique({ where: { email: profile.email } });
    if (byEmail && !byEmail.emailVerifiedAt) {
      // Someone registered this address without ever proving they own it. Google just proved the
      // real owner is here, so the unproven password and its sessions are discarded before linking.
      await db.session.deleteMany({ where: { userId: byEmail.id } });
    }
    user = byEmail
      ? await db.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: profile.sub,
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
            ...(byEmail.emailVerifiedAt ? {} : { passwordHash: null }),
          },
        })
      : await db.user.create({ data: { email: profile.email, googleId: profile.sub, emailVerifiedAt: new Date() } });
  }
  if (user.status !== "ACTIVE") return fail();

  await createSession(user.id);
  const profileDone = await db.profile.findFirst({ where: { userId: user.id, onboardedAt: { not: null } } });
  const next = safeNextPath(saved.next);
  const res = NextResponse.redirect(
    `${env.appUrl}${profileDone ? next : `/onboarding?next=${encodeURIComponent(next)}`}`,
  );
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  return res;
}
