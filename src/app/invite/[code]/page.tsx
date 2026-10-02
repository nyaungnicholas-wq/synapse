import { getCurrentUser } from "@/lib/session";
import { lookupInvitation } from "@/lib/invitations";
import { clientIp, HOUR, rateLimit } from "@/lib/rate-limit";
import { formatDate } from "@/lib/labels";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AcceptInviteForm } from "@/components/app/forms-a";
import { Card, Avatar, Alert, ButtonLink } from "@/components/ui";
import Link from "next/link";
import { Check } from "lucide-react";

export const metadata = {
  title: "You're invited",
};

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // Codes are hard to guess (31^8), and this keeps anyone from trying many of them quickly.
  const allowed = rateLimit(`invite-view:${await clientIp()}`, 120, HOUR);
  const invitation = allowed ? await lookupInvitation(code) : null;
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader signedIn={Boolean(user)} />
      <main id="main" className="mx-auto max-w-xl px-4 py-12 sm:py-16">
        <Card>
          {!invitation && (
            <>
              <h1 className="font-display text-4xl mb-4">
                We couldn't find that invitation
              </h1>
              <p className="text-ink-soft mb-6">
                Please check the link or the code. Codes look like ABCD-2345.
              </p>
              {user ? (
                <ButtonLink href="/connect">Enter a code</ButtonLink>
              ) : (
                <ButtonLink href="/signup">Create an account</ButtonLink>
              )}
            </>
          )}
          {invitation && invitation.state === "valid" && (
            <>
              <Avatar name={invitation.inviterName} size="lg" className="mx-auto mb-4" />
              <h1 className="font-display text-4xl text-center mb-4">
                {invitation.inviterName} invited you to SYNAPSE
              </h1>
              <p className="text-ink-soft text-center mb-6">
                SYNAPSE is a private space for the two of you to talk, share stories and do small activities together. Only the two of you can see what you share.
              </p>
              <ul className="space-y-3 text-ink max-w-md mx-auto mb-6">
                <li className="flex items-start gap-3">
                  <Check className="mt-1 size-5 text-sage" aria-hidden="true" />
                  <span>Talk more often</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 size-5 text-sage" aria-hidden="true" />
                  <span>Learn about each other's lives</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 size-5 text-sage" aria-hidden="true" />
                  <span>Preserve family stories</span>
                </li>
              </ul>
              <p className="text-ink-soft text-center mb-6">
                This invitation works until {formatDate(invitation.expiresAt)}.
              </p>
              {user ? (
                user.id === invitation.inviterId ? (
                  <Alert tone="info">
                    This is your own invitation. Send this page's link or the code{" "}
                    <code className="font-mono">{code}</code>{" "}
                    to the person you want to connect with.
                  </Alert>
                ) : (
                  <AcceptInviteForm code={invitation.code} inviterName={invitation.inviterName} />
                )
              ) : (
                <>
                  <ButtonLink
                    size="lg"
                    className="w-full mb-3"
                    href={`/signup?next=${encodeURIComponent(`/invite/${invitation.code}`)}`}
                  >
                    Create my free account
                  </ButtonLink>
                  <p className="text-ink-soft text-center">
                    Already have an account? <Link href={`/login?next=${encodeURIComponent(`/invite/${invitation.code}`)}`}>Log in</Link>
                  </p>
                </>
              )}
            </>
          )}
          {invitation && invitation.state === "expired" && (
            <>
              <h1 className="font-display text-4xl mb-4">
                This invitation has expired
              </h1>
              <p className="text-ink-soft">
                Ask {invitation.inviterName} to send you a new one. It only takes them a moment.
              </p>
            </>
          )}
          {invitation && invitation.state === "accepted" && (
            <>
              <h1 className="font-display text-4xl mb-4">
                This invitation has already been used
              </h1>
              {user ? (
                <ButtonLink href="/dashboard">Go to my space</ButtonLink>
              ) : (
                <ButtonLink href="/login">Log in</ButtonLink>
              )}
            </>
          )}
          {invitation && invitation.state === "revoked" && (
            <>
              <h1 className="font-display text-4xl mb-4">
                This invitation was cancelled
              </h1>
              <p className="text-ink-soft">
                Ask {invitation.inviterName} for a new link or code.
              </p>
            </>
          )}
          {invitation && invitation.state === "full" && (
            <>
              <h1 className="font-display text-4xl mb-4">
                This space is already full
              </h1>
              <p className="text-ink-soft">
                A Connection Space is for two people, and both places are taken.
              </p>
            </>
          )}
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
