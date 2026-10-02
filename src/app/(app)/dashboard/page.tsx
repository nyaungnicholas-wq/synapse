import Link from "next/link";
import { Bell, BookHeart, CalendarHeart, Clock, MessageCircle, Puzzle, UserPlus } from "lucide-react";
import { markNotificationsReadAction, startActivityAction, startConversationAction } from "@/actions/together";
import { Notice, UsageNote } from "@/components/app/bits";
import { SubmitButton } from "@/components/client";
import { Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader, SectionTitle, Stat, buttonClass } from "@/components/ui";
import { getSpacePlan, getSpaceUsage } from "@/lib/entitlements";
import { DIFFICULTY_LABELS, MEMORY_TYPE_LABELS, formatDate } from "@/lib/labels";
import {
  getCollections,
  getInProgress,
  getPendingInvitations,
  getProgress,
  getRecentMemories,
  getSuggestedActivities,
  getTodayActivity,
  getTodayPrompt,
  getUnreadNotifications,
} from "@/lib/queries";
import { requireOnboardedUser } from "@/lib/session";
import { listSpaces, memberName } from "@/lib/spaces";

export const metadata = { title: "Today" };

const NOTICES = {
  "email-verified": "Thank you — your email is confirmed.",
  "password-reset": "Your new password is saved.",
  "left-space": "You have left that Connection Space.",
};

