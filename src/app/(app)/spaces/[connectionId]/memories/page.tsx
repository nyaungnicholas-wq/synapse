import { requireOnboardedUser } from "@/lib/session";
import { requireSpace, memberName } from "@/lib/spaces";
import { getSpacePlan, getSpaceUsage } from "@/lib/entitlements";
import { listMemories, memoryFilterOptions } from "@/lib/queries";
import type { MemoryFilters } from "@/lib/queries";
import { MEMORY_TYPE_LABELS, formatDate } from "@/lib/labels";
import { BackLink, Notice } from "@/components/app/bits";
import {
  PageHeader,
  SelectField,
  buttonClass,
  cx,
  Badge,
  EmptyState,
  ButtonLink,
} from "@/components/ui";
import { Plus, Star, BookHeart } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Memories" };

const VALID_TYPES = ["STORY", "CONVERSATION", "ACTIVITY", "PHOTO", "MOMENT"] as const;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{
    type?: string;
    person?: string;
    category?: string;
    activity?: string;
    year?: string;
    favorite?: string;
    notice?: string;
  }>;
}) {
  const { connectionId } = await params;
  const sp = await searchParams;
  const user = await requireOnboardedUser();
  const space = await requireSpace(connectionId, user.id);

  const options = await memoryFilterOptions(space.id);
  const plan = await getSpacePlan(space.id);
  const usage = await getSpaceUsage(space.id);

  const memberIds = space.members.map((m) => m.userId);
  const type = sp.type && (VALID_TYPES as readonly string[]).includes(sp.type) ? (sp.type as MemoryFilters["type"]) : undefined;
  const personId = sp.person && memberIds.includes(sp.person) ? sp.person : undefined;
  const categoryId = sp.category && options.categories.some((c) => c.id === sp.category) ? sp.category : undefined;
  const activityId = sp.activity && options.activities.some((a) => a.id === sp.activity) ? sp.activity : undefined;
  const year = sp.year && /^\d{4}$/.test(sp.year) && options.years.includes(Number(sp.year)) ? Number(sp.year) : undefined;
  const favorite = sp.favorite === "1";

  const memories = await listMemories(space.id, {
    type,
    personId,
    categoryId,
    activityId,
    year,
    favorite,
  });

  const hasFilters = Boolean(type || personId || categoryId || activityId || year || favorite);
  const partnerName = memberName(space.partner);
  const viewerName = user.profile.firstName;

  return (
    <>
      <BackLink href={`/spaces/${space.id}`}>Back to your space</BackLink>
      <Notice value={sp.notice} messages={{ deleted: "That memory has been deleted." }} />

      <PageHeader
        eyebrow="Memories"
        title="Our scrapbook"
        description="Stories, answers, photos and small moments you've shared."
        actions={
          <ButtonLink size="lg" href={`/spaces/${space.id}/memories/new`}>
            <Plus aria-hidden="true" className="size-5" /> Add a memory
          </ButtonLink>
        }
      />

      {plan.memoryLimit !== null && (
        <p className="text-ink-muted text-sm mb-6">
          {usage.memories} of {plan.memoryLimit} memories used on the free plan.
          {" "}
          <Link href="/billing" className="underline hover:text-clay">Keep every memory with Premium</Link>
        </p>
      )}

      <form method="get" className="grid gap-4 rounded-card bg-sand p-5 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <SelectField
          label="Kind"
          name="type"
          options={[{ value: "", label: "All" }, ...VALID_TYPES.map((t) => ({ value: t, label: MEMORY_TYPE_LABELS[t] }))]}
          defaultValue={type}
        />
        <SelectField
          label="Added by"
          name="person"
          options={[
            { value: "", label: "All" },
            { value: user.id, label: "You" },
            ...(space.partner ? [{ value: space.partner.userId, label: partnerName }] : []),
          ]}
          defaultValue={personId}
        />
        {options.categories.length > 0 && (
          <SelectField
            label="Theme"
            name="category"
            options={[{ value: "", label: "All" }, ...options.categories.map((c) => ({ value: c.id, label: c.name }))]}
            defaultValue={categoryId}
          />
        )}
        {options.activities.length > 0 && (
          <SelectField
            label="Activity"
            name="activity"
            options={[{ value: "", label: "All" }, ...options.activities.map((a) => ({ value: a.id, label: a.title }))]}
            defaultValue={activityId}
          />
        )}
        <SelectField
          label="Year"
          name="year"
          options={[{ value: "", label: "All" }, ...options.years.map((y) => ({ value: String(y), label: String(y) }))]}
          defaultValue={year?.toString()}
        />
        <label className="flex min-h-12 items-center gap-3 font-semibold">
          <input
            type="checkbox"
            name="favorite"
            value="1"
            defaultChecked={favorite}
            className="size-6 accent-clay"
          />
          Favorites only
        </label>
        <div className="flex gap-3 lg:col-span-5">
          <button type="submit" className={buttonClass("secondary")}>Show</button>
          {hasFilters && (
            <Link href={`/spaces/${space.id}/memories`} className="flex items-center text-ink-soft hover:text-clay text-sm">
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {memories.length === 0 ? (
        <EmptyState
          icon={<BookHeart aria-hidden="true" className="size-12 text-ink-muted" />}
          title={hasFilters ? "Nothing matches those filters" : "Your scrapbook is waiting"}
          action={
            hasFilters ? (
              <Link href={`/spaces/${space.id}/memories`} className={buttonClass("quiet")}>
                Clear filters
              </Link>
            ) : (
              <ButtonLink href={`/spaces/${space.id}/memories/new`}>
                <Plus aria-hidden="true" className="size-5" /> Add a memory
              </ButtonLink>
            )
          }
        >
          {hasFilters ? null : (
            <p className="text-ink-soft">
              Save a conversation, finish an activity, or add a story or photo. Everything you keep will live here, just for the two of you.
            </p>
          )}
        </EmptyState>
      ) : (
        <ul className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {memories.map((m, index) => (
            <li key={m.id} className="mb-6 break-inside-avoid">
              <article
                className={cx(
                  "relative bg-surface rounded-card shadow-card p-6 transition-transform duration-200 hover:rotate-0 motion-reduce:rotate-0",
                  index % 3 === 0 ? "lg:-rotate-1" : index % 3 === 1 ? "lg:rotate-1" : ""
                )}
              >
                <div aria-hidden="true" className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2 bg-honey-soft/90 rounded-sm" />
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge tone="neutral">{MEMORY_TYPE_LABELS[m.type]}</Badge>
                  {m.category && <Badge tone="sage">{m.category.name}</Badge>}
                  {m.favorite && (
                    <Badge tone="honey" className="flex items-center gap-1">
                      <Star aria-hidden="true" className="size-3" />
                      <span className="sr-only">Favorite</span>
                    </Badge>
                  )}
                </div>
                <h2 className="font-display text-2xl mb-2">
                  <Link href={`/spaces/${space.id}/memories/${m.id}`} className="text-ink hover:text-clay">
                    {m.title}
                  </Link>
                </h2>
                {m.whenText && <p className="italic text-ink-soft mb-3">{m.whenText}</p>}
                <p className="whitespace-pre-line text-ink mb-4">
                  {m.body.length > 220 ? m.body.slice(0, 220) + "…" : m.body}
                </p>
                {m.type === "PHOTO" && m.photoId && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photos/${m.photoId}`}
                      alt={m.title}
                      className="mb-4 w-full rounded-control border-8 border-white shadow-card"
                      loading="lazy"
                    />
                  </>
                )}
                <footer className="text-sm text-ink-muted">
                  Added by {m.createdById === user.id ? viewerName : partnerName} · {formatDate(m.createdAt)}
                </footer>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}