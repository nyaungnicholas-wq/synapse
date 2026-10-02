import Link from "next/link";
import { Logo } from "@/components/site-chrome";
import { Badge } from "@/components/ui";
import { ButtonLink } from "@/components/ui";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
          <Logo className="h-8 w-auto" />
          <Badge tone="plum">Admin</Badge>
          <span className="text-ink-muted hidden md:block">{admin.email}</span>
          <ButtonLink variant="quiet" href="/dashboard">
            Back to the app
          </ButtonLink>
        </div>
      </div>

      <div className="grid lg:grid-cols-[256px_1fr] min-h-[calc(100vh-64px)]">
        <aside className="w-64 lg:block hidden border-r border-line bg-sand/30">
          <nav aria-label="Admin" className="flex flex-col gap-1 p-4">
            <Link href="/admin" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand">
              Overview
            </Link>
            <Link href="/admin/users" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand">
              Users
            </Link>
            <Link href="/admin/prompts" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand">
              Prompts
            </Link>
            <Link href="/admin/activities" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand">
              Activities
            </Link>
            <Link href="/admin/categories" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand">
              Categories
            </Link>
            <Link href="/admin/featured" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand">
              Featured &amp; collections
            </Link>
            <Link href="/admin/plans" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand">
              Plans
            </Link>
            <Link href="/admin/reports" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand">
              Reports
            </Link>
          </nav>
        </aside>

        <main id="main" className="min-w-0 px-4 py-8 sm:px-8">{children}</main>

        <nav aria-label="Admin" className="lg:hidden border-t border-line bg-sand/30">
          <div className="flex overflow-x-auto gap-2 px-4 py-3">
            <Link href="/admin" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand whitespace-nowrap">
              Overview
            </Link>
            <Link href="/admin/users" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand whitespace-nowrap">
              Users
            </Link>
            <Link href="/admin/prompts" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand whitespace-nowrap">
              Prompts
            </Link>
            <Link href="/admin/activities" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand whitespace-nowrap">
              Activities
            </Link>
            <Link href="/admin/categories" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand whitespace-nowrap">
              Categories
            </Link>
            <Link href="/admin/featured" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand whitespace-nowrap">
              Featured &amp; collections
            </Link>
            <Link href="/admin/plans" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand whitespace-nowrap">
              Plans
            </Link>
            <Link href="/admin/reports" className="block min-h-12 rounded-control px-4 py-3 font-semibold text-ink-soft hover:bg-sand whitespace-nowrap">
              Reports
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
