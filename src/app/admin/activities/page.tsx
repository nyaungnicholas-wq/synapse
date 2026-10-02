import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { Notice } from "@/components/app/bits";
import { Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ConfirmButton } from "@/components/client";
import { setActivityStatusAction, toggleActivityFeaturedAction, deleteActivityAction } from "@/actions/admin";

export const metadata = { title: "Activities" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { notice, error } = await searchParams;
  await requireAdmin();

  const activities = await db.activity.findMany({
    include: {
      category: true,
      collection: true,
      _count: { select: { steps: true, sessions: true } },
    },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Activities"
        actions={
          <ButtonLink href="/admin/activities/new" variant="primary" size="md">
            New activity
          </ButtonLink>
        }
      />
      {notice && (
        <Notice
          value={notice}
          messages={{ saved: "Activity saved.", deleted: "Activity deleted." }}
          tone="success"
        />
      )}
      {error && (
        <Notice
          value={error}
          messages={{
            "in-use": "That activity has been used, so it can't be deleted. Unpublish it instead.",
          }}
          tone="error"
        />
      )}
      <table className="w-full text-left">
        <caption className="sr-only">Activities list</caption>
        <thead>
          <tr>
            <th scope="col" className="pb-2">Title</th>
            <th scope="col" className="pb-2">Category</th>
            <th scope="col" className="pb-2">Collection</th>
            <th scope="col" className="pb-2">Minutes</th>
            <th scope="col" className="pb-2">Steps</th>
            <th scope="col" className="pb-2">Flags</th>
            <th scope="col" className="pb-2">Status</th>
            <th scope="col" className="pb-2">Used</th>
            <th scope="col" className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id} className="border-t">
              <td className="p-4">
                <div className="flex flex-col">
                  <span className="font-display">{activity.title}</span>
                  <span className="text-ink-muted text-sm">{activity.slug}</span>
                </div>
              </td>
              <td className="p-4">{activity.category?.name ?? "-"}</td>
              <td className="p-4">
                {activity.collection ? (
                  <span>{activity.collection.title}</span>
                ) : (
                  <span className="text-ink-muted">None</span>
                )}
              </td>
              <td className="p-4">{activity.estimatedMinutes}</td>
              <td className="p-4">{activity._count.steps}</td>
              <td className="p-4 flex gap-2">
                {activity.isPremium && (
                  <Badge tone="plum">Premium</Badge>
                )}
                {activity.featured && (
                  <Badge tone="sage">Featured</Badge>
                )}
              </td>
              <td className="p-4">
                {activity.status === "PUBLISHED" ? (
                  <Badge tone="sage">Published</Badge>
                ) : (
                  <Badge tone="clay">Draft</Badge>
                )}
              </td>
              <td className="p-4">{activity._count.sessions}</td>
              <td className="p-4 flex gap-2">
                <Link href={`/admin/activities/${activity.id}`} className="min-h-12 px-4 rounded-control border border-line-strong bg-surface text-ink hover:bg-sand transition-colors">
                  Edit
                </Link>
                <form action={setActivityStatusAction}>
                  <input type="hidden" name="id" value={activity.id} />
                  <input type="hidden" name="status" value={activity.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} />
                  <button type="submit" className="min-h-12 px-4 rounded-control border border-line-strong bg-surface text-ink hover:bg-sand transition-colors">
                    {activity.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </button>
                </form>
                <form action={toggleActivityFeaturedAction}>
                  <input type="hidden" name="id" value={activity.id} />
                  <button type="submit" className="min-h-12 px-4 rounded-control border border-line-strong bg-surface text-ink hover:bg-sand transition-colors">
                    {activity.featured ? "Unfeature" : "Feature"}
                  </button>
                </form>
                <form action={deleteActivityAction}>
                  <input type="hidden" name="id" value={activity.id} />
                  <ConfirmButton message="Are you sure you want to delete this activity?" variant="danger">
                    Delete
                  </ConfirmButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
