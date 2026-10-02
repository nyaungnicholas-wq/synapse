import { requireOnboardedUser } from "@/lib/session";
import { EmailForm, ProfileForm, PasswordForm } from "@/components/app/forms-a";
import { ResendVerificationForm } from "@/components/auth-forms";
import { logoutAction } from "@/actions/auth";
import { PageHeader, Card, Badge, Button, ButtonLink } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireOnboardedUser();
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Your account"
        description="Change your details, text size and password."
      />
      <div className="space-y-8 max-w-3xl">
        <Card className="space-y-6">
          <h2 className="font-display text-2xl">Your profile</h2>
          <ProfileForm profile={user.profile} />
        </Card>
        <Card className="space-y-6">
          <h2 id="email" className="font-display text-2xl">Email</h2>
          <div className="space-y-4">
            <p className="text-ink">{user.email}</p>
            {user.emailVerifiedAt ? (
              <Badge tone="sage">Confirmed</Badge>
            ) : (
              <>
                <Badge tone="honey">Not confirmed yet</Badge>
                <ResendVerificationForm />
              </>
            )}
          </div>
          {user.isDemo ? (
            <p className="text-ink-soft">Demo accounts use a made-up address and can&apos;t change it.</p>
          ) : (
            <EmailForm currentEmail={user.email} hasPassword={Boolean(user.passwordHash)} />
          )}
        </Card>
        <Card className="space-y-6">
          <h2 className="font-display text-2xl">Password</h2>
          <div className="space-y-4">
            {user.googleId && <p>You sign in with Google.</p>}
            {user.isDemo ? (
              <p className="text-ink-soft">Demo accounts don&apos;t have a password. Create a real account to keep your own space.</p>
            ) : (
              <PasswordForm hasPassword={Boolean(user.passwordHash)} />
            )}
          </div>
        </Card>
        <Card className="space-y-6">
          <h2 className="font-display text-2xl">Plan</h2>
          <div className="space-y-4">
            <ButtonLink href="/billing" variant="secondary">Plan and billing</ButtonLink>
          </div>
        </Card>
        <Card className="space-y-6">
          <h2 className="font-display text-2xl">Log out</h2>
          <form action={logoutAction}>
            <Button variant="secondary" type="submit">
              Log out of SYNAPSE
            </Button>
          </form>
        </Card>
        <Card className="space-y-6">
          <h2 className="font-display text-2xl">Your data</h2>
          <p className="whitespace-pre-line">
            Everything in a Connection Space is private to its two members. To delete your account and everything you've added, email your program coordinator — self-service deletion is coming soon.
          </p>
        </Card>
      </div>
    </>
  );
}
