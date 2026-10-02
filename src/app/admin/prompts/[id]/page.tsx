import { BackLink } from "@/components/app/bits";
import { PageHeader } from "@/components/ui";
import { Card } from "@/components/ui";
import { PromptForm } from "@/components/admin/prompt-form";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const prompt = await db.prompt.findUnique({
    where: { id },
  });

  if (!prompt) notFound();

  return (
    <>
      <BackLink href="/admin/prompts">All prompts</BackLink>
      <PageHeader title="Edit question" />
      <Card>
        <PromptForm
          categories={[]}
          values={{
            id: prompt.id,
            categoryId: prompt.categoryId,
            text: prompt.text,
            followUp: prompt.followUp ?? "",
            audience: prompt.audience,
            isPremium: prompt.isPremium,
            featured: prompt.featured,
            status: prompt.status,
          }}
        />
      </Card>
    </>
  );
}
