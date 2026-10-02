import "server-only";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";

type Email = { to: string; subject: string; text: string };

/**
 * Every email is written to EmailOutbox first. With RESEND_API_KEY set it is also sent;
 * without it, development reads the outbox at /dev/mailbox. Never throws: a failed email
 * must not break sign-up, and the failure is recorded on the row instead.
 */
export async function sendEmail(email: Email): Promise<void> {
  const row = await db.emailOutbox.create({ data: email });
  if (!features.realEmail) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom, to: email.to, subject: email.subject, text: email.text }),
    });
    await db.emailOutbox.update({
      where: { id: row.id },
      data: res.ok ? { sentAt: new Date() } : { error: `Resend ${res.status}` },
    });
  } catch (err) {
    await db.emailOutbox.update({ where: { id: row.id }, data: { error: String(err).slice(0, 500) } });
  }
}

export const emails = {
  verify: (url: string): Omit<Email, "to"> => ({
    subject: "Confirm your email for SYNAPSE",
    text: `Welcome to SYNAPSE.\n\nPlease confirm your email address by opening this link:\n${url}\n\nThe link works for 24 hours. If you did not create an account, you can ignore this email.`,
  }),
  reset: (url: string): Omit<Email, "to"> => ({
    subject: "Reset your SYNAPSE password",
    text: `Someone asked to reset the password for this email address.\n\nTo choose a new password, open this link:\n${url}\n\nThe link works for 1 hour. If this was not you, you can ignore this email - your password has not changed.`,
  }),
  invitation: (inviterName: string, url: string, code: string): Omit<Email, "to"> => ({
    subject: `${inviterName} invited you to SYNAPSE`,
    text: `${inviterName} would like to talk and share stories with you on SYNAPSE - a private space for the two of you.\n\nTo join, open this link:\n${url}\n\nOr go to SYNAPSE and enter this code: ${code}\n\nThe invitation works for 7 days.`,
  }),
};
