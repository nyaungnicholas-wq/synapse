import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Alert, ButtonLink } from "@/components/ui";
import type { PlanLimits } from "@/lib/entitlements";

/** "← Back to …" link at the top of a page. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex min-h-12 items-center gap-2 font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-5" />
      {children}
    </Link>
  );
}

/** Shows a success/error banner for a `?notice=` or `?error=` query value, if it is one we know. */
export function Notice({ value, messages, tone = "success" }: { value?: string; messages: Record<string, string>; tone?: "success" | "error" | "info" }) {
  const text = value ? messages[value] : undefined;
  if (!text) return null;
  return (
    <div className="mb-6">
      <Alert tone={tone}>{text}</Alert>
    </div>
  );
}

/** One plain sentence about free-plan limits, or nothing for Premium. */
export function UsageNote({
  plan,
  usage,
  kind,
}: {
  plan: PlanLimits;
  usage: { conversationsThisWeek: number; activitiesThisWeek: number };
  kind: "prompt" | "activity";
}) {
  const limit = kind === "prompt" ? plan.weeklyPromptLimit : plan.weeklyActivityLimit;
  if (limit === null) return null;
  const used = kind === "prompt" ? usage.conversationsThisWeek : usage.activitiesThisWeek;
  const left = Math.max(0, limit - used);
  const noun = kind === "prompt" ? (left === 1 ? "new conversation" : "new conversations") : left === 1 ? "activity" : "activities";
  return (
    <p className="text-ink-muted">
      Free plan: {left} {noun} left this week.{" "}
      <Link href="/billing" className="font-semibold text-clay underline underline-offset-4">
        See Premium
      </Link>
    </p>
  );
}

/** Shown in place of a Start button when something needs Premium. */
export function PremiumLock({ message = "This one is part of SYNAPSE Premium." }: { message?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-control bg-plum-soft p-4">
      <Lock aria-hidden="true" className="size-6 shrink-0 text-plum" />
      <p className="flex-1 font-semibold text-plum">{message}</p>
      <ButtonLink href="/billing" variant="secondary">
        See Premium
      </ButtonLink>
    </div>
  );
}
