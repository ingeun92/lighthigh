import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// returns null when env vars are absent → callers fall back to mock data
export const isSupabaseConfigured = Boolean(url && anonKey);

// Reuse a single client instance across calls (createClient allocates auth
// machinery on every invocation, so a per-request client is wasteful).
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return (client ??= createClient(url, anonKey, {
    auth: { persistSession: false },
  }));
}
