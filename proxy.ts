import { NextResponse, type NextRequest } from "next/server";

// /admin protection (fail-closed): passes only when ADMIN_TOKEN is set and cookie matches.
// If the token is unset or the cookie is absent, always redirects to login.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const token = process.env.ADMIN_TOKEN;
  const cookie = req.cookies.get("lh_admin")?.value;
  if (token && cookie === token) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

// Protect /admin and all sub-paths (including server action POSTs)
export const config = { matcher: ["/admin", "/admin/:path*"] };
