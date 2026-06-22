"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase-admin";
import { parseVideoUrl } from "@/lib/highlights";

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/");
}

const urlFor = (source: string, videoId: string) =>
  source === "chzzk"
    ? `https://chzzk.naver.com/video/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;

// ── Authentication ────────────────────────────────────
export async function login(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (token && token === process.env.ADMIN_TOKEN) {
    (await cookies()).set("lh_admin", token, {
      httpOnly: true,
      sameSite: "strict", // admin is never reached via cross-site navigation
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    redirect("/admin");
  }
  redirect("/admin/login?error=1");
}

export async function logout() {
  (await cookies()).delete("lh_admin");
  redirect("/admin/login");
}

// ── Highlight correction ──────────────────────────────
export async function reassignHighlight(formData: FormData) {
  const id = String(formData.get("id"));
  const matchId = Number(formData.get("matchId"));
  if (!id || !matchId) return;
  const sb = getAdminClient();
  // Admin manually reassigned this highlight to a match, so treat it as
  // already reviewed — don't flag it with the title-mismatch warning.
  await sb.from("highlights").update({ match_id: matchId, reviewed: true }).eq("id", id);
  refresh();
}

export async function deleteHighlight(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const sb = getAdminClient();
  await sb.from("highlights").delete().eq("id", id);
  refresh();
}

// Feature this highlight as the top embed — assign a sort_order lower than the current minimum in the same match
export async function featureHighlight(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const sb = getAdminClient();
  const { data: hl } = await sb.from("highlights").select("match_id").eq("id", id).single();
  if (!hl) return;
  // Fetch only the current minimum sort_order (ordered + limit 1) instead of
  // pulling every highlight row for the match just to Math.min in JS.
  const { data: rows } = await sb
    .from("highlights")
    .select("sort_order")
    .eq("match_id", hl.match_id)
    .order("sort_order", { ascending: true })
    .limit(1);
  const min = Math.min(0, rows?.[0]?.sort_order ?? 0);
  await sb.from("highlights").update({ sort_order: min - 1 }).eq("id", id);
  refresh();
}

// Mark a mismatch warning as resolved / undo the resolution
export async function resolveHighlight(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const sb = getAdminClient();
  await sb.from("highlights").update({ reviewed: true }).eq("id", id);
  refresh();
}

export async function unresolveHighlight(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const sb = getAdminClient();
  await sb.from("highlights").update({ reviewed: false }).eq("id", id);
  refresh();
}

// ── Candidate queue ───────────────────────────────────
export async function approveCandidate(formData: FormData) {
  const id = Number(formData.get("id"));
  const matchId = Number(formData.get("matchId"));
  if (!id || !matchId) return;
  const sb = getAdminClient();
  const { data: cand } = await sb
    .from("highlight_candidates")
    .select("*")
    .eq("id", id)
    .single();
  if (!cand) return;
  await sb.from("highlights").upsert(
    {
      match_id: matchId,
      source: cand.source,
      url: urlFor(cand.source, cand.video_id),
      video_id: cand.video_id,
      title: cand.title,
      channel: cand.channel,
      embeddable: cand.embeddable ?? false,
      thumbnail_url: cand.thumbnail_url,
      published_at: cand.published_at,
      is_approved: true,
      // Admin explicitly assigned this candidate to a match, so treat it as
      // already reviewed — don't flag it with the title-mismatch warning.
      reviewed: true,
    },
    { onConflict: "match_id,source,video_id" }
  );
  await sb.from("highlight_candidates").update({ review: "approved" }).eq("id", id);
  refresh();
}

export async function rejectCandidate(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const sb = getAdminClient();
  await sb.from("highlight_candidates").update({ review: "rejected" }).eq("id", id);
  refresh();
}

// ── Manual add (Chzzk, YouTube, etc.) ────────────────
export async function addManualHighlight(formData: FormData) {
  const matchId = Number(formData.get("matchId"));
  const rawUrl = String(formData.get("url") ?? "");
  const parsed = parseVideoUrl(rawUrl);
  if (!matchId || !parsed) {
    redirect("/admin?error=invalid_url");
  }
  const sb = getAdminClient();
  await sb.from("highlights").upsert(
    {
      match_id: matchId,
      source: parsed!.source,
      // Store a reconstructed canonical URL from the validated source+id rather
      // than the raw input — prevents a non-https (e.g. javascript:) URI that
      // merely contains a valid host substring from being stored and rendered into an href.
      url: urlFor(parsed!.source, parsed!.videoId),
      video_id: parsed!.videoId,
      title: String(formData.get("title") ?? "") || null,
      channel: parsed!.source === "chzzk" ? "치지직" : null,
      // YouTube manual-add is assumed embeddable (viewer has a fallback link); Chzzk is external-link-only (embedding blocked)
      embeddable: parsed!.source === "youtube",
      is_approved: true,
      // Admin manually added this highlight to a specific match, so treat it as
      // already reviewed — don't flag it with the title-mismatch warning.
      reviewed: true,
    },
    { onConflict: "match_id,source,video_id" }
  );
  refresh();
}
