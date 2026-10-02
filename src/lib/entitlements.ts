import "server-only";
import { db } from "@/lib/db";
import type { PlanCode } from "@/generated/prisma/enums";

export type PlanLimits = {
  code: PlanCode;
  name: string;
  weeklyPromptLimit: number | null;
  weeklyActivityLimit: number | null;
  memoryLimit: number | null;
};

// Used only if the Plan table has not been seeded; admins edit the real values.
export const DEFAULT_PLANS: Record<PlanCode, PlanLimits> = {
  FREE: { code: "FREE", name: "Free", weeklyPromptLimit: 3, weeklyActivityLimit: 1, memoryLimit: 30 },
  PREMIUM: { code: "PREMIUM", name: "Premium", weeklyPromptLimit: null, weeklyActivityLimit: null, memoryLimit: null },
};

/** Monday 00:00 UTC of the week containing `now`. Weekly limits reset here. */
export function startOfWeek(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}

/** A subscription counts while it is active/trialing and not past its paid-through date. */
export function isPremiumSubscription(
  sub: { planCode: PlanCode; status: string; currentPeriodEnd: Date | null } | null | undefined,
  now = new Date(),
): boolean {
  if (!sub || sub.planCode !== "PREMIUM") return false;
  if (sub.status !== "ACTIVE" && sub.status !== "TRIALING") return false;
  return !sub.currentPeriodEnd || sub.currentPeriodEnd > now;
}

export async function userIsPremium(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  return isPremiumSubscription(sub);
}

/** First name of a space partner whose Premium this user shares, or null. */
export async function premiumPartnerName(userId: string): Promise<string | null> {
  const partners = await db.user.findMany({
    where: {
      id: { not: userId },
      memberships: { some: { connection: { status: "ACTIVE", members: { some: { userId } } } } },
    },
    include: { subscription: true, profile: { select: { firstName: true } } },
  });
  const giver = partners.find((p) => isPremiumSubscription(p.subscription));
  return giver ? (giver.profile?.firstName ?? "your partner") : null;
}

async function planLimits(code: PlanCode): Promise<PlanLimits> {
  const plan = await db.plan.findUnique({ where: { code } });
  return plan ?? DEFAULT_PLANS[code];
}

/**
 * Premium is shared across a Connection Space: if either person pays, both get it.
 * (A grandchild can gift Premium to a grandparent without the grandparent paying.)
 */
export async function getSpacePlan(connectionId: string): Promise<PlanLimits> {
  const subs = await db.subscription.findMany({
    where: { user: { memberships: { some: { connectionId } } } },
  });
  return planLimits(subs.some((s) => isPremiumSubscription(s)) ? "PREMIUM" : "FREE");
}

export async function getSpaceUsage(connectionId: string) {
  const since = startOfWeek();
  const [conversationsThisWeek, activitiesThisWeek, memories] = await Promise.all([
    db.conversation.count({ where: { connectionId, createdAt: { gte: since } } }),
    db.activitySession.count({ where: { connectionId, createdAt: { gte: since } } }),
    db.memory.count({ where: { connectionId } }),
  ]);
  return { conversationsThisWeek, activitiesThisWeek, memories };
}

export type Gate = { allowed: true } | { allowed: false; reason: "premium" | "limit"; message: string };

/** Pure decision used by actions and pages; kept separate from the queries so it is easy to test. */
export function decide(
  kind: "prompt" | "activity" | "memory",
  plan: PlanLimits,
  usage: { conversationsThisWeek: number; activitiesThisWeek: number; memories: number },
  itemIsPremium = false,
): Gate {
  if (itemIsPremium && plan.code !== "PREMIUM") {
    return { allowed: false, reason: "premium", message: "This one is part of SYNAPSE Premium." };
  }
  if (kind === "prompt" && plan.weeklyPromptLimit !== null && usage.conversationsThisWeek >= plan.weeklyPromptLimit) {
    return {
      allowed: false,
      reason: "limit",
      message: `You have started ${plan.weeklyPromptLimit} conversations this week, which is the free limit. New ones open up on Monday.`,
    };
  }
  if (kind === "activity" && plan.weeklyActivityLimit !== null && usage.activitiesThisWeek >= plan.weeklyActivityLimit) {
    return {
      allowed: false,
      reason: "limit",
      message: `You have started ${plan.weeklyActivityLimit} ${plan.weeklyActivityLimit === 1 ? "activity" : "activities"} this week, which is the free limit. A new one opens up on Monday.`,
    };
  }
  if (kind === "memory" && plan.memoryLimit !== null && usage.memories >= plan.memoryLimit) {
    return {
      allowed: false,
      reason: "limit",
      message: `Your free scrapbook holds ${plan.memoryLimit} memories and it is full. Premium keeps every memory.`,
    };
  }
  return { allowed: true };
}

export async function checkSpaceAllows(connectionId: string, kind: "prompt" | "activity" | "memory", itemIsPremium = false) {
  const [plan, usage] = await Promise.all([getSpacePlan(connectionId), getSpaceUsage(connectionId)]);
  return decide(kind, plan, usage, itemIsPremium);
}
