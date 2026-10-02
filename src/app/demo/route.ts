import { NextResponse, type NextRequest } from "next/server";
import { createDemoPair } from "@/lib/demo";
import { features } from "@/lib/env";
import { clientIp, HOUR, rateLimit } from "@/lib/rate-limit";
import { createSession, getCurrentUser } from "@/lib/session";

// Shareable link: opening /demo (or /demo?as=rose) drops the visitor straight into their own
// private demo account. Only exists when DEMO_MODE=true.
export async function GET(req: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, req.nextUrl.origin));
  if (!features.demo) return to("/");
  const current = await getCurrentUser();
  if (current && !current.isDemo) return to("/dashboard");
  if (!rateLimit(`demo:${await clientIp()}`, 20, HOUR)) return to("/?demo=busy");

  const pair = await createDemoPair();
  const asRose = req.nextUrl.searchParams.get("as") === "rose";
  await createSession(asRose ? pair.roseId : pair.leoId);
  return to("/dashboard");
}
