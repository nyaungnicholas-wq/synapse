import Link from "next/link";
import { LogOut } from "lucide-react";
import { leaveDemoAction, logoutAction, switchDemoPersonAction } from "@/actions/auth";
import { buttonClass } from "@/components/ui";
import { setTextSizeAction } from "@/actions/account";
import { AppNav, MobileNavSpacer, type NavItem } from "@/components/app/app-nav";
import { OfflineBanner } from "@/components/client";
import { Logo } from "@/components/site-chrome";
import { ResendVerificationForm } from "@/components/auth-forms";
import type { OnboardedUser } from "@/lib/session";
import { listSpaces } from "@/lib/spaces";

const NEXT_SIZE = { STANDARD: "LARGE", LARGE: "EXTRA_LARGE", EXTRA_LARGE: "STANDARD" } as const;
const SIZE_HINT = { STANDARD: "Make text larger", LARGE: "Make text largest", EXTRA_LARGE: "Make text standard size" } as const;

/** Header, navigation and banners for every signed-in page. */
export async function AppShell({ user, children }: { user: OnboardedUser; children: React.ReactNode }) {
  const spaces = await listSpaces(user.id);
  const primary = spaces.find((s) => s.partner) ?? spaces[0];
  const base = primary ? `/spaces/${primary.id}` : null;
  const items: NavItem[] = [
    { href: "/dashboard", label: "Today", icon: "home", match: "/dashboard" },
    base
      ? { href: `${base}/talk`, label: "Talk", icon: "talk", match: `${base}/talk` }
      : { href: "/connect", label: "Talk", icon: "talk", match: "/talk" },
    base
      ? { href: `${base}/activities`, label: "Activities", icon: "activities", match: `${base}/activities` }
      : { href: "/connect", label: "Activities", icon: "activities", match: "/activities" },
    base
      ? { href: `${base}/memories`, label: "Memories", icon: "memories", match: `${base}/memories` }
      : { href: "/connect", label: "Memories", icon: "memories", match: "/memories" },
    { href: "/settings", label: "Settings", icon: "settings", match: "/settings" },
  ];
  const size = user.profile.textSize;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Logo />
          <AppNav items={items} />
          <div className="flex items-center gap-1">
            <form action={setTextSizeAction}>
              <input type="hidden" name="textSize" value={NEXT_SIZE[size]} />
              <button
                type="submit"
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-control px-3 font-display text-xl font-semibold text-ink hover:bg-sand"
                aria-label={SIZE_HINT[size]}
                title={SIZE_HINT[size]}
              >
                A<span className="text-2xl">A</span>
              </button>
            </form>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-control px-2 font-semibold text-ink-soft hover:bg-sand hover:text-ink sm:px-3"
              >
                <LogOut aria-hidden="true" className="size-5" />
                <span>Log out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      {user.isDemo && (
        <div className="border-b border-line bg-plum-soft">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="font-semibold text-plum">
              Demo: you&apos;re exploring as {user.profile.firstName}. This is your own private copy and it resets within a day.
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={switchDemoPersonAction}>
                <button type="submit" className={buttonClass("secondary")}>
                  See it as {user.profile.side === "OLDER" ? "Leo" : "Rose"}
                </button>
              </form>
              <form action={leaveDemoAction}>
                <button type="submit" className={buttonClass("primary")}>
                  Create a real account
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {!user.emailVerifiedAt && (
        <div className="border-b border-line bg-honey-soft">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="font-semibold text-honey-ink">
              Please confirm your email: we sent a link to {user.email}.{" "}
              <Link href="/settings#email" className="underline underline-offset-4">
                Wrong address?
              </Link>
            </p>
            <ResendVerificationForm />
          </div>
        </div>
      )}
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <MobileNavSpacer />
      <OfflineBanner />
    </>
  );
}
