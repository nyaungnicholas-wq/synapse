"use client";


import Link from "next/link";
import { TextField, Alert, buttonClass } from "@/components/ui";
import { SubmitButton, useActionForm } from "@/components/client";
import { signupAction, loginAction, forgotPasswordAction, resetPasswordAction, resendVerificationAction } from "@/actions/auth";

export function GoogleButton({ next }: { next: string }) {
  return (
    <>
      <a
        href={`/api/auth/google?next=${encodeURIComponent(next)}`}
        className={buttonClass("secondary", "lg", "w-full")}
      >
        <svg aria-hidden="true" className="size-5" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M24 48c13.255 0 24.546-10.137 23.374-23.021h-14.77v-9.715h9.522V24h-9.522v9.715H12.626v-9.715H0v9.715C1.454 37.863 12.745 48 24 48z" />
          <path fill="#34A853" d="M0 24v9.715h12.626c-.614 3.307-2.382 6.367-5.248 8.975L7.48 43.475C3.577 39.778 1.454 34.938 1.454 29.715H0V24h12.626z" />
          <path fill="#FBBC05" d="M12.626 14.285c1.75-1.496 3.97-2.608 6.502-3.26V7.452l-9.522 9.522 9.522 9.522V24H0v-9.715h12.626z" />
          <path fill="#EA4335" d="M24 0c5.523 0 10.268 1.837 14.09 4.918l7.577-7.577C39.554 2.343 33.266 0 24 0v24h14.77c-1.126 5.294-4.655 9.98-9.77 13.021l7.577 7.577C45.863 37.863 48 31.572 48 24c0-13.255-10.745-24-24-24z" />
        </svg>
        Continue with Google
      </a>
      <div className="my-6 flex items-center gap-4 text-ink-muted">
        <span className="flex-1 border-t border-line" />
        <span>or</span>
        <span className="flex-1 border-t border-line" />
      </div>
    </>
  );
}

export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const { state, pending, onSubmit } = useActionForm(loginAction);

  return (
    <>
    {googleEnabled && <GoogleButton next={next} />}
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <input type="hidden" name="next" value={next} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={state.fieldErrors?.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <Link
        href="/forgot-password"
        className="font-semibold text-clay underline underline-offset-4 hover:text-clay-hover inline-flex min-h-12 items-center"
      >
        Forgot your password?
      </Link>
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
    <p className="mt-6">
      New to SYNAPSE?{" "}
      <Link
        href={`/signup?next=${encodeURIComponent(next)}`}
        className="font-semibold text-clay underline underline-offset-4 hover:text-clay-hover inline-flex min-h-12 items-center"
      >
        Create an account
      </Link>
    </p>
    </>
  );
}

export function SignupForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const { state, pending, onSubmit } = useActionForm(signupAction);

  return (
    <>
      {googleEnabled && <GoogleButton next={next} />}
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
        <input type="hidden" name="next" value={next} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          hint="We'll send a link to confirm it's you."
          required
          error={state.fieldErrors?.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters. A short sentence you'll remember works well."
          required
          error={state.fieldErrors?.password}
        />
        <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Creating your account…">
          Create my account
        </SubmitButton>
      </form>
      <p className="text-ink-muted text-sm mt-6">
        By creating an account you agree to keep your Connection Space kind and respectful.
      </p>
      <p className="mt-4">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-clay underline underline-offset-4 hover:text-clay-hover inline-flex min-h-12 items-center"
        >
          Log in
        </Link>
      </p>
    </>
  );
}

export function ForgotPasswordForm() {
  const { state, pending, onSubmit } = useActionForm(forgotPasswordAction);

  if (state.ok) {
    return (
      <>
        <Alert tone="success">{state.message}</Alert>
        <Link
          href="/login"
          className="font-semibold text-clay underline underline-offset-4 hover:text-clay-hover inline-flex min-h-12 items-center mt-4 block text-center"
        >
          Back to log in
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Sending…">
        Send me a reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { state, pending, onSubmit } = useActionForm(resetPasswordAction);

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {state.error && (
        <>
          <Alert tone="error">{state.error}</Alert>
          <Link
            href="/forgot-password"
            className="font-semibold text-clay underline underline-offset-4 hover:text-clay-hover inline-flex min-h-12 items-center"
          >
            Ask for a new link
          </Link>
        </>
      )}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <input type="hidden" name="token" value={token} />
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        required
        error={state.fieldErrors?.password}
      />
      <TextField
        label="Type it again"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}

export function ResendVerificationForm() {
  const { state, pending, onSubmit } = useActionForm(async () => resendVerificationAction());

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3" noValidate>
      <SubmitButton pending={pending} variant="secondary" size="lg" pendingLabel="Sending…">
        Send the link again
      </SubmitButton>
      <p role="status" className="text-ink-soft">
        {state.message || state.error}
      </p>
    </form>
  );
}