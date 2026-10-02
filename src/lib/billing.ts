import "server-only";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import type { SubscriptionStatus } from "@/generated/prisma/enums";

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!features.stripe) throw new Error("Stripe is not configured");
  stripeClient ??= new Stripe(env.stripe.secretKey);
  return stripeClient;
}

/** Where the "Upgrade" button sends the user: Stripe Checkout, or the dev-only mock page. */
export async function startCheckout(user: { id: string; email: string }): Promise<string> {
  if (features.stripe) {
    const existing = await db.subscription.findUnique({ where: { userId: user.id } });
    // Never start a second subscription while one is live or failing: send them to manage it instead.
    if (existing?.provider === "STRIPE" && existing.status !== "CANCELED") {
      return (await billingPortalUrl(user.id)) ?? "/billing";
    }
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: env.stripe.premiumPriceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
      ...(existing?.stripeCustomerId ? { customer: existing.stripeCustomerId } : { customer_email: user.email }),
      success_url: `${env.appUrl}/billing?status=success`,
      cancel_url: `${env.appUrl}/billing?status=cancelled`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return session.url;
  }
  if (features.mockBilling) return "/billing/mock-checkout";
  throw new Error("Billing is not configured");
}

export async function billingPortalUrl(userId: string): Promise<string | null> {
  if (!features.stripe) return null;
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeCustomerId) return null;
  const portal = await stripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.appUrl}/billing`,
  });
  return portal.url;
}

/** Development only: grants Premium for 30 days with no payment. Refuses when mock billing is off. */
export async function activateMockPremium(userId: string): Promise<void> {
  if (!features.mockBilling) throw new Error("Mock billing is disabled");
  const data = {
    planCode: "PREMIUM" as const,
    status: "ACTIVE" as const,
    provider: "MOCK" as const,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
  };
  await db.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

export async function cancelMockPremium(userId: string): Promise<void> {
  if (!features.mockBilling) throw new Error("Mock billing is disabled");
  await db.subscription.updateMany({
    where: { userId, provider: "MOCK" },
    data: { status: "CANCELED", cancelAtPeriodEnd: false, currentPeriodEnd: new Date() },
  });
}

export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "paused":
      return "PAST_DUE";
    default:
      return "CANCELED";
  }
}

async function upsertFromStripeSubscription(sub: Stripe.Subscription, fallbackUserId?: string | null) {
  const userId = sub.metadata?.userId || fallbackUserId;
  if (!userId) return;
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, subscription: true } });
  if (!user) return;
  // Events can arrive late or out of order: an old subscription ending must not cancel the current one.
  const current = user.subscription;
  if (current?.stripeSubscriptionId && current.stripeSubscriptionId !== sub.id && mapStripeStatus(sub.status) === "CANCELED") {
    return;
  }
  const periodEnd = sub.items.data[0]?.current_period_end;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const data = {
    planCode: "PREMIUM" as const,
    provider: "STRIPE" as const,
    status: mapStripeStatus(sub.status),
    stripeCustomerId: customer,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
  await db.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

/** Applies a verified Stripe webhook event. Idempotent: replaying an event writes the same row. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return;
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const sub = await stripe().subscriptions.retrieve(subId);
      await upsertFromStripeSubscription(sub, session.client_reference_id);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await upsertFromStripeSubscription(event.data.object);
      return;
    default:
      return;
  }
}
