import Link from "next/link";
import { ReportForm } from "@/components/admin/config-forms";
import { Badge, Card, EmptyState, PageHeader, pillClass } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Reports" };

const REASONS: Record<string, string> = {
  uncomfortable: "Felt uncomfortable",
  scam: "Possible scam",
  harmful: "Risk of harm",
  account: "Account taken over",
  other: "Other",
};
const FILTERS = ["OPEN", "REVIEWED", "CLOSED", "ALL"] as const;
const FILTER_LABELS = { OPEN: "Open", REVIEWED: "Reviewed", CLOSED: "Closed", ALL: "All" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = FILTERS.find((f) => f === sp.status) ?? "OPEN";
  const reports = await db.report.findMany({
    where: status === "ALL" ? {} : { status },
    include: {
      reporter: { select: { email: true, profile: { select: { firstName: true } } } },
      connection: { select: { id: true, _count: { select: { members: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Safety reports"
        description="Concerns raised by people inside their Connection Spaces. Treat them seriously and respond quickly."
      />
      <nav aria-label="Report status" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/reports?status=${f}`} className={pillClass(f === status)} aria-current={f === status ? "true" : undefined}>
            {FILTER_LABELS[f]}
          </Link>
        ))}
      </nav>
      {reports.length === 0 ? (
        <EmptyState title="No reports here">Nothing needs attention in this list.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => (
            <li key={r.id}>
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={r.reason === "harmful" || r.reason === "scam" ? "clay" : "neutral"}>{REASONS[r.reason] ?? r.reason}</Badge>
                  <Badge tone={r.status === "OPEN" ? "honey" : "sage"}>{r.status.toLowerCase()}</Badge>
                  <span className="text-ink-muted">{formatDate(r.createdAt)}</span>
                </div>
                <p className="mt-3 font-semibold">
                  {r.reporter.profile?.firstName ?? "Someone"} ({r.reporter.email})
                </p>
                <p className="text-sm text-ink-muted">
                  {r.connection ? `Space ${r.connection.id} (${r.connection._count.members} members)` : "No space"}
                </p>
                <p className="mt-3 whitespace-pre-line">{r.details}</p>
                {r.adminNote && <p className="mt-3 rounded-control bg-sand p-3 text-ink-soft">Team note: {r.adminNote}</p>}
                <details className="mt-4">
                  <summary className="min-h-12 cursor-pointer py-2 font-semibold">Update</summary>
                  <div className="mt-3">
                    <ReportForm report={{ id: r.id, status: r.status, adminNote: r.adminNote }} />
                  </div>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
