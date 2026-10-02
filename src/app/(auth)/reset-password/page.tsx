import { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth-forms";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token || token.length > 200) {
    return (
      <>
        <h1 className="font-display text-4xl text-ink">This link is incomplete</h1>
        <p className="mt-2 text-ink-soft">
          The password reset link is missing or invalid. Please request a new one.
        </p>
        <ButtonLink href="/forgot-password" className="mt-6">Ask for a new link</ButtonLink>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl text-ink">Choose a new password</h1>
      <ResetPasswordForm token={token} />
    </>
  );
}
