import { BackLink } from "@/components/app/bits";
import { PageHeader } from "@/components/ui";
import { Card } from "@/components/ui";
import { PromptForm } from "@/components/admin/prompt-form";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function Page() {
  await requireAdmin();

  const categories = await db.category.findMany({
    where: { kind: "PROMPT" },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <>
      <BackLink href="/admin/prompts">All prompts</BackLink>
      <PageHeader title="New question" />
      <Card>
        <PromptForm categories={categories} />
      </Card>
    </>
  );
}
