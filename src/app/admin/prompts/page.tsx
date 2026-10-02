import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { SelectField } from "@/components/ui";
import { Notice } from "@/components/app/bits";
import { EmptyState } from "@/components/ui";
import { Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { setPromptStatusAction } from "@/actions/admin";
import { togglePromptFeaturedAction } from "@/actions/admin";
import { deletePromptAction } from "@/actions/admin";

export const metadata = {
  title: "Prompts",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    category?: string;
    notice?: string;
    error?: string;
  }>;
}) {
  const { status, category, notice, error } = await searchParams;
  await requireAdmin();

  const categories = await db.category.findMany({
    where: { kind: "PROMPT" },
    orderBy: { sortOrder: "asc" },
  });

  const statusFilter = status === "DRAFT" || status === "PUBLISHED" ? status : undefined;
  const categoryFilter = categories.some((c) => c.id === category) ? category : undefined;

  const prompts = await db.prompt.findMany({
    where: {
      ...(statusFilter && { status: statusFilter }),
      ...(categoryFilter && { categoryId: categoryFilter }),
    },
    include: {
      category: true,
      _count: {
        select: { conversations: true },
      },
    },
    orderBy: [
      { category: { sortOrder: "asc" } },
      { createdAt: "asc" },
    ],
  });

  return (
    <>
      <PageHeader
        title="Conversation prompts"
        actions={
          <ButtonLink href="/admin/prompts/new">New question</ButtonLink>
        }
      />
      {notice && (
        <Notice
          value={notice}
          messages={{
            saved: "Question saved.",
            deleted: "Question deleted.",
          }}
          tone="success"
        />
      )}
      {error && (
        <Notice
          value={error}
          messages={{
            "in-use":
              "That question has been used in conversations, so it can't be deleted. Unpublish it instead.",
          }}
          tone="error"
        />
      )}
      <form method="get" className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <SelectField
            label="Status"
            name="status"
            options={[
              { value: "", label: "All" },
              { value: "DRAFT", label: "Draft" },
              { value: "PUBLISHED", label: "Published" },
            ]}
            defaultValue={status ?? ""}
          />
          <SelectField
            label="Category"
            name="category"
            options={[
              { value: "", label: "All" },
              ...categories.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
            defaultValue={category ?? ""}
          />
          <button type="submit" className="btn btn-primary">
            Filter
          </button>
        </div>
      </form>
      {prompts.length > 0 ? (
        <>
          <table className="w-full text-left">
            <caption className="sr-only">Prompts list</caption>
            <thead>
              <tr>
                <th scope="col" className="pb-2">
                  Question
                </th>
                <th scope="col" className="pb-2">
                  Category
                </th>
                <th scope="col" className="pb-2">
                  Who answers
                </th>
                <th scope="col" className="pb-2">
                  Flags
                </th>
                <th scope="col" className="pb-2">
                  Status
                </th>
                <th scope="col" className="pb-2">
                  Used
                </th>
                <th scope="col" className="pb-2">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-4">
                    <p className="text-ink">{p.text}</p>
                    {p.followUp && (
                      <p className="text-ink-muted text-sm">{p.followUp}</p>
                    )}
                  </td>
                  <td className="py-4">{p.category.name}</td>
                  <td className="py-4">
                    {p.audience === "ANYONE" ? "Either person" : p.audience === "OLDER" ? "The older person" : "The younger person"}
                  </td>
                  <td className="py-4 flex gap-2">
                    {p.isPremium && (
                      <Badge tone="plum" className="text-xs">
                        Premium
                      </Badge>
                    )}
                    {p.featured && (
                      <Badge tone="sage" className="text-xs">
                        Featured
                      </Badge>
                    )}
                  </td>
                  <td className="py-4">
                    <Badge
                      tone={p.status === "PUBLISHED" ? "sage" : "neutral"}
                    >
                      {p.status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="py-4">{p._count.conversations}</td>
                  <td className="py-4 space-x-2">
                    <Link
                      href={`/admin/prompts/${p.id}`}
                      className="btn btn-quiet"
                    >
                      Edit
                    </Link>
                    <form action={setPromptStatusAction} className="inline">
                      <input type="hidden" name="id" defaultValue={p.id} />
                      <input
                        type="hidden"
                        name="status"
                        defaultValue={p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                      />
                      <button type="submit" className="btn btn-quiet">
                        {p.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                    <form action={togglePromptFeaturedAction} className="inline">
                      <input type="hidden" name="id" defaultValue={p.id} />
                      <button type="submit" className="btn btn-quiet">
                        {p.featured ? "Unfeature" : "Feature"}
                      </button>
                    </form>
                    <form action={deletePromptAction} className="inline">
                      <input type="hidden" name="id" defaultValue={p.id} />
                      <ConfirmButton
                        message="Delete this question permanently?"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-ink-muted">
            {prompts.length} questions
          </p>
        </>
      ) : (
        <EmptyState
          title="No prompts"
          action={
            <ButtonLink href="/admin/prompts/new">New question</ButtonLink>
          }
        />
      )}
    </>
  );
}
