import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { CalendarHeart, MessageCircle, Puzzle } from "lucide-react";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { CollectionForm } from "@/components/admin/config-forms";
import { Badge } from "@/components/ui";
import { togglePromptFeaturedAction, toggleActivityFeaturedAction, setCollectionStatusAction } from "@/actions/admin";

export const metadata = {
  title: "Featured content",
};

export default async function FeaturedPage() {
  await requireAdmin();
  const [
    featuredPrompts,
    featuredActivities,
    collections,
  ] = await Promise.all([
    db.prompt.findMany({
      where: { featured: true },
      include: { category: true },
    }),
    db.activity.findMany({
      where: { featured: true },
      include: { category: true },
    }),
    db.collection.findMany({
      include: { _count: { select: { activities: true } } },
      orderBy: { month: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Featured content"
        description="What people see first: featured questions and activities, and the monthly collections."
      />
      <section className="space-y-12">
        {/* Featured questions */}
        <SectionTitle>Featured questions</SectionTitle>
        {featuredPrompts.length > 0 ? (
          <ul className="divide-y divide-line">
            {featuredPrompts.map((p) => (
              <li key={p.id} className="py-6 flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-ink whitespace-pre-line">{p.text}</p>
                  <p className="text-sm text-ink-muted mt-2">
                    Category: <span className="font-display">{p.category?.name ?? "Uncategorized"}</span>
                  </p>
                </div>
                <form action={togglePromptFeaturedAction} className="flex-shrink-0">
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton variant="danger" size="md">
                    Remove from featured
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<MessageCircle aria-hidden="true" className="size-7" />}
            title="No featured questions"
            action={<Link href="/admin/prompts" className="underline">Manage questions</Link>}
          />
        )}

        {/* Featured activities */}
        <SectionTitle>Featured activities</SectionTitle>
        {featuredActivities.length > 0 ? (
          <ul className="divide-y divide-line">
            {featuredActivities.map((a) => (
              <li key={a.id} className="py-6 flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-ink whitespace-pre-line">{a.title}</p>
                  <p className="text-sm text-ink-muted mt-2">
                    Category: <span className="font-display">{a.category?.name ?? "Uncategorized"}</span>
                  </p>
                </div>
                <form action={toggleActivityFeaturedAction} className="flex-shrink-0">
                  <input type="hidden" name="id" value={a.id} />
                  <SubmitButton variant="danger" size="md">
                    Remove from featured
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Puzzle aria-hidden="true" className="size-7" />}
            title="No featured activities"
            action={<Link href="/admin/activities" className="underline">Manage activities</Link>}
          />
        )}

        {/* Monthly collections */}
        <SectionTitle>Monthly collections</SectionTitle>
        {collections.length > 0 ? (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Monthly collections</caption>
              <thead>
                <tr>
                  <th scope="col" className="pb-2 text-sm text-ink-muted text-left">
                    Month
                  </th>
                  <th scope="col" className="pb-2 text-sm text-ink-muted text-left">
                    Title
                  </th>
                  <th scope="col" className="pb-2 text-sm text-ink-muted text-left">
                    Activities
                  </th>
                  <th scope="col" className="pb-2 text-sm text-ink-muted text-left">
                    Premium
                  </th>
                  <th scope="col" className="pb-2 text-sm text-ink-muted text-left">
                    Status
                  </th>
                  <th scope="col" className="pb-2 text-sm text-ink-muted text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {collections.map((c) => (
                  <tr key={c.id} className="hover:bg-sand">
                    <td className="py-4">
                      {new Date(c.month).toLocaleDateString("en-GB", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </td>
                    <td className="py-4">{c.title}</td>
                    <td className="py-4">{c._count.activities}</td>
                    <td className="py-4">
                      <Badge
                        tone={c.isPremium ? "plum" : "neutral"}
                        className="text-xs px-2 py-0.5"
                      >
                        {c.isPremium ? "Premium" : "Standard"}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <Badge
                        tone={c.status === "PUBLISHED" ? "sage" : "neutral"}
                        className="text-xs px-2 py-0.5"
                      >
                        {c.status === "PUBLISHED" ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="py-4 space-x-2">
                      <form action={setCollectionStatusAction} className="flex-1">
                        <input type="hidden" name="id" value={c.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={c.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                        />
                        <SubmitButton
                          variant="secondary"
                          size="md"
                        >
                          {c.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </SubmitButton>
                      </form>
                      <details className="flex-1">
                        <summary className="text-sm text-ink-muted font-medium">
                          Edit
                        </summary>
                        <CollectionForm
                          values={{
                            id: c.id,
                            slug: c.slug,
                            title: c.title,
                            description: c.description,
                            month: c.month.toISOString().slice(0, 7),
                            isPremium: c.isPremium,
                            status: c.status,
                          }}
                        />
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <EmptyState icon={<CalendarHeart aria-hidden="true" className="size-7" />} title="No collections yet">
            Create the first monthly collection below.
          </EmptyState>
        )}
        <Card>
          <SectionTitle>New collection</SectionTitle>
          <CollectionForm />
        </Card>
      </section>
    </>
  );
}
