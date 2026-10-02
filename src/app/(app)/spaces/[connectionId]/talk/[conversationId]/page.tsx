import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/session";
import { requireSpace, memberName } from "@/lib/spaces";
import { getConversation } from "@/lib/queries";
import { completeConversationAction } from "@/actions/together";
import { ResponseForm } from "@/components/app/forms-b";
import { SubmitButton } from "@/components/client";
import { BackLink, Notice } from "@/components/app/bits";
import { Card, Badge, Avatar, ButtonLink, EmptyState, ChoiceCard, cx } from "@/components/ui";
import { formatDate } from "@/lib/labels";
import { CheckCircle } from "lucide-react";

export const metadata = { title: "Conversation" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string; conversationId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { connectionId, conversationId } = await params;
  const sp = await searchParams;
  const user = await requireOnboardedUser();
  const space = await requireSpace(connectionId, user.id);
  const conversation = await getConversation(conversationId, space.id);
  if (!conversation) notFound();

  const partnerName = memberName(space.partner);
  const hasAnswered = conversation.responses.some((r) => r.authorId === user.id);
  const partnerAnswered = conversation.responses.some((r) => r.authorId !== user.id);
  const isCompleted = conversation.status === "COMPLETED";

  return (
    <>
      <BackLink href={`/spaces/${space.id}/talk`}>Back to questions</BackLink>

      <Notice
        value={sp.notice}
        messages={{
          completed: "Marked as complete. Nicely done.",
          saved: "Saved to your memories.",
          "memory-full": "Marked as complete. Your free scrapbook is full, so this one wasn't saved.",
        }}
      />

      <Card className="bg-sand border-0">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge>{conversation.prompt.category.name}</Badge>
          {isCompleted && <Badge tone="sage">Finished</Badge>}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl mb-2">
          {conversation.prompt.text}
        </h1>
        {conversation.prompt.followUp && (
          <p className="text-ink-soft">Then ask: {conversation.prompt.followUp}</p>
        )}
      </Card>

      {conversation.responses.length === 0 ? (
        <div className="my-8">
          <EmptyState title="No answers yet">
            {space.partner ? `Be the first to answer. ${partnerName} will see it here.` : "Be the first to answer."}
          </EmptyState>
        </div>
      ) : (
        <ol aria-label="Answers" className="space-y-5 my-8">
          {conversation.responses.map((r) => (
            <li key={r.id}>
              <Card
                className={cx(
                  "relative",
                  r.authorId === user.id
                    ? "sm:ml-12 bg-clay-soft border-clay-soft"
                    : "sm:mr-12 bg-surface"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar name={r.author.profile?.firstName ?? r.author.email} size="sm" />
                  <span className="font-semibold">
                    {r.authorId === user.id ? "You" : memberName({ user: r.author })}
                  </span>
                  <time dateTime={r.createdAt.toISOString()} className="text-ink-muted text-sm ml-auto">
                    {formatDate(r.createdAt)}
                  </time>
                </div>
                <p className="text-lg whitespace-pre-line">{r.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      )}

      {!isCompleted && (
        <>
          {partnerAnswered && !hasAnswered && (
            <p className="text-ink-soft text-sm mb-4">{partnerName} has answered. Your turn!</p>
          )}
          <Card>
            <ResponseForm
              conversationId={conversation.id}
              label={hasAnswered ? "Add to the conversation" : "Your answer"}
            />
          </Card>
        </>
      )}

      {isCompleted ? (
        <Card>
          <div className="flex items-center gap-3">
            <CheckCircle className="text-sage" aria-hidden="true" />
            <span>Finished on {formatDate(conversation.completedAt!)}</span>
          </div>
          {conversation.memory ? (
            <ButtonLink
              href={`/spaces/${space.id}/memories/${conversation.memory.id}`}
              className="mt-4"
            >
              Open in memories
            </ButtonLink>
          ) : (
            <form action={completeConversationAction} className="mt-4">
              <input type="hidden" name="conversationId" value={conversation.id} />
              <input type="hidden" name="saveAsMemory" value="on" />
              <SubmitButton variant="secondary">Save to our memories</SubmitButton>
            </form>
          )}
        </Card>
      ) : conversation.responses.length > 0 ? (
        <Card>
          <h3 className="font-semibold mb-2">Finished talking?</h3>
          <p className="text-ink-soft mb-4">
            Mark this conversation complete when you've both said what you wanted to. You can save
            it to your memories.
          </p>
          <form action={completeConversationAction}>
            <input type="hidden" name="conversationId" value={conversation.id} />
            <ChoiceCard
              type="checkbox"
              name="saveAsMemory"
              value="on"
              label="Save it to our memories"
              defaultChecked
            />
            <SubmitButton variant="secondary" className="mt-4">
              Mark as complete
            </SubmitButton>
          </form>
        </Card>
      ) : null}
    </>
  );
}