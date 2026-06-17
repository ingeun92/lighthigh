import { NextResponse, type NextRequest } from "next/server";

// /admin 보호 (fail-closed): ADMIN_TOKEN 이 설정되고 쿠키가 일치할 때만 통과.
// 암호가 설정되지 않았거나 쿠키가 없으면 무조건 로그인으로 보낸다.
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

// /admin 페이지와 하위 경로(서버 액션 POST 포함) 모두 보호
export const config = { matcher: ["/admin", "/admin/:path*"] };
