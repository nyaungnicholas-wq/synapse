import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { setUserRoleAction, setUserStatusAction } from "@/actions/admin";
import { ConfirmButton } from "@/components/client";
import { Notice } from "@/components/app/bits";
import { PageHeader, TextField, Button, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/labels";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);

  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { profile: { firstName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    include: {
      profile: { select: { firstName: true } },
      subscription: { select: { planCode: true, status: true } },
      _count: { select: { memberships: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage roles and suspend accounts that break the community rules. Suspending signs the person out everywhere."
      />

      <Notice
        value={sp.error}
        messages={{ self: "You can't change your own role or status." }}
        tone="error"
      />

      <form method="GET" className="flex gap-3">
        <TextField label="Search by name or email" name="q" defaultValue={q} className="w-full max-w-xs" />
        <Button type="submit" variant="secondary" className="min-h-12 self-end">
          Search
        </Button>
      </form>

      {users.length === 0 ? (
        <EmptyState title="No one matches that search" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table">
            <caption className="sr-only">User accounts</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="pb-3 font-medium text-ink-soft">Name</th>
                <th scope="col" className="pb-3 font-medium text-ink-soft">Email</th>
                <th scope="col" className="pb-3 font-medium text-ink-soft">Role</th>
                <th scope="col" className="pb-3 font-medium text-ink-soft">Status</th>
                <th scope="col" className="pb-3 font-medium text-ink-soft">Plan</th>
                <th scope="col" className="pb-3 font-medium text-ink-soft">Spaces</th>
                <th scope="col" className="pb-3 font-medium text-ink-soft">Joined</th>
                <th scope="col" className="pb-3 font-medium text-ink-soft">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === admin.id;
                const isAdmin = user.role === "ADMIN";
                const isSuspended = user.status === "SUSPENDED";
                const sub = user.subscription;
                const isPremium = sub && (sub.status === "ACTIVE" || sub.status === "TRIALING") && sub.planCode === "PREMIUM";

                return (
                  <tr key={user.id} className="border-b border-line">
                    <td className="py-3">
                      {user.profile?.firstName ?? "—"}
                      {isSelf && <span className="ml-2 text-sm text-ink-soft">(You)</span>}
                    </td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">
                      <Badge tone={isAdmin ? "plum" : "neutral"}>
                        {isAdmin ? "Admin" : "Member"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge tone={isSuspended ? "clay" : "sage"}>
                        {isSuspended ? "Suspended" : "Active"}
                      </Badge>
                    </td>
                    <td className="py-3">{isPremium ? "Premium" : "Free"}</td>
                    <td className="py-3">{user._count.memberships}</td>
                    <td className="py-3">{formatDate(user.createdAt)}</td>
                    <td className="py-3 flex items-center gap-2">
                      {isSelf ? (
                        <span className="text-ink-soft text-sm">You</span>
                      ) : (
                        <>
                          <form action={setUserRoleAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <input type="hidden" name="role" value={isAdmin ? "USER" : "ADMIN"} />
                            <Button
                              type="submit"
                              variant="secondary"
                              size="md"
                              className="min-h-12 text-sm"
                            >
                              {isAdmin ? "Remove admin" : "Make admin"}
                            </Button>
                          </form>
                          <form action={setUserStatusAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <input type="hidden" name="status" value={isSuspended ? "ACTIVE" : "SUSPENDED"} />
                            {isSuspended ? (
                              <Button
                                type="submit"
                                variant="secondary"
                                className="min-h-12 text-sm"
                              >
                                Reinstate
                              </Button>
                            ) : (
                              <ConfirmButton
                                message="Suspend this account? They will be signed out."
                                variant="danger"
                              >
                                Suspend
                              </ConfirmButton>
                            )}
                          </form>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}