const monthName = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ space?: string; notice?: string }> }) {
  const sp = await searchParams;
  const user = await requireOnboardedUser();
  const spaces = await listSpaces(user.id);
  const space =
    spaces.find((s) => s.id === sp.space) ?? spaces.find((s) => s.partner) ?? spaces.find((s) => !s.closedAt) ?? spaces[0] ?? null;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const greeting = `Hello, ${user.profile.firstName}`;

  if (!space) {
    return (
      <>
        <Notice value={sp.notice} messages={NOTICES} />
        <PageHeader
          eyebrow={today}
          title={greeting}
          description="SYNAPSE works best with two people. Invite the person you'd like to feel closer to — it takes a minute."
        />
        <Card className="max-w-2xl">
          <div className="mb-4 grid size-14 place-items-center rounded-full bg-clay-soft text-clay-hover">
            <UserPlus aria-hidden="true" className="size-7" />
          </div>
          <h2 className="font-display text-3xl">Invite your person</h2>
          <p className="mt-2 text-lg text-ink-soft">Send a link, read out a short code, or email them an invitation.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/connect" size="lg">
              Invite someone
            </ButtonLink>
            <ButtonLink href="/connect" size="lg" variant="secondary">
              I have a code
            </ButtonLink>
          </div>
        </Card>
      </>
    );
  }

  const partnerName = space.partner ? memberName(space.partner) : null;
  const [plan, usage, progress, memories, inProgress, notifications, collections] = await Promise.all([
    getSpacePlan(space.id),
    getSpaceUsage(space.id),
    getProgress(space.id),
    getRecentMemories(space.id, 3),
    getInProgress(space.id),
    getUnreadNotifications(user.id),
    getCollections(),
  ]);
  const premium = plan.code === "PREMIUM";
  const [prompt, activity, pending] = await Promise.all([
    getTodayPrompt(space.id, premium),
    getTodayActivity(space.id, premium),
    space.partner || space.closedAt ? Promise.resolve([]) : getPendingInvitations(user.id),
  ]);
  const suggested = await getSuggestedActivities(space.id, premium, 3, activity?.id);
  const base = `/spaces/${space.id}`;
  const hasInProgress = inProgress.conversations.length + inProgress.sessions.length > 0;

  return (
    <>
      <Notice value={sp.notice} messages={NOTICES} />
      <PageHeader
        eyebrow={today}
        title={greeting}
        description={
          partnerName
            ? `Here is something you and ${partnerName} can do together today.`
            : "Your space is ready. It will come alive when your person joins."
        }
        actions={
          spaces.length > 1 ? (
            <form method="get" className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="block font-semibold">Connection Space</span>
                <select
                  name="space"
                  defaultValue={space.id}
                  className="mt-1 min-h-12 rounded-control border-2 border-line-strong bg-surface px-3"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.partner ? `You & ${memberName(s.partner)}` : "Waiting for someone to join"}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={buttonClass("secondary")}>
                Switch
              </button>
            </form>
          ) : undefined
        }
      />

      {/* Current connection */}
      <section aria-labelledby="connection-title" className="mb-8">
        <h2 id="connection-title" className="sr-only">
          Your connection
        </h2>
        {partnerName ? (
          <Link
            href={base}
            className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-lift"
          >
            <span className="flex -space-x-3">
              <Avatar name={user.profile.firstName} />
              <Avatar name={partnerName} />
            </span>
            <span className="flex-1">
              <span className="block font-display text-xl">You & {partnerName}</span>
              <span className="text-ink-muted">
                {progress.weeksConnected === 1 ? "Connected this week" : `Connected for ${progress.weeksConnected} weeks`}
                {premium ? " · Premium" : ""}
              </span>
            </span>
            <span className="font-semibold text-clay underline underline-offset-4">Open your space</span>
          </Link>
        ) : space.closedAt ? (
          <Card className="bg-sand">
            <h3 className="font-display text-2xl">The other person has left this space</h3>
            <p className="mt-2 text-ink-soft">
              Everything you shared is still here for you to look back on. To start again with someone, send a new invitation.
            </p>
            <ButtonLink href="/connect" className="mt-4">
              Invite someone
            </ButtonLink>
          </Card>
        ) : (
          <Card className="border-honey bg-honey-soft">
            <h3 className="font-display text-2xl">Waiting for your person to join</h3>
            <p className="mt-2 text-ink-soft">
              Share your invitation code or link. Until they join, you can still look around and answer questions.
            </p>
            {pending.map((inv) => (
              <p key={inv.id} className="mt-4 font-display text-3xl tracking-[0.2em]">
                <span aria-hidden="true">{inv.code}</span>
                <span className="sr-only">Invitation code {inv.code.replace("-", "").split("").join(" ")}</span>
              </p>
            ))}
            <ButtonLink href="/connect" variant="secondary" className="mt-4">
              Manage invitations
            </ButtonLink>
          </Card>
        )}
      </section>

      {/* Today */}
      <section aria-labelledby="today-title" className="mb-12">
        <h2 id="today-title" className="sr-only">
          What you can do together today
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            {prompt ? (
              <Card className="flex flex-1 flex-col">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="sage">
                    <MessageCircle aria-hidden="true" className="size-4" /> Today&apos;s conversation
                  </Badge>
                  <Badge>{prompt.category.name}</Badge>
                </div>
                <p className="mt-4 font-display text-2xl sm:text-3xl">{prompt.text}</p>
                {prompt.followUp && <p className="mt-3 text-ink-muted">Then ask: {prompt.followUp}</p>}
                {prompt.audience !== "ANYONE" && (
                  <p className="mt-2 text-ink-muted">
                    Best answered by the {prompt.audience === "OLDER" ? "older" : "younger"} one of you.
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                  <form action={startConversationAction}>
                    <input type="hidden" name="connectionId" value={space.id} />
                    <input type="hidden" name="promptId" value={prompt.id} />
                    <SubmitButton size="lg" pendingLabel="Opening…">
                      Start this conversation
                    </SubmitButton>
                  </form>
                  <ButtonLink href={`${base}/talk`} variant="quiet">
                    Pick a different question
                  </ButtonLink>
                </div>
              </Card>
            ) : (
              <EmptyState
                icon={<MessageCircle aria-hidden="true" className="size-7" />}
                title="You've talked through every question"
                action={<ButtonLink href={`${base}/talk`}>See your conversations</ButtonLink>}
              >
                New questions arrive every month.
              </EmptyState>
            )}
            <UsageNote plan={plan} usage={usage} kind="prompt" />
          </div>

          <div className="flex flex-col gap-3">
            {activity ? (
              <Card className="flex flex-1 flex-col">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="clay">
                    <Puzzle aria-hidden="true" className="size-4" /> Today&apos;s activity
                  </Badge>
                  <Badge>{activity.category.name}</Badge>
                  {activity.collection && <Badge tone="honey">{activity.collection.title}</Badge>}
                </div>
                <p className="mt-4 font-display text-2xl sm:text-3xl">{activity.title}</p>
                <p className="mt-2 text-lg text-ink-soft">{activity.summary}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock aria-hidden="true" className="size-5" /> {activity.estimatedMinutes} minutes
                  </span>
                  <span>{DIFFICULTY_LABELS[activity.difficulty]}</span>
                  <span>{activity._count.steps} steps</span>
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                  <form action={startActivityAction}>
                    <input type="hidden" name="connectionId" value={space.id} />
                    <input type="hidden" name="activityId" value={activity.id} />
                    <SubmitButton size="lg" pendingLabel="Starting…">
                      Start together
                    </SubmitButton>
                  </form>
                  <ButtonLink href={`${base}/activities/${activity.slug}`} variant="quiet">
                    See the steps first
                  </ButtonLink>
                </div>
              </Card>
            ) : (
              <EmptyState
                icon={<Puzzle aria-hidden="true" className="size-7" />}
                title="You've done every activity"
                action={<ButtonLink href={`${base}/activities`}>Browse activities</ButtonLink>}
              >
                Do a favorite again, or wait for next month&apos;s collection.
              </EmptyState>
            )}
            <UsageNote plan={plan} usage={usage} kind="activity" />
          </div>
        </div>
      </section>

      {hasInProgress && (
        <section aria-labelledby="continue-title" className="mb-12">
          <SectionTitle id="continue-title">Pick up where you left off</SectionTitle>
          <ul className="grid gap-3 md:grid-cols-2">
            {inProgress.conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`${base}/talk/${c.id}`}
                  className="flex min-h-14 flex-col rounded-card border border-line bg-surface p-4 hover:border-ink"
                >
                  <span className="font-semibold">{c.prompt.text}</span>
                  <span className="text-ink-muted">
                    Conversation · {c._count.responses} {c._count.responses === 1 ? "answer" : "answers"}
                  </span>
                </Link>
              </li>
            ))}
            {inProgress.sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`${base}/sessions/${s.id}`}
                  className="flex min-h-14 flex-col rounded-card border border-line bg-surface p-4 hover:border-ink"
                >
                  <span className="font-semibold">{s.activity.title}</span>
                  <span className="text-ink-muted">
                    Activity · step {Math.min(s.currentStep, s.activity._count.steps)} of {s.activity._count.steps}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="progress-title" className="mb-12">
        <SectionTitle id="progress-title">Your time together</SectionTitle>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Conversations" value={progress.conversationsCompleted} hint={`${usage.conversationsThisWeek} started this week`} />
          <Stat label="Activities" value={progress.activitiesCompleted} hint={`${usage.activitiesThisWeek} started this week`} />
          <Stat
            label="Weeks connected"
            value={progress.weeksConnected}
            hint={progress.connectedSince ? `Since ${formatDate(progress.connectedSince)}` : "Starts when your person joins"}
          />
          <Stat label="Memories" value={progress.memoriesCreated} />
        </dl>
        <p className="mt-3 text-ink-muted">No streaks, no pressure. Come back whenever it suits you both.</p>
      </section>

      <div className="mb-12 grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="memories-title" className="lg:col-span-2">
          <SectionTitle
            id="memories-title"
            action={
              <ButtonLink href={`${base}/memories`} variant="quiet">
                See all memories
              </ButtonLink>
            }
          >
            Recent memories
          </SectionTitle>
          {memories.length ? (
            <ul className="grid gap-4 sm:grid-cols-3">
              {memories.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`${base}/memories/${m.id}`}
                    className="flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card hover:shadow-lift"
                  >
                    <Badge className="self-start">{MEMORY_TYPE_LABELS[m.type]}</Badge>
                    <span className="mt-3 font-display text-xl">{m.title}</span>
                    {m.body && <span className="mt-2 line-clamp-3 text-ink-soft">{m.body}</span>}
                    <span className="mt-auto pt-3 text-sm text-ink-muted">
                      {m.createdById === user.id ? "You" : memberName({ user: m.createdBy })} · {formatDate(m.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<BookHeart aria-hidden="true" className="size-7" />}
              title="Your scrapbook is waiting"
              action={<ButtonLink href={`${base}/memories/new`}>Add your first memory</ButtonLink>}
            >
              Save a conversation or a story and it will live here.
            </EmptyState>
          )}
        </section>

        <section aria-labelledby="news-title">
          <SectionTitle id="news-title">What&apos;s new</SectionTitle>
          <Card className="p-5 sm:p-6">
            {notifications.length ? (
              <>
                <ul className="space-y-3">
                  {notifications.map((n) => (
                    <li key={n.id} className="flex gap-3">
                      <Bell aria-hidden="true" className="mt-1 size-5 shrink-0 text-clay" />
                      <span>
                        {n.link ? (
                          <Link href={n.link} className="font-semibold underline-offset-4 hover:underline">
                            {n.title}
                          </Link>
                        ) : (
                          <span className="font-semibold">{n.title}</span>
                        )}
                        <span className="block text-sm text-ink-muted">{formatDate(n.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <form action={markNotificationsReadAction} className="mt-4">
                  <button type="submit" className={buttonClass("quiet")}>
                    Mark all as read
                  </button>
                </form>
              </>
            ) : (
              <p className="text-ink-soft">Nothing new right now.</p>
            )}
          </Card>
        </section>
      </div>

      {suggested.length > 0 && (
        <section aria-labelledby="more-title" className="mb-12">
          <SectionTitle id="more-title">More to try</SectionTitle>
          <ul className="grid gap-4 md:grid-cols-3">
            {suggested.map((a) => (
              <li key={a.id}>
                <Link
                  href={`${base}/activities/${a.slug}`}
                  className="flex h-full flex-col rounded-card border border-line bg-surface p-5 hover:border-ink"
                >
                  <span className="font-display text-xl">{a.title}</span>
                  <span className="mt-1 text-ink-soft">{a.summary}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-3 text-ink-muted">
                    <Clock aria-hidden="true" className="size-4" /> {a.estimatedMinutes} minutes
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(collections.current || collections.upcoming.length > 0) && (
        <section aria-labelledby="coming-title">
          <SectionTitle id="coming-title">Coming up</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {collections.current && (
              <Card className="border-0 bg-sage-soft">
                <p className="flex items-center gap-2 font-semibold text-sage-deep">
                  <CalendarHeart aria-hidden="true" className="size-5" /> This month
                </p>
                <h3 className="mt-2 font-display text-2xl">{collections.current.title}</h3>
                <p className="mt-2 text-ink-soft">{collections.current.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {collections.current.activities.map((a) => (
                    <Link key={a.id} href={`${base}/activities/${a.slug}`} className="rounded-full bg-surface px-3 py-1 font-semibold hover:underline">
                      {a.title}
                    </Link>
                  ))}
                </div>
              </Card>
            )}
            {collections.upcoming.map((c) => (
              <Card key={c.id}>
                <p className="flex items-center gap-2 font-semibold text-ink-muted">
                  <CalendarHeart aria-hidden="true" className="size-5" /> Coming in {monthName(c.month)}
                  {c.isPremium && <Badge tone="plum">Premium</Badge>}
                </p>
                <h3 className="mt-2 font-display text-2xl">{c.title}</h3>
                <p className="mt-2 text-ink-soft">{c.description}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
