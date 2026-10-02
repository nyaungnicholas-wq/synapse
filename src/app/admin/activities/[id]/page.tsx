import { notFound } from "next/navigation";
import { BackLink } from "@/components/app/bits";
import { PageHeader } from "@/components/ui";
import { Card } from "@/components/ui";
import { ActivityForm } from "@/components/admin/activity-form";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const activity = await db.activity.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" } },
    },
  });

  if (!activity) notFound();

  const categories = await db.category.findMany({
    where: { kind: "ACTIVITY" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const collections = await db.collection.findMany({
    select: { id: true, title: true },
    orderBy: { month: "desc" },
  });

  const values = {
    id: activity.id,
    slug: activity.slug,
    title: activity.title,
    summary: activity.summary,
    description: activity.description,
    categoryId: activity.categoryId,
    collectionId: activity.collectionId ?? "",
    estimatedMinutes: activity.estimatedMinutes,
    difficulty: activity.difficulty,
    reflectionQuestion: activity.reflectionQuestion,
    isPremium: activity.isPremium,
    featured: activity.featured,
    status: activity.status,
    steps: activity.steps.map((step) => ({
      title: step.title,
      body: step.body,
      stepFor: step.stepFor,
    })),
  };

  return (
    <>
      <BackLink href="/admin/activities">← Back to activities</BackLink>
      <PageHeader title="Edit activity" />
      <Card>
        <ActivityForm categories={categories} collections={collections} values={values} />
      </Card>
    </>
  );
}
