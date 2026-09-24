/**
 * Next.js Middleware
 * 
 * Handles Supabase session refresh on every request.
 * This keeps user sessions fresh and handles cookie management.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createCorsHeaders, isNativeCorsRoute } from "@/lib/api/cors";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const corsHeaders = isNativeCorsRoute(request.nextUrl.pathname)
    ? createCorsHeaders(request.headers.get("origin"))
    : null;

  if (request.method === "OPTIONS" && corsHeaders) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const response = await updateSession(request);
  if (corsHeaders) {
    Object.entries(corsHeaders).forEach(([name, value]) => {
      response.headers.set(name, value);
    });
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (icons, manifest, etc.)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
