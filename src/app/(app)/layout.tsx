import { AppShell } from "@/components/app/shell";
import { requireOnboardedUser } from "@/lib/session";

// Everything in (app) requires a signed-in user who has finished onboarding.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  return <AppShell user={user}>{children}</AppShell>;
}
