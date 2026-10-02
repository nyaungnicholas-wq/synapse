import { requireOnboardedUser } from "@/lib/session";
import { requireSpace } from "@/lib/spaces";
import { getSpacePlan, getSpaceUsage } from "@/lib/entitlements";
import {
  listActivityCategories,
  listActivities,
  activityStatusForSpace,
  getCollections,
} from "@/lib/queries";
import { DIFFICULTY_LABELS } from "@/lib/labels";
import { BackLink, UsageNote } from "@/components/app/bits";
import { Card, Badge, PageHeader, EmptyState, SectionTitle, pillClass } from "@/components/ui";
import { Clock, Lock } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Activities" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { connectionId } = await params;
  const { category } = await searchParams;
  const user = await requireOnboardedUser();
  const space = await requireSpace(connectionId, user.id);

  const [plan, usage, categories, activities, status, collections] = await Promise.all([
    getSpacePlan(space.id),
    getSpaceUsage(space.id),
    listActivityCategories(),
    listActivities(category),
    activityStatusForSpace(space.id),
    getCollections(),
  ]);

  const premium = plan.code === "PREMIUM";

  return (
    <>
      <BackLink href={`/spaces/${space.id}`}>Back to {spaceTitle(space)}</BackLink>
      <PageHeader
        eyebrow="Activities"
        title="Things to do together"
        description="Each activity comes with simple steps. Do it side by side, or on a phone or video call."
      />

      {collections.current && !category && (
        <Card className="bg-sage-soft border-0 mb-8" as="section">
          <div className="space-y-2">
            <Badge tone="sage">This month's collection</Badge>
            <h2 className="font-display text-2xl">{collections.current.title}</h2>
            <p className="text-ink-soft">{collections.current.description}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {collections.current.activities.map((a) => (
                <Link
                  key={a.id}
                  href={`/spaces/${space.id}/activities/${a.slug}`}
                  className="inline-flex"
                >
                  <Badge tone="sage">{a.title}</Badge>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      )}

      <nav aria-label="Activity types" className="mb-8">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/spaces/${space.id}/activities`}
            className={pillClass(!category)}
            aria-current={!category ? "true" : undefined}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/spaces/${space.id}/activities?category=${c.slug}`}
              className={pillClass(category === c.slug)}
              aria-current={category === c.slug ? "true" : undefined}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>

      <UsageNote plan={plan} usage={usage} kind="activity" />

      {activities.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-12 w-12 text-ink-muted" aria-hidden="true" />}
          title="No activities here yet"
        >
          <p className="text-ink-soft">
            {category
              ? "No activities in this category. Try another filter."
              : "Check back soon — new activities are added regularly."}
          </p>
        </EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((a) => {
            const s = status.get(a.id);
            const completed = s?.completed ?? false;
            const inProgress = s?.inProgressSessionId ?? null;
            return (
              <article
                key={a.id}
                className="relative flex flex-col h-full"
                style={{ minHeight: "48px" }}
              >
                <Card as="article" className="flex flex-col h-full">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge tone="neutral">{a.category.name}</Badge>
                    {a.isPremium && <Badge tone="plum">Premium</Badge>}
                    {completed && <Badge tone="sage">Done</Badge>}
                    {inProgress && <Badge tone="honey">In progress</Badge>}
                  </div>
                  <Link
                    href={`/spaces/${space.id}/activities/${a.slug}`}
                    className="relative z-10 after:absolute after:inset-0"
                    aria-label={`View ${a.title}`}
                  >
                    <h2 className="font-display text-2xl text-clay hover:underline">
                      {a.title}
                    </h2>
                  </Link>
                  <p className="text-ink-soft mt-2 flex-1">{a.summary}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted mt-4 mt-auto">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      {a.estimatedMinutes} min
                    </span>
                    <span>{DIFFICULTY_LABELS[a.difficulty]}</span>
                    <span>{a._count.steps} steps</span>
                    {a.isPremium && !premium && (
                      <span className="flex items-center gap-1 text-plum">
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        Premium
                      </span>
                    )}
                  </div>
                </Card>
              </article>
            );
          })}
        </div>
      )}

      {collections.upcoming.length > 0 && (
        <section className="mt-12" aria-labelledby="coming-soon">
          <SectionTitle id="coming-soon">Coming soon</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {collections.upcoming.map((c) => (
              <Card key={c.id} className="p-4">
                <time
                  dateTime={c.month.toISOString().split("T")[0]}
                  className="text-sm text-ink-muted"
                >
                  {new Date(c.month).toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </time>
                <h3 className="font-display text-xl mt-1">{c.title}</h3>
                <p className="text-ink-soft text-sm mt-2 line-clamp-2">{c.description}</p>
                {c.isPremium && (
                  <Badge tone="plum" className="mt-3 inline-flex">
                    Premium
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function spaceTitle(space: { partner: { user: { email: string; profile: { firstName: string } | null } } | null }) {
  return space.partner?.user.profile?.firstName ? `your space with ${space.partner.user.profile.firstName}` : "your space";
}
