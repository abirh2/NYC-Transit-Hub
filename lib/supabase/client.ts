/**
 * Supabase Browser Client
 * 
 * Use this client in Client Components ('use client').
 * Creates a singleton browser client for Supabase operations.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

