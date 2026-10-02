import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-4xl text-ink">Forgot your password?</h1>
      <p className="mt-2 text-ink-soft">
        Enter the email you signed up with and we&apos;ll send you a link to choose a new one.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
