"use client";

import { startTransition, useActionState, useEffect, useState, useSyncExternalStore, type ComponentProps, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, WifiOff } from "lucide-react";
import { buttonClass, cx, type ButtonSize, type ButtonVariant } from "@/components/ui";
import type { ActionState } from "@/lib/validation";

/**
 * useActionState for forms that must keep what the person typed when the server says no.
 * React 19 resets uncontrolled fields after a `<form action>` finishes, even on a validation
 * error; submitting through onSubmit avoids that, so a long story is never wiped by a typo.
 * Usage: const { state, pending, onSubmit } = useActionForm(action); <form onSubmit={onSubmit}>
 */
export function useActionForm(action: (prev: ActionState, form: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(async (prev: ActionState, form: FormData) => {
    try {
      return await action(prev, form);
    } catch (err) {
      // Redirects and not-found are Next.js control flow, not failures.
      const digest = (err as { digest?: unknown } | null)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) throw err;
      // Offline, server down, body too large: stay on the form so nothing typed is lost.
      return { error: "We couldn't save that just now. Please check your connection and try again — what you wrote is still here." };
    }
  }, {} as ActionState);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(() => dispatch(form));
  };
  return { state, pending, onSubmit };
}

const noopSubscribe = () => () => {};

/** Submit button that disables itself and says what is happening while the form is sending. */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant,
  size,
  className,
  pending: pendingProp,
  ...props
}: ComponentProps<"button"> & { pendingLabel?: string; variant?: ButtonVariant; size?: ButtonSize; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  // onSubmit-driven forms (those passing `pending`) have no server fallback: a click before
  // hydration would do a native GET and put fields - even a password - in the URL. Disabling the
  // default button also blocks Enter-key implicit submission until the handler is attached.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return (
    <button
      type="submit"
      disabled={pending || props.disabled || (pendingProp !== undefined && !hydrated)}
      aria-disabled={pending || undefined}
      className={cx(buttonClass(variant, size), className)}
      {...props}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Copies text and confirms out loud (aria-live) so screen-reader users know it worked. */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("secondary")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          window.prompt("Copy this:", value);
        }
      }}
    >
      {copied ? <Check aria-hidden="true" className="size-5" /> : <Copy aria-hidden="true" className="size-5" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

/** Shown whenever the device loses its connection, so a failed save is never a mystery. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-3 bg-ink px-4 py-4 text-white">
      <WifiOff aria-hidden="true" className="size-6 shrink-0" />
      <p className="font-semibold">You are offline. Anything you write will be kept on this screen until your connection is back.</p>
    </div>
  );
}

/** A submit button that asks "Are you sure?" first. For deletes and leaving a space. */
export function ConfirmButton({ children, message, variant = "danger" }: { children: React.ReactNode; message: string; variant?: ButtonVariant }) {
  return (
    <button
      type="submit"
      className={buttonClass(variant)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
