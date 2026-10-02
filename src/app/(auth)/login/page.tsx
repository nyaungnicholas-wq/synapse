import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNextPath } from "@/lib/session";
import { features } from "@/lib/env";
import { LoginForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNextPath(next));

  return (
    <>
      <h1 className="font-display text-4xl text-ink">Welcome back</h1>
      <p className="mt-2 text-ink-soft">Log in to see what you can do together today.</p>
      {error === "google-failed" && (
        <Alert tone="error" title="We could not sign you in with Google." className="mt-6">
          Please try again or use your email.
        </Alert>
      )}
      {error === "google-unavailable" && (
        <Alert tone="error" title="Google sign-in is not set up yet." className="mt-6">
          Please use your email and password.
        </Alert>
      )}
      <div className="mt-8">
        <LoginForm next={safeNextPath(next)} googleEnabled={features.google} />
      </div>
    </>
  );
}
