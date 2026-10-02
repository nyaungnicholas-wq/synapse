import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/session";
import { features } from "@/lib/env";
import { db } from "@/lib/db";
import { confirmMockCheckoutAction } from "@/actions/account";
import { Card, Badge, Alert, ButtonLink } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { Check } from "lucide-react";

export const metadata = { title: "Test checkout" };

export default async function MockCheckoutPage() {
  await requireOnboardedUser();
  if (!features.mockBilling) notFound();
  const premiumPlan = await db.plan.findUnique({ where: { code: "PREMIUM" } });
  if (!premiumPlan) notFound();
  return (
    <Card className="max-w-lg mx-auto space-y-6">
      <Badge tone="honey">Development mode — no real payment</Badge>
      <h1 className="font-display text-3xl">SYNAPSE Premium</h1>
      <p className="text-ink">
        ${(premiumPlan.priceCents / 100).toFixed(2)} / {premiumPlan.interval === "YEAR" ? "year" : "month"}
      </p>
      <ul className="space-y-2 text-ink">
        {premiumPlan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-sage shrink-0 mt-0.5" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <Alert tone="info">
        This is a test checkout used while Stripe is not connected. Pressing the button below gives your account Premium for 30 days without any payment.
      </Alert>
      <form action={confirmMockCheckoutAction}>
        <SubmitButton size="lg" className="w-full" pendingLabel="Activating…">
          Activate test Premium
        </SubmitButton>
      </form>
      <ButtonLink href="/billing" variant="quiet">Cancel</ButtonLink>
    </Card>
  );
}
