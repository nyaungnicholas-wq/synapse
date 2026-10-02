import { requireOnboardedUser } from "@/lib/session";
import { memberName, requireSpace } from "@/lib/spaces";
import { getSpacePlan, getSpaceUsage } from "@/lib/entitlements";
import {
  listPromptCategories,
  pickPrompt,
  getPinnedPrompt,
  isFavorite,
  listConversations,
  listFavoritePrompts,
} from "@/lib/queries";
import { startConversationAction, toggleFavoriteAction } from "@/actions/together";
import { SubmitButton } from "@/components/client";
import {
  BackLink,
  UsageNote,
  PremiumLock,
} from "@/components/app/bits";
import {
  Card,
  Badge,
  ButtonLink,
  buttonClass,
  PageHeader,
  SectionTitle,
  EmptyState,
  Alert,
  pillClass, cx, } from "@/components/ui";
import { Heart, SkipForward } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Talk" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{
    category?: string;
    skip?: string;
    blocked?: string;
    prompt?: string;
  }>;
}) {
  const { connectionId } = await params;
  const user = await requireOnboardedUser();
  const space = await requireSpace(connectionId, user.id);
  const plan = await getSpacePlan(space.id);
  const usage = await getSpaceUsage(space.id);
  const premium = plan.code === "PREMIUM";
  const categories = await listPromptCategories();
  const sp = await searchParams;
  const category = categories.find((c) => c.slug === sp.category);
  const skipped = (sp.skip ?? "")
    .split(",")
    .filter((s) => /^[a-z0-9]{1,40}$/i.test(s))
    .slice(0, 30);
  // After "Save for later" the same question stays on screen (?prompt=) instead of a new random one.
  const pinned = sp.prompt ? await getPinnedPrompt(space.id, sp.prompt, premium) : null;
  const prompt =
    pinned ??
    (await pickPrompt({
      connectionId: space.id,
      categorySlug: category?.slug,
      exclude: skipped,
      premium,
    }));
  const favorite = prompt ? await isFavorite(user.id, prompt.id) : false;
  const conversations = await listConversations(space.id);
  const favorites = await listFavoritePrompts(user.id);

  const href = (params: Record<string, string | undefined>) =>
    `/spaces/${space.id}/talk?${new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined)
    ).toString()}`;

  return (
    <>
      <BackLink href={`/spaces/${space.id}`}>Back to your space</BackLink>
      <PageHeader
        eyebrow="Talk"
        title="Pick a question to talk about"
        description={
          space.partner !== null
            ? `Answer it together, or each in your own time. ${memberName(space.partner)} will see your answer.`
            : "You can answer now; your person will see it when they join."
        }
      />
      {sp.blocked === "limit" && (
        <Alert tone="info" title="You've used this week's free conversations">
          New ones open on Monday — or upgrade to Premium for unlimited questions.
          <br />
          <ButtonLink href="/billing" variant="secondary" size="md">
            See Premium
          </ButtonLink>
        </Alert>
      )}
      {sp.blocked === "premium" && (
        <PremiumLock message="Upgrade to access all conversation themes" />
      )}
      <nav aria-label="Conversation themes" className="flex flex-wrap gap-2 mb-6">
        <Link href={href({ category: undefined })} className={pillClass(category === undefined)} aria-current={category === undefined ? "true" : undefined}>
          All themes
        </Link>
        {categories.map((cat) => (
          <Link key={cat.id}
            href={href({ category: cat.slug })} className={pillClass(category?.slug === cat.slug)} aria-current={category?.slug === cat.slug ? "true" : undefined}>
            {cat.name}
          </Link>
        ))}
      </nav>
      {!prompt ? (
        <EmptyState
          title="No more questions here"
          body={
            premium
              ? "You've talked through every question in this theme. Try another theme."
              : "You've used every free question in this theme. Try another theme, or see Premium for the full library."
          }
          action={<ButtonLink href={href({})} variant="secondary" size="md">
            Start over
          </ButtonLink>}
        />
      ) : (
        <Card className="text-center py-10 relative">
          <Badge className="mb-4 inline-flex">
            {prompt.category.name}
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl max-w-2xl mx-auto mb-6">
            {prompt.text}
          </h2>
          {prompt.followUp && (
            <p className="text-ink-muted mb-4">
              Then ask: {prompt.followUp}
            </p>
          )}
          {prompt.audience !== "ANYONE" && (
            <p className="text-ink-muted mb-6">
              {prompt.audience === "OLDER"
                ? "For the older one"
                : "For the younger one"}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <form action={startConversationAction} className="flex items-center">
              <input type="hidden" name="connectionId" value={space.id} />
              <input type="hidden" name="promptId" value={prompt.id} />
              <SubmitButton
                variant="primary"
                size="lg"
                pendingLabel="Opening…"
              >
                Let's talk about this
              </SubmitButton>
            </form>
            <ButtonLink
              href={href({
                category: category?.slug,
                skip: [...skipped, prompt.id].join(","),
              })}
              variant="secondary"
              size="lg"
            >
              <SkipForward className="mr-2 h-4 w-4" aria-hidden="true" />
              Show me another
            </ButtonLink>
            <form action={toggleFavoriteAction} className="flex items-center">
              <input type="hidden" name="promptId" value={prompt.id} />
              <input
                type="hidden"
                name="back"
                value={href({ category: category?.slug, skip: sp.skip, prompt: prompt.id })}
              />
              <button
                type="submit"
                className={buttonClass("quiet", "lg")}
                aria-pressed={favorite}
              >
                <Heart
                  className={cx(
                    favorite ? "text-plum" : "text-ink",
                    "h-4 w-4"
                  )}
                  aria-hidden="true"
                />
                {favorite ? "Saved to favorites" : "Save for later"}
              </button>
            </form>
          </div>
        </Card>
      )}
      <UsageNote
        plan={plan}
        usage={{ conversationsThisWeek: usage.conversationsThisWeek, activitiesThisWeek: usage.activitiesThisWeek }}
        kind="prompt"
      />
      <div className="lg:grid-cols-2 gap-8 mt-10">
        <section>
          <SectionTitle>Your conversations</SectionTitle>
          {conversations.length === 0 ? (
            <EmptyState title="No conversations yet" />
          ) : (
            <>
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/spaces/${space.id}/talk/${conv.id}`}
                  className="block mb-4 p-4 border-line-strong rounded-card hover:bg-sand"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="font-sans text-ink">{conv.prompt.text}</p>
                    <Badge
                      tone={conv.status === "COMPLETED" ? "sage" : "honey"}
                    >
                      {conv.status === "COMPLETED" ? "Finished" : "In progress"}
                    </Badge>
                  </div>
                  <p className="text-ink-muted">
                    {conv.prompt.category.name} •
                    {conv._count.responses} answer{
                      conv._count.responses !== 1 ? "s" : ""
                    }
                  </p>
                </Link>
              ))}
            </>
          )}
        </section>
        <section>
          <SectionTitle>Saved for later</SectionTitle>
          {favorites.length === 0 ? (
            <EmptyState title="Nothing saved yet">Tap “Save for later” on any question you like.</EmptyState>
          ) : (
            <>
              {favorites.map((fav) => (
                <div
                  key={fav.prompt.id}
                  className="flex items-baseline justify-between mb-4 p-4 border-line-strong rounded-card hover:bg-sand"
                >
                  <p className="font-sans text-ink">{fav.prompt.text}</p>
                  <form action={startConversationAction} className="flex items-center">
                    <input type="hidden" name="connectionId" value={space.id} />
                    <input type="hidden" name="promptId" value={fav.prompt.id} />
                    <SubmitButton variant="secondary" size="lg">
                      Talk about this
                    </SubmitButton>
                  </form>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </>
  );
}