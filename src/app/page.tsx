import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-chrome";
import { Hero, Problem, HowItWorks, ExampleActivities, ExamplePrompts } from "@/components/landing/sections-a";
import { Benefits, WhoItsFor, Testimonials, Pricing, Faq, FinalCta } from "@/components/landing/sections-b";
import { SiteFooter } from "@/components/site-chrome";

export default async function Home({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  const user = await getCurrentUser();
  const plans = await db.plan.findMany({
    where: { active: true },
    orderBy: { priceCents: "asc" },
  });
  const pricingPlans = plans.map((plan) => ({
    code: plan.code,
    name: plan.name,
    priceCents: plan.priceCents,
    interval: plan.interval,
    features: plan.features ?? [],
  }));

  return (
    <>
      <SiteHeader signedIn={Boolean(user)} />
      <main id="main">
        {demo === "busy" && (
          <p role="status" className="bg-honey-soft px-4 py-3 text-center font-semibold text-honey-ink">
            Lots of people are trying the demo right now. Please try again in a few minutes.
          </p>
        )}
        <Hero />
        <Problem />
        <HowItWorks />
        <ExampleActivities />
        <ExamplePrompts />
        <Benefits />
        <WhoItsFor />
        <Testimonials />
        <Pricing plans={pricingPlans} />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
