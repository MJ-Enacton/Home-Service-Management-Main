import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";

const CUSTOMER_ROUTES = ["/services", "/customer"];
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
