import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { consumeAuthToken } from "@/lib/auth-tokens";

// The link in the confirmation email. Single-use; an expired link lands on a friendly page.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const userId = await consumeAuthToken(token, "EMAIL_VERIFY");
  if (!userId) return NextResponse.redirect(new URL("/check-email?status=expired", req.nextUrl.origin));
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return NextResponse.redirect(new URL("/dashboard?notice=email-verified", req.nextUrl.origin));
}
