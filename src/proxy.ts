import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: bounces signed-out visitors before rendering. The real checks
// (valid session, membership, admin role) run on the server in every page and action.
const PROTECTED = ["/dashboard", "/connect", "/spaces", "/settings", "/billing", "/onboarding", "/admin"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !req.cookies.has("synapse_session")) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
