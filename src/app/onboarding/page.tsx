import { Logo } from "@/components/site-chrome";
import { Card } from "@/components/ui";
import { OnboardingForm } from "@/components/onboarding-form";
import { requireUser, safeNextPath } from "@/lib/session";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const next = safeNextPath(sp.next);

  const defaults = user.profile
    ? {
        firstName: user.profile.firstName,
        ageRange: user.profile.ageRange,
        relationshipType: user.profile.relationshipType,
        side: user.profile.side,
        connectWithLabel: user.profile.connectWithLabel,
        interests: user.profile.interests,
        goals: user.profile.goals,
      }
    : {};

  return (
    <>
      <header className="border-b border-line px-4 py-3 flex items-center justify-between">
        <Logo />
        <p className="text-sm text-ink-soft">Signed in as {user.email}</p>
      </header>
      <main id="main" className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-wider text-clay mb-2">
          {user.profile?.onboardedAt ? "Your profile" : "Welcome to SYNAPSE"}
        </p>
        <h1 className="font-display text-4xl text-ink mb-3">Let&apos;s get you set up</h1>
        <p className="text-lg text-ink-soft mb-8">
          A few quick questions so we can suggest conversations and activities that
          fit you. You can change any answer later in Settings.
        </p>
        <Card>
          <OnboardingForm next={next} defaults={defaults} />
        </Card>
      </main>
    </>
  );
}
