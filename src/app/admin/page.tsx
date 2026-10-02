import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { Stat } from "@/components/ui";
import { SectionTitle } from "@/components/ui";
import { Card } from "@/components/ui";
import { Alert } from "@/components/ui";
import { Notice } from "@/components/app/bits";
import { formatDate } from "@/lib/labels";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata = {
  title: "Admin overview",
};

const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  await requireAdmin();

  const { notice, error } = await searchParams;

  const since = sevenDaysAgo();

  const [
    users,
    activeSpaces,
    connections,
    conversations7,
    activities7,
    memories7,
    premium,
    openReports,
    recentUsers,
    publishedPrompts,
    publishedActivities,
  ] = await Promise.all([
    db.user.count(),
    db.connection.count({ where: { status: "ACTIVE", members: { some: {} } } }),
    db.connection.findMany({
      where: { status: "ACTIVE" },
      select: { _count: { select: { members: true } } },
    }),
    db.conversation.count({ where: { status: "COMPLETED", completedAt: { gte: since } } }),
    db.activitySession.count({ where: { status: "COMPLETED", completedAt: { gte: since } } }),
    db.memory.count({ where: { createdAt: { gte: since } } }),
    db.subscription.count({ where: { planCode: "PREMIUM", status: { in: ["ACTIVE", "TRIALING"] } } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { profile: { select: { firstName: true } } },
    }),
    db.prompt.count({ where: { status: "PUBLISHED" } }),
    db.activity.count({ where: { status: "PUBLISHED" } }),
  ]);

  const pairedSpaces = connections.filter((c) => c._count.members === 2).length;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Overview"
        description="How SYNAPSE is being used. Numbers only — no one's private content is shown here."
      />

      {openReports > 0 && (
        <Alert tone="error" title="Open reports" className="mt-4">
          <Link href="/admin/reports" className="underline">
            Review open reports
          </Link>
        </Alert>
      )}

      <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Stat label="People" value={users} />
        <Stat
          label="Paired spaces"
          value={pairedSpaces}
          hint={`${activeSpaces} active in total`}
        />
        <Stat label="Premium members" value={premium} />
        <Stat label="Open reports" value={openReports} />
      </dl>

      <div className="mt-8">
        <SectionTitle>Last 7 days</SectionTitle>
      </div>
      <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <Stat label="Conversations completed" value={conversations7} />
        <Stat label="Activities completed" value={activities7} />
        <Stat label="Memories saved" value={memories7} />
      </dl>

      <Card className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-ink">Newest people</h2>
        <table className="w-full text-sm text-ink">
          <caption className="sr-only">Newest people</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="text-left px-3 py-2 text-ink-soft font-sans">
                Name
              </th>
              <th scope="col" className="text-left px-3 py-2 text-ink-soft font-sans">
                Email
              </th>
              <th scope="col" className="text-left px-3 py-2 text-ink-soft font-sans">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {recentUsers.map((user) => (
              <tr key={user.id} className="hover:bg-sand/50">
                <td className="px-3 py-3 whitespace-nowrap">
                  {user.profile?.firstName ?? user.email}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{user.email}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="mt-6 text-ink-soft">
        {publishedPrompts} published questions ·
        <Link href="/admin/prompts" className="underline">
          manage them
        </Link>
        ·
        {publishedActivities} published activities ·
        <Link href="/admin/activities" className="underline">
          manage them
        </Link>
      </p>

      <Notice
        value={notice}
        messages={{
          saved: "Changes saved.",
          deleted: "Item deleted.",
        }}
        tone="success"
      />
      <Notice
        value={error}
        messages={{
          "in-use": "Cannot delete: item is in use.",
          self: "You cannot modify your own role or status.",
        }}
        tone="error"
      />
    </>
  );
}
