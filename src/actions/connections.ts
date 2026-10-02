"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { emails, sendEmail } from "@/lib/email";
import { acceptInvitation, createInvitation, type AcceptResult } from "@/lib/invitations";
import { HOUR, rateLimit } from "@/lib/rate-limit";
import { requireOnboardedUser, requireUser } from "@/lib/session";
import { getSpace } from "@/lib/spaces";
import { type ActionState, email, fieldErrorsOf, formToObject, id, profileSchema, text } from "@/lib/validation";

const ACCEPT_ERRORS: Record<Exclude<AcceptResult, { ok: true }>["reason"], string> = {
  not_found: "We could not find that code. Please check the letters and numbers and try again.",
  expired: "This invitation has expired. Ask the person who invited you to send a new one.",
  accepted: "This invitation has already been used.",
  revoked: "This invitation was cancelled. Ask the person who invited you to send a new one.",
  full: "This Connection Space already has two people in it.",
  own: "This is your own invitation. Send the code or link to the person you want to connect with.",
};

const inviteSchema = z.object({
  connectionId: id.optional().or(z.literal("").transform(() => undefined)),
  email: email.optional().or(z.literal("").transform(() => undefined)),
});

/** Creates an invitation (and a waiting Connection Space if needed). Optionally emails it. */
export async function createInviteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOnboardedUser();
  const parsed = inviteSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { connectionId, email: to } = parsed.data;

  if (!rateLimit(`invite:${user.id}`, 15, 24 * HOUR)) {
    return { error: "You have created a lot of invitations today. Please try again tomorrow." };
  }
  if (to && user.isDemo) {
    return { error: "Email invitations are turned off in the demo. You can still create a link or code." };
  }
  if (to) {
    if (!user.emailVerifiedAt) {
      return { error: "Please confirm your own email address before we send invitations by email. You can still share the link or code." };
    }
    if (to === user.email) return { fieldErrors: { email: ["Please enter the other person's email, not your own."] } };
  }

  let invitation;
  try {
    invitation = await createInvitation({ inviterId: user.id, inviterSide: user.profile.side, connectionId, email: to });
  } catch {
    return { error: "We could not create that invitation. Please refresh the page and try again." };
  }

  const url = `${env.appUrl}/invite/${invitation.code}`;
  if (to) await sendEmail({ to, ...emails.invitation(user.profile.firstName, url, invitation.code) });
  revalidatePath("/connect");
  revalidatePath("/dashboard");
  return { ok: true, message: to ? `Invitation sent to ${to}.` : "Your invitation is ready to share." };
}

export async function revokeInviteAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const invitationId = id.safeParse(form.get("invitationId"));
  if (!invitationId.success) return;
  await db.invitation.updateMany({
    where: { id: invitationId.data, inviterId: user.id, status: "PENDING" },
    data: { status: "REVOKED" },
  });
  revalidatePath("/connect");
}

async function acceptAndRedirect(code: string, userId: string, onboarded: boolean): Promise<ActionState> {
  if (!rateLimit(`accept:${userId}`, 20, HOUR)) return { error: "Too many attempts. Please wait a little and try again." };
  const result = await acceptInvitation(code, userId);
  if (!result.ok) return { error: ACCEPT_ERRORS[result.reason] };
  revalidatePath("/dashboard");
  const destination = `/spaces/${result.connectionId}`;
  redirect(onboarded ? destination : `/onboarding?next=${encodeURIComponent(destination)}`);
}

/** "I have a code" form on /connect. */
export async function joinWithCodeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const code = String(form.get("code") ?? "").slice(0, 32);
  if (!code.trim()) return { fieldErrors: { code: ["Please enter the code from your invitation."] } };
  return acceptAndRedirect(code, user.id, Boolean(user.profile?.onboardedAt));
}

/** The "Join" button on /invite/[code]. */
export async function acceptInviteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  return acceptAndRedirect(String(form.get("code") ?? "").slice(0, 32), user.id, Boolean(user.profile?.onboardedAt));
}

const reportSchema = z.object({
  connectionId: id,
  reason: z.enum(["uncomfortable", "scam", "harmful", "account", "other"], "Please choose a reason."),
  details: text(2000, 10),
});

export async function reportConcernAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reportSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (!(await getSpace(parsed.data.connectionId, user.id))) return { error: "We could not find that Connection Space." };
  if (!rateLimit(`report:${user.id}`, 5, HOUR)) return { error: "Please wait a little before sending another report." };
  await db.report.create({ data: { reporterId: user.id, ...parsed.data } });
  return { ok: true, message: "Thank you. Our team will look at this. If anyone is in danger, please contact local emergency services." };
}

/** Leaving is always allowed; a space with nobody left is archived. */
export async function leaveSpaceAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const connectionId = id.safeParse(form.get("connectionId"));
  if (!connectionId.success || !(await getSpace(connectionId.data, user.id))) redirect("/dashboard");
  await db.$transaction(async (tx) => {
    await tx.connectionMember.delete({ where: { connectionId_userId: { connectionId: connectionId.data, userId: user.id } } });
    const remaining = await tx.connectionMember.count({ where: { connectionId: connectionId.data } });
    // Closed for good: the person who stays keeps the history, but nobody new can join and read it.
    await tx.connection.update({
      where: { id: connectionId.data },
      data: remaining === 0 ? { status: "ARCHIVED", closedAt: new Date() } : { closedAt: new Date() },
    });
    await tx.invitation.updateMany({ where: { connectionId: connectionId.data, status: "PENDING" }, data: { status: "REVOKED" } });
  });
  revalidatePath("/dashboard");
  redirect("/dashboard?notice=left-space");
}

/** Onboarding: creates or updates the profile, then continues to `next` (or the invite step). */
export async function saveOnboardingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(formToObject(form, ["interests", "goals"]));
  if (!parsed.success) {
    return { error: "A few answers need another look.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const data = { ...parsed.data, onboardedAt: user.profile?.onboardedAt ?? new Date() };
  await db.profile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });

  const next = String(form.get("next") ?? "");
  if (next.startsWith("/") && !next.startsWith("//") && next !== "/dashboard") redirect(next);
  const spaces = await db.connectionMember.count({ where: { userId: user.id } });
  redirect(spaces ? "/dashboard" : "/connect?welcome=1");
}
