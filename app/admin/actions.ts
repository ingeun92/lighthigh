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

// ── 인증 ──────────────────────────────────────────────
export async function login(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (token && token === process.env.ADMIN_TOKEN) {
    (await cookies()).set("lh_admin", token, {
      httpOnly: true,
      sameSite: "lax",
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

// ── 하이라이트 교정 ───────────────────────────────────
export async function reassignHighlight(formData: FormData) {
  const id = String(formData.get("id"));
  const matchId = Number(formData.get("matchId"));
  if (!id || !matchId) return;
  const sb = getAdminClient();
  await sb.from("highlights").update({ match_id: matchId }).eq("id", id);
  refresh();
}

export async function deleteHighlight(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const sb = getAdminClient();
  await sb.from("highlights").delete().eq("id", id);
  refresh();
}

// ── 후보 큐 ───────────────────────────────────────────
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

// ── 수동 추가 (치지직 등) ─────────────────────────────
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
      url: rawUrl.trim(),
      video_id: parsed!.videoId,
      title: String(formData.get("title") ?? "") || null,
      channel: parsed!.source === "chzzk" ? "치지직" : null,
      // 유튜브 수동 추가는 임베드 가능으로 가정(뷰어에 폴백 링크 있음), 치지직은 외부 링크
      embeddable: parsed!.source === "youtube",
      is_approved: true,
    },
    { onConflict: "match_id,source,video_id" }
  );
  refresh();
}
