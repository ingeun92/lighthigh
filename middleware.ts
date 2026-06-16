import { NextResponse, type NextRequest } from "next/server";

// /admin 보호. ADMIN_TOKEN 이 설정돼 있으면 쿠키 일치 요구,
// 미설정(로컬 개발)이면 통과시킨다.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const token = process.env.ADMIN_TOKEN;
  if (!token) return NextResponse.next(); // 로컬 개발 편의

  const cookie = req.cookies.get("lh_admin")?.value;
  if (cookie === token) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: "/admin/:path*" };
