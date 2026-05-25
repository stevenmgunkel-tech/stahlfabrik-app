import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/",
  "/arbeitszeiten",
  "/urlaub",
  "/resturlaub",
  "/monatsansicht",
  "/kalender",
  "/mitarbeiter",
  "/projekte",
  "/chef-dashboard",
  "/admin",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(route);
  });

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const hasSupabaseSession =
    request.cookies.get("sb-access-token") ||
    request.cookies
      .getAll()
      .some((cookie) => cookie.name.startsWith("sb-"));

  if (!hasSupabaseSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/arbeitszeiten/:path*",
    "/urlaub/:path*",
    "/resturlaub/:path*",
    "/monatsansicht/:path*",
    "/kalender/:path*",
    "/mitarbeiter/:path*",
    "/projekte/:path*",
    "/chef-dashboard/:path*",
    "/admin/:path*",
  ],
};