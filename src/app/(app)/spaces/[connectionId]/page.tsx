import Link from "next/link";
import { MessageCircle, Puzzle, BookHeart } from "lucide-react";
import { requireOnboardedUser } from "@/lib/session";
import { requireSpace, memberName, spaceTitle } from "@/lib/spaces";
import { getSpacePlan } from "@/lib/entitlements";
import { getProgress, getInProgress, getRecentMemories } from "@/lib/queries";
import { formatDate } from "@/lib/labels";
import { leaveSpaceAction } from "@/actions/connections";
import { BackLink } from "@/components/app/bits";
import { ConfirmButton } from "@/components/client";
import {
  Card,
  Badge,
  PageHeader,
  EmptyState,
  ButtonLink,
  Avatar,
} from "@/components/ui";
import { ReportConcernForm } from "@/components/app/forms-a";

export const metadata = { title: "Your Connection Space" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { connectionId } = await params;
  const user = await requireOnboardedUser();
  const space = await requireSpace(connectionId, user.id);
  await searchParams;

  const [plan, progress, inProgress, memories] = await Promise.all([
    getSpacePlan(space.id),
    getProgress(space.id),
    getInProgress(space.id),
    getRecentMemories(space.id, 4),
  ]);

  const premium = plan.code === "PREMIUM";
  const partnerName = space.partner ? memberName(space.partner) : null;

  return (
    <>
      <BackLink href="/dashboard">
        Back to Today
      </BackLink>

      <PageHeader
        eyebrow="Connection Space"
        title={spaceTitle(space, user.profile.connectWithLabel)}
        description={
          partnerName ? (
            <p>
              A private space for you and {partnerName}. Only the two of you can
              see what's here.
            </p>
          ) : (
            <p>
              Waiting for your person to join. You can start exploring now.
            </p>
          )
        }
        actions={
          <>
            {premium ? (
              <Badge tone="plum">Premium</Badge>
            ) : (
              <Badge>Free plan</Badge>
            )}
          </>
        }
      />

      {!space.partner && (
        <Card className="mb-8 bg-honey-soft">
          <h2 className="font-display text-2xl">{space.closedAt ? "The other person has left this space" : "Invite your person"}</h2>
          <p className="mt-2 text-ink-soft">
            {space.closedAt
              ? "You can still look back at everything here. New invitations start a fresh space."
              : "Share your invitation link or code so they can join you here."}
          </p>
          <ButtonLink href="/connect" variant="secondary" className="mt-4">
            {space.closedAt ? "Invite someone new" : "Share your invitation"}
          </ButtonLink>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-3 mt-8">
        <Link href={`/spaces/${space.id}/talk`} className="block">
          <Card className="min-h-40 hover:shadow-lift transition-shadow p-6">
            <div className="flex items-start gap-4">
              <MessageCircle className="h-5 w-5 text-clay" aria-hidden="true" />
              <div>
                <h2 className="font-display text-lg">Talk</h2>
                <p className="text-ink-soft">Answer a question together.</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/spaces/${space.id}/activities`} className="block">
          <Card className="min-h-40 hover:shadow-lift transition-shadow p-6">
            <div className="flex items-start gap-4">
              <Puzzle className="h-5 w-5 text-clay" aria-hidden="true" />
              <div>
                <h2 className="font-display text-lg">Do an activity</h2>
                <p className="text-ink-soft">Try something new together.</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/spaces/${space.id}/memories`} className="block">
          <Card className="min-h-40 hover:shadow-lift transition-shadow p-6">
            <div className="flex items-start gap-4">
              <BookHeart className="h-5 w-5 text-clay" aria-hidden="true" />
              <div>
                <h2 className="font-display text-lg">Our memories</h2>
                <p className="text-ink-soft">Look back at what you've made.</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl mb-4">In progress</h2>
        {inProgress.conversations.length === 0 && inProgress.sessions.length === 0 ? (
          <EmptyState
            title="Nothing in progress"
            body="Start a conversation or activity and it will wait for you here."
          />
        ) : (
          <>
            {inProgress.conversations.map(conv => (
              <Link
                key={conv.id}
                href={`/spaces/${space.id}/talk/${conv.id}`}
                className="block mb-4"
              >
                <Card className="p-4 hover:shadow-lift transition-shadow">
                  <p className="whitespace-pre-line">{conv.prompt.text}</p>
                </Card>
              </Link>
            ))}
            {inProgress.sessions.map(session => (
              <Link
                key={session.id}
                href={`/spaces/${space.id}/sessions/${session.id}`}
                className="block mb-4"
              >
                <Card className="p-4 hover:shadow-lift transition-shadow">
                  <p className="whitespace-pre-line">{session.activity.title}</p>
                </Card>
              </Link>
            ))}
          </>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl mb-4">Recent memories</h2>
        {memories.length === 0 ? (
          <EmptyState
            title="No memories yet"
            body="Start a conversation, do an activity, or add a photo to create a memory together."
            action={
              <ButtonLink
                href={`/spaces/${space.id}/memories/new`}
                variant="secondary"
                size="md"
              >
                Add a memory
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {memories.map(memory => (
              <Link
                key={memory.id}
                href={`/spaces/${space.id}/memories/${memory.id}`}
                className="block"
              >
                <Card className="p-4 hover:shadow-lift transition-shadow">
                  <h3 className="font-display text-base">{memory.title}</h3>
                  {memory.body && (
                    <p className="mt-2 text-ink-soft whitespace-pre-line">
                      {memory.body}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl mb-4">Who's here</h2>
        <div className="space-y-4">
          {space.members.map(m => (
            <div key={m.id} className="flex items-start gap-4">
              <Avatar name={memberName({ user: m.user })} size="lg" />
              <div>
                <p className="font-sans">{memberName({ user: m.user })}</p>
                <p className="text-ink-soft text-sm">
                  {m.side === "OLDER" ? "Older generation" : "Younger generation"} ·
                  {formatDate(m.joinedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-12 text-ink-soft text-center">
        {progress.conversationsCompleted} conversations ·
        {progress.activitiesCompleted} activities ·
        {progress.memoriesCreated} memories
      </p>

      <details className="mt-12">
        <summary className="min-h-14 font-semibold cursor-pointer">
          Safety and privacy options
        </summary>
        <div className="mt-4 space-y-4">
          <p>
            Only members of this space can see its conversations, activities and
            memories. If something feels wrong, tell us — or leave the space at
            any time.
          </p>
          <ReportConcernForm connectionId={space.id} />
          <form action={leaveSpaceAction} className="space-y-2">
            <input type="hidden" name="connectionId" value={space.id} />
            <ConfirmButton
              message="Leave this Connection Space? You will no longer see its conversations or memories."
            >
              Leave this space
            </ConfirmButton>
          </form>
        </div>
      </details>
    </>
  );
}