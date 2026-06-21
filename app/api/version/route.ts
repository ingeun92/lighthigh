// Reports the currently deployed build id so open tabs can detect a new release.
// Served fresh (never cached) so an old tab always sees the latest deployment's id.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { v: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
