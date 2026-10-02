"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { consumeAuthToken, issueAuthToken } from "@/lib/auth-tokens";
import { demoPartnerId } from "@/lib/demo";
import { emails, sendEmail } from "@/lib/email";
import { clientIp, HOUR, MINUTE, rateLimit } from "@/lib/rate-limit";
import { createSession, destroySession, requireUser, safeNextPath } from "@/lib/session";
import {
  type ActionState,
  email,
  fieldErrorsOf,
  forgotSchema,
  formToObject,
  loginSchema,
  resetSchema,
  signupSchema,
} from "@/lib/validation";

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

// Keeps login timing the same whether or not the email exists.
const DUMMY_HASH = hashPassword("synapse-timing-equaliser");

async function sendVerification(userId: string, email: string) {
  const token = await issueAuthToken(userId, "EMAIL_VERIFY");
  await sendEmail({ to: email, ...emails.verify(`${env.appUrl}/verify-email?token=${token}`) });
}

export async function signupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!rateLimit(`signup:${ip}`, 10, HOUR)) return { error: TOO_MANY };

  const parsed = signupSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { email, password, next } = parsed.data;
  if (!rateLimit(`signup-email:${email}`, 3, HOUR)) return { error: TOO_MANY };

  // ponytail: this reveals that an email is registered; rate-limited above. Clearer for
  // first-time older users than a silent "check your email". Revisit if enumeration matters.
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { fieldErrors: { email: ["There is already an account with this email. Log in instead, or reset your password."] } };
  }

  const user = await db.user.create({ data: { email, passwordHash: await hashPassword(password) } });
  await sendVerification(user.id, email);
  await createSession(user.id);
  redirect(`/onboarding?next=${encodeURIComponent(safeNextPath(next))}`);
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { email, password, next } = parsed.data;

  const ip = await clientIp();
  if (!rateLimit(`login-ip:${ip}`, 30, 15 * MINUTE) || !rateLimit(`login-email:${email}`, 8, 15 * MINUTE)) {
    return { error: TOO_MANY };
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : (await verifyPassword(password, await DUMMY_HASH), false);
  if (!user || !ok || user.status !== "ACTIVE") {
    return { error: "That email and password do not match. Please check them and try again." };
  }

  await createSession(user.id);
  redirect(safeNextPath(next));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = forgotSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { email } = parsed.data;

  const ip = await clientIp();
  if (!rateLimit(`forgot-ip:${ip}`, 10, HOUR) || !rateLimit(`forgot-email:${email}`, 3, HOUR)) {
    return { error: TOO_MANY };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE") {
    const token = await issueAuthToken(user.id, "PASSWORD_RESET");
    await sendEmail({ to: email, ...emails.reset(`${env.appUrl}/reset-password?token=${token}`) });
  }
  // Same answer either way, so this form cannot be used to discover who has an account.
  return { ok: true, message: "If there is an account for that email, we have sent a link to reset the password. It works for one hour." };
}

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!rateLimit(`reset:${ip}`, 10, HOUR)) return { error: TOO_MANY };

  const parsed = resetSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const userId = await consumeAuthToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) return { error: "This reset link has expired or was already used. Please ask for a new one." };

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      // Following the emailed link proves they own the address.
      data: { passwordHash: await hashPassword(parsed.data.password), emailVerifiedAt: new Date() },
    }),
    db.session.deleteMany({ where: { userId } }), // sign out every other device
  ]);
  await createSession(userId);
  redirect("/dashboard?notice=password-reset");
}

const changeEmailSchema = z.object({ email, current: z.string().max(200).optional() });

/** Changes the sign-in email. Requires the current password; the new address must be confirmed again. */
export async function changeEmailAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!rateLimit(`email-change:${user.id}`, 5, HOUR)) return { error: TOO_MANY };
  const parsed = changeEmailSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { email: next, current } = parsed.data;
  if (!user.passwordHash) {
    return { error: "Please set a password first (below), then you can change your email." };
  }
  if (!(await verifyPassword(current ?? "", user.passwordHash))) {
    return { fieldErrors: { current: ["That is not your current password."] } };
  }
  if (next === user.email) return { fieldErrors: { email: ["That is already your email address."] } };
  if (await db.user.findUnique({ where: { email: next }, select: { id: true } })) {
    return { fieldErrors: { email: ["That email address is already in use."] } };
  }
  await db.user.update({ where: { id: user.id }, data: { email: next, emailVerifiedAt: null } });
  await sendEmail({
    to: user.email,
    subject: "Your SYNAPSE email address was changed",
    text: `The email address for your SYNAPSE account was changed to ${next}.

If you did not do this, please reset your password straight away and contact us.`,
  });
  await sendVerification(user.id, next);
  return { ok: true, message: `Done. We sent a confirmation link to ${next}.` };
}

/** Demo only: switch to the other person in your demo space ("see it from Rose's side"). */
export async function switchDemoPersonAction(): Promise<void> {
  const user = await requireUser();
  if (!user.isDemo) redirect("/dashboard");
  const partner = await demoPartnerId(user.id);
  if (!partner) redirect("/dashboard");
  await destroySession();
  await createSession(partner);
  redirect("/dashboard");
}

/** Demo only: leave the demo and go to the real sign-up page. */
export async function leaveDemoAction(): Promise<void> {
  await destroySession();
  redirect("/signup");
}

export async function resendVerificationAction(): Promise<ActionState> {
  const user = await requireUser();
  if (user.emailVerifiedAt) return { ok: true, message: "Your email is already confirmed." };
  if (!rateLimit(`verify-resend:${user.id}`, 3, HOUR)) return { error: TOO_MANY };
  await sendVerification(user.id, user.email);
  return { ok: true, message: `We sent a new confirmation link to ${user.email}.` };
}
