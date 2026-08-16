"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The schema lives in the connected Supabase project; generated database types can replace this
// broad client type when the backend schema begins changing frequently.
let client: SupabaseClient<any> | undefined;

export function getSupabaseBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured. Add the public project URL and publishable key to .env.local.");
  }

  client = createClient<any>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
