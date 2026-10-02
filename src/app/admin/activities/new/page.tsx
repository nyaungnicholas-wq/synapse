import { BackLink } from "@/components/app/bits";
import { PageHeader } from "@/components/ui";
import { Card } from "@/components/ui";
import { ActivityForm } from "@/components/admin/activity-form";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function Page() {
  await requireAdmin();

  const categories = await db.category.findMany({
    where: { kind: "ACTIVITY" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const collections = await db.collection.findMany({
    select: { id: true, title: true },
    orderBy: { month: "desc" },
  });

  return (
    <>
      <BackLink href="/admin/activities">← Back to activities</BackLink>
      <PageHeader title="New activity" />
      <Card>
        <ActivityForm categories={categories} collections={collections} />
      </Card>
    </>
  );
}
