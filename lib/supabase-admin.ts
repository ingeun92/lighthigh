// Server-only Supabase client (service_role — bypasses RLS).
// Never import from client components. Use only in server actions and server components.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Reuse a single service-role client across server actions/requests instead of
// allocating a fresh client (and auth machinery) on every invocation.
let client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role 환경변수가 설정되지 않았습니다.");
  }
  return (client = createClient(url, key, { auth: { persistSession: false } }));
}
