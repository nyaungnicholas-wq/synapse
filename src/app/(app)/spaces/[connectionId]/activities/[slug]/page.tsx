import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/session";
import { requireSpace, memberName } from "@/lib/spaces";
import { getSpacePlan, getSpaceUsage } from "@/lib/entitlements";
import { getActivityBySlug, activityStatusForSpace } from "@/lib/queries";
import { startActivityAction } from "@/actions/together";
import { DIFFICULTY_LABELS } from "@/lib/labels";
import { BackLink, UsageNote, PremiumLock } from "@/components/app/bits";
import { SubmitButton } from "@/components/client";
import { Card, Badge, ButtonLink, Alert } from "@/components/ui";
import { Clock } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Activity" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string; slug: string }>;
  searchParams: Promise<{ blocked?: string }>;
}) {
  const { connectionId, slug } = await params;
  const sp = await searchParams;
  const user = await requireOnboardedUser();
  const space = await requireSpace(connectionId, user.id);

  const activity = await getActivityBySlug(slug);
  if (!activity) notFound();

  const plan = await getSpacePlan(space.id);
  const usage = await getSpaceUsage(space.id);
  const premium = plan.code === "PREMIUM";
  const statusMap = await activityStatusForSpace(space.id);
  const status = statusMap.get(activity.id);

  function forWhom(stepFor: "BOTH" | "OLDER" | "YOUNGER") {
    if (stepFor === "BOTH") return "Both of you";
    const member = space.members.find((m) => m.side === stepFor);
    if (!member) return stepFor === "OLDER" ? "The older one" : "The younger one";
    if (member.userId === user.id) return "You";
    return memberName({ user: member.user });
  }

  return (
    <div className="space-y-6">
      <BackLink href={`/spaces/${space.id}/activities`}>All activities</BackLink>

      {sp.blocked === "limit" && (
        <Alert tone="info" title="Free limit reached">
          You've used this week's free activity. A new one opens on Monday — or upgrade for the full library.
          <Link href="/billing" className="ml-2 underline">See Premium</Link>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Badge>{activity.category.name}</Badge>
        {activity.collection && (
          <Badge tone="honey">{activity.collection.title}</Badge>
        )}
        {activity.isPremium && <Badge tone="plum">Premium</Badge>}
      </div>

      <h1 className="font-display text-4xl">{activity.title}</h1>
      <p className="text-xl text-ink-soft whitespace-pre-line">{activity.summary}</p>

      <div className="flex flex-wrap items-center gap-4 text-ink-soft">
        <span className="flex items-center gap-1">
          <Clock className="size-5" aria-hidden="true" />
          {activity.estimatedMinutes} minutes
        </span>
        <span>{DIFFICULTY_LABELS[activity.difficulty]}</span>
        <span>{activity.steps.length} steps</span>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="whitespace-pre-line">{activity.description}</div>

          <h2 className="font-display text-2xl">The steps</h2>
          <ol className="space-y-4">
            {activity.steps.map((step) => (
              <li key={step.id}>
                <Card className="flex gap-4 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-soft text-clay-hover font-display text-lg">
                    {step.order}
                  </span>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-display text-lg">{step.title}</h3>
                    <p className="whitespace-pre-line">{step.body}</p>
                    <Badge tone="neutral" className="text-sm">
                      For: {forWhom(step.stepFor)}
                    </Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ol>

          <div className="rounded-card bg-sand p-4">
            <p className="text-sm text-ink-muted">At the end, you'll talk about</p>
            <p className="whitespace-pre-line">{activity.reflectionQuestion}</p>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <Card className="sticky top-24 space-y-4">
            <h2 className="font-display text-xl">Ready?</h2>

            {status?.inProgressSessionId ? (
              <ButtonLink
                size="lg"
                className="w-full"
                href={`/spaces/${space.id}/sessions/${status.inProgressSessionId}`}
              >
                Continue where you left off
              </ButtonLink>
            ) : (activity.isPremium || activity.collection?.isPremium) && !premium ? (
              <PremiumLock />
            ) : (
              <form action={startActivityAction}>
                <input type="hidden" name="connectionId" value={space.id} />
                <input type="hidden" name="activityId" value={activity.id} />
                <SubmitButton size="lg" className="w-full" pendingLabel="Starting…">
                  Start together
                </SubmitButton>
              </form>
            )}

            {status?.completed && (
              <div className="space-y-2">
                <Badge tone="sage">You've done this one before</Badge>
                <p className="text-sm text-ink-soft">You can do it again any time.</p>
              </div>
            )}

            <UsageNote plan={plan} usage={usage} kind="activity" />

            <ul className="space-y-2 text-sm text-ink-soft">
              <li className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">•</span>
                Sit together or call each other
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">•</span>
                Take turns reading the steps aloud
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">•</span>
                There are no wrong answers
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}