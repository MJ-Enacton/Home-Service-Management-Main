import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";

// /services (listing + detail) is browsable by every authenticated role —
// the navbar, mobile drawer and detail page already link providers there.
// Booking itself stays guarded: the detail page shows an "own listing"
// notice for owners and bookService rejects self-booking server-side.
const CUSTOMER_ROUTES = ["/customer"];
const PROVIDER_ROUTES = ["/provider"];
const ADMIN_ROUTES = ["/admin"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function redirectTo(req: NextRequest, fallbackPath: string) {
  const referer = req.headers.get("referer");

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const requestUrl = new URL(req.url);
      const isSameOrigin =
        refererUrl.origin === requestUrl.origin &&
        refererUrl.pathname !== req.nextUrl.pathname;

      if (isSameOrigin) {
        return NextResponse.redirect(
          new URL(refererUrl.pathname + refererUrl.search, req.url),
        );
      }
    } catch {
      // invalid referer, fall through to fallback
    }
  }

  return NextResponse.redirect(new URL(fallbackPath, req.url));
}

export async function proxy(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const { pathname } = req.nextUrl;

  if (!session) {
    // Allow unauthenticated users to browse /services (read-only listings).
    if (pathname === "/services" || pathname.startsWith("/services/")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const role = resolveRole(session.user.role);

  // Email/password users must verify via OTP before using the app.
  // (Google OAuth emails are pre-verified and skip this.)
  const emailVerified =
    (session.user as { emailVerified?: boolean | null }).emailVerified ??
    true;
  if (!emailVerified) {
    const params = new URLSearchParams({ email: session.user.email });
    return NextResponse.redirect(
      new URL(`/verify-email?${params.toString()}`, req.url),
    );
  }

  if (matchesRoute(pathname, ADMIN_ROUTES) && role !== "admin") {
    return redirectTo(req, "/");
  }

  if (matchesRoute(pathname, PROVIDER_ROUTES) && role !== "provider") {
    return redirectTo(req, "/");
  }

  if (matchesRoute(pathname, CUSTOMER_ROUTES) && role !== "customer") {
    return redirectTo(req, "/");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/onboarding",
    "/dashboard",
    "/services",
    "/services/:path*",
    "/customer/:path*",
    "/provider/:path*",
    "/notifications",
    "/notifications/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
