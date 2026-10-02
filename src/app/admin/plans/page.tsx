import { PlanForm } from "@/components/admin/config-forms";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Plans" };

export default async function PlansPage() {
  await requireAdmin();
  const plans = await db.plan.findMany({ orderBy: { priceCents: "asc" } });

  return (
    <>
      <PageHeader
        title="Subscription plans"
        description="Limits apply to each Connection Space per week. Premium is shared by both people in a space."
      />
      <div className="mb-8">
        <Alert tone="info">
          Prices shown here are what people see. Real charges come from the Stripe price ID when Stripe is connected.
        </Alert>
      </div>
      {plans.length === 0 ? (
        <EmptyState title="No plans yet">Run the seed script to create the Free and Premium plans.</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((p) => (
            <Card key={p.code}>
              <h2 className="mb-4 font-display text-2xl">{p.name}</h2>
              <PlanForm
                plan={{
                  code: p.code,
                  name: p.name,
                  priceCents: p.priceCents,
                  interval: p.interval,
                  features: p.features,
                  weeklyPromptLimit: p.weeklyPromptLimit,
                  weeklyActivityLimit: p.weeklyActivityLimit,
                  memoryLimit: p.memoryLimit,
                  stripePriceId: p.stripePriceId,
                  active: p.active,
                }}
              />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
