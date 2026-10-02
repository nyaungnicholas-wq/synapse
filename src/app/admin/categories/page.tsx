import { deleteCategoryAction } from "@/actions/admin";
import { CategoryForm } from "@/components/admin/config-forms";
import { Notice } from "@/components/app/bits";
import { ConfirmButton } from "@/components/client";
import { Badge, Card, PageHeader, SectionTitle } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const categories = await db.category.findMany({
    include: { _count: { select: { prompts: true, activities: true } } },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
  });
  const groups = [
    { kind: "PROMPT", title: "Conversation themes" },
    { kind: "ACTIVITY", title: "Activity types" },
  ] as const;

  return (
    <>
      <PageHeader title="Categories" description="Themes for conversation prompts and types of activities." />
      <Notice
        tone="error"
        value={sp.error}
        messages={{ "in-use": "That category still has content in it. Move or delete the content first." }}
      />
      {groups.map((g) => (
        <section key={g.kind} aria-labelledby={`cat-${g.kind}`} className="mb-10">
          <SectionTitle id={`cat-${g.kind}`}>{g.title}</SectionTitle>
          <ul className="space-y-3">
            {categories
              .filter((c) => c.kind === g.kind)
              .map((c) => (
                <li key={c.id}>
                  <Card className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-xl">{c.name}</h3>
                      <span className="text-ink-muted">{c.slug}</span>
                      <Badge tone={c.status === "PUBLISHED" ? "sage" : "neutral"}>{c.status === "PUBLISHED" ? "Published" : "Draft"}</Badge>
                      <span className="text-ink-muted">{c._count.prompts + c._count.activities} items</span>
                    </div>
                    {c.description && <p className="mt-1 text-ink-soft">{c.description}</p>}
                    <details className="mt-3">
                      <summary className="min-h-12 cursor-pointer py-2 font-semibold">Edit</summary>
                      <div className="mt-3">
                        <CategoryForm
                          values={{ id: c.id, kind: c.kind, slug: c.slug, name: c.name, description: c.description, sortOrder: c.sortOrder, status: c.status }}
                        />
                      </div>
                    </details>
                    <form action={deleteCategoryAction} className="mt-2">
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton variant="secondary" message={`Delete the category "${c.name}"?`}>
                        Delete
                      </ConfirmButton>
                    </form>
                  </Card>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <Card>
        <h2 className="mb-4 font-display text-2xl">Add a category</h2>
        <CategoryForm />
      </Card>
    </>
  );
}
