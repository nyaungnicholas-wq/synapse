"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { activateMockPremium, billingPortalUrl, cancelMockPremium, startCheckout } from "@/lib/billing";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { HOUR, rateLimit } from "@/lib/rate-limit";
import { destroyOtherSessions, requireOnboardedUser, requireUser } from "@/lib/session";
import { type ActionState, fieldErrorsOf, formToObject, password, profileSchema, TEXT_SIZES } from "@/lib/validation";

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOnboardedUser();
  const parsed = profileSchema
    .extend({ textSize: z.enum(TEXT_SIZES) })
    .safeParse(formToObject(form, ["interests", "goals"]));
  if (!parsed.success) return { error: "A few answers need another look.", fieldErrors: fieldErrorsOf(parsed.error) };
  await db.profile.update({ where: { userId: user.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Your profile is saved." };
}

/** One-tap text size change from the header; applies everywhere immediately. */
export async function setTextSizeAction(form: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const size = z.enum(TEXT_SIZES).safeParse(form.get("textSize"));
  if (size.success) await db.profile.update({ where: { userId: user.id }, data: { textSize: size.data } });
  revalidatePath("/", "layout");
}

const passwordSchema = z
  .object({ current: z.string().max(200).optional(), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "The two passwords do not match.", path: ["confirm"] });

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.isDemo) return { error: "Demo accounts can't have a password. Create a real account to keep your own." };
  if (!rateLimit(`password:${user.id}`, 5, HOUR)) return { error: "Too many attempts. Please try again later." };
  const parsed = passwordSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  // Google-only accounts have no password yet and may set one; everyone else must prove the old one.
  if (user.passwordHash && !(await verifyPassword(parsed.data.current ?? "", user.passwordHash))) {
    return { fieldErrors: { current: ["That is not your current password."] } };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await destroyOtherSessions(user.id);
  return { ok: true, message: "Your password has been changed. Any other devices have been signed out." };
}

export async function upgradeAction(): Promise<void> {
  const user = await requireOnboardedUser();
  let url: string;
  try {
    url = await startCheckout(user);
  } catch {
    redirect("/billing?status=unavailable");
  }
  redirect(url);
}

export async function manageBillingAction(): Promise<void> {
  const user = await requireOnboardedUser();
  const url = await billingPortalUrl(user.id).catch(() => null);
  redirect(url ?? "/billing?status=unavailable");
}

export async function confirmMockCheckoutAction(): Promise<void> {
  const user = await requireOnboardedUser();
  await activateMockPremium(user.id); // throws (and never grants) when mock billing is disabled
  revalidatePath("/", "layout");
  redirect("/billing?status=success");
}

export async function cancelMockPremiumAction(): Promise<void> {
  const user = await requireOnboardedUser();
  await cancelMockPremium(user.id);
  revalidatePath("/", "layout");
  redirect("/billing?status=cancelled-plan");
}
