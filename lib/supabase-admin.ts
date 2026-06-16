// 서버 전용 Supabase 클라이언트 (service_role — RLS 우회).
// 절대 클라이언트 컴포넌트에서 import 하지 말 것. 서버 액션/서버 컴포넌트에서만 사용.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role 환경변수가 설정되지 않았습니다.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
