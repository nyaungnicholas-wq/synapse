import { Check } from "lucide-react";
import { cancelMockPremiumAction, manageBillingAction, upgradeAction } from "@/actions/account";
import { Notice } from "@/components/app/bits";
import { ConfirmButton, SubmitButton } from "@/components/client";
import { Alert, Badge, Card, PageHeader, buttonClass } from "@/components/ui";
import { premiumPartnerName, userIsPremium } from "@/lib/entitlements";
import { features } from "@/lib/env";
import { formatDate } from "@/lib/labels";
import { getBillingOverview } from "@/lib/queries";
import { requireOnboardedUser } from "@/lib/session";

export const metadata = { title: "Plan and billing" };

const price = (cents: number, interval: string) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)} / ${interval === "YEAR" ? "year" : "month"}`;

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const user = await requireOnboardedUser();
  const [{ subscription, plans }, mine, partner] = await Promise.all([
    getBillingOverview(user.id),
    userIsPremium(user.id),
    premiumPartnerName(user.id),
  ]);
  const paymentProblem = subscription?.provider === "STRIPE" && subscription.status === "PAST_DUE";
  const canUpgrade = !mine && !paymentProblem && !partner && (features.stripe || features.mockBilling);

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title="Plan and billing"
        description="Premium is shared: if either of you has it, you both get everything."
      />
      <Notice
        value={sp.status}
        messages={{
          success: "Premium is active. Thank you — enjoy everything together.",
          cancelled: "Checkout was cancelled. Nothing was charged.",
          "cancelled-plan": "Your Premium plan has been cancelled.",
        }}
      />
      <Notice tone="error" value={sp.status} messages={{ unavailable: "Payments aren't available right now. Please try again later." }} />

      {features.mockBilling && (
        <div className="mb-6">
          <Alert tone="info" title="Development mode">
            Stripe isn&apos;t connected, so upgrades use a test checkout. No real payment is taken.
          </Alert>
        </div>
      )}

      <Card className="mb-8">
        <h2 className="font-display text-2xl">Your plan</h2>
        {paymentProblem ? (
          <>
            <p className="mt-2 text-lg">There&apos;s a problem with your last payment.</p>
            <p className="text-ink-soft">Please update your card so Premium keeps working for both of you.</p>
          </>
        ) : mine ? (
          <>
            <p className="mt-2 text-lg">You have Premium.</p>
            {subscription?.currentPeriodEnd && (
              <p className="text-ink-soft">
                {subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} on {formatDate(subscription.currentPeriodEnd)}.
              </p>
            )}
          </>
        ) : partner ? (
          <p className="mt-2 text-lg">You have Premium through your Connection Space with {partner}. There&apos;s nothing to pay.</p>
        ) : (
          <p className="mt-2 text-lg">You&apos;re on the free plan.</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {subscription?.provider === "STRIPE" && subscription.status !== "CANCELED" && (
            <form action={manageBillingAction}>
              <button type="submit" className={buttonClass(paymentProblem ? "primary" : "secondary")}>
                {paymentProblem ? "Update payment details" : "Manage billing"}
              </button>
            </form>
          )}
          {mine && subscription?.provider === "MOCK" && (
            <form action={cancelMockPremiumAction}>
              <ConfirmButton variant="secondary" message="Cancel the test Premium plan?">
                Cancel test plan
              </ConfirmButton>
            </form>
          )}
          {canUpgrade && (
            <form action={upgradeAction}>
              <SubmitButton size="lg" pendingLabel="Opening checkout…">
                Upgrade to Premium
              </SubmitButton>
            </form>
          )}
          {!mine && !partner && !paymentProblem && !canUpgrade && <p className="text-ink-soft">Upgrades aren&apos;t available yet.</p>}
        </div>
      </Card>

      <section aria-labelledby="compare" className="mb-8">
        <h2 id="compare" className="mb-4 font-display text-2xl">
          Compare plans
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {plans.map((plan) => {
            const current = plan.code === "PREMIUM" ? mine || Boolean(partner) : !mine && !partner;
            return (
              <Card key={plan.code} className={current ? "border-2 border-sage" : undefined}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl">{plan.name}</h3>
                  {current && <Badge tone="sage">Your plan</Badge>}
                </div>
                <p className="mt-2 font-display text-3xl">{price(plan.priceCents, plan.interval)}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check aria-hidden="true" className="mt-1 size-5 shrink-0 text-sage" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>
      <p className="text-ink-soft">
        Cancel anytime. Everything you&apos;ve saved stays in your scrapbook, even on the free plan — you just can&apos;t add more than 30
        memories.
      </p>
    </>
  );
}
