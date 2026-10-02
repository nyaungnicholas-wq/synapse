import { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { ResendVerificationForm } from "@/components/auth-forms";
import { ButtonLink } from "@/components/ui";
import { MailCheck } from "lucide-react";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await getCurrentUser();

  if (status === "expired") {
    return (
      <>
        <h1 className="font-display text-4xl text-ink">That link has expired</h1>
        <p className="mt-2 text-ink-soft">
          Confirmation links work for 24 hours and only once.
        </p>
        {user && !user.emailVerifiedAt ? (
          <ResendVerificationForm />
        ) : (
          <ButtonLink href="/login" className="mt-6">Log in</ButtonLink>
        )}
      </>
    );
  }

  return (
    <>
      <div className="mx-auto size-16 rounded-full bg-sage-soft flex items-center justify-center mb-6" aria-hidden="true">
        <MailCheck className="size-8 text-sage" />
      </div>
      <h1 className="font-display text-4xl text-ink text-center">Check your email</h1>
      <p className="mt-2 text-ink-soft text-center">
        We sent you a link to confirm your email address. Open it on this device to continue.
      </p>
      <ButtonLink href="/dashboard" variant="secondary" className="mt-8 w-full">Continue to SYNAPSE</ButtonLink>
    </>
  );
}
