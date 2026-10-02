import { Card, PageHeader, SectionTitle, EmptyState, Alert, Avatar, ButtonLink } from "@/components/ui";
import { CopyButton, ConfirmButton } from "@/components/client";
import { revokeInviteAction } from "@/actions/connections";
import { formatDate } from "@/lib/labels";
import { memberName, spaceTitle, listSpaces } from "@/lib/spaces";
import { requireOnboardedUser } from "@/lib/session";
import { getPendingInvitations } from "@/lib/queries";
import { env } from "@/lib/env";
import { InviteForm, JoinCodeForm } from "@/components/app/forms-a";

export const metadata = { title: "Invite your person" };

export default async function ConnectPage({
  searchParams,
}: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const user = await requireOnboardedUser();
  const invitations = await getPendingInvitations(user.id);
  const spaces = await listSpaces(user.id);
  const appUrl = env.appUrl;
  const waiting = spaces.find((s) => !s.partner && !s.closedAt);

  return (
    <div className="space-y-10">
      {welcome === "1" && (
        <Alert tone="success" title="Your profile is ready.">
          Now invite the person you'd like to connect with.
        </Alert>
      )}

      <PageHeader
        eyebrow="Connect"
        title="Invite your person"
        description={`Invite ${user.profile.connectWithLabel || "someone"} to a private Connection Space just for the two of you.`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl text-ink mb-4">Send an invitation</h2>
          <p className="text-ink-soft mb-4">
            Share the invitation in whichever way feels easiest:
          </p>
          <ul className="list-disc list-inside space-y-2 text-ink-soft mb-6">
            <li>Send a link they can click</li>
            <li>Read out the 8-character code over the phone</li>
            <li>Email it directly</li>
          </ul>
          <InviteForm connectionId={waiting?.id} canEmail={Boolean(user.emailVerifiedAt)} />
        </Card>

        <Card>
          <h2 className="font-display text-2xl text-ink mb-4">Have a code?</h2>
          <p className="text-ink-soft mb-4">
            If someone invited you, enter their code here.
          </p>
          <JoinCodeForm />
        </Card>
      </div>

      <SectionTitle>Your invitations</SectionTitle>
      {invitations.length === 0 ? (
        <EmptyState title="No open invitations">Create one above and it will appear here, ready to share.</EmptyState>
      ) : (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <Card key={inv.id} className="space-y-4 p-6">
              <p className="font-display text-4xl tracking-[0.2em] text-ink break-all">
                <span aria-hidden="true">{inv.code}</span>
                <span className="sr-only">Code: {inv.code.replace("-", "").split("").join(" ")}</span>
              </p>
              <div className="space-y-1 text-ink-soft text-sm">
                <p>Works until {formatDate(inv.expiresAt)}</p>
                {inv.email && <p>Sent to {inv.email}</p>}
              </div>
              <p className="break-all text-ink-soft text-sm font-mono">{appUrl}/invite/{inv.code}</p>
              <div className="flex flex-wrap gap-3">
                <CopyButton value={`${appUrl}/invite/${inv.code}`} label="Copy link" />
                <CopyButton value={inv.code} label="Copy code" />
                <form action={revokeInviteAction}>
                  <input type="hidden" name="invitationId" value={inv.id} />
                  <ConfirmButton
                    variant="secondary"
                    message="Cancel this invitation? The code and link will stop working."
                  >
                    Cancel invitation
                  </ConfirmButton>
                </form>
              </div>
              <p className="text-ink-muted text-sm">
                Reading the code aloud? Letters and numbers that look alike (like O and 0) are never used.
              </p>
            </Card>
          ))}
        </div>
      )}

      <SectionTitle>Your Connection Spaces</SectionTitle>
      {spaces.length === 0 ? (
        <EmptyState title="No spaces yet">When someone joins with your code, your shared space appears here.</EmptyState>
      ) : (
        <div className="space-y-4">
          {spaces.map((space) => (
            <Card key={space.id} className="flex items-center gap-4 p-4">
              <Avatar name={space.partner ? memberName(space.partner) : "?"} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg text-ink truncate">
                  {spaceTitle(space, user.profile.connectWithLabel)}
                </p>
              </div>
              <ButtonLink href={`/spaces/${space.id}`} variant="primary" size="md">
                Open
              </ButtonLink>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}