import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNextPath } from "@/lib/session";
import { features } from "@/lib/env";
import { SignupForm } from "@/components/auth-forms";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNextPath(next));

  return (
    <>
      <h1 className="font-display text-4xl text-ink">Start connecting</h1>
      <p className="mt-2 text-ink-soft">
        Create your free account. It takes about two minutes, and you can invite your person straight after.
      </p>
      <SignupForm next={safeNextPath(next)} googleEnabled={features.google} />
      <div className="mt-8 flex items-start gap-3 text-sm text-ink-soft">
        <ShieldCheck className="size-5 shrink-0 mt-0.5 text-sage" aria-hidden="true" />
        <p>Your Connection Space is private to the two of you.</p>
      </div>
    </>
  );
}
