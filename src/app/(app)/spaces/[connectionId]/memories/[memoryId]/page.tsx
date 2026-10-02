import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { requireOnboardedUser } from "@/lib/session";
import { requireSpace } from "@/lib/spaces";
import { getMemory } from "@/lib/queries";
import { toggleMemoryFavoriteAction, deleteMemoryAction } from "@/actions/together";
import { BackLink, Notice } from "@/components/app/bits";
import { ConfirmButton } from "@/components/client";
import { Badge, buttonClass } from "@/components/ui";
import { MEMORY_TYPE_LABELS, formatDate } from "@/lib/labels";

export const metadata: Metadata = { title: "Memory" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string; memoryId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { connectionId, memoryId } = await params;
  const sp = await searchParams;
  const user = await requireOnboardedUser();
  const space = await requireSpace(connectionId, user.id);

  const memory = await getMemory(memoryId, space.id);
  if (!memory) notFound();

  const isOwner = memory.createdById === user.id;
  const authorName = memory.createdById === user.id ? "you" : (memory.createdBy.profile?.firstName ?? "they");

  return (
    <>
      <BackLink href={`/spaces/${space.id}/memories`}>Back to our scrapbook</BackLink>

      <Notice
        value={sp.notice}
        messages={{ created: "Saved to your scrapbook." }}
      />

      <article className="max-w-3xl mx-auto bg-surface rounded-card shadow-lift p-6 sm:p-10 relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-6 bg-honey-soft rounded-b-card border border-honey border-t-0"
          aria-hidden="true"
        />

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge tone="honey">{MEMORY_TYPE_LABELS[memory.type]}</Badge>
          {memory.category && <Badge tone="neutral">{memory.category.name}</Badge>}
        </div>

        <h1 className="font-display text-4xl text-ink mb-3">{memory.title}</h1>

        {memory.whenText && (
          <p className="text-xl text-ink-soft italic mb-6">{memory.whenText}</p>
        )}

        {memory.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${memory.photo.id}`}
            alt={memory.title}
            className="my-6 w-full rounded-control border-8 border-white shadow-card"
          />
        )}

        {memory.body && (
          <div className="text-xl leading-relaxed whitespace-pre-line text-ink mb-8">
            {memory.body}
          </div>
        )}

        <footer className="text-ink-soft text-base">
          Added by {authorName} on {formatDate(memory.createdAt)}
        </footer>

        <div className="mt-6 space-y-3">
          {memory.conversation && (
            <Link
              href={`/spaces/${space.id}/talk/${memory.conversation.id}`}
              className="inline-flex items-center gap-2 text-clay hover:text-clay-hover underline"
            >
              See the whole conversation
            </Link>
          )}
          {memory.activitySession && (
            <Link
              href={`/spaces/${space.id}/sessions/${memory.activitySession.id}`}
              className="inline-flex items-center gap-2 text-clay hover:text-clay-hover underline"
            >
              See the activity
            </Link>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <form action={toggleMemoryFavoriteAction}>
            <input type="hidden" name="memoryId" value={memory.id} />
            <button
              type="submit"
              className={buttonClass("secondary")}
              aria-pressed={memory.favorite}
            >
              <Star
                className={`w-5 h-5 ${memory.favorite ? "fill-current" : ""}`}
                aria-hidden="true"
              />
              <span className="ml-2">
                {memory.favorite ? "Favorite" : "Mark as favorite"}
              </span>
            </button>
          </form>

          {isOwner && (
            <form action={deleteMemoryAction}>
              <input type="hidden" name="memoryId" value={memory.id} />
              <ConfirmButton
                message="Delete this memory for both of you? This can't be undone."
                variant="danger"
              >
                Delete
              </ConfirmButton>
            </form>
          )}
        </div>
      </article>
    </>
  );
}
