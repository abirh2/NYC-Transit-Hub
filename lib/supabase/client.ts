/**
 * Supabase Browser Client
 * 
 * Use this client in Client Components ('use client').
 * Creates a singleton browser client for Supabase operations.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return null-safe client during build or if env vars missing
  if (!supabaseUrl || !supabaseAnonKey) {
    return null as unknown as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
