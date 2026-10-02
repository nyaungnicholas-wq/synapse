"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageCircle,
  Puzzle,
  BookHeart,
  UserPlus,
  Settings,
} from "lucide-react";
import { cx } from "@/components/ui";

export type NavIcon =
  | "home"
  | "talk"
  | "activities"
  | "memories"
  | "connect"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  match: string;
};

const iconMap: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
  home: Home,
  talk: MessageCircle,
  activities: Puzzle,
  memories: BookHeart,
  connect: UserPlus,
  settings: Settings,
};

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    pathname === item.href ||
    pathname === item.match ||
    pathname.startsWith(item.match + "/");

  return (
    <>
      <nav aria-label="Main" className="hidden xl:block">
        <ul className="flex gap-1">
          {items.map((item) => {
            const active = isActive(item);
            const Icon = iconMap[item.icon];
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cx(
                    "inline-flex min-h-12 items-center gap-2 rounded-control px-4 font-semibold text-ink-soft hover:bg-sand hover:text-ink",
                    active && "bg-clay-soft text-clay-hover"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden"
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const active = isActive(item);
            const Icon = iconMap[item.icon];
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cx(
                    "relative flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-semibold text-ink-muted",
                    active && "text-clay-hover"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-6" aria-hidden="true" />
                  {item.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-4 top-0 h-1 rounded-b-full bg-clay"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export function MobileNavSpacer() {
  return <div aria-hidden="true" className="h-20 xl:hidden" />;
}