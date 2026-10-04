import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Canonical dashboard URLs requested as /seller/dashboard and /admin/dashboard
// resolve to the real dashboard pages (/seller and /admin).
export function middleware(req: NextRequest) {
  const target =
    req.nextUrl.pathname === "/seller/dashboard" ? "/seller" : "/admin";
  return NextResponse.redirect(new URL(target + req.nextUrl.search, req.url));
}

export const config = {
  matcher: ["/seller/dashboard", "/admin/dashboard"],
};
