import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

// On-demand ISR endpoint. The sync-matches cron POSTs here (with the shared
// secret) only when match data actually changed, so the home page cache is
// rewritten on real changes instead of on a fixed 60s clock — the change that
// cut ISR Write Units. Guard with REVALIDATE_SECRET; without it, refuse (so a
// misconfigured deploy can't be spammed to force writes).
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  const provided =
    req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-revalidate-secret");

  if (!expected || provided !== expected) {
    return NextResponse.json({ revalidated: false, message: "invalid secret" }, { status: 401 });
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true, path: "/" });
}
